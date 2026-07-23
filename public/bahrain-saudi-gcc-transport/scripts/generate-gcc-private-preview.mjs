import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(root, 'gcc-private-transport-guide', 'planning', 'private-preview');
const expectedOutputSuffix = join('gcc-private-transport-guide', 'planning', 'private-preview');
if (!outputRoot.startsWith(root) || !outputRoot.endsWith(expectedOutputSuffix)) {
  throw new Error(`Unsafe preview output path: ${outputRoot}`);
}

const loadJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const routesConfig = loadJson('config/gcc-routes.json');
const countriesConfig = loadJson('config/gcc-countries.json');
const chauffeurConfig = loadJson('config/chauffeur-services.json');
const business = loadJson('config/business-config.json');
const pricing = loadJson('config/route-prices.json');
const routeTemplate = readFileSync(join(root, 'templates', 'gcc-route-preview.html'), 'utf8');
const hubTemplate = readFileSync(join(root, 'templates', 'gcc-country-hub-preview.html'), 'utf8');
const chauffeurTemplate = readFileSync(join(root, 'templates', 'gcc-chauffeur-hub-preview.html'), 'utf8');

const countries = new Map(countriesConfig.countries.map((country) => [country.code, country]));
const routes = new Map(routesConfig.routes.map((route) => [route.route_id, route]));
const priceById = new Map(pricing.routes.map((route) => [route.route_id, route]));
const previewRoutes = routesConfig.routes.filter((route) =>
  route.active || route.preview_batch === 'operational_approval_batch_1'
);
const previewRouteIds = new Set(previewRoutes.map((route) => route.route_id));

const posix = (value) => value.split(sep).join('/');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
})[character]);
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const render = (template, values) => template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
  if (!(key in values)) throw new Error(`Missing template token ${key}`);
  return String(values[key]);
});
const write = (file, contents) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents, 'utf8');
};
const relativeHref = (fromFile, toFile) => {
  const value = posix(relative(dirname(fromFile), toFile));
  return value.startsWith('.') ? value : `./${value}`;
};
const assetPrefix = (file) => {
  const value = posix(relative(dirname(file), root));
  return value ? `${value}/` : './';
};
const listItems = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function countryName(country, lang) {
  return lang === 'ar' ? country.name_ar : country.name_en;
}

function areaNames(country, lang) {
  return country.pickup_areas.map((area) => area[lang]);
}

function airportNames(country, lang) {
  return country.airports.map((airport) =>
    `${lang === 'ar' ? airport.name_ar : airport.name_en} (${airport.code})`
  );
}

function expandPatterns(patterns, origin, destination, lang) {
  const originName = countryName(origin, lang);
  const destinationName = countryName(destination, lang);
  return patterns.map((pattern) => pattern
    .replaceAll('{origin}', originName)
    .replaceAll('{destination}', destinationName));
}

function routePreviewFile(route, lang) {
  return join(outputRoot, lang, 'routes', route.slug, 'index.html');
}

function hubPreviewFile(country, lang) {
  return join(outputRoot, lang, 'hubs', country.hub_slug, 'index.html');
}

function chauffeurPreviewFile(lang) {
  return join(outputRoot, lang, 'services', chauffeurConfig.hub.slug, 'index.html');
}

function priceCopy(route, lang) {
  const price = route.price_id ? priceById.get(route.price_id) : null;
  if (route.quotation_status === 'fixed' && price?.one_way_price != null) {
    return lang === 'ar'
      ? `السعر المركزي الحالي ${price.one_way_price} د.ب للمركبة في اتجاه واحد، ويعاد تأكيد تفاصيل الرحلة قبل الحجز.`
      : `The current central price is BHD ${price.one_way_price} per vehicle, one way; journey details are reconfirmed before booking.`;
  }
  if (route.quotation_status === 'from' && price?.one_way_price != null) {
    return lang === 'ar'
      ? `السعر يبدأ من ${price.one_way_price} د.ب للمركبة، ويعتمد السعر النهائي على المدينة والتوقفات والتفاصيل المؤكدة.`
      : `Pricing starts from BHD ${price.one_way_price} per vehicle; the final price depends on the city, stops and confirmed details.`;
  }
  return lang === 'ar'
    ? 'هذا المسار يحتاج إلى عرض سعر بعد مراجعة نقطة الاستلام والوجهة والتاريخ وعدد الركاب والحقائب.'
    : 'This route requires a quotation after the pickup point, destination, date, passengers and luggage are reviewed.';
}

function routeSchema(route, origin, destination, lang, faqEntries) {
  const name = lang === 'ar'
    ? `نقل خاص من ${origin.name_ar} إلى ${destination.name_ar}`
    : `Private transport from ${origin.name_en} to ${destination.name_en}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://getvendora.net/#organization',
        name: business.brand_display_name
      },
      {
        '@type': 'Service',
        name,
        provider: {'@id': 'https://getvendora.net/#organization'},
        areaServed: [origin.name_en, destination.name_en],
        serviceType: 'Private passenger transport',
        description: lang === 'ar'
          ? 'معاينة خاصة غير قابلة للفهرسة لمسار نقل ركاب، ولا تمثل ضماناً للتوفر.'
          : 'Private non-indexable passenger-transport preview; it is not a guarantee of availability.'
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {'@type': 'ListItem', position: 1, name: lang === 'ar' ? 'المعاينة الخاصة' : 'Private preview'},
          {'@type': 'ListItem', position: 2, name}
        ]
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqEntries.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: {'@type': 'Answer', text: entry.answer}
        }))
      }
    ]
  };
}

function routeValues(route, lang, file) {
  const origin = countries.get(route.origin_country);
  const destination = countries.get(route.destination_country);
  const reverse = routes.get(route.reverse_route_id);
  const profile = routesConfig.keyword_profiles[route.keyword_profile_id];
  const isAr = lang === 'ar';
  const originName = countryName(origin, lang);
  const destinationName = countryName(destination, lang);
  const secondary = expandPatterns(
    isAr ? profile.secondary_patterns_ar : profile.secondary_patterns_en,
    origin,
    destination,
    lang
  );
  const informational = expandPatterns(
    isAr ? profile.informational_patterns_ar : profile.informational_patterns_en,
    origin,
    destination,
    lang
  );
  const faqEntries = isAr ? [
    {
      question: `هل التوفر مضمون من ${originName} إلى ${destinationName}؟`,
      answer: route.active
        ? 'يتم التحقق من التوفر لكل طلب، ولا يعتبر عرض الصفحة ضماناً غير مشروط.'
        : 'لا. المسار غير نشط ويحتاج إلى مراجعة تشغيلية قبل قبول أي حجز.'
    },
    {
      question: 'متى أعرف السائق والمركبة؟',
      answer: 'يتم إبلاغ العميل بالسائق والمركبة المخصصين قبل موعد الاستلام.'
    },
    {
      question: 'من المسؤول عن الجواز والتأشيرة ووثائق الدخول؟',
      answer: 'الراكب مسؤول عن صلاحية الجواز والتأشيرة وجميع متطلبات الدخول والعبور.'
    }
  ] : [
    {
      question: `Is availability guaranteed from ${originName} to ${destinationName}?`,
      answer: route.active
        ? 'Availability is checked for every request; this page is not an unconditional guarantee.'
        : 'No. This route is inactive and requires an operational review before any booking can be accepted.'
    },
    {
      question: 'When will the driver and vehicle be provided?',
      answer: 'The customer is informed of the assigned driver and vehicle before pickup.'
    },
    {
      question: 'Who is responsible for passports, visas and entry documents?',
      answer: 'Passengers are responsible for valid passports, visas and all entry and transit requirements.'
    }
  ];
  const bookingMessage = isAr
    ? `مرحباً، أريد الاستفسار عن النقل من ${originName} إلى ${destinationName}.`
    : `Hello, I would like to ask about transport from ${originName} to ${destinationName}.`;
  const bookingAction = route.active
    ? `<div class="hero-actions"><a class="primary-btn" href="https://wa.me/${business.booking_whatsapp}?text=${encodeURIComponent(bookingMessage)}" data-private-preview-booking="active-route">${isAr ? 'طلب التحقق من التوفر' : 'Request an availability check'}</a></div>`
    : `<div class="hero-actions"><span class="keyword-chip" data-inactive-no-booking="true">${isAr ? 'لا يوجد رابط حجز لهذا المسار غير النشط' : 'No booking link is available for this inactive route'}</span></div>`;
  const airportItems = [...airportNames(origin, lang), ...airportNames(destination, lang)];
  const reverseFile = routePreviewFile(reverse, lang);
  if (!previewRouteIds.has(reverse.route_id)) {
    throw new Error(`Preview route ${route.route_id} requires reverse preview ${reverse.route_id}`);
  }

  return {
    LANG: lang,
    DIR: isAr ? 'rtl' : 'ltr',
    TITLE: escapeHtml(isAr
      ? `معاينة نقل خاص من ${originName} إلى ${destinationName} | Vendora`
      : `Preview: ${originName} to ${destinationName} private transport | Vendora`),
    DESCRIPTION: escapeHtml(isAr
      ? `معاينة خاصة غير قابلة للفهرسة لبنية النقل من ${originName} إلى ${destinationName}.`
      : `Private non-indexable architecture preview for transport from ${originName} to ${destinationName}.`),
    ASSET_PREFIX: assetPrefix(file),
    SCHEMA_JSON: safeJson(routeSchema(route, origin, destination, lang, faqEntries)),
    ROUTE_ID: route.route_id,
    ACTIVE: String(route.active),
    BRAND_SUBTITLE: isAr ? 'النقل الخاص وخدمات السيارة مع سائق' : 'Private transport and chauffeur services',
    PREVIEW_LABEL: isAr ? 'معاينة خاصة غير مفهرسة' : 'Private non-indexable preview',
    STATUS_LABEL: route.active
      ? (isAr ? 'مسار حالي محفوظ للمراجعة' : 'Existing active route — preview upgrade')
      : (isAr ? 'مسار غير نشط — للمراجعة التشغيلية فقط' : 'Inactive route — operational review only'),
    HEADING: isAr ? `نقل خاص من ${originName} إلى ${destinationName}` : `Private transport from ${originName} to ${destinationName}`,
    INTRO: isAr
      ? `خدمة نقل ركاب خاصة من ${originName} إلى ${destinationName} حسب التوفر والتأكيد التشغيلي لكل طلب.`
      : `Private passenger transport from ${originName} to ${destinationName}, subject to availability and operational confirmation for each request.`,
    BOOKING_ACTION: bookingAction,
    ASSIGNMENT_HEADING: isAr ? 'تأكيد السائق والمركبة' : 'Driver and vehicle confirmation',
    ASSIGNMENT_COPY: isAr
      ? 'قد تنفذ الرحلة بمركبة تابعة لفندورا أو بواسطة مكتب نقل معتمد أو شريك تشغيل موثوق. يتم إبلاغ العميل بالسائق والمركبة قبل الاستلام.'
      : 'A journey may be fulfilled by Vendora or an approved transport office or trusted operating partner. The assigned driver and vehicle are disclosed before pickup.',
    ROUTE_ID_LABEL: isAr ? 'رمز المسار' : 'Route ID',
    JOURNEY_HEADING: isAr ? 'تخطيط الرحلة' : 'Journey planning',
    JOURNEY_COPY: isAr
      ? 'يتم تأكيد مسار الطريق ونقاط الحدود وموعد الالتقاء بعد مراجعة تفاصيل الطلب؛ ولا يوجد ضمان لوقت عبور ثابت.'
      : 'The road route, border points and meeting time are confirmed after the request is reviewed; no fixed border-crossing time is guaranteed.',
    PICKUP_HEADING: isAr ? 'مناطق الاستلام المحتملة' : 'Potential pickup areas',
    PICKUP_ITEMS: listItems(areaNames(origin, lang)),
    DESTINATION_HEADING: isAr ? 'مناطق الوصول المحتملة' : 'Potential destination areas',
    DESTINATION_ITEMS: listItems(areaNames(destination, lang)),
    AIRPORT_HEADING: isAr ? 'المطارات ذات الصلة' : 'Relevant airports',
    AIRPORT_ITEMS: listItems(airportItems.length ? airportItems : [isAr ? 'يحدد المطار عند الطلب' : 'Airport confirmed with the request']),
    VEHICLE_HEADING: isAr ? 'المركبة والحقائب' : 'Vehicle and luggage',
    VEHICLE_COPY: isAr
      ? 'تحدد فئة المركبة حسب عدد الركاب والحقائب ومقعد الطفل المطلوب والتوفر المؤكد.'
      : 'The vehicle category is selected for the confirmed passenger count, luggage, requested child seat and availability.',
    KEYWORD_HEADING: isAr ? 'مجموعة الكلمات المرشحة' : 'Candidate keyword cluster',
    KEYWORD_STATUS: isAr ? 'الحالة: في انتظار التحقق عبر مخطط الكلمات الرئيسية' : 'Status: pending Keyword Planner validation',
    COMMERCIAL_HEADING: isAr ? 'المرشح التجاري' : 'Commercial candidate',
    COMMERCIAL_KEYWORD: escapeHtml(isAr ? route.commercial_keyword_candidate_ar : route.commercial_keyword_candidate_en),
    SECONDARY_HEADING: isAr ? 'عبارات تجارية مساندة' : 'Secondary commercial phrases',
    SECONDARY_ITEMS: listItems(secondary),
    INFORMATIONAL_HEADING: isAr ? 'عبارات معلوماتية مساندة' : 'Supporting informational phrases',
    INFORMATIONAL_ITEMS: listItems(informational),
    TERMS_HEADING: isAr ? 'الشروط العملية قبل الحجز' : 'Practical conditions before booking',
    DOCUMENTS_COPY: isAr
      ? 'الراكب مسؤول عن الجواز والتأشيرة ووثائق الدخول والعبور.'
      : 'Passengers are responsible for passports, visas, entry documents and transit requirements.',
    TIME_COPY: isAr
      ? 'مدة الطريق تقديرية وتتأثر بالحدود والطريق والتوقفات ولا تمثل ضماناً.'
      : 'Travel time is an estimate affected by borders, road conditions and stops; it is not guaranteed.',
    LUGGAGE_COPY: isAr
      ? 'يجب إرسال عدد الحقائب وأحجامها قبل تأكيد المركبة.'
      : 'Luggage quantity and size must be supplied before the vehicle is confirmed.',
    CHILD_SEAT_COPY: isAr ? 'يمكن طلب مقعد طفل ويخضع للتوفر والتأكيد.' : 'A child seat may be requested, subject to confirmation and availability.',
    WAITING_COPY: isAr
      ? 'العودة والانتظار والتوقفات المتعددة تحتاج إلى تأكيد وتسعير منفصل.'
      : 'Return journeys, waiting and multiple stops require separate confirmation and pricing.',
    PRICING_COPY: priceCopy(route, lang),
    FAQ_HEADING: isAr ? 'أسئلة هذا المسار' : 'Route questions',
    FAQ_CARDS: faqEntries.map((entry) =>
      `<article class="route-card"><h3>${escapeHtml(entry.question)}</h3><p>${escapeHtml(entry.answer)}</p></article>`
    ).join(''),
    RELATED_HEADING: isAr ? 'الروابط ذات الصلة' : 'Related links',
    ORIGIN_HUB_HREF: relativeHref(file, hubPreviewFile(origin, lang)),
    ORIGIN_HUB_LABEL: isAr ? `النقل من ${originName}` : `Transport from ${originName}`,
    DESTINATION_HUB_HREF: relativeHref(file, hubPreviewFile(destination, lang)),
    DESTINATION_HUB_LABEL: isAr ? `النقل من ${destinationName}` : `Transport from ${destinationName}`,
    REVERSE_HREF: relativeHref(file, reverseFile),
    REVERSE_LABEL: isAr
      ? `المسار العكسي من ${destinationName} إلى ${originName}`
      : `Reverse route from ${destinationName} to ${originName}`,
    SUPPORT_PATH: isAr ? 'complaints/index.html' : 'en/complaints/index.html',
    SUPPORT_LABEL: isAr ? 'الشكاوى والدعم' : 'Complaints and support',
    REVIEWS_PATH: isAr ? 'customer-reviews/index.html' : 'en/customer-reviews/index.html',
    REVIEWS_LABEL: isAr ? 'آراء العملاء' : 'Customer reviews',
    POLICY_PATH: isAr ? 'booking-policy/index.html' : 'en/booking-policy/index.html',
    POLICY_LABEL: isAr ? 'سياسة الحجز' : 'Booking policy'
  };
}

function hubValues(country, lang, file) {
  const isAr = lang === 'ar';
  const name = countryName(country, lang);
  const activeRoutes = routesConfig.routes.filter((route) =>
    route.origin_country === country.code && route.active
  );
  const routeCards = activeRoutes.map((route) => {
    const destination = countries.get(route.destination_country);
    const label = isAr
      ? `نقل خاص من ${name} إلى ${destination.name_ar}`
      : `Private transport from ${name} to ${destination.name_en}`;
    return `<a class="route-card" data-active-route-link="${route.route_id}" href="${relativeHref(file, routePreviewFile(route, lang))}"><h3>${escapeHtml(label)}</h3><p>${isAr ? 'مسار حالي ظاهر في المعاينة.' : 'Existing active route shown in the preview.'}</p></a>`;
  }).join('');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isAr ? `النقل من ${name}` : `Transport from ${name}`,
    description: isAr
      ? 'معاينة خاصة تعرض المسارات النشطة فقط.'
      : 'Private preview showing active routes only.',
    hasPart: activeRoutes.map((route) => ({'@type': 'Service', name: route.route_id}))
  };
  return {
    LANG: lang,
    DIR: isAr ? 'rtl' : 'ltr',
    TITLE: escapeHtml(isAr ? `معاينة النقل من ${name} | Vendora` : `Preview: transport from ${name} | Vendora`),
    DESCRIPTION: escapeHtml(isAr ? `معاينة خاصة لمسارات النقل النشطة من ${name}.` : `Private preview of active transport routes from ${name}.`),
    ASSET_PREFIX: assetPrefix(file),
    SCHEMA_JSON: safeJson(schema),
    COUNTRY_CODE: country.code,
    BRAND_SUBTITLE: isAr ? 'النقل الخاص وخدمات السيارة مع سائق' : 'Private transport and chauffeur services',
    PREVIEW_LABEL: isAr ? 'معاينة خاصة غير مفهرسة' : 'Private non-indexable preview',
    ACTIVE_ONLY_LABEL: isAr ? 'المسارات النشطة فقط' : 'Active routes only',
    HEADING: isAr ? `النقل الخاص من ${name}` : `Private transport from ${name}`,
    INTRO: isAr
      ? `بوابة خاصة لمراجعة المسارات النشطة التي تبدأ من ${name}. المسارات غير النشطة لا تظهر هنا.`
      : `Private review hub for active routes originating in ${name}. Inactive routes are not shown here.`,
    POLICY_HEADING: isAr ? 'سياسة التفعيل' : 'Activation policy',
    POLICY_COPY: isAr
      ? 'لا يظهر أي مسار هنا إلا إذا كان نشطاً في المصفوفة المركزية. التوفر النهائي يؤكد لكل طلب.'
      : 'A route appears here only when active in the central matrix. Final availability is confirmed for each request.',
    ROUTES_HEADING: isAr ? 'الوجهات النشطة' : 'Active destinations',
    ROUTES_COPY: isAr
      ? 'لا توجد روابط حجز أو صفحات عامة للمسارات غير النشطة.'
      : 'Inactive routes have no booking links or public pages.',
    ROUTE_CARDS: routeCards,
    EMPTY_STATE: activeRoutes.length ? '' : `<p data-empty-active-routes="true">${isAr ? 'لا توجد مسارات نشطة من هذه الدولة حالياً.' : 'There are currently no active routes from this country.'}</p>`,
    PICKUP_HEADING: isAr ? 'مناطق الاستلام التي تحتاج إلى تأكيد' : 'Pickup areas requiring confirmation',
    PICKUP_ITEMS: listItems(areaNames(country, lang))
  };
}

function chauffeurValues(lang, file) {
  const isAr = lang === 'ar';
  const activeServices = chauffeurConfig.services.filter((service) => service.active);
  const cards = activeServices.map((service) => {
    const name = isAr ? service.name_ar : service.name_en;
    const target = join(root, ...(lang === 'en' ? ['en', service.slug, 'index.html'] : [service.slug, 'index.html']));
    if (!existsSync(target)) throw new Error(`Active chauffeur service page missing: ${target}`);
    return `<a class="route-card" data-active-service="${service.service_id}" href="${relativeHref(file, target)}"><h3>${escapeHtml(name)}</h3><p>${isAr ? 'خدمة حالية؛ يتم تأكيد التفاصيل والتوفر قبل الموعد.' : 'Existing service; details and availability are confirmed before the appointment.'}</p></a>`;
  }).join('');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isAr ? chauffeurConfig.hub.name_ar : chauffeurConfig.hub.name_en,
    description: isAr ? 'معاينة خاصة للخدمات النشطة.' : 'Private preview of active chauffeur services.',
    hasPart: activeServices.map((service) => ({'@type': 'Service', name: isAr ? service.name_ar : service.name_en}))
  };
  return {
    LANG: lang,
    DIR: isAr ? 'rtl' : 'ltr',
    TITLE: escapeHtml(isAr ? 'معاينة خدمات السيارة مع سائق | Vendora' : 'Preview: chauffeur and private car services | Vendora'),
    DESCRIPTION: escapeHtml(isAr ? 'معاينة خاصة لخدمات السيارة مع سائق النشطة.' : 'Private preview of active chauffeur and private-car services.'),
    ASSET_PREFIX: assetPrefix(file),
    SCHEMA_JSON: safeJson(schema),
    BRAND_SUBTITLE: isAr ? 'النقل الخاص وخدمات السيارة مع سائق' : 'Private transport and chauffeur services',
    PREVIEW_LABEL: isAr ? 'معاينة خاصة غير مفهرسة' : 'Private non-indexable preview',
    ACTIVE_ONLY_LABEL: isAr ? 'الخدمات النشطة فقط' : 'Active services only',
    HEADING: isAr ? chauffeurConfig.hub.name_ar : chauffeurConfig.hub.name_en,
    INTRO: isAr
      ? 'خدمات مرنة للرحلات الخاصة والمطارات والاجتماعات والعائلات، مع تأكيد السائق والمركبة قبل الاستلام.'
      : 'Flexible private journeys for airports, meetings and families, with the assigned driver and vehicle confirmed before pickup.',
    ASSIGNMENT_HEADING: isAr ? 'التنفيذ والتأكيد' : 'Fulfilment and confirmation',
    ASSIGNMENT_COPY: isAr
      ? 'قد تنفذ الخدمة بمركبة تابعة لفندورا أو بواسطة شريك تشغيل موثوق، ويتم إبلاغ العميل بالسائق والمركبة قبل الاستلام.'
      : 'Service may be fulfilled by Vendora or a trusted operating partner; the assigned driver and vehicle are disclosed before pickup.',
    SERVICES_HEADING: isAr ? 'الخدمات الحالية' : 'Current services',
    SERVICES_COPY: isAr
      ? 'الخدمات غير النشطة محفوظة في الإعدادات الخاصة ولا تظهر في هذا المركز.'
      : 'Inactive services remain in private configuration and are not shown in this hub.',
    SERVICE_CARDS: cards
  };
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

const generated = [];
for (const route of previewRoutes) {
  for (const lang of ['ar', 'en']) {
    const file = routePreviewFile(route, lang);
    write(file, render(routeTemplate, routeValues(route, lang, file)));
    generated.push(file);
  }
}

for (const country of countriesConfig.countries) {
  for (const lang of ['ar', 'en']) {
    const file = hubPreviewFile(country, lang);
    write(file, render(hubTemplate, hubValues(country, lang, file)));
    generated.push(file);
  }
}

for (const lang of ['ar', 'en']) {
  const file = chauffeurPreviewFile(lang);
  write(file, render(chauffeurTemplate, chauffeurValues(lang, file)));
  generated.push(file);
}

const indexFile = join(outputRoot, 'index.html');
const routeRows = previewRoutes.map((route) => {
  const origin = countries.get(route.origin_country);
  const destination = countries.get(route.destination_country);
  return `<tr><td>${route.route_id}</td><td>${escapeHtml(origin.name_en)} → ${escapeHtml(destination.name_en)}</td><td>${route.active ? 'active legacy route' : 'inactive approval preview'}</td><td><a href="${relativeHref(indexFile, routePreviewFile(route, 'en'))}">English</a></td><td><a href="${relativeHref(indexFile, routePreviewFile(route, 'ar'))}">Arabic</a></td></tr>`;
}).join('');
const hubLinks = countriesConfig.countries.map((country) =>
  `<li>${escapeHtml(country.name_en)}: <a href="${relativeHref(indexFile, hubPreviewFile(country, 'en'))}">English</a> · <a href="${relativeHref(indexFile, hubPreviewFile(country, 'ar'))}">Arabic</a></li>`
).join('');
write(indexFile, `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet">
<title>Vendora GCC private architecture preview</title>
<link rel="stylesheet" href="${assetPrefix(indexFile)}site.css"><link rel="stylesheet" href="${assetPrefix(indexFile)}assets/vendora-theme.css"></head>
<body class="home-premium vip-transport" data-private-preview="true"><main class="section"><div class="container section-shell">
<h1>Vendora GCC private architecture preview</h1><p>This output is private, non-indexable and excluded from public sitemaps.</p>
<p><strong>Matrix:</strong> 42 routes · <strong>Active legacy routes:</strong> ${routesConfig.routes.filter((route) => route.active).length} · <strong>Route previews:</strong> ${previewRoutes.length * 2}</p>
<h2>Country hubs</h2><ul>${hubLinks}</ul>
<h2>Chauffeur hub</h2><p><a href="${relativeHref(indexFile, chauffeurPreviewFile('en'))}">English</a> · <a href="${relativeHref(indexFile, chauffeurPreviewFile('ar'))}">Arabic</a></p>
<h2>Route previews</h2><table><thead><tr><th>ID</th><th>Direction</th><th>Status</th><th>EN</th><th>AR</th></tr></thead><tbody>${routeRows}</tbody></table>
</div></main></body></html>`);
generated.push(indexFile);

write(join(outputRoot, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
const manifest = {
  generated_from_configuration_date: routesConfig.last_updated,
  generated_from_config_version: routesConfig.config_version,
  private_preview: true,
  indexable: false,
  route_matrix_records: routesConfig.routes.length,
  active_routes: routesConfig.routes.filter((route) => route.active).map((route) => route.route_id),
  inactive_routes: routesConfig.routes.filter((route) => !route.active).map((route) => route.route_id),
  preview_route_records: previewRoutes.length,
  preview_html_pages: generated.length,
  route_preview_pages: previewRoutes.length * 2,
  country_hub_pages: countriesConfig.countries.length * 2,
  chauffeur_hub_pages: 2,
  review_index_pages: 1,
  generated_files: generated.map((file) => posix(relative(outputRoot, file))),
  public_sitemap_sha256: {
    'sitemap.xml': sha256(join(root, 'sitemap.xml')),
    'sitemap-gcc-transport.xml': sha256(join(root, 'sitemap-gcc-transport.xml')),
    'sitemap-gcc-transport-en.xml': sha256(join(root, 'sitemap-gcc-transport-en.xml'))
  }
};
write(join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  output: posix(relative(root, outputRoot)),
  route_matrix_records: routesConfig.routes.length,
  active_routes: manifest.active_routes.length,
  inactive_routes: manifest.inactive_routes.length,
  preview_route_records: manifest.preview_route_records,
  preview_html_pages: manifest.preview_html_pages
}, null, 2));
