import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'config', 'search-discovery.json'), 'utf8'));
const submit = process.argv.includes('--submit');
const sitemapNames = ['sitemap-gcc-transport.xml', 'sitemap-gcc-transport-en.xml'];
const urls = [...new Set(sitemapNames.flatMap((name) => (
  [...readFileSync(join(root, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
)))];
const allowedPrefix = `${config.site_origin}${config.site_path}`;

if (!/^[a-f0-9]{32,128}$/i.test(config.indexnow.key)) throw new Error('Invalid IndexNow key format');
if (readFileSync(join(root, `${config.indexnow.key}.txt`), 'utf8').trim() !== config.indexnow.key) throw new Error('IndexNow key file mismatch');
if (!urls.length || urls.length > 10_000) throw new Error(`Unsafe URL count: ${urls.length}`);
if (urls.some((url) => !url.startsWith(allowedPrefix) || /\/(?:admin|care|ai-chat-test|api)\//i.test(url))) {
  throw new Error('IndexNow URL inventory contains an out-of-scope or private URL');
}

const payload = {
  host: new URL(config.site_origin).host,
  key: config.indexnow.key,
  keyLocation: config.indexnow.key_location,
  urlList: urls
};

if (!submit) {
  console.log(JSON.stringify({ ok: true, mode: 'dry-run', endpoint: config.indexnow.endpoint, url_count: urls.length, key_location: payload.keyLocation }, null, 2));
  process.exit(0);
}

const response = await fetch(config.indexnow.endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload)
});
console.log(JSON.stringify({ ok: response.ok, mode: 'submit', status: response.status, url_count: urls.length }, null, 2));
if (!response.ok) process.exitCode = 1;
