import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const failures = [];
const publicPages = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name === 'index.html') {
      const rel = relative(root, path).replaceAll('\\', '/');
      if (rel.startsWith('admin/') || rel.startsWith('ai-chat-test/') || rel.includes('/src/') || rel.includes('private-preview')) continue;
      const html = await readFile(path, 'utf8');
      if (rel === 'care/index.html' || rel === 'care/en/index.html') {
        if (html.includes('analytics-loader.js') || html.includes('transport-analytics.js')) failures.push(`${rel}: care page must not track`);
        continue;
      }
      publicPages.push({ rel, html });
    }
  }
}

await walk(root);
for (const { rel, html } of publicPages) {
  const loader = (html.match(/assets\/analytics-loader\.js/g) || []).length;
  const layer = (html.match(/assets\/transport-analytics\.js/g) || []).length;
  const map = (html.match(/assets\/transport-analytics-map\.js/g) || []).length;
  const site = (html.match(/<script[^>]+src=["'][^"']*site\.js(?:\?[^"']*)?["'][^>]*>/gi) || []).length;
  if (loader !== 1 || layer !== 1 || map !== 1 || site !== 1) failures.push(`${rel}: loader=${loader}, layer=${layer}, map=${map}, site=${site}`);
  const mapAt = html.indexOf('transport-analytics-map.js');
  const layerAt = html.indexOf('transport-analytics.js');
  const siteAt = html.search(/site\.js(?:\?|["'])/);
  const loaderAt = html.indexOf('analytics-loader.js');
  if (!(mapAt < layerAt && layerAt < siteAt && siteAt < loaderAt)) failures.push(`${rel}: tracking scripts are not in map → event layer → site → loader order`);
}

const canonical = await readFile(join(root, '..', 'assets', 'analytics-loader.js'), 'utf8');
const mirror = await readFile(join(root, 'assets', 'analytics-loader.js'), 'utf8');
if (canonical !== mirror) failures.push('transport analytics loader mirror differs from canonical loader');
if (!canonical.includes("send_page_view: false")) failures.push('GA4 automatic page view is not disabled');
if (!canonical.includes('G-DFY197R2MS')) failures.push('expected GA4 measurement ID missing');
if (!canonical.includes("vendora_transport_visitor_id")) failures.push('transport CRM visitor identity is not unified with analytics');
if (!canonical.includes('TRACKING_RETRY_KEY')) failures.push('failed-event retry queue is missing');
if (!canonical.includes('confirmed_departure: true')) failures.push('confirmed WhatsApp departure field is not allowed through the analytics loader');
if (!canonical.includes('cancellation_method: true')) failures.push('WhatsApp cancellation method is not allowed through the analytics loader');

const siteScript = await readFile(join(root, 'site.js'), 'utf8');
if (!siteScript.includes("const visitorIdKey = '__vendora_visitor_id'")) failures.push('site.js does not use the unified visitor id');
if (!siteScript.includes("const sessionIdKey = '__vendora_session_id'")) failures.push('site.js does not use the unified session id');
if (!siteScript.includes("window.vendoraTrackLocal('whatsapp_cancel'")) failures.push('site.js WhatsApp cancellation event is missing');

const admin = await readFile(join(root, 'admin', 'index.html'), 'utf8');
if (admin.includes('analytics-loader.js')) failures.push('admin page includes public analytics');
if (!admin.includes("resource: 'tracking'")) failures.push('admin unified tracking resource missing');
if (!admin.includes('id="decisionsPanel"')) failures.push('admin customer decisions report is missing');

if (publicPages.length !== 176) failures.push(`expected 176 public pages, found ${publicPages.length}`);
console.log(JSON.stringify({
  ok: failures.length === 0,
  pages_before_fix: 162,
  public_pages_checked: publicPages.length,
  pages_with_exactly_one_loader: publicPages.filter(({ html }) => (html.match(/assets\/analytics-loader\.js/g) || []).length === 1).length,
  excluded_care_pages: 2,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
