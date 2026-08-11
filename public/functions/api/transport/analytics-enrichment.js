const SESSION_COLUMNS = [
  'session_id', 'visitor_id', 'first_visit_at', 'session_started_at', 'first_seen_at', 'last_activity_at',
  'visit_count', 'is_returning', 'visitor_local_time', 'landing_url', 'landing_path', 'landing_title',
  'referrer', 'referrer_host', 'referrer_path', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
  'utm_content', 'gclid', 'fbclid', 'ttclid', 'msclkid', 'dclid', 'traffic_source', 'source_category',
  'ai_referral_source', 'language', 'browser_languages', 'browser_timezone', 'device_type', 'browser_name',
  'browser_version', 'operating_system', 'operating_system_version', 'device_vendor', 'device_model',
  'screen_width', 'screen_height', 'viewport_width', 'viewport_height', 'device_pixel_ratio', 'touch_support',
  'color_scheme', 'connection_type', 'effective_connection_type', 'downlink_mbps', 'round_trip_ms', 'save_data',
  'cf_country', 'cf_region', 'cf_city', 'cf_timezone', 'http_protocol', 'asn', 'network_organization',
  'bot_score', 'verified_bot', 'client_hints', 'created_at', 'updated_at',
];

let schemaPromise;

export function cleanAnalyticsText(value, maxLength = 500) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function textFrom(payload, names, maxLength = 500) {
  for (const name of names) {
    const value = cleanAnalyticsText(payload && payload[name], maxLength);
    if (value) return value;
  }
  return null;
}

function numberFrom(payload, names, min, max) {
  for (const name of names) {
    const value = Number(payload && payload[name]);
    if (!Number.isFinite(value)) continue;
    return Math.max(min, Math.min(max, value));
  }
  return null;
}

function boolFrom(payload, names) {
  for (const name of names) {
    const value = payload && payload[name];
    if (value === true || value === 1 || value === '1' || value === 'true') return 1;
    if (value === false || value === 0 || value === '0' || value === 'false') return 0;
  }
  return null;
}

function safeUrl(value, { keepQuery = false } = {}) {
  const text = cleanAnalyticsText(value, 1200);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    if (!keepQuery) url.search = '';
    return url.toString().slice(0, 1200);
  } catch {
    return null;
  }
}

function urlPart(value, part) {
  const text = cleanAnalyticsText(value, 1200);
  if (!text) return null;
  try {
    const url = new URL(text);
    return cleanAnalyticsText(part === 'host' ? url.hostname.replace(/^www\./i, '') : url.pathname, part === 'host' ? 200 : 500);
  } catch {
    return null;
  }
}

function parseUserAgent(userAgent) {
  const ua = String(userAgent || '');
  const browserPatterns = [
    ['Edge', /Edg\/([\d.]+)/], ['Opera', /(?:OPR|Opera)\/([\d.]+)/], ['Firefox', /Firefox\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/], ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ];
  const osPatterns = [
    ['Windows', /Windows NT ([\d.]+)/], ['Android', /Android ([\d.]+)/], ['iOS', /(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/],
    ['macOS', /Mac OS X ([\d_]+)/], ['Chrome OS', /CrOS [^ ]+ ([\d.]+)/], ['Linux', /Linux/],
  ];
  const browser = browserPatterns.find(([, pattern]) => pattern.test(ua));
  const os = osPatterns.find(([, pattern]) => pattern.test(ua));
  const browserMatch = browser ? ua.match(browser[1]) : null;
  const osMatch = os ? ua.match(os[1]) : null;
  return {
    browserName: browser ? browser[0] : null,
    browserVersion: browserMatch && browserMatch[1] ? browserMatch[1].replace(/_/g, '.') : null,
    operatingSystem: os ? os[0] : null,
    operatingSystemVersion: osMatch && osMatch[1] ? osMatch[1].replace(/_/g, '.') : null,
  };
}

function sourceDetails(payload, referrerHost) {
  const explicit = textFrom(payload, ['traffic_source', 'trafficSource', 'utm_source', 'utmSource'], 120);
  const candidate = String(explicit || referrerHost || '').toLowerCase();
  const matches = (pattern) => pattern.test(candidate);
  let source = explicit || referrerHost || 'direct';
  let category = 'referral';
  let ai = textFrom(payload, ['ai_referral_source', 'aiReferralSource'], 80);
  if (!candidate || candidate === 'direct' || candidate === 'direct/unknown') category = 'direct';
  else if (matches(/google\.|^google$/)) { source = 'google'; category = 'organic_search'; }
  else if (matches(/bing\.|^bing$/)) { source = 'bing'; category = 'organic_search'; }
  else if (matches(/yahoo\.|^yahoo$/)) { source = 'yahoo'; category = 'organic_search'; }
  else if (matches(/instagram/)) { source = 'instagram'; category = 'social'; }
  else if (matches(/facebook|(^|\.)fb\./)) { source = 'facebook'; category = 'social'; }
  else if (matches(/tiktok/)) { source = 'tiktok'; category = 'social'; }
  else if (matches(/snapchat/)) { source = 'snapchat'; category = 'social'; }
  else if (matches(/twitter|t\.co|(^|\.)x\.com/)) { source = 'x_twitter'; category = 'social'; }
  else if (matches(/youtube|youtu\.be/)) { source = 'youtube'; category = 'social'; }
  else if (matches(/chatgpt|openai/)) { source = 'chatgpt'; category = 'ai_referral'; ai = ai || 'chatgpt'; }
  else if (matches(/perplexity/)) { source = 'perplexity'; category = 'ai_referral'; ai = ai || 'perplexity'; }
  else if (matches(/gemini/)) { source = 'gemini'; category = 'ai_referral'; ai = ai || 'google_gemini'; }
  else if (matches(/copilot/)) { source = 'copilot'; category = 'ai_referral'; ai = ai || 'microsoft_copilot'; }
  else if (matches(/claude|anthropic/)) { source = 'claude'; category = 'ai_referral'; ai = ai || 'anthropic_claude'; }
  const paid = ['gclid', 'fbclid', 'ttclid', 'msclkid', 'dclid'].some((key) => textFrom(payload, [key], 240));
  if (paid || /(^|[_-])(cpc|ppc|paid|display)([_-]|$)/.test(String(textFrom(payload, ['utm_medium', 'utmMedium'], 80) || '').toLowerCase())) category = 'paid';
  return { source: cleanAnalyticsText(source, 120), category, ai: cleanAnalyticsText(ai, 80) };
}

function cloudflareContext(request) {
  const cf = request.cf || {};
  const bot = cf.botManagement || {};
  const score = Number(bot.score);
  const asn = Number(cf.asn);
  return {
    country: cleanAnalyticsText(cf.country, 8), region: cleanAnalyticsText(cf.region || cf.regionCode, 120),
    city: cleanAnalyticsText(cf.city, 120), timezone: cleanAnalyticsText(cf.timezone, 80),
    httpProtocol: cleanAnalyticsText(cf.httpProtocol, 30), asn: Number.isFinite(asn) ? Math.round(asn) : null,
    organization: cleanAnalyticsText(cf.asOrganization, 200), botScore: Number.isFinite(score) ? Math.round(score) : null,
    verifiedBot: typeof bot.verifiedBot === 'boolean' ? Number(bot.verifiedBot) : null,
  };
}

function clientHints(request) {
  const hints = {};
  [['brands', 'sec-ch-ua'], ['platform', 'sec-ch-ua-platform'], ['mobile', 'sec-ch-ua-mobile']].forEach(([key, header]) => {
    const value = cleanAnalyticsText(request.headers.get(header), 240);
    if (value) hints[key] = value;
  });
  return Object.keys(hints).length ? JSON.stringify(hints) : null;
}

export async function ensureAnalyticsEnrichmentSchema(env) {
  if (!env.TRANSPORT_DB) return;
  if (!schemaPromise) schemaPromise = (async () => {
    await env.TRANSPORT_DB.prepare(`CREATE TABLE IF NOT EXISTS analytics_sessions (
      session_id TEXT PRIMARY KEY, visitor_id TEXT, first_visit_at TEXT, session_started_at TEXT,
      first_seen_at TEXT NOT NULL, last_activity_at TEXT NOT NULL, visit_count INTEGER DEFAULT 1,
      is_returning INTEGER DEFAULT 0, visitor_local_time TEXT, landing_url TEXT, landing_path TEXT,
      landing_title TEXT, referrer TEXT, referrer_host TEXT, referrer_path TEXT, utm_source TEXT,
      utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT, gclid TEXT, fbclid TEXT,
      ttclid TEXT, msclkid TEXT, dclid TEXT, traffic_source TEXT, source_category TEXT,
      ai_referral_source TEXT, language TEXT, browser_languages TEXT, browser_timezone TEXT,
      device_type TEXT, browser_name TEXT, browser_version TEXT, operating_system TEXT,
      operating_system_version TEXT, device_vendor TEXT, device_model TEXT, screen_width INTEGER,
      screen_height INTEGER, viewport_width INTEGER, viewport_height INTEGER, device_pixel_ratio REAL,
      touch_support INTEGER, color_scheme TEXT, connection_type TEXT, effective_connection_type TEXT,
      downlink_mbps REAL, round_trip_ms INTEGER, save_data INTEGER, cf_country TEXT, cf_region TEXT,
      cf_city TEXT, cf_timezone TEXT, http_protocol TEXT, asn INTEGER, network_organization TEXT,
      bot_score INTEGER, verified_bot INTEGER, client_hints TEXT, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`).run();
    for (const sql of [
      'CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON analytics_sessions (visitor_id, last_activity_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_sessions_source ON analytics_sessions (source_category, traffic_source, session_started_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_sessions_country ON analytics_sessions (cf_country, session_started_at DESC)',
      'ALTER TABLE whatsapp_leads ADD COLUMN session_snapshot_json TEXT',
      'ALTER TABLE whatsapp_leads ADD COLUMN lead_snapshot_at TEXT',
    ]) {
      try { await env.TRANSPORT_DB.prepare(sql).run(); } catch (error) {
        if (!/duplicate column name/i.test(String(error && error.message))) throw error;
      }
    }
  })().catch((error) => { schemaPromise = null; throw error; });
  return schemaPromise;
}

export async function upsertAnalyticsSession(request, env, payload = {}) {
  const sessionId = textFrom(payload, ['session_id', 'sessionId'], 120);
  if (!sessionId || !env.TRANSPORT_DB) return;
  await ensureAnalyticsEnrichmentSchema(env);
  const now = new Date().toISOString();
  const ua = parseUserAgent(request.headers.get('user-agent'));
  const cf = cloudflareContext(request);
  const referrer = safeUrl(textFrom(payload, ['referrer', 'firstReferrer'], 1200));
  const referrerHost = textFrom(payload, ['referrer_host', 'referrerHost', 'firstReferrerHost'], 200) || urlPart(referrer, 'host');
  const source = sourceDetails(payload, referrerHost);
  const visitCount = Math.max(1, Math.round(numberFrom(payload, ['visitCount', 'visit_count'], 1, 10000) || 1));
  const landingRaw = textFrom(payload, ['landing_url', 'firstLandingPage', 'page_url', 'pageUrl'], 1200);
  const values = {
    session_id: sessionId, visitor_id: textFrom(payload, ['visitor_id', 'visitorId'], 80),
    first_visit_at: textFrom(payload, ['first_visit_at', 'firstSeenAt'], 80),
    session_started_at: textFrom(payload, ['session_started_at', 'sessionStartedAt'], 80) || now,
    first_seen_at: now, last_activity_at: now, visit_count: visitCount, is_returning: visitCount > 1 ? 1 : 0,
    visitor_local_time: textFrom(payload, ['visitor_local_time', 'visitorLocalTime', 'browserLocalTime'], 100),
    landing_url: safeUrl(landingRaw, { keepQuery: false }),
    landing_path: textFrom(payload, ['landing_path', 'firstLandingPath'], 500) || urlPart(landingRaw, 'path'),
    landing_title: textFrom(payload, ['landing_title', 'firstLandingTitle', 'page_title', 'pageTitle'], 300),
    referrer, referrer_host: referrerHost, referrer_path: textFrom(payload, ['referrer_path', 'referrerPath'], 500) || urlPart(referrer, 'path'),
    utm_source: textFrom(payload, ['utm_source', 'utmSource'], 120), utm_medium: textFrom(payload, ['utm_medium', 'utmMedium'], 120),
    utm_campaign: textFrom(payload, ['utm_campaign', 'utmCampaign'], 160), utm_term: textFrom(payload, ['utm_term', 'utmTerm'], 160),
    utm_content: textFrom(payload, ['utm_content', 'utmContent'], 160), gclid: textFrom(payload, ['gclid'], 240),
    fbclid: textFrom(payload, ['fbclid'], 240), ttclid: textFrom(payload, ['ttclid'], 240),
    msclkid: textFrom(payload, ['msclkid'], 240), dclid: textFrom(payload, ['dclid'], 240),
    traffic_source: source.source, source_category: source.category, ai_referral_source: source.ai,
    language: textFrom(payload, ['language'], 20), browser_languages: textFrom(payload, ['browser_languages', 'browserLanguages'], 300),
    browser_timezone: textFrom(payload, ['browser_timezone', 'browserTimeZone'], 80),
    device_type: textFrom(payload, ['device_type', 'deviceType', 'device_category'], 40),
    browser_name: textFrom(payload, ['browser_name', 'browserName'], 80) || ua.browserName,
    browser_version: textFrom(payload, ['browser_version', 'browserVersion'], 40) || ua.browserVersion,
    operating_system: textFrom(payload, ['operating_system', 'operatingSystem'], 80) || ua.operatingSystem,
    operating_system_version: textFrom(payload, ['operating_system_version', 'operatingSystemVersion'], 40) || ua.operatingSystemVersion,
    device_vendor: textFrom(payload, ['device_vendor', 'deviceVendor'], 80), device_model: textFrom(payload, ['device_model', 'deviceModel'], 120),
    screen_width: numberFrom(payload, ['screen_width', 'screenWidth'], 0, 20000), screen_height: numberFrom(payload, ['screen_height', 'screenHeight'], 0, 20000),
    viewport_width: numberFrom(payload, ['viewport_width', 'viewportWidth'], 0, 20000), viewport_height: numberFrom(payload, ['viewport_height', 'viewportHeight'], 0, 20000),
    device_pixel_ratio: numberFrom(payload, ['device_pixel_ratio', 'devicePixelRatio'], 0, 20), touch_support: boolFrom(payload, ['touch_support', 'touchSupport']),
    color_scheme: textFrom(payload, ['color_scheme', 'colorScheme'], 20), connection_type: textFrom(payload, ['connection_type', 'connectionType'], 40),
    effective_connection_type: textFrom(payload, ['effective_connection_type', 'effectiveConnectionType'], 40),
    downlink_mbps: numberFrom(payload, ['downlink_mbps', 'downlinkMbps'], 0, 10000), round_trip_ms: numberFrom(payload, ['round_trip_ms', 'roundTripMs'], 0, 600000),
    save_data: boolFrom(payload, ['save_data', 'saveDataEnabled']), cf_country: cf.country, cf_region: cf.region, cf_city: cf.city, cf_timezone: cf.timezone,
    http_protocol: cf.httpProtocol, asn: cf.asn, network_organization: cf.organization, bot_score: cf.botScore,
    verified_bot: cf.verifiedBot, client_hints: clientHints(request), created_at: now, updated_at: now,
  };
  const updateColumns = SESSION_COLUMNS.filter((name) => !['session_id', 'first_seen_at', 'created_at'].includes(name));
  const sql = `INSERT INTO analytics_sessions (${SESSION_COLUMNS.join(', ')}) VALUES (${SESSION_COLUMNS.map(() => '?').join(', ')})
    ON CONFLICT(session_id) DO UPDATE SET ${updateColumns.map((name) => `${name}=COALESCE(excluded.${name}, analytics_sessions.${name})`).join(', ')}`;
  await env.TRANSPORT_DB.prepare(sql).bind(...SESSION_COLUMNS.map((name) => values[name] ?? null)).run();
}

export async function freezeAnalyticsSession(env, sessionId, confirmedAt) {
  if (!env.TRANSPORT_DB || !sessionId) return null;
  await ensureAnalyticsEnrichmentSchema(env);
  const session = await env.TRANSPORT_DB.prepare('SELECT * FROM analytics_sessions WHERE session_id = ? LIMIT 1').bind(sessionId).first();
  let results = [];
  try {
    const response = await env.TRANSPORT_DB.prepare(`
      SELECT event_id, created_at, page_path, event_name, event_category, event_label, route_name,
        button_text, target_url, language, device_type, lead_status, raw_payload
      FROM analytics_events WHERE session_id = ? AND created_at <= ?
      ORDER BY created_at ASC LIMIT 120
    `).bind(sessionId, confirmedAt).all();
    results = response.results || [];
  } catch (error) {
    if (!/no such table:\s*analytics_events/i.test(String(error && error.message))) throw error;
  }
  const events = (results || []).map((row) => {
    let detail = {};
    try { detail = JSON.parse(row.raw_payload || '{}'); } catch { detail = {}; }
    return {
      event_id: row.event_id, timestamp: row.created_at, event: row.event_name, category: row.event_category,
      label: row.event_label, page_path: row.page_path, route: row.route_name, button: row.button_text,
      target: row.target_url, language: row.language, device: row.device_type,
      time_on_page_ms: Number(detail.timeOnPageMs || detail.time_on_page_ms || 0) || undefined,
      scroll_depth_percent: Number(detail.scrollDepthPercent || detail.scroll_depth_percent || 0) || undefined,
      origin: detail.origin || detail.pickup_location || detail.pickup_country || undefined,
      destination: detail.destination || detail.destination_location || detail.destination_country || undefined,
      passengers: detail.passengers || undefined, displayed_price: detail.displayed_price || detail.public_price_shown || undefined,
      cancellation_method: detail.cancellation_method || undefined,
    };
  });
  const snapshot = { snapshot_version: 1, frozen_at: confirmedAt, session: session || null, events };
  const serialized = JSON.stringify(snapshot);
  return serialized.length <= 30000 ? serialized : JSON.stringify({ ...snapshot, events: events.slice(-60) });
}
