import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const business = JSON.parse(readFileSync(join(root, 'config', 'business-config.json'), 'utf8'));
const pricing = JSON.parse(readFileSync(join(root, 'config', 'route-prices.json'), 'utf8'));
const excludedRoots = new Set(['admin', 'ai-chat-test', 'functions', 'node_modules', 'scratch', 'test-results', 'tests', 'templates']);
const excludedGuideSegments = new Set(['src', 'content', 'data', 'planning', 'qa', 'references', 'research', 'seo']);
const errors = [];
const pages = [];
const toPosix = (value) => value.split(sep).join('/');

function discover(directory = root) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    const rel = toPosix(relative(root, full));
    const segments = rel.split('/');
    if (entry.isDirectory()) {
      if (excludedRoots.has(segments[0])) continue;
      if (segments[0] === 'gcc-private-transport-guide' && segments.slice(1).some((part) => excludedGuideSegments.has(part))) continue;
      discover(full);
    } else if (entry.name.toLowerCase() === 'index.html') pages.push(full);
  }
}

function requireValue(condition, message) { if (!condition) errors.push(message); }

discover();
requireValue(business.brand_display_name === 'Vendora Transport', 'Unexpected public brand name');
requireValue(/^973\d{8}$/.test(business.booking_whatsapp), 'Invalid normalized WhatsApp number');
requireValue(/^\+973 \d{4} \d{4}$/.test(business.booking_whatsapp_display), 'Invalid display WhatsApp number');
requireValue(/^973\d{8}$/.test(business.support_phone), 'Invalid normalized support number');
requireValue(business.public_address && business.google_maps_url.startsWith('https://'), 'Address or Maps URL is blank');
requireValue(business.operating_hours_ar && business.operating_hours_en, 'Bilingual operating hours are required');
requireValue(business.default_whatsapp_message_ar && business.default_whatsapp_message_en, 'Bilingual WhatsApp messages are required');
requireValue(business.vehicle_assignment_wording_ar && business.vehicle_assignment_wording_en, 'Bilingual vehicle assignment wording is required');
requireValue(business.luggage_policy_heading_ar && business.luggage_policy_heading_en, 'Bilingual luggage policy headings are required');
requireValue(business.luggage_policy_wording_ar && business.luggage_policy_wording_en, 'Bilingual luggage policy wording is required');
requireValue(!/\b(?:up to|seats?|seating for)\s+\d+\b/i.test(business.passenger_capacity_en), 'Central passenger wording must not publish an unverified exact capacity');
requireValue(!/(?:حتى|سعة|تسع)\s*\d+\s*(?:ركاب|راكب)/.test(business.passenger_capacity_ar), 'Central passenger wording must not publish an unverified exact capacity');
requireValue(Array.isArray(business.supported_payments) && business.supported_payments.includes('Cash') && business.supported_payments.includes('BenefitPay'), 'Supported payments are incomplete');

const active = pricing.routes.filter((route) => route.active);
const ids = active.map((route) => route.route_id);
requireValue(new Set(ids).size === ids.length, 'Active route IDs must be unique');
for (const route of active) {
  requireValue(route.name_ar && route.name_en, `Missing bilingual name: ${route.route_id}`);
  requireValue(route.origin && route.destination, `Missing origin/destination: ${route.route_id}`);
  requireValue(route.currency === undefined || route.currency === 'BHD', `Invalid currency: ${route.route_id}`);
  requireValue(['fixed', 'from', 'range', 'quotation'].includes(route.price_type), `Invalid price type: ${route.route_id}`);
  requireValue(['vehicle', 'trip', 'hour', 'day'].includes(route.unit), `Invalid unit: ${route.route_id}`);
  requireValue(['public', 'quotation-only', 'hidden'].includes(route.visibility), `Invalid visibility: ${route.route_id}`);
  requireValue(route.note_ar && route.note_en, `Missing bilingual note: ${route.route_id}`);
  if (route.visibility === 'public' && ['fixed', 'from'].includes(route.price_type)) requireValue(Number.isFinite(route.one_way_price), `Blank public price: ${route.route_id}`);
}

let arabicPages = 0;
let englishPages = 0;
for (const file of pages) {
  const rel = toPosix(relative(root, file));
  const html = readFileSync(file, 'utf8');
  const isEnglish = rel.startsWith('en/') || rel === 'care/en/index.html' || /<html\b[^>]*lang=["']en/i.test(html);
  if (isEnglish) englishPages += 1; else arabicPages += 1;
  requireValue(!/\b(?:registration plate|plate number|chassis number|VIN|driver identity document|internal fleet identifier|vehicle registration\/category)\b/i.test(html), `Private vehicle or driver identifier wording: ${rel}`);
  requireValue(!/(?:رقم لوحة|لوحة تسجيل|رقم الهيكل|هوية السائق|معرّف الأسطول الداخلي)/.test(html), `Private vehicle or driver identifier wording: ${rel}`);
  requireValue(!/\b(?:up to|seats?|seating for)\s+(?:6|7)\b/i.test(html), `Unverified exact passenger capacity: ${rel}`);
  requireValue(!/(?:حتى|سعة|تسع)\s*(?:6|7)\s*(?:ركاب|راكب)/.test(html), `Unverified exact passenger capacity: ${rel}`);
  const theme = html.match(/<link\b[^>]*href=["']([^"']*vendora-theme\.css)["'][^>]*data-vendora-global-theme[^>]*>/i);
  const config = html.match(/<script\b[^>]*src=["']([^"']*vendora-config\.js)["'][^>]*data-vendora-global-config[^>]*><\/script>/i);
  requireValue(theme, `Missing global theme: ${rel}`);
  requireValue(config, `Missing global config: ${rel}`);
  if (theme) requireValue(existsSync(resolve(dirname(file), theme[1])), `Broken theme path: ${rel}`);
  if (config) requireValue(existsSync(resolve(dirname(file), config[1])), `Broken config path: ${rel}`);
  requireValue(!/data-vendora-(?:config|price)=["'][^"']*["'][^>]*>\s*<\/[^>]+>/i.test(html), `Blank generated placeholder: ${rel}`);
}

const pricePages = ['prices/index.html', 'en/prices/index.html'];
for (const rel of pricePages) {
  const html = readFileSync(join(root, rel), 'utf8');
  requireValue((html.match(/data-vendora-price=/g) || []).length === active.filter((route) => route.visibility === 'public' && ['fixed', 'from'].includes(route.price_type)).length, `Static price fallback count mismatch: ${rel}`);
  requireValue(!/<section\b[^>]*id=["']priceList["'][^>]*>\s*<\/section>/i.test(html), `Blank price list: ${rel}`);
}

const result = {
  ok: errors.length === 0,
  public_pages: pages.length,
  arabic_pages: arabicPages,
  english_pages: englishPages,
  pages_with_theme: pages.length - errors.filter((error) => error.startsWith('Missing global theme')).length,
  pages_with_business_config: pages.length - errors.filter((error) => error.startsWith('Missing global config')).length,
  active_route_prices: active.length,
  unique_active_route_ids: new Set(ids).size,
  errors
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
