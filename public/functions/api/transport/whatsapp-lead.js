import { recordError } from './error-log.js';
import { ensurePassengerCareSchema, makeBookingRef } from './passenger-care.js';

const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'null',
]);

const MAX_BODY_BYTES = 8192;
let settingsSchemaReady = false;

const DEFAULT_NOTIFICATION_SETTINGS = {
  notifications_enabled: true,
  notify_whatsapp_clicks: true,
  // Mode C default: do not ping the phone on browsing. Real-time alerts fire
  // only on WhatsApp clicks; overall traffic arrives in the daily summary.
  notify_pageviews: false,
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://getvendora.net';
  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function isPageview(payload) {
  return cleanText(payload && payload.serviceType, 160) === 'pageview';
}

/**
 * Build ntfy publish headers. If TRANSPORT_NOTIFY_WEBHOOK_TOKEN is set, we
 * authenticate so messages count against the owner's own ntfy account quota
 * instead of the shared (rate-limited) anonymous quota for Cloudflare IPs.
 */
function getNtfyToken(env) {
  const raw = env && env.TRANSPORT_NOTIFY_WEBHOOK_TOKEN;
  if (typeof raw !== 'string') return null;
  const token = raw.replace(/[\r\n]/g, '').trim();
  return token || null;
}

function buildNtfyHeaders(env, extra) {
  const headers = { 'content-type': 'text/plain; charset=utf-8', ...extra };
  const token = getNtfyToken(env);
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

/** Attach token to the publish URL (?auth=tk_…) — reliable from Cloudflare Workers. */
function resolveNtfyPublishUrl(webhookUrl, env) {
  const token = getNtfyToken(env);
  if (!token) return webhookUrl;
  try {
    const url = new URL(webhookUrl);
    url.searchParams.set('auth', token);
    return url.toString();
  } catch {
    return webhookUrl;
  }
}

export { getNtfyToken, buildNtfyHeaders, resolveNtfyPublishUrl };

function getPayloadTrafficSource(payload) {
  return cleanText(payload && (payload.firstTrafficSource || payload.trafficSource || payload.utmSource), 160) || 'direct/unknown';
}

async function ensureSettingsSchema(env) {
  if (settingsSchemaReady || !env.TRANSPORT_DB) return;
  await env.TRANSPORT_DB.prepare(`
    CREATE TABLE IF NOT EXISTS transport_admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `).run();
  settingsSchemaReady = true;
}

function boolSetting(value, fallback = false) {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', 'on', 'enabled'].includes(text)) return true;
  if (['false', 'no', 'off', 'disabled'].includes(text)) return false;
  return fallback;
}

async function getNotificationSettings(env) {
  const envPageviewFallback = String(env.TRANSPORT_NOTIFY_PAGEVIEWS || '').toLowerCase() === 'true';
  const defaults = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    notify_pageviews: envPageviewFallback,
  };

  if (!env.TRANSPORT_DB) return defaults;

  try {
    await ensureSettingsSchema(env);
    const { results } = await env.TRANSPORT_DB.prepare(`
      SELECT key, value
      FROM transport_admin_settings
      WHERE key IN ('notifications_enabled', 'notify_whatsapp_clicks', 'notify_pageviews')
    `).all();
    const saved = Object.fromEntries((results || []).map((row) => [row.key, row.value]));
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
      key,
      boolSetting(saved[key], fallback),
    ]));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'transport_notify_settings_failed',
      message: error && error.message ? error.message : String(error),
    }));
    return defaults;
  }
}

function prettyRoute(row) {
  const label = cleanText(row && row.route_label, 240);
  if (label && !/^https?:/i.test(label)) return label;
  const slug = cleanText(row && row.route_slug, 160);
  if (slug) {
    return slug.replace(/-en$/i, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return cleanText(row && row.page_path, 200) || 'page';
}

/**
 * Pull the pages this visitor already viewed in the last few hours so a single
 * WhatsApp-click alert can show their full journey leading up to the click.
 */
async function fetchVisitorJourney(env, payload) {
  if (!env.TRANSPORT_DB) return [];
  const visitorId = cleanText(payload && payload.visitorId, 80) || '';
  const sessionId = cleanText(payload && payload.sessionId, 120) || '';
  if (!visitorId && !sessionId) return [];
  try {
    const { results } = await env.TRANSPORT_DB.prepare(`
      SELECT route_label, route_slug, page_path, service_type, clicked_at, time_on_page_ms
      FROM whatsapp_leads
      WHERE (json_extract(raw_payload, '$.visitorId') = ?1 OR session_id = ?2)
        AND clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 hours')
      ORDER BY clicked_at ASC
      LIMIT 30
    `).bind(visitorId, sessionId).all();
    return results || [];
  } catch {
    return [];
  }
}

function buildClickNotificationText(payload, geo, journey) {
  const visitCount = cleanInteger(payload.visitCount);
  const isReturning = typeof visitCount === 'number' && visitCount > 1;
  const customerKind = typeof visitCount === 'number'
    ? (isReturning ? 'RETURNING customer' : 'NEW customer')
    : 'Customer';
  const route = cleanText(payload.routeLabel || payload.routeSlug, 240) || 'Unknown page';
  const pagePath = cleanText(payload.pagePath, 300) || '-';
  const pageUrl = cleanText(payload.pageUrl, 500) || '';
  const language = cleanText(payload.language, 20);
  const buttonText = cleanText(payload.clickText, 160) || 'WhatsApp button';
  const source = getPayloadTrafficSource(payload);
  const campaign = cleanText(payload.utmCampaign, 160) || 'none';
  const device = cleanText(payload.deviceType, 40) || 'unknown device';
  const location = [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'unknown location';
  const timeOnPage = Math.round(Number(payload.timeOnPageMs || 0) / 1000);
  const scroll = cleanBoundedInteger(payload.scrollDepthPercent, 0, 100) ?? 0;
  const visitor = cleanText(payload.visitorId, 80);
  const referrer = cleanText(payload.referrerHost, 200) || cleanText(payload.referrer, 200) || 'direct/bookmark';
  const tripFrom = [cleanText(payload.fromCity, 120), cleanText(payload.fromCountry, 120)].filter(Boolean).join(', ');
  const tripTo = [cleanText(payload.toCity, 120), cleanText(payload.toCountry, 120)].filter(Boolean).join(', ');
  const serviceType = cleanText(payload.serviceType, 120);

  const pages = (journey || []).filter((e) => cleanText(e.service_type, 40) !== 'pageview' ? false : true);
  const totalSeconds = pages.reduce((sum, e) => sum + Math.round(Number(e.time_on_page_ms || 0) / 1000), 0);
  const journeyLines = pages.map((e, i) => `  ${i + 1}. ${prettyRoute(e)}`);

  return [
    'Vendora: WHATSAPP BOOKING CLICK 🔥',
    `${customerKind}${typeof visitCount === 'number' ? ` (visit #${visitCount})` : ''} · ${device} · ${location}`,
    `Came from: ${source}${campaign && campaign !== 'none' ? ` (campaign: ${campaign})` : ''}`,
    `Clicked: "${buttonText}" on ${route}${language ? ` (${language})` : ''}`,
    (tripFrom || tripTo) ? `Trip: ${tripFrom || '?'} -> ${tripTo || '?'}` : '',
    serviceType && serviceType !== 'pageview' ? `Service: ${serviceType}` : '',
    pages.length
      ? `Before clicking they viewed (${pages.length} page${pages.length === 1 ? '' : 's'}, ${totalSeconds}s):`
      : 'This was their entry page (no earlier pages tracked).',
    ...journeyLines,
    `Engagement on this page: ${timeOnPage}s, ${scroll}% scrolled`,
    pageUrl ? `Page URL: ${pageUrl}` : '',
    `Where: ${pagePath}`,
    `Referrer: ${referrer}`,
    visitor ? `Visitor ID: ${visitor}` : '',
    'Meaning: this customer opened WhatsApp to talk to the driver — a real lead you can act on.',
  ].filter(Boolean).join('\n');
}

function buildNotificationText(payload, geo) {
  const pageview = isPageview(payload);
  const visitCount = cleanInteger(payload.visitCount);
  const isReturning = typeof visitCount === 'number' && visitCount > 1;
  const customerKind = typeof visitCount === 'number'
    ? (isReturning ? 'RETURNING customer' : 'NEW customer')
    : 'Customer';
  const eventName = pageview
    ? (typeof visitCount === 'number'
        ? (isReturning ? 'RETURNING CUSTOMER VISIT' : 'NEW CUSTOMER VISIT')
        : 'CUSTOMER VISIT')
    : 'WHATSAPP BOOKING CLICK';
  const route = cleanText(payload.routeLabel || payload.routeSlug, 240) || 'Unknown route';
  const pagePath = cleanText(payload.pagePath, 300) || '-';
  const pageTitle = cleanText(payload.pageTitle, 240) || '';
  const pageUrl = cleanText(payload.pageUrl, 500) || '';
  const language = cleanText(payload.language, 20);
  const buttonText = cleanText(payload.clickText, 160);
  const source = getPayloadTrafficSource(payload);
  const campaign = cleanText(payload.utmCampaign, 160) || 'none';
  const device = cleanText(payload.deviceType, 40) || 'unknown device';
  const location = [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'unknown location';
  const timeOnPage = Math.round(Number(payload.timeOnPageMs || 0) / 1000);
  const scroll = cleanBoundedInteger(payload.scrollDepthPercent, 0, 100) ?? 0;
  const visitor = cleanText(payload.visitorId, 80);

  // Booking selections (only present on WhatsApp booking-form clicks).
  const tripFrom = [cleanText(payload.fromCity, 120), cleanText(payload.fromCountry, 120)].filter(Boolean).join(', ');
  const tripTo = [cleanText(payload.toCity, 120), cleanText(payload.toCountry, 120)].filter(Boolean).join(', ');
  const serviceType = cleanText(payload.serviceType, 120);

  return [
    `Vendora Transport: ${eventName}`,
    `Website: getvendora.net / GCC Transport`,
    pageview ? `Customer type: ${customerKind}${typeof visitCount === 'number' ? ` (visit #${visitCount})` : ''}` : '',
    pageTitle ? `Page name: ${pageTitle}` : '',
    `Route/page: ${route}${language ? ` (${language})` : ''}`,
    `Where: ${pagePath}`,
    pageUrl ? `Full URL: ${pageUrl}` : '',
    !pageview && buttonText ? `Clicked button: "${buttonText}"` : '',
    !pageview && serviceType && serviceType !== 'pageview' ? `Service: ${serviceType}` : '',
    !pageview && tripFrom ? `From: ${tripFrom}` : '',
    !pageview && tripTo ? `To: ${tripTo}` : '',
    `Source: ${source}`,
    `Campaign: ${campaign}`,
    `Device/location: ${device} / ${location}`,
    `Engagement: ${timeOnPage}s on page, ${scroll}% scrolled`,
    pageview
      ? `Meaning: a ${isReturning ? 'returning' : 'new'} customer just arrived on the site (we will not alert again as they browse other pages).`
      : 'Meaning: a customer just opened the WhatsApp booking chat from this page.',
    visitor ? `Visitor: ${visitor.slice(0, 8)}...` : '',
  ].filter(Boolean).join('\n');
}

async function sendPhoneNotification(request, env, payload) {
  const webhookUrl = cleanText(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
  if (!webhookUrl) return;

  const pageview = isPageview(payload);
  const settings = await getNotificationSettings(env);
  if (!settings.notifications_enabled) return;
  if (pageview && !settings.notify_pageviews) return;
  if (!pageview && !settings.notify_whatsapp_clicks) return;

  let url;
  try {
    url = new URL(webhookUrl);
    if (!['https:', 'http:'].includes(url.protocol)) return;
  } catch {
    return;
  }

  const geo = getRequestGeo(request);
  let text;
  let title;
  let priority;
  let tags;

  if (pageview) {
    // Optional arrival ping (OFF by default in Mode C). Only the first page of
    // a visit, never the extra pages they browse afterwards.
    const sessionPageViews = cleanInteger(payload.sessionPageViews);
    const isFirstPage = sessionPageViews === null || sessionPageViews <= 1;
    if (!isFirstPage) return;
    const visitCount = cleanInteger(payload.visitCount);
    const isReturning = typeof visitCount === 'number' && visitCount > 1;
    text = buildNotificationText(payload, geo);
    title = isReturning ? 'Vendora: returning customer' : 'Vendora: NEW customer';
    priority = 'default';
    tags = isReturning ? 'repeat' : 'wave';
  } else {
    // The money moment: a customer clicked to talk to the driver. Send ONE rich
    // message showing everything they did leading up to the click.
    const journey = await fetchVisitorJourney(env, payload);
    text = buildClickNotificationText(payload, geo, journey);
    title = 'Vendora: WhatsApp booking click';
    priority = 'high';
    tags = 'telephone';
  }

  await fetch(resolveNtfyPublishUrl(url.toString(), env), {
    method: 'POST',
    headers: buildNtfyHeaders(env, { title, priority, tags }),
    body: text,
  });
}

/**
 * Once-a-day digest (sent by the Worker cron trigger): how many real customers
 * came, new vs returning, page views, WhatsApp clicks/conversion, and the top
 * page/country over the last 24 hours. Stays quiet on days with no activity.
 */
export async function sendDailySummary(env) {
  const webhookUrl = cleanText(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
  if (!webhookUrl || !env.TRANSPORT_DB) return;

  const settings = await getNotificationSettings(env);
  if (!settings.notifications_enabled) return;

  let url;
  try {
    url = new URL(webhookUrl);
    if (!['https:', 'http:'].includes(url.protocol)) return;
  } catch {
    return;
  }

  const since = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')";

  const totals = await env.TRANSPORT_DB.prepare(`
    SELECT
      COUNT(DISTINCT COALESCE(json_extract(raw_payload, '$.visitorId'), session_id)) AS visitors,
      SUM(CASE WHEN COALESCE(service_type, '') = 'pageview' THEN 1 ELSE 0 END) AS pageviews,
      SUM(CASE WHEN COALESCE(service_type, '') <> 'pageview' THEN 1 ELSE 0 END) AS clicks
    FROM whatsapp_leads
    WHERE clicked_at >= ${since}
  `).first();

  const split = await env.TRANSPORT_DB.prepare(`
    SELECT
      SUM(CASE WHEN mx > 1 THEN 1 ELSE 0 END) AS returning_visitors,
      SUM(CASE WHEN mx <= 1 THEN 1 ELSE 0 END) AS new_visitors
    FROM (
      SELECT
        COALESCE(json_extract(raw_payload, '$.visitorId'), session_id) AS vk,
        MAX(COALESCE(json_extract(raw_payload, '$.visitCount'), 1)) AS mx
      FROM whatsapp_leads
      WHERE clicked_at >= ${since}
      GROUP BY vk
    )
  `).first();

  const topPage = await env.TRANSPORT_DB.prepare(`
    SELECT COALESCE(NULLIF(route_label, ''), NULLIF(route_slug, ''), page_path) AS label, COUNT(*) AS c
    FROM whatsapp_leads
    WHERE clicked_at >= ${since} AND COALESCE(service_type, '') = 'pageview'
    GROUP BY label
    ORDER BY c DESC
    LIMIT 1
  `).first();

  const topCountry = await env.TRANSPORT_DB.prepare(`
    SELECT cf_country AS label, COUNT(*) AS c
    FROM whatsapp_leads
    WHERE clicked_at >= ${since} AND cf_country IS NOT NULL AND cf_country <> ''
    GROUP BY cf_country
    ORDER BY c DESC
    LIMIT 1
  `).first();

  const visitors = Number(totals?.visitors || 0);
  const pageviews = Number(totals?.pageviews || 0);
  const clicks = Number(totals?.clicks || 0);
  const newVisitors = Number(split?.new_visitors || 0);
  const returningVisitors = Number(split?.returning_visitors || 0);
  const conversion = pageviews > 0 ? Math.round((clicks / pageviews) * 100) : 0;

  // Don't send an empty "0 everything" message on quiet days.
  if (visitors === 0 && pageviews === 0 && clicks === 0) return;

  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Bahrain',
  });

  const text = [
    `Vendora: Daily summary (${date})`,
    `Visitors: ${visitors} total — ${newVisitors} new, ${returningVisitors} returning`,
    `Page views: ${pageviews}`,
    `WhatsApp clicks: ${clicks}${pageviews > 0 ? ` (conversion ${conversion}%)` : ''}`,
    topPage && topPage.label ? `Top page: ${prettyRoute({ route_label: topPage.label })} (${Number(topPage.c || 0)} views)` : '',
    topCountry && topCountry.label ? `Top country: ${topCountry.label}` : '',
    'Open the admin dashboard for full details and evidence.',
  ].filter(Boolean).join('\n');

  await fetch(resolveNtfyPublishUrl(url.toString(), env), {
    method: 'POST',
    headers: buildNtfyHeaders(env, { title: 'Vendora daily summary', priority: 'low', tags: 'bar_chart' }),
    body: text,
  });
}

function cleanText(value, maxLength = 500) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanUrl(value) {
  const text = cleanText(value, 1200);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString().slice(0, 1200);
  } catch {
    return null;
  }
}

function cleanInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(10000, Math.round(number)));
}

function cleanBoundedInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || null;
}

function getHeaderValue(request, names, maxLength = 120) {
  for (const name of names) {
    const value = cleanText(request.headers.get(name), maxLength);
    if (!value) continue;
    try {
      return decodeURIComponent(value.replace(/\+/g, ' ')).slice(0, maxLength);
    } catch {
      return value;
    }
  }
  return null;
}

function normalizeCountryCode(value) {
  const code = cleanText(value, 8);
  if (!code) return null;
  const normalized = code.toUpperCase();
  return normalized === 'XX' ? null : normalized;
}

function getRequestGeo(request) {
  const cf = request.cf || {};
  return {
    city: cleanText(cf.city, 120) || getHeaderValue(request, ['x-vercel-ip-city'], 120),
    region: cleanText(cf.region, 120)
      || cleanText(cf.regionCode, 120)
      || getHeaderValue(request, ['x-vercel-ip-country-region', 'x-vercel-ip-country-region-name'], 120),
    country: normalizeCountryCode(cf.country)
      || normalizeCountryCode(getHeaderValue(request, ['cf-ipcountry', 'x-vercel-ip-country', 'x-appengine-country', 'cloudfront-viewer-country'], 8)),
    timezone: cleanText(cf.timezone, 80) || getHeaderValue(request, ['x-vercel-ip-timezone'], 80),
    rayId: cleanText(request.headers.get('cf-ray'), 120) || getHeaderValue(request, ['x-request-id', 'x-vercel-id'], 120),
  };
}

function getPayloadValue(payload, key, maxLength) {
  return cleanText(payload && payload[key], maxLength);
}

function safePayloadJson(payload) {
  const maxLength = 7000;
  const text = JSON.stringify(payload);
  if (text.length <= maxLength) return text;

  const compact = { ...payload };
  [
    'referrer',
    'firstReferrer',
    'targetUrl',
    'pageUrl',
    'pageTitle',
    'clickText',
    'userAgent',
  ].forEach((key) => {
    if (typeof compact[key] === 'string') {
      compact[key] = compact[key].slice(0, 240);
    }
  });

  const compactText = JSON.stringify(compact);
  if (compactText.length <= maxLength) return compactText;

  return JSON.stringify({
    timestamp: payload.timestamp,
    routeSlug: payload.routeSlug,
    routeLabel: payload.routeLabel,
    pagePath: payload.pagePath,
    targetUrl: payload.targetUrl,
    sessionId: payload.sessionId,
    visitorId: payload.visitorId,
    visitCount: payload.visitCount,
    sessionPageViews: payload.sessionPageViews,
    previousPagePath: payload.previousPagePath,
    trafficSource: payload.trafficSource,
    firstTrafficSource: payload.firstTrafficSource,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    deviceType: payload.deviceType,
    browserLanguage: payload.browserLanguage,
    platform: payload.platform,
    connectionType: payload.connectionType,
    timeOnPageMs: payload.timeOnPageMs,
    scrollDepthPercent: payload.scrollDepthPercent,
    serviceType: payload.serviceType,
  });
}

async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new Error('Payload too large');
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    throw new Error('Payload too large');
  }
  if (!body.trim()) return {};
  return JSON.parse(body);
}

async function storeLead(request, env, payload, leadUuid, bookingRef) {
  const geo = getRequestGeo(request);
  await ensurePassengerCareSchema(env);
  const stmt = env.TRANSPORT_DB.prepare(`
    INSERT INTO whatsapp_leads (
      lead_uuid,
      booking_ref,
      client_clicked_at,
      route_slug,
      route_label,
      service_type,
      from_country,
      from_city,
      to_country,
      to_city,
      page_url,
      page_path,
      target_url,
      language,
      device_type,
      viewport_width,
      viewport_height,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ip_address,
      cf_city,
      cf_region,
      cf_country,
      cf_timezone,
      user_agent,
      request_ray_id,
      session_id,
      page_loaded_at,
      time_on_page_ms,
      scroll_depth_percent,
      click_x,
      click_y,
      click_text,
      browser_language,
      screen_width,
      screen_height,
      timezone_offset_minutes,
      interaction_count,
      raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    leadUuid,
    bookingRef,
    getPayloadValue(payload, 'timestamp', 80),
    getPayloadValue(payload, 'routeSlug', 160),
    getPayloadValue(payload, 'routeLabel', 240),
    getPayloadValue(payload, 'serviceType', 160),
    getPayloadValue(payload, 'fromCountry', 120),
    getPayloadValue(payload, 'fromCity', 120),
    getPayloadValue(payload, 'toCountry', 120),
    getPayloadValue(payload, 'toCity', 120),
    cleanUrl(payload.pageUrl),
    getPayloadValue(payload, 'pagePath', 300),
    cleanUrl(payload.targetUrl),
    getPayloadValue(payload, 'language', 20),
    getPayloadValue(payload, 'deviceType', 40),
    cleanInteger(payload.viewportWidth),
    cleanInteger(payload.viewportHeight),
    cleanUrl(payload.referrer),
    getPayloadValue(payload, 'utmSource', 120),
    getPayloadValue(payload, 'utmMedium', 120),
    getPayloadValue(payload, 'utmCampaign', 160),
    getPayloadValue(payload, 'utmTerm', 160),
    getPayloadValue(payload, 'utmContent', 160),
    getClientIp(request),
    geo.city,
    geo.region,
    geo.country,
    geo.timezone,
    cleanText(request.headers.get('user-agent'), 600),
    geo.rayId,
    getPayloadValue(payload, 'sessionId', 120),
    getPayloadValue(payload, 'pageLoadedAt', 80),
    cleanBoundedInteger(payload.timeOnPageMs, 0, 86400000),
    cleanBoundedInteger(payload.scrollDepthPercent, 0, 100),
    cleanBoundedInteger(payload.clickX, 0, 10000),
    cleanBoundedInteger(payload.clickY, 0, 10000),
    getPayloadValue(payload, 'clickText', 240),
    getPayloadValue(payload, 'browserLanguage', 40),
    cleanInteger(payload.screenWidth),
    cleanInteger(payload.screenHeight),
    cleanBoundedInteger(payload.timezoneOffsetMinutes, -1440, 1440),
    cleanBoundedInteger(payload.interactionCount, 0, 10000),
    safePayloadJson(payload),
  ).run();
}

export async function onRequestOptions(context) {
  const { request } = context;
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);

  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: 'Database binding missing' }, { status: 500, headers });
  }

  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: 'Invalid JSON payload' }, { status: 400, headers });
  }

  const leadUuid = crypto.randomUUID();
  const bookingRef = makeBookingRef(leadUuid);
  const write = storeLead(request, env, payload, leadUuid, bookingRef).catch((error) => {
    console.error(JSON.stringify({
      event: 'transport_lead_insert_failed',
      leadUuid,
      message: error && error.message ? error.message : String(error),
    }));
    return recordError(env, {
      source: 'lead-api',
      severity: 'error',
      message: `Lead insert failed: ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      pageUrl: cleanText(payload && payload.pageUrl, 1000),
      pagePath: cleanText(payload && payload.pagePath, 400),
      context: `leadUuid=${leadUuid}`,
    });
  });
  const notify = sendPhoneNotification(request, env, payload).catch((error) => {
    console.error(JSON.stringify({
      event: 'transport_notify_failed',
      leadUuid,
      message: error && error.message ? error.message : String(error),
    }));
  });

  context.waitUntil(write);
  context.waitUntil(notify);

  return json({ ok: true, leadId: leadUuid, booking_ref: bookingRef }, { status: 202, headers });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}
