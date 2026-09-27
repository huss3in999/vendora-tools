import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'config', 'search-discovery.json'), 'utf8'));
const submit = process.argv.includes('--submit');
const sitemapNames = ['sitemap-gcc-transport.xml', 'sitemap-gcc-transport-en.xml'];
const statePath = join(root, 'indexnow-state.json');
const allowedPrefix = `${config.site_origin}${config.site_path}`;
const keyFile = join(root, '..', `${config.indexnow.key}.txt`);

function fail(message) { throw new Error(message); }

if (!/^[a-f0-9]{32,128}$/i.test(config.indexnow.key)) fail('Invalid IndexNow key format');
if (!existsSync(keyFile) || readFileSync(keyFile, 'utf8').trim() !== config.indexnow.key) fail('IndexNow key file mismatch');

const urls = [...new Set(sitemapNames.flatMap((name) => (
  [...readFileSync(join(root, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
)))].sort();
if (!urls.length || urls.length > 10_000) fail(`Unsafe URL count: ${urls.length}`);

const fingerprints = {};
for (const url of urls) {
  const parsed = new URL(url);
  if (parsed.origin !== config.site_origin || !url.startsWith(allowedPrefix)
    || parsed.search || parsed.hash || /\/index\.html$/i.test(parsed.pathname)
    || /\.(?:xml|txt|json)$/i.test(parsed.pathname)
    || /\/(?:admin|care|ai-chat-test|api)(?:\/|$)/i.test(parsed.pathname)) {
    fail(`IndexNow URL inventory contains an out-of-scope URL: ${url}`);
  }
  const relative = parsed.pathname.slice(config.site_path.length).replace(/\/$/, '');
  const htmlPath = relative ? join(root, ...relative.split('/'), 'index.html') : join(root, 'index.html');
  if (!existsSync(htmlPath)) fail(`IndexNow URL has no local canonical HTML: ${url}`);
  const html = readFileSync(htmlPath, 'utf8');
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  if (/noindex/i.test(robots)) fail(`IndexNow URL is noindex: ${url}`);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  if (canonical !== url) fail(`IndexNow URL is not self-canonical: ${url} (found ${canonical || 'none'})`);
  fingerprints[url] = createHash('sha256').update(html).digest('hex');
}

const previous = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { fingerprints: {} };
const previousFingerprints = previous.fingerprints || {};
const changed = urls.filter((url) => previousFingerprints[url] !== fingerprints[url]);
const retired = Object.keys(previousFingerprints).filter((url) => !fingerprints[url]).sort();
const notify = [...new Set([...changed, ...retired])];
const payload = {
  host: new URL(config.site_origin).host,
  key: config.indexnow.key,
  keyLocation: config.indexnow.key_location,
  urlList: notify
};

if (!submit) {
  console.log(JSON.stringify({ ok: true, mode: 'dry-run', endpoint: config.indexnow.endpoint, canonical_url_count: urls.length, changed_url_count: changed.length, retired_url_count: retired.length, submit_url_count: notify.length, key_location: payload.keyLocation }, null, 2));
  process.exit(0);
}
if (!notify.length) {
  console.log(JSON.stringify({ ok: true, mode: 'submit', submitted: false, reason: 'no canonical URL changes', canonical_url_count: urls.length }, null, 2));
  process.exit(0);
}

const response = await fetch(config.indexnow.endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload)
});
const responseText = await response.text();
console.log(JSON.stringify({ ok: response.ok, mode: 'submit', status: response.status, submitted: response.ok, canonical_url_count: urls.length, submit_url_count: notify.length, response: responseText.slice(0, 500) }, null, 2));
if (!response.ok) process.exit(1);

writeFileSync(statePath, `${JSON.stringify({ version: 1, host: payload.host, key: payload.key, fingerprints, lastSubmittedUrls: notify, lastSubmittedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
