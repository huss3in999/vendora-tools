import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost as track } from '../../functions/api/transport/tracking.js';
import { onRequestGet as adminGet } from '../../functions/api/transport/admin.js';

class D1Statement {
  constructor(statement) { this.statement = statement; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() {
    const result = this.statement.run(...this.values);
    return { success: true, meta: { changes: result.changes } };
  }
  async all() { return { results: this.statement.all(...this.values) }; }
  async first() { return this.statement.get(...this.values) || null; }
}
class D1Database {
  constructor(db) { this.db = db; }
  prepare(sql) { return new D1Statement(this.db.prepare(sql)); }
}

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../../migrations/0005_unified_analytics.sql', import.meta.url), 'utf8'));
sqlite.exec('CREATE TABLE whatsapp_leads (id INTEGER PRIMARY KEY, clicked_at TEXT)');
const env = { TRANSPORT_DB: new D1Database(sqlite), TRANSPORT_ADMIN_TOKEN: 'synthetic-admin-token' };

async function send(eventName, extra = {}) {
  const request = new Request('http://127.0.0.1:8787/api/track', {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:8787', 'content-type': 'application/json', 'user-agent': 'Synthetic Browser Secret/1.0 Chrome/124' },
    body: JSON.stringify({
      event_name: eventName,
      event_category: 'transport',
      visitor_id: 'visitor_test',
      session_id: 'session_test',
      page_url: 'https://getvendora.net/bahrain-saudi-gcc-transport/en/saudi-to-qatar/?private=discard',
      page_path: '/bahrain-saudi-gcc-transport/en/saudi-to-qatar/',
      language: 'en',
      device_type: 'desktop',
      route_name: 'SA-QA',
      origin_country: 'SA',
      destination_country: 'QA',
      ...extra,
    }),
  });
  Object.defineProperty(request, 'cf', { value: { city: 'Manama', country: 'BH', timezone: 'Asia/Bahrain' } });
  const pending = [];
  const response = await track({ request, env, waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  assert.equal(response.status, 202);
}

await send('page_view');
await send('route_view');
await send('whatsapp_click', { target_url: 'https://wa.me/97312345678?text=private-message', button_text: 'Book' });
await send('quote_request');
await send('session_heartbeat');

const stored = sqlite.prepare('SELECT event_name, target_url, user_agent, raw_payload FROM analytics_events ORDER BY id').all();
assert.equal(stored.length, 5);
assert.equal(stored.find((row) => row.event_name === 'whatsapp_click').target_url, 'https://wa.me/');
assert.equal(stored[0].user_agent, 'Chrome');
assert.ok(!stored.some((row) => row.raw_payload.includes('12345678') || row.raw_payload.includes('private-message')));

const unauthorized = await adminGet({
  request: new Request('http://localhost:8787/api/transport/admin?resource=tracking'),
  env,
  waitUntil: () => {},
});
assert.equal(unauthorized.status, 401);

const authorized = await adminGet({
  request: new Request('http://localhost:8787/api/transport/admin?resource=tracking&period=7_days', {
    headers: { authorization: 'Bearer synthetic-admin-token', origin: 'http://127.0.0.1:4173' },
  }),
  env,
  waitUntil: () => {},
});
assert.equal(authorized.status, 200);
const summary = await authorized.json();
assert.equal(summary.ok, true);
assert.equal(summary.totals.page_views, 1);
assert.equal(summary.event_totals.whatsapp_clicks, 1);
assert.equal(summary.event_totals.quote_requests, 1);
assert.equal(summary.route_performance[0].route_id, 'SA-QA');
assert.equal(summary.online_now.length, 1);

const diagResponse = await adminGet({
  request: new Request('http://localhost:8787/api/transport/admin?resource=diagnostics', {
    headers: { authorization: 'Bearer synthetic-admin-token', origin: 'http://127.0.0.1:4173' },
  }),
  env,
  waitUntil: () => {},
});
assert.equal(diagResponse.status, 200);
const diagData = await diagResponse.json();
assert.equal(diagData.ok, true);
assert.equal(diagData.diagnostics.database_bound, true);
assert.equal(diagData.diagnostics.analytics_table_exists, true);
assert.equal(diagData.diagnostics.migration_0005_status, 'applied');

console.log(JSON.stringify({
  ok: true,
  stored_events: stored.length,
  admin_authorization: '401 unauthorized / 200 authorized',
  page_views: summary.totals.page_views,
  whatsapp_clicks: summary.event_totals.whatsapp_clicks,
  quote_requests: summary.event_totals.quote_requests,
  online_sessions: summary.online_now.length,
}, null, 2));
