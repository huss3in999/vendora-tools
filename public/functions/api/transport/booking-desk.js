/**
 * Vendora Transport Booking Desk API Proxy
 * Bridges getvendora.net with the Google Apps Script booking tracker.
 *
 * Provides private, authenticated access to the Google Sheet backend
 * without CORS or OAuth redirect issues in the browser.
 * Anonymous/unauthenticated requests are strictly rejected with 401 Unauthorized.
 */

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8c6Kg026JUbjWkqlELgpNAPb4ll-PflySuElUaAaQEr4THN6_CAPBCAToFS3BRvAjpg/exec';
const DEFAULT_SECRET_KEY = 'vendora_booking_desk_secret';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Desk-Key, X-Admin-Token, X-Apps-Script-Url',
};

function isAuthorized(request, env) {
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedToken = request.headers.get('x-desk-key')
    || bearer
    || request.headers.get('x-admin-token')
    || '';

  const expectedSecret = (env && env.BOOKING_TRACKER_SECRET_KEY) || DEFAULT_SECRET_KEY;
  const adminToken = env && env.TRANSPORT_ADMIN_TOKEN;

  if (!providedToken) return false;
  if (providedToken === expectedSecret) return true;
  if (adminToken && providedToken === adminToken) return true;
  return false;
}

function resolveTargetUrl(request, env) {
  const customHeader = request.headers.get('x-apps-script-url');
  if (customHeader && customHeader.startsWith('https://script.google.com/')) {
    return customHeader;
  }
  if (env && env.BOOKING_TRACKER_SCRIPT_URL) {
    return env.BOOKING_TRACKER_SCRIPT_URL;
  }
  return DEFAULT_APPS_SCRIPT_URL;
}

function resolveSecretKey(request, env) {
  const headerKey = request.headers.get('x-desk-key');
  if (headerKey) return headerKey;
  if (env && env.BOOKING_TRACKER_SECRET_KEY) return env.BOOKING_TRACKER_SECRET_KEY;
  return DEFAULT_SECRET_KEY;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!isAuthorized(request, env)) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Unauthorized: Valid admin desk credentials required.'
    }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'getBoard';
  const id = url.searchParams.get('id') || '';
  const gasUrl = resolveTargetUrl(request, env);
  const secretKey = resolveSecretKey(request, env);

  const target = new URL(gasUrl);
  target.searchParams.set('action', action);
  target.searchParams.set('key', secretKey);
  if (id) target.searchParams.set('id', id);

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Vendora-BookingDesk/2.0',
      },
      redirect: 'follow',
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Google Apps Script did not return JSON. Please ensure the Apps Script is deployed as a Web App (Execute as: Me, Access: Anyone).',
        details: text.slice(0, 500),
      }), {
        status: 502,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify(data), {
      status: data.ok === false ? 400 : 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Failed to connect to Google Sheets backend: ' + (err.message || String(err)),
    }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!isAuthorized(request, env)) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Unauthorized: Valid admin desk credentials required.'
    }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const gasUrl = resolveTargetUrl(request, env);
  const secretKey = resolveSecretKey(request, env);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON request payload.' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  body.key = body.key || secretKey;

  try {
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Accept': 'application/json',
        'User-Agent': 'Vendora-BookingDesk/2.0',
      },
      redirect: 'follow',
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Google Apps Script save did not return JSON: ' + text.slice(0, 500),
        details: text.slice(0, 500),
      }), {
        status: 502,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify(data), {
      status: data.ok === false ? 400 : 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Save failed: ' + (err.message || String(err)),
    }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }
}
