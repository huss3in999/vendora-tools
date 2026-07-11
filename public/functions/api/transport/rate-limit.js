const buckets = new Map();

function clientKey(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

export function checkRateLimit(request, scope, options = {}) {
  const limit = Math.max(1, Number(options.limit || 30));
  const windowMs = Math.max(1000, Number(options.windowMs || 60_000));
  const now = Date.now();
  const key = `${scope}:${clientKey(request)}`;
  const current = buckets.get(key);
  const next = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };
  buckets.set(key, next);

  if (buckets.size > 5000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return {
    ok: next.count <= limit,
    remaining: Math.max(0, limit - next.count),
    retryAfter: Math.max(1, Math.ceil((next.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(result, headers = {}) {
  return new Response(JSON.stringify({ ok: false, error: 'Too many requests. Please try again shortly.' }), {
    status: 429,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': String(result.retryAfter || 60),
      ...headers,
    },
  });
}

