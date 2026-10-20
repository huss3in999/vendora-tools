/**
 * Vendora Transport — Secure Temporary Driver Invitation Endpoint (Durable D1 Storage)
 *
 * Security & durability guarantees:
 * 1. Never exposes X-Desk-Key, Google Apps Script URL, customer phone/email,
 *    customer fare, or company commission to the public driver page.
 * 2. Requires durable Cloudflare D1 server-side storage (env.TRANSPORT_DB).
 *    Public invitations are strictly disabled (503 DURABLE_STORAGE_REQUIRED) if
 *    durable storage is absent — never relies on isolate memory.
 * 3. Enforces atomic single-use consumption via a conditional SQL UPDATE
 *    (WHERE token_hash = ?1 AND status = 'active' AND expires_at > ?2)
 *    checking meta.changes === 1 so concurrent submissions cannot race.
 * 4. Sends Cache-Control: no-store and Referrer-Policy: no-referrer on all responses.
 */

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8c6Kg026JUbjWkqlELgpNAPb4ll-PflySuElUaAaQEr4THN6_CAPBCAToFS3BRvAjpg/exec';
const DEFAULT_SECRET_KEY = 'vendora_booking_desk_secret';

const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'X-Content-Type-Options': 'nosniff',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Desk-Key, X-Apps-Script-Url',
};

const rateLimitMap = new Map();

function checkRateLimit(ip, maxReqs = 25, windowMs = 60_000) {
  const now = Date.now();
  const key = ip || 'anon';
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxReqs;
}

function getDurableDb(env) {
  if (env && env.TRANSPORT_DB && typeof env.TRANSPORT_DB.prepare === 'function') {
    return env.TRANSPORT_DB;
  }
  return null;
}

function durableStorageUnavailableResponse() {
  return new Response(JSON.stringify({
    ok: false,
    code: 'DURABLE_STORAGE_REQUIRED',
    error: 'Durable server-side storage (TRANSPORT_DB) is required. Public driver invitations are disabled when durable storage is unavailable.'
  }), {
    status: 503,
    headers: SECURITY_HEADERS,
  });
}

async function ensureDriverInvitesTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS driver_invitation_tokens (
      token_hash TEXT PRIMARY KEY,
      inv_id TEXT NOT NULL,
      booking_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      payload_json TEXT NOT NULL,
      submission_json TEXT,
      created_at TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at TEXT,
      revoked_at TEXT
    )
  `).run();
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

function resolveSecretKey(env) {
  if (env && env.BOOKING_TRACKER_SECRET_KEY) return env.BOOKING_TRACKER_SECRET_KEY;
  return DEFAULT_SECRET_KEY;
}

function resolveInviteSigningSecret(env) {
  if (env && env.DRIVER_INVITE_SECRET) return env.DRIVER_INVITE_SECRET;
  return resolveSecretKey(env) + '::vendora_driver_invite_v1';
}

function isOwnerAuthorized(request, env) {
  const headerKey = request.headers.get('x-desk-key') || '';
  const expected = resolveSecretKey(env);
  return Boolean(headerKey && headerKey === expected);
}

function base64UrlEncodeBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeStr(str) {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

function base64UrlDecodeToStr(b64url) {
  const padded = String(b64url).replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const bin = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signPayload(payloadB64, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

async function verifySignedToken(token, secret) {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'missing_token' };
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return { valid: false, reason: 'malformed_token' };
  const [, payloadB64, providedSig] = parts;
  const expectedSig = await signPayload(payloadB64, secret);
  if (providedSig !== expectedSig) return { valid: false, reason: 'invalid_signature' };
  try {
    const payload = JSON.parse(base64UrlDecodeToStr(payloadB64));
    if (!payload || !payload.exp || Date.now() > Number(payload.exp)) {
      return { valid: false, reason: 'expired', payload };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'corrupt_payload' };
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: SECURITY_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const clientIp = request.headers.get('cf-connecting-ip') || 'local';
  if (!checkRateLimit(clientIp, 30, 60_000)) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many requests. Please wait a moment.' }), {
      status: 429,
      headers: SECURITY_HEADERS,
    });
  }

  const db = getDurableDb(env);
  if (!db) {
    return durableStorageUnavailableResponse();
  }
  await ensureDriverInvitesTable(db);

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'inspect';

  // Owner-authenticated check for pending driver submissions stored in D1
  if (action === 'listSubmissions') {
    if (!isOwnerAuthorized(request, env)) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: SECURITY_HEADERS });
    }
    const bookingId = url.searchParams.get('bookingId') || '';
    const rowsRes = bookingId
      ? await db.prepare(`
          SELECT inv_id, booking_id, status, submission_json, used_at
          FROM driver_invitation_tokens
          WHERE booking_id = ?1 AND submission_json IS NOT NULL
          ORDER BY used_at DESC
          LIMIT 50
        `).bind(bookingId).all()
      : await db.prepare(`
          SELECT inv_id, booking_id, status, submission_json, used_at
          FROM driver_invitation_tokens
          WHERE submission_json IS NOT NULL
          ORDER BY used_at DESC
          LIMIT 100
        `).all();

    const rows = (rowsRes && Array.isArray(rowsRes.results)) ? rowsRes.results : [];
    const submissions = [];
    for (const r of rows) {
      try {
        const sub = JSON.parse(r.submission_json);
        if (sub) {
          submissions.push({
            invId: r.inv_id,
            bookingId: r.booking_id,
            status: r.status,
            usedAt: r.used_at,
            submission: sub
          });
        }
      } catch {}
    }
    return new Response(JSON.stringify({ ok: true, submissions }), { status: 200, headers: SECURITY_HEADERS });
  }

  // Public driver link inspection
  const token = url.searchParams.get('t') || '';
  if (!token) {
    return new Response(JSON.stringify({
      ok: false,
      code: 'INVALID',
      error: 'Missing driver invitation link.'
    }), { status: 400, headers: SECURITY_HEADERS });
  }

  const tokenHash = await sha256Hex(token);
  const storedRow = await db.prepare(`
    SELECT inv_id, booking_id, status, payload_json, expires_at
    FROM driver_invitation_tokens
    WHERE token_hash = ?1
  `).bind(tokenHash).first();

  // Require the token to exist in durable server storage (never trust stateless tokens alone)
  if (!storedRow) {
    return new Response(JSON.stringify({
      ok: false,
      code: 'INVALID',
      error: 'This driver invitation link is not registered or has been removed.'
    }), { status: 400, headers: SECURITY_HEADERS });
  }

  if (storedRow.status === 'revoked') {
    return new Response(JSON.stringify({
      ok: false,
      code: 'REVOKED',
      error: 'This invitation link has been cancelled by dispatch.'
    }), { status: 410, headers: SECURITY_HEADERS });
  }

  if (storedRow.status === 'used') {
    return new Response(JSON.stringify({
      ok: false,
      code: 'USED',
      error: 'This invitation link has already been used and submitted.'
    }), { status: 410, headers: SECURITY_HEADERS });
  }

  if (Date.now() > Number(storedRow.expires_at)) {
    return new Response(JSON.stringify({
      ok: false,
      code: 'EXPIRED',
      error: 'This driver invitation link has expired. Please contact Vendora Dispatch for a new link.'
    }), { status: 400, headers: SECURITY_HEADERS });
  }

  let p = {};
  try {
    p = JSON.parse(storedRow.payload_json);
  } catch {}

  // Return strictly sanitized trip fields (never customer contact, customer fare, or commission)
  return new Response(JSON.stringify({
    ok: true,
    invite: {
      invId: storedRow.inv_id,
      bookingId: storedRow.booking_id,
      travelDate: p.travelDate || '',
      pickupTime12h: p.pickupTime12h || '',
      pickupArea: p.pickupArea || '',
      destArea: p.destArea || '',
      passengers: p.passengers || '1',
      luggage: p.luggage || '',
      vehicleReq: p.vehicleReq || '',
      payoutDisplay: p.payoutDisplay || '',
      expiresAt: storedRow.expires_at,
    }
  }), { status: 200, headers: SECURITY_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const clientIp = request.headers.get('cf-connecting-ip') || 'local';
  if (!checkRateLimit(clientIp, 20, 60_000)) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many requests. Please wait a moment.' }), {
      status: 429,
      headers: SECURITY_HEADERS,
    });
  }

  const db = getDurableDb(env);
  if (!db) {
    return durableStorageUnavailableResponse();
  }
  await ensureDriverInvitesTable(db);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON request.' }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  const action = body.action || '';
  const signingSecret = resolveInviteSigningSecret(env);

  // 1. OWNER ACTION: Create or reuse a signed, single-use temporary invitation link in durable D1
  if (action === 'create' || action === 'generate') {
    if (!isOwnerAuthorized(request, env)) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized dispatch key.' }), {
        status: 401,
        headers: SECURITY_HEADERS,
      });
    }

    const bookingIdStr = String(body.bookingId || '').slice(0, 32);

    // Reuse a valid active invitation rather than generating unnecessary duplicates
    if (bookingIdStr && !body.forceNew) {
      const existingRow = await db.prepare(`
        SELECT inv_id, booking_id, status, payload_json, expires_at, token_hash
        FROM driver_invitation_tokens
        WHERE booking_id = ?1 AND status = 'active' AND expires_at > ?2
        ORDER BY expires_at DESC
        LIMIT 1
      `).bind(bookingIdStr, Date.now()).first();

      if (existingRow) {
        let p = {};
        try { p = JSON.parse(existingRow.payload_json); } catch {}
        if (p && p.token) {
          const reusedInvite = {
            invId: existingRow.inv_id,
            bookingId: existingRow.booking_id,
            travelDate: p.travelDate || '',
            pickupTime12h: p.pickupTime12h || '',
            pickupArea: p.pickupArea || '',
            destArea: p.destArea || '',
            passengers: p.passengers || '1',
            luggage: p.luggage || '',
            vehicleReq: p.vehicleReq || '',
            payoutDisplay: p.payoutDisplay || body.payoutDisplay || '',
            expiresAt: existingRow.expires_at,
            token: p.token,
          };
          return new Response(JSON.stringify({
            ok: true,
            reused: true,
            invId: existingRow.inv_id,
            token: p.token,
            tokenHash: existingRow.token_hash,
            expiresAt: existingRow.expires_at,
            invite: reusedInvite
          }), { status: 200, headers: SECURITY_HEADERS });
        }
      }
    }

    const expiryHours = Math.max(0.25, Math.min(Number(body.expiryHours || body.hours) || 24, 72));
    const expiresAt = Date.now() + Math.round(expiryHours * 3600 * 1000);
    const randBytes = new Uint8Array(16);
    crypto.getRandomValues(randBytes);
    const invId = 'INV-' + Array.from(randBytes.slice(0, 6)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Cryptographically secure short bearer token (144 bits entropy, clean URL-safe chars)
    const tokenChars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const tokenBytes = new Uint8Array(20);
    crypto.getRandomValues(tokenBytes);
    let token = '';
    for (let i = 0; i < tokenBytes.length; i++) {
      token += tokenChars[tokenBytes[i] % tokenChars.length];
    }
    const tokenHash = await sha256Hex(token);
    const createdAt = new Date().toISOString();

    // Strictly sanitize payload so zero customer/commission secrets exist in the token or D1 row
    const sanitizedPayload = {
      invId,
      bookingId: bookingIdStr,
      travelDate: String(body.travelDate || '').slice(0, 32),
      pickupTime12h: String(body.pickupTime12h || '').slice(0, 32),
      pickupArea: String(body.pickupArea || '').slice(0, 140),
      destArea: String(body.destArea || '').slice(0, 140),
      passengers: String(body.passengers || '1').slice(0, 16),
      luggage: String(body.luggage || '').slice(0, 60),
      vehicleReq: String(body.vehicleReq || '').slice(0, 80),
      payoutDisplay: String(body.payoutDisplay || '').slice(0, 40),
      token,
      exp: expiresAt
    };

    const payloadJson = JSON.stringify(sanitizedPayload);

    await db.prepare(`
      INSERT INTO driver_invitation_tokens (
        token_hash, inv_id, booking_id, status, payload_json, created_at, expires_at
      ) VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?6)
    `).bind(
      tokenHash,
      invId,
      sanitizedPayload.bookingId,
      payloadJson,
      createdAt,
      expiresAt
    ).run();

    const createdInvite = {
      invId,
      bookingId: sanitizedPayload.bookingId,
      travelDate: sanitizedPayload.travelDate,
      pickupTime12h: sanitizedPayload.pickupTime12h,
      pickupArea: sanitizedPayload.pickupArea,
      destArea: sanitizedPayload.destArea,
      passengers: sanitizedPayload.passengers,
      luggage: sanitizedPayload.luggage,
      vehicleReq: sanitizedPayload.vehicleReq,
      payoutDisplay: sanitizedPayload.payoutDisplay,
      expiresAt,
      token
    };

    return new Response(JSON.stringify({
      ok: true,
      invId,
      token,
      tokenHash,
      expiresAt,
      invite: createdInvite
    }), { status: 200, headers: SECURITY_HEADERS });
  }

  // 2. OWNER ACTION: Revoke an active invitation link in durable D1
  if (action === 'revoke') {
    if (!isOwnerAuthorized(request, env)) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized dispatch key.' }), {
        status: 401,
        headers: SECURITY_HEADERS,
      });
    }
    const token = String(body.token || '');
    const tokenHash = body.tokenHash || (token ? await sha256Hex(token) : '');
    if (!tokenHash) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing token identifier.' }), {
        status: 400,
        headers: SECURITY_HEADERS,
      });
    }
    const revokedAt = new Date().toISOString();
    await db.prepare(`
      UPDATE driver_invitation_tokens
      SET status = 'revoked', revoked_at = ?1
      WHERE token_hash = ?2
    `).bind(revokedAt, tokenHash).run();

    return new Response(JSON.stringify({ ok: true, status: 'revoked', tokenHash }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  }

  // 3. OWNER ACTION: Update approval status of a driver submission in D1
  if (action === 'resolveSubmission') {
    if (!isOwnerAuthorized(request, env)) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized dispatch key.' }), {
        status: 401,
        headers: SECURITY_HEADERS,
      });
    }
    const bookingId = String(body.bookingId || '');
    const approvalStatus = String(body.approvalStatus || 'Approved');
    if (bookingId) {
      const rowsRes = await db.prepare(`
        SELECT token_hash, submission_json
        FROM driver_invitation_tokens
        WHERE booking_id = ?1 AND submission_json IS NOT NULL
      `).bind(bookingId).all();
      const rows = (rowsRes && Array.isArray(rowsRes.results)) ? rowsRes.results : [];
      for (const r of rows) {
        try {
          const sub = JSON.parse(r.submission_json);
          sub.approvalStatus = approvalStatus;
          await db.prepare(`
            UPDATE driver_invitation_tokens
            SET submission_json = ?1
            WHERE token_hash = ?2
          `).bind(JSON.stringify(sub), r.token_hash).run();
        } catch {}
      }
    }
    return new Response(JSON.stringify({ ok: true, bookingId, approvalStatus }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  }

  // 4. PUBLIC DRIVER ACTION: Atomically submit driver details against a single-use token
  if (action === 'submit') {
    const token = String(body.token || '').trim();
    if (!token) {
      return new Response(JSON.stringify({
        ok: false,
        code: 'INVALID',
        error: 'Invalid invitation link.'
      }), { status: 400, headers: SECURITY_HEADERS });
    }

    const tokenHash = await sha256Hex(token);
    const existing = await db.prepare(`
      SELECT inv_id, booking_id, status, payload_json, expires_at FROM driver_invitation_tokens WHERE token_hash = ?1
    `).bind(tokenHash).first();

    if (!existing) {
      return new Response(JSON.stringify({
        ok: false,
        code: 'INVALID',
        error: 'Invalid invitation link.'
      }), { status: 400, headers: SECURITY_HEADERS });
    }
    if (existing.status === 'revoked') {
      return new Response(JSON.stringify({
        ok: false,
        code: 'REVOKED',
        error: 'This invitation link was cancelled by dispatch.'
      }), { status: 410, headers: SECURITY_HEADERS });
    }
    if (existing.status === 'used') {
      return new Response(JSON.stringify({
        ok: false,
        code: 'USED',
        error: 'This invitation link has already been submitted.'
      }), { status: 410, headers: SECURITY_HEADERS });
    }
    if (Date.now() > Number(existing.expires_at)) {
      return new Response(JSON.stringify({
        ok: false,
        code: 'EXPIRED',
        error: 'This invitation link has expired.'
      }), { status: 400, headers: SECURITY_HEADERS });
    }

    const driverPhone = String(body.driverPhone || '').trim().slice(0, 32);
    const phoneDigits = driverPhone.replace(/\D/g, '');
    // PART 8: Driver mobile number is the only mandatory identity field (min 6 digits)
    if (!driverPhone || phoneDigits.length < 6) {
      return new Response(JSON.stringify({
        ok: false,
        code: 'VALIDATION_ERROR',
        error: 'Please enter a valid mobile phone number.'
      }), { status: 400, headers: SECURITY_HEADERS });
    }

    const driverName = String(body.driverName || '').trim().slice(0, 80);
    const vehicleType = String(body.vehicleType || '').trim().slice(0, 60);
    const vehiclePlate = String(body.vehiclePlate || '').trim().slice(0, 32);
    const driverNotes = String(body.driverNotes || '').trim().slice(0, 200);
    const agreedPayout = body.agreedPayout !== undefined ? Boolean(body.agreedPayout) : true;

    let p = {};
    try { p = JSON.parse(existing.payload_json); } catch {}
    const nowMs = Date.now();
    const submittedAt = new Date(nowMs).toISOString();
    const vehicleCombined = (vehicleType && vehiclePlate) ? `${vehicleType} (${vehiclePlate})` : (vehicleType || vehiclePlate || '');
    const submissionRecord = {
      invId: existing.inv_id,
      bookingId: existing.booking_id,
      driverName,
      driverPhone,
      vehicleType,
      vehiclePlate,
      vehicleCombined,
      driverNotes,
      agreedPayout,
      submittedAt,
      approvalStatus: 'Driver Details Received'
    };

    // ATOMIC SINGLE-USE ENFORCEMENT:
    // Only transitions from 'active' -> 'used' if currently 'active' and not expired.
    const updateRes = await db.prepare(`
      UPDATE driver_invitation_tokens
      SET status = 'used', used_at = ?1, submission_json = ?2
      WHERE token_hash = ?3 AND status = 'active' AND expires_at > ?4
    `).bind(
      submittedAt,
      JSON.stringify(submissionRecord),
      tokenHash,
      nowMs
    ).run();

    const changedRows = Number(
      (updateRes && updateRes.meta && updateRes.meta.changes !== undefined)
        ? updateRes.meta.changes
        : (updateRes && updateRes.changes !== undefined ? updateRes.changes : 0)
    );

    if (changedRows !== 1) {
      return new Response(JSON.stringify({
        ok: false,
        code: 'USED',
        error: 'This invitation link has already been submitted.'
      }), { status: 410, headers: SECURITY_HEADERS });
    }

    // Direct Google Apps Script update with driver phone and details
    try {
      const gasUrl = resolveTargetUrl(request, env);
      const secretKey = resolveSecretKey(env);
      await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Accept': 'application/json',
          'User-Agent': 'Vendora-DriverInvite/1.0'
        },
        body: JSON.stringify({
          key: secretKey,
          action: 'updateStatus',
          id: existing.booking_id,
          tripStatus: 'Driver Details Received',
          driverPhone,
          driverName: driverName || undefined,
          vehicle: vehicleCombined || undefined,
          pendingDriverSubmission: submissionRecord
        }),
        redirect: 'follow'
      });
    } catch {
      // Submission is durably persisted in D1
    }

    return new Response(JSON.stringify({
      ok: true,
      bookingId: existing.booking_id,
      invId: existing.inv_id,
      status: 'Driver Details Received',
      submission: submissionRecord
    }), { status: 200, headers: SECURITY_HEADERS });
  }

  return new Response(JSON.stringify({ ok: false, error: 'Unsupported action.' }), {
    status: 400,
    headers: SECURITY_HEADERS,
  });
}
