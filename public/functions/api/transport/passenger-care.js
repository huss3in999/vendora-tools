const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
  'null',
]);

const MAX_BODY_BYTES = 4096;
const BOOKING_REF_RE = /^GCC-[A-F0-9]{8}$/i;
const OUTCOMES = new Set([
  'completed',
  'cancelled',
  'no_driver',
  'no_response',
  'price_high',
  'other_transport',
]);

const STUB_ROUTE_SLUGS = new Set(['passenger-care', 'passenger-care-stub']);
const NON_CLICK_SERVICE_TYPES = new Set(['pageview', 'passenger-care-pageview', 'passenger-care-stub']);

function isRealWhatsAppLead(row) {
  if (!row) return false;
  const serviceType = String(row.service_type || '').toLowerCase();
  const routeSlug = String(row.route_slug || '').toLowerCase();
  if (NON_CLICK_SERVICE_TYPES.has(serviceType)) return false;
  if (STUB_ROUTE_SLUGS.has(routeSlug)) return false;
  return true;
}

function leadUuidFromBookingRef(bookingRef) {
  const hex = String(bookingRef || '').replace(/^GCC-/i, '').toLowerCase().padEnd(12, '0').slice(0, 12);
  return `${hex.slice(0, 8)}-0000-4000-8000-${hex.slice(0, 12)}`;
}

let schemaReady = false;

export function makeBookingRef(leadUuid) {
  const hex = String(leadUuid || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  return hex ? `GCC-${hex}` : null;
}

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
    'access-control-allow-methods': 'GET, POST, OPTIONS',
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

function cleanPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100000) return null;
  return Math.round(number * 1000) / 1000;
}

function cleanRating(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function normalizeBookingRef(value) {
  const text = cleanText(value, 20);
  if (!text) return null;
  const normalized = text.toUpperCase();
  return BOOKING_REF_RE.test(normalized) ? normalized : null;
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
    city: cleanText(cf.city, 120) || cleanText(request.headers.get('x-vercel-ip-city'), 120),
    country: normalizeCountryCode(cf.country)
      || normalizeCountryCode(request.headers.get('cf-ipcountry'))
      || normalizeCountryCode(request.headers.get('CF-IPCountry')),
  };
}

async function hashIp(request) {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '';
  if (!ip) return null;
  const data = new TextEncoder().encode(`vendora-passenger-care:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('Payload too large');
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error('Payload too large');
  if (!body.trim()) return {};
  return JSON.parse(body);
}

export async function ensurePassengerCareSchema(env) {
  if (schemaReady || !env.TRANSPORT_DB) return;

  const table = await env.TRANSPORT_DB.prepare('PRAGMA table_info(whatsapp_leads)').all();
  const existing = new Set((table.results || []).map((row) => row.name));
  if (!existing.has('booking_ref')) {
    await env.TRANSPORT_DB.prepare('ALTER TABLE whatsapp_leads ADD COLUMN booking_ref TEXT').run();
    await env.TRANSPORT_DB.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_leads_booking_ref
      ON whatsapp_leads(booking_ref)
    `).run();
  }

  await env.TRANSPORT_DB.prepare(`
    CREATE TABLE IF NOT EXISTS passenger_care_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_uuid TEXT NOT NULL,
      booking_ref TEXT NOT NULL,
      outcome TEXT NOT NULL,
      rating INTEGER,
      comment TEXT,
      quoted_price REAL,
      paid_price REAL,
      language TEXT,
      submitted_at TEXT NOT NULL,
      country TEXT,
      city TEXT,
      ip_hash TEXT,
      user_agent TEXT,
      UNIQUE(lead_uuid),
      UNIQUE(booking_ref)
    )
  `).run();

  await env.TRANSPORT_DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_pcf_booking_ref ON passenger_care_feedback(booking_ref)
  `).run();
  await env.TRANSPORT_DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_pcf_submitted_at ON passenger_care_feedback(submitted_at)
  `).run();

  schemaReady = true;
}

async function findLeadByBookingRef(env, bookingRef) {
  let lead = await env.TRANSPORT_DB.prepare(`
    SELECT lead_uuid, booking_ref, route_slug, route_label, page_path, language, clicked_at, cf_country, cf_city, service_type
    FROM whatsapp_leads
    WHERE booking_ref = ?
      AND COALESCE(service_type, '') NOT IN ('pageview', 'passenger-care-pageview', 'passenger-care-stub')
      AND COALESCE(route_slug, '') NOT IN ('passenger-care', 'passenger-care-stub')
    ORDER BY clicked_at ASC
    LIMIT 1
  `).bind(bookingRef).first();

  if (lead) return lead;

  const hex = bookingRef.replace(/^GCC-/i, '').toLowerCase();
  if (!/^[a-f0-9]{8}$/.test(hex)) return null;

  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT lead_uuid, booking_ref, route_slug, route_label, page_path, language, clicked_at, cf_country, cf_city, service_type
    FROM whatsapp_leads
    WHERE lower(replace(lead_uuid, '-', '')) LIKE ?
      AND COALESCE(service_type, '') NOT IN ('pageview', 'passenger-care-pageview', 'passenger-care-stub')
      AND COALESCE(route_slug, '') NOT IN ('passenger-care', 'passenger-care-stub')
    ORDER BY clicked_at ASC
    LIMIT 5
  `).bind(`${hex}%`).all();

  const match = (results || []).find((row) => isRealWhatsAppLead(row)) || (results || [])[0];
  if (!match) return null;

  if (!match.booking_ref) {
    const generatedRef = makeBookingRef(match.lead_uuid);
    await env.TRANSPORT_DB.prepare(`
      UPDATE whatsapp_leads SET booking_ref = ? WHERE lead_uuid = ? AND (booking_ref IS NULL OR booking_ref = '')
    `).bind(generatedRef, match.lead_uuid).run();
    match.booking_ref = generatedRef;
  }

  return match;
}

async function findFeedbackByBookingRef(env, bookingRef) {
  return env.TRANSPORT_DB.prepare(`
    SELECT booking_ref, outcome, rating, comment, quoted_price, paid_price, language, submitted_at, country, city
    FROM passenger_care_feedback
    WHERE booking_ref = ?
    LIMIT 1
  `).bind(bookingRef).first();
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);

  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: 'Database binding missing' }, { status: 500, headers });
  }

  const bookingRef = normalizeBookingRef(new URL(request.url).searchParams.get('ref'));
  if (!bookingRef) {
    return json({ ok: false, error: 'Invalid booking reference' }, { status: 400, headers });
  }

  try {
    await ensurePassengerCareSchema(env);
    const lead = await findLeadByBookingRef(env, bookingRef);
    const feedback = await findFeedbackByBookingRef(env, bookingRef);

    if (!lead) {
      return json({
        ok: true,
        booking_ref: bookingRef,
        route_label: '',
        page_path: '',
        language: 'ar',
        clicked_at: '',
        already_submitted: Boolean(feedback),
        provisional: true,
      }, { headers });
    }

    return json({
      ok: true,
      booking_ref: bookingRef,
      route_label: lead.route_label || lead.route_slug || '',
      page_path: lead.page_path || '',
      language: lead.language || 'ar',
      clicked_at: lead.clicked_at || '',
      already_submitted: Boolean(feedback),
      feedback: feedback ? {
        outcome: feedback.outcome,
        rating: feedback.rating,
        submitted_at: feedback.submitted_at,
      } : null,
    }, { headers });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'passenger_care_get_failed',
      message: error && error.message ? error.message : String(error),
    }));
    return json({ ok: false, error: 'Failed to load booking' }, { status: 500, headers });
  }
}

async function resolveLeadForFeedback(env, bookingRef) {
  const lead = await findLeadByBookingRef(env, bookingRef);
  if (lead) return lead;

  return {
    lead_uuid: leadUuidFromBookingRef(bookingRef),
    booking_ref: bookingRef,
    route_slug: '',
    route_label: '',
    page_path: '',
    language: 'ar',
    clicked_at: '',
    cf_country: null,
    cf_city: null,
  };
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

  const bookingRef = normalizeBookingRef(payload.ref || payload.booking_ref);
  const outcome = cleanText(payload.outcome, 40);
  if (!bookingRef || !outcome || !OUTCOMES.has(outcome)) {
    return json({ ok: false, error: 'Invalid booking reference or outcome' }, { status: 400, headers });
  }

  try {
    await ensurePassengerCareSchema(env);

    const existing = await findFeedbackByBookingRef(env, bookingRef);
    if (existing) {
      return json({ ok: true, already_submitted: true, booking_ref: bookingRef }, { status: 200, headers });
    }

    const lead = await resolveLeadForFeedback(env, bookingRef);
    if (!lead) {
      return json({ ok: false, error: 'Booking reference not found' }, { status: 404, headers });
    }

    const geo = getRequestGeo(request);
    const submittedAt = new Date().toISOString();
    const language = cleanText(payload.language, 10) || lead.language || 'ar';

    await env.TRANSPORT_DB.prepare(`
      INSERT INTO passenger_care_feedback (
        lead_uuid,
        booking_ref,
        outcome,
        rating,
        comment,
        quoted_price,
        paid_price,
        language,
        submitted_at,
        country,
        city,
        ip_hash,
        user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lead.lead_uuid,
      bookingRef,
      outcome,
      cleanRating(payload.rating),
      cleanText(payload.comment, 1000),
      cleanPrice(payload.quoted_price),
      cleanPrice(payload.paid_price),
      language,
      submittedAt,
      geo.country,
      geo.city || null,
      await hashIp(request),
      cleanText(request.headers.get('user-agent'), 600),
    ).run();

    return json({ ok: true, already_submitted: false, booking_ref: bookingRef }, { status: 201, headers });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (message.toLowerCase().includes('unique')) {
      return json({ ok: true, already_submitted: true, booking_ref: bookingRef }, { status: 200, headers });
    }
    console.error(JSON.stringify({ event: 'passenger_care_post_failed', message }));
    return json({ ok: false, error: 'Failed to save feedback' }, { status: 500, headers });
  }
}

export async function getPassengerCareAdminRows(env, request) {
  await ensurePassengerCareSchema(env);
  const url = new URL(request.url);
  const search = cleanText(url.searchParams.get('search'), 120);
  const ref = normalizeBookingRef(url.searchParams.get('ref') || search);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 1000);

  let whereSql = '';
  const bindings = [];

  if (ref) {
    whereSql = 'WHERE f.booking_ref = ? OR l.booking_ref = ? OR l.lead_uuid LIKE ?';
    bindings.push(ref, ref, `%${search || ref.replace('GCC-', '')}%`);
  } else if (search) {
    whereSql = `WHERE (
      f.booking_ref LIKE ?
      OR l.booking_ref LIKE ?
      OR l.route_label LIKE ?
      OR l.route_slug LIKE ?
      OR l.page_path LIKE ?
      OR f.outcome LIKE ?
      OR f.comment LIKE ?
    )`;
    const like = `%${search}%`;
    bindings.push(like, like, like, like, like, like, like);
  }

  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT
      f.id,
      f.lead_uuid,
      f.booking_ref,
      f.outcome,
      f.rating,
      f.comment,
      f.quoted_price,
      f.paid_price,
      f.language AS feedback_language,
      f.submitted_at AS feedback_submitted_at,
      f.country AS feedback_country,
      f.city AS feedback_city,
      f.user_agent AS feedback_user_agent,
      orig.clicked_at,
      orig.route_slug,
      orig.route_label,
      orig.page_path,
      orig.language AS lead_language,
      orig.cf_country AS lead_country,
      orig.cf_city AS lead_city,
      orig.lead_uuid AS original_lead_uuid
    FROM passenger_care_feedback f
    LEFT JOIN whatsapp_leads orig ON orig.id = (
      SELECT w.id
      FROM whatsapp_leads w
      WHERE w.booking_ref = f.booking_ref
        AND COALESCE(w.service_type, '') NOT IN ('pageview', 'passenger-care-pageview', 'passenger-care-stub')
        AND COALESCE(w.route_slug, '') NOT IN ('passenger-care', 'passenger-care-stub')
      ORDER BY w.clicked_at ASC
      LIMIT 1
    )
    ${whereSql}
    ORDER BY f.submitted_at DESC
    LIMIT ?
  `).bind(...bindings, limit).all();

  return { feedback: results || [] };
}

export async function deletePassengerCareFeedback(env, request) {
  await ensurePassengerCareSchema(env);
  const url = new URL(request.url);
  const bookingRef = normalizeBookingRef(url.searchParams.get('booking_ref') || url.searchParams.get('ref'));
  const id = Number(url.searchParams.get('id') || 0);

  if (!bookingRef && !id) {
    return { ok: false, error: 'booking_ref or id is required', status: 400 };
  }

  const result = id
    ? await env.TRANSPORT_DB.prepare('DELETE FROM passenger_care_feedback WHERE id = ?').bind(id).run()
    : await env.TRANSPORT_DB.prepare('DELETE FROM passenger_care_feedback WHERE booking_ref = ?').bind(bookingRef).run();

  return { ok: true, deleted: result.meta?.changes || 0 };
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'GET') return onRequestGet(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}
