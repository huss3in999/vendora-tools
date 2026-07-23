/* BEGIN GENERATED CENTRAL TRANSPORT DEFAULTS */
import businessConfig from '../../../bahrain-saudi-gcc-transport/config/business-config.json';
import routePriceConfig from '../../../bahrain-saudi-gcc-transport/config/route-prices.json';

const DEFAULT_BOOKING_NUMBER = businessConfig.booking_whatsapp;
const CACHE_TTL_MS = 60_000;
let cached = null;

export const DEFAULT_PUBLIC_SETTINGS = Object.freeze({
  "brand_display_name": "Vendora Transport",
  "service_description_ar": "فندورا للنقل: خدمة نقل خاص ونقل ركاب وسائق خاص ورحلات عبر جسر الملك فهد ودول الخليج من البحرين.",
  "service_description_en": "Vendora Transport: Private car with driver, chauffeur service, airport transfers and cross-border GCC transport from Bahrain.",
  "booking_whatsapp": "97333225954",
  "booking_whatsapp_enabled": true,
  "support_phone": "97333404044",
  "support_phone_enabled": true,
  "public_email": "",
  "public_email_enabled": false,
  "instagram_url": "",
  "tiktok_url": "",
  "other_social_url": "",
  "operating_hours_ar": "تنسيق الحجوزات متاح على مدار الساعة، وتأكيد السائق والمركبة المناسبة يتم لكل طلب.",
  "operating_hours_en": "Booking coordination is available 24/7. The suitable driver and vehicle are confirmed for each request.",
  "cash_enabled": true,
  "benefitpay_enabled": true,
  "passenger_capacity_ar": "حتى 7 ركاب حسب المركبة المؤكدة وعدد الحقائب.",
  "passenger_capacity_en": "Up to 7 passengers, subject to the confirmed vehicle and luggage capacity.",
  "vehicle_wording_ar": "مركبات عائلية وسيدان مريحة وسيدان أعمال يتم تأكيدها قبل الاستلام.",
  "vehicle_wording_en": "Comfortable sedans, executive sedans, and spacious family vehicles confirmed before pickup.",
  "insurance_wording_ar": "مركبات مؤمّنة مع سائقين خبيرين.",
  "insurance_wording_en": "Insured vehicles driven by experienced drivers.",
  "public_address": "Office 240, Second Floor, The Address Tower, Seef, Kingdom of Bahrain",
  "address_display_enabled": true,
  "legal_name": "Vendora Transport",
  "cr_number": "",
  "legal_information_enabled": true,
  "sar_per_bhd": 10,
  "customer_name_enabled": false,
  "customer_name_required": false,
  "customer_phone_enabled": false,
  "customer_phone_required": false,
  "follow_up_consent_enabled": false
});

export const DEFAULT_PUBLIC_ROUTES = Object.freeze(routePriceConfig.routes.map((route) => [
  route.route_id,
  route.name_ar,
  route.name_en,
  route.visibility === 'public' && !['quotation', 'range'].includes(route.price_type) ? route.one_way_price : null,
  ({ fixed: 'standard', from: 'from', range: 'request_quote', quotation: 'request_quote' })[route.price_type] || 'request_quote',
  ({ vehicle: 'one_way_vehicle', trip: 'package', hour: 'package', day: 'per_day' })[route.unit] || 'one_way_vehicle'
]));
/* END GENERATED CENTRAL TRANSPORT DEFAULTS */

const ALLOWED_SETTING_KEYS = new Set(Object.keys(DEFAULT_PUBLIC_SETTINGS));

function cleanText(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanPhone(value) {
  return String(value || '').replace(/[^\d]/g, '').slice(0, 15);
}

function cleanUrl(value) {
  const text = cleanText(value, 500);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function cleanBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function sanitizePublicSettings(input = {}) {
  const next = { ...DEFAULT_PUBLIC_SETTINGS };
  for (const key of ALLOWED_SETTING_KEYS) {
    if (!(key in input)) continue;
    if (key.endsWith('_enabled') || key.endsWith('_required')) next[key] = cleanBoolean(input[key]);
    else if (key.endsWith('_url')) next[key] = cleanUrl(input[key]);
    else if (key === 'booking_whatsapp' || key === 'support_phone') next[key] = cleanPhone(input[key]);
    else if (key === 'sar_per_bhd') next[key] = Math.max(0, Math.min(100, Number(input[key]) || 10));
    else next[key] = cleanText(input[key], key.includes('description') ? 800 : 500);
  }
  if (!next.legal_information_enabled) {
    next.legal_name = '';
    next.cr_number = '';
  }
  if (!next.address_display_enabled) next.public_address = '';
  if (!next.booking_whatsapp) next.booking_whatsapp_enabled = false;
  return next;
}

export function sanitizePublicRoute(input = {}) {
  const slug = cleanText(input.route_slug, 160).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const price = input.price_bhd === '' || input.price_bhd == null ? null : Number(input.price_bhd);
  return {
    route_slug: slug,
    route_name_ar: cleanText(input.route_name_ar, 240),
    route_name_en: cleanText(input.route_name_en, 240),
    price_bhd: Number.isFinite(price) && price >= 0 && price <= 100000 ? Math.round(price * 1000) / 1000 : null,
    price_kind: ['standard', 'from', 'request_quote'].includes(input.price_kind) ? input.price_kind : 'standard',
    unit_kind: ['one_way_vehicle', 'package', 'per_day'].includes(input.unit_kind) ? input.unit_kind : 'one_way_vehicle',
    currency: input.currency === 'BHD' ? 'BHD' : 'BHD',
    trip_type: ['one_way', 'return_quote', 'full_day', 'additional_day'].includes(input.trip_type) ? input.trip_type : 'one_way',
    public_price_enabled: input.public_price_enabled === undefined ? true : cleanBoolean(input.public_price_enabled),
    approximate_sar_enabled: cleanBoolean(input.approximate_sar_enabled),
    causeway_toll_included: cleanBoolean(input.causeway_toll_included),
    is_active: cleanBoolean(input.is_active),
    whatsapp_override: cleanPhone(input.whatsapp_override),
    booking_notice_ar: cleanText(input.booking_notice_ar, 800),
    booking_notice_en: cleanText(input.booking_notice_en, 800),
    included_ar: cleanText(input.included_ar, 800),
    included_en: cleanText(input.included_en, 800),
    route_notes_ar: cleanText(input.route_notes_ar, 800),
    route_notes_en: cleanText(input.route_notes_en, 800),
    sort_order: Number.isFinite(Number(input.sort_order)) ? Math.round(Number(input.sort_order)) : 0,
  };
}

export async function ensurePublicSettingsSchema(env) {
  await env.TRANSPORT_DB.prepare(`CREATE TABLE IF NOT EXISTS transport_public_settings (id INTEGER PRIMARY KEY CHECK (id = 1), settings_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))` ).run();
  await env.TRANSPORT_DB.prepare(`CREATE TABLE IF NOT EXISTS transport_public_routes (route_slug TEXT PRIMARY KEY, route_name_ar TEXT NOT NULL, route_name_en TEXT NOT NULL, price_bhd REAL, price_kind TEXT NOT NULL DEFAULT 'standard', unit_kind TEXT NOT NULL DEFAULT 'one_way_vehicle', is_active INTEGER NOT NULL DEFAULT 1, whatsapp_override TEXT, booking_notice_ar TEXT, booking_notice_en TEXT, included_ar TEXT, included_en TEXT, route_notes_ar TEXT, route_notes_en TEXT, sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))` ).run();
  const info = await env.TRANSPORT_DB.prepare('PRAGMA table_info(transport_public_routes)').all();
  const columns = new Set((info.results || []).map((row) => row.name));
  const additions = [
    ['currency', "TEXT NOT NULL DEFAULT 'BHD'"],
    ['trip_type', "TEXT NOT NULL DEFAULT 'one_way'"],
    ['public_price_enabled', 'INTEGER NOT NULL DEFAULT 1'],
    ['approximate_sar_enabled', 'INTEGER NOT NULL DEFAULT 0'],
    ['causeway_toll_included', 'INTEGER NOT NULL DEFAULT 0'],
  ];
  for (const [name, type] of additions) {
    if (!columns.has(name)) await env.TRANSPORT_DB.prepare(`ALTER TABLE transport_public_routes ADD COLUMN ${name} ${type}`).run();
  }
  await env.TRANSPORT_DB.prepare(`INSERT OR IGNORE INTO transport_public_settings (id, settings_json, version) VALUES (1, ?, 1)`).bind(JSON.stringify(DEFAULT_PUBLIC_SETTINGS)).run();
  const sarRoutes = new Set(['king-fahd-causeway', 'bahrain-to-khobar', 'first-stop-after-causeway', 'bahrain-to-dammam-airport', 'bahrain-to-al-ahsa', 'bahrain-to-jubail', 'bahrain-to-riyadh', 'bahrain-to-madinah', 'bahrain-to-makkah', 'bahrain-to-khafji']);
  const localRoutes = new Set(['bahrain-sightseeing-full-day', 'bahrain-sightseeing-afternoon']);
  for (let i = 0; i < DEFAULT_PUBLIC_ROUTES.length; i += 1) {
    const [slug, ar, en, price, kind, unit] = DEFAULT_PUBLIC_ROUTES[i];
    const tripType = unit === 'package' ? 'full_day' : unit === 'per_day' ? 'additional_day' : 'one_way';
    await env.TRANSPORT_DB.prepare(`INSERT OR IGNORE INTO transport_public_routes (route_slug, route_name_ar, route_name_en, price_bhd, price_kind, unit_kind, currency, trip_type, public_price_enabled, approximate_sar_enabled, causeway_toll_included, is_active, included_ar, included_en, sort_order) VALUES (?, ?, ?, ?, ?, ?, 'BHD', ?, 1, ?, ?, 1, ?, ?, ?)`)
      .bind(slug, ar, en, price, kind, unit, tripType, sarRoutes.has(slug) ? 1 : 0, localRoutes.has(slug) ? 0 : 1, 'يشمل الرسوم العادية للمسار ورسوم جسر الملك فهد عند انطباقها.', 'Includes normal standard route charges and King Fahd Causeway tolls where applicable.', i + 1).run();
  }
}

export function invalidatePublicSettingsCache() {
  cached = null;
}

export async function getPublicConfig(env, options = {}) {
  const now = Date.now();
  if (!options.fresh && cached && cached.expiresAt > now) return cached.value;
  await ensurePublicSettingsSchema(env);
  const [settingsRow, routeResult] = await Promise.all([
    env.TRANSPORT_DB.prepare('SELECT settings_json, version, updated_at FROM transport_public_settings WHERE id = 1').first(),
    env.TRANSPORT_DB.prepare('SELECT * FROM transport_public_routes WHERE is_active = 1 ORDER BY sort_order, route_slug').all(),
  ]);
  let saved = {};
  try { saved = JSON.parse(settingsRow?.settings_json || '{}'); } catch { saved = {}; }
  const value = {
    settings: sanitizePublicSettings(saved),
    routes: (routeResult.results || []).map(sanitizePublicRoute).map((route) => (
      route.public_price_enabled && route.price_kind !== 'request_quote'
        ? route
        : { ...route, price_bhd: null }
    )),
    version: Number(settingsRow?.version || 1),
    updated_at: settingsRow?.updated_at || '',
  };
  cached = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export async function savePublicSettings(env, input) {
  await ensurePublicSettingsSchema(env);
  const settings = sanitizePublicSettings(input);
  await env.TRANSPORT_DB.prepare(`UPDATE transport_public_settings SET settings_json = ?, version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1`).bind(JSON.stringify(settings)).run();
  invalidatePublicSettingsCache();
  return getPublicConfig(env, { fresh: true });
}

export async function savePublicRoute(env, input) {
  await ensurePublicSettingsSchema(env);
  const route = sanitizePublicRoute(input);
  if (!route.route_slug || !route.route_name_ar || !route.route_name_en) throw new Error('Route slug and Arabic/English names are required');
  await env.TRANSPORT_DB.prepare(`INSERT INTO transport_public_routes (route_slug, route_name_ar, route_name_en, price_bhd, price_kind, unit_kind, currency, trip_type, public_price_enabled, approximate_sar_enabled, causeway_toll_included, is_active, whatsapp_override, booking_notice_ar, booking_notice_en, included_ar, included_en, route_notes_ar, route_notes_en, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ON CONFLICT(route_slug) DO UPDATE SET route_name_ar=excluded.route_name_ar, route_name_en=excluded.route_name_en, price_bhd=excluded.price_bhd, price_kind=excluded.price_kind, unit_kind=excluded.unit_kind, currency=excluded.currency, trip_type=excluded.trip_type, public_price_enabled=excluded.public_price_enabled, approximate_sar_enabled=excluded.approximate_sar_enabled, causeway_toll_included=excluded.causeway_toll_included, is_active=excluded.is_active, whatsapp_override=excluded.whatsapp_override, booking_notice_ar=excluded.booking_notice_ar, booking_notice_en=excluded.booking_notice_en, included_ar=excluded.included_ar, included_en=excluded.included_en, route_notes_ar=excluded.route_notes_ar, route_notes_en=excluded.route_notes_en, sort_order=excluded.sort_order, updated_at=excluded.updated_at`)
    .bind(route.route_slug, route.route_name_ar, route.route_name_en, route.price_bhd, route.price_kind, route.unit_kind, route.currency, route.trip_type, route.public_price_enabled ? 1 : 0, route.approximate_sar_enabled ? 1 : 0, route.causeway_toll_included ? 1 : 0, route.is_active ? 1 : 0, route.whatsapp_override, route.booking_notice_ar, route.booking_notice_en, route.included_ar, route.included_en, route.route_notes_ar, route.route_notes_en, route.sort_order).run();
  invalidatePublicSettingsCache();
  return route;
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30, stale-while-revalidate=300', ...(init.headers || {}) } });
}

export async function onRequestGet({ env }) {
  if (!env.TRANSPORT_DB) return json({ ok: false, error: 'Configuration unavailable' }, { status: 503 });
  const config = await getPublicConfig(env);
  return json({ ok: true, ...config, settings: sanitizePublicSettings(config.settings) });
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}
