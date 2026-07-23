import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(root, '..', '..');
const publicRoot = join(repositoryRoot, 'public');
const internalConfigRoot = join(repositoryRoot, 'internal-preview', 'gcc-routes', 'config');
const previewRoot = join(repositoryRoot, 'planning-output', 'gcc-preview');
const oldPreviewRoot = join(root, 'gcc-private-transport-guide', 'planning', 'private-preview');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const readInternalJson = (filename) => JSON.parse(readFileSync(join(internalConfigRoot, filename), 'utf8'));
const routesConfig = readInternalJson('gcc-routes.json');
const countriesConfig = readInternalJson('gcc-countries.json');
const chauffeurConfig = readInternalJson('chauffeur-services.json');
const pricingConfig = readJson('config/route-prices.json');
const manifest = JSON.parse(readFileSync(join(previewRoot, 'manifest.json'), 'utf8'));
const routes = new Map(routesConfig.routes.map((route) => [route.route_id, route]));
const countries = new Map(countriesConfig.countries.map((country) => [country.code, country]));
const priceIds = new Set(pricingConfig.routes.map((route) => route.route_id));
const allowedStatuses = new Set(['confirmed_direct', 'confirmed_partner', 'quotation_review', 'unsupported']);
const errors = [];
const checks = [];

const check = (condition, message) => {
  if (!condition) errors.push(message);
  else checks.push(message);
};
const posix = (value) => value.split(sep).join('/');
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const collectHtml = (directory, files = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(full, files);
    else if (entry.name === 'index.html') files.push(full);
  }
  return files;
};
const localFileForPublicPath = (path) => {
  const prefix = '/bahrain-saudi-gcc-transport/';
  if (!path?.startsWith(prefix) || !path.endsWith('/')) return null;
  return join(root, path.slice(prefix.length), 'index.html');
};
const visibleText = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z0-9#]+;/gi, ' ');

check(previewRoot.startsWith(repositoryRoot), 'Private preview is inside the repository');
check(!previewRoot.startsWith(publicRoot), 'Private preview is outside the deployed public directory');
check(internalConfigRoot.startsWith(repositoryRoot), 'GCC configuration is inside the repository');
check(!internalConfigRoot.startsWith(publicRoot), 'GCC configuration is outside the deployed public directory');
check(!existsSync(oldPreviewRoot), 'Old preview path under public has been removed');
check(countriesConfig.countries.length === 7, 'Country configuration contains exactly seven countries');
check(new Set(countriesConfig.countries.map((country) => country.code)).size === 7, 'Country codes are unique');
check(routesConfig.routes.length === 42, 'Route matrix contains exactly 42 directional records');
check(routes.size === 42, 'Route IDs are unique');
check(new Set(routesConfig.routes.map((route) => route.slug)).size === 42, 'Route slugs are unique');

const expectedPairs = new Set();
for (const origin of countriesConfig.countries) {
  for (const destination of countriesConfig.countries) {
    if (origin.code !== destination.code) expectedPairs.add(`${origin.code}-${destination.code}`);
  }
}
check(expectedPairs.size === 42, 'Expected directional country-pair set contains 42 records');
check(
  [...expectedPairs].every((routeId) => routes.has(routeId)),
  'Every ordered country pair exists in the route matrix'
);

for (const route of routesConfig.routes) {
  check(countries.has(route.origin_country), `${route.route_id}: origin country exists`);
  check(countries.has(route.destination_country), `${route.route_id}: destination country exists`);
  check(route.origin_country !== route.destination_country, `${route.route_id}: origin and destination differ`);
  const reverse = routes.get(route.reverse_route_id);
  check(Boolean(reverse), `${route.route_id}: reverse route exists`);
  if (reverse) {
    check(reverse.reverse_route_id === route.route_id, `${route.route_id}: reverse relationship is reciprocal`);
    check(
      reverse.origin_country === route.destination_country && reverse.destination_country === route.origin_country,
      `${route.route_id}: reverse direction countries are correct`
    );
  }
  check(allowedStatuses.has(route.operational_status), `${route.route_id}: operational status is allowed`);
  for (const field of [
    'pickup_country_supported',
    'approved_partner_required',
    'border_process_reviewed',
    'insurance_reviewed',
    'last_operational_review'
  ]) {
    check(Object.hasOwn(route, field), `${route.route_id}: ${field} field is present`);
  }
  check(
    route.keyword_status === 'pending_keyword_planner_validation',
    `${route.route_id}: primary keyword remains pending Keyword Planner validation`
  );
  check(Boolean(route.commercial_keyword_candidate_en), `${route.route_id}: English commercial keyword candidate exists`);
  check(Boolean(route.commercial_keyword_candidate_ar), `${route.route_id}: Arabic commercial keyword candidate exists`);
  check(
    Boolean(routesConfig.keyword_profiles[route.keyword_profile_id]),
    `${route.route_id}: shared secondary/city/airport/informational keyword profile exists`
  );
  if (route.price_id) check(priceIds.has(route.price_id), `${route.route_id}: central price reference exists`);
  for (const relatedPriceId of route.related_price_ids) {
    check(priceIds.has(relatedPriceId), `${route.route_id}: related central price ${relatedPriceId} exists`);
  }

  if (!route.active) {
    check(route.quotation_status === 'quotation_only', `${route.route_id}: inactive route is quotation-only`);
    check(route.public_path_ar === null && route.public_path_en === null, `${route.route_id}: inactive route has no public paths`);
    check(route.price_id === null, `${route.route_id}: inactive route has no price`);
    check(route.legacy_public === false, `${route.route_id}: inactive route is not marked as legacy public`);
  }

  if (route.active && route.legacy_public) {
    const arFile = localFileForPublicPath(route.public_path_ar);
    const enFile = localFileForPublicPath(route.public_path_en);
    check(Boolean(arFile && existsSync(arFile)), `${route.route_id}: preserved Arabic public page exists`);
    check(Boolean(enFile && existsSync(enFile)), `${route.route_id}: preserved English public page exists`);
  }

  if (route.active && !route.legacy_public) {
    check(
      ['confirmed_direct', 'confirmed_partner'].includes(route.operational_status),
      `${route.route_id}: newly activated route has a confirmed operational status`
    );
    check(route.pickup_country_supported === true, `${route.route_id}: newly activated route supports pickup country`);
    check(route.border_process_reviewed === true, `${route.route_id}: newly activated route has reviewed border process`);
    check(route.insurance_reviewed === true, `${route.route_id}: newly activated route has reviewed insurance`);
    check(Boolean(route.last_operational_review), `${route.route_id}: newly activated route has an operational review date`);
    if (route.operational_status === 'confirmed_direct') {
      check(route.approved_partner_required === false, `${route.route_id}: direct route does not require a partner`);
    }
    if (route.operational_status === 'confirmed_partner') {
      check(route.approved_partner_required === true, `${route.route_id}: partner route records partner requirement`);
    }
  }
}

const requiredBatch = new Set(['SA-QA', 'QA-SA', 'SA-AE', 'AE-SA', 'AE-QA', 'QA-AE', 'KW-BH', 'AE-BH', 'OM-BH', 'IQ-BH']);
check(
  routesConfig.first_operational_approval_batch.length === requiredBatch.size &&
  routesConfig.first_operational_approval_batch.every((routeId) => requiredBatch.has(routeId)),
  'First operational approval batch matches the requested ten directions'
);

const activeRouteIds = routesConfig.routes.filter((route) => route.active).map((route) => route.route_id);
check(activeRouteIds.length === 10, 'Exactly ten preserved existing country directions are active');
check(routesConfig.routes.filter((route) => !route.active).length === 32, 'Exactly 32 unconfirmed directions remain inactive');

const publicSitemaps = ['sitemap.xml', 'sitemap-gcc-transport.xml', 'sitemap-gcc-transport-en.xml'];
for (const sitemap of publicSitemaps) {
  const file = join(root, sitemap);
  const xml = readFileSync(file, 'utf8');
  check(!xml.includes('/private-preview/'), `${sitemap}: old private preview path is absent`);
  check(!xml.includes('/planning-output/gcc-preview/'), `${sitemap}: repository-only preview path is absent`);
  check(
    sha256(file) === manifest.public_sitemap_sha256[sitemap],
    `${sitemap}: hash matches the pre-generation manifest`
  );
  for (const route of routesConfig.routes.filter((candidate) => !candidate.active)) {
    const futureAr = `/bahrain-saudi-gcc-transport/${route.slug}/`;
    const futureEn = `/bahrain-saudi-gcc-transport/en/${route.slug}/`;
    check(!xml.includes(`<loc>https://getvendora.net${futureAr}</loc>`), `${sitemap}: inactive Arabic route ${route.route_id} is absent`);
    check(!xml.includes(`<loc>https://getvendora.net${futureEn}</loc>`), `${sitemap}: inactive English route ${route.route_id} is absent`);
  }
}

const previewHtml = collectHtml(previewRoot);
check(previewHtml.length === 53, 'Private preview contains the expected 53 HTML pages');
check(manifest.preview_html_pages === 53, 'Preview manifest reports 53 HTML pages');
check(manifest.route_matrix_records === 42, 'Preview manifest reports 42 matrix records');
check(manifest.route_preview_pages === 36, 'Preview manifest reports 36 bilingual route preview pages');
check(manifest.country_hub_pages === 14, 'Preview manifest reports 14 bilingual country hub pages');
check(manifest.chauffeur_hub_pages === 2, 'Preview manifest reports two bilingual chauffeur hub pages');
check(readFileSync(join(previewRoot, 'robots.txt'), 'utf8').includes('Disallow: /'), 'Preview robots file disallows all crawling');

for (const file of previewHtml) {
  const html = readFileSync(file, 'utf8');
  const rel = posix(relative(previewRoot, file));
  check(/<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">/.test(html), `${rel}: has strict noindex`);
  check(!/<link\s+rel=["']canonical["']/i.test(html), `${rel}: has no canonical claiming a public URL`);
  if (rel.startsWith('en/')) {
    check(/<html lang="en" dir="ltr">/.test(html), `${rel}: English language and direction are correct`);
    check(!/[\u0600-\u06ff]/.test(visibleText(html)), `${rel}: English visible copy contains no Arabic characters`);
  }
  if (rel.startsWith('ar/')) {
    check(/<html lang="ar" dir="rtl">/.test(html), `${rel}: Arabic language and direction are correct`);
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
      checks.push(`${rel}: structured data parses`);
    } catch (error) {
      errors.push(`${rel}: structured data does not parse (${error.message})`);
    }
  }
}

for (const route of routesConfig.routes.filter((candidate) =>
  !candidate.active && candidate.preview_batch === 'operational_approval_batch_1'
)) {
  for (const lang of ['ar', 'en']) {
    const file = join(previewRoot, lang, 'routes', route.slug, 'index.html');
    const html = readFileSync(file, 'utf8');
    check(!html.includes('wa.me/'), `${route.route_id} ${lang}: inactive preview has no WhatsApp booking link`);
    check(!html.includes('data-private-preview-booking'), `${route.route_id} ${lang}: inactive preview has no booking action`);
    check(!html.includes('data-booking-submit'), `${route.route_id} ${lang}: inactive preview has no booking submit control`);
    check(!html.includes('data-booking-form'), `${route.route_id} ${lang}: inactive preview has no booking form`);
    check(!/\bhreflang\s*=/i.test(html), `${route.route_id} ${lang}: inactive preview has no hreflang URL`);
    check(
      !html.includes(`https://getvendora.net/bahrain-saudi-gcc-transport/${route.slug}/`) &&
      !html.includes(`https://getvendora.net/bahrain-saudi-gcc-transport/en/${route.slug}/`),
      `${route.route_id} ${lang}: inactive schema and markup contain no future public route URL`
    );
    check(html.includes('data-inactive-no-booking="true"'), `${route.route_id} ${lang}: inactive preview shows a no-booking state`);
  }
}

for (const country of countriesConfig.countries) {
  const activeFromCountry = new Set(routesConfig.routes
    .filter((route) => route.active && route.origin_country === country.code)
    .map((route) => route.route_id));
  for (const lang of ['ar', 'en']) {
    const file = join(previewRoot, lang, 'hubs', country.hub_slug, 'index.html');
    const html = readFileSync(file, 'utf8');
    const linkedIds = [...html.matchAll(/data-active-route-link="([^"]+)"/g)].map((match) => match[1]);
    check(
      linkedIds.length === activeFromCountry.size && linkedIds.every((routeId) => activeFromCountry.has(routeId)),
      `${country.code} ${lang}: country hub links only to active routes`
    );
  }
}

for (const lang of ['ar', 'en']) {
  const file = join(previewRoot, lang, 'services', chauffeurConfig.hub.slug, 'index.html');
  const html = readFileSync(file, 'utf8');
  const linkedServices = [...html.matchAll(/data-active-service="([^"]+)"/g)].map((match) => match[1]);
  const activeServices = new Set(chauffeurConfig.services.filter((service) => service.active).map((service) => service.service_id));
  check(
    linkedServices.length === activeServices.size && linkedServices.every((serviceId) => activeServices.has(serviceId)),
    `${lang}: chauffeur hub links only to active services`
  );
}

const result = {
  ok: errors.length === 0,
  route_matrix_records: routesConfig.routes.length,
  active_routes: activeRouteIds,
  inactive_route_count: routesConfig.routes.filter((route) => !route.active).length,
  private_preview_html_pages: previewHtml.length,
  checks_passed: checks.length,
  errors
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
