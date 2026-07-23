import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const business = JSON.parse(readFileSync(join(root, 'config', 'business-config.json'), 'utf8'));
const pricing = JSON.parse(readFileSync(join(root, 'config', 'route-prices.json'), 'utf8'));
const excludedRoots = new Set(['admin', 'ai-chat-test', 'functions', 'node_modules', 'scratch', 'test-results', 'tests', 'templates']);
const excludedGuideSegments = new Set(['src', 'content', 'data', 'planning', 'qa', 'references', 'research', 'seo']);

const toPosix = (value) => value.split(sep).join('/');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const jsonForHtml = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function publicHtmlFiles(directory = root, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    const rel = toPosix(relative(root, full));
    const segments = rel.split('/');
    if (entry.isDirectory()) {
      if (excludedRoots.has(segments[0])) continue;
      if (segments[0] === 'gcc-private-transport-guide' && segments.slice(1).some((part) => excludedGuideSegments.has(part))) continue;
      publicHtmlFiles(full, files);
    } else if (entry.name.toLowerCase() === 'index.html') {
      files.push(full);
    }
  }
  return files.sort();
}

function legacySettings() {
  return {
    brand_display_name: business.brand_display_name,
    service_description_ar: business.service_description_ar,
    service_description_en: business.service_description_en,
    booking_whatsapp: business.booking_whatsapp,
    booking_whatsapp_enabled: business.booking_whatsapp_enabled,
    support_phone: business.support_phone,
    support_phone_enabled: business.support_phone_enabled,
    public_email: business.public_email,
    public_email_enabled: business.public_email_enabled,
    instagram_url: business.social_links.instagram_url,
    tiktok_url: business.social_links.tiktok_url,
    other_social_url: business.social_links.other_social_url,
    operating_hours_ar: business.operating_hours_ar,
    operating_hours_en: business.operating_hours_en,
    cash_enabled: business.cash_enabled,
    benefitpay_enabled: business.benefitpay_enabled,
    passenger_capacity_ar: business.passenger_capacity_ar,
    passenger_capacity_en: business.passenger_capacity_en,
    vehicle_wording_ar: business.vehicle_wording_ar,
    vehicle_wording_en: business.vehicle_wording_en,
    insurance_wording_ar: business.insurance_wording_ar,
    insurance_wording_en: business.insurance_wording_en,
    public_address: business.public_address,
    address_display_enabled: business.address_display_enabled,
    legal_name: business.legal_name,
    cr_number: business.cr_number,
    legal_information_enabled: business.legal_information_enabled,
    sar_per_bhd: business.sar_per_bhd,
    customer_name_enabled: false,
    customer_name_required: false,
    customer_phone_enabled: false,
    customer_phone_required: false,
    follow_up_consent_enabled: false
  };
}

function legacyRoute(route, index) {
  const kind = { fixed: 'standard', from: 'from', range: 'request_quote', quotation: 'request_quote' }[route.price_type] || 'request_quote';
  const unit = { vehicle: 'one_way_vehicle', trip: 'package', hour: 'package', day: 'per_day' }[route.unit] || 'one_way_vehicle';
  const publicPrice = route.visibility === 'public' && !['quotation', 'range'].includes(route.price_type);
  return {
    route_slug: route.route_id,
    route_name_ar: route.name_ar,
    route_name_en: route.name_en,
    price_bhd: publicPrice ? route.one_way_price : null,
    price_kind: kind,
    unit_kind: unit,
    currency: 'BHD',
    trip_type: unit === 'per_day' ? 'additional_day' : unit === 'package' ? 'full_day' : 'one_way',
    public_price_enabled: publicPrice,
    approximate_sar_enabled: ['king-fahd-causeway', 'bahrain-to-khobar', 'first-stop-after-causeway', 'bahrain-to-dammam-airport', 'bahrain-to-al-ahsa', 'bahrain-to-jubail', 'bahrain-to-riyadh', 'bahrain-to-madinah', 'bahrain-to-makkah', 'bahrain-to-khafji'].includes(route.route_id),
    causeway_toll_included: route.surcharge?.causeway_toll_included === true,
    is_active: route.active,
    whatsapp_override: '',
    booking_notice_ar: route.note_ar,
    booking_notice_en: route.note_en,
    included_ar: route.surcharge?.causeway_toll_included ? 'يشمل رسوم جسر الملك فهد عند انطباقها.' : '',
    included_en: route.surcharge?.causeway_toll_included ? 'Includes King Fahd Causeway tolls where applicable.' : '',
    route_notes_ar: route.note_ar,
    route_notes_en: route.note_en,
    sort_order: index + 1
  };
}

const publicConfig = { settings: legacySettings(), routes: pricing.routes.map(legacyRoute), version: business.config_version, updated_at: business.last_updated };

function generatedConfigSource() {
  return `/* AUTO-GENERATED by scripts/sync-transport-site.mjs. Edit config/*.json, not this file. */\nwindow.VENDORA_BUSINESS_CONFIG = Object.freeze(${JSON.stringify(business, null, 2)});\nwindow.VENDORA_ROUTE_PRICES = Object.freeze(${JSON.stringify(pricing.routes, null, 2)});\nwindow.VENDORA_PUBLIC_CONFIG = Object.freeze(${JSON.stringify(publicConfig, null, 2)});\n`;
}

function generatedWorkerDefaultsSource() {
  return `/* BEGIN GENERATED CENTRAL TRANSPORT DEFAULTS */
import businessConfig from '../../../bahrain-saudi-gcc-transport/config/business-config.json';
import routePriceConfig from '../../../bahrain-saudi-gcc-transport/config/route-prices.json';

const DEFAULT_BOOKING_NUMBER = businessConfig.booking_whatsapp;
const CACHE_TTL_MS = 60_000;
let cached = null;

export const DEFAULT_PUBLIC_SETTINGS = Object.freeze(${JSON.stringify(legacySettings(), null, 2)});

export const DEFAULT_PUBLIC_ROUTES = Object.freeze(routePriceConfig.routes.map((route) => [
  route.route_id,
  route.name_ar,
  route.name_en,
  route.visibility === 'public' && !['quotation', 'range'].includes(route.price_type) ? route.one_way_price : null,
  ({ fixed: 'standard', from: 'from', range: 'request_quote', quotation: 'request_quote' })[route.price_type] || 'request_quote',
  ({ vehicle: 'one_way_vehicle', trip: 'package', hour: 'package', day: 'per_day' })[route.unit] || 'one_way_vehicle'
]));
/* END GENERATED CENTRAL TRANSPORT DEFAULTS */`;
}

function routeUrl(route, lang) {
  const known = route.route_slug.startsWith('bahrain-to-') ? `${route.route_slug}/` : '';
  return `https://getvendora.net/bahrain-saudi-gcc-transport/${lang === 'en' ? 'en/' : ''}${known}`;
}

function priceCards(lang) {
  return publicConfig.routes.filter((route) => route.is_active && route.public_price_enabled && route.price_bhd != null).map((route) => {
    const name = lang === 'en' ? route.route_name_en : route.route_name_ar;
    const from = route.price_kind === 'from' ? (lang === 'en' ? 'From ' : 'ابتداءً من ') : '';
    const unit = route.unit_kind === 'per_day' ? (lang === 'en' ? 'per additional day' : 'لليوم الإضافي') : route.unit_kind === 'package' ? (lang === 'en' ? 'per package' : 'للباقة') : (lang === 'en' ? 'per vehicle, one way' : 'للمركبة، اتجاه واحد');
    const note = lang === 'en' ? route.route_notes_en : route.route_notes_ar;
    const currency = lang === 'en' ? 'BHD' : 'د.ب';
    return `<article class="price-card" data-vendora-price="${escapeHtml(route.route_slug)}"><h2>${escapeHtml(name)}</h2><p class="price"><strong>${from}${escapeHtml(route.price_bhd)} ${currency}</strong></p><p>${escapeHtml(unit)}</p><p>${escapeHtml(note)}</p><a href="https://wa.me/${business.booking_whatsapp}" data-vendora-config="whatsapp-link" data-wa-message="${escapeHtml(lang === 'en' ? business.default_whatsapp_message_en : business.default_whatsapp_message_ar)}">${lang === 'en' ? 'Check availability' : 'تحقق من التوفر'}</a></article>`;
  }).join('');
}

function pricingSchema(lang) {
  const routes = publicConfig.routes.filter((route) => route.is_active && route.public_price_enabled && route.price_bhd != null);
  return jsonForHtml({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: routes.map((route, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'Service', name: lang === 'en' ? route.route_name_en : route.route_name_ar, url: routeUrl(route, lang), offers: { '@type': 'Offer', price: route.price_bhd, priceCurrency: 'BHD', description: lang === 'en' ? route.route_notes_en : route.route_notes_ar } } }))
  });
}

function relativeAsset(file, asset) {
  const value = toPosix(relative(dirname(file), join(root, asset)));
  return value.startsWith('.') ? value : `./${value}`;
}

function synchronizeHtml(file, original) {
  const rel = toPosix(relative(root, file));
  const lang = rel.startsWith('en/') || rel === 'care/en/index.html' || /<html\b[^>]*\blang=["']en/i.test(original) ? 'en' : 'ar';
  const themeHref = relativeAsset(file, 'assets/vendora-theme.css');
  const configSrc = relativeAsset(file, 'assets/vendora-config.js');
  let html = original
    .replace(/\s*<!-- Vendora global sources:[\s\S]*?-->\s*/g, '\n')
    .replace(/\s*<link\b[^>]*data-vendora-global-theme[^>]*>\s*/gi, '\n')
    .replace(/\s*<script\b[^>]*data-vendora-global-config[^>]*><\/script>\s*/gi, '\n');

  html = html
    .replaceAll('97339998888', business.booking_whatsapp)
    .replaceAll('97333225954', business.booking_whatsapp)
    .replaceAll('+973 3322 5954', business.booking_whatsapp_display)
    .replaceAll('97333404044', business.support_phone)
    .replaceAll('+973 3340 4044', business.support_phone_display)
    .replaceAll('https://maps.app.goo.gl/XgirVcNRYSqJb1N26?g_st=ac', business.google_maps_url)
    .replaceAll('Office 240, Second Floor, The Address Tower, Seef, Kingdom of Bahrain', business.public_address);

  html = html.replace(/<a\b([^>]*href=["']https:\/\/wa\.me\/[^"']+["'][^>]*)>/gi, (match, attrs) => /data-vendora-config=/.test(attrs) ? match : `<a${attrs} data-vendora-config="whatsapp-link">`);
  html = html.replace(/<a\b([^>]*(?:data-wa-message|data-booking-submit)[^>]*)>/gi, (match, attrs) => {
    let next = attrs;
    if (!/\bhref\s*=/i.test(next)) next = ` href="https://wa.me/${business.booking_whatsapp}"${next}`;
    if (!/data-vendora-config\s*=/i.test(next)) next += ' data-vendora-config="whatsapp-link"';
    return `<a${next}>`;
  });
  html = html.replace(/<a\b([^>]*href=["']tel:\+97333225954["'][^>]*)>/gi, (match, attrs) => /data-vendora-config=/.test(attrs) ? match : `<a${attrs} data-vendora-config="whatsapp-phone">`);
  html = html.replace(/<a\b([^>]*href=["']tel:\+97333404044["'][^>]*)>/gi, (match, attrs) => /data-vendora-config=/.test(attrs) ? match : `<a${attrs} data-vendora-config="support-phone">`);

  if (rel === 'prices/index.html' || rel === 'en/prices/index.html') {
    html = html.replace(/(<section\b[^>]*id=["']priceList["'][^>]*>)[\s\S]*?(<\/section>)/i, `$1${priceCards(lang)}$2`);
    html = html.replace(/(<script\b[^>]*id=["']pricesSchema["'][^>]*>)[\s\S]*?(<\/script>)/i, `$1${pricingSchema(lang)}$2`);
  }

  const generated = `\n  <!-- Vendora global sources: edit config/*.json and assets/vendora-theme.css, then run npm run sync. -->\n  <link rel="stylesheet" href="${themeHref}" data-vendora-global-theme />\n  <script src="${configSrc}" data-vendora-global-config></script>\n`;
  html = html.replace(/\s*<\/head>/i, `${generated}</head>`);
  return html;
}

const changes = [];
const workerDefaultsPath = resolve(root, '..', 'functions', 'api', 'transport', 'public-settings.js');
const workerCurrent = readFileSync(workerDefaultsPath, 'utf8');
const workerExpected = workerCurrent.replace(/\/\* BEGIN GENERATED CENTRAL TRANSPORT DEFAULTS \*\/[\s\S]*?\/\* END GENERATED CENTRAL TRANSPORT DEFAULTS \*\//, generatedWorkerDefaultsSource());
if (workerCurrent !== workerExpected) {
  changes.push(toPosix(relative(root, workerDefaultsPath)));
  if (!checkOnly) writeFileSync(workerDefaultsPath, workerExpected, 'utf8');
}
const generatedPath = join(root, 'assets', 'vendora-config.js');
const generatedExpected = generatedConfigSource();
const generatedCurrent = (() => { try { return readFileSync(generatedPath, 'utf8'); } catch { return ''; } })();
if (generatedCurrent !== generatedExpected) {
  changes.push(toPosix(relative(root, generatedPath)));
  if (!checkOnly) writeFileSync(generatedPath, generatedExpected, 'utf8');
}

for (const file of publicHtmlFiles()) {
  const current = readFileSync(file, 'utf8');
  const expected = synchronizeHtml(file, current);
  if (current !== expected) {
    changes.push(toPosix(relative(root, file)));
    if (!checkOnly) writeFileSync(file, expected, 'utf8');
  }
}

const result = { mode: checkOnly ? 'check' : 'write', public_pages: publicHtmlFiles().length, changed_files: changes.length, files: changes };
console.log(JSON.stringify(result, null, 2));
if (checkOnly && changes.length) process.exitCode = 1;
