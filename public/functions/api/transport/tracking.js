import { recordError } from './error-log.js';

const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'null',
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
  return Math.max(0, Math.min(100000, Math.round(number)));
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
    city: cleanText(cf.city, 120),
    region: cleanText(cf.region, 120) || cleanText(cf.regionCode, 120),
    country: normalizeCountryCode(cf.country),
    timezone: cleanText(cf.timezone, 80),
  };
}

async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('Payload too large');

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error('Payload too large');
  if (!body.trim()) return {};
  return JSON.parse(body);
}

// Strictly privacy-safe payload sanitizer (redacts AI chat details)
function safePayloadJson(payload) {
  const compact = { ...payload };
  
  // Explicitly delete any potential chat messages, text areas, or input lists
  delete compact.chatMessage;
  delete compact.chatHistory;
  delete compact.inputData;
  
  return JSON.stringify(compact).slice(0, 4000);
}

async function writeEventToDb(request, env, payload, eventId) {
  const geo = getRequestGeo(request);
  const stmt = env.TRANSPORT_DB.prepare(`
    INSERT INTO analytics_events (
      event_id,
      visitor_id,
      session_id,
      created_at,
      page_url,
      page_path,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      event_name,
      event_category,
      event_label,
      route_name,
      button_text,
      target_url,
      language,
      device_type,
      user_agent,
      screen_width,
      screen_height,
      lead_status,
      ip_city,
      ip_region,
      ip_country,
      ip_timezone,
      raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    eventId,
    cleanText(payload.visitor_id, 80) || 'unknown_visitor',
    cleanText(payload.session_id, 120) || 'unknown_session',
    cleanText(payload.created_at, 80) || new Date().toISOString(),
    cleanUrl(payload.page_url),
    cleanText(payload.page_path, 300),
    cleanUrl(payload.referrer),
    cleanText(payload.utm_source, 120),
    cleanText(payload.utm_medium, 120),
    cleanText(payload.utm_campaign, 160),
    cleanText(payload.event_name, 120) || 'unknown_event',
    cleanText(payload.event_category, 120),
    cleanText(payload.event_label, 120),
    cleanText(payload.route_name, 120),
    cleanText(payload.button_text, 160),
    cleanUrl(payload.target_url),
    cleanText(payload.language, 20),
    cleanText(payload.device_type, 40),
    cleanText(request.headers.get('user-agent'), 600),
    cleanInteger(payload.screen_width),
    cleanInteger(payload.screen_height),
    cleanText(payload.lead_status, 40),
    geo.city,
    geo.region,
    geo.country,
    geo.timezone,
    safePayloadJson(payload)
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

  const eventId = cleanText(payload.event_id, 80) || crypto.randomUUID();
  const dbTask = writeEventToDb(request, env, payload, eventId).catch((error) => {
    console.error(JSON.stringify({
      event: 'tracking_event_insert_failed',
      eventId,
      message: error && error.message ? error.message : String(error),
    }));
    return recordError(env, {
      source: 'tracking-api',
      severity: 'error',
      message: `Tracking insert failed: ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      pageUrl: cleanText(payload.page_url, 1000),
      pagePath: cleanText(payload.page_path, 400),
      context: `eventId=${eventId}`,
    });
  });

  context.waitUntil(dbTask);

  return json({ ok: true, eventId }, { status: 202, headers });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}
