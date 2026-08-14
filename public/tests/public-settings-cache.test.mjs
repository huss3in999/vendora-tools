import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPublicConfig,
  invalidatePublicSettingsCache,
} from '../functions/api/transport/public-settings.js';

test('concurrent public config reads share one database load and perform no schema writes', async () => {
  invalidatePublicSettingsCache();
  const calls = { settings: 0, routes: 0, schema: 0 };
  const env = {
    TRANSPORT_DB: {
      prepare(sql) {
        if (/^(?:CREATE|ALTER|INSERT|PRAGMA)/i.test(sql.trim())) calls.schema += 1;
        return {
          async first() {
            calls.settings += 1;
            await new Promise((resolve) => setTimeout(resolve, 20));
            return { settings_json: '{}', version: 7, updated_at: '2026-08-14T00:00:00.000Z' };
          },
          async all() {
            calls.routes += 1;
            await new Promise((resolve) => setTimeout(resolve, 20));
            return { results: [] };
          },
        };
      },
    },
  };

  const results = await Promise.all(Array.from({ length: 20 }, () => getPublicConfig(env)));

  assert.equal(calls.settings, 1);
  assert.equal(calls.routes, 1);
  assert.equal(calls.schema, 0);
  assert.equal(results.length, 20);
  assert.ok(results.every((result) => result === results[0]));
  assert.equal(results[0].version, 7);
});
