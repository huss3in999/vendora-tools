import businessConfig from './bahrain-saudi-gcc-transport/config/business-config.json' with { type: 'json' };
import routeProfiles from './bahrain-saudi-gcc-transport/config/route-profiles.mjs';
import { businessEntity, serviceEntity, offerCatalog, pricingCopy } from './bahrain-saudi-gcc-transport/assets/trust-schema.mjs';
import * as passengerCareApi from './functions/api/transport/passenger-care.js';
import * as routeReviewsApi from './functions/api/transport/route-reviews.js';
import * as complaintsApi from './functions/api/transport/complaints.js';
import * as adminApi from './functions/api/transport/admin.js';
import * as googleAudienceApi from './functions/api/transport/google-audience.js';
import * as leadApi from './functions/api/transport/whatsapp-lead.js';
import * as aiChatApi from './functions/api/transport/ai-chat.js';
import * as conciergeApi from './functions/api/ai-chat.js';
import * as errorApi from './functions/api/transport/error-log.js';
import * as trackingApi from './functions/api/transport/tracking.js';
import * as publicSettingsApi from './functions/api/transport/public-settings.js';
import { DEFAULT_PUBLIC_SETTINGS, getPublicConfig } from './functions/api/transport/public-settings.js';
import { recordError } from './functions/api/transport/error-log.js';
import * as nadaMenuApi from './functions/api/nada/menu.js';
import * as marocMarketApi from './functions/api/maroc-market/image.js';
import * as bookingDeskApi from './functions/api/transport/booking-desk.js';
import * as driverInviteApi from './functions/api/transport/driver-invite.js';


const SITE_PATH_PREFIX = '/bahrain-saudi-gcc-transport';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
}

function rawTransportPageSlug(pathname) {
  const parts = pathname.replace(SITE_PATH_PREFIX, '').split('/').filter(Boolean);
  if (parts[0] === 'en') parts.shift();
  return parts[0] || 'home';
}

function transportRouteSlug(pathname) {
  const slug = rawTransportPageSlug(pathname);
  const aliases = {
    'king-fahd-causeway-guide': 'king-fahd-causeway',
    'dammam-airport-to-bahrain': 'bahrain-to-dammam-airport',
    'full-day-vip-driver': 'bahrain-sightseeing-full-day',
    'al-ahsa-to-bahrain': 'bahrain-to-al-ahsa',
    'jubail-to-bahrain': 'bahrain-to-jubail',
    'abu-dhabi-to-bahrain': 'bahrain-to-abu-dhabi',
    'khafji-to-bahrain': 'bahrain-to-khafji',
  };
  if (aliases[slug]) return aliases[slug];
  // Reverse-direction route detail pages still use the canonical route fare.
  if (slug.endsWith('-to-bahrain')) return `bahrain-to-${slug.slice(0, -'-to-bahrain'.length)}`;
  return slug;
}

function routeDisplayName(route, pageSlug, lang) {
  if (!route) return lang === 'en' ? 'Transport information' : 'معلومات النقل';
  const rawName = lang === 'en' ? route.route_name_en : route.route_name_ar;
  if (String(pageSlug || '').endsWith('-to-bahrain')) {
    if (lang === 'en' && /^Bahrain to /i.test(rawName)) {
      return `${rawName.replace(/^Bahrain to /i, '')} to Bahrain`;
    }
    if (lang !== 'en' && /^البحرين إلى /.test(rawName)) {
      return `${rawName.replace(/^البحرين إلى /, '')} إلى البحرين`;
    }
  }
  return rawName;
}

function priceVisibilityForPage(settings, route) {
  const hiddenGroups = new Set(Array.isArray(settings?.hidden_price_destination_groups) ? settings.hidden_price_destination_groups : []);
  return settings?.public_prices_enabled === false
    || route?.is_price_hidden === true
    || route?.public_price_enabled === false
    || hiddenGroups.has(route?.price_visibility_group);
}

function hiddenPriceMarkup(settings, lang) {
  const label = lang === 'en' ? 'Get Live Seasonal Quote' : 'احصل على عرض سعر موسمي فوري';
  const style = 'color:var(--brand-gold,#d5ae5a);font-weight:800;text-decoration:underline;text-underline-offset:3px';
  const phone = settings?.booking_whatsapp_enabled === false ? '' : String(settings?.booking_whatsapp || '').replace(/\D/g, '');
  if (!phone) return `<span class="vendora-hidden-price-cta" data-vendora-hidden-price style="${style}">${label}</span>`;
  const message = lang === 'en' ? 'Hello, please send me the price for this route.' : 'السلام عليكم، أرجو إرسال سعر هذا المسار.';
  return `<a class="vendora-hidden-price-cta" data-vendora-hidden-price data-track-wa data-wa-message="${escapeHtml(message)}" style="${style}" href="https://wa.me/${escapeHtml(phone)}?text=${encodeURIComponent(message)}">${label}</a>`;
}

function currencyAmountPattern() {
  return /(?:\d[\d,]*(?:\.\d+)?\s*(?:BHD|BD|SAR|QAR|AED|KWD|OMR|د\.ب|ر\.س|ر\.ق|د\.إ|د\.ك|ر\.ع)|(?:BHD|BD|SAR|QAR|AED|KWD|OMR|د\.ب|ر\.س|ر\.ق|د\.إ|د\.ك|ر\.ع)\s*\d[\d,]*(?:\.\d+)?)(?:\s*(?:\/|\s*لـ|\s*per)\s*(?:ساعة|hour|يوم|day))?(?:\s*\([^)]*(?:BHD|BD|SAR|QAR|AED|KWD|OMR|د\.ب|ر\.س|ر\.ق|د\.إ|د\.ك|ر\.ع)[^)]*\))?/gi;
}

function redactPriceText(value, replacement) {
  return String(value || '').replace(currencyAmountPattern(), replacement);
}

function fareTextPattern() {
  return /(?:\d[\d,]*(?:\.\d+)?\s*(?:BHD|BD|د\.ب)|(?:BHD|BD|د\.ب)\s*\d[\d,]*(?:\.\d+)?)(?:\s*\([^)]*(?:SAR|ر\.س)[^)]*\))?/gi;
}

function formatPublicFare(route, settings, lang) {
  const amount = Number(route?.price_bhd);
  if (!Number.isFinite(amount)) return '';
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  const isEn = lang === 'en';
  const currency = isEn ? 'BHD' : 'د.ب';
  const sar = route.approximate_sar_enabled ? Math.round(amount * Number(settings?.sar_per_bhd || 10)).toLocaleString(isEn ? 'en' : 'ar') : null;
  const approximate = sar ? (isEn ? ` (approx. SAR ${sar})` : ` (تقريباً ${sar} ر.س)`) : '';
  return `${formatted} ${currency}${approximate}`;
}

function refreshFareText(value, route, settings, lang) {
  const fare = formatPublicFare(route, settings, lang);
  return fare ? String(value || '').replace(fareTextPattern(), fare) : String(value || '');
}

function failClosedPriceHtml(response, pathname) {
  if (!response.headers.get('content-type')?.includes('text/html') || typeof HTMLRewriter === 'undefined') return response;
  const lang = pathname.includes('/en/') || !pathname.startsWith(`${SITE_PATH_PREFIX}/`) ? 'en' : 'ar';
  const replacement = lang === 'en' ? 'Get Live Seasonal Quote' : 'احصل على عرض سعر موسمي فوري';
  const rewritten = new HTMLRewriter()
    .on('script[type="application/ld+json"]', { element(element) { element.remove(); } })
    .on('meta[content]', { element(element) {
      const content = element.getAttribute('content') || '';
      if (currencyAmountPattern().test(content)) element.setAttribute('content', redactPriceText(content, replacement));
    } })
    .on('title', { text(text) { text.replace(redactPriceText(text.text, replacement)); } })
    .on('body', { text(text) {
      if (currencyAmountPattern().test(text.text)) text.replace(redactPriceText(text.text, replacement));
    } })
    .transform(response);
  const headers = new Headers(rewritten.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(rewritten.body, { status: rewritten.status, statusText: rewritten.statusText, headers });
}

function priceSection(route, lang, sarRate) {
  if (!route || route.price_bhd == null) return '';
  const isEn = lang === 'en';
  const from = route.price_kind === 'from';
  const amount = Number(route.price_bhd).toFixed(Number(route.price_bhd) % 1 ? 3 : 0);
  const approxSar = Math.round(Number(route.price_bhd) * Number(sarRate || 10));
  const sarText = route.approximate_sar_enabled
    ? `<span>≈ SAR ${escapeHtml(approxSar)} ${isEn ? '(approx.)' : '(تقريباً)'}</span>`
    : '';
  const title = isEn ? 'Standard public price' : 'السعر العام القياسي';
  const price = isEn
    ? `${from ? 'From ' : ''}BHD ${amount}`
    : `${from ? 'ابتداءً من ' : ''}${amount} د.ب`;
  const unit = route.unit_kind === 'per_day'
    ? (isEn ? 'per qualifying additional vehicle day' : 'لكل يوم مركبة إضافي مؤهل')
    : route.unit_kind === 'package'
      ? (isEn ? 'per complete vehicle package' : 'لباقة المركبة الكاملة')
      : (isEn ? 'one way, per complete vehicle—not per passenger' : 'اتجاه واحد للمركبة كاملة، وليس لكل راكب');
  const notice = isEn
    ? (route.booking_notice_en || 'The final driver, vehicle, luggage capacity and availability are confirmed on WhatsApp.')
    : (route.booking_notice_ar || 'يتم تأكيد السائق والمركبة وسعة الأمتعة والتوفر النهائي عبر واتساب.');
  const included = isEn
    ? (route.included_en || 'Includes normal standard route charges and King Fahd Causeway tolls where applicable.')
    : (route.included_ar || 'يشمل الرسوم العادية للمسار ورسوم جسر الملك فهد عند انطباقها.');
  return `<section class="section public-price-section" data-public-price="${escapeHtml(route.route_slug)}"><div class="container"><div class="public-price-card glass"><span class="public-price-kicker">${title}</span><div class="public-price-line"><strong>${price}</strong>${sarText}</div><p>${unit}</p><ul><li>${escapeHtml(included)}</li><li>${escapeHtml(notice)}</li></ul><a class="wa-inline" data-booking-submit data-public-price-cta href="#">${isEn ? 'Prepare request on WhatsApp' : 'جهّز الطلب عبر واتساب'}</a></div></div></section>`;
}

function publicSchema(url, config, route, lang, pageSlug = '') {
  const settings = config.settings || DEFAULT_PUBLIC_SETTINGS;
  const graph = [businessEntity(businessConfig, lang),
    { '@type':'WebSite', '@id':'https://getvendora.net/#website', url:'https://getvendora.net/', name:businessConfig.brand_display_name, inLanguage:['ar','en'] },
    { '@type':'WebPage', '@id':url+'#webpage', url, inLanguage:lang, isPartOf:{ '@id':'https://getvendora.net/#website' } }];
  const profile = routeProfiles[pageSlug];
  if (route || profile) {
    const item = route || { route_slug:pageSlug, public_price_enabled:false };
    graph.push(serviceEntity(item, settings, lang, url, profile));
    graph.push(offerCatalog([item], settings, lang, url, { [item.route_slug]:profile }));
  }
  return JSON.stringify({ '@context':'https://schema.org', '@graph':graph }).replace(/</g, '\\u003c');
}

function formatBahrainPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('973')
    ? `+973 ${digits.slice(3, 7)} ${digits.slice(7)}`
    : `+${digits}`;
}

function publicContactSection(settings, lang) {
  const isEn = lang === 'en';
  const numbers = [];
  if (settings.booking_whatsapp_enabled && settings.booking_whatsapp) {
    numbers.push(`<a href="tel:+${escapeHtml(settings.booking_whatsapp)}"><span>${isEn ? 'Booking' : 'الحجز'}</span> <bdi dir="ltr" class="phone-number">${escapeHtml(formatBahrainPhone(settings.booking_whatsapp))}</bdi></a>`);
  }
  if (settings.support_phone_enabled && settings.support_phone) {
    numbers.push(`<a href="tel:+${escapeHtml(settings.support_phone)}"><span>${isEn ? 'Support' : 'الدعم'}</span> <bdi dir="ltr" class="phone-number">${escapeHtml(formatBahrainPhone(settings.support_phone))}</bdi></a>`);
  }
  if (!numbers.length) return '';
  return `<section class="section public-contact-section"><div class="container"><div class="glass public-contact-card"><h2>${isEn ? 'Contact numbers' : 'أرقام التواصل'}</h2>${numbers.join('')}</div></div></section>`;
}

function calculatorCrosslink(lang) {
  const isEn = lang === 'en';
  const href = `${SITE_PATH_PREFIX}/${isEn ? 'en/' : ''}gcc-transport-planner/`;
  const label = isEn
    ? 'Open the Trip Calculator to estimate the route and prepare your request'
    : 'افتح حاسبة الرحلة لتقدير المسار وتجهيز طلبك';
  return `<aside class="calculator-crosslink"><a href="${href}">${label}</a></aside>`;
}

function publicPricingRoutes(config) {
  return (config.routes || []).filter((route) => (
    route.is_active !== false
    && route.public_price_enabled !== false
    && route.price_kind !== 'request_quote'
    && route.price_bhd != null
    && Number.isFinite(Number(route.price_bhd))
  ));
}

function allActivePricingRoutes(config) {
  return (config.routes || []).filter((route) => route.is_active !== false);
}

function pricingCards(config, lang) {
  const isEn = lang === 'en';
  const settings = config.settings || DEFAULT_PUBLIC_SETTINGS;
  const phone = settings.booking_whatsapp_enabled ? settings.booking_whatsapp : '';
  const hiddenGroups = new Set(Array.isArray(settings.hidden_price_destination_groups) ? settings.hidden_price_destination_groups : []);
  return allActivePricingRoutes(config).map((route) => {
    const hidden = settings.public_prices_enabled === false
      || route.is_price_hidden === true
      || route.public_price_enabled === false
      || hiddenGroups.has(route.price_visibility_group)
      || route.price_kind === 'request_quote'
      || route.price_bhd == null
      || !Number.isFinite(Number(route.price_bhd));
    const amount = hidden ? '' : Number(route.price_bhd).toFixed(Number(route.price_bhd) % 1 ? 3 : 0);
    const name = isEn ? route.route_name_en : route.route_name_ar;
    const prefix = route.price_kind === 'from' ? (isEn ? 'From ' : 'ابتداءً من ') : '';
    const unit = route.unit_kind === 'per_day'
      ? (isEn ? 'per additional day' : 'لليوم الإضافي')
      : route.unit_kind === 'package'
        ? (isEn ? 'per package' : 'للباقة')
        : (isEn ? 'per vehicle, one way' : 'للمركبة، اتجاه واحد');
    const sar = !hidden && route.approximate_sar_enabled
      ? `<span>${isEn ? 'approx.' : 'تقريباً'} ${Math.round(Number(route.price_bhd) * Number(settings.sar_per_bhd || 10))} SAR</span>`
      : '';
    const included = isEn ? route.included_en : route.included_ar;
    const message = isEn
      ? `Hello, I would like to ${hidden ? 'request pricing for' : 'check availability for'} ${name}.`
      : `السلام عليكم، أود ${hidden ? 'الاستفسار عن سعر' : 'التحقق من توفر'} ${name}.`;
    const action = phone
      ? `<a href="https://wa.me/${escapeHtml(phone)}?text=${encodeURIComponent(message)}" data-wa-message="${escapeHtml(message)}" data-track-wa>${isEn ? (hidden ? 'Get Live Seasonal Quote' : 'Check availability') : (hidden ? 'احصل على عرض سعر موسمي فوري' : 'تحقق من التوفر')}</a>`
      : '';
    const price = hidden
      ? `<p class="price price-quote"><strong>${isEn ? 'Get Live Seasonal Quote' : 'احصل على عرض سعر موسمي فوري'}</strong></p>`
      : `<p class="price"><strong>${escapeHtml(prefix)}${escapeHtml(amount)} ${isEn ? 'BHD' : 'د.ب'}</strong>${sar}</p>`;
    return `<article class="price-card" data-route="${escapeHtml(route.route_slug)}" data-price-hidden="${hidden}"><h2>${escapeHtml(name)}</h2>${price}<p>${unit}</p>${included ? `<p>${escapeHtml(included)}</p>` : ''}${action}</article>`;
  }).join('');
}

function pricingSchema(url, config, lang) {
  return JSON.stringify(offerCatalog(config.routes || [], config.settings || DEFAULT_PUBLIC_SETTINGS, lang, url, routeProfiles)).replace(/</g, '\\u003c');
}

function homepageFaq(settings) {
  const capacity = escapeHtml(settings.passenger_capacity_ar || 'حتى 7 ركاب حسب المركبة المؤكدة وسعة الأمتعة.');
  const payments = [settings.cash_enabled ? 'الدفع النقدي' : '', settings.benefitpay_enabled ? 'BenefitPay' : ''].filter(Boolean).join(' أو ');
  return [
    ['هل السعر للشخص أم للسيارة كاملة؟', 'الأسعار العامة المعروضة هي للمركبة كاملة وليست لكل راكب.'],
    ['هل الأسعار للذهاب فقط؟', 'نعم، سعر المسار القياسي هو لاتجاه واحد ما لم يُذكر أنه باقة أو يوم إضافي. اطلب تسعيرة منفصلة للذهاب والعودة.'],
    ['كم عدد الركاب المسموح؟', capacity],
    ['هل رسوم جسر الملك فهد مشمولة؟', 'توضح بطاقة كل مسار ما إذا كانت الرسوم المعتادة ورسوم الجسر مشمولة. راجع وصف السعر قبل إرسال الطلب.'],
    ['هل تتوفر رحلة ذهاب وعودة؟', 'نعم، يمكن طلب رحلة ذهاب وعودة، ويُحسب السعر وفق المسار والمدة وأيام الانتظار المطلوبة.'],
    ['هل يمكن الحجز للمطار؟', 'نعم، تتوفر طلبات التوصيل والاستقبال من المطارات. أرسل رقم الرحلة والموعد وعدد الركاب والأمتعة.'],
    ['هل يمكن ترتيب سيارة ليوم كامل؟', 'نعم، تتوفر باقات محددة ليوم كامل حسب الوجهة والتوفر.'],
    ['ما المعلومات المطلوبة لتأكيد الحجز؟', 'مكان وموعد الاستلام، الوجهة، عدد الركاب، عدد الحقائب، وأي رقم رحلة أو طلب خاص.'],
    ['كيف يتم الدفع؟', payments ? `طرق الدفع المتاحة حالياً: ${escapeHtml(payments)}.` : 'تُؤكد طريقة الدفع المتاحة عند تأكيد الطلب.'],
    ['كيف يتم تأكيد السيارة والتوفر؟', 'بعد إرسال التفاصيل عبر واتساب، يتم تأكيد السائق والمركبة المناسبة والسعر النهائي والتوفر قبل الرحلة.'],
  ].map(([question, answer]) => `<details class="faq-item"><summary>${question}</summary><p>${answer}</p></details>`).join('');
}

function arabicDmmAuthoritySection(path, settings) {
  const inbound = path.includes('/dammam-airport-to-bahrain/');
  const capacity = escapeHtml(settings.passenger_capacity_ar || 'حتى 7 ركاب حسب المركبة والأمتعة');
  const payment = [settings.cash_enabled ? 'نقداً' : '', settings.benefitpay_enabled ? 'BenefitPay' : ''].filter(Boolean).join(' أو ');
  return `<section class="section dmm-authority"><div class="container section-shell"><div class="section-head"><h2>${inbound ? 'دليل الاستقبال من مطار الملك فهد DMM إلى البحرين' : 'دليل التوصيل من البحرين إلى مطار الملك فهد DMM'}</h2><p>رمز DMM يعني مطار الملك فهد الدولي في الدمام. يتم تأكيد السائق والمركبة والوقت وسعة الحقائب قبل الرحلة.</p></div><div class="route-grid"><article class="route-card"><h3>ما المعلومات المطلوبة؟</h3><p>${inbound ? 'شركة الطيران ورقم الرحلة ووقت الوصول وعدد الركاب والحقائب والعنوان داخل البحرين.' : 'موقع الاستلام وموعد الإقلاع وشركة الطيران ورقم الرحلة وعدد الركاب والأطفال والحقائب.'}</p></article><article class="route-card"><h3>${inbound ? 'أين تكون نقطة اللقاء؟' : 'كم أبكر يجب المغادرة؟'}</h3><p>${inbound ? 'لا نفترض نقطة لقاء ثابتة؛ يتم الاتفاق على الصالة والموقع مع السائق عند التأكيد.' : 'يعتمد وقت الخروج على موقع الاستلام وازدحام الجسر وإجراءات الحدود وموعد إنهاء إجراءات الطيران. اترك هامشاً مريحاً وتحقق من شركة الطيران.'}</p></article><article class="route-card"><h3>كم عدد الركاب والحقائب؟</h3><p>${capacity}. سبعة ركاب مع حقائب كثيرة قد يحتاجون مركبة مختلفة أو سيارتين.</p></article><article class="route-card"><h3>هل يمكن طلب GMC/XL أو مقعد طفل؟</h3><p>يمكن إرسال الطلب، لكن نوع المركبة ومقعد الطفل يعتمدان على التوفر والتأكيد المسبق.</p></article><article class="route-card"><h3>${inbound ? 'ماذا لو تأخرت الرحلة؟' : 'هل السعر للمركبة أم للراكب؟'}</h3><p>${inbound ? 'أرسل تحديث التأخير عبر واتساب. متابعة الرحلة والانتظار المشمول لا يُفترضان ما لم يتم تأكيدهما.' : 'السعر العام المعروض للمركبة كاملة وليس لكل راكب، وهو لاتجاه واحد ما لم توضح إعدادات المسار غير ذلك.'}</p></article><article class="route-card"><h3>العودة والانتظار والتوقفات</h3><p>يمكن طلب عودة أو انتظار أو توقف إضافي، وتُؤكد مدته وسعره بصورة منفصلة قبل الرحلة.</p></article><article class="route-card"><h3>هل يمكن الاستفسار ليلاً؟</h3><p>يمكن إرسال الاستفسار على مدار 24 ساعة، بينما يبقى التوفر الفعلي ووقت الرد خاضعين للتأكيد.</p></article><article class="route-card"><h3>كيف يتم الدفع والتأكيد؟</h3><p>${payment ? `طرق الدفع المنشورة: ${escapeHtml(payment)}. ` : ''}بعد مراجعة التفاصيل يتم تأكيد السعر والسائق والمركبة والتوفر عبر واتساب.</p></article></div><div class="notice"><h3>الوثائق والحدود ومعلومات الرحلة</h3><p>قد يتغير وقت العبور بسبب حركة جسر الملك فهد وإجراءات الجوازات والجمارك. القواعد قابلة للتغيير ولا تضمن GetVendora دخول أي مسافر. تحقق من الأهلية والوثائق عبر <a href="https://www.bahrain.bh/wps/portal/ar/" rel="noopener">البوابة الوطنية لمملكة البحرين</a> و<a href="https://kfca.sa/" rel="noopener">المؤسسة العامة لجسر الملك فهد</a> و<a href="https://visa.visitsaudi.com/" rel="noopener">بوابة التأشيرة السعودية الرسمية</a>. تحقق من حالة الرحلة عبر <a href="https://kfia.sa/" rel="noopener">مطار الملك فهد الدولي</a> أو شركة الطيران.</p><p><small>آخر مراجعة لمعلومات السفر: 11 يوليو 2026.</small></p></div></div></section>`;
}

async function rewriteTransportHtml(request, response, env) {
  const contentType = response.headers.get('content-type') || '';
  const path = new URL(request.url).pathname;
  if (!contentType.includes('text/html') || !(path.startsWith(`${SITE_PATH_PREFIX}/`) || path === '/' || path === '/contact/')) return response;
  if (/\/(admin|care|ai-chat-test|api)(\/|$)/.test(path)) return response;
  if (typeof HTMLRewriter === 'undefined') return response;
  if (!env.TRANSPORT_DB) return failClosedPriceHtml(response, path);

  let config;
  try { config = await getPublicConfig(env); } catch { return failClosedPriceHtml(response, path); }
  const lang = path.includes('/en/') || !path.startsWith(`${SITE_PATH_PREFIX}/`) ? 'en' : 'ar';
  const pageSlug = rawTransportPageSlug(path);
  const slug = transportRouteSlug(path);
  const route = (config.routes || []).find((item) => item.route_slug === slug) || null;
  const settings = config.settings || DEFAULT_PUBLIC_SETTINGS;
  // If settings fail to load, hide amounts server-side instead of leaking
  // static prices while the browser waits for its settings request.
  const hidePricesOnPage = !config.settings || priceVisibilityForPage(settings, route);
  const refreshPricesOnPage = !hidePricesOnPage && route && Number.isFinite(Number(route.price_bhd));
  const bookingNumber = route?.whatsapp_override || settings.booking_whatsapp;
  const canonical = `https://getvendora.net${path}`;
  const serialized = JSON.stringify(config).replace(/</g, '\\u003c');
  const isPricingPage = slug === 'prices';

  const transformed = new HTMLRewriter()
    .on('script[type="application/ld+json"]', { element(element) {
      if (slug === 'gcc-transport-planner') return;
      if (element.getAttribute('id') !== 'pricesSchema' && !element.hasAttribute('data-route-schema') && !element.hasAttribute('data-vendora-faq')) element.remove();
    } })
    .on('head', { element(element) {
      element.append(`<script type="application/json" id="transport-public-config">${serialized}</script><script type="application/ld+json" data-vendora-schema>${publicSchema(canonical, config, route, lang, pageSlug)}</script>`, { html: true });
    } })
    .on('meta[content]', { element(element) {
      const content = element.getAttribute('content') || '';
      if (hidePricesOnPage && currencyAmountPattern().test(content)) {
        element.setAttribute('content', redactPriceText(content, lang === 'en' ? 'Get Live Seasonal Quote' : 'احصل على عرض سعر موسمي فوري'));
      } else if (refreshPricesOnPage && fareTextPattern().test(content)) {
        element.setAttribute('content', refreshFareText(content, route, settings, lang));
      }
    } })
    .on('title', { text(text) {
      if (hidePricesOnPage) text.replace(redactPriceText(text.text, lang === 'en' ? 'Get Live Seasonal Quote' : 'احصل على عرض سعر موسمي فوري'));
      else if (refreshPricesOnPage) text.replace(refreshFareText(text.text, route, settings, lang));
    } })
    .on('script[src]', { element(element) {
      const src = element.getAttribute('src') || '';
      if (!/(?:^|\/)(?:site\.js|prices-page\.js|gcc-transport-planner\.js)(?:\?|$)/.test(src)) return;
      element.setAttribute('src', `${src.split('?')[0]}?v=20261020-trust-pricing`);
    } })
    .on('body', { text(text) {
      if (hidePricesOnPage && currencyAmountPattern().test(text.text)) {
        text.replace(redactPriceText(text.text, hiddenPriceMarkup(settings, lang)), { html: true });
      } else if (refreshPricesOnPage && fareTextPattern().test(text.text)) {
        text.replace(refreshFareText(text.text, route, settings, lang));
      }
    } })
    .on('[data-pricing-mode]', { element(element) {
      element.setInnerContent(pricingCopy[lang][settings.public_prices_enabled === true ? 'fixed' : 'seasonal']);
    } })
    .on('.route-fare-badge', { element(element) {
      if (pageSlug === 'contact') element.setInnerContent(pricingCopy[lang][settings.public_prices_enabled === true ? 'fixed' : 'seasonal']);
    } })
    .on('[data-live-route-fare]', { element(element) {
      element.setInnerContent(hidePricesOnPage || !route || route.price_bhd == null ? hiddenPriceMarkup(settings, lang) : escapeHtml(formatPublicFare(route,settings,lang)), {html:true});
    } })
    .on('#priceList', { element(element) {
      if (isPricingPage) element.setInnerContent(pricingCards(config, lang), { html: true });
    } })
    .on('[data-contact-prices]', { element(element) {
      const routes=(config.routes||[]).filter(r=>['bahrain-to-khobar','bahrain-to-dammam-airport','bahrain-to-riyadh'].includes(r.route_slug));
      element.setInnerContent(pricingCards({...config,routes},lang),{html:true});
    } })
    .on('#pricesSchema', { element(element) {
      if (isPricingPage) element.setInnerContent(pricingSchema(canonical, config, lang));
    } })
    .on('.phase7-authority-links', { element(element) {
      element.remove();
    } })
    .on('.en-sub', { element(element) {
      if (lang === 'ar') element.remove();
    } })
    .on('a', { element(element) {
      let href = element.getAttribute('href') || '';
      if (/https:\/\/wa\.me\/\d+/i.test(href) && bookingNumber) {
        href = href.replace(/https:\/\/wa\.me\/\d+/i, `https://wa.me/${bookingNumber}`);
        element.setAttribute('href', href);
      }
      if (hidePricesOnPage) {
        const waMsg = element.getAttribute('data-wa-message');
        if (waMsg && currencyAmountPattern().test(waMsg)) {
          const cleaned = waMsg
            .replace(currencyAmountPattern(), '')
            .replace(/\s*[—–-]\s*(?:للمركبة كاملة|رسوم الجسر مشمولة|Complete vehicle|Toll included)[^.]*/gi, '')
            .replace(/\s*\(\s*\)/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
          element.setAttribute('data-wa-message', cleaned);
        }
        if (href.includes('text=') && currencyAmountPattern().test(decodeURIComponent(href))) {
          try {
            const urlObj = new URL(href);
            const textParam = urlObj.searchParams.get('text');
            if (textParam && currencyAmountPattern().test(textParam)) {
              const cleanedText = textParam
                .replace(currencyAmountPattern(), '')
                .replace(/\s*[—–-]\s*(?:للمركبة كاملة|رسوم الجسر مشمولة|Complete vehicle|Toll included)[^.]*/gi, '')
                .replace(/\s*\(\s*\)/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
              urlObj.searchParams.set('text', cleanedText);
              element.setAttribute('href', urlObj.toString());
            }
          } catch {}
        }
      }
      if ((element.getAttribute('data-wa-message') != null || element.getAttribute('data-booking-submit') != null) && !settings.booking_whatsapp_enabled) {
        element.removeAttribute('href');
        element.setAttribute('aria-disabled', 'true');
      }
    } })
    .on('main', { element(element) {
      if (slug !== 'gcc-transport-planner') element.append(calculatorCrosslink(lang), { html: true });
      if (slug === 'contact') {
        const contactHtml = publicContactSection(settings, lang);
        if (contactHtml) element.append(contactHtml, { html: true });
      }
      if (lang === 'ar' && (path.includes('/bahrain-to-dammam-airport/') || path.includes('/dammam-airport-to-bahrain/'))) {
        element.append(arabicDmmAuthoritySection(path, settings), { html: true });
      }
    } })
    .transform(response);

  // Responses returned by HTMLRewriter can retain an immutable header guard in
  // the Workers runtime. Clone only at the output boundary, then pass the
  // transformed stream through once; do not mutate ASSETS.fetch() or the
  // HTMLRewriter response directly and do not read either body eagerly.
  const headers = new Headers(transformed.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers,
  });
}

/** Match Worker routes to Pages-style URLs (optional prefix, no trailing slash). */
function logicalPathname(url) {
  let p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === SITE_PATH_PREFIX || p.startsWith(`${SITE_PATH_PREFIX}/`)) {
    p = p.slice(SITE_PATH_PREFIX.length) || '/';
  }
  return p;
}

function secureAssetResponse(request, response) {
  const pathname = new URL(request.url).pathname;
  const privatePath = /\/(?:admin|care|ai-chat-test|api|scratch|tests|test-results|booking-desk|desk)(?:\/|$)/i.test(pathname);
  const staticAsset = /\.(?:js|css|svg|webp|avif|png|jpe?g|gif|ico|woff2?|json)$/i.test(pathname);
  const longLivedAsset = /\.(?:webp|avif|png|jpe?g|gif|ico|woff2?)$/i.test(pathname);
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('x-frame-options', privatePath ? 'DENY' : 'SAMEORIGIN');
  if (privatePath) {
    headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
    headers.set('cache-control', 'no-store');
  } else if (staticAsset) {
    headers.set('cache-control', longLivedAsset
      ? 'public, max-age=86400, stale-while-revalidate=604800'
      : 'public, max-age=3600, stale-while-revalidate=86400');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createContext(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    data: {},
    waitUntil: ctx.waitUntil.bind(ctx),
    next: () => env.ASSETS.fetch(request),
  };
}

async function dispatchPagesFunction(module, request, env, ctx) {
  const context = createContext(request, env, ctx);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS' && module.onRequestOptions) return module.onRequestOptions(context);
  if (method === 'GET' && module.onRequestGet) return module.onRequestGet(context);
  if (method === 'POST' && module.onRequestPost) return module.onRequestPost(context);
  if (method === 'PUT' && module.onRequestPut) return module.onRequestPut(context);
  if (method === 'DELETE' && module.onRequestDelete) return module.onRequestDelete(context);
  if (module.onRequest) return module.onRequest(context);

  return new Response('Method not allowed', { status: 405 });
}

function transportHealthResponse() {
  return new Response(JSON.stringify({
    ok: true,
    service: 'vendora-transport-api',
    routes: [
      '/api/transport/admin',
      '/api/transport/google-audience',
      '/api/transport/event',
      '/api/transport/ai-chat',
      '/api/transport/whatsapp-lead',
      '/api/transport/log',
      '/api/transport/passenger-care',
      '/api/transport/route-reviews',
    ],
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type, x-admin-token',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = logicalPathname(url);

    try {
      // Short public entry paths resolve to one canonical transport URL.
      const publicSlug = url.pathname.replace(/^\/|\/$/g, '');
      const b2bHubSlugs = new Set([
        'exhibition-world-bahrain-transport',
        'luxury-hotel-transfers-bahrain',
        'corporate-chauffeur-bahrain',
        'b2b-travel-partners',
        'bahrain-airport-to-hotel-transfers',
      ]);
      if (publicSlug === 'prices' || Object.hasOwn(routeProfiles, publicSlug) || b2bHubSlugs.has(publicSlug)) {
        return Response.redirect(`${url.origin}${SITE_PATH_PREFIX}/${publicSlug}/${url.search}`, 301);
      }
      if (publicSlug.startsWith('en/') && b2bHubSlugs.has(publicSlug.slice(3))) {
        return Response.redirect(`${url.origin}${SITE_PATH_PREFIX}/${publicSlug}/${url.search}`, 301);
      }
      if (path === '/ai-chat-test' || path.startsWith('/ai-chat-test/')
        || path === '/scratch' || path.startsWith('/scratch/')
        || path === '/tests' || path.startsWith('/tests/')
        || path === '/test-results' || path.startsWith('/test-results/')
        || path === '/api/debug' || path.startsWith('/api/debug/')) {
        return new Response('Not found', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
        });
      }

      const lowerPath = path.toLowerCase().replace(/\/+$/, '') || '/';
      const retiredNonGccSlugs = new Set([
        'arbaeen-karbala-travel-tips', 'arbaeen-packing-list', 'arbaeen-season-bahrain-to-karbala',
        'arbaeen-transport', 'bahrain-to-iraq', 'bahrain-to-baghdad', 'bahrain-to-basra',
        'bahrain-to-karbala', 'bahrain-to-karbala-route-plan', 'bahrain-to-najaf',
        'bahrain-to-najaf-driving-time', 'best-car-for-iraq-family-travel', 'best-time-bahrain-to-iraq',
        'best-way-bahrain-to-karbala', 'book-private-car-bahrain-to-karbala',
        'book-private-car-bahrain-to-najaf', 'direct-transport-bahrain-to-karbala',
        'family-transport-bahrain-najaf-karbala', 'family-travel-bahrain-to-iraq',
        'iraq-ziyarat-private-car-bahrain', 'karbala-trip-from-bahrain', 'najaf-trip-from-bahrain',
        'overland-travel-bahrain-to-iraq', 'pilgrims-transport-bahrain-to-iraq',
        'private-car-bahrain-to-iraq', 'private-car-vs-other-iraq-travel', 'ziyarat-iraq-transport'
      ]);
      const nonGccSegments = lowerPath.split('/').filter(Boolean).filter((segment) => segment !== 'en');
      if (nonGccSegments.some((segment) => retiredNonGccSlugs.has(segment))) {
        return new Response('410 Gone - This non-GCC transport route has been retired.', {
          status: 410,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
        });
      }
      const internalArtifactPaths = new Set(['/discovered_pages.json', '/full-site-audit.json', '/availability-repair-report.json']);
      if (lowerPath.endsWith('.md') || internalArtifactPaths.has(lowerPath)) {
        return new Response('Not found', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
        });
      }
      if (lowerPath === '/tools' || lowerPath.startsWith('/tools/')
        || lowerPath === '/calculators' || lowerPath.startsWith('/calculators/')
        || lowerPath === '/calculator' || lowerPath.startsWith('/calculator/')
        || lowerPath === '/restaurant-calculators' || lowerPath.startsWith('/restaurant-calculators/')
        || lowerPath === '/guides' || lowerPath.startsWith('/guides/')
        || lowerPath === '/all-tools' || lowerPath.startsWith('/all-tools/')
        || lowerPath === '/zip' || lowerPath.startsWith('/zip/')
        || lowerPath === '/pdf' || lowerPath.startsWith('/pdf/')
        || lowerPath === '/pdf-tools' || lowerPath.startsWith('/pdf-tools/')
        || lowerPath === '/data/currencies.json') {
        return new Response('410 Gone - This tool has been decommissioned. Please visit Vendora Transport at https://getvendora.net/bahrain-saudi-gcc-transport/', {
          status: 410,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
        });
      }

      if (path.startsWith('/demo/maroc-market/api/')) {
        return await dispatchPagesFunction(marocMarketApi, request, env, ctx);
      }

      if (path === '/api/transport/health') {
        if (request.method.toUpperCase() === 'OPTIONS') {
          return new Response(null, { status: 204, headers: transportHealthResponse().headers });
        }
        return transportHealthResponse();
      }

      if (path === '/api/transport/admin') {
        return await dispatchPagesFunction(adminApi, request, env, ctx);
      }

      if (path === '/api/transport/google-audience') {
        return await dispatchPagesFunction(googleAudienceApi, request, env, ctx);
      }

      if (path === '/api/transport/event' || path === '/api/transport/whatsapp-lead') {
        return await dispatchPagesFunction(leadApi, request, env, ctx);
      }

      if (path === '/api/transport/ai-chat') {
        return await dispatchPagesFunction(aiChatApi, request, env, ctx);
      }

      // AI Concierge endpoint. This must be dispatched by the Worker because
      // this project uses Workers Static Assets, not automatic Pages Functions
      // routing. logicalPathname() strips /bahrain-saudi-gcc-transport first,
      // so both /api/ai-chat and /bahrain-saudi-gcc-transport/api/ai-chat work.
      if (path === '/api/ai-chat') {
        return await dispatchPagesFunction(conciergeApi, request, env, ctx);
      }

      if (path === '/api/transport/log') {
        return await dispatchPagesFunction(errorApi, request, env, ctx);
      }

      if (path === '/api/track') {
        return await dispatchPagesFunction(trackingApi, request, env, ctx);
      }

      if (path === '/api/transport/passenger-care') {
        return await dispatchPagesFunction(passengerCareApi, request, env, ctx);
      }

      if (path === '/api/transport/route-reviews') {
        return await dispatchPagesFunction(routeReviewsApi, request, env, ctx);
      }

      if (path === '/api/transport/complaints') {
        return await dispatchPagesFunction(complaintsApi, request, env, ctx);
      }

      if (path === '/api/transport/public-settings') {
        return await dispatchPagesFunction(publicSettingsApi, request, env, ctx);
      }

      if (path === '/api/transport/booking-desk') {
        return await dispatchPagesFunction(bookingDeskApi, request, env, ctx);
      }

      if (path === '/api/transport/driver-invite') {
        return await dispatchPagesFunction(driverInviteApi, request, env, ctx);
      }

      if (path === '/desk' || path === '/desk/') {
        return Response.redirect(`${url.origin}/booking-desk/`, 302);
      }

      if (path === '/driver/invite' || path === '/driver/invite/' || path.startsWith('/driver/invite/')
        || path === '/driver-invite' || path === '/driver-invite/' || path.startsWith('/driver-invite/')
        || path.startsWith('/d/')) {
        let rawToken = '';
        if (path.startsWith('/d/')) {
          rawToken = path.slice('/d/'.length).replace(/^\/+/, '').trim();
        } else {
          const prefix = path.startsWith('/driver/invite') ? '/driver/invite' : '/driver-invite';
          rawToken = path.slice(prefix.length).replace(/^\/+/, '').trim();
        }
        const targetUrl = new URL(`/booking-desk/driver-invite/${rawToken ? `?t=${encodeURIComponent(rawToken)}` : ''}`, url.origin);
        const assetResponse = await env.ASSETS.fetch(new Request(targetUrl, request));
        return secureAssetResponse(request, assetResponse);
      }

      if (path === '/api/nada/health'
        || path === '/api/nada/menu'
        || path === '/api/nada/admin'
        || path === '/api/nada/upload'
        || path === '/api/nada/order'
        || path === '/api/nada/request'
        || path === '/api/nada/request-status'
        || path === '/api/nada/suggestion'
        || path === '/api/nada/log'
        || path.startsWith('/api/nada/assets/')) {
        return await dispatchPagesFunction(nadaMenuApi, request, env, ctx);
      }

      const assetResponse = await rewriteTransportHtml(request, await env.ASSETS.fetch(request), env);
      return secureAssetResponse(request, assetResponse);
    } catch (error) {
      // Capture any unhandled Worker-level failure so it shows up in the admin error log.
      ctx.waitUntil(recordError(env, {
        source: 'worker',
        severity: 'fatal',
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
        pageUrl: request.url,
        pagePath: path,
        userAgent: request.headers.get('user-agent'),
        context: `method=${request.method}`,
      }));

      if (path.startsWith('/api/transport/')) {
        return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), {
          status: 500,
          headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        });
      }
      throw error;
    }
  },

  // Cron trigger: send the once-a-day visitor/lead summary to the phone.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      leadApi.sendDailySummary(env).catch((error) => recordError(env, {
        source: 'cron',
        severity: 'error',
        message: `Daily summary failed: ${error && error.message ? error.message : String(error)}`,
        stack: error && error.stack ? error.stack : null,
        context: `cron=${event && event.cron ? event.cron : 'unknown'}`,
      })),
    );
  },
};
