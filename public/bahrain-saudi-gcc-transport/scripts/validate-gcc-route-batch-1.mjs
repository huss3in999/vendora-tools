import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..', '..');
const routesConfig = JSON.parse(readFileSync(join(repo, 'internal-preview', 'gcc-routes', 'config', 'gcc-routes.json'), 'utf8'));
const countriesConfig = JSON.parse(readFileSync(join(repo, 'internal-preview', 'gcc-routes', 'config', 'gcc-countries.json'), 'utf8'));
const routes = new Map(routesConfig.routes.map((route) => [route.route_id, route]));
const countries = new Map(countriesConfig.countries.map((country) => [country.code, country]));
const batch = ['SA-QA', 'QA-SA', 'SA-AE', 'AE-SA', 'AE-BH', 'BH-AE', 'QA-AE', 'AE-QA', 'KW-BH', 'OM-BH'];
const hubs = ['SA', 'QA', 'AE', 'BH', 'KW', 'OM'];
const errors = [];
let passed = 0;
const check = (condition, message) => condition ? passed++ : errors.push(message);
const page = (path) => readFileSync(join(root, path.replace('/bahrain-saudi-gcc-transport/', ''), 'index.html'), 'utf8');
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
const hubPath = (code, lang) => `/bahrain-saudi-gcc-transport/${lang === 'en' ? 'en/' : ''}${code === 'BH' ? 'gcc-destinations' : countries.get(code).hub_slug}/`;

check(routesConfig.routes.length === 42, 'central matrix must contain 42 routes');
check(routesConfig.routes.filter((r) => r.active).length === 17, 'exactly 17 routes should be active after batch 1');
check(routesConfig.routes.filter((r) => !r.active).length === 25, 'exactly 25 routes should remain inactive');
for (const id of batch) {
  const route = routes.get(id);
  check(route.active, `${id} must be active`);
  check(['confirmed_direct', 'confirmed_partner'].includes(route.operational_status), `${id} must be operationally confirmed`);
  check(route.pickup_country_supported && route.border_process_reviewed && route.insurance_reviewed, `${id} operational gates must be reviewed`);
  for (const lang of ['ar', 'en']) {
    const path = lang === 'ar' ? route.public_path_ar : route.public_path_en;
    const html = page(path);
    const canonical = `https://getvendora.net${path}`;
    const alternate = `https://getvendora.net${lang === 'ar' ? route.public_path_en : route.public_path_ar}`;
    const origin = countries.get(route.origin_country)[lang === 'ar' ? 'name_ar' : 'name_en'];
    const destination = countries.get(route.destination_country)[lang === 'ar' ? 'name_ar' : 'name_en'];
    const whatsappMessages = [...html.matchAll(/data-wa-message="([^"]+)"/g)].map((match) => match[1]);
    check(html.includes(`<link rel="canonical" href="${canonical}">`), `${id} ${lang} canonical`);
    check(html.includes(`href="${alternate}">`), `${id} ${lang} reciprocal hreflang`);
    check(/hreflang="x-default"/.test(html), `${id} ${lang} x-default hreflang`);
    check(!/noindex/i.test(html), `${id} ${lang} is indexable`);
    check(html.includes('data-vendora-global-theme'), `${id} ${lang} theme`);
    check(html.lastIndexOf('vendora-theme.css') > html.lastIndexOf('site.css'), `${id} ${lang} theme loads last`);
    check(html.includes(`data-reverse-route="${route.reverse_route_id}"`), `${id} ${lang} reverse link`);
    check(html.includes('wa.me/97333225954'), `${id} ${lang} WhatsApp`);
    check(whatsappMessages.length > 0 && whatsappMessages.every((message) => message.includes(origin) && message.includes(destination)), `${id} ${lang} WhatsApp messages name the exact direction`);
    check(!/\b(?:BHD|SAR|AED|QAR|KWD|OMR)\s*\d|\d+\s*(?:BHD|SAR|AED|QAR|KWD|OMR)\b/.test(visible(html)), `${id} ${lang} has no invented numeric price`);
    if (lang === 'en') check(!/[\u0600-\u06ff]/.test(visible(html)), `${id} English visible copy has no Arabic`);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(match[1]); passed++; } catch { errors.push(`${id} ${lang} schema parses`); }
    }
  }
}
for (const code of hubs) {
  const expected = new Set(routesConfig.routes.filter((route) => route.active && route.origin_country === code).map((route) => route.route_id));
  for (const lang of ['ar', 'en']) {
    const html = page(hubPath(code, lang));
    const linked = new Set([...html.matchAll(/data-active-route="([^"]+)"/g)].map((m) => m[1]));
    check(linked.size === expected.size && [...linked].every((id) => expected.has(id)), `${code} ${lang} hub contains active routes only`);
  }
}
const allPublicHtml = [];
function collect(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { if (['node_modules','tests','templates','scripts'].includes(entry.name)) continue; const full = join(dir, entry.name); if (entry.isDirectory()) collect(full); else if (entry.name === 'index.html') allPublicHtml.push(readFileSync(full, 'utf8')); } }
collect(root);
for (const route of routesConfig.routes.filter((r) => !r.active)) {
  check(!allPublicHtml.some((html) => html.includes(`/bahrain-saudi-gcc-transport/${route.slug}/`) || html.includes(`/bahrain-saudi-gcc-transport/en/${route.slug}/`)), `${route.route_id} inactive route is not linked publicly`);
}
for (const [filename, lang] of [['sitemap-gcc-transport.xml','ar'],['sitemap-gcc-transport-en.xml','en']]) {
  const xml = readFileSync(join(root, filename), 'utf8');
  for (const id of batch) check(xml.includes(`<loc>https://getvendora.net${lang === 'ar' ? routes.get(id).public_path_ar : routes.get(id).public_path_en}</loc>`), `${filename} contains ${id}`);
  for (const route of routesConfig.routes.filter((r) => !r.active)) check(!xml.includes(`/${route.slug}/`), `${filename} excludes inactive ${route.route_id}`);
  check(!/private-preview|planning-output|internal-preview|\/templates\//.test(xml), `${filename} excludes private material`);
}
const titles = batch.flatMap((id) => [page(routes.get(id).public_path_ar), page(routes.get(id).public_path_en)]).map((html) => html.match(/<title>(.*?)<\/title>/)?.[1]);
const descriptions = batch.flatMap((id) => [page(routes.get(id).public_path_ar), page(routes.get(id).public_path_en)]).map((html) => html.match(/<meta name="description" content="([^"]+)"/)?.[1]);
check(new Set(titles).size === titles.length, 'batch titles are unique');
check(new Set(descriptions).size === descriptions.length, 'batch descriptions are unique');
console.log(JSON.stringify({ ok: errors.length === 0, passed, failed: errors.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
