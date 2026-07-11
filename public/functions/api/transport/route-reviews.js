import { corsHeaders, ensurePassengerCareSchema, getPublicRouteReviews } from './passenger-care.js';
import { checkRateLimit, rateLimitResponse } from './rate-limit.js';

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=600',
      ...(init.headers || {}),
    },
  });
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
  const limitParam = Number(url.searchParams.get('limit') || 5);
  const limit = Math.max(1, Math.min(10, Number.isFinite(limitParam) ? Math.round(limitParam) : 5));

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

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'GET') return onRequestGet(context);
  return json({ ok: false, error: 'Method not allowed' }, {
    status: 405,
    headers: corsHeaders(context.request),
  });
}
