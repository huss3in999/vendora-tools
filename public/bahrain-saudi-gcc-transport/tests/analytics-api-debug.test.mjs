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
  Object.defineProperty(request, 'cf', { value: { city: 'Manama', region: 'Capital', country: 'BH', timezone: 'Asia/Bahrain', httpProtocol: 'HTTP/2', asn: 64500, asOrganization: 'Example Network' } });
  const pending = [];
  const response = await track({ request, env, waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  assert.equal(response.status, 202);
}

await send('page_view', { first_visit_at: '2026-08-10T10:00:00.000Z', session_started_at: '2026-08-10T10:00:00.000Z', landing_path: '/bahrain-saudi-gcc-transport/en/saudi-to-qatar/', browser_name: 'Chrome', browser_version: '124', operating_system: 'Windows', operating_system_version: '10', viewport_width: 390, viewport_height: 844, device_pixel_ratio: 3, touch_support: true });
await send('route_view');
await send('whatsapp_intent', { event_id: 'intent-one', target_url: 'https://wa.me/97312345678?text=private-message', button_text: 'Book', cta_location: 'hero' });
await send('whatsapp_confirmation_view', { event_id: 'confirmation-one', button_text: 'Book' });
await send('whatsapp_cancel', { event_id: 'cancel-one', button_text: 'Book', cancellation_method: 'back_button' });
await send('whatsapp_intent', { event_id: 'intent-two', target_url: 'https://wa.me/97312345678', button_text: 'Book again', cta_location: 'floating' });
await send('whatsapp_confirmation_view', { event_id: 'confirmation-two', button_text: 'Book again' });
await send('whatsapp_click', { event_id: 'confirmed-exit', confirmed_departure: true, target_url: 'https://wa.me/97312345678?text=private-message', button_text: 'Book' });
await send('whatsapp_click', { event_id: 'second-confirmed-exit', confirmed_departure: true, target_url: 'https://wa.me/97312345678', button_text: 'Book again' });
await send('whatsapp_intent', { event_id: 'undecided-intent', visitor_id: 'visitor_undecided', session_id: 'session_undecided', button_text: 'Ask on WhatsApp', cta_location: 'body' });
await send('quote_request');
await send('session_heartbeat');
await send('page_view', { page_url: 'https://getvendora.net/', page_path: '/', route_name: '' });
await send('navigation_click', { event_id: 'retry-safe-event', target_path: '/bahrain-saudi-gcc-transport/en/' });
await send('navigation_click', { event_id: 'retry-safe-event', target_path: '/bahrain-saudi-gcc-transport/en/' });

const stored = sqlite.prepare('SELECT event_name, target_url, user_agent, raw_payload FROM analytics_events ORDER BY id').all();
assert.equal(stored.length, 14);
assert.equal(stored.find((row) => row.event_name === 'whatsapp_click').target_url, 'https://wa.me/');
assert.equal(JSON.parse(stored.find((row) => row.event_name === 'whatsapp_click').raw_payload).confirmed_departure, true);
assert.equal(JSON.parse(stored.find((row) => row.event_name === 'whatsapp_cancel').raw_payload).cancellation_method, 'back_button');
assert.equal(stored[0].user_agent, 'Chrome');
assert.ok(!stored.some((row) => row.raw_payload.includes('12345678') || row.raw_payload.includes('private-message')));
const storedSession = sqlite.prepare('SELECT * FROM analytics_sessions WHERE session_id = ?').get('session_test');
assert.equal(storedSession.browser_name, 'Chrome');
assert.equal(storedSession.operating_system, 'Windows');
assert.equal(storedSession.cf_country, 'BH');
assert.equal(storedSession.http_protocol, 'HTTP/2');
assert.equal(storedSession.asn, 64500);
assert.equal(storedSession.landing_url.includes('?'), false);

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
console.log(JSON.stringify(summary, null, 2)); process.exit(0);
assert.equal(summary.event_totals.whatsapp_clicks, 2);
assert.equal(summary.totals.whatsapp_visitors, 1);
assert.equal(summary.event_totals.quote_requests, 1);
assert.equal(summary.whatsapp_decisions.summary.interested_people, 2);
assert.equal(summary.whatsapp_decisions.summary.confirmed_people, 1);
assert.equal(summary.whatsapp_decisions.summary.confirmed_after_cancel, 1);
assert.equal(summary.whatsapp_decisions.summary.no_decision_people, 1);
assert.equal(summary.whatsapp_decisions.summary.repeat_people, 1);
assert.equal(summary.whatsapp_decisions.summary.cancel_events, 1);
assert.equal(summary.whatsapp_decisions.customers.find((row) => row.visitor_id === 'visitor_test').outcome, 'confirmed_after_cancel');
assert.equal(summary.whatsapp_decisions.customers.find((row) => row.visitor_id === 'visitor_undecided').outcome, 'no_decision');
assert.equal(summary.route_performance[0].route_id, 'SA-QA');
assert.equal(summary.online_now.length, 2);
assert.equal(summary.recent_events.some((event) => event.page_path === '/'), false);

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
  unique_whatsapp_visitors: summary.totals.whatsapp_visitors,
  quote_requests: summary.event_totals.quote_requests,
  online_sessions: summary.online_now.length,
}, null, 2));
