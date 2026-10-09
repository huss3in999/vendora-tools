import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {budgetSchema,reserveStatement,googleControlsReady} from '../budget.mjs';
import {snapshot,googleRoute} from '../providers.mjs';import {routes} from '../routes.mjs';
test('persistent reservations bound worst-case Google cost across routes and maps without free allowance assumptions',()=>{
  const db=new DatabaseSync(':memory:');db.exec(budgetSchema);let maps=0,routesCount=0;
  for(let day=1;day<=31;day++)for(let n=0;n<20;n++)for(const kind of ['map','route']){const {sql,args}=reserveStatement(kind,new Date(`2026-10-${String(day).padStart(2,'0')}T12:00:00Z`));const ok=db.prepare(sql).run(...args).changes===1;if(ok){if(kind==='map')maps++;else routesCount++;}}
  const total=db.prepare('SELECT SUM(reserved_milli_usd) AS cost FROM journey_google_budget').get().cost;
  assert.equal(maps,200);assert.equal(routesCount,200);assert.equal(total,3400);assert.ok(total<4000);db.close();
});
test('parallel reservations cannot oversubscribe the daily quota and a new month gets its own counters',async()=>{
  const db=new DatabaseSync(':memory:');db.exec(budgetSchema);const reserve=()=>{const {sql,args}=reserveStatement('route',new Date('2026-10-09T12:00:00Z'));return db.prepare(sql).run(...args).changes===1;};const results=await Promise.all(Array.from({length:100},async()=>reserve()));assert.equal(results.filter(Boolean).length,10);const {sql,args}=reserveStatement('route',new Date('2026-11-01T00:00:00Z'));assert.equal(db.prepare(sql).run(...args).changes,1);db.close();
});
test('quota/restriction verification and atomic budget store are required even with credentials and billing approval',async()=>{
  const env={GOOGLE_MAPS_BILLING_APPROVED:'true',GOOGLE_MAPS_SERVER_KEY:'synthetic',GOOGLE_MAPS_BROWSER_KEY:'synthetic-browser',WEATHER_ENABLED:'false'};
  const fail=()=>{throw Error('should never call');};assert.equal((await googleRoute(routes['bahrain-to-dammam'],env,fail)).reason,'budget_controls');assert.equal(googleControlsReady(env,{reserve:async()=>true}),false);
  const data=await snapshot('bahrain-to-dammam',env,{},fail);assert.equal(data.map.enabled,false);assert.equal(data.map.browserKey,'');
  const approved={...env,GOOGLE_PROVIDER_QUOTAS_VERIFIED:'true',GOOGLE_KEY_RESTRICTIONS_VERIFIED:'true'};
  assert.equal((await googleRoute(routes['bahrain-to-dammam'],approved,fail,{reserve:async()=>false})).reason,'budget_limit');
});
