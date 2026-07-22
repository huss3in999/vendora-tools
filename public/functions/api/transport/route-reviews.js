import { corsHeaders, ensurePassengerCareSchema, getPublicRouteReviews } from './passenger-care.js';
import { checkRateLimit, rateLimitResponse } from './rate-limit.js';

const MAX_BODY_BYTES = 4096;

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

function cleanRating(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const round = Math.round(num);
  return (round >= 1 && round <= 5) ? round : null;
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

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const rate = checkRateLimit(request, 'route-reviews', { limit: 60, windowMs: 60_000 });
  if (!rate.ok) return rateLimitResponse(rate, headers);

  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: 'Database binding missing' }, { status: 500, headers });
  }

  const url = new URL(request.url);
  const route = url.searchParams.get('route') || '';
  const limitParam = Number(url.searchParams.get('limit') || 10);
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? Math.round(limitParam) : 10));

  try {
    await ensurePassengerCareSchema(env);
    const data = await getPublicRouteReviews(env, route, limit);
    return json({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'route_reviews_get_failed',
      message: error && error.message ? error.message : String(error),
    }));
    return json({ ok: false, error: 'Failed to load route reviews' }, { status: 500, headers });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const rate = checkRateLimit(request, 'review-submit', { limit: 5, windowMs: 600_000 });
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

  const customerName = cleanText(payload.customer_name || payload.customerName, 80);
  const rating = cleanRating(payload.rating);
  const comment = cleanText(payload.comment, 1000);
  const routeSlug = cleanText(payload.route_slug || payload.routeSlug, 100);
  const routeLabel = cleanText(payload.route_label || payload.routeLabel, 150) || routeSlug;
  const bookingRefInput = cleanText(payload.booking_ref || payload.bookingRef, 30);
  const monthYear = cleanText(payload.month_year || payload.monthYear, 30);
  const publishPermission = payload.publish_permission === true || payload.publishPermission === true;
  const privacyConsent = payload.privacy_consent === true || payload.privacyConsent === true;
  const language = cleanText(payload.language, 10) || 'ar';

  if (!customerName) {
    return json({ ok: false, error: 'Customer name or initials are required' }, { status: 400, headers });
  }
  if (!rating) {
    return json({ ok: false, error: 'Rating (1 to 5 stars) is required' }, { status: 400, headers });
  }
  if (!comment || comment.length < 10) {
    return json({ ok: false, error: 'Feedback review must be at least 10 characters' }, { status: 400, headers });
  }
  if (!publishPermission || !privacyConsent) {
    return json({ ok: false, error: 'Permission to publish and privacy consent are required' }, { status: 400, headers });
  }

  try {
    await ensurePassengerCareSchema(env);

    const randomBytes = crypto.getRandomValues(new Uint8Array(6));
    const randomHex = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const leadUuid = `pub-rev-${randomHex}`;
    const bookingRef = bookingRefInput ? bookingRefInput.toUpperCase() : `REV-${randomHex}`;
    const submittedAt = new Date().toISOString();
    const formattedComment = monthYear ? `[رحلة ${monthYear}] ${comment}` : comment;

    await env.TRANSPORT_DB.prepare(`
      INSERT INTO passenger_care_feedback (
        lead_uuid,
        booking_ref,
        outcome,
        rating,
        comment,
        language,
        submitted_at,
        route_slug,
        route_label,
        review_approved,
        review_approved_at
      ) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, 0, NULL)
    `).bind(
      leadUuid,
      bookingRef,
      rating,
      `${customerName}: ${formattedComment}`,
      language,
      submittedAt,
      routeSlug || 'general-transport',
      routeLabel || 'General Transport',
    ).run();

    return json({
      ok: true,
      review_approved: false,
      message: 'Review submitted successfully. It will be reviewed by Vendora before publication.',
    }, { status: 201, headers });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'route_review_submit_failed',
      message: error && error.message ? error.message : String(error),
    }));
    return json({ ok: false, error: 'Failed to submit review' }, { status: 500, headers });
  }
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'GET') return onRequestGet(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, {
    status: 405,
    headers: corsHeaders(context.request),
  });
}
