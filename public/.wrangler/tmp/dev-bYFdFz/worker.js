var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// functions/api/transport/passenger-care.js
var passenger_care_exports = {};
__export(passenger_care_exports, {
  corsHeaders: () => corsHeaders,
  deletePassengerCareFeedback: () => deletePassengerCareFeedback,
  ensurePassengerCareSchema: () => ensurePassengerCareSchema,
  getPassengerCareAdminRows: () => getPassengerCareAdminRows,
  getPublicRouteReviews: () => getPublicRouteReviews,
  makeBookingRef: () => makeBookingRef,
  onRequest: () => onRequest,
  onRequestGet: () => onRequestGet,
  onRequestOptions: () => onRequestOptions,
  onRequestPost: () => onRequestPost,
  updatePassengerCareReviewApproval: () => updatePassengerCareReviewApproval
});
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "null"
]);
var MAX_BODY_BYTES = 4096;
var BOOKING_REF_RE = /^GCC-[A-F0-9]{8}$/i;
var OUTCOMES = /* @__PURE__ */ new Set([
  "completed",
  "cancelled",
  "no_driver",
  "no_response",
  "price_high",
  "other_transport"
]);
var STUB_ROUTE_SLUGS = /* @__PURE__ */ new Set(["passenger-care", "passenger-care-stub"]);
var NON_CLICK_SERVICE_TYPES = /* @__PURE__ */ new Set(["pageview", "passenger-care-pageview", "passenger-care-stub"]);
function isRealWhatsAppLead(row) {
  if (!row) return false;
  const serviceType = String(row.service_type || "").toLowerCase();
  const routeSlug = String(row.route_slug || "").toLowerCase();
  if (NON_CLICK_SERVICE_TYPES.has(serviceType)) return false;
  if (STUB_ROUTE_SLUGS.has(routeSlug)) return false;
  return true;
}
__name(isRealWhatsAppLead, "isRealWhatsAppLead");
function leadUuidFromBookingRef(bookingRef) {
  const hex = String(bookingRef || "").replace(/^GCC-/i, "").toLowerCase().padEnd(12, "0").slice(0, 12);
  return `${hex.slice(0, 8)}-0000-4000-8000-${hex.slice(0, 12)}`;
}
__name(leadUuidFromBookingRef, "leadUuidFromBookingRef");
var schemaReady = false;
var REVIEW_ROUTE_COLUMNS = [
  ["route_slug", "ALTER TABLE passenger_care_feedback ADD COLUMN route_slug TEXT"],
  ["route_label", "ALTER TABLE passenger_care_feedback ADD COLUMN route_label TEXT"],
  ["review_approved", "ALTER TABLE passenger_care_feedback ADD COLUMN review_approved INTEGER DEFAULT 0"],
  ["review_approved_at", "ALTER TABLE passenger_care_feedback ADD COLUMN review_approved_at TEXT"]
];
function makeBookingRef(leadUuid) {
  const hex = String(leadUuid || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  return hex ? `GCC-${hex}` : null;
}
__name(makeBookingRef, "makeBookingRef");
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
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
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
function cleanRating(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}
__name(cleanRating, "cleanRating");
function normalizeBookingRef(value) {
  const text2 = cleanText(value, 20);
  if (!text2) return null;
  const normalized = text2.toUpperCase();
  return BOOKING_REF_RE.test(normalized) ? normalized : null;
}
__name(normalizeBookingRef, "normalizeBookingRef");
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
    city: cleanText(cf.city, 120) || cleanText(request.headers.get("x-vercel-ip-city"), 120),
    country: normalizeCountryCode(cf.country) || normalizeCountryCode(request.headers.get("cf-ipcountry")) || normalizeCountryCode(request.headers.get("CF-IPCountry"))
  };
}
__name(getRequestGeo, "getRequestGeo");
async function hashIp(request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  if (!ip) return null;
  const data = new TextEncoder().encode(`vendora-passenger-care:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
__name(hashIp, "hashIp");
async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody, "parseJsonBody");
async function ensurePassengerCareSchema(env) {
  if (schemaReady || !env.TRANSPORT_DB) return;
  const table = await env.TRANSPORT_DB.prepare("PRAGMA table_info(whatsapp_leads)").all();
  const existing = new Set((table.results || []).map((row) => row.name));
  if (!existing.has("booking_ref")) {
    await env.TRANSPORT_DB.prepare("ALTER TABLE whatsapp_leads ADD COLUMN booking_ref TEXT").run();
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
  const feedbackInfo = await env.TRANSPORT_DB.prepare("PRAGMA table_info(passenger_care_feedback)").all();
  const feedbackColumns = new Set((feedbackInfo.results || []).map((row) => row.name));
  for (const [name, sql] of REVIEW_ROUTE_COLUMNS) {
    if (feedbackColumns.has(name)) continue;
    try {
      await env.TRANSPORT_DB.prepare(sql).run();
    } catch (error) {
      if (!String(error.message || error).toLowerCase().includes("duplicate column")) {
        throw error;
      }
    }
  }
  await env.TRANSPORT_DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_pcf_route_reviews
    ON passenger_care_feedback(route_slug, review_approved, submitted_at DESC)
  `).run();
  await env.TRANSPORT_DB.prepare(`
    UPDATE passenger_care_feedback
    SET
      route_slug = COALESCE(NULLIF(route_slug, ''), (
        SELECT w.route_slug
        FROM whatsapp_leads w
        WHERE w.booking_ref = passenger_care_feedback.booking_ref
          AND COALESCE(w.service_type, '') NOT IN ('pageview', 'passenger-care-pageview', 'passenger-care-stub')
          AND COALESCE(w.route_slug, '') NOT IN ('passenger-care', 'passenger-care-stub')
        ORDER BY w.clicked_at ASC
        LIMIT 1
      )),
      route_label = COALESCE(NULLIF(route_label, ''), (
        SELECT w.route_label
        FROM whatsapp_leads w
        WHERE w.booking_ref = passenger_care_feedback.booking_ref
          AND COALESCE(w.service_type, '') NOT IN ('pageview', 'passenger-care-pageview', 'passenger-care-stub')
          AND COALESCE(w.route_slug, '') NOT IN ('passenger-care', 'passenger-care-stub')
        ORDER BY w.clicked_at ASC
        LIMIT 1
      ))
    WHERE route_slug IS NULL OR route_slug = ''
  `).run();
  schemaReady = true;
}
__name(ensurePassengerCareSchema, "ensurePassengerCareSchema");
function cleanRouteSlug(value) {
  const slug = cleanText(value, 160);
  if (!slug) return null;
  return slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || null;
}
__name(cleanRouteSlug, "cleanRouteSlug");
function canPublishAsRouteReview(row) {
  if (!row) return false;
  if (String(row.outcome || "") !== "completed") return false;
  if (row.rating === null || row.rating === void 0) return false;
  const slug = cleanRouteSlug(row.route_slug);
  if (!slug || STUB_ROUTE_SLUGS.has(slug)) return false;
  return true;
}
__name(canPublishAsRouteReview, "canPublishAsRouteReview");
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
  const hex = bookingRef.replace(/^GCC-/i, "").toLowerCase();
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
__name(findLeadByBookingRef, "findLeadByBookingRef");
async function findFeedbackByBookingRef(env, bookingRef) {
  return env.TRANSPORT_DB.prepare(`
    SELECT booking_ref, outcome, rating, comment, quoted_price, paid_price, language, submitted_at, country, city
    FROM passenger_care_feedback
    WHERE booking_ref = ?
    LIMIT 1
  `).bind(bookingRef).first();
}
__name(findFeedbackByBookingRef, "findFeedbackByBookingRef");
async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
__name(onRequestOptions, "onRequestOptions");
async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  const bookingRef = normalizeBookingRef(new URL(request.url).searchParams.get("ref"));
  if (!bookingRef) {
    return json({ ok: false, error: "Invalid booking reference" }, { status: 400, headers });
  }
  try {
    await ensurePassengerCareSchema(env);
    const lead = await findLeadByBookingRef(env, bookingRef);
    const feedback = await findFeedbackByBookingRef(env, bookingRef);
    if (!lead) {
      return json({
        ok: true,
        booking_ref: bookingRef,
        route_label: "",
        page_path: "",
        language: "ar",
        clicked_at: "",
        already_submitted: Boolean(feedback),
        provisional: true
      }, { headers });
    }
    return json({
      ok: true,
      booking_ref: bookingRef,
      route_label: lead.route_label || lead.route_slug || "",
      page_path: lead.page_path || "",
      language: lead.language || "ar",
      clicked_at: lead.clicked_at || "",
      already_submitted: Boolean(feedback),
      feedback: feedback ? {
        outcome: feedback.outcome,
        rating: feedback.rating,
        submitted_at: feedback.submitted_at
      } : null
    }, { headers });
  } catch (error) {
    console.error(JSON.stringify({
      event: "passenger_care_get_failed",
      message: error && error.message ? error.message : String(error)
    }));
    return json({ ok: false, error: "Failed to load booking" }, { status: 500, headers });
  }
}
__name(onRequestGet, "onRequestGet");
async function resolveLeadForFeedback(env, bookingRef) {
  const lead = await findLeadByBookingRef(env, bookingRef);
  if (lead) return lead;
  return {
    lead_uuid: leadUuidFromBookingRef(bookingRef),
    booking_ref: bookingRef,
    route_slug: "",
    route_label: "",
    page_path: "",
    language: "ar",
    clicked_at: "",
    cf_country: null,
    cf_city: null
  };
}
__name(resolveLeadForFeedback, "resolveLeadForFeedback");
async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  if (!env.TRANSPORT_DB) {
    return json({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const bookingRef = normalizeBookingRef(payload.ref || payload.booking_ref);
  const outcome = cleanText(payload.outcome, 40);
  if (!bookingRef || !outcome || !OUTCOMES.has(outcome)) {
    return json({ ok: false, error: "Invalid booking reference or outcome" }, { status: 400, headers });
  }
  try {
    await ensurePassengerCareSchema(env);
    const existing = await findFeedbackByBookingRef(env, bookingRef);
    if (existing) {
      return json({ ok: true, already_submitted: true, booking_ref: bookingRef }, { status: 200, headers });
    }
    const lead = await resolveLeadForFeedback(env, bookingRef);
    if (!lead) {
      return json({ ok: false, error: "Booking reference not found" }, { status: 404, headers });
    }
    const geo = getRequestGeo(request);
    const submittedAt = (/* @__PURE__ */ new Date()).toISOString();
    const language = cleanText(payload.language, 10) || lead.language || "ar";
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
        user_agent,
        route_slug,
        route_label,
        review_approved,
        review_approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `).bind(
      lead.lead_uuid,
      bookingRef,
      outcome,
      cleanRating(payload.rating),
      cleanText(payload.comment, 1e3),
      cleanPrice(payload.quoted_price),
      cleanPrice(payload.paid_price),
      language,
      submittedAt,
      geo.country,
      geo.city || null,
      await hashIp(request),
      cleanText(request.headers.get("user-agent"), 600),
      cleanRouteSlug(lead.route_slug),
      cleanText(lead.route_label || lead.route_slug, 240)
    ).run();
    return json({ ok: true, already_submitted: false, booking_ref: bookingRef }, { status: 201, headers });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (message.toLowerCase().includes("unique")) {
      return json({ ok: true, already_submitted: true, booking_ref: bookingRef }, { status: 200, headers });
    }
    console.error(JSON.stringify({ event: "passenger_care_post_failed", message }));
    return json({ ok: false, error: "Failed to save feedback" }, { status: 500, headers });
  }
}
__name(onRequestPost, "onRequestPost");
async function getPassengerCareAdminRows(env, request) {
  await ensurePassengerCareSchema(env);
  const url = new URL(request.url);
  const search = cleanText(url.searchParams.get("search"), 120);
  const ref = normalizeBookingRef(url.searchParams.get("ref") || search);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 200), 1), 1e3);
  let whereSql = "";
  const bindings = [];
  if (ref) {
    whereSql = "WHERE f.booking_ref = ? OR l.booking_ref = ? OR l.lead_uuid LIKE ?";
    bindings.push(ref, ref, `%${search || ref.replace("GCC-", "")}%`);
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
      f.route_slug AS stored_route_slug,
      f.route_label AS stored_route_label,
      COALESCE(f.review_approved, 0) AS review_approved,
      f.review_approved_at,
      orig.clicked_at,
      COALESCE(NULLIF(f.route_slug, ''), orig.route_slug) AS route_slug,
      COALESCE(NULLIF(f.route_label, ''), orig.route_label) AS route_label,
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
__name(getPassengerCareAdminRows, "getPassengerCareAdminRows");
async function getPublicRouteReviews(env, routeSlug, limit = 5) {
  await ensurePassengerCareSchema(env);
  const slug = cleanRouteSlug(routeSlug);
  if (!slug || STUB_ROUTE_SLUGS.has(slug)) {
    return { route: slug || "", average_rating: null, review_count: 0, reviews: [] };
  }
  const stats = await env.TRANSPORT_DB.prepare(`
    SELECT
      COUNT(*) AS review_count,
      ROUND(AVG(rating), 1) AS average_rating
    FROM passenger_care_feedback
    WHERE route_slug = ?
      AND COALESCE(review_approved, 0) = 1
      AND outcome = 'completed'
      AND rating IS NOT NULL
  `).bind(slug).first();
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT rating, comment, submitted_at
    FROM passenger_care_feedback
    WHERE route_slug = ?
      AND COALESCE(review_approved, 0) = 1
      AND outcome = 'completed'
      AND rating IS NOT NULL
    ORDER BY submitted_at DESC
    LIMIT ?
  `).bind(slug, limit).all();
  return {
    route: slug,
    average_rating: stats?.average_rating ?? null,
    review_count: Number(stats?.review_count || 0),
    reviews: (results || []).map((row) => ({
      rating: row.rating,
      comment: cleanText(row.comment, 1e3),
      date: row.submitted_at ? String(row.submitted_at).slice(0, 10) : null
    }))
  };
}
__name(getPublicRouteReviews, "getPublicRouteReviews");
async function updatePassengerCareReviewApproval(env, payload) {
  await ensurePassengerCareSchema(env);
  const bookingRef = normalizeBookingRef(payload.booking_ref || payload.bookingRef);
  if (!bookingRef) {
    return { ok: false, error: "booking_ref is required", status: 400 };
  }
  const approved = payload.approved === true || payload.approved === 1 || payload.approved === "1" || payload.approved === "true";
  const row = await env.TRANSPORT_DB.prepare(`
    SELECT
      f.booking_ref,
      f.outcome,
      f.rating,
      COALESCE(NULLIF(f.route_slug, ''), orig.route_slug) AS route_slug
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
    WHERE f.booking_ref = ?
    LIMIT 1
  `).bind(bookingRef).first();
  if (!row) {
    return { ok: false, error: "Feedback not found", status: 404 };
  }
  if (approved && !canPublishAsRouteReview(row)) {
    return {
      ok: false,
      error: "Only completed trips with a rating and linked route can be approved for public display",
      status: 400
    };
  }
  const result = await env.TRANSPORT_DB.prepare(`
    UPDATE passenger_care_feedback
    SET
      route_slug = COALESCE(NULLIF(route_slug, ''), ?),
      review_approved = ?,
      review_approved_at = ?
    WHERE booking_ref = ?
  `).bind(
    cleanRouteSlug(row.route_slug),
    approved ? 1 : 0,
    approved ? (/* @__PURE__ */ new Date()).toISOString() : null,
    bookingRef
  ).run();
  return {
    ok: true,
    booking_ref: bookingRef,
    review_approved: approved ? 1 : 0,
    changes: result.meta?.changes || 0
  };
}
__name(updatePassengerCareReviewApproval, "updatePassengerCareReviewApproval");
async function deletePassengerCareFeedback(env, request) {
  await ensurePassengerCareSchema(env);
  const url = new URL(request.url);
  const bookingRef = normalizeBookingRef(url.searchParams.get("booking_ref") || url.searchParams.get("ref"));
  const id2 = Number(url.searchParams.get("id") || 0);
  if (!bookingRef && !id2) {
    return { ok: false, error: "booking_ref or id is required", status: 400 };
  }
  const result = id2 ? await env.TRANSPORT_DB.prepare("DELETE FROM passenger_care_feedback WHERE id = ?").bind(id2).run() : await env.TRANSPORT_DB.prepare("DELETE FROM passenger_care_feedback WHERE booking_ref = ?").bind(bookingRef).run();
  return { ok: true, deleted: result.meta?.changes || 0 };
}
__name(deletePassengerCareFeedback, "deletePassengerCareFeedback");
async function onRequest(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions(context);
  if (method === "GET") return onRequestGet(context);
  if (method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders(context.request) });
}
__name(onRequest, "onRequest");

// functions/api/transport/route-reviews.js
var route_reviews_exports = {};
__export(route_reviews_exports, {
  onRequest: () => onRequest2,
  onRequestGet: () => onRequestGet2,
  onRequestOptions: () => onRequestOptions2
});
function json2(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=600",
      ...init.headers || {}
    }
  });
}
__name(json2, "json");
async function onRequestOptions2(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
__name(onRequestOptions2, "onRequestOptions");
async function onRequestGet2(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  if (!env.TRANSPORT_DB) {
    return json2({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  const url = new URL(request.url);
  const route = url.searchParams.get("route") || "";
  const limitParam = Number(url.searchParams.get("limit") || 5);
  const limit = Math.max(1, Math.min(10, Number.isFinite(limitParam) ? Math.round(limitParam) : 5));
  try {
    await ensurePassengerCareSchema(env);
    const data = await getPublicRouteReviews(env, route, limit);
    return json2({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({
      event: "route_reviews_get_failed",
      message: error && error.message ? error.message : String(error)
    }));
    return json2({ ok: false, error: "Failed to load route reviews" }, { status: 500, headers });
  }
}
__name(onRequestGet2, "onRequestGet");
async function onRequest2(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions2(context);
  if (method === "GET") return onRequestGet2(context);
  return json2({ ok: false, error: "Method not allowed" }, {
    status: 405,
    headers: corsHeaders(context.request)
  });
}
__name(onRequest2, "onRequest");

// functions/api/transport/admin.js
var admin_exports = {};
__export(admin_exports, {
  onRequest: () => onRequest5,
  onRequestDelete: () => onRequestDelete,
  onRequestGet: () => onRequestGet3,
  onRequestOptions: () => onRequestOptions5,
  onRequestPost: () => onRequestPost4,
  onRequestPut: () => onRequestPut
});

// functions/api/transport/error-log.js
var error_log_exports = {};
__export(error_log_exports, {
  ensureErrorSchema: () => ensureErrorSchema,
  onRequest: () => onRequest3,
  onRequestOptions: () => onRequestOptions3,
  onRequestPost: () => onRequestPost2,
  recordError: () => recordError
});
var ALLOWED_ORIGINS2 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES2 = 8192;
var MAX_ERROR_ROWS = 2e3;
var errorSchemaReady = false;
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
function clip(value, maxLength) {
  if (value === null || value === void 0) return null;
  const text2 = String(value).replace(/\s+/g, " ").trim();
  return text2 ? text2.slice(0, maxLength) : null;
}
__name(clip, "clip");
function clipRaw(value, maxLength) {
  if (value === null || value === void 0) return null;
  const text2 = String(value);
  return text2 ? text2.slice(0, maxLength) : null;
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
async function parseJsonBody2(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES2) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES2) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody2, "parseJsonBody");
async function onRequestOptions3(context) {
  return new Response(null, { status: 204, headers: corsHeaders2(context.request) });
}
__name(onRequestOptions3, "onRequestOptions");
async function onRequestPost2(context) {
  const { request, env, ctx } = context;
  const headers = corsHeaders2(request);
  let payload;
  try {
    payload = await parseJsonBody2(request);
  } catch {
    return json3({ ok: false, error: "Invalid error payload" }, { status: 400, headers });
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
  return json3({ ok: true }, { status: 202, headers });
}
__name(onRequestPost2, "onRequestPost");
async function onRequest3(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions3(context);
  if (method === "POST") return onRequestPost2(context);
  return json3({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders2(context.request) });
}
__name(onRequest3, "onRequest");

// functions/api/transport/whatsapp-lead.js
var whatsapp_lead_exports = {};
__export(whatsapp_lead_exports, {
  buildNtfyHeaders: () => buildNtfyHeaders,
  getNtfyToken: () => getNtfyToken,
  onRequest: () => onRequest4,
  onRequestOptions: () => onRequestOptions4,
  onRequestPost: () => onRequestPost3,
  resolveNtfyPublishUrl: () => resolveNtfyPublishUrl,
  sendDailySummary: () => sendDailySummary
});
var ALLOWED_ORIGINS3 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES3 = 8192;
var settingsSchemaReady = false;
var DEFAULT_NOTIFICATION_SETTINGS = {
  notifications_enabled: true,
  notify_whatsapp_clicks: true,
  // Mode C default: do not ping the phone on browsing. Real-time alerts fire
  // only on WhatsApp clicks; overall traffic arrives in the daily summary.
  notify_pageviews: false
};
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
function corsHeaders3(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS3.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders3, "corsHeaders");
function isPageview(payload) {
  return cleanText2(payload && payload.serviceType, 160) === "pageview";
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
  return cleanText2(payload && (payload.firstTrafficSource || payload.trafficSource || payload.utmSource), 160) || "direct/unknown";
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
  const text2 = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "on", "enabled"].includes(text2)) return true;
  if (["false", "no", "off", "disabled"].includes(text2)) return false;
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
  const label = cleanText2(row && row.route_label, 240);
  if (label && !/^https?:/i.test(label)) return label;
  const slug = cleanText2(row && row.route_slug, 160);
  if (slug) {
    return slug.replace(/-en$/i, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return cleanText2(row && row.page_path, 200) || "page";
}
__name(prettyRoute, "prettyRoute");
async function fetchVisitorJourney(env, payload) {
  if (!env.TRANSPORT_DB) return [];
  const visitorId = cleanText2(payload && payload.visitorId, 80) || "";
  const sessionId = cleanText2(payload && payload.sessionId, 120) || "";
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
  const route = cleanText2(payload.routeLabel || payload.routeSlug, 240) || "Unknown page";
  const pagePath = cleanText2(payload.pagePath, 300) || "-";
  const pageUrl = cleanText2(payload.pageUrl, 500) || "";
  const language = cleanText2(payload.language, 20);
  const buttonText = cleanText2(payload.clickText, 160) || "WhatsApp button";
  const source = getPayloadTrafficSource(payload);
  const campaign = cleanText2(payload.utmCampaign, 160) || "none";
  const device = cleanText2(payload.deviceType, 40) || "unknown device";
  const location = [geo.city, geo.region, geo.country].filter(Boolean).join(", ") || "unknown location";
  const timeOnPage = Math.round(Number(payload.timeOnPageMs || 0) / 1e3);
  const scroll = cleanBoundedInteger(payload.scrollDepthPercent, 0, 100) ?? 0;
  const visitor = cleanText2(payload.visitorId, 80);
  const referrer = cleanText2(payload.referrerHost, 200) || cleanText2(payload.referrer, 200) || "direct/bookmark";
  const tripFrom = [cleanText2(payload.fromCity, 120), cleanText2(payload.fromCountry, 120)].filter(Boolean).join(", ");
  const tripTo = [cleanText2(payload.toCity, 120), cleanText2(payload.toCountry, 120)].filter(Boolean).join(", ");
  const serviceType = cleanText2(payload.serviceType, 120);
  const pages = (journey || []).filter((e) => cleanText2(e.service_type, 40) !== "pageview" ? false : true);
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
  const route = cleanText2(payload.routeLabel || payload.routeSlug, 240) || "Unknown route";
  const pagePath = cleanText2(payload.pagePath, 300) || "-";
  const pageTitle = cleanText2(payload.pageTitle, 240) || "";
  const pageUrl = cleanText2(payload.pageUrl, 500) || "";
  const language = cleanText2(payload.language, 20);
  const buttonText = cleanText2(payload.clickText, 160);
  const source = getPayloadTrafficSource(payload);
  const campaign = cleanText2(payload.utmCampaign, 160) || "none";
  const device = cleanText2(payload.deviceType, 40) || "unknown device";
  const location = [geo.city, geo.region, geo.country].filter(Boolean).join(", ") || "unknown location";
  const timeOnPage = Math.round(Number(payload.timeOnPageMs || 0) / 1e3);
  const scroll = cleanBoundedInteger(payload.scrollDepthPercent, 0, 100) ?? 0;
  const visitor = cleanText2(payload.visitorId, 80);
  const tripFrom = [cleanText2(payload.fromCity, 120), cleanText2(payload.fromCountry, 120)].filter(Boolean).join(", ");
  const tripTo = [cleanText2(payload.toCity, 120), cleanText2(payload.toCountry, 120)].filter(Boolean).join(", ");
  const serviceType = cleanText2(payload.serviceType, 120);
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
  const webhookUrl = cleanText2(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
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
  const geo = getRequestGeo2(request);
  let text2;
  let title;
  let priority;
  let tags;
  if (pageview) {
    const sessionPageViews = cleanInteger(payload.sessionPageViews);
    const isFirstPage = sessionPageViews === null || sessionPageViews <= 1;
    if (!isFirstPage) return;
    const visitCount = cleanInteger(payload.visitCount);
    const isReturning = typeof visitCount === "number" && visitCount > 1;
    text2 = buildNotificationText(payload, geo);
    title = isReturning ? "Vendora: returning customer" : "Vendora: NEW customer";
    priority = "default";
    tags = isReturning ? "repeat" : "wave";
  } else {
    const journey = await fetchVisitorJourney(env, payload);
    text2 = buildClickNotificationText(payload, geo, journey);
    title = "Vendora: WhatsApp booking click";
    priority = "high";
    tags = "telephone";
  }
  await fetch(resolveNtfyPublishUrl(url.toString(), env), {
    method: "POST",
    headers: buildNtfyHeaders(env, { title, priority, tags }),
    body: text2
  });
}
__name(sendPhoneNotification, "sendPhoneNotification");
async function sendDailySummary(env) {
  const webhookUrl = cleanText2(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
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
  const text2 = [
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
    body: text2
  });
}
__name(sendDailySummary, "sendDailySummary");
function cleanText2(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText2, "cleanText");
function cleanLeadUuid(value) {
  const text2 = cleanText2(value, 80);
  if (!text2) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text2) ? text2.toLowerCase() : null;
}
__name(cleanLeadUuid, "cleanLeadUuid");
function cleanBookingRefValue(value) {
  const text2 = cleanText2(value, 20);
  if (!text2) return null;
  const normalized = text2.toUpperCase();
  return /^GCC-[A-F0-9]{8}$/.test(normalized) ? normalized : null;
}
__name(cleanBookingRefValue, "cleanBookingRefValue");
function cleanUrl(value) {
  const text2 = cleanText2(value, 1200);
  if (!text2) return null;
  try {
    const url = new URL(text2);
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
function normalizeCountryCode2(value) {
  const code = cleanText2(value, 8);
  if (!code) return null;
  const normalized = code.toUpperCase();
  return normalized === "XX" ? null : normalized;
}
__name(normalizeCountryCode2, "normalizeCountryCode");
function getRequestGeo2(request) {
  const cf = request.cf || {};
  return {
    city: cleanText2(cf.city, 120) || getHeaderValue(request, ["x-vercel-ip-city"], 120),
    region: cleanText2(cf.region, 120) || cleanText2(cf.regionCode, 120) || getHeaderValue(request, ["x-vercel-ip-country-region", "x-vercel-ip-country-region-name"], 120),
    country: normalizeCountryCode2(cf.country) || normalizeCountryCode2(getHeaderValue(request, ["cf-ipcountry", "x-vercel-ip-country", "x-appengine-country", "cloudfront-viewer-country"], 8)),
    timezone: cleanText2(cf.timezone, 80) || getHeaderValue(request, ["x-vercel-ip-timezone"], 80),
    rayId: cleanText2(request.headers.get("cf-ray"), 120) || getHeaderValue(request, ["x-request-id", "x-vercel-id"], 120)
  };
}
__name(getRequestGeo2, "getRequestGeo");
function getPayloadValue(payload, key, maxLength) {
  return cleanText2(payload && payload[key], maxLength);
}
__name(getPayloadValue, "getPayloadValue");
function safePayloadJson(payload) {
  const maxLength = 7e3;
  const text2 = JSON.stringify(payload);
  if (text2.length <= maxLength) return text2;
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
async function parseJsonBody3(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES3) {
    throw new Error("Payload too large");
  }
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES3) {
    throw new Error("Payload too large");
  }
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody3, "parseJsonBody");
async function storeLead(request, env, payload, leadUuid, bookingRef) {
  const geo = getRequestGeo2(request);
  await ensurePassengerCareSchema(env);
  const stmt = env.TRANSPORT_DB.prepare(`
    INSERT INTO whatsapp_leads (
      lead_uuid,
      booking_ref,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt.bind(
    leadUuid,
    bookingRef,
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
    safePayloadJson(payload)
  ).run();
}
__name(storeLead, "storeLead");
async function onRequestOptions4(context) {
  const { request } = context;
  return new Response(null, { status: 204, headers: corsHeaders3(request) });
}
__name(onRequestOptions4, "onRequestOptions");
async function onRequestPost3(context) {
  const { request, env } = context;
  const headers = corsHeaders3(request);
  if (!env.TRANSPORT_DB) {
    return json4({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody3(request);
  } catch {
    return json4({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const leadUuid = cleanLeadUuid(payload.preassignedLeadUuid) || crypto.randomUUID();
  const bookingRef = cleanBookingRefValue(payload.preassignedBookingRef) || makeBookingRef(leadUuid);
  const write = storeLead(request, env, payload, leadUuid, bookingRef).catch((error) => {
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
      pageUrl: cleanText2(payload && payload.pageUrl, 1e3),
      pagePath: cleanText2(payload && payload.pagePath, 400),
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
  return json4({ ok: true, leadId: leadUuid, booking_ref: bookingRef }, { status: 202, headers });
}
__name(onRequestPost3, "onRequestPost");
async function onRequest4(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions4(context);
  if (method === "POST") return onRequestPost3(context);
  return json4({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders3(context.request) });
}
__name(onRequest4, "onRequest");

// functions/api/transport/admin.js
var ALLOWED_ORIGINS4 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES4 = 8192;
var MAX_LEADS_LIMIT = 1e3;
var VISITOR_ID_EXPR = "CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.visitorId'), '') ELSE NULL END";
var VISIT_COUNT_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.visitCount'), 1) AS INTEGER) ELSE 1 END";
var SESSION_PAGE_VIEWS_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.sessionPageViews'), 1) AS INTEGER) ELSE 1 END";
var TRAFFIC_SOURCE_EXPR = "COALESCE(NULLIF(utm_source, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.firstTrafficSource'), '') END, CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.trafficSource'), '') END, 'direct/unknown')";
var CAMPAIGN_EXPR = "COALESCE(NULLIF(utm_campaign, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.utmCampaign'), '') END, 'no campaign')";
var NON_CLICK_SERVICE_SQL = "COALESCE(service_type, '') NOT IN ('pageview', 'passenger-care-pageview', 'passenger-care-stub')";
var NON_CLICK_ROUTE_SQL = "COALESCE(route_slug, '') NOT IN ('passenger-care', 'passenger-care-stub')";
var EXCLUDE_ADMIN_SQL = "COALESCE(page_path, '') NOT LIKE '%/admin/%'";
var EXCLUDE_CARE_PATH_SQL = "COALESCE(page_path, '') NOT LIKE '%/care/%'";
var TRANSPORT_PRESENCE_SQL = `${EXCLUDE_ADMIN_SQL} AND ((${EXCLUDE_CARE_PATH_SQL} AND COALESCE(service_type, '') = 'pageview') OR (${NON_CLICK_SERVICE_SQL} AND ${NON_CLICK_ROUTE_SQL}))`;
var CARE_PRESENCE_SQL = `${EXCLUDE_ADMIN_SQL} AND (COALESCE(service_type, '') = 'passenger-care-pageview' OR COALESCE(page_path, '') LIKE '%/care/%')`;
var CUSTOMER_PRESENCE_SQL = EXCLUDE_ADMIN_SQL;
var ONLINE_WINDOW_SQL = "clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')";
var ADMIN_COLUMNS = [
  ["status", "ALTER TABLE whatsapp_leads ADD COLUMN status TEXT DEFAULT 'new'"],
  ["revenue", "ALTER TABLE whatsapp_leads ADD COLUMN revenue REAL DEFAULT 0"],
  ["admin_notes", "ALTER TABLE whatsapp_leads ADD COLUMN admin_notes TEXT"],
  ["driver_name", "ALTER TABLE whatsapp_leads ADD COLUMN driver_name TEXT"],
  ["driver_phone", "ALTER TABLE whatsapp_leads ADD COLUMN driver_phone TEXT"],
  ["quoted_price", "ALTER TABLE whatsapp_leads ADD COLUMN quoted_price REAL"],
  ["lost_reason", "ALTER TABLE whatsapp_leads ADD COLUMN lost_reason TEXT"],
  ["follow_up_at", "ALTER TABLE whatsapp_leads ADD COLUMN follow_up_at TEXT"],
  ["audit_updated_at", "ALTER TABLE whatsapp_leads ADD COLUMN audit_updated_at TEXT"],
  ["booking_ref", "ALTER TABLE whatsapp_leads ADD COLUMN booking_ref TEXT"]
];
var schemaReady2 = false;
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
function corsHeaders4(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS4.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-admin-token",
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
function cleanPrice2(value) {
  if (value === null || value === void 0 || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1e5) return null;
  return Math.round(number * 1e3) / 1e3;
}
__name(cleanPrice2, "cleanPrice");
function cleanStatus(value) {
  const status = cleanText3(value, 40);
  return ["new", "contacted", "completed", "cancelled", "spam"].includes(status) ? status : null;
}
__name(cleanStatus, "cleanStatus");
function boolToInt(value) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}
__name(boolToInt, "boolToInt");
function cleanDate(value) {
  const text2 = cleanText3(value, 32);
  if (!text2 || !/^\d{4}-\d{2}-\d{2}$/.test(text2)) return null;
  return text2;
}
__name(cleanDate, "cleanDate");
function cleanDateTime(value) {
  const text2 = cleanText3(value, 64);
  if (!text2) return null;
  return /^[0-9T: .+\-Z]+$/.test(text2) ? text2 : null;
}
__name(cleanDateTime, "cleanDateTime");
async function parseJsonBody4(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES4) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES4) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody4, "parseJsonBody");
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
    return json5({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  return null;
}
__name(requireDb, "requireDb");
async function ensureAdminSchema(env) {
  if (schemaReady2) return;
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
  schemaReady2 = true;
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
  const text2 = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "on", "enabled"].includes(text2)) return true;
  if (["false", "no", "off", "disabled"].includes(text2)) return false;
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
  return json5({ ok: true, notification_settings: settings });
}
__name(updateNotificationSettings, "updateNotificationSettings");
async function sendTestNotification(env) {
  const webhookUrl = cleanText3(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
  if (!webhookUrl) {
    return json5({
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
    return json5({ ok: false, configured: true, error: "The webhook secret is set but it is not a valid http(s) URL." });
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
    return json5({
      ok: response.ok,
      configured: true,
      auth_mode: notifyToken ? "bearer_token" : "anonymous",
      status: response.status,
      message: response.ok ? "Test alert sent. Check your phone / ntfy app now." : `The webhook responded with status ${response.status}. Check that the ntfy topic URL is correct.`,
      error: response.ok ? void 0 : `ntfy/webhook returned status ${response.status}. ${String(bodyText).slice(0, 300)}`.trim()
    });
  } catch (error) {
    return json5({
      ok: false,
      configured: true,
      error: `Webhook is set but the test send failed: ${error && error.message ? error.message : String(error)}`
    });
  }
}
__name(sendTestNotification, "sendTestNotification");
function eventClause(eventType) {
  if (eventType === "lead") return `${NON_CLICK_SERVICE_SQL} AND ${NON_CLICK_ROUTE_SQL}`;
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
    ["route_slug", cleanText3(url.searchParams.get("route"), 160)],
    ["device_type", cleanText3(url.searchParams.get("device"), 40)],
    ["cf_country", cleanText3(url.searchParams.get("country"), 8)]
  ];
  filters.forEach(([column, value]) => {
    if (!value) return;
    clauses.push(`${column} = ?`);
    bindings.push(value);
  });
  const source = cleanText3(url.searchParams.get("source"), 120);
  if (source) {
    clauses.push(`${TRAFFIC_SOURCE_EXPR} = ?`);
    bindings.push(source);
  }
  const campaign = cleanText3(url.searchParams.get("campaign"), 160);
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
  const search = cleanText3(url.searchParams.get("search"), 120);
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
      OR booking_ref LIKE ?
      OR session_id LIKE ?
      OR ip_address LIKE ?
      OR admin_notes LIKE ?
      OR driver_name LIKE ?
      OR driver_phone LIKE ?
      OR raw_payload LIKE ?
    )`);
    const like = `%${search}%`;
    bindings.push(like, like, like, like, like, like, like, like, like, like, like, like, like, like, like);
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
    booking_ref,
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
      COUNT(DISTINCT CASE WHEN ${TRANSPORT_PRESENCE_SQL} THEN ${PERSON_KEY_EXPR} END) AS online_transport,
      COUNT(DISTINCT CASE WHEN ${CARE_PRESENCE_SQL} THEN ${PERSON_KEY_EXPR} END) AS online_care,
      COUNT(DISTINCT CASE WHEN ${CUSTOMER_PRESENCE_SQL} THEN ${PERSON_KEY_EXPR} END) AS online_all,
      COUNT(DISTINCT session_id) AS online_sessions,
      COUNT(*) AS online_events
    FROM whatsapp_leads
    WHERE ${ONLINE_WINDOW_SQL}
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
        SUM(CASE WHEN ${NON_CLICK_SERVICE_SQL} AND ${NON_CLICK_ROUTE_SQL} THEN 1 ELSE 0 END) OVER (PARTITION BY ${PERSON_KEY_EXPR}) AS whatsapp_clicks,
        ROW_NUMBER() OVER (PARTITION BY ${PERSON_KEY_EXPR} ORDER BY clicked_at DESC) AS rn
      FROM whatsapp_leads
      WHERE ${ONLINE_WINDOW_SQL}
        AND ${TRANSPORT_PRESENCE_SQL}
    )
    WHERE rn = 1
    ORDER BY last_seen DESC
    LIMIT 30
  `).all();
  const { results: onlineCareRecent } = await env.TRANSPORT_DB.prepare(`
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
      device_type
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
        ROW_NUMBER() OVER (PARTITION BY ${PERSON_KEY_EXPR} ORDER BY clicked_at DESC) AS rn
      FROM whatsapp_leads
      WHERE ${ONLINE_WINDOW_SQL}
        AND ${CARE_PRESENCE_SQL}
    )
    WHERE rn = 1
    ORDER BY last_seen DESC
    LIMIT 15
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
      online_now: onlineTotals?.online_transport || 0,
      online_transport: onlineTotals?.online_transport || 0,
      online_care: onlineTotals?.online_care || 0,
      online_all: onlineTotals?.online_all || 0,
      online_sessions: onlineTotals?.online_sessions || 0,
      online_recent: onlineRecent || [],
      online_care_recent: onlineCareRecent || [],
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
  const leadUuid = cleanText3(payload.lead_uuid || payload.leadUuid, 80);
  if (!leadUuid) {
    return json5({ ok: false, error: "lead_uuid is required" }, { status: 400 });
  }
  const status = cleanStatus(payload.status) || "new";
  const revenue = cleanPrice2(payload.revenue) ?? 0;
  const quotedPrice = cleanPrice2(payload.quoted_price ?? payload.quotedPrice);
  const adminNotes = cleanText3(payload.admin_notes || payload.adminNotes, 2e3);
  const driverName = cleanText3(payload.driver_name || payload.driverName, 160);
  const driverPhone = cleanText3(payload.driver_phone || payload.driverPhone, 80);
  const lostReason = cleanText3(payload.lost_reason || payload.lostReason, 160);
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
  return json5({ ok: true, lead_uuid: leadUuid, changes: result.meta?.changes || 0 });
}
__name(updateLeadOutcome, "updateLeadOutcome");
async function upsertRoute(env, payload) {
  const routeSlug = cleanText3(payload.route_slug || payload.routeSlug, 160);
  if (!routeSlug) {
    return json5({ ok: false, error: "route_slug is required" }, { status: 400 });
  }
  const priceBd = cleanPrice2(payload.price_bd ?? payload.priceBD);
  const isVisible = boolToInt(payload.is_visible ?? payload.is_live ?? payload.isLive);
  const routeNameAr = cleanText3(payload.route_name_ar || payload.routeNameAr, 240) || routeSlug;
  const routeNameEn = cleanText3(payload.route_name_en || payload.routeNameEn, 240) || routeSlug;
  const originCountry = cleanText3(payload.origin_country || payload.originCountry, 120);
  const originCity = cleanText3(payload.origin_city || payload.originCity, 120);
  const destinationCountry = cleanText3(payload.destination_country || payload.destinationCountry, 120);
  const destinationCity = cleanText3(payload.destination_city || payload.destinationCity, 120);
  const notesAr = cleanText3(payload.notes_ar || payload.notesAr, 800);
  const notesEn = cleanText3(payload.notes_en || payload.notesEn, 800);
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
  return json5({ ok: true, route_slug: routeSlug, changes: result.meta?.changes || 0 });
}
__name(upsertRoute, "upsertRoute");
async function deleteLead(env, request) {
  const url = new URL(request.url);
  const id2 = Number(url.searchParams.get("id") || 0);
  const uuid = cleanText3(url.searchParams.get("lead_uuid"), 80);
  if (!id2 && !uuid) {
    return json5({ ok: false, error: "id or lead_uuid is required" }, { status: 400 });
  }
  const result = id2 ? await env.TRANSPORT_DB.prepare("DELETE FROM whatsapp_leads WHERE id = ?").bind(id2).run() : await env.TRANSPORT_DB.prepare("DELETE FROM whatsapp_leads WHERE lead_uuid = ?").bind(uuid).run();
  return json5({ ok: true, deleted: result.meta?.changes || 0 });
}
__name(deleteLead, "deleteLead");
var BULK_FILTER_KEYS = ["route", "device", "country", "source", "campaign", "status", "from", "to", "search", "min_seconds", "max_seconds"];
function hasMeaningfulFilter(url) {
  return BULK_FILTER_KEYS.some((key) => cleanText3(url.searchParams.get(key), 200));
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
    return json5({
      ok: false,
      error: "Add at least one filter (date range, route, search, etc.) before bulk deleting, or pass confirm=all to clear everything."
    }, { status: 400 });
  }
  const { whereSql, bindings } = buildLeadFilters(url, { eventType });
  const result = await env.TRANSPORT_DB.prepare(`DELETE FROM whatsapp_leads ${whereSql}`).bind(...bindings).run();
  return json5({ ok: true, deleted: result.meta?.changes || 0, event_type: eventType });
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
  const id2 = Number(url.searchParams.get("id") || 0);
  const result = id2 ? await env.TRANSPORT_DB.prepare("DELETE FROM transport_error_log WHERE id = ?").bind(id2).run() : await env.TRANSPORT_DB.prepare("DELETE FROM transport_error_log").run();
  return json5({ ok: true, deleted: result.meta?.changes || 0 });
}
__name(deleteErrors, "deleteErrors");
async function onRequestOptions5(context) {
  return new Response(null, { status: 204, headers: corsHeaders4(context.request) });
}
__name(onRequestOptions5, "onRequestOptions");
async function onRequestGet3(context) {
  const { request, env } = context;
  const headers = corsHeaders4(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json5({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "leads";
  try {
    await ensureAdminSchema(env);
    const data = resource === "routes" ? await getRoutes(env) : resource === "summary" ? await getSummary(env, request) : resource === "notification-settings" ? { notification_settings: await getNotificationSettings2(env) } : resource === "errors" ? await getErrors(env, request) : resource === "tracking" ? await getTrackingSummary(env, request) : resource === "pageviews" ? await getEventRows(env, request, "pageview") : resource === "passenger-care" ? await getPassengerCareAdminRows(env, request) : await getEventRows(env, request, "lead");
    return json5({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_get_failed", message: error.message }));
    context.waitUntil(recordError(env, {
      source: "admin-api",
      severity: "error",
      message: `Admin GET failed (resource=${resource}): ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url
    }));
    return json5({ ok: false, error: "Failed to load admin data" }, { status: 500, headers });
  }
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost4(context) {
  return handleAdminWrite(context);
}
__name(onRequestPost4, "onRequestPost");
async function onRequestPut(context) {
  return handleAdminWrite(context);
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete(context) {
  const { request, env } = context;
  const headers = corsHeaders4(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json5({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  const mode = url.searchParams.get("mode") || "";
  try {
    await ensureAdminSchema(env);
    let response;
    if (resource === "errors") {
      response = await deleteErrors(env, request);
    } else if (resource === "passenger-care") {
      const result = await deletePassengerCareFeedback(env, request);
      return json5(result, { status: result.status || (result.ok ? 200 : 400), headers });
    } else if (resource === "bulk" || mode === "bulk") {
      response = await deleteBulkEvents(env, request);
    } else {
      response = await deleteLead(env, request);
    }
    return json5(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_delete_failed", message: error.message }));
    context.waitUntil(recordError(env, {
      source: "admin-api",
      severity: "error",
      message: `Admin DELETE failed: ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url
    }));
    return json5({ ok: false, error: "Failed to delete record" }, { status: 500, headers });
  }
}
__name(onRequestDelete, "onRequestDelete");
async function handleAdminWrite(context) {
  const { request, env } = context;
  const headers = corsHeaders4(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  if (!await authorize(request, env)) {
    return json5({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody4(request);
  } catch {
    return json5({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  try {
    await ensureAdminSchema(env);
    if (resource === "passenger-care-review") {
      const result = await updatePassengerCareReviewApproval(env, payload);
      return json5(result, { status: result.status || (result.ok ? 200 : 400), headers });
    }
    const response = resource === "lead" ? await updateLeadOutcome(env, payload) : resource === "notification-settings" ? await updateNotificationSettings(env, payload) : resource === "test-notification" ? await sendTestNotification(env) : await upsertRoute(env, payload);
    return json5(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: "transport_admin_write_failed", message: error.message }));
    context.waitUntil(recordError(env, {
      source: "admin-api",
      severity: "error",
      message: `Admin WRITE failed (resource=${resource}): ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url
    }));
    return json5({ ok: false, error: "Failed to save admin data" }, { status: 500, headers });
  }
}
__name(handleAdminWrite, "handleAdminWrite");
async function onRequest5(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions5(context);
  if (method === "GET") return onRequestGet3(context);
  if (method === "POST") return onRequestPost4(context);
  if (method === "PUT") return onRequestPut(context);
  if (method === "DELETE") return onRequestDelete(context);
  return json5({ ok: false, error: "Method not allowed" }, {
    status: 405,
    headers: corsHeaders4(context.request)
  });
}
__name(onRequest5, "onRequest");

// functions/api/transport/ai-chat.js
var ai_chat_exports = {};
__export(ai_chat_exports, {
  onRequest: () => onRequest6,
  onRequestOptions: () => onRequestOptions6,
  onRequestPost: () => onRequestPost5
});
var ALLOWED_ORIGINS5 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "null"
]);
var MAX_BODY_BYTES5 = 32768;
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
function json6(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json6, "json");
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
async function parseJsonBody5(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES5) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES5) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody5, "parseJsonBody");
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
  const fromEnv = cleanText4(env.TRANSPORT_AI_MODEL, 120);
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
    const t = cleanText4(String(v), max);
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
  return history.filter((m) => m && (m.role === "user" || m.role === "assistant") && cleanText4(m.content, 1200)).slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role,
    content: cleanText4(m.content, 1200)
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
function extractJsonObject(text2) {
  const raw = String(text2 || "").trim();
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
async function onRequestOptions6(context) {
  return new Response(null, { status: 204, headers: corsHeaders5(context.request) });
}
__name(onRequestOptions6, "onRequestOptions");
async function onRequestPost5(context) {
  const { request, env } = context;
  const headers = corsHeaders5(request);
  let payload;
  try {
    payload = await parseJsonBody5(request);
  } catch {
    return json6({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const incomingLead = payload && typeof payload.lead === "object" && payload.lead ? payload.lead : {};
  const message = cleanText4(payload.message, 1200) || "";
  const preferredLang = normalizeLanguage(
    payload.language || incomingLead.language || incomingLead.details?.language
  );
  const lead = {
    id: cleanText4(incomingLead.id, 80) || incomingLead.id || crypto.randomUUID(),
    createdAt: cleanText4(incomingLead.createdAt, 80) || incomingLead.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    language: preferredLang,
    status: cleanText4(incomingLead.status, 60) || "new",
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
    return json6({
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
    return json6({
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
    return json6({
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
  const assistantMessage = cleanText4(parsed.assistantMessage, 2e3) || fallbackReply(detectedLanguage, "empty reply");
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
  return json6(result, { headers });
}
__name(onRequestPost5, "onRequestPost");
async function onRequest6(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions6(context);
  if (method === "POST") return onRequestPost5(context);
  return json6({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders5(context.request) });
}
__name(onRequest6, "onRequest");

// functions/api/transport/tracking.js
var tracking_exports = {};
__export(tracking_exports, {
  onRequest: () => onRequest7,
  onRequestOptions: () => onRequestOptions7,
  onRequestPost: () => onRequestPost6
});
var ALLOWED_ORIGINS6 = /* @__PURE__ */ new Set([
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
var MAX_BODY_BYTES6 = 8192;
function json7(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json7, "json");
function corsHeaders6(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS6.has(origin) ? origin : "https://getvendora.net";
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders6, "corsHeaders");
function cleanText5(value, maxLength = 500) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
__name(cleanText5, "cleanText");
function cleanUrl2(value) {
  const text2 = cleanText5(value, 1200);
  if (!text2) return null;
  try {
    const url = new URL(text2);
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
function normalizeCountryCode3(value) {
  const code = cleanText5(value, 8);
  if (!code) return null;
  const normalized = code.toUpperCase();
  return normalized === "XX" ? null : normalized;
}
__name(normalizeCountryCode3, "normalizeCountryCode");
function getRequestGeo3(request) {
  const cf = request.cf || {};
  return {
    city: cleanText5(cf.city, 120),
    region: cleanText5(cf.region, 120) || cleanText5(cf.regionCode, 120),
    country: normalizeCountryCode3(cf.country),
    timezone: cleanText5(cf.timezone, 80)
  };
}
__name(getRequestGeo3, "getRequestGeo");
async function parseJsonBody6(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES6) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES6) throw new Error("Payload too large");
  if (!body.trim()) return {};
  return JSON.parse(body);
}
__name(parseJsonBody6, "parseJsonBody");
function safePayloadJson2(payload) {
  const compact = { ...payload };
  delete compact.chatMessage;
  delete compact.chatHistory;
  delete compact.inputData;
  return JSON.stringify(compact).slice(0, 4e3);
}
__name(safePayloadJson2, "safePayloadJson");
async function writeEventToDb(request, env, payload, eventId) {
  const geo = getRequestGeo3(request);
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
    cleanText5(payload.visitor_id, 80) || "unknown_visitor",
    cleanText5(payload.session_id, 120) || "unknown_session",
    cleanText5(payload.created_at, 80) || (/* @__PURE__ */ new Date()).toISOString(),
    cleanUrl2(payload.page_url),
    cleanText5(payload.page_path, 300),
    cleanUrl2(payload.referrer),
    cleanText5(payload.utm_source, 120),
    cleanText5(payload.utm_medium, 120),
    cleanText5(payload.utm_campaign, 160),
    cleanText5(payload.event_name, 120) || "unknown_event",
    cleanText5(payload.event_category, 120),
    cleanText5(payload.event_label, 120),
    cleanText5(payload.route_name, 120),
    cleanText5(payload.button_text, 160),
    cleanUrl2(payload.target_url),
    cleanText5(payload.language, 20),
    cleanText5(payload.device_type, 40),
    cleanText5(request.headers.get("user-agent"), 600),
    cleanInteger2(payload.screen_width),
    cleanInteger2(payload.screen_height),
    cleanText5(payload.lead_status, 40),
    geo.city,
    geo.region,
    geo.country,
    geo.timezone,
    safePayloadJson2(payload)
  ).run();
}
__name(writeEventToDb, "writeEventToDb");
async function onRequestOptions7(context) {
  const { request } = context;
  return new Response(null, { status: 204, headers: corsHeaders6(request) });
}
__name(onRequestOptions7, "onRequestOptions");
async function onRequestPost6(context) {
  const { request, env } = context;
  const headers = corsHeaders6(request);
  if (!env.TRANSPORT_DB) {
    return json7({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  }
  let payload;
  try {
    payload = await parseJsonBody6(request);
  } catch {
    return json7({ ok: false, error: "Invalid JSON payload" }, { status: 400, headers });
  }
  const eventId = cleanText5(payload.event_id, 80) || crypto.randomUUID();
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
      pageUrl: cleanText5(payload.page_url, 1e3),
      pagePath: cleanText5(payload.page_path, 400),
      context: `eventId=${eventId}`
    });
  });
  context.waitUntil(dbTask);
  return json7({ ok: true, eventId }, { status: 202, headers });
}
__name(onRequestPost6, "onRequestPost");
async function onRequest7(context) {
  const method = context.request.method;
  if (method === "OPTIONS") return onRequestOptions7(context);
  if (method === "POST") return onRequestPost6(context);
  return json7({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders6(context.request) });
}
__name(onRequest7, "onRequest");

// functions/api/nada/menu.js
var menu_exports = {};
__export(menu_exports, {
  onRequest: () => onRequest8,
  onRequestDelete: () => onRequestDelete2,
  onRequestGet: () => onRequestGet4,
  onRequestOptions: () => onRequestOptions8,
  onRequestPost: () => onRequestPost7
});
var ALLOWED_ORIGINS7 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "null"
]);
var MAX_JSON_BYTES = 96 * 1024;
var MAX_IMAGE_BYTES = 4 * 1024 * 1024;
var DEFAULT_SETTINGS = {
  businessName: "Gourmet Tomorrow",
  businessTagline: "",
  whatsappOrderNumber: "97312345678",
  chefWhatsappNumber: "97312345678",
  currencySymbol: "BD",
  currencyCode: "BHD",
  currencyFormat: "prefix",
  enableRequests: true,
  enablePreorders: true,
  enableSuggestDish: true,
  deliveryEnabled: true,
  pickupEnabled: true,
  orderNameRequired: true,
  orderPhoneRequired: true,
  orderTimeRequired: true,
  orderNotesRequired: false,
  requestNameRequired: false,
  requestPhoneRequired: false,
  requestTimeRequired: true,
  requestNotesRequired: false,
  suggestionNameRequired: false,
  suggestionPhoneRequired: false,
  suggestionNotesRequired: false,
  phoneRequiredForRequest: false,
  showRequestCounts: true,
  votingDeadline: "11:00 PM",
  deliveryOptions: "both",
  defaultLanguage: "en",
  businessLogo: "",
  brandLogoSize: 72,
  brandLogoPlacement: "header",
  heroImage: "",
  restaurantStatus: "open",
  allowRequestsWhileClosed: true,
  restaurantTimezone: "Asia/Bahrain",
  requestAutoClearEnabled: true,
  requestAutoClearHours: 24
};
var REQUEST_STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved for tomorrow",
  not_available: "Not available this time",
  closed: "Closed for this cycle"
};
var DEFAULT_CATEGORIES = [
  { id: "cat-burgers", name: "Burgers", hidden: false },
  { id: "cat-chicken", name: "Chicken meals", hidden: false },
  { id: "cat-rice", name: "Rice meals", hidden: false },
  { id: "cat-snacks", name: "Snacks", hidden: false },
  { id: "cat-drinks", name: "Drinks", hidden: false },
  { id: "cat-desserts", name: "Desserts", hidden: false }
];
var schemaReady3 = false;
var lastRequestCleanupAt = 0;
function json8(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json8, "json");
function corsHeaders7(request) {
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS7.has(origin) ? origin : "https://getvendora.net",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-admin-token",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders7, "corsHeaders");
function boolToInt2(value) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}
__name(boolToInt2, "boolToInt");
function intToBool(value) {
  return value === 1 || value === true || value === "1" || value === "true";
}
__name(intToBool, "intToBool");
function text(value, max = 1e3) {
  if (value === null || value === void 0) return "";
  return String(value).trim().slice(0, max);
}
__name(text, "text");
function normalizeRequestStatus(value) {
  const status = text(value, 40).toLowerCase();
  return REQUEST_STATUS_LABELS[status] ? status : "pending";
}
__name(normalizeRequestStatus, "normalizeRequestStatus");
function id(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}
__name(id, "id");
async function parseJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BYTES) throw new Error("Payload too large");
  const body = await request.text();
  if (body.length > MAX_JSON_BYTES) throw new Error("Payload too large");
  return body.trim() ? JSON.parse(body) : {};
}
__name(parseJson, "parseJson");
async function authorize2(request, env) {
  return true;
}
__name(authorize2, "authorize");
function requireDb2(env, headers) {
  if (!env.TRANSPORT_DB) return json8({ ok: false, error: "Database binding missing" }, { status: 500, headers });
  return null;
}
__name(requireDb2, "requireDb");
async function ensureSchema(env) {
  if (schemaReady3) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS nada_menu_items (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, price REAL DEFAULT 0, image TEXT, image_key TEXT,
      category TEXT, available_today INTEGER DEFAULT 1, confirmed_tomorrow INTEGER DEFAULT 0, available_tomorrow INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1, popular INTEGER DEFAULT 0, sold_out INTEGER DEFAULT 0, request_count INTEGER DEFAULT 0,
      available_from TEXT, available_to TEXT, sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, hidden INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_orders (
      id TEXT PRIMARY KEY, customer_name TEXT, customer_phone TEXT, fulfillment_type TEXT, preferred_time TEXT, total REAL DEFAULT 0,
      notes TEXT, status TEXT DEFAULT 'Pending Confirmation', whatsapp_sent INTEGER DEFAULT 0, items_json TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_tomorrow_requests (
      id TEXT PRIMARY KEY, item_id TEXT, food_item_id TEXT, food_title TEXT, customer_name TEXT, customer_phone TEXT,
      quantity INTEGER DEFAULT 1, notes TEXT, preferred_time TEXT, is_custom INTEGER DEFAULT 0, reserve INTEGER DEFAULT 0,
      session_id TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_customer_suggestions (
      id TEXT PRIMARY KEY, dish_name TEXT, customer_name TEXT, customer_phone TEXT, quantity INTEGER DEFAULT 1,
      notes TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_cooking_decisions (
      item_id TEXT PRIMARY KEY, status_json TEXT NOT NULL, updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_behavior_logs (
      id TEXT PRIMARY KEY, session_id TEXT, timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), action TEXT, details_json TEXT)`
  ];
  for (const sql of statements) await env.TRANSPORT_DB.prepare(sql).run();
  await ensureRequestStatusColumns(env);
  await seedDefaults(env);
  schemaReady3 = true;
}
__name(ensureSchema, "ensureSchema");
async function ensureRequestStatusColumns(env) {
  const info = await env.TRANSPORT_DB.prepare("PRAGMA table_info(nada_tomorrow_requests)").all();
  const columns = new Set((info.results || []).map((row) => row.name));
  const alters = [];
  if (!columns.has("status")) alters.push("ALTER TABLE nada_tomorrow_requests ADD COLUMN status TEXT DEFAULT 'pending'");
  if (!columns.has("status_note")) alters.push("ALTER TABLE nada_tomorrow_requests ADD COLUMN status_note TEXT");
  if (!columns.has("decided_at")) alters.push("ALTER TABLE nada_tomorrow_requests ADD COLUMN decided_at TEXT");
  for (const sql of alters) await env.TRANSPORT_DB.prepare(sql).run();
}
__name(ensureRequestStatusColumns, "ensureRequestStatusColumns");
async function seedDefaults(env) {
  const settingsCount = await env.TRANSPORT_DB.prepare("SELECT COUNT(*) AS count FROM nada_settings").first();
  if (!settingsCount || Number(settingsCount.count || 0) === 0) {
    await env.TRANSPORT_DB.prepare("INSERT INTO nada_settings (key, value) VALUES (?, ?)").bind("main", JSON.stringify(DEFAULT_SETTINGS)).run();
  }
  const categoryCount = await env.TRANSPORT_DB.prepare("SELECT COUNT(*) AS count FROM nada_categories").first();
  if (!categoryCount || Number(categoryCount.count || 0) === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await env.TRANSPORT_DB.prepare("INSERT OR IGNORE INTO nada_categories (id, name, hidden) VALUES (?, ?, ?)").bind(cat.id, cat.name, boolToInt2(cat.hidden)).run();
    }
  }
}
__name(seedDefaults, "seedDefaults");
function mapItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    price: Number(row.price || 0),
    image: row.image || "",
    imageKey: row.image_key || "",
    category: row.category || "",
    availableToday: intToBool(row.available_today),
    confirmedTomorrow: intToBool(row.confirmed_tomorrow),
    availableTomorrow: intToBool(row.available_tomorrow),
    visible: intToBool(row.visible),
    popular: intToBool(row.popular),
    soldOut: intToBool(row.sold_out),
    requestCount: Number(row.request_count || 0),
    availableFrom: row.available_from || null,
    availableTo: row.available_to || null
  };
}
__name(mapItem, "mapItem");
async function getSettings(env) {
  const row = await env.TRANSPORT_DB.prepare("SELECT value FROM nada_settings WHERE key = ?").bind("main").first();
  if (!row) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
__name(getSettings, "getSettings");
async function cleanupExpiredRequests(env, settings) {
  if (!settings || settings.requestAutoClearEnabled === false) return;
  const now = Date.now();
  if (now - lastRequestCleanupAt < 5 * 60 * 1e3) return;
  lastRequestCleanupAt = now;
  const hours = Math.max(1, Math.min(168, Math.round(Number(settings.requestAutoClearHours || 24))));
  const result = await env.TRANSPORT_DB.prepare(
    "DELETE FROM nada_tomorrow_requests WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)"
  ).bind(`-${hours} hours`).run();
  if (Number(result?.meta?.changes || 0) > 0) {
    await env.TRANSPORT_DB.prepare(`
      UPDATE nada_menu_items
      SET request_count = COALESCE((
        SELECT SUM(quantity)
        FROM nada_tomorrow_requests
        WHERE item_id = nada_menu_items.id OR food_item_id = nada_menu_items.id
      ), 0)
    `).run();
  }
}
__name(cleanupExpiredRequests, "cleanupExpiredRequests");
function mapRequest(row) {
  const status = normalizeRequestStatus(row.status);
  return {
    id: row.id,
    itemId: row.item_id || row.food_item_id,
    foodItemId: row.food_item_id || row.item_id,
    foodTitle: row.food_title || "",
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    quantity: Number(row.quantity || 1),
    notes: row.notes || "",
    preferredTime: row.preferred_time || "",
    isCustom: intToBool(row.is_custom),
    reserve: intToBool(row.reserve),
    sessionId: row.session_id || "",
    status,
    statusLabel: REQUEST_STATUS_LABELS[status],
    statusNote: row.status_note || REQUEST_STATUS_LABELS[status],
    decidedAt: row.decided_at || "",
    createdAt: row.created_at
  };
}
__name(mapRequest, "mapRequest");
async function readState(env, publicOnly = false) {
  const settings = await getSettings(env);
  await cleanupExpiredRequests(env, settings);
  const itemSql = publicOnly ? "SELECT * FROM nada_menu_items WHERE visible = 1 ORDER BY sort_order ASC, created_at DESC" : "SELECT * FROM nada_menu_items ORDER BY sort_order ASC, created_at DESC";
  const categorySql = publicOnly ? "SELECT * FROM nada_categories WHERE hidden = 0 ORDER BY sort_order ASC, name ASC" : "SELECT * FROM nada_categories ORDER BY sort_order ASC, name ASC";
  const [categories, foodItems, requests, suggestions, decisions, orders, logs] = await Promise.all([
    env.TRANSPORT_DB.prepare(categorySql).all(),
    env.TRANSPORT_DB.prepare(itemSql).all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare("SELECT * FROM nada_tomorrow_requests ORDER BY created_at DESC LIMIT 1000").all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare("SELECT * FROM nada_customer_suggestions ORDER BY created_at DESC LIMIT 1000").all(),
    env.TRANSPORT_DB.prepare("SELECT * FROM nada_cooking_decisions").all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare("SELECT * FROM nada_orders ORDER BY created_at DESC LIMIT 1000").all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare("SELECT * FROM nada_behavior_logs ORDER BY timestamp DESC LIMIT 500").all()
  ]);
  return {
    settings,
    categories: (categories.results || []).map((row) => ({ id: row.id, name: row.name, hidden: intToBool(row.hidden) })),
    foodItems: (foodItems.results || []).map(mapItem),
    tomorrowRequests: (requests.results || []).map(mapRequest),
    customerSuggestions: (suggestions.results || []).map((row) => ({
      id: row.id,
      dishName: row.dish_name || "",
      customerName: row.customer_name || "",
      customerPhone: row.customer_phone || "",
      quantity: Number(row.quantity || 1),
      notes: row.notes || "",
      createdAt: row.created_at
    })),
    cookingDecisions: Object.fromEntries((decisions.results || []).map((row) => {
      try {
        return [row.item_id, JSON.parse(row.status_json)];
      } catch {
        return [row.item_id, row.status_json];
      }
    })),
    orders: (orders.results || []).map((row) => ({
      id: row.id,
      customerName: row.customer_name || "",
      customerPhone: row.customer_phone || "",
      fulfillmentType: row.fulfillment_type || "",
      type: row.fulfillment_type || "",
      preferredTime: row.preferred_time || "",
      total: Number(row.total || 0),
      notes: row.notes || "",
      status: row.status || "Pending Confirmation",
      whatsappSent: intToBool(row.whatsapp_sent),
      items: JSON.parse(row.items_json || "[]"),
      createdAt: row.created_at
    })),
    behaviorLogs: (logs.results || []).map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      action: row.action,
      details: JSON.parse(row.details_json || "{}")
    }))
  };
}
__name(readState, "readState");
async function upsertFoodItem(env, item) {
  const itemId = text(item.id, 120) || id("food");
  await env.TRANSPORT_DB.prepare(`
    INSERT INTO nada_menu_items (
      id, title, description, price, image, image_key, category, available_today, confirmed_tomorrow, available_tomorrow,
      visible, popular, sold_out, request_count, available_from, available_to, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, description = excluded.description, price = excluded.price, image = excluded.image,
      image_key = excluded.image_key, category = excluded.category, available_today = excluded.available_today,
      confirmed_tomorrow = excluded.confirmed_tomorrow, available_tomorrow = excluded.available_tomorrow,
      visible = excluded.visible, popular = excluded.popular, sold_out = excluded.sold_out,
      request_count = excluded.request_count, available_from = excluded.available_from, available_to = excluded.available_to,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    itemId,
    text(item.title, 180),
    text(item.description, 2e3),
    Number(item.price || 0),
    text(item.image, 4e3),
    text(item.imageKey || item.image_key, 500),
    text(item.category, 160),
    boolToInt2(item.availableToday),
    boolToInt2(item.confirmedTomorrow),
    boolToInt2(item.availableTomorrow || item.confirmedTomorrow),
    item.visible === false ? 0 : 1,
    boolToInt2(item.popular),
    boolToInt2(item.soldOut),
    Number(item.requestCount || 0),
    item.availableFrom || null,
    item.availableTo || null
  ).run();
  return { ...item, id: itemId };
}
__name(upsertFoodItem, "upsertFoodItem");
async function saveRequest(env, payload) {
  const reqId = text(payload.id, 120) || `REQ-${Math.floor(1e5 + Math.random() * 9e5)}`;
  const itemId = text(payload.itemId || payload.foodItemId, 120);
  const quantity = Math.max(1, Math.min(99, Math.round(Number(payload.quantity || 1))));
  const status = normalizeRequestStatus(payload.status);
  const statusNote = text(payload.statusNote || REQUEST_STATUS_LABELS[status], 500);
  await env.TRANSPORT_DB.prepare(`
    INSERT INTO nada_tomorrow_requests (
      id, item_id, food_item_id, food_title, customer_name, customer_phone, quantity, notes,
      preferred_time, is_custom, reserve, session_id, status, status_note, decided_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  `).bind(
    reqId,
    itemId,
    itemId,
    text(payload.foodTitle || payload.title, 220),
    text(payload.customerName, 160),
    text(payload.customerPhone, 80),
    quantity,
    text(payload.notes, 1e3),
    text(payload.preferredTime, 120),
    boolToInt2(payload.isCustom),
    boolToInt2(payload.reserve),
    text(payload.sessionId, 160),
    status,
    statusNote
  ).run();
  if (itemId) {
    await env.TRANSPORT_DB.prepare("UPDATE nada_menu_items SET request_count = COALESCE(request_count, 0) + ? WHERE id = ?").bind(quantity, itemId).run();
  }
  return {
    ...payload,
    id: reqId,
    itemId,
    foodItemId: itemId,
    quantity,
    status,
    statusLabel: REQUEST_STATUS_LABELS[status],
    statusNote,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(saveRequest, "saveRequest");
async function readRequestStatuses(env, url) {
  const sessionId = text(url.searchParams.get("sessionId"), 160);
  const rawIds = text(url.searchParams.get("ids"), 4e3);
  const ids = rawIds.split(",").map((value) => text(value, 120)).filter(Boolean).slice(0, 50);
  if (!sessionId) return [];
  const binds = [sessionId];
  let sql = "SELECT * FROM nada_tomorrow_requests WHERE session_id = ?";
  if (ids.length > 0) {
    sql += ` AND id IN (${ids.map(() => "?").join(",")})`;
    binds.push(...ids);
  }
  sql += " ORDER BY created_at DESC LIMIT 100";
  const rows = await env.TRANSPORT_DB.prepare(sql).bind(...binds).all();
  return (rows.results || []).map(mapRequest);
}
__name(readRequestStatuses, "readRequestStatuses");
async function updateRequestStatus(env, payload) {
  const requestId = text(payload.requestId || payload.id, 120);
  const itemId = text(payload.itemId || payload.foodItemId, 120);
  const status = normalizeRequestStatus(payload.status);
  const statusNote = text(payload.statusNote || REQUEST_STATUS_LABELS[status], 500);
  if (!requestId && !itemId) throw new Error("requestId or itemId is required");
  const binds = [status, statusNote];
  let whereSql = "";
  if (requestId) {
    whereSql = "id = ?";
    binds.push(requestId);
  } else {
    whereSql = "(item_id = ? OR food_item_id = ?)";
    binds.push(itemId, itemId);
  }
  await env.TRANSPORT_DB.prepare(`
    UPDATE nada_tomorrow_requests
    SET status = ?, status_note = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE ${whereSql}
  `).bind(...binds).run();
  return { status, statusLabel: REQUEST_STATUS_LABELS[status], statusNote };
}
__name(updateRequestStatus, "updateRequestStatus");
async function handleUpload(request, env, headers) {
  if (!env.VENDORA_IMAGES) return json8({ ok: false, error: "Image bucket binding missing" }, { status: 500, headers });
  const form = await request.formData();
  const file = form.get("file");
  const type = text(form.get("type") || "menu", 32).replace(/[^a-z0-9_-]/gi, "") || "menu";
  if (!file || typeof file.arrayBuffer !== "function") return json8({ ok: false, error: "Image file is required" }, { status: 400, headers });
  if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type || "")) return json8({ ok: false, error: "Use JPG, PNG, WEBP, or GIF images only" }, { status: 400, headers });
  if (file.size > MAX_IMAGE_BYTES) return json8({ ok: false, error: "Image must be smaller than 4 MB after compression" }, { status: 400, headers });
  const ext = (file.type || "image/jpeg").split("/")[1].replace("jpeg", "jpg");
  const key = `nada-menu/${type}/${crypto.randomUUID()}.${ext}`;
  await env.VENDORA_IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return json8({ ok: true, key, url: `/api/nada/assets/${key}` }, { headers });
}
__name(handleUpload, "handleUpload");
async function serveAsset(request, env, headers) {
  if (!env.VENDORA_IMAGES) return new Response("Image bucket missing", { status: 500, headers });
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/api\/nada\/assets\//, ""));
  if (!key.startsWith("nada-menu/")) return new Response("Not found", { status: 404, headers });
  const object = await env.VENDORA_IMAGES.get(key);
  if (!object) return new Response("Not found", { status: 404, headers });
  return new Response(object.body, {
    headers: {
      ...headers,
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}
__name(serveAsset, "serveAsset");
async function onRequestOptions8(context) {
  return new Response(null, { status: 204, headers: corsHeaders7(context.request) });
}
__name(onRequestOptions8, "onRequestOptions");
async function onRequestGet4(context) {
  const { request, env } = context;
  const headers = corsHeaders7(request);
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/nada/assets/")) return serveAsset(request, env, headers);
  const dbError = requireDb2(env, headers);
  if (dbError) return dbError;
  await ensureSchema(env);
  if (url.pathname === "/api/nada/health") return json8({ ok: true, service: "nada-menu-api" }, { headers });
  if (url.pathname === "/api/nada/request-status") {
    const settings = await getSettings(env);
    await cleanupExpiredRequests(env, settings);
    return json8({ ok: true, requests: await readRequestStatuses(env, url) }, { headers });
  }
  if (url.pathname === "/api/nada/admin" && !await authorize2(request, env)) {
    return json8({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  return json8({ ok: true, ...await readState(env, url.pathname !== "/api/nada/admin") }, { headers });
}
__name(onRequestGet4, "onRequestGet");
async function onRequestPost7(context) {
  const { request, env } = context;
  const headers = corsHeaders7(request);
  const url = new URL(request.url);
  const dbError = requireDb2(env, headers);
  if (dbError) return dbError;
  await ensureSchema(env);
  if (url.pathname === "/api/nada/upload") {
    if (!await authorize2(request, env)) return json8({ ok: false, error: "Unauthorized" }, { status: 401, headers });
    return handleUpload(request, env, headers);
  }
  const payload = await parseJson(request);
  if (url.pathname === "/api/nada/request") return json8({ ok: true, request: await saveRequest(env, payload) }, { headers });
  if (url.pathname === "/api/nada/suggestion") {
    const suggestionId = text(payload.id, 120) || `SUG-${Math.floor(1e5 + Math.random() * 9e5)}`;
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO nada_customer_suggestions (id, dish_name, customer_name, customer_phone, quantity, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(suggestionId, text(payload.dishName, 220), text(payload.customerName, 160), text(payload.customerPhone, 80), Number(payload.quantity || 1), text(payload.notes, 1e3)).run();
    return json8({ ok: true, suggestion: { ...payload, id: suggestionId } }, { headers });
  }
  if (url.pathname === "/api/nada/order") {
    const orderId = text(payload.id, 120) || `ORD-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e5 + Math.random() * 9e5)}`;
    const fulfillmentType = text(payload.fulfillmentType || payload.type, 80);
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO nada_orders (id, customer_name, customer_phone, fulfillment_type, preferred_time, total, notes, status, whatsapp_sent, items_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(orderId, text(payload.customerName, 160), text(payload.customerPhone, 80), fulfillmentType, text(payload.preferredTime, 120), Number(payload.total || 0), text(payload.notes, 1e3), text(payload.status || "Pending Confirmation", 80), boolToInt2(payload.whatsappSent), JSON.stringify(payload.items || [])).run();
    return json8({ ok: true, order: { ...payload, id: orderId, fulfillmentType, type: fulfillmentType } }, { headers });
  }
  if (url.pathname === "/api/nada/log") {
    await env.TRANSPORT_DB.prepare("INSERT INTO nada_behavior_logs (id, session_id, action, details_json) VALUES (?, ?, ?, ?)").bind(text(payload.id, 120) || id("log"), text(payload.sessionId, 160), text(payload.action, 120), JSON.stringify(payload.details || {})).run();
    return json8({ ok: true }, { headers });
  }
  if (url.pathname !== "/api/nada/admin" || !await authorize2(request, env)) {
    return json8({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const resource = url.searchParams.get("resource") || "";
  if (resource === "settings") {
    await env.TRANSPORT_DB.prepare("INSERT INTO nada_settings (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind("main", JSON.stringify({ ...DEFAULT_SETTINGS, ...payload })).run();
    return json8({ ok: true, settings: { ...DEFAULT_SETTINGS, ...payload } }, { headers });
  }
  if (resource === "category") {
    const catId = text(payload.id, 120) || id("cat");
    await env.TRANSPORT_DB.prepare("INSERT INTO nada_categories (id, name, hidden, updated_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ON CONFLICT(id) DO UPDATE SET name = excluded.name, hidden = excluded.hidden, updated_at = excluded.updated_at").bind(catId, text(payload.name, 160), boolToInt2(payload.hidden)).run();
    return json8({ ok: true, category: { ...payload, id: catId } }, { headers });
  }
  if (resource === "food-item") return json8({ ok: true, item: await upsertFoodItem(env, payload) }, { headers });
  if (resource === "cooking-decision") {
    await env.TRANSPORT_DB.prepare("INSERT INTO nada_cooking_decisions (item_id, status_json, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ON CONFLICT(item_id) DO UPDATE SET status_json = excluded.status_json, updated_at = excluded.updated_at").bind(text(payload.itemId, 120), JSON.stringify(payload.status)).run();
    return json8({ ok: true }, { headers });
  }
  if (resource === "available-tomorrow") {
    await env.TRANSPORT_DB.prepare("UPDATE nada_menu_items SET confirmed_tomorrow = ?, available_tomorrow = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").bind(boolToInt2(payload.isSelected), boolToInt2(payload.isSelected), text(payload.itemId, 120)).run();
    return json8({ ok: true }, { headers });
  }
  if (resource === "request-status") {
    return json8({ ok: true, requestStatus: await updateRequestStatus(env, payload) }, { headers });
  }
  if (resource === "order-status") {
    await env.TRANSPORT_DB.prepare("UPDATE nada_orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").bind(text(payload.status, 80), text(payload.orderId, 120)).run();
    return json8({ ok: true }, { headers });
  }
  if (resource === "reset-daily") {
    await env.TRANSPORT_DB.batch([
      env.TRANSPORT_DB.prepare("DELETE FROM nada_tomorrow_requests"),
      env.TRANSPORT_DB.prepare("DELETE FROM nada_cooking_decisions"),
      env.TRANSPORT_DB.prepare("UPDATE nada_menu_items SET request_count = 0, confirmed_tomorrow = 0, available_tomorrow = 0")
    ]);
    return json8({ ok: true }, { headers });
  }
  return json8({ ok: false, error: "Unknown resource" }, { status: 400, headers });
}
__name(onRequestPost7, "onRequestPost");
async function onRequestDelete2(context) {
  const { request, env } = context;
  const headers = corsHeaders7(request);
  if (!await authorize2(request, env)) return json8({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  const dbError = requireDb2(env, headers);
  if (dbError) return dbError;
  await ensureSchema(env);
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  const itemId = text(url.searchParams.get("id"), 120);
  if (!itemId && resource !== "menu") return json8({ ok: false, error: "id is required" }, { status: 400, headers });
  if (resource === "food-item") await env.TRANSPORT_DB.prepare("DELETE FROM nada_menu_items WHERE id = ?").bind(itemId).run();
  else if (resource === "category") await env.TRANSPORT_DB.prepare("DELETE FROM nada_categories WHERE id = ?").bind(itemId).run();
  else if (resource === "order") await env.TRANSPORT_DB.prepare("DELETE FROM nada_orders WHERE id = ?").bind(itemId).run();
  else if (resource === "suggestion") await env.TRANSPORT_DB.prepare("DELETE FROM nada_customer_suggestions WHERE id = ?").bind(itemId).run();
  else if (resource === "suggestion-dish") await env.TRANSPORT_DB.prepare("DELETE FROM nada_customer_suggestions WHERE lower(trim(dish_name)) = lower(trim(?))").bind(itemId).run();
  else if (resource === "requests-for-item") {
    await env.TRANSPORT_DB.batch([
      env.TRANSPORT_DB.prepare("DELETE FROM nada_tomorrow_requests WHERE item_id = ? OR food_item_id = ?").bind(itemId, itemId),
      env.TRANSPORT_DB.prepare("UPDATE nada_menu_items SET request_count = 0 WHERE id = ?").bind(itemId)
    ]);
  } else if (resource === "request") {
    const requestId = itemId;
    const row = await env.TRANSPORT_DB.prepare(
      "SELECT food_item_id, item_id FROM nada_tomorrow_requests WHERE id = ?"
    ).bind(requestId).first();
    if (!row) return json8({ ok: false, error: "Request not found" }, { status: 404, headers });
    await env.TRANSPORT_DB.prepare("DELETE FROM nada_tomorrow_requests WHERE id = ?").bind(requestId).run();
    const foodId = row.food_item_id || row.item_id;
    if (foodId) {
      await env.TRANSPORT_DB.prepare(`
        UPDATE nada_menu_items
        SET request_count = COALESCE((
          SELECT SUM(quantity) FROM nada_tomorrow_requests
          WHERE item_id = ? OR food_item_id = ?
        ), 0)
        WHERE id = ?
      `).bind(foodId, foodId, foodId).run();
    }
  } else return json8({ ok: false, error: "Unknown resource" }, { status: 400, headers });
  return json8({ ok: true }, { headers });
}
__name(onRequestDelete2, "onRequestDelete");
async function onRequest8(context) {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions8(context);
  if (method === "GET") return onRequestGet4(context);
  if (method === "POST" || method === "PUT") return onRequestPost7(context);
  if (method === "DELETE") return onRequestDelete2(context);
  return json8({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders7(context.request) });
}
__name(onRequest8, "onRequest");

// functions/api/maroc-market/image.js
var image_exports = {};
__export(image_exports, {
  onRequest: () => onRequest9,
  onRequestDelete: () => onRequestDelete3,
  onRequestGet: () => onRequestGet5,
  onRequestOptions: () => onRequestOptions9,
  onRequestPost: () => onRequestPost8
});
var ALLOWED_ORIGINS8 = /* @__PURE__ */ new Set([
  "https://getvendora.net",
  "https://www.getvendora.net",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "null"
]);
var PASSWORD = "1234";
var MAX_IMAGE_BYTES2 = 4 * 1024 * 1024;
var TYPE_TO_PREFIX = {
  logo: "maroc-market/logo/",
  hero: "maroc-market/hero/",
  product: "maroc-market/products/",
  category: "maroc-market/categories/",
  banner: "maroc-market/banners/"
};
function json9(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers || {}
    }
  });
}
__name(json9, "json");
function corsHeaders8(request) {
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS8.has(origin) ? origin : "https://getvendora.net",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-admin-password",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}
__name(corsHeaders8, "corsHeaders");
function authorize3(request) {
  const password = request.headers.get("x-admin-password");
  return password === PASSWORD;
}
__name(authorize3, "authorize");
function validateKey(key) {
  if (!key) return false;
  if (!key.startsWith("maroc-market/")) return false;
  if (key.includes("..")) return false;
  if (key.includes("//")) return false;
  const regex = /^maroc-market\/[a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+$/;
  return regex.test(key);
}
__name(validateKey, "validateKey");
async function serveAsset2(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return new Response("Assets bucket binding missing", { status: 500, headers });
  }
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/demo\/maroc-market\/api\/assets\//, ""));
  if (!validateKey(key)) {
    return new Response("Access denied or invalid path", { status: 403, headers });
  }
  const object = await env.MAROC_MARKET_ASSETS.get(key);
  if (!object) {
    return new Response("Not found", { status: 404, headers });
  }
  return new Response(object.body, {
    headers: {
      ...headers,
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}
__name(serveAsset2, "serveAsset");
async function handleUpload2(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json9({ ok: false, error: "Assets bucket binding missing" }, { status: 500, headers });
  }
  if (!authorize3(request)) {
    return json9({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const form = await request.formData();
  const file = form.get("file");
  const type = String(form.get("type") || "").trim();
  if (!file || typeof file.arrayBuffer !== "function") {
    return json9({ ok: false, error: "File is required" }, { status: 400, headers });
  }
  if (file.size > MAX_IMAGE_BYTES2) {
    return json9({ ok: false, error: "File size exceeds 4MB limit" }, { status: 400, headers });
  }
  const mime = file.type || "";
  if (!/^image\/(jpeg|png|webp)$/i.test(mime)) {
    return json9({ ok: false, error: "Only JPG, PNG, or WEBP images are allowed" }, { status: 400, headers });
  }
  const prefix = TYPE_TO_PREFIX[type];
  if (!prefix) {
    return json9({ ok: false, error: "Invalid upload type" }, { status: 400, headers });
  }
  let ext = mime.split("/")[1].toLowerCase();
  if (ext === "jpeg") ext = "jpg";
  const uuid = crypto.randomUUID();
  const key = `${prefix}${uuid}.${ext}`;
  await env.MAROC_MARKET_ASSETS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: mime }
  });
  return json9({
    ok: true,
    key,
    url: `/demo/maroc-market/api/assets/${key}`
  }, { headers });
}
__name(handleUpload2, "handleUpload");
async function handleDelete(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json9({ ok: false, error: "Assets bucket binding missing" }, { status: 500, headers });
  }
  if (!authorize3(request)) {
    return json9({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const url = new URL(request.url);
  const key = String(url.searchParams.get("key") || "").trim();
  if (!key) {
    return json9({ ok: false, error: "Key is required" }, { status: 400, headers });
  }
  if (!validateKey(key)) {
    return json9({ ok: false, error: "Invalid or restricted key path" }, { status: 400, headers });
  }
  const object = await env.MAROC_MARKET_ASSETS.head(key);
  if (!object) {
    return json9({ ok: false, error: "Image not found" }, { status: 404, headers });
  }
  await env.MAROC_MARKET_ASSETS.delete(key);
  return json9({ ok: true }, { headers });
}
__name(handleDelete, "handleDelete");
async function handleList(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json9({ ok: false, error: "Assets bucket binding missing" }, { status: 500, headers });
  }
  if (!authorize3(request)) {
    return json9({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }
  const objects = await env.MAROC_MARKET_ASSETS.list({ prefix: "maroc-market/" });
  const images = (objects.objects || []).map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploadedAt: obj.uploaded,
    url: `/demo/maroc-market/api/assets/${obj.key}`
  }));
  return json9({ ok: true, images }, { headers });
}
__name(handleList, "handleList");
async function onRequestOptions9(context) {
  return new Response(null, { status: 204, headers: corsHeaders8(context.request) });
}
__name(onRequestOptions9, "onRequestOptions");
async function onRequestGet5(context) {
  const { request, env } = context;
  const headers = corsHeaders8(request);
  const url = new URL(request.url);
  if (url.pathname.startsWith("/demo/maroc-market/api/assets/")) {
    return serveAsset2(request, env, headers);
  }
  if (url.pathname === "/demo/maroc-market/api/list-images") {
    return handleList(request, env, headers);
  }
  return json9({ ok: false, error: "Route not found" }, { status: 404, headers });
}
__name(onRequestGet5, "onRequestGet");
async function onRequestPost8(context) {
  const { request, env } = context;
  const headers = corsHeaders8(request);
  const url = new URL(request.url);
  if (url.pathname === "/demo/maroc-market/api/upload-image") {
    return handleUpload2(request, env, headers);
  }
  return json9({ ok: false, error: "Route not found" }, { status: 404, headers });
}
__name(onRequestPost8, "onRequestPost");
async function onRequestDelete3(context) {
  const { request, env } = context;
  const headers = corsHeaders8(request);
  const url = new URL(request.url);
  if (url.pathname === "/demo/maroc-market/api/delete-image") {
    return handleDelete(request, env, headers);
  }
  return json9({ ok: false, error: "Route not found" }, { status: 404, headers });
}
__name(onRequestDelete3, "onRequestDelete");
async function onRequest9(context) {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return onRequestOptions9(context);
  if (method === "GET") return onRequestGet5(context);
  if (method === "POST") return onRequestPost8(context);
  if (method === "DELETE") return onRequestDelete3(context);
  return json9({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders8(context.request) });
}
__name(onRequest9, "onRequest");

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
      "/api/transport/log",
      "/api/transport/passenger-care",
      "/api/transport/route-reviews"
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
      if (path.startsWith("/demo/maroc-market/api/")) {
        return await dispatchPagesFunction(image_exports, request, env, ctx);
      }
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
      if (path === "/api/transport/passenger-care") {
        return await dispatchPagesFunction(passenger_care_exports, request, env, ctx);
      }
      if (path === "/api/transport/route-reviews") {
        return await dispatchPagesFunction(route_reviews_exports, request, env, ctx);
      }
      if (path === "/api/nada/health" || path === "/api/nada/menu" || path === "/api/nada/admin" || path === "/api/nada/upload" || path === "/api/nada/order" || path === "/api/nada/request" || path === "/api/nada/request-status" || path === "/api/nada/suggestion" || path === "/api/nada/log" || path.startsWith("/api/nada/assets/")) {
        return await dispatchPagesFunction(menu_exports, request, env, ctx);
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

// .wrangler/tmp/bundle-DHoqtd/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-DHoqtd/middleware-loader.entry.ts
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
