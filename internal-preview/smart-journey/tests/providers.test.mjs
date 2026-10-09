import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyFlow,googleRoute,tomtomFlow,weather,snapshot} from '../providers.mjs';
import {routes} from '../routes.mjs';
const now=Date.now();
const samples=(speed=80)=>[1,2,3].map(n=>({segmentId:String(n),lengthMeters:1000,verifiedRoad:true,verifiedDirection:true,confidence:0.9,currentSpeed:speed,freeFlowSpeed:100,retrievedAt:new Date(now).toISOString()}));
test('unknown traffic never becomes green; reject stale, wrong-direction, duplicate or low-confidence evidence',()=>{
  assert.equal(classifyFlow([],now).status,'unavailable');
  for(const change of [{verifiedDirection:false},{verifiedRoad:false},{confidence:.79},{retrievedAt:new Date(now-300001).toISOString()},{freeFlowSpeed:0},{currentSpeed:NaN}]){const s=samples();Object.assign(s[0],change);assert.equal(classifyFlow(s,now).status,'unavailable');}
  const s=samples();s[1].segmentId=s[0].segmentId;assert.equal(classifyFlow(s,now).status,'unavailable');
});
test('conservative thresholds and closure precedence',()=>{assert.equal(classifyFlow(samples(80),now).status,'light');assert.equal(classifyFlow(samples(79),now).status,'moderate');assert.equal(classifyFlow(samples(50),now).status,'moderate');assert.equal(classifyFlow(samples(49),now).status,'heavy');const s=samples();s[0].roadClosure=true;assert.equal(classifyFlow(s,now).status,'closed');});
test('paid routes and traffic do not call providers without authorization',async()=>{
  const fail=()=>{throw Error('should not call');};assert.equal((await googleRoute(routes['bahrain-to-dammam'],{GOOGLE_MAPS_SERVER_KEY:'synthetic'},fail)).reason,'configuration');assert.equal((await tomtomFlow(routes['bahrain-to-dammam'],{},fail)).status,'unavailable');
});
test('HTTP 200 route requires semantic fields and explicit road validation',async()=>{
  const env={GOOGLE_MAPS_BILLING_APPROVED:'true',GOOGLE_MAPS_SERVER_KEY:'synthetic'};
  assert.equal((await googleRoute(routes['bahrain-to-dammam'],env,async()=>Response.json({routes:[{}]}))).status,'unavailable');
  const fetcher=async()=>Response.json({routes:[{distanceMeters:80000,duration:'4200s',polyline:{encodedPolyline:'test-only'}}]});
  assert.equal((await googleRoute(routes['bahrain-to-dammam'],env,fetcher)).reason,'coverage');
  assert.equal((await googleRoute(routes['bahrain-to-dammam'],{...env,GOOGLE_ROUTE_COVERAGE_APPROVED:'true'},fetcher)).trafficAware,false);
});
test('weather is explicitly a forecast and honors cached expiry',async()=>{
  let stored,calls=0;const cache={get:async()=>stored,set:async(k,v)=>stored=v};
  const f=async()=>{calls++;return Response.json({properties:{meta:{updated_at:new Date().toISOString()},timeseries:[{time:new Date().toISOString(),data:{instant:{details:{air_temperature:29}}}}]}},{headers:{expires:new Date(Date.now()+3600000).toUTCString()}});};
  assert.equal((await weather(routes['bahrain-to-dammam'],cache,f)).kind,'forecast');await weather(routes['bahrain-to-dammam'],cache,f);assert.equal(calls,1);
});
test('failure handling returns no credentials, raw exceptions, or invented metrics',async()=>{
  const data=await snapshot('bahrain-to-dammam',{WEATHER_ENABLED:'false',GOOGLE_MAPS_SERVER_KEY:'synthetic-secret'},{},()=>{throw Error('secret');});assert.equal(data.traffic.status,'unavailable');assert.equal(data.routing.status,'unavailable');assert.ok(!JSON.stringify(data).includes('synthetic-secret'));assert.equal(await snapshot('unknown',{},{}),null);
});
