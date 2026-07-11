import * as passengerCareApi from './functions/api/transport/passenger-care.js';
import * as routeReviewsApi from './functions/api/transport/route-reviews.js';
import * as adminApi from './functions/api/transport/admin.js';
import * as leadApi from './functions/api/transport/whatsapp-lead.js';
import * as aiChatApi from './functions/api/transport/ai-chat.js';
import * as errorApi from './functions/api/transport/error-log.js';
import * as trackingApi from './functions/api/transport/tracking.js';
import * as publicSettingsApi from './functions/api/transport/public-settings.js';
import { DEFAULT_PUBLIC_SETTINGS, getPublicConfig } from './functions/api/transport/public-settings.js';
import { recordError } from './functions/api/transport/error-log.js';
import * as nadaMenuApi from './functions/api/nada/menu.js';
import * as marocMarketApi from './functions/api/maroc-market/image.js';


const SITE_PATH_PREFIX = '/bahrain-saudi-gcc-transport';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
}

function transportRouteSlug(pathname) {
  const parts = pathname.replace(SITE_PATH_PREFIX, '').split('/').filter(Boolean);
  if (parts[0] === 'en') parts.shift();
  const slug = parts[0] || 'home';
  const aliases = {
    'king-fahd-causeway-guide': 'king-fahd-causeway',
    'dammam-airport-to-bahrain': 'bahrain-to-dammam-airport',
  };
  return aliases[slug] || slug;
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

function publicSchema(url, config, route, lang) {
  const settings = config.settings || DEFAULT_PUBLIC_SETTINGS;
  const base = `${SITE_PATH_PREFIX}/`;
  const graph = [{
    '@type': 'Organization',
    '@id': `https://getvendora.net${base}#organization`,
    name: settings.brand_display_name,
    url: `https://getvendora.net${base}`,
    description: lang === 'en' ? settings.service_description_en : settings.service_description_ar,
    telephone: settings.booking_whatsapp_enabled ? `+${settings.booking_whatsapp}` : undefined,
  }, {
    '@type': 'WebSite',
    '@id': `https://getvendora.net${base}#website`,
    url: `https://getvendora.net${base}`,
    name: settings.brand_display_name,
    inLanguage: ['ar', 'en'],
  }, {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    inLanguage: lang,
    isPartOf: { '@id': `https://getvendora.net${base}#website` },
  }];
  if (route) {
    const service = {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: lang === 'en' ? route.route_name_en : route.route_name_ar,
      provider: { '@id': `https://getvendora.net${base}#organization` },
      areaServed: ['BH', 'SA', 'KW', 'QA', 'AE', 'OM', 'IQ'],
    };
    if (route.price_bhd != null) {
      service.offers = {
        '@type': 'Offer',
        priceCurrency: 'BHD',
        price: Number(route.price_bhd),
        description: route.price_kind === 'from'
          ? (lang === 'en' ? 'Starting public price per complete vehicle' : 'سعر عام ابتدائي للمركبة كاملة')
          : (lang === 'en' ? 'Standard public price per complete vehicle' : 'السعر العام القياسي للمركبة كاملة'),
      };
    }
    graph.push(service);
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
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

async function rewriteTransportHtml(request, response, env) {
  const contentType = response.headers.get('content-type') || '';
  const path = new URL(request.url).pathname;
  if (!contentType.includes('text/html') || !path.startsWith(`${SITE_PATH_PREFIX}/`)) return response;
  if (/\/(admin|care|ai-chat-test|api)(\/|$)/.test(path)) return response;
  if (typeof HTMLRewriter === 'undefined' || !env.TRANSPORT_DB) return response;

  let config;
  try { config = await getPublicConfig(env); } catch { return response; }
  const lang = path.includes('/en/') ? 'en' : 'ar';
  const slug = transportRouteSlug(path);
  const route = (config.routes || []).find((item) => item.route_slug === slug) || null;
  const settings = config.settings || DEFAULT_PUBLIC_SETTINGS;
  const bookingNumber = route?.whatsapp_override || settings.booking_whatsapp;
  const canonical = `https://getvendora.net${path}`;
  const serialized = JSON.stringify(config).replace(/</g, '\\u003c');

  const transformed = new HTMLRewriter()
    .on('script[type="application/ld+json"]', { element(element) {
      if (element.getAttribute('id') !== 'pricesSchema') element.remove();
    } })
    .on('head', { element(element) {
      element.append(`<script type="application/json" id="transport-public-config">${serialized}</script><script type="application/ld+json" data-vendora-schema>${publicSchema(canonical, config, route, lang)}</script>`, { html: true });
    } })
    .on('a', { element(element) {
      const href = element.getAttribute('href') || '';
      if (/https:\/\/wa\.me\/\d+/i.test(href) && bookingNumber) {
        element.setAttribute('href', href.replace(/https:\/\/wa\.me\/\d+/i, `https://wa.me/${bookingNumber}`));
      }
      if ((element.getAttribute('data-wa-message') != null || element.getAttribute('data-booking-submit') != null) && !settings.booking_whatsapp_enabled) {
        element.removeAttribute('href');
        element.setAttribute('aria-disabled', 'true');
      }
    } })
    .on('main', { element(element) {
      const html = priceSection(route, lang, settings.sar_per_bhd);
      if (html) element.append(html, { html: true });
      if (slug === 'contact') {
        const contactHtml = publicContactSection(settings, lang);
        if (contactHtml) element.append(contactHtml, { html: true });
      }
    } })
    .transform(response);
  transformed.headers.set('content-type', 'text/html; charset=utf-8');
  return transformed;
}

/** Match Worker routes to Pages-style URLs (optional prefix, no trailing slash). */
function logicalPathname(url) {
  let p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === SITE_PATH_PREFIX || p.startsWith(`${SITE_PATH_PREFIX}/`)) {
    p = p.slice(SITE_PATH_PREFIX.length) || '/';
  }
  return p;
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

      if (path === '/api/transport/event' || path === '/api/transport/whatsapp-lead') {
        return await dispatchPagesFunction(leadApi, request, env, ctx);
      }

      if (path === '/api/transport/ai-chat') {
        return await dispatchPagesFunction(aiChatApi, request, env, ctx);
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

      if (path === '/api/transport/public-settings') {
        return await dispatchPagesFunction(publicSettingsApi, request, env, ctx);
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

      return await rewriteTransportHtml(request, await env.ASSETS.fetch(request), env);
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
