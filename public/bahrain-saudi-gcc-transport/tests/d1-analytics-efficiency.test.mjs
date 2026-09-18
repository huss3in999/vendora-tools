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
assert.equal((await allTime.json()).summary.aggregate_coverage, 'incremental_since_migration');
assert.ok(log.every((sql) => !/whatsapp_leads|analytics_events/i.test(sql)), 'All Time summary must not scan raw analytics tables');

console.log(JSON.stringify({ ok: true, aggregate: { visitors: aggregate.visitors, sessions: aggregate.sessions, page_views: aggregate.page_views }, all_time_raw_scan: false }, null, 2));
