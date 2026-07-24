import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..', '..');
const internal = join(repo, 'internal-preview', 'gcc-routes', 'config');
const routesFile = join(internal, 'gcc-routes.json');
const countriesFile = join(internal, 'gcc-countries.json');
const businessFile = join(root, 'config', 'business-config.json');
const routesConfig = JSON.parse(readFileSync(routesFile, 'utf8'));
const countriesConfig = JSON.parse(readFileSync(countriesFile, 'utf8'));
const business = JSON.parse(readFileSync(businessFile, 'utf8'));
const countries = new Map(countriesConfig.countries.map((item) => [item.code, item]));
const routes = new Map(routesConfig.routes.map((item) => [item.route_id, item]));
const SITE = 'https://getvendora.net/bahrain-saudi-gcc-transport';
const BATCH = ['SA-QA', 'QA-SA', 'SA-AE', 'AE-SA', 'AE-BH', 'BH-AE', 'QA-AE', 'AE-QA', 'KW-BH', 'OM-BH'];
const HUBS = ['SA', 'QA', 'AE', 'BH', 'KW', 'OM'];
const DATE = '2026-07-24';

const routeNotes = {
  'SA-QA': {
    en: 'Pickup can be coordinated in Riyadh, Dammam, Khobar, Jubail or Al Ahsa. The operating plan is checked from the pickup city toward the Saudi–Qatar border and onward to Doha or another confirmed Qatar address.',
    ar: 'يمكن تنسيق الاستلام من الرياض أو الدمام أو الخبر أو الجبيل أو الأحساء. تُراجع خطة التشغيل من مدينة الاستلام باتجاه الحدود السعودية القطرية ثم إلى الدوحة أو عنوان آخر مؤكد داخل قطر.',
    focusEn: 'Riyadh and Eastern Province pickups need different departure planning, so the quotation is prepared after the exact pickup point and requested Doha arrival are known.',
    focusAr: 'تحتاج نقاط الاستلام من الرياض والمنطقة الشرقية إلى تخطيط مختلف للانطلاق، لذلك يُجهز عرض السعر بعد معرفة موقع الاستلام ووجهة الوصول المطلوبة في الدوحة.',
  },
  'QA-SA': {
    en: 'The driver meets the passenger at a confirmed Doha address or Hamad International Airport, then follows the approved Qatar–Saudi border plan toward Al Ahsa, Khobar, Dammam, Riyadh or another confirmed Saudi destination.',
    ar: 'يلتقي السائق بالراكب في عنوان مؤكد داخل الدوحة أو في مطار حمد الدولي، ثم يتبع خطة الحدود القطرية السعودية المعتمدة باتجاه الأحساء أو الخبر أو الدمام أو الرياض أو وجهة سعودية مؤكدة أخرى.',
    focusEn: 'Airport collections are coordinated against the actual landing and baggage collection details; waiting and onward stops are included in the quotation review.',
    focusAr: 'يُنسق الاستلام من المطار وفق وقت الهبوط الفعلي واستلام الأمتعة، وتدخل فترات الانتظار والتوقفات اللاحقة ضمن مراجعة عرض السعر.',
  },
  'SA-AE': {
    en: 'The operating plan is built around the Saudi pickup city and the selected UAE destination. Riyadh and Eastern Province departures are reviewed separately before routing toward Abu Dhabi, Dubai or another confirmed emirate.',
    ar: 'تُبنى خطة التشغيل بحسب مدينة الاستلام في السعودية والوجهة المختارة داخل الإمارات. وتُراجع انطلاقات الرياض والمنطقة الشرقية كلٌ على حدة قبل التوجه إلى أبوظبي أو دبي أو إمارة أخرى مؤكدة.',
    focusEn: 'Longer intercity sectors, rest stops and the final UAE address are agreed before assignment so the vehicle category can match passengers and luggage.',
    focusAr: 'تُتفق المقاطع الطويلة بين المدن والاستراحات والعنوان النهائي داخل الإمارات قبل التعيين حتى تناسب فئة المركبة عدد الركاب والأمتعة.',
  },
  'AE-SA': {
    en: 'Pickup may be arranged in Dubai, Abu Dhabi or another approved UAE location. The route is reviewed toward the applicable UAE–Saudi crossing and then the requested Saudi city, such as Riyadh, Dammam or Khobar.',
    ar: 'يمكن ترتيب الاستلام من دبي أو أبوظبي أو موقع إماراتي معتمد آخر. ويُراجع المسار باتجاه المنفذ الإماراتي السعودي المناسب ثم إلى المدينة السعودية المطلوبة مثل الرياض أو الدمام أو الخبر.',
    focusEn: 'The pickup emirate materially affects the operating plan. Flight arrival, hotel checkout and border-document readiness should be shared before quotation.',
    focusAr: 'تؤثر إمارة الاستلام مباشرة في خطة التشغيل. ويجب مشاركة وقت وصول الرحلة أو مغادرة الفندق وجاهزية وثائق الحدود قبل إعداد عرض السعر.',
  },
  'AE-BH': {
    en: 'The journey is planned from the confirmed Dubai, Abu Dhabi or UAE pickup address through the reviewed Saudi transit sequence and King Fahd Causeway toward the final Bahrain address.',
    ar: 'تُخطط الرحلة من عنوان الاستلام المؤكد في دبي أو أبوظبي أو داخل الإمارات عبر تسلسل العبور السعودي المراجع وجسر الملك فهد وصولاً إلى العنوان النهائي في البحرين.',
    focusEn: 'Because the journey crosses more than one border process, passenger documents, vehicle eligibility, planned stops and final Bahrain meeting point are checked before confirmation.',
    focusAr: 'لأن الرحلة تمر بأكثر من إجراء حدودي، تُراجع وثائق الركاب وأهلية المركبة والتوقفات المخططة ونقطة الوصول النهائية في البحرين قبل التأكيد.',
  },
  'BH-AE': {
    en: 'Pickup is coordinated from a Bahrain home, hotel, office or Bahrain International Airport, then the reviewed plan continues through King Fahd Causeway and Saudi transit toward Abu Dhabi, Dubai or another confirmed UAE address.',
    ar: 'يُنسق الاستلام من منزل أو فندق أو مقر عمل في البحرين أو من مطار البحرين الدولي، ثم تستمر الخطة المراجعة عبر جسر الملك فهد والعبور في السعودية باتجاه أبوظبي أو دبي أو عنوان إماراتي مؤكد آخر.',
    focusEn: 'Dubai and Abu Dhabi have different final sectors. The destination, requested arrival window and luggage load are used to prepare the final quotation and assignment.',
    focusAr: 'يختلف المقطع الأخير بين دبي وأبوظبي. وتُستخدم الوجهة ونافذة الوصول المطلوبة وحجم الأمتعة لإعداد عرض السعر النهائي والتعيين.',
  },
  'QA-AE': {
    en: 'Pickup is arranged in Doha or at Hamad International Airport. The road plan is reviewed through the Qatar–Saudi process, Saudi transit and the applicable UAE entry point before continuing to Abu Dhabi or Dubai.',
    ar: 'يُرتب الاستلام من الدوحة أو مطار حمد الدولي. وتُراجع خطة الطريق عبر إجراءات قطر والسعودية والعبور داخل السعودية ومنفذ الدخول المناسب إلى الإمارات قبل المتابعة إلى أبوظبي أو دبي.',
    focusEn: 'The multi-country sequence requires early document review. Airport waiting, rest stops and the selected UAE city are confirmed in the quotation.',
    focusAr: 'يتطلب تسلسل العبور بين الدول مراجعة مبكرة للوثائق. ويُثبت عرض السعر انتظار المطار والاستراحات والمدينة المختارة داخل الإمارات.',
  },
  'AE-QA': {
    en: 'The vehicle is assigned near the confirmed UAE pickup area, then the operating team reviews the UAE–Saudi process, Saudi transit and Qatar entry before the final Doha or Qatar drop-off.',
    ar: 'تُعيّن المركبة بالقرب من منطقة الاستلام المؤكدة داخل الإمارات، ثم يراجع فريق التشغيل إجراءات الإمارات والسعودية والعبور داخل السعودية والدخول إلى قطر قبل التوصيل النهائي في الدوحة أو قطر.',
    focusEn: 'Dubai and Abu Dhabi departures require separate pickup timing. Share the flight, hotel or residential address and all planned stops before confirmation.',
    focusAr: 'تحتاج انطلاقات دبي وأبوظبي إلى توقيت استلام مختلف. يجب مشاركة بيانات الرحلة أو الفندق أو العنوان السكني وجميع التوقفات قبل التأكيد.',
  },
  'KW-BH': {
    en: 'Pickup can be coordinated in Kuwait City, Abdali, Kuwait International Airport or another approved address, followed by the reviewed Kuwait–Saudi process, Saudi transit and King Fahd Causeway into Bahrain.',
    ar: 'يمكن تنسيق الاستلام من مدينة الكويت أو العبدلي أو مطار الكويت الدولي أو عنوان معتمد آخر، ثم اتباع إجراءات الكويت والسعودية المراجعة والعبور داخل السعودية وجسر الملك فهد إلى البحرين.',
    focusEn: 'The route includes a Saudi transit sector. All passenger entry documents, luggage volume, stops and the final Bahrain address are reviewed before assignment.',
    focusAr: 'يشمل المسار مقطع عبور داخل السعودية. وتُراجع وثائق دخول الركاب وحجم الأمتعة والتوقفات والعنوان النهائي في البحرين قبل التعيين.',
  },
  'OM-BH': {
    en: 'Pickup is coordinated in Muscat, at Muscat International Airport or another approved Oman address. The operating sequence is reviewed through the applicable Oman–UAE process, UAE and Saudi transit, and King Fahd Causeway into Bahrain.',
    ar: 'يُنسق الاستلام من مسقط أو مطار مسقط الدولي أو عنوان معتمد آخر في عُمان. ويُراجع تسلسل التشغيل عبر إجراءات عُمان والإمارات المناسبة والعبور في الإمارات والسعودية وجسر الملك فهد إلى البحرين.',
    focusEn: 'This is a long multi-country journey. Rest planning, driver arrangements, luggage, border readiness and the Bahrain arrival point must all be confirmed in advance.',
    focusAr: 'هذه رحلة طويلة تمر بعدة دول. ويجب تأكيد خطة الاستراحات وترتيبات السائق والأمتعة والجاهزية الحدودية ونقطة الوصول في البحرين مسبقاً.',
  },
};

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const local = (country, lang, field) => lang === 'ar' ? country[`${field}_ar`] : country[`${field}_en`];
const list = (items, lang, field) => items.map((item) => local(item, lang, field)).join(lang === 'ar' ? '، ' : ', ');
const routePath = (route, lang) => lang === 'ar' ? route.public_path_ar : route.public_path_en;
const hubPath = (code, lang) => {
  const country = countries.get(code);
  const slug = code === 'BH' ? 'gcc-destinations' : country.hub_slug;
  return `/bahrain-saudi-gcc-transport/${lang === 'en' ? 'en/' : ''}${slug}/`;
};
const hrefDepth = (lang) => lang === 'en' ? '../../' : '../';

function labels(lang) {
  return lang === 'ar' ? {
    home: 'الرئيسية', passenger: 'نقل الركاب', parcel: 'توصيل الطرود', destinations: 'وجهات الخليج', contact: 'تواصل معنا', about: 'من نحن',
    request: 'اطلب عرض سعر للمسار', quote: 'هذه الرحلة متاحة بعد مراجعة التشغيل فقط. يعتمد التأكيد على توفر السائق والمركبة ومتطلبات الحدود والوثائق وعرض السعر النهائي.',
    assigned: 'نرسل للعميل بيانات السائق والمركبة المعينة قبل موعد الاستلام.',
    process: 'خطة الطريق والاستلام', practical: 'تفاصيل عملية قبل الرحلة', pickup: 'مدن ومواقع الاستلام',
    arrival: 'مدن ومواقع الوصول', airports: 'المطارات ذات الصلة', vehicle: 'المركبة والأمتعة',
    vehicleText: 'تُختار فئة المركبة بعد معرفة عدد الركاب والحقائب. تتوفر مقاعد الأطفال عند طلبها مسبقاً وحسب التوفر، ولا نعد بموديل ثابت.',
    options: 'الذهاب والعودة والانتظار', optionsText: 'يمكن طلب اتجاه واحد أو عودة أو انتظار أو أكثر من توقف. تُراجع التفاصيل والتكلفة والتوفر قبل التأكيد.',
    documents: 'الوثائق والحدود', documentsText: 'يتحمل كل مسافر مسؤولية صلاحية جواز السفر والتأشيرة وتصاريح الدخول وأي وثائق مطلوبة. لا تعني الموافقة على الطلب ضمان الدخول عبر الحدود.',
    meeting: 'الاستلام والالتقاء', meetingText: 'بعد التأكيد نرسل اسم السائق ووسيلة التواصل وبيانات المركبة ونقطة الالتقاء قبل الاستلام. يجب مشاركة رقم الرحلة عند طلب استقبال المطار.',
    links: 'روابط المسار', reverse: 'المسار العكسي', originHub: 'مسارات من دولة الانطلاق', destinationHub: 'مسارات من دولة الوصول',
    prices: 'الأسعار وعروض السعر', policy: 'سياسة الحجز', complaints: 'الشكاوى', reviews: 'تقييمات العملاء', related: 'صفحات المدن والمطارات ذات الصلة',
    faq: 'أسئلة شائعة عن هذا المسار', faq1: 'هل الرحلة مضمونة بمجرد إرسال الطلب؟',
    ans1: 'لا. نؤكد الرحلة بعد مراجعة التشغيل وتوفر السائق والمركبة والوثائق وعرض السعر النهائي.',
    faq2: 'هل يمكن ترتيب استقبال من المطار أو رحلة عودة؟', ans2: 'نعم، يمكن طلب استقبال المطار أو العودة أو الانتظار أو التوقفات المتعددة، وتُدرج التفاصيل في عرض السعر.',
    faq3: 'متى أعرف السائق والمركبة؟', ans3: 'نرسل بيانات السائق والمركبة المعينة قبل الاستلام بعد اكتمال التأكيد التشغيلي.',
    support: 'رعاية الركاب والدعم', supportText: 'يمكنك مراجعة سياسة الحجز أو إرسال شكوى أو قراءة تقييمات العملاء الموثقة.',
    whatsapp: 'مرحباً فندورا، أريد عرض سعر لنقل خاص من {origin} إلى {destination}. موقع الاستلام: ___، الوجهة: ___، التاريخ والوقت: ___، عدد الركاب والحقائب: ___.',
    brand: 'فندورا للنقل', brandSub: 'نقل خاص بين دول الخليج', footer: 'تنسيق نقل خاص عبر مركبات فندورا أو شركاء تشغيل معتمدين، مع تأكيد السائق والمركبة قبل الاستلام.',
    hubTitle: 'نقل خاص من {origin} إلى دول الخليج', hubIntro: 'المسارات النشطة فقط من {origin}. كل طلب يخضع للتوفر والمراجعة التشغيلية ومتطلبات الحدود والوثائق وعرض السعر النهائي.',
    activeRoutes: 'المسارات المتاحة للطلب', noRoutes: 'لا توجد مسارات عامة نشطة حالياً.', viewRoute: 'عرض تفاصيل المسار',
  } : {
    home: 'Home', passenger: 'Passenger transport', parcel: 'Parcel delivery', destinations: 'GCC routes', contact: 'Contact us', about: 'About us',
    request: 'Request a route quotation', quote: 'This journey is available only after operational review. Confirmation depends on driver and vehicle availability, border and document requirements, and the final quotation.',
    assigned: 'The customer receives the assigned driver and vehicle details before pickup.',
    process: 'Road and pickup plan', practical: 'Practical details before travel', pickup: 'Pickup cities and locations',
    arrival: 'Destination cities and locations', airports: 'Relevant airports', vehicle: 'Vehicle and luggage',
    vehicleText: 'The vehicle category is selected after passenger and luggage details are known. Child seats can be requested in advance, subject to availability; no fixed model is promised.',
    options: 'One-way, return and waiting', optionsText: 'One-way, return, waiting and multiple-stop requests can be reviewed. Details, cost and availability are confirmed before booking.',
    documents: 'Documents and borders', documentsText: 'Each passenger is responsible for valid passports, visas, entry permissions and any required documents. Acceptance of a request does not guarantee border entry.',
    meeting: 'Pickup and meeting', meetingText: 'After confirmation, we send the driver name, contact details, assigned vehicle and meeting point before pickup. Flight details are required for airport collections.',
    links: 'Route links', reverse: 'Reverse route', originHub: 'Routes from the origin country', destinationHub: 'Routes from the destination country',
    prices: 'Prices and quotations', policy: 'Booking policy', complaints: 'Complaints', reviews: 'Customer reviews', related: 'Related city and airport pages',
    faq: 'Frequently asked questions for this route', faq1: 'Is the journey guaranteed when I send a request?',
    ans1: 'No. We confirm only after operational review, driver and vehicle availability, document checks and the final quotation.',
    faq2: 'Can I request an airport pickup or return trip?', ans2: 'Yes. Airport pickup, return, waiting and multiple stops can be requested and are included in the quotation review.',
    faq3: 'When will I receive the driver and vehicle details?', ans3: 'We send the assigned driver and vehicle details before pickup after operational confirmation is complete.',
    support: 'Passenger Care and support', supportText: 'Review the booking policy, submit a complaint or read verified customer reviews.',
    whatsapp: 'Hello Vendora, I need a private transport quotation from {origin} to {destination}. Pickup: ___, destination: ___, date and time: ___, passengers and luggage: ___.',
    brand: 'Vendora Transport', brandSub: 'Private transport across the GCC', footer: 'Private transport coordinated through Vendora vehicles or approved operating partners, with driver and vehicle details confirmed before pickup.',
    hubTitle: 'Private transport from {origin} across the GCC', hubIntro: 'Only active routes from {origin} are shown. Every request remains subject to availability, operational review, border and document requirements, and a final quotation.',
    activeRoutes: 'Routes available for request', noRoutes: 'There are currently no active public routes.', viewRoute: 'View route details',
  };
}

function head({ lang, title, description, canonical, alternate, type = 'website', schema }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const xDefault = lang === 'ar' ? alternate : canonical;
  const depth = hrefDepth(lang);
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title><meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ar" href="${lang === 'ar' ? canonical : alternate}">
  <link rel="alternate" hreflang="en" href="${lang === 'en' ? canonical : alternate}">
  <link rel="alternate" hreflang="x-default" href="${xDefault}">
  <meta property="og:type" content="${type}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">
  <meta property="og:locale" content="${lang === 'ar' ? 'ar_BH' : 'en_US'}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
  <link rel="icon" type="image/svg+xml" href="${depth}assets/brand/vendora-transport-app-icon.svg">
  <link rel="stylesheet" href="${depth}site.css">
  <link rel="stylesheet" href="${depth}assets/vendora-theme.css" data-vendora-global-theme>
  <script src="${depth}assets/vendora-config.js" data-vendora-global-config></script>
  <script defer src="${depth}assets/lucide.min.js"></script>
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>`;
}

function shellStart(lang, active = 'destinations') {
  const t = labels(lang);
  const base = `/bahrain-saudi-gcc-transport/${lang === 'en' ? 'en/' : ''}`;
  return `<body class="home-premium vip-transport"><header class="topbar"><div class="container nav">
    <a class="brand" href="${base}"><span class="logo"><img class="vip-app-icon" src="${hrefDepth(lang)}assets/brand/vendora-transport-app-icon.svg" alt="" width="512" height="512"></span><span class="brand-copy"><span class="brand-title">${t.brand}</span><span class="brand-sub">${t.brandSub}</span></span></a>
    <nav class="nav-menu" aria-label="${lang === 'ar' ? 'التنقل الرئيسي' : 'Primary navigation'}"><a class="nav-link" href="${base}">${t.home}</a><a class="nav-link" href="${base}passenger-transport/">${t.passenger}</a><a class="nav-link" href="${base}parcel-delivery/">${t.parcel}</a><a class="nav-link ${active === 'destinations' ? 'active' : ''}" href="${base}gcc-destinations/">${t.destinations}</a><a class="nav-link" href="${base}contact/">${t.contact}</a><a class="nav-link" href="${base}about/">${t.about}</a></nav>
  </div></header><main>`;
}

function shellEnd(lang, whatsappMessage = '') {
  const t = labels(lang);
  const base = `/bahrain-saudi-gcc-transport/${lang === 'en' ? 'en/' : ''}`;
  const depth = hrefDepth(lang);
  return `</main><footer class="footer"><div class="container footer-grid"><div class="footer-card glass"><h2>${t.brand}</h2><p class="footer-copy">${t.footer}</p></div><div class="footer-card glass"><h2>${t.links}</h2><div class="footer-links"><a href="${base}">${t.home}</a><a href="${base}passenger-transport/">${t.passenger}</a><a href="${base}parcel-delivery/">${t.parcel}</a><a href="${base}contact/">${t.contact}</a><a href="${base}about/">${t.about}</a></div></div><div class="footer-card glass"><h2>${t.support}</h2><div class="footer-links"><a href="${base}booking-policy/">${t.policy}</a><a href="${base}complaints/">${t.complaints}</a><a href="${base}customer-reviews/">${t.reviews}</a></div></div></div></footer>
${whatsappMessage ? `  <a href="https://wa.me/${business.booking_whatsapp}" class="floating-wa" data-wa-message="${esc(whatsappMessage)}" data-vendora-config="whatsapp-link" aria-label="${lang === 'ar' ? 'واتساب' : 'WhatsApp'}"><i data-lucide="message-circle"></i></a>` : ''}
  <script>window.pageConfig=${JSON.stringify({ phoneNumber: business.booking_whatsapp, defaultWhatsAppMessage: whatsappMessage })};</script><script defer src="${depth}site.js?v=20260724-gcc1"></script><script defer src="${lang === 'en' ? '../../../' : '../../'}assets/analytics-loader.js"></script></body></html>`;
}

function routeSchema(route, lang, title, description, canonical, t) {
  const origin = countries.get(route.origin_country);
  const destination = countries.get(route.destination_country);
  const on = local(origin, lang, 'name');
  const dn = local(destination, lang, 'name');
  const home = `${SITE}/${lang === 'en' ? 'en/' : ''}`;
  const faqs = [[t.faq1, t.ans1], [t.faq2, t.ans2], [t.faq3, t.ans3]];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vendora Transport', url: `${SITE}/` },
      { '@type': 'Service', '@id': `${canonical}#service`, name: title, description, url: canonical, provider: { '@id': `${SITE}/#organization` }, areaServed: [{ '@type': 'Country', name: on }, { '@type': 'Country', name: dn }], serviceType: lang === 'ar' ? 'نقل ركاب خاص عبر الحدود' : 'Cross-border private passenger transport', offers: { '@type': 'Offer', url: canonical, priceSpecification: { '@type': 'PriceSpecification', description: lang === 'ar' ? 'عرض سعر نهائي بعد المراجعة التشغيلية' : 'Final quotation after operational review' } } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: t.home, item: home }, { '@type': 'ListItem', position: 2, name: title, item: canonical }] },
      { '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
    ],
  };
}

function relatedLinks(route, lang) {
  const base = `/bahrain-saudi-gcc-transport/${lang === 'en' ? 'en/' : ''}`;
  const byCountry = {
    BH: [['bahrain-airport-transfer', 'توصيل مطار البحرين', 'Bahrain airport transfer']],
    SA: [['bahrain-to-dammam', 'صفحة الدمام', 'Dammam route guide'], ['bahrain-to-riyadh', 'صفحة الرياض', 'Riyadh route guide']],
    QA: [['bahrain-to-hamad-airport', 'صفحة مطار حمد', 'Hamad Airport route guide']],
    AE: [['bahrain-to-dubai', 'صفحة دبي', 'Dubai route guide']],
    KW: [['bahrain-to-kuwait-airport', 'صفحة مطار الكويت', 'Kuwait Airport route guide']],
    OM: [['bahrain-to-oman', 'صفحة عُمان', 'Oman route guide']],
  };
  const entries = [...(byCountry[route.origin_country] || []), ...(byCountry[route.destination_country] || [])];
  return entries.map(([slug, ar, en]) => `<a href="${base}${slug}/">${lang === 'ar' ? ar : en}</a>`).join('');
}

function renderRoute(route, lang) {
  const t = labels(lang);
  const origin = countries.get(route.origin_country);
  const destination = countries.get(route.destination_country);
  const on = local(origin, lang, 'name');
  const dn = local(destination, lang, 'name');
  const canonical = `${SITE}${routePath(route, lang).replace('/bahrain-saudi-gcc-transport', '')}`;
  const otherLang = lang === 'ar' ? 'en' : 'ar';
  const alternate = `${SITE}${routePath(route, otherLang).replace('/bahrain-saudi-gcc-transport', '')}`;
  const title = lang === 'ar' ? `توصيل من ${on} إلى ${dn} بسيارة مع سائق | فندورا` : `${on} to ${dn} Private Transport & Driver | Vendora`;
  const description = lang === 'ar' ? `اطلب عرض سعر لنقل خاص من ${on} إلى ${dn} مع تنسيق الاستلام والحدود والسائق والمركبة قبل الرحلة.` : `Request a private transport quotation from ${on} to ${dn}, with pickup, border process, driver and vehicle coordinated before travel.`;
  const note = routeNotes[route.route_id][lang];
  const focus = routeNotes[route.route_id][lang === 'ar' ? 'focusAr' : 'focusEn'];
  const message = t.whatsapp.replace('{origin}', on).replace('{destination}', dn);
  const reverse = routes.get(route.reverse_route_id);
  const base = `/bahrain-saudi-gcc-transport/${lang === 'en' ? 'en/' : ''}`;
  const airportText = list([...origin.airports, ...destination.airports], lang, 'name');
  const schema = routeSchema(route, lang, title, description, canonical, t);
  const cards = [
    [t.pickup, list(origin.pickup_areas, lang, 'name')],
    [t.arrival, list(destination.pickup_areas, lang, 'name')],
    [t.airports, airportText],
    [t.vehicle, t.vehicleText],
    [t.options, t.optionsText],
    [t.documents, t.documentsText],
    [t.meeting, t.meetingText],
  ];
  return `${head({ lang, title, description, canonical, alternate, schema })}${shellStart(lang)}
  <section class="hero"><div class="container hero-grid"><div class="hero-copy glass"><span class="eyebrow"><strong>${esc(route[lang === 'ar' ? 'commercial_keyword_candidate_ar' : 'commercial_keyword_candidate_en'])}</strong></span><h1>${esc(title.replace(lang === 'ar' ? ' | فندورا' : ' | Vendora', ''))}</h1><p class="lead">${esc(description)}</p><div class="hero-actions"><a class="primary-btn" href="https://wa.me/${business.booking_whatsapp}" data-wa-message="${esc(message)}" data-vendora-config="whatsapp-link"><i data-lucide="message-circle"></i><span>${t.request}</span></a></div></div><aside class="hero-side glass"><h2>${t.process}</h2><p>${esc(note)}</p><p><strong>${t.assigned}</strong></p></aside></div></section>
  <section class="section"><div class="container section-shell"><div class="section-head"><h2>${t.practical}</h2><p>${esc(focus)}</p></div><div class="route-grid">${cards.map(([h, p]) => `<article class="route-card"><h3>${h}</h3><p>${esc(p)}</p></article>`).join('')}</div></div></section>
  <section class="section"><div class="container section-shell"><div class="section-head"><h2>${t.quote}</h2><p>${t.assigned}</p></div><div class="route-grid"><article class="route-card"><h3>${t.reverse}</h3><a class="ghost-btn" data-reverse-route="${reverse.route_id}" href="${routePath(reverse, lang)}">${local(destination, lang, 'name')} ← ${local(origin, lang, 'name')}</a></article><article class="route-card"><h3>${t.originHub}</h3><a class="ghost-btn" href="${hubPath(route.origin_country, lang)}">${t.originHub}</a></article><article class="route-card"><h3>${t.destinationHub}</h3><a class="ghost-btn" href="${hubPath(route.destination_country, lang)}">${t.destinationHub}</a></article><article class="route-card"><h3>${t.related}</h3><div class="footer-links">${relatedLinks(route, lang)}</div></article><article class="route-card"><h3>${t.support}</h3><div class="footer-links"><a href="${base}prices/">${t.prices}</a><a href="${base}booking-policy/">${t.policy}</a><a href="${base}complaints/">${t.complaints}</a><a href="${base}customer-reviews/">${t.reviews}</a></div></article></div></div></section>
  <section class="section"><div class="container section-shell"><div class="section-head"><h2>${t.faq}</h2></div><div class="faq-wrap">${[[t.faq1,t.ans1],[t.faq2,t.ans2],[t.faq3,t.ans3]].map(([q,a]) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div></section>
  ${shellEnd(lang, message)}`;
}

function renderHub(code, lang) {
  const t = labels(lang);
  const country = countries.get(code);
  const on = local(country, lang, 'name');
  const path = hubPath(code, lang);
  const other = hubPath(code, lang === 'ar' ? 'en' : 'ar');
  const canonical = `${SITE}${path.replace('/bahrain-saudi-gcc-transport', '')}`;
  const alternate = `${SITE}${other.replace('/bahrain-saudi-gcc-transport', '')}`;
  const title = t.hubTitle.replace('{origin}', on);
  const description = t.hubIntro.replace('{origin}', on);
  const active = routesConfig.routes.filter((route) => route.active && route.origin_country === code && route.public_path_ar && route.public_path_en);
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vendora Transport', url: `${SITE}/` },
    { '@type': 'CollectionPage', name: title, description, url: canonical, mainEntity: { '@type': 'ItemList', itemListElement: active.map((route, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE}${routePath(route, lang).replace('/bahrain-saudi-gcc-transport', '')}` })) } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: t.home, item: `${SITE}/${lang === 'en' ? 'en/' : ''}` }, { '@type': 'ListItem', position: 2, name: title, item: canonical }] },
  ] };
  return `${head({ lang, title: `${title} | ${t.brand}`, description, canonical, alternate, schema })}${shellStart(lang)}
  <section class="hero"><div class="container hero-grid"><div class="hero-copy glass"><span class="eyebrow"><strong>${t.activeRoutes}</strong></span><h1>${title}</h1><p class="lead">${description}</p></div><aside class="hero-side glass"><h2>${t.assigned}</h2><p>${t.quote}</p></aside></div></section>
  <section class="section"><div class="container section-shell"><div class="section-head"><h2>${t.activeRoutes}</h2></div><div class="route-grid">${active.length ? active.map((route) => { const destination = countries.get(route.destination_country); return `<article class="route-card" data-active-route="${route.route_id}"><h3>${on} → ${local(destination, lang, 'name')}</h3><p>${esc(routeNotes[route.route_id]?.[lang] || t.quote)}</p><a class="ghost-btn" href="${routePath(route, lang)}">${t.viewRoute}</a></article>`; }).join('') : `<p>${t.noRoutes}</p>`}</div></div></section>${shellEnd(lang)}`;
}

function writePage(publicPath, html) {
  const rel = publicPath.replace('/bahrain-saudi-gcc-transport/', '');
  const file = join(root, rel, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html, 'utf8');
}

function updateSitemap(filename, lang) {
  const file = join(root, filename);
  let xml = readFileSync(file, 'utf8');
  const paths = [
    ...BATCH.map((id) => routePath(routes.get(id), lang)),
    ...HUBS.map((code) => hubPath(code, lang)),
  ];
  for (const path of paths) {
    const url = `https://getvendora.net${path}`;
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\s*<url><loc>${escaped}</loc><lastmod>[^<]+</lastmod></url>`, 'g');
    xml = xml.replace(re, '');
  }
  const entries = paths.map((path) => `  <url><loc>https://getvendora.net${path}</loc><lastmod>${DATE}</lastmod></url>`).join('\n');
  xml = xml.replace(/\s*<\/urlset>\s*$/, `\n${entries}\n</urlset>\n`);
  writeFileSync(file, xml, 'utf8');
}

function updateSiteTranslations() {
  const pairs = [];
  const add = (ar, en) => {
    if (ar && en && ar !== en && /[\u0600-\u06ff]/.test(ar)) pairs.push([ar, en]);
  };
  const arLabels = labels('ar');
  const enLabels = labels('en');
  for (const key of Object.keys(arLabels)) add(arLabels[key], enLabels[key]);
  for (const country of countriesConfig.countries) {
    add(country.name_ar, country.name_en);
    for (const item of country.pickup_areas) add(item.ar, item.en);
    for (const item of country.airports) add(item.name_ar, item.name_en);
  }
  for (const id of BATCH) {
    const route = routes.get(id);
    const origin = countries.get(route.origin_country);
    const destination = countries.get(route.destination_country);
    const arOrigin = origin.name_ar;
    const enOrigin = origin.name_en;
    const arDestination = destination.name_ar;
    const enDestination = destination.name_en;
    add(route.commercial_keyword_candidate_ar, route.commercial_keyword_candidate_en);
    add(routeNotes[id].ar, routeNotes[id].en);
    add(routeNotes[id].focusAr, routeNotes[id].focusEn);
    add(`توصيل من ${arOrigin} إلى ${arDestination} بسيارة مع سائق`, `${enOrigin} to ${enDestination} Private Transport & Driver`);
    add(`اطلب عرض سعر لنقل خاص من ${arOrigin} إلى ${arDestination} مع تنسيق الاستلام والحدود والسائق والمركبة قبل الرحلة.`, `Request a private transport quotation from ${enOrigin} to ${enDestination}, with pickup, border process, driver and vehicle coordinated before travel.`);
    add(arLabels.whatsapp.replace('{origin}', arOrigin).replace('{destination}', arDestination), enLabels.whatsapp.replace('{origin}', enOrigin).replace('{destination}', enDestination));
  }
  for (const code of HUBS) {
    const country = countries.get(code);
    add(arLabels.hubTitle.replace('{origin}', country.name_ar), enLabels.hubTitle.replace('{origin}', country.name_en));
    add(arLabels.hubIntro.replace('{origin}', country.name_ar), enLabels.hubIntro.replace('{origin}', country.name_en));
  }
  const unique = [...new Map(pairs.map((pair) => [pair[0], pair])).values()];
  const block = `/* BEGIN GENERATED GCC BATCH 1 TRANSLATIONS */\n  translations.push(\n${unique.map((pair) => `    ${JSON.stringify(pair)}`).join(',\n')}\n  );\n  /* END GENERATED GCC BATCH 1 TRANSLATIONS */`;
  const file = join(root, 'site.js');
  const source = readFileSync(file, 'utf8');
  const marker = /\/\* BEGIN GENERATED GCC BATCH 1 TRANSLATIONS \*\/[\s\S]*?\/\* END GENERATED GCC BATCH 1 TRANSLATIONS \*\//;
  if (!marker.test(source)) throw new Error('GCC translation markers were not found in site.js');
  const next = source.replace(marker, block);
  writeFileSync(file, next, 'utf8');
}

for (const id of BATCH) {
  const route = routes.get(id);
  if (!route?.active || !route.public_path_ar || !route.public_path_en || !routeNotes[id]) throw new Error(`${id} is not publication-ready`);
  writePage(route.public_path_ar, renderRoute(route, 'ar'));
  writePage(route.public_path_en, renderRoute(route, 'en'));
}
for (const code of HUBS) {
  writePage(hubPath(code, 'ar'), renderHub(code, 'ar'));
  writePage(hubPath(code, 'en'), renderHub(code, 'en'));
}
updateSitemap('sitemap-gcc-transport.xml', 'ar');
updateSitemap('sitemap-gcc-transport-en.xml', 'en');
writeFileSync(join(root, 'sitemap-index.xml'), readFileSync(join(root, 'sitemap-index.xml'), 'utf8').replaceAll('<lastmod>2026-07-19</lastmod>', `<lastmod>${DATE}</lastmod>`), 'utf8');
updateSiteTranslations();

console.log(JSON.stringify({ routes: BATCH.length, localized_route_pages: BATCH.length * 2, hubs: HUBS.length, localized_hub_pages: HUBS.length * 2 }, null, 2));
