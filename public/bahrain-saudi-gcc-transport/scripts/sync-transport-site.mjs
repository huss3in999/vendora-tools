import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const business = JSON.parse(readFileSync(join(root, 'config', 'business-config.json'), 'utf8'));
const pricing = JSON.parse(readFileSync(join(root, 'config', 'route-prices.json'), 'utf8'));
const repositoryRoot = resolve(root, '..', '..');
const routeArchitecture = JSON.parse(readFileSync(join(repositoryRoot, 'internal-preview', 'gcc-routes', 'config', 'gcc-routes.json'), 'utf8'));
const countryArchitecture = JSON.parse(readFileSync(join(repositoryRoot, 'internal-preview', 'gcc-routes', 'config', 'gcc-countries.json'), 'utf8'));
const chauffeurArchitecture = JSON.parse(readFileSync(join(repositoryRoot, 'internal-preview', 'gcc-routes', 'config', 'chauffeur-services.json'), 'utf8'));
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
    vehicle_assignment_wording_ar: business.vehicle_assignment_wording_ar,
    vehicle_assignment_wording_en: business.vehicle_assignment_wording_en,
    luggage_policy_heading_ar: business.luggage_policy_heading_ar,
    luggage_policy_heading_en: business.luggage_policy_heading_en,
    luggage_policy_wording_ar: business.luggage_policy_wording_ar,
    luggage_policy_wording_en: business.luggage_policy_wording_en,
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

function generatedAnalyticsMapSource() {
  const routes = {};
  for (const route of routeArchitecture.routes.filter((item) => item.active && item.public_path_ar && item.public_path_en)) {
    routes[route.slug] = {
      page_type: 'route',
      route_id: route.route_id,
      origin_country: route.origin_country,
      destination_country: route.destination_country,
      service_type: 'private_passenger_transport'
    };
  }
  const hubs = {};
  for (const country of countryArchitecture.countries) {
    const slug = country.code === 'BH' ? 'gcc-destinations' : country.hub_slug;
    hubs[slug] = {
      page_type: 'country_hub',
      origin_country: country.code,
      service_type: 'private_passenger_transport'
    };
  }
  const services = {};
  services[chauffeurArchitecture.hub.slug] = {
    page_type: 'chauffeur_hub',
    service_type: 'chauffeur'
  };
  for (const service of chauffeurArchitecture.services.filter((item) => item.active && item.existing_public_page)) {
    services[service.slug] = {
      page_type: 'chauffeur_service',
      service_id: service.service_id,
      service_type: 'chauffeur'
    };
  }
  return `/* AUTO-GENERATED by scripts/sync-transport-site.mjs from the internal GCC architecture. */\nwindow.VENDORA_TRANSPORT_ANALYTICS_MAP = Object.freeze(${JSON.stringify({ routes, hubs, services }, null, 2)});\n`;
}

function generatedWorkerDefaultsSource() {
  return `/* BEGIN GENERATED CENTRAL TRANSPORT DEFAULTS */
import businessConfig from '../../../bahrain-saudi-gcc-transport/config/business-config.json' with { type: 'json' };
import routePriceConfig from '../../../bahrain-saudi-gcc-transport/config/route-prices.json' with { type: 'json' };

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

function relativePublicAsset(file, asset) {
  const value = toPosix(relative(dirname(file), join(root, '..', asset)));
  return value.startsWith('.') ? value : `./${value}`;
}

function generatedRootContactHtml() {
  const template = readFileSync(join(root, 'templates', 'root-contact.html'), 'utf8');
  const whatsappUrl = `https://wa.me/${business.booking_whatsapp}?text=${encodeURIComponent(business.default_whatsapp_message_en)}`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': 'https://getvendora.net/contact/#webpage',
        url: 'https://getvendora.net/contact/',
        name: `Contact & Office | ${business.brand_display_name}`,
        description: `Contact ${business.brand_display_name} for 24/7 private transport, chauffeur booking and dispatch enquiries.`,
        inLanguage: 'en',
        mainEntity: { '@id': 'https://getvendora.net/#organization' }
      },
      {
        '@type': 'LocalBusiness',
        '@id': 'https://getvendora.net/#organization',
        name: business.brand_display_name,
        legalName: business.legal_name,
        url: 'https://getvendora.net/',
        logo: 'https://getvendora.net/bahrain-saudi-gcc-transport/assets/brand/vendora-transport-app-icon-512.png',
        image: 'https://getvendora.net/bahrain-saudi-gcc-transport/assets/brand/vendora-transport-app-icon-512.png',
        description: business.service_description_en,
        telephone: `+${business.booking_whatsapp}`,
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'reservations',
            telephone: `+${business.booking_whatsapp}`,
            availableLanguage: ['English', 'Arabic'],
            hoursAvailable: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '00:00',
              closes: '23:59'
            }
          },
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            telephone: `+${business.support_phone}`,
            availableLanguage: ['English', 'Arabic']
          }
        ],
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Office 240, Second Floor, The Address Tower',
          addressLocality: 'Seef',
          addressCountry: 'BH'
        },
        hasMap: business.google_maps_url,
        paymentAccepted: business.supported_payments.join(', '),
        openingHours: 'Mo-Su 00:00-23:59'
      }
    ]
  };
  const tokens = {
    BRAND_NAME: business.brand_display_name,
    SERVICE_DESCRIPTION: business.service_description_en,
    BOOKING_PHONE_DISPLAY: business.booking_whatsapp_display,
    SUPPORT_PHONE_DISPLAY: business.support_phone_display,
    SUPPORT_PHONE: business.support_phone,
    ADDRESS: business.public_address,
    MAP_URL: business.google_maps_url,
    PAYMENT_METHODS: business.supported_payments.join(' and '),
    OPERATING_HOURS: business.operating_hours_en,
    WHATSAPP_URL: whatsappUrl,
    COMPLAINTS_URL: business.complaints.path_en,
    SCHEMA_JSON: JSON.stringify(schema, null, 2)
  };
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in tokens)) throw new Error(`Unknown root contact template token: ${key}`);
    return key === 'SCHEMA_JSON' ? tokens[key] : escapeHtml(tokens[key]);
  });
}

function synchronizeHtml(file, original) {
  const rel = toPosix(relative(root, file));
  const lang = rel.startsWith('en/') || rel === 'care/en/index.html' || /<html\b[^>]*\blang=["']en/i.test(original) ? 'en' : 'ar';
  const themeHref = relativeAsset(file, 'assets/vendora-theme.css');
  const configSrc = relativeAsset(file, 'assets/vendora-config.js');
  const analyticsMapSrc = relativeAsset(file, 'assets/transport-analytics-map.js');
  const transportAnalyticsSrc = relativeAsset(file, 'assets/transport-analytics.js');
  const analyticsLoaderSrc = relativePublicAsset(file, 'assets/analytics-loader.js');
  const brandIconHref = relativeAsset(file, 'assets/brand/vendora-transport-app-icon.svg');
  const brandIconPngHref = relativeAsset(file, 'assets/brand/vendora-transport-app-icon-512.png');
  const brandWordmarkHref = relativeAsset(file, 'assets/brand/vendora-transport-logo-light.svg');
  const publicBrandIcon = 'https://getvendora.net/bahrain-saudi-gcc-transport/assets/brand/vendora-transport-app-icon-512.png';
  let html = original
    .replace(/\s*<!-- Vendora global sources:[\s\S]*?-->\s*/g, '\n')
    .replace(/\s*<link\b[^>]*data-vendora-global-theme[^>]*>\s*/gi, '\n')
    .replace(/\s*<script\b[^>]*data-vendora-global-config[^>]*><\/script>\s*/gi, '\n')
    .replace(/\s*<script\b[^>]*data-vendora-analytics-map[^>]*><\/script>\s*/gi, '\n')
    .replace(/\s*<script\b[^>]*data-vendora-transport-analytics[^>]*><\/script>\s*/gi, '\n')
    .replace(/\s*<script\b[^>]*analytics-loader\.js[^>]*><\/script>\s*/gi, '\n')
    .replace(/\s*<!-- Vendora brand sources:[\s\S]*?-->\s*/g, '\n')
    .replace(/\s*<link\b[^>]*data-vendora-brand-icon[^>]*>\s*/gi, '\n');

  html = html
    .replaceAll('97339998888', business.booking_whatsapp)
    .replaceAll('97333225954', business.booking_whatsapp)
    .replaceAll('+973 3322 5954', business.booking_whatsapp_display)
    .replaceAll('97333404044', business.support_phone)
    .replaceAll('+973 3340 4044', business.support_phone_display)
    .replaceAll('https://maps.app.goo.gl/XgirVcNRYSqJb1N26?g_st=ac', business.google_maps_url)
    .replaceAll('Office 240, Second Floor, The Address Tower, Seef, Kingdom of Bahrain', business.public_address)
    .replaceAll('https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-transparent.png', publicBrandIcon)
    .replaceAll('https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png', publicBrandIcon);

  const luggageHeading = lang === 'en' ? business.luggage_policy_heading_en : business.luggage_policy_heading_ar;
  const luggageWording = lang === 'en' ? business.luggage_policy_wording_en : business.luggage_policy_wording_ar;
  const assignmentWording = lang === 'en' ? business.vehicle_assignment_wording_en : business.vehicle_assignment_wording_ar;
  const vehicleNotice = `<section class="section vehicle-confirmation" data-vendora-vehicle-luggage-notice><div class="container section-shell"><div class="section-head"><h2>${escapeHtml(luggageHeading)}</h2><p>${escapeHtml(luggageWording)}</p><p>${escapeHtml(assignmentWording)}</p></div></div></section>`;
  html = html.replace(/<section\b[^>]*class=["'][^"']*\bvehicle-confirmation\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, vehicleNotice);

  const legacyCapabilityReplacements = lang === 'en'
    ? [
        [/GMC \/ XL vehicles seat up to 6 or 7 passengers, with rear space and a rack for luggage and bags\./g, business.passenger_capacity_en],
        [/Seating for 6 to 7 passengers(?: in a family SUV layout)? with luggage space and a rear rack(?: suited to bags and small parcels)?\./g, business.passenger_capacity_en],
        [/Daily round-the-clock operation, seating for up to 6 or 7 passengers per vehicle,/g, 'Round-the-clock booking requests, with passenger and luggage capacity confirmed for the assigned vehicle,'],
        [/A private driver, GMC\/XL vehicles, seating for 6 or 7 passengers,/g, 'A private driver and vehicle category confirmed for the booking,'],
        [/Rear space plus a luggage rack depending on passenger count\./g, business.luggage_policy_wording_en],
        [/Yes, there is luggage space and a rear rack available depending on load size\./g, business.luggage_policy_wording_en],
        [/Items that can be loaded inside the vehicle or on the rear rack only\./g, 'Items accepted only after their size and the assigned vehicle configuration are confirmed.'],
        [/\(up to 7 passengers\)/g, '(capacity confirmed for the assigned vehicle)']
      ]
    : [
        [/مركبات GMC \/ XL تسع حتى 6 أو 7 ركاب، مع مساحة خلفية وحامل للأمتعة والحقائب\./g, business.passenger_capacity_ar],
        [/سعة 6 إلى 7 ركاب(?: في تكوين SUV عائلية)? مع مساحة أمتعة وحامل خلفي(?: مناسب للأمتعة والطرود الصغيرة)?\./g, business.passenger_capacity_ar],
        [/تشغيل يومي على مدار الساعة، سعة حتى 6 أو 7 ركاب لكل مركبة،/g, 'يمكن إرسال طلبات الحجز على مدار الساعة، وتُؤكد سعة الركاب والأمتعة للمركبة المعيّنة،'],
        [/سائق خاص، مركبات GMC\/XL، سعة 6 أو 7 ركاب،/g, 'سائق خاص وفئة مركبة مؤكدة للحجز،'],
        [/مساحة خلفية \+ حامل للأمتعة بما يتناسب مع عدد الركاب\./g, business.luggage_policy_wording_ar],
        [/نعم، توجد مساحة أمتعة وحامل خلفي متاح حسب حجم الحمولة\./g, business.luggage_policy_wording_ar],
        [/الأغراض التي يمكن تحميلها داخل السيارة أو الحامل الخلفي فقط\./g, 'تُقبل الأغراض فقط بعد تأكيد حجمها وتجهيز المركبة المعيّنة.'],
        [/\(حتى 7 ركاب\)/g, '(تُؤكد السعة حسب المركبة المعيّنة)'],
        [/GMC\/XL مناسبة للعائلات حتى 7 ركاب مع حقائب\./g, 'تُراجع فئة المركبة وسعة الركاب والأمتعة وتُؤكد للحجز قبل الرحلة.']
      ];
  for (const [pattern, replacement] of legacyCapabilityReplacements) html = html.replace(pattern, replacement);

  html = html
    .replace(/\s*<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*>\s*/gi, '\n')
    .replace(/\s*<link\b[^>]*\brel=["']apple-touch-icon(?:-precomposed)?["'][^>]*>\s*/gi, '\n')
    .replace(/<(span|div)\b([^>]*\bclass=["'][^"']*\blogo\b[^"']*["'][^>]*)>[\s\S]*?<\/\1>/gi,
      `<$1$2><img class="vip-app-icon" src="${brandIconHref}" alt="" width="512" height="512" decoding="async" aria-hidden="true"></$1>`);

  if (!/class=["'][^"']*\bvip-footer-logo\b/i.test(html)) {
    html = html.replace(/(<div\b[^>]*\bclass=["'][^"']*\bfooter-card\b[^"']*["'][^>]*>)/i,
      `$1<img class="vip-footer-logo" src="${brandWordmarkHref}" alt="" width="840" height="180" loading="lazy" decoding="async" aria-hidden="true">`);
  }

  if (!/class=["'][^"']*\b(?:logo|vip-standalone-brand)\b/i.test(html)) {
    html = html.replace(/(<main\b[^>]*>)/i,
      `$1<div class="vip-standalone-brand" aria-hidden="true"><img src="${brandIconHref}" alt="" width="512" height="512" decoding="async"></div>`);
  }

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

  const isPrivateCarePage = rel === 'care/index.html' || rel === 'care/en/index.html';
  const generated = `\n  <!-- Vendora brand sources: generated by scripts/sync-transport-site.mjs. -->\n  <link rel="icon" type="image/svg+xml" href="${brandIconHref}" data-vendora-brand-icon />\n  <link rel="icon" type="image/png" sizes="512x512" href="${brandIconPngHref}" data-vendora-brand-icon />\n  <link rel="apple-touch-icon" sizes="512x512" href="${brandIconPngHref}" data-vendora-brand-icon />\n  <!-- Vendora global sources: edit config/*.json and assets/vendora-theme.css, then run npm run sync. -->\n  <link rel="stylesheet" href="${themeHref}" data-vendora-global-theme />\n  <script src="${configSrc}" data-vendora-global-config></script>${isPrivateCarePage ? '' : `\n  <script defer src="${analyticsMapSrc}" data-vendora-analytics-map></script>\n  <script defer src="${transportAnalyticsSrc}" data-vendora-transport-analytics></script>`}\n`;
  html = html.replace(/\s*<\/head>/i, `${generated}</head>`);
  if (!isPrivateCarePage) {
    html = html.replace(/\s*<\/body>/i, `\n  <script defer src="${analyticsLoaderSrc}" data-vendora-analytics-loader></script>\n</body>`);
  }
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
const analyticsMapPath = join(root, 'assets', 'transport-analytics-map.js');
const analyticsMapExpected = generatedAnalyticsMapSource();
const analyticsMapCurrent = (() => { try { return readFileSync(analyticsMapPath, 'utf8'); } catch { return ''; } })();
if (analyticsMapCurrent !== analyticsMapExpected) {
  changes.push(toPosix(relative(root, analyticsMapPath)));
  if (!checkOnly) writeFileSync(analyticsMapPath, analyticsMapExpected, 'utf8');
}
const canonicalAnalyticsLoaderPath = join(root, '..', 'assets', 'analytics-loader.js');
const localAnalyticsLoaderPath = join(root, 'assets', 'analytics-loader.js');
const canonicalAnalyticsLoader = readFileSync(canonicalAnalyticsLoaderPath, 'utf8');
const localAnalyticsLoader = (() => { try { return readFileSync(localAnalyticsLoaderPath, 'utf8'); } catch { return ''; } })();
if (localAnalyticsLoader !== canonicalAnalyticsLoader) {
  changes.push(toPosix(relative(root, localAnalyticsLoaderPath)));
  if (!checkOnly) writeFileSync(localAnalyticsLoaderPath, canonicalAnalyticsLoader, 'utf8');
}

const rootContactPath = resolve(root, '..', 'contact', 'index.html');
const rootContactExpected = generatedRootContactHtml();
const rootContactCurrent = readFileSync(rootContactPath, 'utf8');
if (rootContactCurrent !== rootContactExpected) {
  changes.push(toPosix(relative(root, rootContactPath)));
  if (!checkOnly) writeFileSync(rootContactPath, rootContactExpected, 'utf8');
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
