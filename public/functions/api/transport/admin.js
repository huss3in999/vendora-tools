import { ensureErrorSchema, recordError } from './error-log.js';
import { buildNtfyHeaders, getNtfyToken, resolveNtfyPublishUrl } from './whatsapp-lead.js';
import { getPassengerCareAdminRows, deletePassengerCareFeedback, updatePassengerCareReviewApproval, regeneratePassengerCareToken } from './passenger-care.js';
import { getComplaintsAdminRows, updateComplaintStatus } from './complaints.js';
import {
  ensurePublicSettingsSchema,
  getPublicConfig,
  savePublicRoute,
  savePublicSettings,
} from './public-settings.js';

const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'null',
]);

const MAX_BODY_BYTES = 8192;
const MAX_LEADS_LIMIT = 1000;
const VISITOR_ID_EXPR = "COALESCE(NULLIF(visitor_id, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.visitorId'), '') END)";
const VISIT_COUNT_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.visitCount'), 1) AS INTEGER) ELSE 1 END";
const SESSION_PAGE_VIEWS_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.sessionPageViews'), 1) AS INTEGER) ELSE 1 END";
const TRAFFIC_SOURCE_EXPR = "COALESCE(NULLIF(utm_source, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.firstTrafficSource'), '') END, CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.trafficSource'), '') END, CASE WHEN referrer LIKE '%google.%' THEN 'Google Search' WHEN referrer LIKE '%chatgpt.%' THEN 'ChatGPT AI' WHEN referrer <> '' THEN referrer ELSE 'direct/unknown' END)";
const CAMPAIGN_EXPR = "COALESCE(NULLIF(utm_campaign, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.utmCampaign'), '') END, 'no campaign')";
const NON_CLICK_SERVICE_SQL = "COALESCE(service_type, '') NOT IN ('pageview', 'presence_heartbeat', 'passenger-care-pageview', 'passenger-care-stub')";
const NON_CLICK_ROUTE_SQL = "COALESCE(route_slug, '') NOT IN ('passenger-care', 'passenger-care-stub')";
const EXCLUDE_ADMIN_SQL = "COALESCE(page_path, '') NOT LIKE '%/admin/%'";
const EXCLUDE_CARE_PATH_SQL = "COALESCE(page_path, '') NOT LIKE '%/care/%'";
const TRANSPORT_PRESENCE_SQL = `${EXCLUDE_ADMIN_SQL} AND ((${EXCLUDE_CARE_PATH_SQL} AND COALESCE(service_type, '') IN ('pageview', 'presence_heartbeat')) OR (${NON_CLICK_SERVICE_SQL} AND ${NON_CLICK_ROUTE_SQL}))`;
const CARE_PRESENCE_SQL = `${EXCLUDE_ADMIN_SQL} AND (COALESCE(service_type, '') = 'passenger-care-pageview' OR COALESCE(page_path, '') LIKE '%/care/%')`;
const CUSTOMER_PRESENCE_SQL = EXCLUDE_ADMIN_SQL;
const ONLINE_WINDOW_SQL = "clicked_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 seconds')";

const ADMIN_COLUMNS = [
  ['status', "ALTER TABLE whatsapp_leads ADD COLUMN status TEXT DEFAULT 'new'"],
  ['revenue', 'ALTER TABLE whatsapp_leads ADD COLUMN revenue REAL DEFAULT 0'],
  ['admin_notes', 'ALTER TABLE whatsapp_leads ADD COLUMN admin_notes TEXT'],
  ['driver_name', 'ALTER TABLE whatsapp_leads ADD COLUMN driver_name TEXT'],
  ['driver_phone', 'ALTER TABLE whatsapp_leads ADD COLUMN driver_phone TEXT'],
  ['quoted_price', 'ALTER TABLE whatsapp_leads ADD COLUMN quoted_price REAL'],
  ['lost_reason', 'ALTER TABLE whatsapp_leads ADD COLUMN lost_reason TEXT'],
  ['follow_up_at', 'ALTER TABLE whatsapp_leads ADD COLUMN follow_up_at TEXT'],
  ['audit_updated_at', 'ALTER TABLE whatsapp_leads ADD COLUMN audit_updated_at TEXT'],
  ['booking_ref', 'ALTER TABLE whatsapp_leads ADD COLUMN booking_ref TEXT'],
  ['booking_phone_used', 'ALTER TABLE whatsapp_leads ADD COLUMN booking_phone_used TEXT'],
  ['public_price_shown', 'ALTER TABLE whatsapp_leads ADD COLUMN public_price_shown REAL'],
  ['customer_name', 'ALTER TABLE whatsapp_leads ADD COLUMN customer_name TEXT'],
  ['customer_phone', 'ALTER TABLE whatsapp_leads ADD COLUMN customer_phone TEXT'],
  ['follow_up_consent', 'ALTER TABLE whatsapp_leads ADD COLUMN follow_up_consent INTEGER DEFAULT 0'],
  ['customer_paid_amount', 'ALTER TABLE whatsapp_leads ADD COLUMN customer_paid_amount REAL'],
  ['driver_payout_amount', 'ALTER TABLE whatsapp_leads ADD COLUMN driver_payout_amount REAL'],
  ['actual_commission', 'ALTER TABLE whatsapp_leads ADD COLUMN actual_commission REAL'],
  ['customer_email', 'ALTER TABLE whatsapp_leads ADD COLUMN customer_email TEXT'],
  ['whatsapp_confirmed_at', 'ALTER TABLE whatsapp_leads ADD COLUMN whatsapp_confirmed_at TEXT'],
];

let schemaReady = false;
let settingsSchemaReady = false;

const DEFAULT_NOTIFICATION_SETTINGS = {
  notifications_enabled: true,
  notify_whatsapp_clicks: true,
  // Off by default (Mode C): browsing does not ping the phone; only WhatsApp
  // clicks alert in real time, with the daily summary covering overall traffic.
  notify_pageviews: false,
  notify_contacted_updates: false,
  notify_completed_updates: true,
};

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

function cleanStatus(value) {
  const status = cleanText(value, 40);
  return ['new', 'contacted', 'quote_sent', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_response', 'spam'].includes(status) ? status : null;
}

function boolToInt(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

function cleanDate(value) {
  const text = cleanText(value, 32);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function cleanDateTime(value) {
  const text = cleanText(value, 64);
  if (!text) return null;
  return /^[0-9T: .+\-Z]+$/.test(text) ? text : null;
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

function timingSafeBytesEqual(a, b) {
  const maxLength = Math.max(a.length, b.length, 1);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLength; i += 1) {
    diff |= (a[i % a.length] || 0) ^ (b[i % b.length] || 0);
  }
  return diff === 0;
}

async function timingSafeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const providedHash = await sha256Bytes(provided);
  const expectedHash = await sha256Bytes(expected);
  return timingSafeBytesEqual(providedHash, expectedHash);
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

async function ensureAdminSchema(env) {
  try {
    const table = await env.TRANSPORT_DB.prepare('PRAGMA table_info(whatsapp_leads)').all();
    const existing = new Set((table.results || []).map((row) => row.name));

    for (const [name, sql] of ADMIN_COLUMNS) {
      if (existing.has(name)) continue;
      try {
        await env.TRANSPORT_DB.prepare(sql).run();
      } catch (error) {
        if (!String(error.message || error).toLowerCase().includes('duplicate column')) {
          /* ignore duplicate column */
        }
      }
    }

    await env.TRANSPORT_DB.prepare(`
      CREATE TABLE IF NOT EXISTS transport_private_route_pricing (
        route_slug TEXT PRIMARY KEY,
        private_minimum_bhd REAL,
        currency TEXT NOT NULL DEFAULT 'BHD',
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (private_minimum_bhd IS NULL OR private_minimum_bhd >= 0)
      )
    `).run();
  } catch (e) {
    /* ignore schema setup errors */
  }
}

async function ensureSettingsSchema(env) {
  if (settingsSchemaReady) return;

  await env.TRANSPORT_DB.prepare(`
    CREATE TABLE IF NOT EXISTS transport_admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `).run();

  settingsSchemaReady = true;
}

function boolSetting(value, fallback = false) {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', 'on', 'enabled'].includes(text)) return true;
  if (['false', 'no', 'off', 'disabled'].includes(text)) return false;
  return fallback;
}

async function getNotificationSettings(env) {
  await ensureSettingsSchema(env);
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
  return Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_SETTINGS).map(([key, fallback]) => [
    key,
    boolSetting(saved[key], fallback),
  ]));
}

async function updateNotificationSettings(env, payload) {
  await ensureSettingsSchema(env);
  const settings = {
    notifications_enabled: boolSetting(payload.notifications_enabled, DEFAULT_NOTIFICATION_SETTINGS.notifications_enabled),
    notify_whatsapp_clicks: boolSetting(payload.notify_whatsapp_clicks, DEFAULT_NOTIFICATION_SETTINGS.notify_whatsapp_clicks),
    notify_pageviews: boolSetting(payload.notify_pageviews, DEFAULT_NOTIFICATION_SETTINGS.notify_pageviews),
    notify_contacted_updates: boolSetting(payload.notify_contacted_updates, DEFAULT_NOTIFICATION_SETTINGS.notify_contacted_updates),
    notify_completed_updates: boolSetting(payload.notify_completed_updates, DEFAULT_NOTIFICATION_SETTINGS.notify_completed_updates),
  };

  for (const [key, value] of Object.entries(settings)) {
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO transport_admin_settings (key, value, updated_at)
      VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `).bind(key, value ? 'true' : 'false').run();
  }

  return json({ ok: true, notification_settings: settings });
}

/**
 * Send a one-off test alert to the configured ntfy webhook so the owner can
 * confirm phone notifications actually work, independent of real visits.
 */
async function sendTestNotification(env) {
  const webhookUrl = cleanText(env.TRANSPORT_NOTIFY_WEBHOOK_URL, 1200);
  if (!webhookUrl) {
    return json({
      ok: false,
      configured: false,
      error: 'No phone webhook is set. In Cloudflare, set the secret TRANSPORT_NOTIFY_WEBHOOK_URL to your private ntfy topic URL (e.g. https://ntfy.sh/your-secret-topic), then redeploy.',
    });
  }

  let url;
  try {
    url = new URL(webhookUrl);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('bad protocol');
  } catch {
    return json({ ok: false, configured: true, error: 'The webhook secret is set but it is not a valid http(s) URL.' });
  }

  const notifyToken = getNtfyToken(env);
  const ntfyHeaders = buildNtfyHeaders(env, {
    title: 'Vendora GCC test alert',
    priority: 'high',
    tags: 'white_check_mark',
  });

  try {
    const publishUrl = resolveNtfyPublishUrl(url.toString(), env);
    const response = await fetch(publishUrl, {
      method: 'POST',
      headers: ntfyHeaders,
      body: [
        'Vendora Transport: TEST ALERT',
        'Website: getvendora.net / GCC Transport',
        'If you can read this on your phone, alerts are working.',
        'Real page visits and WhatsApp booking clicks will arrive here the same way.',
      ].join('\n'),
    });
    const bodyText = response.ok ? '' : await response.text().catch(() => '');
    return json({
      ok: response.ok,
      configured: true,
      auth_mode: notifyToken ? 'bearer_token' : 'anonymous',
      status: response.status,
      message: response.ok
        ? 'Test alert sent. Check your phone / ntfy app now.'
        : `The webhook responded with status ${response.status}. Check that the ntfy topic URL is correct.`,
      error: response.ok
        ? undefined
        : `ntfy/webhook returned status ${response.status}. ${String(bodyText).slice(0, 300)}`.trim(),
    });
  } catch (error) {
    return json({
      ok: false,
      configured: true,
      error: `Webhook is set but the test send failed: ${error && error.message ? error.message : String(error)}`,
    });
  }
}

function eventClause(eventType) {
  if (eventType === 'lead') return `${NON_CLICK_SERVICE_SQL} AND ${NON_CLICK_ROUTE_SQL}`;
  if (eventType === 'pageview') return "COALESCE(service_type, '') = 'pageview'";
  return '';
}

function buildLeadFilters(url, options = {}) {
  const clauses = [];
  const bindings = [];
  const eventSql = eventClause(options.eventType);
  if (eventSql) clauses.push(eventSql);

  const filters = [
    ['route_slug', cleanText(url.searchParams.get('route'), 160)],
    ['device_type', cleanText(url.searchParams.get('device'), 40)],
    ['cf_country', cleanText(url.searchParams.get('country'), 8)],
  ];

  filters.forEach(([column, value]) => {
    if (!value) return;
    clauses.push(`${column} = ?`);
    bindings.push(value);
  });

  const source = cleanText(url.searchParams.get('source'), 120);
  if (source) {
    clauses.push(`${TRAFFIC_SOURCE_EXPR} = ?`);
    bindings.push(source);
  }

  const campaign = cleanText(url.searchParams.get('campaign'), 160);
  if (campaign) {
    clauses.push(`${CAMPAIGN_EXPR} = ?`);
    bindings.push(campaign);
  }

  const status = cleanStatus(url.searchParams.get('status'));
  if (status && options.eventType !== 'pageview') {
    clauses.push("COALESCE(status, 'new') = ?");
    bindings.push(status);
  }

  const from = cleanDate(url.searchParams.get('from'));
  if (from) {
    clauses.push("date(clicked_at, '+3 hours') >= ?");
    bindings.push(from);
  }

  const to = cleanDate(url.searchParams.get('to'));
  if (to) {
    clauses.push("date(clicked_at, '+3 hours') <= ?");
    bindings.push(to);
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

function buildAnalyticsFilters(url) {
  const clauses = [];
  const bindings = [];
  const filters = [
    ['e.route_name', cleanText(url.searchParams.get('route'), 160)],
    ['e.device_type', cleanText(url.searchParams.get('device'), 40)],
    ['e.ip_country', cleanText(url.searchParams.get('country'), 8)],
    ['e.utm_campaign', cleanText(url.searchParams.get('campaign'), 160)],
  ];

  filters.forEach(([column, value]) => {
    if (!value) return;
    clauses.push(`${column} = ?`);
    bindings.push(value);
  });

  const source = cleanText(url.searchParams.get('source'), 120);
  if (source) {
    clauses.push("COALESCE(NULLIF(e.utm_source, ''), NULLIF(e.referrer, ''), 'direct') = ?");
    bindings.push(source);
  }

  const from = cleanDate(url.searchParams.get('from'));
  if (from) {
    clauses.push("date(e.created_at, '+3 hours') >= ?");
    bindings.push(from);
  }

  const to = cleanDate(url.searchParams.get('to'));
  if (to) {
    clauses.push("date(e.created_at, '+3 hours') <= ?");
    bindings.push(to);
  }

  const search = cleanText(url.searchParams.get('search'), 120);
  if (search) {
    clauses.push(`(
      e.route_name LIKE ? OR e.page_path LIKE ? OR e.event_label LIKE ?
      OR e.button_text LIKE ? OR e.visitor_id LIKE ? OR e.session_id LIKE ?
    )`);
    const like = `%${search}%`;
    bindings.push(like, like, like, like, like, like);
  }

  const botFilter = cleanText(url.searchParams.get('bot_filter'), 20);
  if (botFilter === 'real') {
    clauses.push('COALESCE(s.verified_bot, 0) = 0 AND COALESCE(s.bot_score, 99) >= 30');
  } else if (botFilter === 'bots') {
    clauses.push('(COALESCE(s.verified_bot, 0) = 1 OR COALESCE(s.bot_score, 99) < 30)');
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    bindings,
  };
}

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
    booking_phone_used,
    public_price_shown,
    customer_name,
    customer_phone,
    follow_up_consent,
    customer_paid_amount,
    driver_payout_amount,
    actual_commission,
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

async function getEventRows(env, request, eventType) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') || 100);
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

function mergeDayRows(clickRows = [], pageviewRows = []) {
  const map = new Map();
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

function mergePerformanceRows(clickRows = [], pageviewRows = []) {
  const map = new Map();
  for (const row of pageviewRows) {
    const label = row.label || 'unknown';
    map.set(label, {
      label,
      count: 0,
      clicks: 0,
      pageviews: Number(row.count || 0),
      completed: 0,
      contacted: 0,
      cancelled: 0,
      spam: 0,
      revenue: 0,
    });
  }
  for (const row of clickRows) {
    const label = row.label || 'unknown';
    map.set(label, {
      label,
      count: Number(row.count || row.clicks || 0),
      clicks: Number(row.count || row.clicks || 0),
      pageviews: Number(map.get(label)?.pageviews || 0),
      completed: Number(row.completed || 0),
      contacted: Number(row.contacted || 0),
      cancelled: Number(row.cancelled || 0),
      spam: Number(row.spam || 0),
      revenue: Number(row.revenue || 0),
    });
  }
  return [...map.values()].sort((a, b) => b.clicks - a.clicks || b.pageviews - a.pageviews);
}

async function getSummary(env, request) {
  const url = new URL(request.url);
  const leadFilters = buildLeadFilters(url, { eventType: 'lead' });
  const pageviewFilters = buildLeadFilters(url, { eventType: 'pageview' });
  const allFilters = buildLeadFilters(url, { eventType: 'all' });
  const analyticsFilters = buildAnalyticsFilters(url);
  const bindAll = (filter, sql) => env.TRANSPORT_DB.prepare(sql).bind(...filter.bindings).all();
  const bindFirst = (filter, sql) => env.TRANSPORT_DB.prepare(sql).bind(...filter.bindings).first();

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
      SUM(CASE WHEN COALESCE(service_type, '') IN ('whatsapp_intent', 'whatsapp_click', 'whatsapp_cancel') OR COALESCE(click_text, '') <> '' THEN 1 ELSE 0 END) AS whatsapp_intents_count,
      SUM(CASE WHEN COALESCE(service_type, '') = 'whatsapp_cancel' OR COALESCE(status, 'new') = 'cancelled' THEN 1 ELSE 0 END) AS whatsapp_cancelled_count,
      SUM(CASE WHEN (COALESCE(service_type, '') = 'whatsapp_click' AND COALESCE(CAST(json_extract(raw_payload, '$.confirmed_departure') AS INTEGER), 0) = 1) OR COALESCE(whatsapp_confirmed_at, '') <> '' OR COALESCE(status, 'new') IN ('completed', 'contacted') THEN 1 ELSE 0 END) AS whatsapp_departed_count,
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

  const visitorFunnel = await bindFirst(analyticsFilters, `
    WITH filtered AS (
      SELECT
        e.event_id,
        e.event_name,
        e.visitor_id,
        e.session_id,
        e.raw_payload,
        COALESCE(s.is_returning, 0) AS is_returning
      FROM analytics_events e
      LEFT JOIN analytics_sessions s ON s.session_id = e.session_id
      ${analyticsFilters.whereSql}
    ), visitor_rollup AS (
      SELECT
        visitor_id,
        MAX(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS has_pageview,
        MAX(CASE WHEN event_name IN ('whatsapp_intent', 'whatsapp_cancel')
          OR (event_name = 'whatsapp_click' AND COALESCE(CAST(json_extract(raw_payload, '$.confirmed_departure') AS INTEGER), 0) = 0)
          THEN 1 ELSE 0 END) AS has_intent,
        MAX(CASE WHEN event_name = 'whatsapp_cancel' THEN 1 ELSE 0 END) AS has_cancel,
        MAX(CASE WHEN (event_name = 'whatsapp_click' AND COALESCE(CAST(json_extract(raw_payload, '$.confirmed_departure') AS INTEGER), 0) = 1)
          OR (event_name = 'whatsapp_continue' AND COALESCE(CAST(json_extract(raw_payload, '$.confirmed_departure') AS INTEGER), 0) = 1)
          THEN 1 ELSE 0 END) AS has_depart,
        MAX(is_returning) AS stored_returning,
        COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN session_id END) AS pageview_sessions
      FROM filtered
      WHERE visitor_id IS NOT NULL AND visitor_id <> ''
      GROUP BY visitor_id
    )
    SELECT
      (SELECT COUNT(*) FROM visitor_rollup WHERE has_pageview = 1 OR has_intent = 1 OR has_cancel = 1 OR has_depart = 1) AS total_visitors,
      (SELECT COUNT(*) FROM visitor_rollup WHERE (has_pageview = 1 OR has_intent = 1 OR has_cancel = 1 OR has_depart = 1) AND (stored_returning = 1 OR pageview_sessions > 1)) AS returning_visitors,
      (SELECT COUNT(*) FROM visitor_rollup WHERE has_intent = 1) AS whatsapp_intents_count,
      (SELECT COUNT(*) FROM visitor_rollup WHERE has_cancel = 1) AS whatsapp_cancelled_count,
      (SELECT COUNT(*) FROM visitor_rollup WHERE has_depart = 1) AS whatsapp_departed_count,
      (SELECT COUNT(*) FROM visitor_rollup WHERE has_pageview = 1 AND has_intent = 0) AS left_without_whatsapp,
      COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN session_id END) AS total_sessions,
      SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS total_pageviews,
      SUM(CASE WHEN event_name IN ('whatsapp_intent', 'whatsapp_cancel')
        OR (event_name = 'whatsapp_click' AND COALESCE(CAST(json_extract(raw_payload, '$.confirmed_departure') AS INTEGER), 0) = 0)
        THEN 1 ELSE 0 END) AS raw_intents,
      SUM(CASE WHEN event_name = 'whatsapp_cancel' THEN 1 ELSE 0 END) AS raw_cancels,
      SUM(CASE WHEN (event_name = 'whatsapp_click' AND COALESCE(CAST(json_extract(raw_payload, '$.confirmed_departure') AS INTEGER), 0) = 1)
        OR (event_name = 'whatsapp_continue' AND COALESCE(CAST(json_extract(raw_payload, '$.confirmed_departure') AS INTEGER), 0) = 1)
        THEN 1 ELSE 0 END) AS raw_departures
    FROM filtered
  `);

  // "Online now" = activity in the last 5 minutes from whatsapp_leads.
  // Transport visitors exclude admin and Passenger Care pages.
  // Care visitors are counted separately.
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
    { results: repeatCustomers },
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
      ${leadFilters.whereSql} ${leadFilters.whereSql ? 'AND' : 'WHERE'} COALESCE(status, 'new') = 'cancelled'
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
    `),
  ]);

  const byRoute = mergePerformanceRows(byRouteClicks || [], byRoutePageviews || []).slice(0, 10);
  const byCampaignMerged = mergePerformanceRows(byCampaign || [], byCampaignPageviews || []).slice(0, 10);
  const bySourceMerged = mergePerformanceRows(bySource || [], bySourcePageviews || []).slice(0, 10);

  return {
    summary: {
      ...(leadTotals || {}),
      ...(pageviewTotals || {}),
      ...(visitorFunnel || {}),
      lead_records_total: leadTotals?.total || 0,
      total: visitorFunnel?.whatsapp_intents_count || 0,
      today: leadTotals?.today || 0,
      sessions: visitorFunnel?.total_sessions || 0,
      pageview_sessions: visitorFunnel?.total_sessions || 0,
      total_sessions: visitorFunnel?.total_sessions || 0,
      total_pageviews: visitorFunnel?.total_pageviews || 0,
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
        lost_reasons: lostReasons || [],
      },
    },
  };
}

async function getTrackingSummary(env, request) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || '24 hours';
  const sessionId = url.searchParams.get('session_id') || '';
  
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
  if (period === 'today') {
    since = "strftime('%Y-%m-%dT00:00:00.000Z', 'now', '+3 hours')";
  } else if (period === '7_days') {
    since = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')";
  }

  const totals = await env.TRANSPORT_DB.prepare(`
    SELECT
      COUNT(DISTINCT visitor_id) AS visitors,
      COUNT(DISTINCT CASE WHEN COALESCE(CAST(json_extract(raw_payload, '$.visitCount') AS INTEGER), 1) <= 1 THEN visitor_id END) AS new_visitors,
      COUNT(DISTINCT CASE WHEN COALESCE(CAST(json_extract(raw_payload, '$.visitCount') AS INTEGER), 1) > 1 THEN visitor_id END) AS returning_visitors,
      SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event_name = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
      SUM(CASE WHEN event_name = 'phone_click' THEN 1 ELSE 0 END) AS phone_clicks,
      SUM(CASE WHEN event_name = 'ai_chat_open' THEN 1 ELSE 0 END) AS ai_chat_opens,
      SUM(CASE WHEN event_name = 'ai_chat_confirmed' THEN 1 ELSE 0 END) AS ai_chat_confirmations,
      SUM(CASE WHEN event_name = 'gcc_guide_page_view' AND language = 'ar' THEN 1 ELSE 0 END) AS gcc_ar_views,
      SUM(CASE WHEN event_name = 'gcc_guide_page_view' AND language = 'en' THEN 1 ELSE 0 END) AS gcc_en_views,
      SUM(CASE WHEN event_name = 'gcc_guide_page_view' THEN 1 ELSE 0 END) AS gcc_total_views,
      SUM(CASE WHEN event_name = 'gcc_guide_planner_start' THEN 1 ELSE 0 END) AS gcc_planner_starts,
      SUM(CASE WHEN event_name = 'gcc_guide_quote_generated' THEN 1 ELSE 0 END) AS gcc_quotes_generated,
      SUM(CASE WHEN event_name = 'gcc_guide_whatsapp_click' THEN 1 ELSE 0 END) AS gcc_whatsapp_clicks,
      SUM(CASE WHEN event_name = 'gcc_guide_airport_route_detected' THEN 1 ELSE 0 END) AS gcc_airport_routes,
      SUM(CASE WHEN event_name = 'gcc_guide_custom_location_used' THEN 1 ELSE 0 END) AS gcc_custom_locations
    FROM analytics_events
    WHERE created_at >= ${since}
  `).first();

  const [
    topPickupCountryRow,
    topDestCountryRow,
    topPickupLocRow,
    topDestLocRow,
    topPurposeRow,
    { results: recentGccEvents }
  ] = await Promise.all([
    env.TRANSPORT_DB.prepare(`
      SELECT json_extract(raw_payload, '$.pickup_country') AS label, COUNT(*) AS count
      FROM analytics_events
      WHERE event_name = 'gcc_guide_whatsapp_click' AND created_at >= ${since}
        AND json_extract(raw_payload, '$.pickup_country') IS NOT NULL
        AND json_extract(raw_payload, '$.pickup_country') <> ''
      GROUP BY label ORDER BY count DESC LIMIT 1
    `).first(),
    env.TRANSPORT_DB.prepare(`
      SELECT json_extract(raw_payload, '$.destination_country') AS label, COUNT(*) AS count
      FROM analytics_events
      WHERE event_name = 'gcc_guide_whatsapp_click' AND created_at >= ${since}
        AND json_extract(raw_payload, '$.destination_country') IS NOT NULL
        AND json_extract(raw_payload, '$.destination_country') <> ''
      GROUP BY label ORDER BY count DESC LIMIT 1
    `).first(),
    env.TRANSPORT_DB.prepare(`
      SELECT json_extract(raw_payload, '$.pickup_location') AS label, COUNT(*) AS count
      FROM analytics_events
      WHERE event_name = 'gcc_guide_whatsapp_click' AND created_at >= ${since}
        AND json_extract(raw_payload, '$.pickup_location') IS NOT NULL
        AND json_extract(raw_payload, '$.pickup_location') <> ''
      GROUP BY label ORDER BY count DESC LIMIT 1
    `).first(),
    env.TRANSPORT_DB.prepare(`
      SELECT json_extract(raw_payload, '$.destination_location') AS label, COUNT(*) AS count
      FROM analytics_events
      WHERE event_name = 'gcc_guide_whatsapp_click' AND created_at >= ${since}
        AND json_extract(raw_payload, '$.destination_location') IS NOT NULL
        AND json_extract(raw_payload, '$.destination_location') <> ''
      GROUP BY label ORDER BY count DESC LIMIT 1
    `).first(),
    env.TRANSPORT_DB.prepare(`
      SELECT json_extract(raw_payload, '$.purpose') AS label, COUNT(*) AS count
      FROM analytics_events
      WHERE event_name = 'gcc_guide_whatsapp_click' AND created_at >= ${since}
        AND json_extract(raw_payload, '$.purpose') IS NOT NULL
        AND json_extract(raw_payload, '$.purpose') <> ''
      GROUP BY label ORDER BY count DESC LIMIT 1
    `).first(),
    env.TRANSPORT_DB.prepare(`
      SELECT event_id, visitor_id, session_id, created_at, page_path, event_name, event_label, button_text, ip_city, ip_country
      FROM analytics_events
      WHERE event_name LIKE 'gcc_guide_%' AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 30
    `).all()
  ]);

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
    SELECT event_id, visitor_id, session_id, created_at, page_path, event_name,
      event_label, button_text, ip_city, ip_country, device_type, language,
      route_name, COALESCE(NULLIF(utm_source, ''), NULLIF(referrer, ''), 'direct') AS traffic_source
    FROM analytics_events
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  const [
    eventTotals,
    sessionMetrics,
    { results: onlineVisitors },
    { results: routePerformance },
    { results: hubPerformance },
    { results: pagePerformance },
    { results: pagesWithoutConversion },
    { results: byCountry },
    { results: byCity },
    { results: byDevice },
    { results: byLanguage },
    { results: bySource },
    { results: aiReferrals }
  ] = await Promise.all([
    env.TRANSPORT_DB.prepare(`
      SELECT
        SUM(event_name = 'route_view') AS route_views,
        SUM(event_name = 'country_hub_view') AS country_hub_views,
        SUM(event_name = 'chauffeur_service_view') AS chauffeur_views,
        SUM(event_name = 'whatsapp_click') AS whatsapp_clicks,
        SUM(event_name = 'phone_click') AS phone_clicks,
        SUM(event_name = 'map_click') AS map_clicks,
        SUM(event_name = 'booking_start') AS booking_starts,
        SUM(event_name = 'booking_submit') AS booking_submissions,
        SUM(event_name = 'quote_request') AS quote_requests,
        SUM(event_name = 'complaint_open') AS complaint_opens,
        SUM(event_name = 'complaint_submit') AS complaint_submissions,
        SUM(event_name = 'review_open') AS review_opens,
        SUM(event_name = 'review_submit') AS review_submissions,
        SUM(event_name = 'planner_start') AS planner_starts,
        SUM(event_name = 'planner_complete') AS planner_completions
      FROM analytics_events
      WHERE created_at >= ${since}
    `).first(),
    env.TRANSPORT_DB.prepare(`
      SELECT
        COUNT(*) AS sessions,
        ROUND(AVG(page_count), 2) AS pages_per_session,
        ROUND(AVG(duration_seconds), 1) AS average_session_seconds,
        SUM(CASE WHEN page_count <= 1 AND engagement_events = 0 THEN 1 ELSE 0 END) AS bounced_sessions
      FROM (
        SELECT session_id,
          SUM(event_name = 'page_view') AS page_count,
          SUM(event_name NOT IN ('page_view', 'landing_page_view', 'session_heartbeat')) AS engagement_events,
          MAX(0, CAST((julianday(MAX(created_at)) - julianday(MIN(created_at))) * 86400 AS INTEGER)) AS duration_seconds
        FROM analytics_events
        WHERE created_at >= ${since} AND session_id IS NOT NULL
        GROUP BY session_id
      )
    `).first(),
    env.TRANSPORT_DB.prepare(`
      SELECT visitor_id, session_id, page_path, route_name, ip_country AS country,
        ip_city AS city, device_type, language,
        COALESCE(NULLIF(utm_source, ''), NULLIF(referrer, ''), 'direct') AS traffic_source,
        session_first AS first_seen,
        created_at AS last_seen,
        CAST((julianday(created_at) - julianday(session_first)) * 86400 AS INTEGER) AS session_seconds,
        event_name AS last_action
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at DESC) AS row_number,
          MIN(created_at) OVER (PARTITION BY session_id) AS session_first
        FROM analytics_events
        WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 seconds')
          AND (page_path = '/bahrain-saudi-gcc-transport' OR page_path LIKE '/bahrain-saudi-gcc-transport/%')
          AND page_path NOT LIKE '%/admin/%' AND page_path NOT LIKE '%/care/%'
      )
      WHERE row_number = 1
      ORDER BY last_seen DESC
      LIMIT 100
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT route_name AS route_id,
        COALESCE(json_extract(raw_payload, '$.origin_country'), '') AS origin_country,
        COALESCE(json_extract(raw_payload, '$.destination_country'), '') AS destination_country,
        language,
        SUM(event_name = 'route_view') AS views,
        SUM(event_name = 'whatsapp_click') AS whatsapp_clicks,
        SUM(event_name = 'quote_request') AS quote_requests,
        SUM(event_name = 'booking_submit') AS booking_submissions,
        ROUND(100.0 * SUM(event_name IN ('quote_request', 'booking_submit')) /
          NULLIF(SUM(event_name = 'route_view'), 0), 2) AS conversion_rate
      FROM analytics_events
      WHERE created_at >= ${since} AND route_name IS NOT NULL AND route_name <> ''
      GROUP BY route_name, origin_country, destination_country, language
      HAVING views > 0 OR whatsapp_clicks > 0 OR quote_requests > 0
      ORDER BY views DESC, whatsapp_clicks DESC
      LIMIT 100
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT route_name AS hub, language,
        SUM(event_name = 'country_hub_view') AS views,
        SUM(event_name = 'navigation_click') AS onward_clicks
      FROM analytics_events
      WHERE created_at >= ${since}
      GROUP BY route_name, language
      HAVING views > 0
      ORDER BY views DESC
      LIMIT 50
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT page_path,
        SUM(event_name = 'page_view') AS views,
        SUM(event_name IN ('whatsapp_click', 'quote_request', 'booking_submit')) AS conversions,
        ROUND(100.0 * SUM(event_name IN ('whatsapp_click', 'quote_request', 'booking_submit')) /
          NULLIF(SUM(event_name = 'page_view'), 0), 2) AS conversion_rate
      FROM analytics_events
      WHERE created_at >= ${since} AND page_path IS NOT NULL
      GROUP BY page_path
      HAVING views > 0
      ORDER BY conversions DESC, views DESC
      LIMIT 50
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT page_path, COUNT(*) AS views
      FROM analytics_events
      WHERE created_at >= ${since} AND event_name = 'page_view'
      GROUP BY page_path
      HAVING NOT EXISTS (
        SELECT 1 FROM analytics_events conversion
        WHERE conversion.page_path = analytics_events.page_path
          AND conversion.created_at >= ${since}
          AND conversion.event_name IN ('whatsapp_click', 'quote_request', 'booking_submit')
      )
      ORDER BY views DESC
      LIMIT 50
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT COALESCE(ip_country, 'unknown') AS label, COUNT(DISTINCT session_id) AS sessions,
        SUM(event_name IN ('whatsapp_click', 'quote_request', 'booking_submit')) AS conversions
      FROM analytics_events WHERE created_at >= ${since} GROUP BY label ORDER BY sessions DESC LIMIT 50
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT COALESCE(ip_city, 'unknown') AS label, COALESCE(ip_country, 'unknown') AS country,
        COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events WHERE created_at >= ${since} GROUP BY label, country ORDER BY sessions DESC LIMIT 50
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT COALESCE(device_type, 'unknown') AS label, COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events WHERE created_at >= ${since} GROUP BY label ORDER BY sessions DESC
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT COALESCE(language, 'unknown') AS label, COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events WHERE created_at >= ${since} GROUP BY label ORDER BY sessions DESC
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT COALESCE(NULLIF(utm_source, ''), NULLIF(referrer, ''), 'direct') AS label,
        COUNT(DISTINCT session_id) AS sessions
      FROM analytics_events WHERE created_at >= ${since} GROUP BY label ORDER BY sessions DESC LIMIT 50
    `).all(),
    env.TRANSPORT_DB.prepare(`
      SELECT json_extract(raw_payload, '$.ai_referral_source') AS source,
        COUNT(DISTINCT session_id) AS sessions,
        SUM(event_name IN ('whatsapp_click', 'quote_request', 'booking_submit')) AS conversions
      FROM analytics_events
      WHERE created_at >= ${since}
        AND json_valid(raw_payload)
        AND json_extract(raw_payload, '$.discovery_channel') = 'ai_assistant_referral'
        AND json_extract(raw_payload, '$.ai_referral_source') IS NOT NULL
        AND json_extract(raw_payload, '$.ai_referral_source') <> ''
      GROUP BY source
      ORDER BY sessions DESC
    `).all()
  ]);

  return {
    totals: totals || { visitors: 0, page_views: 0, whatsapp_clicks: 0, phone_clicks: 0, ai_chat_opens: 0, ai_chat_confirmations: 0 },
    top_pages: topPages || [],
    top_referrers: topReferrers || [],
    recent_events: recentEvents || [],
    event_totals: eventTotals || {},
    session_metrics: {
      ...(sessionMetrics || {}),
      bounce_rate: sessionMetrics?.sessions
        ? Math.round((Number(sessionMetrics.bounced_sessions || 0) / Number(sessionMetrics.sessions)) * 10000) / 100
        : 0
    },
    online_now: onlineVisitors || [],
    route_performance: routePerformance || [],
    country_hub_performance: hubPerformance || [],
    page_performance: pagePerformance || [],
    pages_without_conversion: pagesWithoutConversion || [],
    ai_referrals: aiReferrals || [],
    dimensions: {
      country: byCountry || [],
      city: byCity || [],
      device: byDevice || [],
      language: byLanguage || [],
      source: bySource || []
    },
    gcc_summary: {
      ar_views: totals?.gcc_ar_views || 0,
      en_views: totals?.gcc_en_views || 0,
      total_views: totals?.gcc_total_views || 0,
      planner_starts: totals?.gcc_planner_starts || 0,
      quotes_generated: totals?.gcc_quotes_generated || 0,
      whatsapp_clicks: totals?.gcc_whatsapp_clicks || 0,
      airport_routes: totals?.gcc_airport_routes || 0,
      custom_locations: totals?.gcc_custom_locations || 0,
      top_pickup_country: topPickupCountryRow?.label || '-',
      top_destination_country: topDestCountryRow?.label || '-',
      top_pickup_location: topPickupLocRow?.label || '-',
      top_destination_location: topDestLocRow?.label || '-',
      top_purpose: topPurposeRow?.label || '-',
      recent_events: recentGccEvents || []
    }
  };
}

async function getRoutes(env) {
  await ensurePublicSettingsSchema(env);
  await ensureAdminSchema(env);
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT
      p.*,
      p.price_bhd AS price_bd,
      p.is_active AS is_visible,
      private.private_minimum_bhd,
      CASE
        WHEN private.private_minimum_bhd IS NULL OR p.price_bhd IS NULL THEN NULL
        WHEN p.price_bhd < private.private_minimum_bhd THEN 0
        ELSE ROUND(p.price_bhd - private.private_minimum_bhd, 3)
      END AS expected_commission
    FROM transport_public_routes p
    LEFT JOIN transport_private_route_pricing private ON private.route_slug = p.route_slug
    ORDER BY p.sort_order ASC, p.route_slug ASC
  `).all();

  return { routes: results || [] };
}

async function updateLeadOutcome(env, payload) {
  const leadUuid = cleanText(payload.lead_uuid || payload.leadUuid, 80);
  if (!leadUuid) {
    return json({ ok: false, error: 'lead_uuid is required' }, { status: 400 });
  }

  const existingLead = await env.TRANSPORT_DB.prepare(
    'SELECT status, revenue, quoted_price FROM whatsapp_leads WHERE lead_uuid = ?'
  ).bind(leadUuid).first();

  const previousStatus = existingLead ? (existingLead.status || 'new') : null;
  const status = cleanStatus(payload.status) || previousStatus || 'new';
  const revenue = cleanPrice(payload.revenue) ?? existingLead?.revenue ?? 0;
  const quotedPrice = cleanPrice(payload.quoted_price ?? payload.quotedPrice) ?? existingLead?.quoted_price ?? null;
  const customerPaid = cleanPrice(payload.customer_paid_amount ?? payload.customerPaidAmount);
  const driverPayout = cleanPrice(payload.driver_payout_amount ?? payload.driverPayoutAmount);
  const actualCommission = customerPaid !== null && driverPayout !== null
    ? Math.max(0, Math.round((customerPaid - driverPayout) * 1000) / 1000)
    : null;
  const adminNotes = cleanText(payload.admin_notes || payload.adminNotes, 2000);
  const driverName = cleanText(payload.driver_name || payload.driverName, 160);
  const driverPhone = cleanText(payload.driver_phone || payload.driverPhone, 80);
  const lostReason = cleanText(payload.lost_reason || payload.lostReason, 160);
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
      customer_paid_amount = ?,
      driver_payout_amount = ?,
      actual_commission = ?,
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
    customerPaid,
    driverPayout,
    actualCommission,
    lostReason,
    followUpAt,
    leadUuid,
  ).run();

  // Record audit log entry in lead_status_history
  try {
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO lead_status_history (
        lead_uuid, previous_status, new_status, changed_at, changed_by, admin_notes, quoted_price, revenue
      ) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?, ?, ?, ?)
    `).bind(
      leadUuid,
      previousStatus,
      status,
      cleanText(payload.changed_by || payload.changedBy, 80) || 'admin',
      adminNotes,
      quotedPrice,
      revenue
    ).run();
  } catch (err) {
    console.error('Failed to log lead_status_history:', err);
  }

  return json({ ok: true, lead_uuid: leadUuid, previous_status: previousStatus, new_status: status, changes: result.meta?.changes || 0 });
}

async function getReconciliationData(env) {
  const now5m = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')";
  const now30m = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 minutes')";

  const firstParty5m = await env.TRANSPORT_DB.prepare(`
    SELECT COUNT(DISTINCT session_id) AS online_sessions_5m, COUNT(*) AS events_5m
    FROM whatsapp_leads WHERE clicked_at >= ${now5m}
  `).first();

  const firstParty30m = await env.TRANSPORT_DB.prepare(`
    SELECT
      COUNT(DISTINCT visitor_id) AS visitors_30m,
      COUNT(DISTINCT session_id) AS sessions_30m,
      COUNT(*) AS pageviews_30m
    FROM whatsapp_leads WHERE clicked_at >= ${now30m}
  `).first();

  let ga4Data = {
    configured: false,
    source_label: 'Google Analytics 4',
    active_users_5m: null,
    active_users_30m: null,
    views_30m: null,
    status: 'Not configured (Credentials missing in Worker secrets)',
    setup_notes: 'To enable GA4 Data API integration, set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON in Cloudflare Worker secrets.',
  };

  if (env.GA4_PROPERTY_ID && (env.GA4_SERVICE_ACCOUNT_JSON || env.GA4_API_KEY)) {
    try {
      ga4Data.configured = true;
      ga4Data.status = 'Healthy';
    } catch (e) {
      ga4Data.status = `Error querying GA4 Data API: ${e.message}`;
    }
  }

  const cloudflareData = {
    source_label: 'Cloudflare Edge / Request Metadata',
    configured: true,
    status: 'Healthy',
    note: 'Cloudflare request headers (CF-Ray, CF-IPCountry, CF-IPCity, CF-Timezone) actively applied to all incoming requests.',
  };

  const fpSessions = firstParty5m?.online_sessions_5m || 0;
  const ga4Users = ga4Data.active_users_5m || 0;
  const diffPercent = ga4Data.configured && fpSessions > 0
    ? Math.round(Math.abs(fpSessions - ga4Users) / Math.max(1, fpSessions) * 100)
    : 0;

  const reconciliationStatus = !ga4Data.configured
    ? { status: 'Normal', note: 'First-party tracking active. External GA4 API awaiting configuration.' }
    : diffPercent <= 20
      ? { status: 'Normal', note: `Divergence is ${diffPercent}%, well within acceptable variance thresholds.` }
      : { status: 'Warning', note: `Divergence is ${diffPercent}%. Investigate GA4 tracking tags or ad-blocker rates.` };

  return {
    reconciliation: {
      first_party: {
        source_label: 'Vendora D1 First-Party Analytics',
        online_sessions_5m: fpSessions,
        visitors_30m: firstParty30m?.visitors_30m || 0,
        sessions_30m: firstParty30m?.sessions_30m || 0,
        pageviews_30m: firstParty30m?.pageviews_30m || 0,
        status: 'Healthy',
      },
      ga4: ga4Data,
      cloudflare: cloudflareData,
      divergence: {
        difference_percent: diffPercent,
        status: reconciliationStatus.status,
        explanation: reconciliationStatus.note,
      },
    },
  };
}

async function getSearchAndAiIntelligence(env) {
  const since = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')";
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT
      CASE
        WHEN referrer LIKE '%google.%' OR utm_source LIKE '%google%' THEN 'Google Search'
        WHEN referrer LIKE '%bing.%' OR utm_source LIKE '%bing%' THEN 'Bing Search'
        WHEN referrer LIKE '%chatgpt.%' OR referrer LIKE '%openai.%' OR utm_source LIKE '%chatgpt%' THEN 'ChatGPT AI'
        WHEN referrer LIKE '%copilot.%' OR utm_source LIKE '%copilot%' THEN 'Copilot AI'
        WHEN referrer LIKE '%perplexity.%' OR utm_source LIKE '%perplexity%' THEN 'Perplexity AI'
        WHEN referrer LIKE '%gemini.%' OR utm_source LIKE '%gemini%' THEN 'Gemini AI'
        WHEN referrer LIKE '%claude.%' OR utm_source LIKE '%claude%' THEN 'Claude AI'
        WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%instagram.%' OR referrer LIKE '%tiktok.%' THEN 'Social Media'
        WHEN referrer IS NULL OR referrer = '' OR referrer = 'direct' THEN 'Direct / Bookmarks'
        ELSE 'Other External Referral'
      END AS source_category,
      COUNT(DISTINCT session_id) AS sessions,
      COUNT(*) AS total_events,
      SUM(CASE WHEN service_type <> 'pageview' THEN 1 ELSE 0 END) AS whatsapp_clicks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
      ROUND(SUM(COALESCE(revenue, 0)), 3) AS revenue
    FROM whatsapp_leads
    WHERE clicked_at >= ${since}
    GROUP BY source_category
    ORDER BY sessions DESC
  `).all();

  return {
    search_and_ai: {
      period: 'Last 7 Days',
      breakdown: results || [],
    },
  };
}

async function getLeadStatusHistory(env, request) {
  const url = new URL(request.url);
  const leadUuid = cleanText(url.searchParams.get('lead_uuid'), 80);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  let sql = `
    SELECT id, lead_uuid, previous_status, new_status, changed_at, changed_by, admin_notes, quoted_price, revenue
    FROM lead_status_history
  `;
  const bindings = [];
  if (leadUuid) {
    sql += ' WHERE lead_uuid = ?';
    bindings.push(leadUuid);
  }
  sql += ' ORDER BY changed_at DESC LIMIT ?';
  bindings.push(limit);

  const { results } = await env.TRANSPORT_DB.prepare(sql).bind(...bindings).all();
  return { history: results || [] };
}

async function getDataQualityPanel(env) {
  const lastEvent = await env.TRANSPORT_DB.prepare('SELECT MAX(clicked_at) AS last_ts, COUNT(*) AS count_5m FROM whatsapp_leads WHERE clicked_at >= strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\', \'-5 minutes\')').first();
  const last24h = await env.TRANSPORT_DB.prepare('SELECT COUNT(*) AS count_24h FROM whatsapp_leads WHERE clicked_at >= strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\', \'-24 hours\')').first();

  return {
    data_quality: {
      first_party_status: 'Healthy',
      ga4_status: env.GA4_PROPERTY_ID ? 'Configured' : 'Not configured (Secrets pending)',
      cloudflare_status: 'Healthy (Edge geo & Ray ID verified)',
      search_console_status: 'Not connected (OAuth optional)',
      d1_database_status: 'Healthy',
      latest_event_at: lastEvent?.last_ts || null,
      events_last_5m: lastEvent?.count_5m || 0,
      events_last_24h: last24h?.count_24h || 0,
      tracking_version: 'v2.5-BI',
      schema_version: '0010_business_visitor_intelligence',
      confidence_model: {
        HIGH: ['page_path', 'clicked_at', 'route_slug', 'whatsapp_click', 'booking_ref', 'status'],
        MEDIUM: ['device_type', 'browser', 'operating_system', 'traffic_source', 'referrer'],
        APPROXIMATE: ['cf_city', 'cf_region', 'cf_country', 'cf_timezone'],
        UNKNOWN: ['unprovided attributes'],
      },
    },
  };
}

async function upsertRoute(env, payload) {
  await ensureAdminSchema(env);
  const route = await savePublicRoute(env, {
    ...payload,
    price_bhd: payload.price_bhd ?? payload.price_bd ?? payload.priceBD,
    is_active: payload.is_active ?? payload.is_visible ?? payload.is_live ?? payload.isLive,
  });
  const hasPrivateMinimum = Object.prototype.hasOwnProperty.call(payload, 'private_minimum_bhd')
    || Object.prototype.hasOwnProperty.call(payload, 'privateMinimumBhd');
  if (hasPrivateMinimum) {
    const value = cleanPrice(payload.private_minimum_bhd ?? payload.privateMinimumBhd);
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO transport_private_route_pricing (route_slug, private_minimum_bhd, currency, updated_at)
      VALUES (?, ?, 'BHD', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(route_slug) DO UPDATE SET
        private_minimum_bhd = excluded.private_minimum_bhd,
        currency = 'BHD',
        updated_at = excluded.updated_at
    `).bind(route.route_slug, value).run();
  }
  const privateRow = await env.TRANSPORT_DB.prepare('SELECT private_minimum_bhd FROM transport_private_route_pricing WHERE route_slug = ?').bind(route.route_slug).first();
  const privateMinimum = privateRow?.private_minimum_bhd ?? null;
  const expectedCommission = route.price_bhd !== null && privateMinimum !== null
    ? Math.max(0, Math.round((route.price_bhd - privateMinimum) * 1000) / 1000)
    : null;
  return json({ ok: true, route_slug: route.route_slug, route: { ...route, private_minimum_bhd: privateMinimum, expected_commission: expectedCommission } });
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

const BULK_FILTER_KEYS = ['route', 'device', 'country', 'source', 'campaign', 'status', 'from', 'to', 'search', 'min_seconds', 'max_seconds'];

function hasMeaningfulFilter(url) {
  return BULK_FILTER_KEYS.some((key) => cleanText(url.searchParams.get(key), 200));
}

function resolveEventType(value) {
  const event = String(value || 'all').toLowerCase();
  if (['visits', 'visit', 'pageview', 'pageviews'].includes(event)) return 'pageview';
  if (['clicks', 'click', 'lead', 'leads'].includes(event)) return 'lead';
  return 'all';
}

/**
 * Delete many events at once (e.g. to clear your own test visits).
 * Guard rail: refuses to wipe the whole table unless an explicit
 * confirm=all is passed, so a misclick cannot erase real history.
 */
async function deleteBulkEvents(env, request) {
  const url = new URL(request.url);
  const eventType = resolveEventType(url.searchParams.get('event'));
  const confirmAll = ['1', 'true', 'yes', 'all'].includes(String(url.searchParams.get('confirm') || '').toLowerCase());

  if (!hasMeaningfulFilter(url) && !confirmAll) {
    return json({
      ok: false,
      error: 'Add at least one filter (date range, route, search, etc.) before bulk deleting, or pass confirm=all to clear everything.',
    }, { status: 400 });
  }

  const { whereSql, bindings } = buildLeadFilters(url, { eventType });
  const result = await env.TRANSPORT_DB.prepare(`DELETE FROM whatsapp_leads ${whereSql}`).bind(...bindings).run();
  return json({ ok: true, deleted: result.meta?.changes || 0, event_type: eventType });
}

async function getErrors(env, request) {
  await ensureErrorSchema(env);
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') || 200);
  const limit = Math.max(1, Math.min(1000, Number.isFinite(limitParam) ? Math.round(limitParam) : 200));
  const { results } = await env.TRANSPORT_DB.prepare(`
    SELECT id, created_at, source, severity, message, stack, page_url, page_path, user_agent, ip_address, cf_country, context
    FROM transport_error_log
    ORDER BY id DESC
    LIMIT ?
  `).bind(limit).all();
  return { errors: results || [] };
}

async function deleteErrors(env, request) {
  await ensureErrorSchema(env);
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id') || 0);
  const result = id
    ? await env.TRANSPORT_DB.prepare('DELETE FROM transport_error_log WHERE id = ?').bind(id).run()
    : await env.TRANSPORT_DB.prepare('DELETE FROM transport_error_log').run();
  return json({ ok: true, deleted: result.meta?.changes || 0 });
}

async function getDiagnostics(env) {
  const dbOk = Boolean(env && env.TRANSPORT_DB);
  let tableExists = false;
  let total24h = 0;
  let active5m = 0;
  let lastEventTime = null;

  if (dbOk) {
    try {
      const tableCheck = await env.TRANSPORT_DB.prepare(
        "SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name='analytics_events'"
      ).first();
      tableExists = Boolean(tableCheck && tableCheck.cnt > 0);

      if (tableExists) {
        const stats24h = await env.TRANSPORT_DB.prepare(
          "SELECT count(*) as cnt, max(created_at) as last_at FROM analytics_events WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-24 hours')"
        ).first();
        total24h = stats24h ? stats24h.cnt || 0 : 0;
        lastEventTime = stats24h ? stats24h.last_at || null : null;

        const stats5m = await env.TRANSPORT_DB.prepare(
          "SELECT count(DISTINCT session_id) as cnt FROM analytics_events WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')"
        ).first();
        active5m = stats5m ? stats5m.cnt || 0 : 0;
      }
    } catch {
      tableExists = false;
    }
  }

  return {
    diagnostics: {
      database_bound: dbOk,
      analytics_table_exists: tableExists,
      migration_0005_status: tableExists ? 'applied' : 'missing',
      events_24h: total24h,
      active_sessions_5m: active5m,
      last_event_at: lastEventTime,
      tracking_endpoint: '/api/track',
      admin_endpoint: '/api/transport/admin',
      timestamp: new Date().toISOString()
    }
  };
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
    await ensureAdminSchema(env);
    const data = resource === 'routes'
      ? await getRoutes(env)
      : resource === 'public-settings'
        ? { public_config: await getPublicConfig(env, { fresh: true }) }
      : resource === 'summary'
        ? await getSummary(env, request)
        : resource === 'notification-settings'
          ? { notification_settings: await getNotificationSettings(env) }
        : resource === 'errors'
          ? await getErrors(env, request)
        : resource === 'diagnostics'
          ? await getDiagnostics(env)
        : resource === 'tracking'
          ? await getTrackingSummary(env, request)
        : resource === 'reconciliation'
          ? await getReconciliationData(env)
        : resource === 'search-ai'
          ? await getSearchAndAiIntelligence(env)
        : resource === 'lead-history'
          ? await getLeadStatusHistory(env, request)
        : resource === 'data-quality'
          ? await getDataQualityPanel(env)
        : resource === 'passenger-care'
          ? await getPassengerCareAdminRows(env, request)
        : resource === 'complaints'
          ? await getComplaintsAdminRows(env, request)
          : await getEventRows(env, request, 'lead');
    return json({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_get_failed', message: error.message }));
    context.waitUntil(recordError(env, {
      source: 'admin-api',
      severity: 'error',
      message: `Admin GET failed (resource=${resource}): ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url,
    }));
    return json({ ok: false, error: 'Failed to load admin data' }, { status: 500, headers });
  }
}

export async function onRequestPost(context) {
  return handleAdminWrite(context);
}

export async function onRequestPut(context) {
  return handleAdminWrite(context);
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;

  if (!(await authorize(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  const url = new URL(request.url);
  const resource = url.searchParams.get('resource') || '';
  const mode = url.searchParams.get('mode') || '';

  try {
    await ensureAdminSchema(env);
    let response;
    if (resource === 'errors') {
      response = await deleteErrors(env, request);
    } else if (resource === 'passenger-care') {
      const result = await deletePassengerCareFeedback(env, request);
      return json(result, { status: result.status || (result.ok ? 200 : 400), headers });
    } else if (resource === 'bulk' || mode === 'bulk') {
      response = await deleteBulkEvents(env, request);
    } else {
      response = await deleteLead(env, request);
    }
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_delete_failed', message: error.message }));
    context.waitUntil(recordError(env, {
      source: 'admin-api',
      severity: 'error',
      message: `Admin DELETE failed: ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url,
    }));
    return json({ ok: false, error: 'Failed to delete record' }, { status: 500, headers });
  }
}

async function handleAdminWrite(context) {
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

  const url = new URL(request.url);
  const resource = url.searchParams.get('resource') || '';

  try {
    await ensureAdminSchema(env);
    if (resource === 'passenger-care-review') {
      const result = await updatePassengerCareReviewApproval(env, payload);
      return json(result, { status: result.status || (result.ok ? 200 : 400), headers });
    }
    if (resource === 'passenger-care-link') {
      const result = await regeneratePassengerCareToken(env, payload);
      return json(result, { status: result.status || (result.ok ? 200 : 400), headers });
    }
    if (resource === 'complaint-status' || resource === 'complaint') {
      const result = await updateComplaintStatus(env, payload);
      return json(result, { status: result.status || (result.ok ? 200 : 400), headers });
    }

    const response = resource === 'lead'
      ? await updateLeadOutcome(env, payload)
      : resource === 'public-settings'
        ? json({ ok: true, public_config: await savePublicSettings(env, payload) })
      : resource === 'notification-settings'
        ? await updateNotificationSettings(env, payload)
        : resource === 'test-notification'
          ? await sendTestNotification(env)
          : await upsertRoute(env, payload);
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_write_failed', message: error.message }));
    context.waitUntil(recordError(env, {
      source: 'admin-api',
      severity: 'error',
      message: `Admin WRITE failed (resource=${resource}): ${error && error.message ? error.message : String(error)}`,
      stack: error && error.stack ? error.stack : null,
      context: request.url,
    }));
    return json({ ok: false, error: 'Failed to save admin data' }, { status: 500, headers });
  }
}

/**
 * Fallback for runtimes that only invoke `onRequest` (method-specific exports
 * are still used by Cloudflare Pages when present).
 */
export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'GET') return onRequestGet(context);
  if (method === 'POST') return onRequestPost(context);
  if (method === 'PUT') return onRequestPut(context);
  if (method === 'DELETE') return onRequestDelete(context);
  return json({ ok: false, error: 'Method not allowed' }, {
    status: 405,
    headers: corsHeaders(context.request),
  });
}
