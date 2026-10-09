import {test} from 'node:test';import assert from 'node:assert/strict';
import {submitReview} from '../review-draft.mjs';
const call=(payload,origin='https://preview.example')=>submitReview({request:new Request('https://preview.example/api/reviews',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)}),env:{}});
test('review draft rejects cross-origin posts, fractional ratings, honeypots and unsupported routes before DB access',async()=>{
  const good={language:'en',route_slug:'bahrain-to-dammam',rating:1,comment:'An honest negative review',publish_permission:true,privacy_consent:true};
  assert.equal((await call(good,'https://other.example')).status,403);
  for(const p of [{rating:1.5},{website:'bot'},{route_slug:'invented'},{language:'xx'}])assert.equal((await call({...good,...p})).status,400);
});
test('review draft permits an absent display name and fails closed without configured Cloudflare database',async()=>{
  const response=await call({language:'ar',route_slug:'bahrain-to-dammam',rating:1,comment:'تقييم صادق للرحلة',publish_permission:true,privacy_consent:true});assert.equal(response.status,500);assert.equal((await response.json()).error,'Database binding missing');
});
