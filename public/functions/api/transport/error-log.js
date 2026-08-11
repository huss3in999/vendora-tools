import { checkRateLimit, rateLimitResponse } from './rate-limit.js';

/**
 * Shared transport error log.
 *
 * - Server code (admin API, lead API, the Worker entry) calls `recordError`
 *   so backend failures are captured even when a response still succeeds.
 * - The browser (site pages + admin dashboard) POSTs to `/api/transport/log`
 *   so client-side crashes — including admin page errors — are captured too.
 * - The admin dashboard reads/clears this table through the admin API
 *   (`?resource=errors`) so the list stays behind the admin token.
 */

const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'null',
]);

const MAX_BODY_BYTES = 8192;
const MAX_ERROR_ROWS = 2000;

let errorSchemaReady = false;

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

function clip(value, maxLength) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : null;
}

function clipRaw(value, maxLength) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text ? text.slice(0, maxLength) : null;
}

export async function ensureErrorSchema(env) {
  if (errorSchemaReady || !env || !env.TRANSPORT_DB) return;
  await env.TRANSPORT_DB.prepare(`
    CREATE TABLE IF NOT EXISTS transport_error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      source TEXT,
      severity TEXT DEFAULT 'error',
      message TEXT,
      stack TEXT,
      page_url TEXT,
      page_path TEXT,
      user_agent TEXT,
      ip_address TEXT,
      cf_country TEXT,
      context TEXT
    )
  `).run();
  errorSchemaReady = true;
}

/**
 * Best-effort error recorder. Never throws — logging must not break a request.
 */
export async function recordError(env, entry = {}) {
  try {
    if (!env || !env.TRANSPORT_DB) return;
    await ensureErrorSchema(env);
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO transport_error_log (
        source, severity, message, stack, page_url, page_path, user_agent, ip_address, cf_country, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clip(entry.source, 80) || 'unknown',
      clip(entry.severity, 20) || 'error',
      clip(entry.message, 1000) || 'Unknown error',
      clipRaw(entry.stack, 4000),
      clip(entry.pageUrl, 1000),
      clip(entry.pagePath, 400),
      clip(entry.userAgent, 600),
      clip(entry.ipAddress, 80),
      clip(entry.country, 8),
      clipRaw(entry.context, 2000),
    ).run();

    // Keep the table small so it can never grow unbounded.
    await env.TRANSPORT_DB.prepare(`
      DELETE FROM transport_error_log
      WHERE id NOT IN (
        SELECT id FROM transport_error_log ORDER BY id DESC LIMIT ?
      )
    `).bind(MAX_ERROR_ROWS).run();
  } catch (loggingError) {
    console.error(JSON.stringify({
      event: 'transport_error_log_failed',
      message: loggingError && loggingError.message ? loggingError.message : String(loggingError),
    }));
  }
}

async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('Payload too large');
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error('Payload too large');
  if (!body.trim()) return {};
  return JSON.parse(body);
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env, ctx } = context;
  const headers = corsHeaders(request);
  const rate = checkRateLimit(request, 'transport-error-log', { limit: 20, windowMs: 60_000 });
  if (!rate.ok) return rateLimitResponse(rate, headers);

  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: 'Invalid error payload' }, { status: 400, headers });
  }

  const cf = request.cf || {};
  const entry = {
    source: payload.source || 'client',
    severity: payload.severity || 'error',
    message: payload.message,
    stack: payload.stack,
    pageUrl: payload.pageUrl,
    pagePath: payload.pagePath,
    userAgent: clip(request.headers.get('user-agent'), 600),
    // Raw IP is not retained in diagnostic logs. The country code is enough
    // for operational triage and rate limiting remains request-local.
    ipAddress: null,
    country: cf.country || request.headers.get('cf-ipcountry') || null,
    context: typeof payload.context === 'string' ? payload.context : JSON.stringify(payload.context || {}),
  };

  const write = recordError(env, entry);
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(write);
  } else if (typeof context.waitUntil === 'function') {
    context.waitUntil(write);
  } else {
    await write;
  }

  return json({ ok: true }, { status: 202, headers });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}
