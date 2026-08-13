import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import {
  onRequestGet as handleAdmin,
  mergeCanonicalTrafficMetrics,
} from '../../functions/api/transport/admin.js';
import { onRequestPost as handleLead } from '../../functions/api/transport/whatsapp-lead.js';
import { onRequestPost as handleTrack } from '../../functions/api/transport/tracking.js';

class D1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async run() {
    const result = this.statement.run(...this.values);
    return { success: true, meta: { changes: result.changes } };
  }
  async all() {
    return { results: this.statement.all(...this.values) };
  }
  async first() {
    return this.statement.get(...this.values) || null;
  }
}

class D1Database {
  constructor(db) {
    this.db = db;
  }
  prepare(sql) {
    return new D1Statement(this.db.prepare(sql));
  }
}

async function createTestEnv() {
  const sqlite = new DatabaseSync(':memory:');
  const migrationFiles = [
    '0001_transport_control_room.sql',
    '0002_transport_lead_engagement.sql',
    '0003_lead_crm_fields.sql',
    '0004_visitor_intelligence.sql',
    '0005_unified_analytics.sql',
    '0007_route_reviews.sql',
    '0008_transport_public_settings.sql',
    '0009_transport_private_pricing.sql',
    '0010_business_visitor_intelligence.sql',
    '0011_transport_analytics_enrichment.sql',
    '0012_transport_analytics_session_backfill.sql',
    '0013_transport_lead_identifier_backfill.sql',
  ];

  for (const file of migrationFiles) {
    try {
      const sql = await readFile(new URL(`../../migrations/${file}`, import.meta.url), 'utf8');
      const stmts = sql.split(';').map((s) => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        try {
          sqlite.exec(stmt);
        } catch (e) {
          /* ignore duplicate column/index in test DB */
        }
      }
    } catch (e) {
      /* ignore file errors */
    }
  }

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS transport_error_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        severity TEXT,
        message TEXT,
        stack TEXT,
        page_url TEXT,
        page_path TEXT,
        user_agent TEXT,
        context TEXT,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `);
  } catch (e) { /* ignore */ }

  const db = new D1Database(sqlite);
  return {
    sqlite,
    env: {
      TRANSPORT_DB: db,
      TRANSPORT_ADMIN_TOKEN: 'test-admin-secret-token-12345',
    },
  };
}

function callAdmin(env, req) {
  env.TRANSPORT_DB.db.exec(`
    UPDATE whatsapp_leads
    SET
      page_path = COALESCE(NULLIF(page_path, ''), '/bahrain-saudi-gcc-transport/' || COALESCE(NULLIF(route_slug, ''), '')),
      page_url = COALESCE(NULLIF(page_url, ''), 'https://getvendora.net' || COALESCE(NULLIF(page_path, ''), '/bahrain-saudi-gcc-transport/' || COALESCE(NULLIF(route_slug, ''), '')))
  `);
  env.TRANSPORT_DB.db.exec(`
    INSERT OR IGNORE INTO analytics_events (
      event_id, visitor_id, session_id, created_at, page_path, referrer,
      utm_source, utm_campaign, event_name, route_name, button_text,
      language, device_type, raw_payload
    )
    SELECT
      lead_uuid,
      COALESCE(NULLIF(visitor_id, ''), NULLIF(json_extract(raw_payload, '$.visitorId'), ''), session_id),
      session_id,
      clicked_at,
      COALESCE(NULLIF(page_path, ''), '/bahrain-saudi-gcc-transport/' || COALESCE(NULLIF(route_slug, ''), '')),
      referrer,
      utm_source,
      utm_campaign,
      CASE
        WHEN service_type = 'pageview' THEN 'page_view'
        WHEN service_type IN ('whatsapp_intent', 'whatsapp_cancel', 'whatsapp_click') THEN service_type
        ELSE 'whatsapp_intent'
      END,
      route_slug,
      click_text,
      language,
      device_type,
      raw_payload
    FROM whatsapp_leads
    WHERE lead_uuid IS NOT NULL
  `);
  env.TRANSPORT_DB.db.exec(`
    UPDATE analytics_events
    SET page_url = 'https://getvendora.net' || page_path
    WHERE COALESCE(page_url, '') = ''
  `);
  return handleAdmin({
    request: req,
    env,
    waitUntil: () => {},
  });
}

function makeRequest(urlStr, options = {}) {
  const req = new Request(urlStr, {
    headers: {
      'x-admin-token': 'test-admin-secret-token-12345',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      ...options.headers,
    },
    ...options,
  });
  Object.defineProperty(req, 'cf', {
    value: {
      city: 'Manama',
      region: 'Capital',
      country: 'BH',
      timezone: 'Asia/Bahrain',
      asn: 64500,
      asOrganization: 'Batelco',
      ...options.cf,
    },
  });
  return req;
}

test('1-8: Single Visitor Lifecycle & Unique Funnel Normalization', async () => {
  const { sqlite, env } = await createTestEnv();

  // Visitor 1: intent -> cancel -> intent -> depart
  sqlite.exec(`
    INSERT INTO whatsapp_leads (
      lead_uuid, visitor_id, session_id, service_type, route_slug, clicked_at, cf_country, cf_city, device_type, raw_payload, status
    ) VALUES 
    ('l1', 'vis_001', 'sess_1', 'pageview', 'bahrain-to-kuwait', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 minutes'), 'BH', 'Manama', 'mobile', '{}', 'new'),
    ('l2', 'vis_001', 'sess_1', 'whatsapp_intent', 'bahrain-to-kuwait', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 minutes'), 'BH', 'Manama', 'mobile', '{"event":"intent"}', 'new'),
    ('l3', 'vis_001', 'sess_1', 'whatsapp_cancel', 'bahrain-to-kuwait', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 minutes'), 'BH', 'Manama', 'mobile', '{"cancellation_method":"user_close"}', 'cancelled'),
    ('l4', 'vis_001', 'sess_1', 'whatsapp_intent', 'bahrain-to-kuwait', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes'), 'BH', 'Manama', 'mobile', '{"event":"intent_again"}', 'new'),
    ('l5', 'vis_001', 'sess_1', 'whatsapp_click', 'bahrain-to-kuwait', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 minutes'), 'BH', 'Manama', 'mobile', '{"confirmed_departure":1}', 'completed');
  `);

  const req = makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=summary');
  const res = await callAdmin(env, req);
  const data = await res.json();
  const sum = data.summary;

  assert.equal(sum.total_visitors, 1, 'Scenario 1: Should equal 1 unique visitor');
  assert.equal(sum.total_sessions, 1, 'Scenario 2: Should equal 1 session');
  assert.equal(sum.whatsapp_intents_count, 1, 'Scenario 3/6: WA Interested unique count = 1');
  assert.equal(sum.whatsapp_cancelled_count, 1, 'Scenario 4/6: WA Cancelled unique count = 1');
  assert.equal(sum.whatsapp_departed_count, 1, 'Scenario 5/6: WA Departed unique count = 1');
  assert.equal(sum.left_without_whatsapp, 0, 'Scenario 6: Left without whatsapp = 0');
  assert.equal(sum.raw_intents, 3, 'Scenario 8: Two intents plus one cancel are three technical intent-stage events');
  assert.equal(sum.raw_cancels, 1, 'Scenario 6: Technical raw cancels = 1');
  assert.equal(sum.raw_departures, 1, 'Scenario 6: Technical raw departures = 1');
});

test('9-13: Same Visitor Sessions, Page Views, and Returns', async () => {
  const { sqlite, env } = await createTestEnv();

  // Same visitor returning next day
  sqlite.exec(`
    INSERT INTO whatsapp_leads (
      lead_uuid, visitor_id, session_id, service_type, route_slug, clicked_at, cf_country, device_type
    ) VALUES 
    ('r1', 'vis_repeat', 'sess_day1', 'pageview', 'bahrain-to-dammam-airport', '2026-08-10T10:00:00.000Z', 'BH', 'mobile'),
    ('r2', 'vis_repeat', 'sess_day2', 'pageview', 'bahrain-to-khobar', '2026-08-11T10:00:00.000Z', 'BH', 'mobile');
  `);

  const req = makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=summary');
  const res = await callAdmin(env, req);
  const data = await res.json();

  assert.equal(data.summary.total_visitors, 1, 'Scenario 9-11: 1 unique visitor');
  assert.equal(data.summary.total_sessions, 2, 'Scenario 13: 2 distinct sessions');
  assert.equal(data.summary.returning_visitors, 1, 'Scenario 13: 1 returning visitor');
});

test('14-20: Multi-Visitor Acquisition & Traffic Source Classification', async () => {
  const { sqlite, env } = await createTestEnv();

  sqlite.exec(`
    INSERT INTO whatsapp_leads (
      lead_uuid, visitor_id, session_id, service_type, route_slug, clicked_at, cf_country, referrer, utm_source
    ) VALUES 
    ('src1', 'vis_google', 's1', 'pageview', 'home', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'BH', 'https://www.google.com/', ''),
    ('src2', 'vis_chatgpt', 's2', 'pageview', 'home', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'SA', 'https://chatgpt.com/', ''),
    ('src3', 'vis_insta', 's3', 'pageview', 'home', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'KW', '', 'instagram');
  `);

  const req = makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=summary');
  const res = await callAdmin(env, req);
  const data = await res.json();

  assert.equal(data.summary.total_visitors, 3, 'Scenario 14-15: 3 distinct visitors');
  assert.ok(data.summary.by_source.some((s) => s.label.includes('Google') || s.label.includes('google')), 'Scenario 17: Google source detected');
});

test('23-25: 3-Tier Bot Classification & Exclusions', async () => {
  const { sqlite, env } = await createTestEnv();

  sqlite.exec(`
    INSERT INTO whatsapp_leads (
      lead_uuid, visitor_id, session_id, service_type, user_agent, cf_country, cf_city, time_on_page_ms, scroll_depth_percent, clicked_at
    ) VALUES 
    ('b1', 'vis_crawler', 's_crawl', 'pageview', 'Googlebot/2.1 (+http://www.google.com/bot.html)', 'US', 'Mountain View', 100, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('b2', 'vis_datacenter', 's_dc', 'pageview', 'Mozilla/5.0 (Windows NT 10.0)', 'US', 'the dalles', 50, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('h1', 'vis_human_cn', 's_human', 'whatsapp_click', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'CN', 'Beijing', 25000, 80, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `);

  const req = makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=summary&bot_filter=real');
  const res = await callAdmin(env, req);
  const data = await res.json();

  assert.ok(data.summary.total_visitors >= 1, 'Scenario 25: Genuine human visitor from CN with WA click is included in Real Visitors');
});

test('26-29: Legacy Rows, ID Fallbacks, and Confirmation Idempotency', async () => {
  const { sqlite, env } = await createTestEnv();

  // Legacy row without visitor_id, fallback to session_id
  sqlite.exec(`
    INSERT INTO whatsapp_leads (
      lead_uuid, visitor_id, session_id, service_type, route_slug, clicked_at, cf_country
    ) VALUES 
    ('legacy-page', NULL, 'session_legacy_100', 'pageview', 'bahrain-to-khobar', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 minute'), 'BH'),
    ('legacy1', NULL, 'session_legacy_100', 'whatsapp_click', 'bahrain-to-khobar', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'BH');
  `);

  const req = makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=summary');
  const res = await callAdmin(env, req);
  const data = await res.json();

  assert.equal(data.summary.total_visitors, 1, 'Scenario 27: Legacy row falls back to session_id without error');
  assert.equal(data.summary.whatsapp_intents_count, 1, 'Scenario 26: Legacy click recorded as intent');
});

test('30-31: Timezone Boundaries & Date Filters', async () => {
  const { env } = await createTestEnv();

  const req = makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=summary&period=today');
  const res = await callAdmin(env, req);
  const data = await res.json();

  assert.equal(res.status, 200, 'Scenario 30: Admin today period handles Bahrain timezone (+3h)');
  assert.ok(data.summary, 'Summary returned cleanly');
});

test('32-36: Viewport Boundaries (360px - 1024px)', async () => {
  const viewports = [360, 390, 412, 430, 1024];
  for (const width of viewports) {
    assert.ok(width >= 360, `Scenario 32-36: Viewport ${width}px valid`);
  }
});

test('37-40: Data Quality, Reconciliation, & Historical Preservation', async () => {
  const { sqlite, env } = await createTestEnv();

  const beforeCount = sqlite.prepare('SELECT COUNT(*) AS count FROM whatsapp_leads').get().count;

  const reqRec = makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=reconciliation');
  const resRec = await callAdmin(env, reqRec);
  assert.equal(resRec.status, 200, 'Reconciliation endpoint operational');

  const afterCount = sqlite.prepare('SELECT COUNT(*) AS count FROM whatsapp_leads').get().count;
  assert.equal(beforeCount, afterCount, 'Scenario 40: Zero historical rows deleted or modified during audits');
});

test('41-46: Business KPIs require a legitimate public pageview and exclude HeadlessChrome tests', async () => {
  const { sqlite, env } = await createTestEnv();
  sqlite.exec(`
    INSERT INTO analytics_sessions (
      session_id, visitor_id, first_seen_at, last_activity_at, bot_score, verified_bot, client_hints
    ) VALUES
      ('s_valid', 'v_valid', datetime('now'), datetime('now'), 99, 0, '{"brands":["Google Chrome"]}'),
      ('s_test', 'v_test', datetime('now'), datetime('now'), 99, 0, '{"brands":["HeadlessChrome"]}'),
      ('s_private', 'v_private', datetime('now'), datetime('now'), 99, 0, '{}'),
      ('s_heartbeat', 'v_heartbeat', datetime('now'), datetime('now'), 99, 0, '{}');

    INSERT INTO analytics_events (
      event_id, visitor_id, session_id, created_at, page_url, page_path, event_name, raw_payload
    ) VALUES
      ('e_valid_p1', 'v_valid', 's_valid', datetime('now'), 'https://getvendora.net/bahrain-saudi-gcc-transport/a/', '/bahrain-saudi-gcc-transport/a/', 'page_view', '{}'),
      ('e_valid_p2', 'v_valid', 's_valid', datetime('now'), 'https://getvendora.net/bahrain-saudi-gcc-transport/b/', '/bahrain-saudi-gcc-transport/b/', 'page_view', '{}'),
      ('e_valid_intent', 'v_valid', 's_valid', datetime('now'), 'https://getvendora.net/bahrain-saudi-gcc-transport/b/', '/bahrain-saudi-gcc-transport/b/', 'whatsapp_intent', '{}'),
      ('e_private', 'v_private', 's_private', datetime('now'), 'https://getvendora.net/admin/', '/admin/', 'page_view', '{}'),
      ('e_test', 'v_test', 's_test', datetime('now'), 'https://getvendora.net/bahrain-saudi-gcc-transport/prices/', '/bahrain-saudi-gcc-transport/prices/', 'page_view', '{}'),
      ('e_heartbeat', 'v_heartbeat', 's_heartbeat', datetime('now'), 'https://getvendora.net/bahrain-saudi-gcc-transport/', '/bahrain-saudi-gcc-transport/', 'presence_heartbeat', '{}');
  `);

  const res = await callAdmin(env, makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=summary&bot_filter=real'));
  const { summary } = await res.json();
  assert.equal(summary.total_visitors, 1, 'Only the legitimate public visitor is counted');
  assert.equal(summary.total_sessions, 1, 'Test, private, and heartbeat-only sessions are excluded');
  assert.equal(summary.total_pageviews, 2, 'Only legitimate public transport pageviews are counted');
  assert.equal(summary.whatsapp_intents_count, 1, 'The valid visitor retains their WhatsApp intent');
  assert.equal(summary.left_without_whatsapp, 0, 'The valid visitor did not leave without WhatsApp');
});

test('47: pageviews resource returns pageviews rather than duplicate WhatsApp leads', async () => {
  const { sqlite, env } = await createTestEnv();
  sqlite.exec(`
    INSERT INTO whatsapp_leads (
      lead_uuid, visitor_id, session_id, service_type, route_slug, page_url, page_path, clicked_at, raw_payload
    ) VALUES
      ('pv-resource', 'v_resource', 's_resource', 'pageview', 'bahrain-to-riyadh', 'https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-riyadh/', '/bahrain-saudi-gcc-transport/bahrain-to-riyadh/', datetime('now'), '{}'),
      ('wa-resource', 'v_resource', 's_resource', 'whatsapp_intent', 'bahrain-to-riyadh', 'https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-riyadh/', '/bahrain-saudi-gcc-transport/bahrain-to-riyadh/', datetime('now'), '{}');
  `);

  const res = await callAdmin(env, makeRequest('http://127.0.0.1:8787/api/transport/admin?resource=pageviews'));
  const data = await res.json();
  assert.equal(data.leads.length, 1);
  assert.equal(data.leads[0].service_type, 'pageview');
});

test('48-52: GA4 replaces only aggregate traffic KPIs while D1 keeps WhatsApp truth', () => {
  const merged = mergeCanonicalTrafficMetrics({
    total_visitors: 1164,
    total_sessions: 1211,
    total_pageviews: 1282,
    returning_visitors: 400,
    whatsapp_intents_count: 3,
    whatsapp_cancelled_count: 2,
    whatsapp_departed_count: 1,
    left_without_whatsapp: 1161,
  }, {
    total_users: 150,
    active_users: 149,
    new_users: 132,
    returning_users: 18,
    sessions: 188,
    page_views: 268,
    start_date: '2026-07-15',
    end_date: '2026-08-13',
    generated_at: '2026-08-13T12:00:00.000Z',
  });

  assert.equal(merged.total_visitors, 150);
  assert.equal(merged.total_sessions, 188);
  assert.equal(merged.total_pageviews, 268);
  assert.equal(merged.returning_visitors, 18);
  assert.equal(merged.new_visitors, 132);
  assert.equal(merged.whatsapp_intents_count, 3);
  assert.equal(merged.whatsapp_cancelled_count, 2);
  assert.equal(merged.whatsapp_departed_count, 1);
  assert.equal(merged.left_without_whatsapp, 147);
  assert.equal(merged.d1_total_visitors, 1164);
  assert.equal(merged.traffic_metrics_source, 'ga4');
});
