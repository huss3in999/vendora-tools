import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const root='/bahrain-saudi-gcc-transport/';
const englishPaths=[...readFileSync(new URL('../sitemap-gcc-transport-en.xml',import.meta.url),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const reviews={ok:true,review_count:1,average_rating:5,reviews:[{rating:5,author_name:'أحمد',comment:'كانت الرحلة ممتازة والسائق محترف.',date:'2026-07-23'}]};
test.beforeEach(async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route(/google-analytics|googletagmanager|clarity\.ms/,r=>r.abort());
 await page.route('**/api/transport/route-reviews*',r=>r.fulfill({json:reviews}));
});
test('all crawlable English pages have valid configuration, metadata and zero visible Arabic',async({page})=>{
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of englishPaths){
  await page.goto(path,{waitUntil:'networkidle'});
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('html')).toHaveAttribute('dir','ltr');
  expect(await page.locator('body').innerText(),path).not.toMatch(/[\u0600-\u06ff]/);
  expect(await page.evaluate(()=>Array.isArray(window.VENDORA_ROUTE_PRICES)),path).toBe(true);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toContain('/en/');
  await expect(page.locator('link[hreflang="ar"],link[hreflang="ar-BH"]')).toHaveCount(1);
  expect(await page.locator('meta[name="description"]').getAttribute('content')).not.toMatch(/[\u0600-\u06ff]/);
 }
 expect(errors).toEqual([]);
});
for(const path of ['','en/','en/bahrain-to-khobar/','en/prices/']){
 for(const successful of [true,false]){
 test(`WhatsApp ${path||'Arabic home'} with backend ${successful?'success':'failure'}`,async({page})=>{
  await page.route('**/api/transport/event',r=>r.fulfill({status:successful?201:503,json:successful?{ok:true,leadId:1,booking_ref:'GCC-A1B2C3D4',care_token:'a'.repeat(48)}:{ok:false}}));
  await page.context().route('**/wa.me/**',r=>r.abort());
  await page.goto(root+path,{waitUntil:'networkidle'});
  const outgoing=page.context().waitForEvent('request', {predicate:r=>r.url().startsWith('https://wa.me/')});
  await page.locator('a[data-wa-message]:visible').first().click();
  await expect(page.locator('#vendora-booking-ready, #vendora-contact-step')).toHaveCount(0);
  const url=new URL((await outgoing).url());expect(url.pathname).toBe('/97333225954');expect(url.searchParams.get('text')).toBeTruthy();
 });
 }
}
