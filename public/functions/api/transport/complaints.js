import { corsHeaders } from './passenger-care.js';
import { checkRateLimit, rateLimitResponse } from './rate-limit.js';

const MAX_BODY_BYTES = 4096;
const PHONE_RE = /^[\d\s+\-()]{7,20}$/;

const CATEGORIES = new Set([
  'driver_conduct',
  'vehicle_condition',
  'delay',
  'pickup_problem',
  'booking_issue',
  'payment_issue',
  'luggage_issue',
  'customer_service',
  'border_route',
  'other',
]);

const STATUSES = new Set([
  'new',
  'reviewing',
  'responded',
  'closed',
]);

let schemaReady = false;

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

function cleanText(value, maxLength = 500) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function generateComplaintRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 6);
  return `CMP-${hex}`;
}

async function hashIp(request) {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '';
  if (!ip) return null;
  const data = new TextEncoder().encode(`vendora-complaint:${ip}`);
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

export async function ensureComplaintsSchema(env) {
  if (schemaReady || !env.TRANSPORT_DB) return;

  await env.TRANSPORT_DB.prepare(`
    CREATE TABLE IF NOT EXISTS transport_complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_ref TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      booking_ref TEXT,
      journey_route TEXT,
      journey_date TEXT,
      category TEXT NOT NULL,
      details TEXT NOT NULL,
      contact_preference TEXT DEFAULT 'whatsapp',
      contact_permission INTEGER DEFAULT 1,
      status TEXT DEFAULT 'new',
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ip_hash TEXT,
      user_agent TEXT
    )
  `).run();

  await env.TRANSPORT_DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tc_complaint_ref ON transport_complaints(complaint_ref)
  `).run();

  await env.TRANSPORT_DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tc_status ON transport_complaints(status, created_at DESC)
  `).run();

  schemaReady = true;
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);

  const rate = checkRateLimit(request, 'complaint-submit', { limit: 5, windowMs: 600_000 });
  if (!rate.ok) return rateLimitResponse(rate, headers);

  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: 'Database binding missing' }, { status: 500, headers });
  }

  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: 'Invalid JSON payload' }, { status: 400, headers });
  }

  const customerName = cleanText(payload.customer_name || payload.customerName, 100);
  const customerPhone = cleanText(payload.customer_phone || payload.customerPhone, 30);
  const customerEmail = cleanText(payload.customer_email || payload.customerEmail, 120);
  const bookingRef = cleanText(payload.booking_ref || payload.bookingRef, 30);
  const journeyRoute = cleanText(payload.journey_route || payload.journeyRoute, 150);
  const journeyDate = cleanText(payload.journey_date || payload.journeyDate, 30);
  const category = cleanText(payload.category, 40);
  const details = cleanText(payload.details, 2000);
  const contactPreference = cleanText(payload.contact_preference || payload.contactPreference, 20) || 'whatsapp';
  const contactPermission = payload.contact_permission !== false && payload.contactPermission !== false ? 1 : 0;
  const privacyConsent = payload.privacy_consent === true || payload.privacyConsent === true || payload.privacy_consent === '1';

  if (!customerName) {
    return json({ ok: false, error: 'Customer name is required' }, { status: 400, headers });
  }
  if (!customerPhone || !PHONE_RE.test(customerPhone)) {
    return json({ ok: false, error: 'Valid telephone or WhatsApp number is required' }, { status: 400, headers });
  }
  if (!category || !CATEGORIES.has(category)) {
    return json({ ok: false, error: 'Valid complaint category is required' }, { status: 400, headers });
  }
  if (!details || details.length < 10) {
    return json({ ok: false, error: 'Complaint details must be at least 10 characters long' }, { status: 400, headers });
  }
  if (!privacyConsent) {
    return json({ ok: false, error: 'Privacy consent is required' }, { status: 400, headers });
  }

  try {
    await ensureComplaintsSchema(env);

    let complaintRef = generateComplaintRef();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await env.TRANSPORT_DB.prepare('SELECT id FROM transport_complaints WHERE complaint_ref = ?').bind(complaintRef).first();
      if (!existing) break;
      complaintRef = generateComplaintRef();
      attempts++;
    }

    const now = new Date().toISOString();

    await env.TRANSPORT_DB.prepare(`
      INSERT INTO transport_complaints (
        complaint_ref,
        customer_name,
        customer_phone,
        customer_email,
        booking_ref,
        journey_route,
        journey_date,
        category,
        details,
        contact_preference,
        contact_permission,
        status,
        created_at,
        updated_at,
        ip_hash,
        user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)
    `).bind(
      complaintRef,
      customerName,
      customerPhone,
      customerEmail || null,
      bookingRef ? bookingRef.toUpperCase() : null,
      journeyRoute || null,
      journeyDate || null,
      category,
      details,
      contactPreference,
      contactPermission,
      now,
      now,
      await hashIp(request),
      cleanText(request.headers.get('user-agent'), 600),
    ).run();

    return json({
      ok: true,
      complaint_ref: complaintRef,
      message: 'Complaint submitted successfully',
    }, { status: 201, headers });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'complaint_submit_failed',
      message: error && error.message ? error.message : String(error),
    }));
    return json({ ok: false, error: 'Failed to submit complaint' }, { status: 500, headers });
  }
}

export async function getComplaintsAdminRows(env, request) {
  await ensureComplaintsSchema(env);
  const url = new URL(request.url);
  const statusFilter = cleanText(url.searchParams.get('status'), 30);
  const search = cleanText(url.searchParams.get('search'), 120);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);

  let whereClauses = [];
  let bindings = [];

  if (statusFilter && STATUSES.has(statusFilter)) {
    whereClauses.push('status = ?');
    bindings.push(statusFilter);
  }

  if (search) {
    whereClauses.push(`(
      complaint_ref LIKE ?
      OR customer_name LIKE ?
      OR customer_phone LIKE ?
      OR booking_ref LIKE ?
      OR journey_route LIKE ?
      OR category LIKE ?
      OR details LIKE ?
    )`);
    const like = `%${search}%`;
    bindings.push(like, like, like, like, like, like, like);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT
      id,
      complaint_ref,
      customer_name,
      customer_phone,
      customer_email,
      booking_ref,
      journey_route,
      journey_date,
      category,
      details,
      contact_preference,
      contact_permission,
      status,
      admin_notes,
      created_at,
      updated_at
    FROM transport_complaints
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(...bindings, limit).all();

  return { complaints: results || [] };
}

export async function updateComplaintStatus(env, payload) {
  await ensureComplaintsSchema(env);
  const complaintRef = cleanText(payload.complaint_ref || payload.complaintRef, 30);
  const status = cleanText(payload.status, 30);
  const adminNotes = cleanText(payload.admin_notes || payload.adminNotes, 1000);

  if (!complaintRef) return { ok: false, error: 'complaint_ref is required', status: 400 };
  if (!status || !STATUSES.has(status)) return { ok: false, error: 'Valid status (new, reviewing, responded, closed) is required', status: 400 };

  const now = new Date().toISOString();

  const result = await env.TRANSPORT_DB.prepare(`
    UPDATE transport_complaints
    SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ?
    WHERE complaint_ref = ?
  `).bind(status, adminNotes, now, complaintRef.toUpperCase()).run();

  if (!result.meta?.changes) {
    return { ok: false, error: 'Complaint not found', status: 404 };
  }

  return { ok: true, complaint_ref: complaintRef, status, updated_at: now };
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}
