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

function buildNotificationText(payload, geo) {
  const pageview = isPageview(payload);
  const eventName = pageview ? 'PAGE VISIT' : 'WHATSAPP BOOKING CLICK';
  const route = cleanText(payload.routeLabel || payload.routeSlug, 240) || 'Unknown route';
  const pagePath = cleanText(payload.pagePath, 300) || '-';
  const pageTitle = cleanText(payload.pageTitle, 240) || '';
  const pageUrl = cleanText(payload.pageUrl, 500) || '';
  const source = getPayloadTrafficSource(payload);
  const campaign = cleanText(payload.utmCampaign, 160) || 'none';
  const device = cleanText(payload.deviceType, 40) || 'unknown device';
  const location = [geo.city, geo.country].filter(Boolean).join(', ') || 'unknown location';
  const timeOnPage = Math.round(Number(payload.timeOnPageMs || 0) / 1000);
  const scroll = cleanBoundedInteger(payload.scrollDepthPercent, 0, 100) ?? 0;
  const visitor = cleanText(payload.visitorId, 80);

  return [
    `Vendora Transport: ${eventName}`,
    `Website: getvendora.net / GCC Transport`,
    pageTitle ? `Page name: ${pageTitle}` : '',
    `Route/page: ${route}`,
    `Page: ${pagePath}`,
    pageUrl ? `URL: ${pageUrl}` : '',
    `Source: ${source}`,
    `Campaign: ${campaign}`,
    `Device/location: ${device} / ${location}`,
    `Engagement: ${timeOnPage}s, ${scroll}% scroll`,
    pageview ? 'Meaning: visitor opened this page.' : 'Meaning: customer opened WhatsApp booking chat.',
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
  const text = buildNotificationText(payload, geo);
  const title = pageview ? 'Vendora GCC page visit' : 'Vendora GCC WhatsApp booking';
  const priority = pageview ? 'default' : 'high';

  await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      title,
      priority,
      tags: pageview ? 'eyes' : 'telephone',
    },
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

async function storeLead(request, env, payload, leadUuid) {
  const geo = getRequestGeo(request);
  const stmt = env.TRANSPORT_DB.prepare(`
    INSERT INTO whatsapp_leads (
      lead_uuid,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    leadUuid,
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
  const write = storeLead(request, env, payload, leadUuid).catch((error) => {
    console.error(JSON.stringify({
      event: 'transport_lead_insert_failed',
      leadUuid,
      message: error && error.message ? error.message : String(error),
    }));
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

  return json({ ok: true, leadId: leadUuid }, { status: 202, headers });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}
