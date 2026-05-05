var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// functions/api/transport/admin.js
var admin_exports = {};
__export(admin_exports, {
  onRequest: () => onRequest,
  onRequestDelete: () => onRequestDelete,
  onRequestGet: () => onRequestGet,
  onRequestOptions: () => onRequestOptions,
  onRequestPost: () => onRequestPost,
  onRequestPut: () => onRequestPut
});
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
]);
var MAX_BODY_BYTES = 8192;
var MAX_LEADS_LIMIT = 1e3;
function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json, "json");
function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-admin-token",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText, "cleanText");
function cleanPrice(value) {
  if (value === null || value === void 0 || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1e5) return null;
  return Math.round(number * 1e3) / 1e3;
}
__name(cleanPrice, "cleanPrice");
function boolToInt(value) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}
__name(boolToInt, "boolToInt");
function cleanDate(value) {
  const text = cleanText(value, 32);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}
__name(cleanDate, "cleanDate");
async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody, "parseJsonBody");
async function sha256Bytes(value) {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return new Uint8Array(digest);
}
__name(sha256Bytes, "sha256Bytes");
async function timingSafeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const providedHash = await sha256Bytes(provided);
  const expectedHash = await sha256Bytes(expected);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}
__name(timingSafeTokenEqual, "timingSafeTokenEqual");
async function authorize(request, env) {
  const expectedToken = env.TRANSPORT_ADMIN_TOKEN;
  if (!expectedToken) return false;
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token = bearer || request.headers.get("x-admin-token") || "";
  return timingSafeTokenEqual(token, expectedToken);
}
__name(authorize, "authorize");
function requireDb(env, headers = {}) {
  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  return null;
}
__name(requireDb, "requireDb");
async function getLeads(env, request) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") || 100);
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
      request_ray_id,
      raw_payload
    FROM whatsapp_leads
    ${whereSql}
    ORDER BY clicked_at DESC
    LIMIT ?
  `).bind(...bindings, limit).all();
  return { leads: results || [] };
}
__name(getLeads, "getLeads");
function buildLeadFilters(url) {
  const clauses = [];
  const bindings = [];
  const filters = [
    ["route_slug", cleanText(url.searchParams.get("route"), 160)],
    ["utm_source", cleanText(url.searchParams.get("source"), 120)],
    ["utm_campaign", cleanText(url.searchParams.get("campaign"), 160)],
    ["device_type", cleanText(url.searchParams.get("device"), 40)],
    ["cf_country", cleanText(url.searchParams.get("country"), 8)]
  ];
  filters.forEach(([column, value]) => {
    if (!value) return;
    clauses.push(`${column} = ?`);
    bindings.push(value);
  });
  const from = cleanDate(url.searchParams.get("from"));
  if (from) {
    clauses.push("clicked_at >= ?");
    bindings.push(`${from}T00:00:00.000Z`);
  }
  const to = cleanDate(url.searchParams.get("to"));
  if (to) {
    clauses.push("clicked_at <= ?");
    bindings.push(`${to}T23:59:59.999Z`);
  }
  const search = cleanText(url.searchParams.get("search"), 120);
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
  const minSeconds = Number(url.searchParams.get("min_seconds") || 0);
  if (Number.isFinite(minSeconds) && minSeconds > 0) {
    clauses.push("time_on_page_ms >= ?");
    bindings.push(Math.round(minSeconds * 1e3));
  }
  const maxSeconds = Number(url.searchParams.get("max_seconds") || 0);
  if (Number.isFinite(maxSeconds) && maxSeconds > 0) {
    clauses.push("time_on_page_ms <= ?");
    bindings.push(Math.round(maxSeconds * 1e3));
  }
  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    bindings
  };
}
__name(buildLeadFilters, "buildLeadFilters");
async function getSummary(env, request) {
  const url = new URL(request.url);
  const { whereSql, bindings } = buildLeadFilters(url);
  const bindAll = /* @__PURE__ */ __name((sql) => env.TRANSPORT_DB.prepare(sql).bind(...bindings).all(), "bindAll");
  const bindFirst = /* @__PURE__ */ __name((sql) => env.TRANSPORT_DB.prepare(sql).bind(...bindings).first(), "bindFirst");
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
    `)
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
      by_hour: byHour || []
    }
  };
}
__name(getSummary, "getSummary");
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
__name(getRoutes, "getRoutes");
async function upsertRoute(env, payload) {
  const routeSlug = cleanText(payload.route_slug || payload.routeSlug, 160);
  if (!routeSlug) {
    return json({ ok: false, error: "route_slug is required" }, { status: 400 });
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
  const sortOrder = Number.isFinite(Number(payload.sort_order ?? payload.sortOrder)) ? Math.round(Number(payload.sort_order ?? payload.sortOrder)) : 0;
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
    sortOrder
  ).run();
  return json({ ok: true, route_slug: routeSlug, changes: result.meta?.changes || 0 });
}
__name(upsertRoute, "upsertRoute");
async function deleteLead(env, request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") || 0);
  const uuid = cleanText(url.searchParams.get("lead_uuid"), 80);
  if (!id && !uuid) {
    return json({ ok: false, error: "id or lead_uuid is required" }, { status: 400 });
  }
  const result = id ? await env.TRANSPORT_DB.prepare("DELETE FROM whatsapp_leads WHERE id = ?").bind(id).run() : await env.TRANSPORT_DB.prepare("DELETE FROM whatsapp_leads WHERE lead_uuid = ?").bind(uuid).run();
  return json({ ok: true, deleted: result.meta?.changes || 0 });
}
__name(deleteLead, "deleteLead");
async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
__name(onRequestOptions, "onRequestOptions");
async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "leads";
  try {
    const data = resource === "routes" ? await getRoutes(env) : resource === "summary" ? await getSummary(env, request) : await getLeads(env, request);
    return json({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_get_failed", message: error.message }));
    return json({ ok: false, error: "Failed to load admin data" }, { status: 500, headers });
  }
}
__name(onRequestGet, "onRequestGet");
async function onRequestPost(context) {
  return handleRouteWrite(context);
}
__name(onRequestPost, "onRequestPost");
async function onRequestPut(context) {
  return handleRouteWrite(context);
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  try {
    const response = await deleteLead(env, request);
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_delete_failed", message: error.message }));
    return json({ ok: false, error: "Failed to delete lead" }, { status: 500, headers });
  }
}
__name(onRequestDelete, "onRequestDelete");
async function handleRouteWrite(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  try {
    const response = await upsertRoute(env, payload);
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_route_write_failed", message: error.message }));
    return json({ ok: false, error: "Failed to save route" }, { status: 500, headers });
  }
}
__name(handleRouteWrite, "handleRouteWrite");
async function onRequest(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions(context);
  if (method === "GET") return onRequestGet(context);
  if (method === "POST") return onRequestPost(context);
  if (method === "PUT") return onRequestPut(context);
  if (method === "DELETE") return onRequestDelete(context);
  return json({ ok: false, error: "Method not allowed" }, {
    status: 405,
    headers: corsHeaders(context.request)
  });
}
__name(onRequest, "onRequest");

// functions/api/transport/whatsapp-lead.js
var whatsapp_lead_exports = {};
__export(whatsapp_lead_exports, {
  onRequest: () => onRequest2,
  onRequestOptions: () => onRequestOptions2,
  onRequestPost: () => onRequestPost2
});
var ALLOWED_ORIGINS2 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
]);
var MAX_BODY_BYTES2 = 8192;
function json2(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json2, "json");
function corsHeaders2(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS2.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders2, "corsHeaders");
function cleanText2(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText2, "cleanText");
function cleanUrl(value) {
  const text = cleanText2(value, 1200);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().slice(0, 1200);
  } catch {
    return null;
  }
}
__name(cleanUrl, "cleanUrl");
function cleanInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1e4, Math.round(number)));
}
__name(cleanInteger, "cleanInteger");
function cleanBoundedInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(min, Math.min(max, Math.round(number)));
}
__name(cleanBoundedInteger, "cleanBoundedInteger");
function getClientIp(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
__name(getClientIp, "getClientIp");
function getHeaderValue(request, names, maxLength = 120) {
  for (const name of names) {
    const value = cleanText2(request.headers.get(name), maxLength);
    if (!value) continue;
    try {
      return decodeURIComponent(value.replace(/\+/g, " ")).slice(0, maxLength);
    } catch {
      return value;
    }
  }
  return null;
}
__name(getHeaderValue, "getHeaderValue");
function normalizeCountryCode(value) {
  const code = cleanText2(value, 8);
  if (!code) return null;
  const normalized = code.toUpperCase();
  return normalized === "XX" ? null : normalized;
}
__name(normalizeCountryCode, "normalizeCountryCode");
function getRequestGeo(request) {
  const cf = request.cf || {};
  return {
    city: cleanText2(cf.city, 120) || getHeaderValue(request, ["x-vercel-ip-city"], 120),
    region: cleanText2(cf.region, 120) || cleanText2(cf.regionCode, 120) || getHeaderValue(request, ["x-vercel-ip-country-region", "x-vercel-ip-country-region-name"], 120),
    country: normalizeCountryCode(cf.country) || normalizeCountryCode(getHeaderValue(request, ["cf-ipcountry", "x-vercel-ip-country", "x-appengine-country", "cloudfront-viewer-country"], 8)),
    timezone: cleanText2(cf.timezone, 80) || getHeaderValue(request, ["x-vercel-ip-timezone"], 80),
    rayId: cleanText2(request.headers.get("cf-ray"), 120) || getHeaderValue(request, ["x-request-id", "x-vercel-id"], 120)
  };
}
__name(getRequestGeo, "getRequestGeo");
function getPayloadValue(payload, key, maxLength) {
  return cleanText2(payload && payload[key], maxLength);
}
__name(getPayloadValue, "getPayloadValue");
async function parseJsonBody2(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES2) {
    throw new Error("Payload too large");
  }
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES2) {
    throw new Error("Payload too large");
  }
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody2, "parseJsonBody");
async function storeLead(request, env, payload, leadUuid) {
  const geo = getRequestGeo(request);
  const stmt = env.TRANSPORT_DB.prepare(`
    INSERT INTO whatsapp_leads (
      lead_uuid,
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
      viewport_width,
      viewport_height,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ip_address,
      cf_city,
      cf_region,
      cf_country,
      cf_timezone,
      user_agent,
      request_ray_id,
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
      raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt.bind(
    leadUuid,
    getPayloadValue(payload, "timestamp", 80),
    getPayloadValue(payload, "routeSlug", 160),
    getPayloadValue(payload, "routeLabel", 240),
    getPayloadValue(payload, "serviceType", 160),
    getPayloadValue(payload, "fromCountry", 120),
    getPayloadValue(payload, "fromCity", 120),
    getPayloadValue(payload, "toCountry", 120),
    getPayloadValue(payload, "toCity", 120),
    cleanUrl(payload.pageUrl),
    getPayloadValue(payload, "pagePath", 300),
    cleanUrl(payload.targetUrl),
    getPayloadValue(payload, "language", 20),
    getPayloadValue(payload, "deviceType", 40),
    cleanInteger(payload.viewportWidth),
    cleanInteger(payload.viewportHeight),
    cleanUrl(payload.referrer),
    getPayloadValue(payload, "utmSource", 120),
    getPayloadValue(payload, "utmMedium", 120),
    getPayloadValue(payload, "utmCampaign", 160),
    getPayloadValue(payload, "utmTerm", 160),
    getPayloadValue(payload, "utmContent", 160),
    getClientIp(request),
    geo.city,
    geo.region,
    geo.country,
    geo.timezone,
    cleanText2(request.headers.get("user-agent"), 600),
    geo.rayId,
    getPayloadValue(payload, "sessionId", 120),
    getPayloadValue(payload, "pageLoadedAt", 80),
    cleanBoundedInteger(payload.timeOnPageMs, 0, 864e5),
    cleanBoundedInteger(payload.scrollDepthPercent, 0, 100),
    cleanBoundedInteger(payload.clickX, 0, 1e4),
    cleanBoundedInteger(payload.clickY, 0, 1e4),
    getPayloadValue(payload, "clickText", 240),
    getPayloadValue(payload, "browserLanguage", 40),
    cleanInteger(payload.screenWidth),
    cleanInteger(payload.screenHeight),
    cleanBoundedInteger(payload.timezoneOffsetMinutes, -1440, 1440),
    cleanBoundedInteger(payload.interactionCount, 0, 1e4),
    JSON.stringify(payload).slice(0, 4e3)
  ).run();
}
__name(storeLead, "storeLead");
async function onRequestOptions2(context) {
  const { request } = context;
  return new Response(null, { status: 204, headers: corsHeaders2(request) });
}
__name(onRequestOptions2, "onRequestOptions");
async function onRequestPost2(context) {
  const { request, env } = context;
  const headers = corsHeaders2(request);
  if (!env.TRANSPORT_DB) {
    return json2({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody2(request);
  } catch {
    return json2({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const leadUuid = crypto.randomUUID();
  const write = storeLead(request, env, payload, leadUuid).catch((error) => {
    console.error(JSON.stringify({
      event: "transport_lead_insert_failed",
      leadUuid,
      message: error && error.message ? error.message : String(error)
    }));
  });
  context.waitUntil(write);
  return json2({ ok: true, leadId: leadUuid }, { status: 202, headers });
}
__name(onRequestPost2, "onRequestPost");
async function onRequest2(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions2(context);
  if (method === "POST") return onRequestPost2(context);
  return json2({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders2(context.request) });
}
__name(onRequest2, "onRequest");

// worker.js
var SITE_PATH_PREFIX = "/bahrain-saudi-gcc-transport";
function logicalPathname(url) {
  let p = url.pathname.replace(/\/+$/, "") || "/";
  if (p === SITE_PATH_PREFIX || p.startsWith(`${SITE_PATH_PREFIX}/`)) {
    p = p.slice(SITE_PATH_PREFIX.length) || "/";
  }
  return p;
}
__name(logicalPathname, "logicalPathname");
function createContext(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    data: {},
    waitUntil: ctx.waitUntil.bind(ctx),
    next: /* @__PURE__ */ __name(() => env.ASSETS.fetch(request), "next")
  };
}
__name(createContext, "createContext");
async function dispatchPagesFunction(module, request, env, ctx) {
  const context = createContext(request, env, ctx);
  const method = request.method.toUpperCase();
  if (method === "OPTIONS" && module.onRequestOptions) return module.onRequestOptions(context);
  if (method === "GET" && module.onRequestGet) return module.onRequestGet(context);
  if (method === "POST" && module.onRequestPost) return module.onRequestPost(context);
  if (method === "PUT" && module.onRequestPut) return module.onRequestPut(context);
  if (method === "DELETE" && module.onRequestDelete) return module.onRequestDelete(context);
  if (module.onRequest) return module.onRequest(context);
  return new Response("Method not allowed", { status: 405 });
}
__name(dispatchPagesFunction, "dispatchPagesFunction");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = logicalPathname(url);
    if (path === "/api/transport/admin") {
      return dispatchPagesFunction(admin_exports, request, env, ctx);
    }
    if (path === "/api/transport/whatsapp-lead") {
      return dispatchPagesFunction(whatsapp_lead_exports, request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  }
};

// C:/Users/Hussain Alyaqoob/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// C:/Users/Hussain Alyaqoob/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-I1xJm9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// C:/Users/Hussain Alyaqoob/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-I1xJm9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
