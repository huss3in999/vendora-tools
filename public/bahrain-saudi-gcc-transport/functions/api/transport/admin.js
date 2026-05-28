const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'null',
]);

const MAX_BODY_BYTES = 8192;
const MAX_LEADS_LIMIT = 1000;
const VISITOR_ID_EXPR = "CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.visitorId'), '') ELSE NULL END";
const VISIT_COUNT_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.visitCount'), 1) AS INTEGER) ELSE 1 END";
const SESSION_PAGE_VIEWS_EXPR = "CASE WHEN json_valid(raw_payload) THEN CAST(COALESCE(json_extract(raw_payload, '$.sessionPageViews'), 1) AS INTEGER) ELSE 1 END";
const TRAFFIC_SOURCE_EXPR = "COALESCE(NULLIF(utm_source, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.firstTrafficSource'), '') END, CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.trafficSource'), '') END, 'direct/unknown')";
const CAMPAIGN_EXPR = "COALESCE(NULLIF(utm_campaign, ''), CASE WHEN json_valid(raw_payload) THEN NULLIF(json_extract(raw_payload, '$.utmCampaign'), '') END, 'no campaign')";

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
];

let schemaReady = false;
let settingsSchemaReady = false;

const DEFAULT_NOTIFICATION_SETTINGS = {
  notifications_enabled: true,
  notify_whatsapp_clicks: true,
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
  return ['new', 'contacted', 'completed', 'cancelled', 'spam'].includes(status) ? status : null;
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
  if (schemaReady) return;

  const table = await env.TRANSPORT_DB.prepare('PRAGMA table_info(whatsapp_leads)').all();
  const existing = new Set((table.results || []).map((row) => row.name));

  for (const [name, sql] of ADMIN_COLUMNS) {
    if (existing.has(name)) continue;
    try {
      await env.TRANSPORT_DB.prepare(sql).run();
    } catch (error) {
      if (!String(error.message || error).toLowerCase().includes('duplicate column')) {
        throw error;
      }
    }
  }

  schemaReady = true;
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

function eventClause(eventType) {
  if (eventType === 'lead') return "COALESCE(service_type, '') <> 'pageview'";
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
      ...(visitorTotals || {}),
      total: leadTotals?.total || 0,
      today: leadTotals?.today || 0,
      total_pageviews: pageviewTotals?.total_pageviews || 0,
      pageviews_today: pageviewTotals?.pageviews_today || 0,
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

async function updateLeadOutcome(env, payload) {
  const leadUuid = cleanText(payload.lead_uuid || payload.leadUuid, 80);
  if (!leadUuid) {
    return json({ ok: false, error: 'lead_uuid is required' }, { status: 400 });
  }

  const status = cleanStatus(payload.status) || 'new';
  const revenue = cleanPrice(payload.revenue) ?? 0;
  const quotedPrice = cleanPrice(payload.quoted_price ?? payload.quotedPrice);
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
    leadUuid,
  ).run();

  return json({ ok: true, lead_uuid: leadUuid, changes: result.meta?.changes || 0 });
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
    await ensureAdminSchema(env);
    const data = resource === 'routes'
      ? await getRoutes(env)
      : resource === 'summary'
        ? await getSummary(env, request)
        : resource === 'notification-settings'
          ? { notification_settings: await getNotificationSettings(env) }
        : resource === 'pageviews'
          ? await getEventRows(env, request, 'pageview')
          : await getEventRows(env, request, 'lead');
    return json({ ok: true, ...data }, { headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_get_failed', message: error.message }));
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

  try {
    await ensureAdminSchema(env);
    const response = await deleteLead(env, request);
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_delete_failed', message: error.message }));
    return json({ ok: false, error: 'Failed to delete lead' }, { status: 500, headers });
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
    const response = resource === 'lead'
      ? await updateLeadOutcome(env, payload)
      : resource === 'notification-settings'
        ? await updateNotificationSettings(env, payload)
        : await upsertRoute(env, payload);
    return json(await response.json(), { status: response.status, headers });
  } catch (error) {
    console.error(JSON.stringify({ event: 'transport_admin_write_failed', message: error.message }));
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
