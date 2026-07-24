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
  if (loader !== 1 || layer !== 1 || map !== 1) failures.push(`${rel}: loader=${loader}, layer=${layer}, map=${map}`);
}

const canonical = await readFile(join(root, '..', 'assets', 'analytics-loader.js'), 'utf8');
const mirror = await readFile(join(root, 'assets', 'analytics-loader.js'), 'utf8');
if (canonical !== mirror) failures.push('transport analytics loader mirror differs from canonical loader');
if (!canonical.includes("send_page_view: false")) failures.push('GA4 automatic page view is not disabled');
if (!canonical.includes('G-DFY197R2MS')) failures.push('expected GA4 measurement ID missing');

const admin = await readFile(join(root, 'admin', 'index.html'), 'utf8');
if (admin.includes('analytics-loader.js')) failures.push('admin page includes public analytics');
if (!admin.includes("resource=tracking")) failures.push('admin unified tracking resource missing');

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
