var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// functions/api/transport/admin.js
var admin_exports = {};
__export(admin_exports, {
  onRequest: () => onRequest3,
  onRequestDelete: () => onRequestDelete,
  onRequestGet: () => onRequestGet,
  onRequestOptions: () => onRequestOptions3,
  onRequestPost: () => onRequestPost3,
  onRequestPut: () => onRequestPut
});

// functions/api/transport/error-log.js
var error_log_exports = {};
__export(error_log_exports, {
  ensureErrorSchema: () => ensureErrorSchema,
  onRequest: () => onRequest,
  onRequestOptions: () => onRequestOptions,
  onRequestPost: () => onRequestPost,
  recordError: () => recordError
});
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES = 8192;
var MAX_ERROR_ROWS = 2e3;
var errorSchemaReady = false;
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
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function clip(value, maxLength) {
  if (value === null || value === void 0) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : null;
}
__name(clip, "clip");
function clipRaw(value, maxLength) {
  if (value === null || value === void 0) return null;
  const text = String(value);
  return text ? text.slice(0, maxLength) : null;
}
__name(clipRaw, "clipRaw");
async function ensureErrorSchema(env) {
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
__name(ensureErrorSchema, "ensureErrorSchema");
async function recordError(env, entry = {}) {
  try {
    if (!env || !env.TRANSPORT_DB) return;
    await ensureErrorSchema(env);
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO transport_error_log (
        source, severity, message, stack, page_url, page_path, user_agent, ip_address, cf_country, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clip(entry.source, 80) || "unknown",
      clip(entry.severity, 20) || "error",
      clip(entry.message, 1e3) || "Unknown error",
      clipRaw(entry.stack, 4e3),
      clip(entry.pageUrl, 1e3),
      clip(entry.pagePath, 400),
      clip(entry.userAgent, 600),
      clip(entry.ipAddress, 80),
      clip(entry.country, 8),
      clipRaw(entry.context, 2e3)
    ).run();
    await env.TRANSPORT_DB.prepare(`
      DELETE FROM transport_error_log
      WHERE id NOT IN (
        SELECT id FROM transport_error_log ORDER BY id DESC LIMIT ?
      )
    `).bind(MAX_ERROR_ROWS).run();
  } catch (loggingError) {
    console.error(JSON.stringify({
      event: "transport_error_log_failed",
      message: loggingError && loggingError.message ? loggingError.message : String(loggingError)
    }));
  }
}
__name(recordError, "recordError");
async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody, "parseJsonBody");
async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
__name(onRequestOptions, "onRequestOptions");
async function onRequestPost(context) {
  const { request, env, ctx } = context;
  const headers = corsHeaders(request);
  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: "Invalid error payload" }, { status: 400, headers });
  }
  const cf = request.cf || {};
  const entry = {
    source: payload.source || "client",
    severity: payload.severity || "error",
    message: payload.message,
    stack: payload.stack,
    pageUrl: payload.pageUrl,
    pagePath: payload.pagePath,
    userAgent: clip(request.headers.get("user-agent"), 600),
    ipAddress: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    country: cf.country || request.headers.get("cf-ipcountry") || null,
    context: typeof payload.context === "string" ? payload.context : JSON.stringify(payload.context || {})
  };
  const write = recordError(env, entry);
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(write);
  } else if (typeof context.waitUntil === "function") {
    context.waitUntil(write);
  } else {
    await write;
  }
  return json({ ok: true }, { status: 202, headers });
}
__name(onRequestPost, "onRequestPost");
async function onRequest(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions(context);
  if (method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders(context.request) });
}
__name(onRequest, "onRequest");

// functions/api/transport/whatsapp-lead.js
var whatsapp_lead_exports = {};
__export(whatsapp_lead_exports, {
  buildNtfyHeaders: () => buildNtfyHeaders,
  getNtfyToken: () => getNtfyToken,
  onRequest: () => onRequest2,
  onRequestOptions: () => onRequestOptions2,
  onRequestPost: () => onRequestPost2,
  resolveNtfyPublishUrl: () => resolveNtfyPublishUrl,
  sendDailySummary: () => sendDailySummary
});
var ALLOWED_ORIGINS2 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES2 = 8192;
var settingsSchemaReady = false;
var DEFAULT_NOTIFICATION_SETTINGS = {
  notifications_enabled: true,
  notify_whatsapp_clicks: true,
  // Mode C default: do not ping the phone on browsing. Real-time alerts fire
  // only on WhatsApp clicks; overall traffic arrives in the daily summary.
  notify_pageviews: false
};
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
function isPageview(payload) {
  return cleanText(payload && payload.serviceType, 160) === "pageview";
}
__name(isPageview, "isPageview");
function getNtfyToken(env) {
  const raw = env && env.TRANSPORT_NOTIFY_WEBHOOK_TOKEN;
  if (typeof raw !== "string") return null;
  const token = raw.replace(/[\r\n]/g, "").trim();
  return token || null;
}
__name(getNtfyToken, "getNtfyToken");
function buildNtfyHeaders(env, extra) {
  const headers = { "content-type": "text/plain; charset=utf-8", ...extra };
  const token = getNtfyToken(env);
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}
__name(buildNtfyHeaders, "buildNtfyHeaders");
function resolveNtfyPublishUrl(webhookUrl, env) {
  const token = getNtfyToken(env);
  if (!token) return webhookUrl;
  try {
    const url = new URL(webhookUrl);
    url.searchParams.set("auth", token);
    return url.toString();
  } catch {
    return webhookUrl;
  }
}
__name(resolveNtfyPublishUrl, "resolveNtfyPublishUrl");
function getPayloadTrafficSource(payload) {
  return cleanText(payload && (payload.firstTrafficSource || payload.trafficSource || payload.utmSource), 160) || "direct/unknown";
}
__name(getPayloadTrafficSource, "getPayloadTrafficSource");
async function ensureSettingsSchema(env) {
  if (settingsSchemaReady || !env.TRANSPORT_DB) return;
  await env.TRANSPORT_DB.prepare(`
    CREATE TABLE IF NOT EXISTS transport_admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `).run();
  settingsSchemaReady = true;
}
__name(ensureSettingsSchema, "ensureSettingsSchema");
function boolSetting(value, fallback = false) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "on", "enabled"].includes(text)) return true;
  if (["false", "no", "off", "disabled"].includes(text)) return false;
  return fallback;
}
__name(boolSetting, "boolSetting");
async function getNotificationSettings(env) {
  const envPageviewFallback = String(env.TRANSPORT_NOTIFY_PAGEVIEWS || "").toLowerCase() === "true";
  const defaults = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    notify_pageviews: envPageviewFallback
  };
  if (!env.TRANSPORT_DB) return defaults;
  try {
    await ensureSettingsSchema(env);
    const { results } = await env.TRANSPORT_DB.prepare(`
      SELECT key, value
      FROM transport_admin_settings
      WHERE key IN ('notifications_enabled', 'notify_whatsapp_clicks', 'notify_pageviews')
    `).all();
    const saved = Object.fromEntries((results || []).map((row) => [row.key, row.value]));
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
      key,
      boolSetting(saved[key], fallback)
    ]));
  } catch (error) {
    console.error(JSON.stringify({
      event: "transport_notify_settings_failed",
      message: error && error.message ? error.message : String(error)
    }));
    return defaults;
  }
}
__name(getNotificationSettings, "getNotificationSettings");
function prettyRoute(row) {
  const label = cleanText(row && row.route_label, 240);
  if (label && !/^https?:/i.test(label)) return label;
  const slug = cleanText(row && row.route_slug, 160);
  if (slug) {
    return slug.replace(/-en$/i, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return cleanText(row && row.page_path, 200) || "page";
}
__name(prettyRoute, "prettyRoute");
async function fetchVisitorJourney(env, payload) {
  if (!env.TRANSPORT_DB) return [];
  const visitorId = cleanText(payload && payload.visitorId, 80) || "";
  const sessionId = cleanText(payload && payload.sessionId, 120) || "";
  if (!visitorId && !sessionId) return [];
  try {
    const { results } = await env.TRANSPORT_DB.prepare(`
      SELECT route_label, route_slug, page_path, service_type, clicked_at, time_on_page_ms
      FROM whatsapp_leads
      WHERE (json_extract(raw_payload, '$.visitorId') = ?1 OR session_id = ?2)
        AND clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 hours')
      ORDER BY clicked_at ASC
      LIMIT 30
    `).bind(visitorId, sessionId).all();
    return results || [];
  } catch {
    return [];
  }
}
__name(fetchVisitorJourney, "fetchVisitorJourney");
function buildClickNotificationText(payload, geo, journey) {
  const visitCount = cleanInteger(payload.visitCount);
  const isReturning = typeof visitCount === "number" && visitCount > 1;
  const customerKind = typeof visitCount === "number" ? isReturning ? "RETURNING customer" : "NEW customer" : "Customer";
  const route = cleanText(payload.routeLabel || payload.routeSlug, 240) || "Unknown page";
  const pagePath = cleanText(payload.pagePath, 300) || "-";
  const pageUrl = cleanText(payload.pageUrl, 500) || "";
  const language = cleanText(payload.language, 20);
  const buttonText = cleanText(payload.clickText, 160) || "WhatsApp button";
  const source = getPayloadTrafficSource(payload);
  const campaign = cleanText(payload.utmCampaign, 160) || "none";
  const device = cleanText(payload.deviceType, 40) || "unknown device";
  const location = [geo.city, geo.region, geo.country].filter(Boolean).join(", ") || "unknown location";
  const timeOnPage = Math.round(Number(payload.timeOnPageMs || 0) / 1e3);
  const scroll = cleanBoundedInteger(payload.scrollDepthPercent, 0, 100) ?? 0;
  const visitor = cleanText(payload.visitorId, 80);
  const referrer = cleanText(payload.referrerHost, 200) || cleanText(payload.referrer, 200) || "direct/bookmark";
  const tripFrom = [cleanText(payload.fromCity, 120), cleanText(payload.fromCountry, 120)].filter(Boolean).join(", ");
  const tripTo = [cleanText(payload.toCity, 120), cleanText(payload.toCountry, 120)].filter(Boolean).join(", ");
  const serviceType = cleanText(payload.serviceType, 120);
  const pages = (journey || []).filter((e) => cleanText(e.service_type, 40) !== "pageview" ? false : true);
  const totalSeconds = pages.reduce((sum, e) => sum + Math.round(Number(e.time_on_page_ms || 0) / 1e3), 0);
  const journeyLines = pages.map((e, i) => `  ${i + 1}. ${prettyRoute(e)}`);
  return [
    "Vendora: WHATSAPP BOOKING CLICK \u{1F525}",
    `${customerKind}${typeof visitCount === "number" ? ` (visit #${visitCount})` : ""} \xB7 ${device} \xB7 ${location}`,
    `Came from: ${source}${campaign && campaign !== "none" ? ` (campaign: ${campaign})` : ""}`,
    `Clicked: "${buttonText}" on ${route}${language ? ` (${language})` : ""}`,
    tripFrom || tripTo ? `Trip: ${tripFrom || "?"} -> ${tripTo || "?"}` : "",
    serviceType && serviceType !== "pageview" ? `Service: ${serviceType}` : "",
    pages.length ? `Before clicking they viewed (${pages.length} page${pages.length === 1 ? "" : "s"}, ${totalSeconds}s):` : "This was their entry page (no earlier pages tracked).",
    ...journeyLines,
    `Engagement on this page: ${timeOnPage}s, ${scroll}% scrolled`,
    pageUrl ? `Page URL: ${pageUrl}` : "",
    `Where: ${pagePath}`,
    `Referrer: ${referrer}`,
    visitor ? `Visitor ID: ${visitor}` : "",
    "Meaning: this customer opened WhatsApp to talk to the driver \u2014 a real lead you can act on."
  ].filter(Boolean).join("\n");
}
__name(buildClickNotificationText, "buildClickNotificationText");
function buildNotificationText(payload, geo) {
  const pageview = isPageview(payload);
  const visitCount = cleanInteger(payload.visitCount);
  const isReturning = typeof visitCount === "number" && visitCount > 1;
  const customerKind = typeof visitCount === "number" ? isReturning ? "RETURNING customer" : "NEW customer" : "Customer";
  const eventName = pageview ? typeof visitCount === "number" ? isReturning ? "RETURNING CUSTOMER VISIT" : "NEW CUSTOMER VISIT" : "CUSTOMER VISIT" : "WHATSAPP BOOKING CLICK";
  const route = cleanText(payload.routeLabel || payload.routeSlug, 240) || "Unknown route";
  const pagePath = cleanText(payload.pagePath, 300) || "-";
  const pageTitle = cleanText(payload.pageTitle, 240) || "";
  const pageUrl = cleanText(payload.pageUrl, 500) || "";
  const language = cleanText(payload.language, 20);
  const buttonText = cleanText(payload.clickText, 160);
  const source = getPayloadTrafficSource(payload);
  const campaign = cleanText(payload.utmCampaign, 160) || "none";
  const device = cleanText(payload.deviceType, 40) || "unknown device";
  const location = [geo.city, geo.region, geo.country].filter(Boolean).join(", ") || "unknown location";
  const timeOnPage = Math.round(Number(payload.timeOnPageMs || 0) / 1e3);
  const scroll = cleanBoundedInteger(payload.scrollDepthPercent, 0, 100) ?? 0;
  const visitor = cleanText(payload.visitorId, 80);
  const tripFrom = [cleanText(payload.fromCity, 120), cleanText(payload.fromCountry, 120)].filter(Boolean).join(", ");
  const tripTo = [cleanText(payload.toCity, 120), cleanText(payload.toCountry, 120)].filter(Boolean).join(", ");
  const serviceType = cleanText(payload.serviceType, 120);
  return [
    `Vendora Transport: ${eventName}`,
    `Website: getvendora.net / GCC Transport`,
    pageview ? `Customer type: ${customerKind}${typeof visitCount === "number" ? ` (visit #${visitCount})` : ""}` : "",
    pageTitle ? `Page name: ${pageTitle}` : "",
    `Route/page: ${route}${language ? ` (${language})` : ""}`,
    `Where: ${pagePath}`,
    pageUrl ? `Full URL: ${pageUrl}` : "",
    !pageview && buttonText ? `Clicked button: "${buttonText}"` : "",
    !pageview && serviceType && serviceType !== "pageview" ? `Service: ${serviceType}` : "",
    !pageview && tripFrom ? `From: ${tripFrom}` : "",
    !pageview && tripTo ? `To: ${tripTo}` : "",
    `Source: ${source}`,
    `Campaign: ${campaign}`,
    `Device/location: ${device} / ${location}`,
    `Engagement: ${timeOnPage}s on page, ${scroll}% scrolled`,
    pageview ? `Meaning: a ${isReturning ? "returning" : "new"} customer just arrived on the site (we will not alert again as they browse other pages).` : "Meaning: a customer just opened the WhatsApp booking chat from this page.",
    visitor ? `Visitor: ${visitor.slice(0, 8)}...` : ""
  ].filter(Boolean).join("\n");
}
__name(buildNotificationText, "buildNotificationText");
async function sendPhoneNotification(request, env, payload) {
  const webhookUrl = cleanText(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
  if (!webhookUrl) return;
  const pageview = isPageview(payload);
  const settings = await getNotificationSettings(env);
  if (!settings.notifications_enabled) return;
  if (pageview && !settings.notify_pageviews) return;
  if (!pageview && !settings.notify_whatsapp_clicks) return;
  let url;
  try {
    url = new URL(webhookUrl);
    if (!["https:", "http:"].includes(url.protocol)) return;
  } catch {
    return;
  }
  const geo = getRequestGeo(request);
  let text;
  let title;
  let priority;
  let tags;
  if (pageview) {
    const sessionPageViews = cleanInteger(payload.sessionPageViews);
    const isFirstPage = sessionPageViews === null || sessionPageViews <= 1;
    if (!isFirstPage) return;
    const visitCount = cleanInteger(payload.visitCount);
    const isReturning = typeof visitCount === "number" && visitCount > 1;
    text = buildNotificationText(payload, geo);
    title = isReturning ? "Vendora: returning customer" : "Vendora: NEW customer";
    priority = "default";
    tags = isReturning ? "repeat" : "wave";
  } else {
    const journey = await fetchVisitorJourney(env, payload);
    text = buildClickNotificationText(payload, geo, journey);
    title = "Vendora: WhatsApp booking click";
    priority = "high";
    tags = "telephone";
  }
  await fetch(resolveNtfyPublishUrl(url.toString(), env), {
    method: "POST",
    headers: buildNtfyHeaders(env, { title, priority, tags }),
    body: text
  });
}
__name(sendPhoneNotification, "sendPhoneNotification");
async function sendDailySummary(env) {
  const webhookUrl = cleanText(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
  if (!webhookUrl || !env.TRANSPORT_DB) return;
  const settings = await getNotificationSettings(env);
  if (!settings.notifications_enabled) return;
  let url;
  try {
    url = new URL(webhookUrl);
    if (!["https:", "http:"].includes(url.protocol)) return;
  } catch {
    return;
  }
  const since = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')";
  const totals = await env.TRANSPORT_DB.prepare(`
    SELECT
      COUNT(DISTINCT COALESCE(json_extract(raw_payload, '$.visitorId'), session_id)) AS visitors,
      SUM(CASE WHEN COALESCE(service_type, '') = 'pageview' THEN 1 ELSE 0 END) AS pageviews,
      SUM(CASE WHEN COALESCE(service_type, '') <> 'pageview' THEN 1 ELSE 0 END) AS clicks
    FROM whatsapp_leads
    WHERE clicked_at >= ${since}
  `).first();
  const split = await env.TRANSPORT_DB.prepare(`
    SELECT
      SUM(CASE WHEN mx > 1 THEN 1 ELSE 0 END) AS returning_visitors,
      SUM(CASE WHEN mx <= 1 THEN 1 ELSE 0 END) AS new_visitors
    FROM (
      SELECT
        COALESCE(json_extract(raw_payload, '$.visitorId'), session_id) AS vk,
        MAX(COALESCE(json_extract(raw_payload, '$.visitCount'), 1)) AS mx
      FROM whatsapp_leads
      WHERE clicked_at >= ${since}
      GROUP BY vk
    )
  `).first();
  const topPage = await env.TRANSPORT_DB.prepare(`
    SELECT COALESCE(NULLIF(route_label, ''), NULLIF(route_slug, ''), page_path) AS label, COUNT(*) AS c
    FROM whatsapp_leads
    WHERE clicked_at >= ${since} AND COALESCE(service_type, '') = 'pageview'
    GROUP BY label
    ORDER BY c DESC
    LIMIT 1
  `).first();
  const topCountry = await env.TRANSPORT_DB.prepare(`
    SELECT cf_country AS label, COUNT(*) AS c
    FROM whatsapp_leads
    WHERE clicked_at >= ${since} AND cf_country IS NOT NULL AND cf_country <> ''
    GROUP BY cf_country
    ORDER BY c DESC
    LIMIT 1
  `).first();
  const visitors = Number(totals?.visitors || 0);
  const pageviews = Number(totals?.pageviews || 0);
  const clicks = Number(totals?.clicks || 0);
  const newVisitors = Number(split?.new_visitors || 0);
  const returningVisitors = Number(split?.returning_visitors || 0);
  const conversion = pageviews > 0 ? Math.round(clicks / pageviews * 100) : 0;
  if (visitors === 0 && pageviews === 0 && clicks === 0) return;
  const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Bahrain"
  });
  const text = [
    `Vendora: Daily summary (${date})`,
    `Visitors: ${visitors} total \u2014 ${newVisitors} new, ${returningVisitors} returning`,
    `Page views: ${pageviews}`,
    `WhatsApp clicks: ${clicks}${pageviews > 0 ? ` (conversion ${conversion}%)` : ""}`,
    topPage && topPage.label ? `Top page: ${prettyRoute({ route_label: topPage.label })} (${Number(topPage.c || 0)} views)` : "",
    topCountry && topCountry.label ? `Top country: ${topCountry.label}` : "",
    "Open the admin dashboard for full details and evidence."
  ].filter(Boolean).join("\n");
  await fetch(resolveNtfyPublishUrl(url.toString(), env), {
    method: "POST",
    headers: buildNtfyHeaders(env, { title: "Vendora daily summary", priority: "low", tags: "bar_chart" }),
    body: text
  });
}
__name(sendDailySummary, "sendDailySummary");
function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText, "cleanText");
function cleanUrl(value) {
  const text = cleanText(value, 1200);
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
    const value = cleanText(request.headers.get(name), maxLength);
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
  const code = cleanText(value, 8);
  if (!code) return null;
  const normalized = code.toUpperCase();
  return normalized === "XX" ? null : normalized;
}
__name(normalizeCountryCode, "normalizeCountryCode");
function getRequestGeo(request) {
  const cf = request.cf || {};
  return {
    city: cleanText(cf.city, 120) || getHeaderValue(request, ["x-vercel-ip-city"], 120),
    region: cleanText(cf.region, 120) || cleanText(cf.regionCode, 120) || getHeaderValue(request, ["x-vercel-ip-country-region", "x-vercel-ip-country-region-name"], 120),
    country: normalizeCountryCode(cf.country) || normalizeCountryCode(getHeaderValue(request, ["cf-ipcountry", "x-vercel-ip-country", "x-appengine-country", "cloudfront-viewer-country"], 8)),
    timezone: cleanText(cf.timezone, 80) || getHeaderValue(request, ["x-vercel-ip-timezone"], 80),
    rayId: cleanText(request.headers.get("cf-ray"), 120) || getHeaderValue(request, ["x-request-id", "x-vercel-id"], 120)
  };
}
__name(getRequestGeo, "getRequestGeo");
function getPayloadValue(payload, key, maxLength) {
  return cleanText(payload && payload[key], maxLength);
}
__name(getPayloadValue, "getPayloadValue");
function safePayloadJson(payload) {
  const maxLength = 7e3;
  const text = JSON.stringify(payload);
  if (text.length <= maxLength) return text;
  const compact = { ...payload };
  [
    "referrer",
    "firstReferrer",
    "targetUrl",
    "pageUrl",
    "pageTitle",
    "clickText",
    "userAgent"
  ].forEach((key) => {
    if (typeof compact[key] === "string") {
      compact[key] = compact[key].slice(0, 240);
    }
  });
  const compactText = JSON.stringify(compact);
  if (compactText.length <= maxLength) return compactText;
  return JSON.stringify({
    timestamp: payload.timestamp,
    routeSlug: payload.routeSlug,
    routeLabel: payload.routeLabel,
    pagePath: payload.pagePath,
    targetUrl: payload.targetUrl,
    sessionId: payload.sessionId,
    visitorId: payload.visitorId,
    visitCount: payload.visitCount,
    sessionPageViews: payload.sessionPageViews,
    previousPagePath: payload.previousPagePath,
    trafficSource: payload.trafficSource,
    firstTrafficSource: payload.firstTrafficSource,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    deviceType: payload.deviceType,
    browserLanguage: payload.browserLanguage,
    platform: payload.platform,
    connectionType: payload.connectionType,
    timeOnPageMs: payload.timeOnPageMs,
    scrollDepthPercent: payload.scrollDepthPercent,
    serviceType: payload.serviceType
  });
}
__name(safePayloadJson, "safePayloadJson");
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
    cleanText(request.headers.get("user-agent"), 600),
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
    safePayloadJson(payload)
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
    return recordError(env, {
      source: "lead-api",
      severity: "error",
      message: `Lead insert failed: ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      pageUrl: cleanText(payload && payload.pageUrl, 1e3),
      pagePath: cleanText(payload && payload.pagePath, 400),
      context: `leadUuid=${leadUuid}`
    });
  });
  const notify = sendPhoneNotification(request, env, payload).catch((error) => {
    console.error(JSON.stringify({
      event: "transport_notify_failed",
      leadUuid,
      message: error && error.message ? error.message : String(error)
    }));
  });
  context.waitUntil(write);
  context.waitUntil(notify);
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

// functions/api/transport/admin.js
var ALLOWED_ORIGINS3 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES3 = 8192;
var MAX_LEADS_LIMIT = 1e3;
var VISITOR_ID_EXPR = "CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.visitorId'), '') ELSE NULL END";
var VISIT_COUNT_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.visitCount'), 1) AS INTEGER) ELSE 1 END";
var SESSION_PAGE_VIEWS_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.sessionPageViews'), 1) AS INTEGER) ELSE 1 END";
var TRAFFIC_SOURCE_EXPR = "COALESCE(NULLIF(utm_source, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.firstTrafficSource'), '') END, CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.trafficSource'), '') END, 'direct/unknown')";
var CAMPAIGN_EXPR = "COALESCE(NULLIF(utm_campaign, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.utmCampaign'), '') END, 'no campaign')";
var ADMIN_COLUMNS = [
  ["status", "ALTER TABLE whatsapp_leads ADD COLUMN status TEXT DEFAULT 'new'"],
  ["revenue", "ALTER TABLE whatsapp_leads ADD COLUMN revenue REAL DEFAULT 0"],
  ["admin_notes", "ALTER TABLE whatsapp_leads ADD COLUMN admin_notes TEXT"],
  ["driver_name", "ALTER TABLE whatsapp_leads ADD COLUMN driver_name TEXT"],
  ["driver_phone", "ALTER TABLE whatsapp_leads ADD COLUMN driver_phone TEXT"],
  ["quoted_price", "ALTER TABLE whatsapp_leads ADD COLUMN quoted_price REAL"],
  ["lost_reason", "ALTER TABLE whatsapp_leads ADD COLUMN lost_reason TEXT"],
  ["follow_up_at", "ALTER TABLE whatsapp_leads ADD COLUMN follow_up_at TEXT"],
  ["audit_updated_at", "ALTER TABLE whatsapp_leads ADD COLUMN audit_updated_at TEXT"]
];
var schemaReady = false;
var settingsSchemaReady2 = false;
var DEFAULT_NOTIFICATION_SETTINGS2 = {
  notifications_enabled: true,
  notify_whatsapp_clicks: true,
  // Off by default (Mode C): browsing does not ping the phone; only WhatsApp
  // clicks alert in real time, with the daily summary covering overall traffic.
  notify_pageviews: false,
  notify_contacted_updates: false,
  notify_completed_updates: true
};
function json3(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json3, "json");
function corsHeaders3(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS3.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-admin-token",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders3, "corsHeaders");
function cleanText2(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText2, "cleanText");
function cleanPrice(value) {
  if (value === null || value === void 0 || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1e5) return null;
  return Math.round(number * 1e3) / 1e3;
}
__name(cleanPrice, "cleanPrice");
function cleanStatus(value) {
  const status = cleanText2(value, 40);
  return ["new", "contacted", "completed", "cancelled", "spam"].includes(status) ? status : null;
}
__name(cleanStatus, "cleanStatus");
function boolToInt(value) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}
__name(boolToInt, "boolToInt");
function cleanDate(value) {
  const text = cleanText2(value, 32);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}
__name(cleanDate, "cleanDate");
function cleanDateTime(value) {
  const text = cleanText2(value, 64);
  if (!text) return null;
  return /^[0-9T: .+\-Z]+$/.test(text) ? text : null;
}
__name(cleanDateTime, "cleanDateTime");
async function parseJsonBody3(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES3) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES3) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody3, "parseJsonBody");
async function sha256Bytes(value) {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return new Uint8Array(digest);
}
__name(sha256Bytes, "sha256Bytes");
function timingSafeBytesEqual(a, b) {
  const maxLength = Math.max(a.length, b.length, 1);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLength; i += 1) {
    diff |= (a[i % a.length] || 0) ^ (b[i % b.length] || 0);
  }
  return diff === 0;
}
__name(timingSafeBytesEqual, "timingSafeBytesEqual");
async function timingSafeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const providedHash = await sha256Bytes(provided);
  const expectedHash = await sha256Bytes(expected);
  return timingSafeBytesEqual(providedHash, expectedHash);
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
    return json3({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  return null;
}
__name(requireDb, "requireDb");
async function ensureAdminSchema(env) {
  if (schemaReady) return;
  const table = await env.TRANSPORT_DB.prepare("PRAGMA table_info(whatsapp_leads)").all();
  const existing = new Set((table.results || []).map((row) => row.name));
  for (const [name, sql] of ADMIN_COLUMNS) {
    if (existing.has(name)) continue;
    try {
      await env.TRANSPORT_DB.prepare(sql).run();
    } catch (error) {
      if (!String(error.message || error).toLowerCase().includes("duplicate column")) {
        throw error;
      }
    }
  }
  schemaReady = true;
}
__name(ensureAdminSchema, "ensureAdminSchema");
async function ensureSettingsSchema2(env) {
  if (settingsSchemaReady2) return;
  await env.TRANSPORT_DB.prepare(`
    CREATE TABLE IF NOT EXISTS transport_admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `).run();
  settingsSchemaReady2 = true;
}
__name(ensureSettingsSchema2, "ensureSettingsSchema");
function boolSetting2(value, fallback = false) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "on", "enabled"].includes(text)) return true;
  if (["false", "no", "off", "disabled"].includes(text)) return false;
  return fallback;
}
__name(boolSetting2, "boolSetting");
async function getNotificationSettings2(env) {
  await ensureSettingsSchema2(env);
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT key, value
    FROM transport_admin_settings
    WHERE key IN (
      'notifications_enabled',
      'notify_whatsapp_clicks',
      'notify_pageviews',
      'notify_contacted_updates',
      'notify_completed_updates'
    )
  `).all();
  const saved = Object.fromEntries((results || []).map((row) => [row.key, row.value]));
  return Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_SETTINGS2).map(([key, fallback]) => [
    key,
    boolSetting2(saved[key], fallback)
  ]));
}
__name(getNotificationSettings2, "getNotificationSettings");
async function updateNotificationSettings(env, payload) {
  await ensureSettingsSchema2(env);
  const settings = {
    notifications_enabled: boolSetting2(payload.notifications_enabled, DEFAULT_NOTIFICATION_SETTINGS2.notifications_enabled),
    notify_whatsapp_clicks: boolSetting2(payload.notify_whatsapp_clicks, DEFAULT_NOTIFICATION_SETTINGS2.notify_whatsapp_clicks),
    notify_pageviews: boolSetting2(payload.notify_pageviews, DEFAULT_NOTIFICATION_SETTINGS2.notify_pageviews),
    notify_contacted_updates: boolSetting2(payload.notify_contacted_updates, DEFAULT_NOTIFICATION_SETTINGS2.notify_contacted_updates),
    notify_completed_updates: boolSetting2(payload.notify_completed_updates, DEFAULT_NOTIFICATION_SETTINGS2.notify_completed_updates)
  };
  for (const [key, value] of Object.entries(settings)) {
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO transport_admin_settings (key, value, updated_at)
      VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `).bind(key, value ? "true" : "false").run();
  }
  return json3({ ok: true, notification_settings: settings });
}
__name(updateNotificationSettings, "updateNotificationSettings");
async function sendTestNotification(env) {
  const webhookUrl = cleanText2(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
  if (!webhookUrl) {
    return json3({
      ok: false,
      configured: false,
      error: "No phone webhook is set. In Cloudflare, set the secret TRANSPORT_NOTIFY_WEBHOOK_URL to your private ntfy topic URL (e.g. https://ntfy.sh/your-secret-topic), then redeploy."
    });
  }
  let url;
  try {
    url = new URL(webhookUrl);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("bad protocol");
  } catch {
    return json3({ ok: false, configured: true, error: "The webhook secret is set but it is not a valid http(s) URL." });
  }
  const notifyToken = getNtfyToken(env);
  const ntfyHeaders = buildNtfyHeaders(env, {
    title: "Vendora GCC test alert",
    priority: "high",
    tags: "white_check_mark"
  });
  try {
    const publishUrl = resolveNtfyPublishUrl(url.toString(), env);
    const response = await fetch(publishUrl, {
      method: "POST",
      headers: ntfyHeaders,
      body: [
        "Vendora Transport: TEST ALERT",
        "Website: getvendora.net / GCC Transport",
        "If you can read this on your phone, alerts are working.",
        "Real page visits and WhatsApp booking clicks will arrive here the same way."
      ].join("\n")
    });
    const bodyText = response.ok ? "" : await response.text().catch(() => "");
    return json3({
      ok: response.ok,
      configured: true,
      auth_mode: notifyToken ? "bearer_token" : "anonymous",
      status: response.status,
      message: response.ok ? "Test alert sent. Check your phone / ntfy app now." : `The webhook responded with status ${response.status}. Check that the ntfy topic URL is correct.`,
      error: response.ok ? void 0 : `ntfy/webhook returned status ${response.status}. ${String(bodyText).slice(0, 300)}`.trim()
    });
  } catch (error) {
    return json3({
      ok: false,
      configured: true,
      error: `Webhook is set but the test send failed: ${error && error.message ? error.message : String(error)}`
    });
  }
}
__name(sendTestNotification, "sendTestNotification");
function eventClause(eventType) {
  if (eventType === "lead") return "COALESCE(service_type, '') <> 'pageview'";
  if (eventType === "pageview") return "COALESCE(service_type, '') = 'pageview'";
  return "";
}
__name(eventClause, "eventClause");
function buildLeadFilters(url, options = {}) {
  const clauses = [];
  const bindings = [];
  const eventSql = eventClause(options.eventType);
  if (eventSql) clauses.push(eventSql);
  const filters = [
    ["route_slug", cleanText2(url.searchParams.get("route"), 160)],
    ["device_type", cleanText2(url.searchParams.get("device"), 40)],
    ["cf_country", cleanText2(url.searchParams.get("country"), 8)]
  ];
  filters.forEach(([column, value]) => {
    if (!value) return;
    clauses.push(`${column} = ?`);
    bindings.push(value);
  });
  const source = cleanText2(url.searchParams.get("source"), 120);
  if (source) {
    clauses.push(`${TRAFFIC_SOURCE_EXPR} = ?`);
    bindings.push(source);
  }
  const campaign = cleanText2(url.searchParams.get("campaign"), 160);
  if (campaign) {
    clauses.push(`${CAMPAIGN_EXPR} = ?`);
    bindings.push(campaign);
  }
  const status = cleanStatus(url.searchParams.get("status"));
  if (status && options.eventType !== "pageview") {
    clauses.push("COALESCE(status, 'new') = ?");
    bindings.push(status);
  }
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
  const search = cleanText2(url.searchParams.get("search"), 120);
  if (search) {
    clauses.push(`(
      route_label LIKE ?
      OR route_slug LIKE ?
      OR page_path LIKE ?
      OR utm_source LIKE ?
      OR utm_campaign LIKE ?
      OR cf_city LIKE ?
      OR cf_country LIKE ?
      OR lead_uuid LIKE ?
      OR session_id LIKE ?
      OR ip_address LIKE ?
      OR admin_notes LIKE ?
      OR driver_name LIKE ?
      OR driver_phone LIKE ?
      OR raw_payload LIKE ?
    )`);
    const like = `%${search}%`;
    bindings.push(like, like, like, like, like, like, like, like, like, like, like, like, like, like);
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
function leadSelectSql() {
  const suspicionSql = `min(100,
    (CASE WHEN COALESCE(time_on_page_ms, 0) >= 60000 THEN 20 ELSE 0 END) +
    (CASE WHEN COALESCE(scroll_depth_percent, 0) >= 70 THEN 20 ELSE 0 END) +
    (CASE WHEN COALESCE(${SESSION_PAGE_VIEWS_EXPR}, 1) >= 3 THEN 20 ELSE 0 END) +
    (CASE WHEN COALESCE(${VISIT_COUNT_EXPR}, 1) >= 2 THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(revenue, 0) = 0 AND COALESCE(status, 'new') IN ('new', 'spam') THEN 25 ELSE 0 END)
  )`;
  return `
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
    viewport_width,
    viewport_height,
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
    COALESCE(status, 'new') AS status,
    COALESCE(revenue, 0) AS revenue,
    admin_notes,
    driver_name,
    driver_phone,
    quoted_price,
    lost_reason,
    follow_up_at,
    audit_updated_at,
    ${VISITOR_ID_EXPR} AS visitor_id,
    COALESCE(${VISIT_COUNT_EXPR}, 1) AS visit_count,
    COALESCE(${SESSION_PAGE_VIEWS_EXPR}, 1) AS session_page_views,
    ${suspicionSql} AS suspicion_score,
    raw_payload
  `;
}
__name(leadSelectSql, "leadSelectSql");
async function getEventRows(env, request, eventType) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") || 100);
  const limit = Math.max(1, Math.min(MAX_LEADS_LIMIT, Number.isFinite(limitParam) ? Math.round(limitParam) : 100));
  const { whereSql, bindings } = buildLeadFilters(url, { eventType });
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT ${leadSelectSql()}
    FROM whatsapp_leads
    ${whereSql}
    ORDER BY clicked_at DESC
    LIMIT ?
  `).bind(...bindings, limit).all();
  return { leads: results || [] };
}
__name(getEventRows, "getEventRows");
function mergeDayRows(clickRows = [], pageviewRows = []) {
  const map = /* @__PURE__ */ new Map();
  for (const row of pageviewRows) {
    const label = row.label;
    map.set(label, { label, count: 0, pageviews: Number(row.count || 0) });
  }
  for (const row of clickRows) {
    const label = row.label;
    const current = map.get(label) || { label, count: 0, pageviews: 0 };
    current.count = Number(row.count || 0);
    map.set(label, current);
  }
  return [...map.values()].sort((a, b) => String(a.label).localeCompare(String(b.label))).slice(-14);
}
__name(mergeDayRows, "mergeDayRows");
function mergePerformanceRows(clickRows = [], pageviewRows = []) {
  const map = /* @__PURE__ */ new Map();
  for (const row of pageviewRows) {
    const label = row.label || "unknown";
    map.set(label, {
      label,
      count: 0,
      clicks: 0,
      pageviews: Number(row.count || 0),
      completed: 0,
      contacted: 0,
      cancelled: 0,
      spam: 0,
      revenue: 0
    });
  }
  for (const row of clickRows) {
    const label = row.label || "unknown";
    map.set(label, {
      label,
      count: Number(row.count || row.clicks || 0),
      clicks: Number(row.count || row.clicks || 0),
      pageviews: Number(map.get(label)?.pageviews || 0),
      completed: Number(row.completed || 0),
      contacted: Number(row.contacted || 0),
      cancelled: Number(row.cancelled || 0),
      spam: Number(row.spam || 0),
      revenue: Number(row.revenue || 0)
    });
  }
  return [...map.values()].sort((a, b) => b.clicks - a.clicks || b.pageviews - a.pageviews);
}
__name(mergePerformanceRows, "mergePerformanceRows");
async function getSummary(env, request) {
  const url = new URL(request.url);
  const leadFilters = buildLeadFilters(url, { eventType: "lead" });
  const pageviewFilters = buildLeadFilters(url, { eventType: "pageview" });
  const allFilters = buildLeadFilters(url, { eventType: "all" });
  const bindAll = /* @__PURE__ */ __name((filter, sql) => env.TRANSPORT_DB.prepare(sql).bind(...filter.bindings).all(), "bindAll");
  const bindFirst = /* @__PURE__ */ __name((filter, sql) => env.TRANSPORT_DB.prepare(sql).bind(...filter.bindings).first(), "bindFirst");
  const leadTotals = await bindFirst(leadFilters, `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN date(clicked_at, '+3 hours') = date('now', '+3 hours') THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') THEN 1 ELSE 0 END) AS last_7_days,
      MAX(clicked_at) AS last_click,
      COUNT(DISTINCT session_id) AS sessions,
      ROUND(AVG(time_on_page_ms)) AS avg_time_on_page_ms,
      ROUND(AVG(scroll_depth_percent)) AS avg_scroll_depth_percent,
      SUM(CASE WHEN COALESCE(status, 'new') = 'new' THEN 1 ELSE 0 END) AS new_count,
      SUM(CASE WHEN COALESCE(status, 'new') = 'contacted' THEN 1 ELSE 0 END) AS contacted_count,
      SUM(CASE WHEN COALESCE(status, 'new') = 'completed' THEN 1 ELSE 0 END) AS completed_count,
      SUM(CASE WHEN COALESCE(status, 'new') = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
      SUM(CASE WHEN COALESCE(status, 'new') = 'spam' THEN 1 ELSE 0 END) AS spam_count,
      ROUND(SUM(COALESCE(revenue, 0)), 3) AS total_revenue,
      ROUND(AVG(NULLIF(COALESCE(revenue, 0), 0)), 3) AS avg_completed_revenue,
      SUM(CASE WHEN follow_up_at IS NOT NULL AND follow_up_at <> '' AND follow_up_at <= strftime('%Y-%m-%dT%H:%M:%SZ', 'now') THEN 1 ELSE 0 END) AS followups_due
    FROM whatsapp_leads
    ${leadFilters.whereSql}
  `);
  const pageviewTotals = await bindFirst(pageviewFilters, `
    SELECT
      COUNT(*) AS total_pageviews,
      SUM(CASE WHEN date(clicked_at, '+3 hours') = date('now', '+3 hours') THEN 1 ELSE 0 END) AS pageviews_today,
      COUNT(DISTINCT session_id) AS pageview_sessions,
      ROUND(AVG(time_on_page_ms)) AS avg_pageview_time_ms
    FROM whatsapp_leads
    ${pageviewFilters.whereSql}
  `);
  const visitorTotals = await bindFirst(allFilters, `
    SELECT
      COUNT(DISTINCT visitor_id) AS total_visitors,
      COUNT(DISTINCT CASE WHEN sessions > 1 OR max_visit_count > 1 THEN visitor_id END) AS returning_visitors,
      SUM(CASE WHEN sessions > 1 OR max_visit_count > 1 THEN whatsapp_clicks ELSE 0 END) AS returning_clicks
    FROM (
      SELECT
        ${VISITOR_ID_EXPR} AS visitor_id,
        COUNT(DISTINCT session_id) AS sessions,
        MAX(COALESCE(${VISIT_COUNT_EXPR}, 1)) AS max_visit_count,
        SUM(CASE WHEN COALESCE(service_type, '') <> 'pageview' THEN 1 ELSE 0 END) AS whatsapp_clicks
      FROM whatsapp_leads
      ${allFilters.whereSql}
      GROUP BY ${VISITOR_ID_EXPR}
    )
    WHERE visitor_id IS NOT NULL
  `);
  const PERSON_KEY_EXPR = `COALESCE(${VISITOR_ID_EXPR}, session_id)`;
  const onlineTotals = await env.TRANSPORT_DB.prepare(`
    SELECT
      COUNT(DISTINCT ${PERSON_KEY_EXPR}) AS online_visitors,
      COUNT(DISTINCT session_id) AS online_sessions,
      COUNT(*) AS online_events
    FROM whatsapp_leads
    WHERE clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')
  `).first();
  const { results: onlineRecent } = await env.TRANSPORT_DB.prepare(`
    SELECT
      person_key,
      visitor_id,
      session_id,
      last_seen,
      page_path,
      route_label,
      route_slug,
      language,
      city,
      region,
      country,
      device_type,
      seconds_on_page,
      pages_viewed,
      whatsapp_clicks,
      CASE WHEN whatsapp_clicks > 0 THEN 1 ELSE 0 END AS clicked_whatsapp
    FROM (
      SELECT
        ${PERSON_KEY_EXPR} AS person_key,
        ${VISITOR_ID_EXPR} AS visitor_id,
        session_id,
        clicked_at AS last_seen,
        page_path,
        route_label,
        route_slug,
        language,
        cf_city AS city,
        cf_region AS region,
        cf_country AS country,
        device_type,
        ROUND(time_on_page_ms / 1000) AS seconds_on_page,
        SUM(CASE WHEN COALESCE(service_type, '') = 'pageview' THEN 1 ELSE 0 END) OVER (PARTITION BY ${PERSON_KEY_EXPR}) AS pages_viewed,
        SUM(CASE WHEN COALESCE(service_type, '') <> 'pageview' THEN 1 ELSE 0 END) OVER (PARTITION BY ${PERSON_KEY_EXPR}) AS whatsapp_clicks,
        ROW_NUMBER() OVER (PARTITION BY ${PERSON_KEY_EXPR} ORDER BY clicked_at DESC) AS rn
      FROM whatsapp_leads
      WHERE clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')
    )
    WHERE rn = 1
    ORDER BY last_seen DESC
    LIMIT 30
  `).all();
  const [
    { results: byRouteClicks },
    { results: byRoutePageviews },
    { results: bySource },
    { results: bySourcePageviews },
    { results: byCountry },
    { results: byDevice },
    { results: byDayClicks },
    { results: byDayPageviews },
    { results: byHour },
    { results: byCampaign },
    { results: byCampaignPageviews },
    { results: statusBreakdown },
    { results: topPages },
    { results: lostReasons },
    { results: repeatCustomers }
  ] = await Promise.all([
    bindAll(leadFilters, `
      SELECT
        COALESCE(NULLIF(route_slug, ''), 'unknown') AS label,
        COUNT(*) AS count,
        SUM(CASE WHEN COALESCE(status, 'new') = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN COALESCE(status, 'new') = 'contacted' THEN 1 ELSE 0 END) AS contacted,
        SUM(CASE WHEN COALESCE(status, 'new') = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN COALESCE(status, 'new') = 'spam' THEN 1 ELSE 0 END) AS spam,
        ROUND(SUM(COALESCE(revenue, 0)), 3) AS revenue
      FROM whatsapp_leads
      ${leadFilters.whereSql}
      GROUP BY COALESCE(NULLIF(route_slug, ''), 'unknown')
      ORDER BY count DESC
      LIMIT 20
    `),
    bindAll(pageviewFilters, `
      SELECT COALESCE(NULLIF(route_slug, ''), 'unknown') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${pageviewFilters.whereSql}
      GROUP BY COALESCE(NULLIF(route_slug, ''), 'unknown')
      ORDER BY count DESC
      LIMIT 20
    `),
    bindAll(leadFilters, `
      SELECT ${TRAFFIC_SOURCE_EXPR} AS label, COUNT(*) AS count,
        SUM(CASE WHEN COALESCE(status, 'new') = 'completed' THEN 1 ELSE 0 END) AS completed,
        ROUND(SUM(COALESCE(revenue, 0)), 3) AS revenue
      FROM whatsapp_leads
      ${leadFilters.whereSql}
      GROUP BY ${TRAFFIC_SOURCE_EXPR}
      ORDER BY count DESC
      LIMIT 20
    `),
    bindAll(pageviewFilters, `
      SELECT ${TRAFFIC_SOURCE_EXPR} AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${pageviewFilters.whereSql}
      GROUP BY ${TRAFFIC_SOURCE_EXPR}
      ORDER BY count DESC
      LIMIT 20
    `),
    bindAll(leadFilters, `
      SELECT COALESCE(NULLIF(cf_country, ''), 'unknown') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${leadFilters.whereSql}
      GROUP BY COALESCE(NULLIF(cf_country, ''), 'unknown')
      ORDER BY count DESC
      LIMIT 10
    `),
    bindAll(allFilters, `
      SELECT COALESCE(NULLIF(device_type, ''), 'unknown') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${allFilters.whereSql}
      GROUP BY COALESCE(NULLIF(device_type, ''), 'unknown')
      ORDER BY count DESC
      LIMIT 10
    `),
    bindAll(leadFilters, `
      SELECT date(clicked_at, '+3 hours') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${leadFilters.whereSql}
      GROUP BY date(clicked_at, '+3 hours')
      ORDER BY label DESC
      LIMIT 14
    `),
    bindAll(pageviewFilters, `
      SELECT date(clicked_at, '+3 hours') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${pageviewFilters.whereSql}
      GROUP BY date(clicked_at, '+3 hours')
      ORDER BY label DESC
      LIMIT 14
    `),
    bindAll(leadFilters, `
      SELECT strftime('%H', clicked_at, '+3 hours') || ':00' AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${leadFilters.whereSql}
      GROUP BY strftime('%H', clicked_at, '+3 hours')
      ORDER BY label ASC
    `),
    bindAll(leadFilters, `
      SELECT ${CAMPAIGN_EXPR} AS label, COUNT(*) AS count,
        SUM(CASE WHEN COALESCE(status, 'new') = 'completed' THEN 1 ELSE 0 END) AS completed,
        ROUND(SUM(COALESCE(revenue, 0)), 3) AS revenue
      FROM whatsapp_leads
      ${leadFilters.whereSql}
      GROUP BY ${CAMPAIGN_EXPR}
      ORDER BY count DESC
      LIMIT 20
    `),
    bindAll(pageviewFilters, `
      SELECT ${CAMPAIGN_EXPR} AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${pageviewFilters.whereSql}
      GROUP BY ${CAMPAIGN_EXPR}
      ORDER BY count DESC
      LIMIT 20
    `),
    bindAll(leadFilters, `
      SELECT COALESCE(status, 'new') AS label, COUNT(*) AS count, ROUND(SUM(COALESCE(revenue, 0)), 3) AS revenue
      FROM whatsapp_leads
      ${leadFilters.whereSql}
      GROUP BY COALESCE(status, 'new')
      ORDER BY count DESC
    `),
    bindAll(pageviewFilters, `
      SELECT COALESCE(NULLIF(page_path, ''), 'unknown') AS label,
        COUNT(*) AS count,
        COUNT(DISTINCT session_id) AS sessions,
        ROUND(AVG(time_on_page_ms)) AS avg_time_on_page_ms
      FROM whatsapp_leads
      ${pageviewFilters.whereSql}
      GROUP BY COALESCE(NULLIF(page_path, ''), 'unknown')
      ORDER BY count DESC
      LIMIT 12
    `),
    bindAll(leadFilters, `
      SELECT COALESCE(NULLIF(lost_reason, ''), 'not recorded') AS label, COUNT(*) AS count
      FROM whatsapp_leads
      ${leadFilters.whereSql} ${leadFilters.whereSql ? "AND" : "WHERE"} COALESCE(status, 'new') = 'cancelled'
      GROUP BY COALESCE(NULLIF(lost_reason, ''), 'not recorded')
      ORDER BY count DESC
      LIMIT 10
    `),
    bindAll(allFilters, `
      WITH events AS (
        SELECT
          ${VISITOR_ID_EXPR} AS visitor_id,
          clicked_at,
          COALESCE(service_type, '') AS service_type,
          COALESCE(status, 'new') AS status,
          COALESCE(revenue, 0) AS revenue,
          cf_city AS city,
          cf_country AS country,
          session_id,
          COALESCE(${VISIT_COUNT_EXPR}, 1) AS visit_count
        FROM whatsapp_leads
        ${allFilters.whereSql}
      )
      SELECT
        visitor_id,
        COUNT(DISTINCT session_id) AS visits,
        SUM(CASE WHEN service_type = 'pageview' THEN 1 ELSE 0 END) AS pageviews,
        SUM(CASE WHEN service_type <> 'pageview' THEN 1 ELSE 0 END) AS whatsapp_clicks,
        MAX(clicked_at) AS last_activity,
        MAX(city) AS city,
        MAX(country) AS country,
        CASE
          WHEN SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) > 0 THEN 'completed'
          WHEN SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) > 0 THEN 'contacted'
          WHEN SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) > 0 THEN 'cancelled'
          WHEN SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) > 0 THEN 'spam'
          ELSE 'new'
        END AS status,
        ROUND(SUM(revenue), 3) AS revenue
      FROM events
      WHERE visitor_id IS NOT NULL
      GROUP BY visitor_id
      HAVING COUNT(DISTINCT session_id) > 1
        OR SUM(CASE WHEN service_type = 'pageview' THEN 1 ELSE 0 END) > 1
        OR SUM(CASE WHEN service_type <> 'pageview' THEN 1 ELSE 0 END) > 0
      ORDER BY last_activity DESC
      LIMIT 50
    `)
  ]);
  const byRoute = mergePerformanceRows(byRouteClicks || [], byRoutePageviews || []).slice(0, 10);
  const byCampaignMerged = mergePerformanceRows(byCampaign || [], byCampaignPageviews || []).slice(0, 10);
  const bySourceMerged = mergePerformanceRows(bySource || [], bySourcePageviews || []).slice(0, 10);
  return {
    summary: {
      ...leadTotals || {},
      ...pageviewTotals || {},
      ...visitorTotals || {},
      total: leadTotals?.total || 0,
      today: leadTotals?.today || 0,
      total_pageviews: pageviewTotals?.total_pageviews || 0,
      pageviews_today: pageviewTotals?.pageviews_today || 0,
      online_now: onlineTotals?.online_visitors || 0,
      online_sessions: onlineTotals?.online_sessions || 0,
      online_recent: onlineRecent || [],
      by_route: byRoute,
      by_source: bySourceMerged,
      by_campaign: byCampaignMerged,
      by_country: byCountry || [],
      by_device: byDevice || [],
      by_day: mergeDayRows(byDayClicks || [], byDayPageviews || []),
      by_hour: byHour || [],
      status_breakdown: statusBreakdown || [],
      top_pages: topPages || [],
      lost_reasons: lostReasons || [],
      repeat_customers: repeatCustomers || [],
      business_report: {
        route_performance: mergePerformanceRows(byRouteClicks || [], byRoutePageviews || []),
        campaign_performance: mergePerformanceRows(byCampaign || [], byCampaignPageviews || []),
        source_performance: mergePerformanceRows(bySource || [], bySourcePageviews || []),
        top_pages: topPages || [],
        status_breakdown: statusBreakdown || [],
        lost_reasons: lostReasons || []
      }
    }
  };
}
__name(getSummary, "getSummary");
async function getTrackingSummary(env, request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "24 hours";
  const sessionId = url.searchParams.get("session_id") || "";
  if (sessionId) {
    const { results: journey } = await env.TRANSPORT_DB.prepare(`
      SELECT event_id, visitor_id, session_id, created_at, page_path, event_name, event_label, button_text, target_url, referrer, ip_city, ip_country, device_type
      FROM analytics_events
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT 100
    `).bind(sessionId).all();
    return { session_id: sessionId, journey: journey || [] };
  }
  let since = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')";
  if (period === "today") {
    since = "strftime('%Y-%m-%dT00:00:00.000Z', 'now', '+3 hours')";
  } else if (period === "7_days") {
    since = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')";
  }
  const totals = await env.TRANSPORT_DB.prepare(`
    SELECT
      COUNT(DISTINCT visitor_id) AS visitors,
      SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event_name = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
      SUM(CASE WHEN event_name = 'phone_click' THEN 1 ELSE 0 END) AS phone_clicks,
      SUM(CASE WHEN event_name = 'ai_chat_open' THEN 1 ELSE 0 END) AS ai_chat_opens,
      SUM(CASE WHEN event_name = 'ai_chat_confirmed' THEN 1 ELSE 0 END) AS ai_chat_confirmations
    FROM analytics_events
    WHERE created_at >= ${since}
  `).first();
  const { results: topPages } = await env.TRANSPORT_DB.prepare(`
    SELECT page_path AS label, COUNT(*) AS count
    FROM analytics_events
    WHERE event_name = 'page_view' AND created_at >= ${since}
    GROUP BY page_path
    ORDER BY count DESC
    LIMIT 15
  `).all();
  const { results: topReferrers } = await env.TRANSPORT_DB.prepare(`
    SELECT COALESCE(NULLIF(referrer, ''), 'direct') AS label, COUNT(*) AS count
    FROM analytics_events
    WHERE event_name = 'page_view' AND created_at >= ${since}
    GROUP BY label
    ORDER BY count DESC
    LIMIT 15
  `).all();
  const { results: recentEvents } = await env.TRANSPORT_DB.prepare(`
    SELECT event_id, visitor_id, session_id, created_at, page_path, event_name, event_label, button_text, ip_city, ip_country
    FROM analytics_events
    ORDER BY created_at DESC
    LIMIT 50
  `).all();
  return {
    totals: totals || { visitors: 0, page_views: 0, whatsapp_clicks: 0, phone_clicks: 0, ai_chat_opens: 0, ai_chat_confirmations: 0 },
    top_pages: topPages || [],
    top_referrers: topReferrers || [],
    recent_events: recentEvents || []
  };
}
__name(getTrackingSummary, "getTrackingSummary");
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
async function updateLeadOutcome(env, payload) {
  const leadUuid = cleanText2(payload.lead_uuid || payload.leadUuid, 80);
  if (!leadUuid) {
    return json3({ ok: false, error: "lead_uuid is required" }, { status: 400 });
  }
  const status = cleanStatus(payload.status) || "new";
  const revenue = cleanPrice(payload.revenue) ?? 0;
  const quotedPrice = cleanPrice(payload.quoted_price ?? payload.quotedPrice);
  const adminNotes = cleanText2(payload.admin_notes || payload.adminNotes, 2e3);
  const driverName = cleanText2(payload.driver_name || payload.driverName, 160);
  const driverPhone = cleanText2(payload.driver_phone || payload.driverPhone, 80);
  const lostReason = cleanText2(payload.lost_reason || payload.lostReason, 160);
  const followUpAt = cleanDateTime(payload.follow_up_at || payload.followUpAt);
  const result = await env.TRANSPORT_DB.prepare(`
    UPDATE whatsapp_leads
    SET
      status = ?,
      revenue = ?,
      admin_notes = ?,
      driver_name = ?,
      driver_phone = ?,
      quoted_price = ?,
      lost_reason = ?,
      follow_up_at = ?,
      audit_updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE lead_uuid = ?
  `).bind(
    status,
    revenue,
    adminNotes,
    driverName,
    driverPhone,
    quotedPrice,
    lostReason,
    followUpAt,
    leadUuid
  ).run();
  return json3({ ok: true, lead_uuid: leadUuid, changes: result.meta?.changes || 0 });
}
__name(updateLeadOutcome, "updateLeadOutcome");
async function upsertRoute(env, payload) {
  const routeSlug = cleanText2(payload.route_slug || payload.routeSlug, 160);
  if (!routeSlug) {
    return json3({ ok: false, error: "route_slug is required" }, { status: 400 });
  }
  const priceBd = cleanPrice(payload.price_bd ?? payload.priceBD);
  const isVisible = boolToInt(payload.is_visible ?? payload.is_live ?? payload.isLive);
  const routeNameAr = cleanText2(payload.route_name_ar || payload.routeNameAr, 240) || routeSlug;
  const routeNameEn = cleanText2(payload.route_name_en || payload.routeNameEn, 240) || routeSlug;
  const originCountry = cleanText2(payload.origin_country || payload.originCountry, 120);
  const originCity = cleanText2(payload.origin_city || payload.originCity, 120);
  const destinationCountry = cleanText2(payload.destination_country || payload.destinationCountry, 120);
  const destinationCity = cleanText2(payload.destination_city || payload.destinationCity, 120);
  const notesAr = cleanText2(payload.notes_ar || payload.notesAr, 800);
  const notesEn = cleanText2(payload.notes_en || payload.notesEn, 800);
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
  return json3({ ok: true, route_slug: routeSlug, changes: result.meta?.changes || 0 });
}
__name(upsertRoute, "upsertRoute");
async function deleteLead(env, request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") || 0);
  const uuid = cleanText2(url.searchParams.get("lead_uuid"), 80);
  if (!id && !uuid) {
    return json3({ ok: false, error: "id or lead_uuid is required" }, { status: 400 });
  }
  const result = id ? await env.TRANSPORT_DB.prepare("DELETE FROM whatsapp_leads WHERE id = ?").bind(id).run() : await env.TRANSPORT_DB.prepare("DELETE FROM whatsapp_leads WHERE lead_uuid = ?").bind(uuid).run();
  return json3({ ok: true, deleted: result.meta?.changes || 0 });
}
__name(deleteLead, "deleteLead");
var BULK_FILTER_KEYS = ["route", "device", "country", "source", "campaign", "status", "from", "to", "search", "min_seconds", "max_seconds"];
function hasMeaningfulFilter(url) {
  return BULK_FILTER_KEYS.some((key) => cleanText2(url.searchParams.get(key), 200));
}
__name(hasMeaningfulFilter, "hasMeaningfulFilter");
function resolveEventType(value) {
  const event = String(value || "all").toLowerCase();
  if (["visits", "visit", "pageview", "pageviews"].includes(event)) return "pageview";
  if (["clicks", "click", "lead", "leads"].includes(event)) return "lead";
  return "all";
}
__name(resolveEventType, "resolveEventType");
async function deleteBulkEvents(env, request) {
  const url = new URL(request.url);
  const eventType = resolveEventType(url.searchParams.get("event"));
  const confirmAll = ["1", "true", "yes", "all"].includes(String(url.searchParams.get("confirm") || "").toLowerCase());
  if (!hasMeaningfulFilter(url) && !confirmAll) {
    return json3({
      ok: false,
      error: "Add at least one filter (date range, route, search, etc.) before bulk deleting, or pass confirm=all to clear everything."
    }, { status: 400 });
  }
  const { whereSql, bindings } = buildLeadFilters(url, { eventType });
  const result = await env.TRANSPORT_DB.prepare(`DELETE FROM whatsapp_leads ${whereSql}`).bind(...bindings).run();
  return json3({ ok: true, deleted: result.meta?.changes || 0, event_type: eventType });
}
__name(deleteBulkEvents, "deleteBulkEvents");
async function getErrors(env, request) {
  await ensureErrorSchema(env);
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") || 200);
  const limit = Math.max(1, Math.min(1e3, Number.isFinite(limitParam) ? Math.round(limitParam) : 200));
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT id, created_at, source, severity, message, stack, page_url, page_path, user_agent, ip_address, cf_country, context
    FROM transport_error_log
    ORDER BY id DESC
    LIMIT ?
  `).bind(limit).all();
  return { errors: results || [] };
}
__name(getErrors, "getErrors");
async function deleteErrors(env, request) {
  await ensureErrorSchema(env);
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") || 0);
  const result = id ? await env.TRANSPORT_DB.prepare("DELETE FROM transport_error_log WHERE id = ?").bind(id).run() : await env.TRANSPORT_DB.prepare("DELETE FROM transport_error_log").run();
  return json3({ ok: true, deleted: result.meta?.changes || 0 });
}
__name(deleteErrors, "deleteErrors");
async function onRequestOptions3(context) {
  return new Response(null, { status: 204, headers: corsHeaders3(context.request) });
}
__name(onRequestOptions3, "onRequestOptions");
async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders3(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json3({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "leads";
  try {
    await ensureAdminSchema(env);
    const data = resource === "routes" ? await getRoutes(env) : resource === "summary" ? await getSummary(env, request) : resource === "notification-settings" ? { notification_settings: await getNotificationSettings2(env) } : resource === "errors" ? await getErrors(env, request) : resource === "tracking" ? await getTrackingSummary(env, request) : resource === "pageviews" ? await getEventRows(env, request, "pageview") : await getEventRows(env, request, "lead");
    return json3({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_get_failed", message: error.message }));
    context.waitUntil(recordError(env, {
      source: "admin-api",
      severity: "error",
      message: `Admin GET failed (resource=${resource}): ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url
    }));
    return json3({ ok: false, error: "Failed to load admin data" }, { status: 500, headers });
  }
}
__name(onRequestGet, "onRequestGet");
async function onRequestPost3(context) {
  return handleAdminWrite(context);
}
__name(onRequestPost3, "onRequestPost");
async function onRequestPut(context) {
  return handleAdminWrite(context);
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete(context) {
  const { request, env } = context;
  const headers = corsHeaders3(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json3({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  const mode = url.searchParams.get("mode") || "";
  try {
    await ensureAdminSchema(env);
    let response;
    if (resource === "errors") {
      response = await deleteErrors(env, request);
    } else if (resource === "bulk" || mode === "bulk") {
      response = await deleteBulkEvents(env, request);
    } else {
      response = await deleteLead(env, request);
    }
    return json3(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_delete_failed", message: error.message }));
    context.waitUntil(recordError(env, {
      source: "admin-api",
      severity: "error",
      message: `Admin DELETE failed: ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url
    }));
    return json3({ ok: false, error: "Failed to delete record" }, { status: 500, headers });
  }
}
__name(onRequestDelete, "onRequestDelete");
async function handleAdminWrite(context) {
  const { request, env } = context;
  const headers = corsHeaders3(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json3({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody3(request);
  } catch {
    return json3({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  try {
    await ensureAdminSchema(env);
    const response = resource === "lead" ? await updateLeadOutcome(env, payload) : resource === "notification-settings" ? await updateNotificationSettings(env, payload) : resource === "test-notification" ? await sendTestNotification(env) : await upsertRoute(env, payload);
    return json3(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_write_failed", message: error.message }));
    context.waitUntil(recordError(env, {
      source: "admin-api",
      severity: "error",
      message: `Admin WRITE failed (resource=${resource}): ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url
    }));
    return json3({ ok: false, error: "Failed to save admin data" }, { status: 500, headers });
  }
}
__name(handleAdminWrite, "handleAdminWrite");
async function onRequest3(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions3(context);
  if (method === "GET") return onRequestGet(context);
  if (method === "POST") return onRequestPost3(context);
  if (method === "PUT") return onRequestPut(context);
  if (method === "DELETE") return onRequestDelete(context);
  return json3({ ok: false, error: "Method not allowed" }, {
    status: 405,
    headers: corsHeaders3(context.request)
  });
}
__name(onRequest3, "onRequest");

// functions/api/transport/ai-chat.js
var ai_chat_exports = {};
__export(ai_chat_exports, {
  onRequest: () => onRequest4,
  onRequestOptions: () => onRequestOptions4,
  onRequestPost: () => onRequestPost4
});
var ALLOWED_ORIGINS4 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES4 = 32768;
var DEFAULT_WHATSAPP_NUMBER = "97333225954";
var DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
var MAX_HISTORY_MESSAGES = 24;
var REQUIRED_FIELDS = [
  "service",
  "name",
  "phone",
  "pickup",
  "dropoff",
  "date",
  "time",
  "passengers",
  "cargo",
  "tripType"
];
var PRICE_DISCLAIMER_EN = "Final price will be confirmed by the transport team based on route, time, and availability.";
var PRICE_DISCLAIMER_AR = "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u064A\u062A\u0645 \u062A\u0623\u0643\u064A\u062F\u0647 \u0645\u0646 \u0641\u0631\u064A\u0642 \u0627\u0644\u0646\u0642\u0644 \u062D\u0633\u0628 \u062E\u0637 \u0627\u0644\u0631\u062D\u0644\u0629 \u0648\u0627\u0644\u0648\u0642\u062A \u0648\u0627\u0644\u062A\u0648\u0641\u0631.";
function json4(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json4, "json");
function corsHeaders4(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS4.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders4, "corsHeaders");
function cleanText3(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText3, "cleanText");
async function parseJsonBody4(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES4) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES4) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody4, "parseJsonBody");
function normalizeLanguage(value) {
  const lang = String(value || "").toLowerCase().trim();
  if (["ar", "arabic", "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"].includes(lang)) return "ar";
  if (["en", "english"].includes(lang)) return "en";
  if (["ur", "urdu", "hi", "hindi", "ur-en", "roman-urdu"].includes(lang)) return "ur-en";
  if (["simple", "simple-en", "easy"].includes(lang)) return "simple-en";
  return "en";
}
__name(normalizeLanguage, "normalizeLanguage");
function pickModel(env) {
  const fromEnv = cleanText3(env.TRANSPORT_AI_MODEL, 120);
  return fromEnv || DEFAULT_MODEL;
}
__name(pickModel, "pickModel");
function hasAiBinding(env) {
  return Boolean(env && env.AI && typeof env.AI.run === "function");
}
__name(hasAiBinding, "hasAiBinding");
function sanitizeExtractedFields(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  const map = {
    service: 80,
    serviceLabel: 120,
    name: 80,
    phone: 40,
    pickup: 160,
    dropoff: 160,
    date: 32,
    time: 32,
    passengers: 8,
    cargo: 200,
    tripType: 40,
    language: 20
  };
  for (const [key, max] of Object.entries(map)) {
    const v = raw[key];
    if (v === null || v === void 0 || v === "") continue;
    if (key === "passengers") {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 1 && n <= 20) out.passengers = Math.round(n);
      continue;
    }
    const t = cleanText3(String(v), max);
    if (t) out[key] = t;
  }
  if (out.language) out.language = normalizeLanguage(out.language);
  return out;
}
__name(sanitizeExtractedFields, "sanitizeExtractedFields");
function mergeDetails(existing, extracted) {
  const details = { ...existing || {} };
  for (const [key, value] of Object.entries(extracted)) {
    if (value !== null && value !== void 0 && value !== "") details[key] = value;
  }
  return details;
}
__name(mergeDetails, "mergeDetails");
function listMissingFields(details) {
  return REQUIRED_FIELDS.filter((key) => {
    const v = details[key];
    return v === null || v === void 0 || v === "";
  });
}
__name(listMissingFields, "listMissingFields");
function computeLeadStatus(details, customerConfirmed) {
  const missing = listMissingFields(details);
  if (customerConfirmed && missing.length === 0) return { status: "confirmed", missing };
  if (missing.length === 0) return { status: "ready_to_confirm", missing };
  if (Object.keys(details).length <= 1) return { status: "new", missing };
  return { status: "collecting_details", missing };
}
__name(computeLeadStatus, "computeLeadStatus");
function buildBookingSummary(details, lang) {
  return {
    service: details.serviceLabel || details.service || "",
    name: details.name || "",
    phone: details.phone || "",
    pickup: details.pickup || "",
    dropoff: details.dropoff || "",
    date: details.date || "",
    time: details.time || "",
    passengers: details.passengers || "",
    cargo: details.cargo || "",
    tripType: details.tripType || "",
    language: details.language || lang,
    priceNote: lang === "ar" ? PRICE_DISCLAIMER_AR : PRICE_DISCLAIMER_EN
  };
}
__name(buildBookingSummary, "buildBookingSummary");
function buildWhatsappMessage(details, lang) {
  const summary = buildBookingSummary(details, lang);
  if (lang === "ar") {
    return [
      "\u0645\u0631\u062D\u0628\u0627\u064B\u060C \u0623\u0631\u064A\u062F \u062A\u0623\u0643\u064A\u062F \u062D\u062C\u0632 \u0627\u0644\u0646\u0642\u0644.",
      `\u0627\u0644\u0627\u0633\u0645: ${summary.name}`,
      `\u0627\u0644\u0631\u0642\u0645: ${summary.phone}`,
      `\u0627\u0644\u062E\u062F\u0645\u0629: ${summary.service}`,
      `\u0627\u0644\u0627\u0644\u062A\u0642\u0627\u0637: ${summary.pickup}`,
      `\u0627\u0644\u0648\u0635\u0648\u0644: ${summary.dropoff}`,
      `\u0627\u0644\u062A\u0627\u0631\u064A\u062E: ${summary.date}`,
      `\u0627\u0644\u0648\u0642\u062A: ${summary.time}`,
      `\u0639\u062F\u062F \u0627\u0644\u0631\u0643\u0627\u0628: ${summary.passengers}`,
      `\u0627\u0644\u0623\u0645\u062A\u0639\u0629/\u0627\u0644\u0637\u0631\u062F: ${summary.cargo}`,
      `\u0627\u0644\u0631\u062D\u0644\u0629: ${summary.tripType}`,
      "",
      PRICE_DISCLAIMER_AR
    ].join("\n");
  }
  return [
    "Hello, I would like to confirm a transport booking.",
    `Name: ${summary.name}`,
    `Phone: ${summary.phone}`,
    `Service: ${summary.service}`,
    `Pickup: ${summary.pickup}`,
    `Drop-off: ${summary.dropoff}`,
    `Date: ${summary.date}`,
    `Time: ${summary.time}`,
    `Passengers: ${summary.passengers}`,
    `Luggage/Parcel: ${summary.cargo}`,
    `Trip: ${summary.tripType}`,
    "",
    PRICE_DISCLAIMER_EN
  ].join("\n");
}
__name(buildWhatsappMessage, "buildWhatsappMessage");
function buildHandover(details, lang) {
  const message = buildWhatsappMessage(details, lang);
  return {
    url: `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    phone: DEFAULT_WHATSAPP_NUMBER,
    message
  };
}
__name(buildHandover, "buildHandover");
function trimHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter((m) => m && (m.role === "user" || m.role === "assistant") && cleanText3(m.content, 1200)).slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role,
    content: cleanText3(m.content, 1200)
  }));
}
__name(trimHistory, "trimHistory");
function buildSystemPrompt(details) {
  const known = JSON.stringify(details || {}, null, 0);
  return `You are the Vendora GCC Transport booking assistant (Bahrain \u2194 Saudi and GCC).

BUSINESS: Private transport \u2014 Bahrain to Saudi/Khobar/Dammam/Riyadh/UAE/Kuwait, passenger transport, parcel delivery, airport pickup, private driver, King Fahd Causeway trips. WhatsApp handover only after customer clearly confirms; never auto-send.

BEHAVIOUR:
- Natural conversation in the customer's language (Arabic, English, Urdu/Hindi-style English, or simple English).
- Extract booking details from free text; do NOT run a rigid step-by-step form.
- Answer route/service questions briefly, then guide toward booking.
- Ask ONLY for missing important fields (never re-ask filled fields).
- NEVER promise a fixed price. If price is asked, use exactly:
  EN: "${PRICE_DISCLAIMER_EN}"
  AR: "${PRICE_DISCLAIMER_AR}"
- Set customerConfirmed true ONLY on clear booking confirmation (confirm / yes book / \u062A\u0623\u0643\u064A\u062F / \u0627\u062D\u062C\u0632).

FIELDS: service, serviceLabel, name, phone, pickup, dropoff, date, time, passengers, cargo, tripType, language.

KNOWN DETAILS SO FAR: ${known}

Reply with ONLY valid JSON (no markdown fences):
{
  "assistantMessage": "your natural reply to the customer",
  "detectedLanguage": "ar|en|ur-en|simple-en",
  "extractedFields": { },
  "customerConfirmed": false,
  "missingFields": []
}`;
}
__name(buildSystemPrompt, "buildSystemPrompt");
function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        return null;
      }
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
__name(extractJsonObject, "extractJsonObject");
async function runWorkersAi(env, messages, model) {
  const result = await env.AI.run(model, {
    messages,
    max_tokens: 900,
    temperature: 0.35
  });
  if (result && typeof result.response === "string") return result.response;
  if (typeof result === "string") return result;
  return JSON.stringify(result);
}
__name(runWorkersAi, "runWorkersAi");
function fallbackReply(lang, reason) {
  const messages = {
    en: `AI is not available (${reason}). Enable the Cloudflare Workers AI binding on this Worker to use the real chatbot.`,
    ar: `\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D (${reason}). \u0641\u0639\u0651\u0644 \u0631\u0628\u0637 Cloudflare Workers AI \u0639\u0644\u0649 \u0627\u0644\u0640 Worker \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629.`,
    "ur-en": `AI available nahi (${reason}). Cloudflare Workers AI binding enable karo.`,
    "simple-en": `AI not working (${reason}). Turn on Cloudflare Workers AI binding.`
  };
  return messages[lang] || messages.en;
}
__name(fallbackReply, "fallbackReply");
async function onRequestOptions4(context) {
  return new Response(null, { status: 204, headers: corsHeaders4(context.request) });
}
__name(onRequestOptions4, "onRequestOptions");
async function onRequestPost4(context) {
  const { request, env } = context;
  const headers = corsHeaders4(request);
  let payload;
  try {
    payload = await parseJsonBody4(request);
  } catch {
    return json4({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const incomingLead = payload && typeof payload.lead === "object" && payload.lead ? payload.lead : {};
  const message = cleanText3(payload.message, 1200) || "";
  const preferredLang = normalizeLanguage(
    payload.language || incomingLead.language || incomingLead.details?.language
  );
  const lead = {
    id: cleanText3(incomingLead.id, 80) || incomingLead.id || crypto.randomUUID(),
    createdAt: cleanText3(incomingLead.createdAt, 80) || incomingLead.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    language: preferredLang,
    status: cleanText3(incomingLead.status, 60) || "new",
    details: typeof incomingLead.details === "object" && incomingLead.details ? { ...incomingLead.details } : {},
    history: trimHistory(incomingLead.history)
  };
  const model = pickModel(env);
  const userContent = message === "start" || message === "__start__" ? "Customer opened the chat. Greet them and ask how you can help with GCC transport booking." : message;
  if (userContent) {
    lead.history.push({ role: "user", content: userContent });
  }
  if (!hasAiBinding(env)) {
    const replyText = fallbackReply(preferredLang, "AI binding missing");
    lead.history.push({ role: "assistant", content: replyText });
    return json4({
      ok: true,
      lead,
      reply: { text: replyText },
      status: lead.status,
      missingFields: listMissingFields(lead.details),
      extractedFields: lead.details,
      debug: {
        aiMode: "fallback only",
        model: null,
        detectedLanguage: preferredLang,
        extractedFields: lead.details,
        missingFields: listMissingFields(lead.details),
        leadStatus: lead.status,
        error: "env.AI binding not configured"
      }
    }, { headers });
  }
  let aiRaw;
  try {
    const messages = [
      { role: "system", content: buildSystemPrompt(lead.details) },
      ...lead.history.map((m) => ({ role: m.role, content: m.content }))
    ];
    aiRaw = await runWorkersAi(env, messages, model);
  } catch (error) {
    const replyText = fallbackReply(preferredLang, error && error.message ? error.message : "AI call failed");
    lead.history.push({ role: "assistant", content: replyText });
    return json4({
      ok: true,
      lead,
      reply: { text: replyText },
      status: lead.status,
      missingFields: listMissingFields(lead.details),
      extractedFields: lead.details,
      debug: {
        aiMode: "fallback only",
        model,
        detectedLanguage: preferredLang,
        extractedFields: lead.details,
        missingFields: listMissingFields(lead.details),
        leadStatus: lead.status,
        error: error && error.message ? error.message : String(error)
      }
    }, { headers });
  }
  const parsed = extractJsonObject(aiRaw);
  if (!parsed || typeof parsed.assistantMessage !== "string") {
    const replyText = fallbackReply(preferredLang, "could not parse AI JSON");
    lead.history.push({ role: "assistant", content: replyText });
    return json4({
      ok: true,
      lead,
      reply: { text: replyText },
      status: lead.status,
      missingFields: listMissingFields(lead.details),
      extractedFields: lead.details,
      debug: {
        aiMode: "fallback only",
        model,
        detectedLanguage: preferredLang,
        extractedFields: lead.details,
        missingFields: listMissingFields(lead.details),
        leadStatus: lead.status,
        error: "AI response was not valid JSON",
        aiRawPreview: String(aiRaw || "").slice(0, 400)
      }
    }, { headers });
  }
  const detectedLanguage = normalizeLanguage(parsed.detectedLanguage || preferredLang);
  const extracted = sanitizeExtractedFields(parsed.extractedFields || {});
  lead.details = mergeDetails(lead.details, extracted);
  lead.details.language = detectedLanguage;
  lead.language = detectedLanguage;
  const customerConfirmed = parsed.customerConfirmed === true || lead.details.confirmed === true;
  if (customerConfirmed) lead.details.confirmed = true;
  const { status, missing } = computeLeadStatus(lead.details, customerConfirmed);
  lead.status = status;
  const assistantMessage = cleanText3(parsed.assistantMessage, 2e3) || fallbackReply(detectedLanguage, "empty reply");
  lead.history.push({ role: "assistant", content: assistantMessage });
  const result = {
    ok: true,
    lead,
    reply: { text: assistantMessage },
    status: status === "confirmed" ? "Confirmed" : status,
    missingFields: missing,
    extractedFields: { ...lead.details },
    debug: {
      aiMode: "real Cloudflare Workers AI",
      model,
      detectedLanguage,
      extractedFields: { ...lead.details },
      missingFields: missing,
      leadStatus: status === "confirmed" ? "Confirmed" : status
    }
  };
  if (status === "confirmed") {
    result.bookingSummary = buildBookingSummary(lead.details, detectedLanguage);
    result.whatsappMessage = buildWhatsappMessage(lead.details, detectedLanguage);
    result.handover = buildHandover(lead.details, detectedLanguage);
    lead.status = "confirmed";
    result.debug.leadStatus = "Confirmed";
  }
  return json4(result, { headers });
}
__name(onRequestPost4, "onRequestPost");
async function onRequest4(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions4(context);
  if (method === "POST") return onRequestPost4(context);
  return json4({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders4(context.request) });
}
__name(onRequest4, "onRequest");

// functions/api/transport/tracking.js
var tracking_exports = {};
__export(tracking_exports, {
  onRequest: () => onRequest5,
  onRequestOptions: () => onRequestOptions5,
  onRequestPost: () => onRequestPost5
});
var ALLOWED_ORIGINS5 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "null"
]);
var MAX_BODY_BYTES5 = 8192;
function json5(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json5, "json");
function corsHeaders5(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS5.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders5, "corsHeaders");
function cleanText4(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText4, "cleanText");
function cleanUrl2(value) {
  const text = cleanText4(value, 1200);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().slice(0, 1200);
  } catch {
    return null;
  }
}
__name(cleanUrl2, "cleanUrl");
function cleanInteger2(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1e5, Math.round(number)));
}
__name(cleanInteger2, "cleanInteger");
function normalizeCountryCode2(value) {
  const code = cleanText4(value, 8);
  if (!code) return null;
  const normalized = code.toUpperCase();
  return normalized === "XX" ? null : normalized;
}
__name(normalizeCountryCode2, "normalizeCountryCode");
function getRequestGeo2(request) {
  const cf = request.cf || {};
  return {
    city: cleanText4(cf.city, 120),
    region: cleanText4(cf.region, 120) || cleanText4(cf.regionCode, 120),
    country: normalizeCountryCode2(cf.country),
    timezone: cleanText4(cf.timezone, 80)
  };
}
__name(getRequestGeo2, "getRequestGeo");
async function parseJsonBody5(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES5) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES5) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody5, "parseJsonBody");
function safePayloadJson2(payload) {
  const compact = { ...payload };
  delete compact.chatMessage;
  delete compact.chatHistory;
  delete compact.inputData;
  return JSON.stringify(compact).slice(0, 4e3);
}
__name(safePayloadJson2, "safePayloadJson");
async function writeEventToDb(request, env, payload, eventId) {
  const geo = getRequestGeo2(request);
  const stmt = env.TRANSPORT_DB.prepare(`
    INSERT INTO analytics_events (
      event_id,
      visitor_id,
      session_id,
      created_at,
      page_url,
      page_path,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      event_name,
      event_category,
      event_label,
      route_name,
      button_text,
      target_url,
      language,
      device_type,
      user_agent,
      screen_width,
      screen_height,
      lead_status,
      ip_city,
      ip_region,
      ip_country,
      ip_timezone,
      raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt.bind(
    eventId,
    cleanText4(payload.visitor_id, 80) || "unknown_visitor",
    cleanText4(payload.session_id, 120) || "unknown_session",
    cleanText4(payload.created_at, 80) || (/* @__PURE__ */ new Date()).toISOString(),
    cleanUrl2(payload.page_url),
    cleanText4(payload.page_path, 300),
    cleanUrl2(payload.referrer),
    cleanText4(payload.utm_source, 120),
    cleanText4(payload.utm_medium, 120),
    cleanText4(payload.utm_campaign, 160),
    cleanText4(payload.event_name, 120) || "unknown_event",
    cleanText4(payload.event_category, 120),
    cleanText4(payload.event_label, 120),
    cleanText4(payload.route_name, 120),
    cleanText4(payload.button_text, 160),
    cleanUrl2(payload.target_url),
    cleanText4(payload.language, 20),
    cleanText4(payload.device_type, 40),
    cleanText4(request.headers.get("user-agent"), 600),
    cleanInteger2(payload.screen_width),
    cleanInteger2(payload.screen_height),
    cleanText4(payload.lead_status, 40),
    geo.city,
    geo.region,
    geo.country,
    geo.timezone,
    safePayloadJson2(payload)
  ).run();
}
__name(writeEventToDb, "writeEventToDb");
async function onRequestOptions5(context) {
  const { request } = context;
  return new Response(null, { status: 204, headers: corsHeaders5(request) });
}
__name(onRequestOptions5, "onRequestOptions");
async function onRequestPost5(context) {
  const { request, env } = context;
  const headers = corsHeaders5(request);
  if (!env.TRANSPORT_DB) {
    return json5({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody5(request);
  } catch {
    return json5({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const eventId = cleanText4(payload.event_id, 80) || crypto.randomUUID();
  const dbTask = writeEventToDb(request, env, payload, eventId).catch((error) => {
    console.error(JSON.stringify({
      event: "tracking_event_insert_failed",
      eventId,
      message: error && error.message ? error.message : String(error)
    }));
    return recordError(env, {
      source: "tracking-api",
      severity: "error",
      message: `Tracking insert failed: ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      pageUrl: cleanText4(payload.page_url, 1e3),
      pagePath: cleanText4(payload.page_path, 400),
      context: `eventId=${eventId}`
    });
  });
  context.waitUntil(dbTask);
  return json5({ ok: true, eventId }, { status: 202, headers });
}
__name(onRequestPost5, "onRequestPost");
async function onRequest5(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions5(context);
  if (method === "POST") return onRequestPost5(context);
  return json5({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders5(context.request) });
}
__name(onRequest5, "onRequest");

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
function transportHealthResponse() {
  return new Response(JSON.stringify({
    ok: true,
    service: "vendora-transport-api",
    routes: [
      "/api/transport/admin",
      "/api/transport/event",
      "/api/transport/ai-chat",
      "/api/transport/whatsapp-lead",
      "/api/transport/log"
    ]
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "authorization, content-type, x-admin-token"
    }
  });
}
__name(transportHealthResponse, "transportHealthResponse");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = logicalPathname(url);
    try {
      if (path === "/api/transport/health") {
        if (request.method.toUpperCase() === "OPTIONS") {
          return new Response(null, { status: 204, headers: transportHealthResponse().headers });
        }
        return transportHealthResponse();
      }
      if (path === "/api/transport/admin") {
        return await dispatchPagesFunction(admin_exports, request, env, ctx);
      }
      if (path === "/api/transport/event" || path === "/api/transport/whatsapp-lead") {
        return await dispatchPagesFunction(whatsapp_lead_exports, request, env, ctx);
      }
      if (path === "/api/transport/ai-chat") {
        return await dispatchPagesFunction(ai_chat_exports, request, env, ctx);
      }
      if (path === "/api/transport/log") {
        return await dispatchPagesFunction(error_log_exports, request, env, ctx);
      }
      if (path === "/api/track") {
        return await dispatchPagesFunction(tracking_exports, request, env, ctx);
      }
      return await env.ASSETS.fetch(request);
    } catch (error) {
      ctx.waitUntil(recordError(env, {
        source: "worker",
        severity: "fatal",
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
        pageUrl: request.url,
        pagePath: path,
        userAgent: request.headers.get("user-agent"),
        context: `method=${request.method}`
      }));
      if (path.startsWith("/api/transport/")) {
        return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
        });
      }
      throw error;
    }
  },
  // Cron trigger: send the once-a-day visitor/lead summary to the phone.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      sendDailySummary(env).catch((error) => recordError(env, {
        source: "cron",
        severity: "error",
        message: `Daily summary failed: ${error && error.message ? error.message : String(error)}`,
        stack: error && error.stack ? error.stack : null,
        context: `cron=${event && event.cron ? event.cron : "unknown"}`
      }))
    );
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

// .wrangler/tmp/bundle-9PNicU/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-9PNicU/middleware-loader.entry.ts
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
