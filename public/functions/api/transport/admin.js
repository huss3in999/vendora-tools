const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
]);

const MAX_BODY_BYTES = 8192;
const MAX_LEADS_LIMIT = 1000;

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
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-admin-token',
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

function boolToInt(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

function cleanDate(value) {
  const text = cleanText(value, 32);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('Payload too large');

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error('Payload too large');
  if (!body.trim()) return {};
  return JSON.parse(body);
}

async function sha256Bytes(value) {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return new Uint8Array(digest);
}

async function timingSafeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const providedHash = await sha256Bytes(provided);
  const expectedHash = await sha256Bytes(expected);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

async function authorize(request, env) {
  const expectedToken = env.TRANSPORT_ADMIN_TOKEN;
  if (!expectedToken) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const token = bearer || request.headers.get('x-admin-token') || '';
  return timingSafeTokenEqual(token, expectedToken);
}

function requireDb(env, headers = {}) {
  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: 'Database binding missing' }, { status: 500, headers });
  }
  return null;
}

async function getLeads(env, request) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') || 100);
  const limit = Math.max(1, Math.min(MAX_LEADS_LIMIT, Number.isFinite(limitParam) ? Math.round(limitParam) : 100));
  const { whereSql, bindings } = buildLeadFilters(url);

  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT
      id,
      lead_uuid,
      clicked_at,
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
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      cf_city,
      cf_region,
      cf_country,
      cf_timezone,
      utm_term,
      utm_content,
      user_agent,
      ip_address,
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
      request_ray_id
    FROM whatsapp_leads
    ${whereSql}
    ORDER BY clicked_at DESC
    LIMIT ?
  `).bind(...bindings, limit).all();

  return { leads: results || [] };
}

function buildLeadFilters(url) {
  const clauses = [];
  const bindings = [];
  const filters = [
    ['route_slug', cleanText(url.searchParams.get('route'), 160)],
    ['utm_source', cleanText(url.searchParams.get('source'), 120)],
    ['utm_campaign', cleanText(url.searchParams.get('campaign'), 160)],
    ['device_type', cleanText(url.searchParams.get('device'), 40)],
    ['cf_country', cleanText(url.searchParams.get('country'), 8)],
  ];

  filters.forEach(([column, value]) => {
    if (!value) return;
    clauses.push(`${column} = ?`);
    bindings.push(value);
  });

  const from = cleanDate(url.searchParams.get('from'));
  if (from) {
    clauses.push('clicked_at >= ?');
    bindings.push(`${from}T00:00:00.000Z`);
  }

  const to = cleanDate(url.searchParams.get('to'));
  if (to) {
    clauses.push('clicked_at <= ?');
    bindings.push(`${to}T23:59:59.999Z`);
  }

  const search = cleanText(url.searchParams.get('search'), 120);
  if (search) {
    clauses.push(`(
      route_label LIKE ?
      OR route_slug LIKE ?
      OR page_path LIKE ?
      OR utm_source LIKE ?
      OR utm_campaign LIKE ?
      OR cf_city LIKE ?
      OR cf_country LIKE ?
    )`);
    const like = `%${search}%`;
    bindings.push(like, like, like, like, like, like, like);
  }

  const minSeconds = Number(url.searchParams.get('min_seconds') || 0);
  if (Number.isFinite(minSeconds) && minSeconds > 0) {
    clauses.push('time_on_page_ms >= ?');
    bindings.push(Math.round(minSeconds * 1000));
  }

  const maxSeconds = Number(url.searchParams.get('max_seconds') || 0);
  if (Number.isFinite(maxSeconds) && maxSeconds > 0) {
    clauses.push('time_on_page_ms <= ?');
    bindings.push(Math.round(maxSeconds * 1000));
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    bindings,
  };
}

async function getSummary(env, request) {
  const url = new URL(request.url);
  const { whereSql, bindings } = buildLeadFilters(url);
  const bindAll = (sql) => env.TRANSPORT_DB.prepare(sql).bind(...bindings).all();
  const bindFirst = (sql) => env.TRANSPORT_DB.prepare(sql).bind(...bindings).first();

  const totals = await bindFirst(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', date('now', '+3 hours') || ' 00:00:00', '-3 hours') THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') THEN 1 ELSE 0 END) AS last_7_days,
      MAX(clicked_at) AS last_click
      ,COUNT(DISTINCT session_id) AS sessions
      ,ROUND(AVG(time_on_page_ms)) AS avg_time_on_page_ms
      ,ROUND(AVG(scroll_depth_percent)) AS avg_scroll_depth_percent
    FROM whatsapp_leads
    ${whereSql}
  `);

  const [{ results: byRoute }, { results: bySource }, { results: byCountry }, { results: byDevice }, { results: byDay }, { results: byHour }, { results: byCampaign }] = await Promise.all([
    bindAll(`
      SELECT COALESCE(route_slug, 'unknown') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${whereSql}
      GROUP BY COALESCE(route_slug, 'unknown')
      ORDER BY count DESC
      LIMIT 10
    `),
    bindAll(`
      SELECT COALESCE(NULLIF(utm_source, ''), 'direct/unknown') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${whereSql}
      GROUP BY COALESCE(NULLIF(utm_source, ''), 'direct/unknown')
      ORDER BY count DESC
      LIMIT 10
    `),
    bindAll(`
      SELECT COALESCE(NULLIF(cf_country, ''), 'unknown') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${whereSql}
      GROUP BY COALESCE(NULLIF(cf_country, ''), 'unknown')
      ORDER BY count DESC
      LIMIT 10
    `),
    bindAll(`
      SELECT COALESCE(NULLIF(device_type, ''), 'unknown') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${whereSql}
      GROUP BY COALESCE(NULLIF(device_type, ''), 'unknown')
      ORDER BY count DESC
      LIMIT 10
    `),
    bindAll(`
      SELECT date(clicked_at, '+3 hours') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${whereSql}
      GROUP BY date(clicked_at, '+3 hours')
      ORDER BY label DESC
      LIMIT 14
    `),
    bindAll(`
      SELECT strftime('%H', clicked_at, '+3 hours') || ':00' AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${whereSql}
      GROUP BY strftime('%H', clicked_at, '+3 hours')
      ORDER BY label ASC
    `),
    bindAll(`
      SELECT COALESCE(NULLIF(utm_campaign, ''), 'no campaign') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${whereSql}
      GROUP BY COALESCE(NULLIF(utm_campaign, ''), 'no campaign')
      ORDER BY count DESC
      LIMIT 10
    `),
  ]);

  return {
    summary: {
      total: totals?.total || 0,
      today: totals?.today || 0,
      last_7_days: totals?.last_7_days || 0,
      last_click: totals?.last_click || null,
      sessions: totals?.sessions || 0,
      avg_time_on_page_ms: totals?.avg_time_on_page_ms || 0,
      avg_scroll_depth_percent: totals?.avg_scroll_depth_percent || 0,
      by_route: byRoute || [],
      by_source: bySource || [],
      by_campaign: byCampaign || [],
      by_country: byCountry || [],
      by_device: byDevice || [],
      by_day: (byDay || []).reverse(),
      by_hour: byHour || [],
    },
  };
}

async function getRoutes(env) {
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT
      id,
      route_slug,
      route_name_ar,
      route_name_en,
      origin_country,
      origin_city,
      destination_country,
      destination_city,
      price_bd,
      currency,
      is_visible,
      notes_ar,
      notes_en,
      sort_order,
      updated_at
    FROM routes_pricing
    ORDER BY sort_order ASC, route_slug ASC
  `).all();

  return { routes: results || [] };
}

async function upsertRoute(env, payload) {
  const routeSlug = cleanText(payload.route_slug || payload.routeSlug, 160);
  if (!routeSlug) {
    return json({ ok: false, error: 'route_slug is required' }, { status: 400 });
  }

  const priceBd = cleanPrice(payload.price_bd ?? payload.priceBD);
  const isVisible = boolToInt(payload.is_visible ?? payload.is_live ?? payload.isLive);
  const routeNameAr = cleanText(payload.route_name_ar || payload.routeNameAr, 240) || routeSlug;
  const routeNameEn = cleanText(payload.route_name_en || payload.routeNameEn, 240) || routeSlug;
  const originCountry = cleanText(payload.origin_country || payload.originCountry, 120);
  const originCity = cleanText(payload.origin_city || payload.originCity, 120);
  const destinationCountry = cleanText(payload.destination_country || payload.destinationCountry, 120);
  const destinationCity = cleanText(payload.destination_city || payload.destinationCity, 120);
  const notesAr = cleanText(payload.notes_ar || payload.notesAr, 800);
  const notesEn = cleanText(payload.notes_en || payload.notesEn, 800);
  const sortOrder = Number.isFinite(Number(payload.sort_order ?? payload.sortOrder))
    ? Math.round(Number(payload.sort_order ?? payload.sortOrder))
    : 0;

  const result = await env.TRANSPORT_DB.prepare(`
    INSERT INTO routes_pricing (
      route_slug,
      route_name_ar,
      route_name_en,
      origin_country,
      origin_city,
      destination_country,
      destination_city,
      price_bd,
      currency,
      is_visible,
      notes_ar,
      notes_en,
      sort_order,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BHD', ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(route_slug) DO UPDATE SET
      route_name_ar = excluded.route_name_ar,
      route_name_en = excluded.route_name_en,
      origin_country = excluded.origin_country,
      origin_city = excluded.origin_city,
      destination_country = excluded.destination_country,
      destination_city = excluded.destination_city,
      price_bd = excluded.price_bd,
      is_visible = excluded.is_visible,
      notes_ar = excluded.notes_ar,
      notes_en = excluded.notes_en,
      sort_order = excluded.sort_order,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    routeSlug,
    routeNameAr,
    routeNameEn,
    originCountry,
    originCity,
    destinationCountry,
    destinationCity,
    priceBd,
    isVisible,
    notesAr,
    notesEn,
    sortOrder,
  ).run();

  return json({ ok: true, route_slug: routeSlug, changes: result.meta?.changes || 0 });
}

async function deleteLead(env, request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id') || 0);
  const uuid = cleanText(url.searchParams.get('lead_uuid'), 80);

  if (!id && !uuid) {
    return json({ ok: false, error: 'id or lead_uuid is required' }, { status: 400 });
  }

  const result = id
    ? await env.TRANSPORT_DB.prepare('DELETE FROM whatsapp_leads WHERE id = ?').bind(id).run()
    : await env.TRANSPORT_DB.prepare('DELETE FROM whatsapp_leads WHERE lead_uuid = ?').bind(uuid).run();

  return json({ ok: true, deleted: result.meta?.changes || 0 });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;

  if (!(await authorize(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  const url = new URL(request.url);
  const resource = url.searchParams.get('resource') || 'leads';

  try {
    const data = resource === 'routes'
      ? await getRoutes(env)
      : resource === 'summary'
        ? await getSummary(env, request)
        : await getLeads(env, request);
    return json({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_get_failed', message: error.message }));
    return json({ ok: false, error: 'Failed to load admin data' }, { status: 500, headers });
  }
}

export async function onRequestPost(context) {
  return handleRouteWrite(context);
}

export async function onRequestPut(context) {
  return handleRouteWrite(context);
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;

  if (!(await authorize(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  try {
    const response = await deleteLead(env, request);
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_delete_failed', message: error.message }));
    return json({ ok: false, error: 'Failed to delete lead' }, { status: 500, headers });
  }
}

async function handleRouteWrite(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;

  if (!(await authorize(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: 'Invalid JSON payload' }, { status: 400, headers });
  }

  try {
    const response = await upsertRoute(env, payload);
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_route_write_failed', message: error.message }));
    return json({ ok: false, error: 'Failed to save route' }, { status: 500, headers });
  }
}

export async function onRequest(context) {
  return json({ ok: false, error: 'Method not allowed' }, {
    status: 405,
    headers: corsHeaders(context.request),
  });
}
