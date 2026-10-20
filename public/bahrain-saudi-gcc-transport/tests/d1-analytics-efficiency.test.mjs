import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost as track } from '../../functions/api/transport/tracking.js';
import { onRequestGet as adminGet } from '../../functions/api/transport/admin.js';

class Statement {
  constructor(db, sql, log) { this.db = db; this.sql = sql; this.log = log; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() { this.log.push(this.sql); const result = this.db.prepare(this.sql).run(...this.values); return { meta: { changes: result.changes } }; }
  async all() { this.log.push(this.sql); return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async first() { this.log.push(this.sql); return this.db.prepare(this.sql).get(...this.values) || null; }
}
class D1 { constructor(db, log) { this.db = db; this.log = log; } prepare(sql) { return new Statement(this.db, sql, this.log); } }

const db = new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../../migrations/0005_unified_analytics.sql', import.meta.url), 'utf8'));
db.exec('CREATE TABLE whatsapp_leads (id INTEGER PRIMARY KEY, clicked_at TEXT)');
db.exec(await readFile(new URL('../../migrations/0015_daily_transport_analytics_aggregates.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../../migrations/0017_whatsapp_outbound_click_aggregates.sql', import.meta.url), 'utf8'));
const log = [];
const env = { TRANSPORT_DB: new D1(db, log), TRANSPORT_ADMIN_TOKEN: 'test-token' };

for (let page = 1; page <= 4; page += 1) {
  const request = new Request('http://localhost/api/track', {
    method: 'POST',
    headers: { origin: 'http://localhost:4173', 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 Chrome/124' },
    body: JSON.stringify({
      event_id: `page-${page}`, event_name: 'page_view', visitor_id: 'visitor-one', session_id: 'session-one',
      page_path: `/route-${page}`, route_name: 'Bahrain-Kuwait', sessionPageViews: page, visitCount: 1,
    }),
  });
  const pending = [];
  await track({ request, env, waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
}

const aggregate = db.prepare('SELECT SUM(unique_visitors) AS visitors, SUM(sessions) AS sessions, SUM(page_views) AS page_views FROM daily_analytics_aggregates').get();
assert.equal(aggregate.visitors, 1, 'four pageviews from one visitor count as one visitor');
assert.equal(aggregate.sessions, 1, 'four pageviews from one session count as one session');
assert.equal(aggregate.page_views, 4, 'all four pageviews remain measurable');

async function sendEvent(eventId, eventName, fields = {}, cf = {}) {
  const request = new Request('http://localhost/api/track', {
    method: 'POST',
    headers: { origin: 'http://localhost:4173', 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 Chrome/124' },
    body: JSON.stringify({
      event_id: eventId, event_name: eventName, visitor_id: 'visitor-one', session_id: 'session-one',
      page_path: '/bahrain-saudi-gcc-transport/bahrain-to-dammam/', route_name: 'bahrain-to-dammam',
      ...fields,
    }),
  });
  if (Object.keys(cf).length) Object.defineProperty(request, 'cf', { value: cf });
  const pending = [];
  const response = await track({ request, env, waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  assert.equal(response.status, 202);
}

await sendEvent('wa-click-one', 'whatsapp_click', { confirmed_departure: 1 });
await sendEvent('wa-click-two', 'whatsapp_click', { confirmed_departure: true });
await sendEvent('wa-intent', 'whatsapp_intent');
await sendEvent('wa-cancel', 'whatsapp_cancel');
const clickRollup = db.prepare('SELECT SUM(whatsapp_outbound_clicks) AS clicks FROM daily_analytics_aggregates').get();
assert.equal(clickRollup.clicks, 2, 'only confirmed outbound WhatsApp taps count as clicks');

await sendEvent('arabic-page', 'page_view', {
  visitor_id: 'visitor-ar', session_id: 'session-ar', language: 'ar', page_path: '/bahrain-saudi-gcc-transport/riyadh-to-bahrain/',
}, { country: 'BH' });
await sendEvent('english-page', 'page_view', {
  visitor_id: 'visitor-en', session_id: 'session-en', language: 'en', page_path: '/bahrain-saudi-gcc-transport/en/riyadh-to-bahrain/',
}, { country: 'SA' });
const languageTracking = db.prepare(`
  SELECT event_id, visitor_id, session_id, language, ip_country, page_path, created_at
  FROM analytics_events WHERE event_id IN ('arabic-page', 'english-page') ORDER BY event_id
`).all();
assert.deepEqual(languageTracking.map((row) => [row.language, row.ip_country, row.page_path]), [
  ['ar', 'BH', '/bahrain-saudi-gcc-transport/riyadh-to-bahrain/'],
  ['en', 'SA', '/bahrain-saudi-gcc-transport/en/riyadh-to-bahrain/'],
]);
assert.equal(new Set(languageTracking.map((row) => row.visitor_id)).size, 2, 'Arabic and English pages preserve unique visitor IDs');
assert.equal(new Set(languageTracking.map((row) => row.session_id)).size, 2, 'Arabic and English pages preserve session IDs');
assert.ok(languageTracking.every((row) => Number.isFinite(Date.parse(row.created_at))), 'each language event stores a valid timestamp');

const botRequest = new Request('http://localhost/api/track', {
  method: 'POST', headers: { origin: 'http://localhost:4173', 'content-type': 'application/json', 'user-agent': 'Googlebot/2.1' },
  body: JSON.stringify({ event_id: 'bot-event', event_name: 'page_view', page_path: '/route' }),
});
Object.defineProperty(botRequest, 'cf', { value: { botManagement: { verifiedBot: true } } });
const botPending = [];
const botResponse = await track({ request: botRequest, env, waitUntil: (promise) => botPending.push(promise) });
assert.equal(botResponse.status, 202);
assert.equal((await botResponse.json()).suppressed, true, 'verified bot is suppressed before D1 writes');

log.length = 0;
const allTime = await adminGet({
  request: new Request('http://localhost/api/transport/admin?resource=summary&period=all', { headers: { authorization: 'Bearer test-token' } }),
  env, waitUntil: () => {},
});
assert.equal(allTime.status, 200);
const allTimeSummary = (await allTime.json()).summary;
assert.equal(allTimeSummary.aggregate_coverage, 'incremental_since_migration');
assert.equal(allTimeSummary.whatsapp_click_events_count, 2, 'All Time exposes the dedicated outbound click rollup');
assert.equal(allTimeSummary.whatsapp_click_events_coverage, 'since_migration_0017');
assert.ok(log.every((sql) => !/whatsapp_leads|analytics_events/i.test(sql)), 'All Time summary must not scan raw analytics tables');

console.log(JSON.stringify({ ok: true, aggregate: { visitors: aggregate.visitors, sessions: aggregate.sessions, page_views: aggregate.page_views }, all_time_raw_scan: false }, null, 2));
