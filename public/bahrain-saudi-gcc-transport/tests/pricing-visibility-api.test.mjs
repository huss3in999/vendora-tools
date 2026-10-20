import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { getPublicConfig, savePublicRoute, savePublicSettings } from '../../functions/api/transport/public-settings.js';

class D1Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() { const result = this.db.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: result.changes } }; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async first() { return this.db.prepare(this.sql).get(...this.values) || null; }
}
class D1Database {
  constructor() { this.db = new DatabaseSync(':memory:'); }
  prepare(sql) { return new D1Statement(this.db, sql); }
}

const env = { TRANSPORT_DB: new D1Database() };
const route = (slug, group, price) => ({
  route_slug: slug, route_name_ar: 'وجهة اختبار', route_name_en: 'Test destination',
  price_bhd: price, price_kind: 'standard', unit_kind: 'one_way_vehicle', trip_type: 'one_way',
  public_price_enabled: true, is_active: true, price_visibility_group: group
});

await savePublicRoute(env, route('bahrain-to-riyadh', 'saudi_arabia', 120));
await savePublicRoute(env, route('bahrain-to-qatar', 'qatar', 130));
await savePublicRoute(env, route('bahrain-to-custom-saudi-city', 'saudi_arabia', 150));

let config = await getPublicConfig(env, { fresh: true });
assert.equal(config.settings.public_prices_enabled, false, 'default is prices disabled');
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-riyadh').price_bhd, null, 'global hide masks price values by default');
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-riyadh').is_price_hidden, true);

config = await savePublicSettings(env, { ...config.settings, public_prices_enabled: true });
assert.equal(config.settings.public_prices_enabled, true);
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-riyadh').price_bhd, 120);

config = await savePublicSettings(env, { ...config.settings, public_prices_enabled: false });
assert.equal(config.settings.public_prices_enabled, false);
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-riyadh').price_bhd, null, 'global hide masks price values from public settings');
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-riyadh').is_price_hidden, true);

config = await savePublicSettings(env, { ...config.settings, public_prices_enabled: true, hidden_price_destination_groups: ['saudi_arabia', 'not-allowed'] });
assert.deepEqual(config.settings.hidden_price_destination_groups, ['saudi_arabia'], 'only valid destination groups are retained');
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-riyadh').price_bhd, null, 'destination group hides all assigned current routes');
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-custom-saudi-city').price_bhd, null, 'future route assigned to the same group inherits the hide rule');
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-qatar').price_bhd, 130, 'other destinations remain visible');

const qatar = route('bahrain-to-qatar', 'qatar', 130);
qatar.public_price_enabled = false;
await savePublicRoute(env, qatar);
config = await getPublicConfig(env, { fresh: true });
assert.equal(config.routes.find((item) => item.route_slug === 'bahrain-to-qatar').price_bhd, null, 'route-level hide is still respected');
console.log('Pricing visibility API checks passed: global, destination-group, future-route inheritance, route toggle, and public price masking.');
