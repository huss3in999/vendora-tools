const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
]);

const MAX_BODY_BYTES = 8192;

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

function getPayloadValue(payload, key, maxLength) {
  return cleanText(payload && payload[key], maxLength);
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
  const cf = request.cf || {};
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
    cleanText(cf.city, 120),
    cleanText(cf.region, 120),
    cleanText(cf.country, 8),
    cleanText(cf.timezone, 80),
    cleanText(request.headers.get('user-agent'), 600),
    cleanText(request.headers.get('cf-ray'), 120),
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
    JSON.stringify(payload).slice(0, 4000),
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

  context.waitUntil(write);

  return json({ ok: true, leadId: leadUuid }, { status: 202, headers });
}

export async function onRequest() {
  return json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}
