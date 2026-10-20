import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { bahrainUtcDateBounds } from '../../functions/api/transport/admin.js';

const bounds = bahrainUtcDateBounds('2026-10-12', '2026-10-12');
assert.deepEqual(bounds, {
  fromInclusive: '2026-10-11T21:00:00',
  toExclusive: '2026-10-12T21:00:00',
});
assert.deepEqual(bahrainUtcDateBounds('2024-03-01', '2024-03-01'), {
  fromInclusive: '2024-02-29T21:00:00',
  toExclusive: '2024-03-01T21:00:00',
});
assert.equal(bahrainUtcDateBounds('2026-02-30', '2026-10-12').fromInclusive, null);

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE events (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL)');
db.exec('CREATE INDEX idx_events_created_at ON events(created_at DESC)');
const samples = [
  '2026-10-11T20:59:59.999Z',
  '2026-10-11T21:00:00Z',
  '2026-10-11T21:00:00.000Z',
  '2026-10-11T21:00:00.100Z',
  '2026-10-12T12:00:00.000Z',
  '2026-10-12T20:59:59.999Z',
  '2026-10-12T21:00:00.000Z',
];
const insert = db.prepare('INSERT INTO events (created_at) VALUES (?)');
for (const createdAt of samples) insert.run(createdAt);

const oldResult = db.prepare(`
  SELECT id FROM events
  WHERE date(created_at, '+3 hours') >= ? AND date(created_at, '+3 hours') <= ?
  ORDER BY created_at
`).all('2026-10-12', '2026-10-12').map((row) => row.id);
const newResult = db.prepare(`
  SELECT id FROM events
  WHERE created_at >= ? AND created_at < ?
  ORDER BY created_at
`).all(bounds.fromInclusive, bounds.toExclusive).map((row) => row.id);
assert.deepEqual(newResult, oldResult, 'range predicates retain Bahrain-local date semantics for stored UTC ISO timestamps');

const plan = db.prepare(`
  EXPLAIN QUERY PLAN SELECT id FROM events
  WHERE created_at >= ? AND created_at < ? ORDER BY created_at
`).all(bounds.fromInclusive, bounds.toExclusive).map((row) => row.detail).join(' ');
assert.match(plan, /SEARCH events USING (?:COVERING )?INDEX idx_events_created_at \(created_at>\? AND created_at<\?\)/);

console.log(JSON.stringify({ ok: true, bounds, legacyResultsEquivalent: true, queryPlan: plan }, null, 2));
