import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import profiles from '../config/route-profiles.mjs';
import { pricingCopy, offerCatalog } from '../assets/trust-schema.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const business=JSON.parse(readFileSync(resolve(root,'config/business-config.json'),'utf8'));
const route={route_slug:'bahrain-to-riyadh',route_name_en:'Bahrain to Riyadh',route_name_ar:'البحرين إلى الرياض',price_bhd:155,public_price_enabled:true,price_kind:'standard',price_visibility_group:'saudi_arabia',is_active:true};
function fixture(fixed){return {settings:{...business,public_prices_enabled:fixed,hidden_price_destination_groups:[]},routes:[route]};}
async function mock(page,fixed){await page.route('**/api/transport/public-settings',r=>r.fulfill({json:fixture(fixed)}));}

for(const lang of ['ar','en']) for(const fixed of [true,false]) test(`${lang} contact and prices agree when fixed pricing is ${fixed}`,async({page})=>{
 await mock(page,fixed);
 const prefix='/bahrain-saudi-gcc-transport/'+(lang==='en'?'en/':'');
 for(const slug of ['contact','prices']){
   await page.goto(prefix+slug+'/');
   await expect(page.locator('[data-pricing-mode]')).toHaveText(pricingCopy[lang][fixed?'fixed':'seasonal']);
   if(slug==='contact') await expect(page.locator('[data-contact-prices]')).toContainText(fixed ? '155' : pricingCopy[lang].seasonal);
   if(slug==='prices'){
     const card=page.locator('[data-route="bahrain-to-riyadh"]');
     await expect(card).toHaveAttribute('data-price-hidden',String(!fixed));
     const schema=JSON.parse(await page.locator('#pricesSchema').textContent());
     expect(schema['@type']).toBe('OfferCatalog');
     expect(schema.itemListElement[0].price).toBe(fixed?155:undefined);
     if(!fixed){
       await expect(card.locator('a')).toHaveText(pricingCopy[lang].cta);
       const href=new URL(await card.locator('a').getAttribute('href'));
       expect(href.searchParams.get('text')).toContain(route['route_name_'+lang]);
       expect(await card.innerText()).not.toMatch(/155/);
     }
   }
   if(lang==='en') expect(await page.locator('body').innerText()).not.toMatch(/[\u0600-\u06ff]/);
 }
});

for(const [slug,profile] of Object.entries(profiles)) for(const lang of ['ar','en']) {
 const path=(lang==='en'?'en/':'')+slug+'/index.html';
 if(!existsSync(resolve(root,path)))continue;
 test(`${path} has distinct crawlable route facts, FAQ and language alternates`,async({page,request})=>{
   await mock(page,false);
   const url='/bahrain-saudi-gcc-transport/'+path.replace('index.html','');
   const response=await request.get(url); const raw=await response.text();
   expect(raw).toContain(`data-route-profile="${slug}"`);
   await page.goto(url);
   const detail=page.locator('[data-route-profile]');
   await expect(detail).toContainText(profile['hubs_'+lang]);
   await expect(detail.locator('[data-route-faq] details')).toHaveCount(3);
   await detail.locator('summary').first().click();
   await expect(detail.locator('details').first()).toHaveAttribute('open','');
   const faq=JSON.parse(await page.locator('head script[data-vendora-faq]').textContent());
   expect(faq.mainEntity.map(q=>[q.name,q.acceptedAnswer.text])).toEqual(profile['faq_'+lang]);
   const schema=JSON.parse(await page.locator('head script[data-vendora-schema]').first().textContent());
   const organization=schema['@graph'].find(n=>Array.isArray(n['@type'])&&n['@type'].includes('LocalBusiness'));
   expect(organization.identifier.value).toBe(business.cr_number);
   expect(organization.telephone).toBe('+97333225954');
   expect(schema['@graph'].some(n=>n['@type']==='TaxiService')).toBe(true);
   for(const alternate of ['ar-BH','en','x-default']) await expect(page.locator(`link[hreflang="${alternate}"]`)).toHaveCount(1);
   if(lang==='en')expect(await page.locator('body').innerText()).not.toMatch(/[\u0600-\u06ff]/);
 });
}
test('all explicit bots retain private path exclusions',async({request})=>{
 const raw=await(await request.get('/robots.txt')).text();
 for(const bot of ['Googlebot','Bingbot','GPTBot','OAI-SearchBot','PerplexityBot','ClaudeBot','*']){
   const group=raw.split('User-agent: '+bot+'\n')[1]?.split('User-agent:')[0];
   expect(group).toContain('Allow: /');
   for(const path of ['/admin/','/api/private/','/booking-desk/','/bahrain-saudi-gcc-transport/admin/'])expect(group).toContain('Disallow: '+path);
 }
});
test('catalog never invents prices for seasonal, destination-hidden or route-hidden offers',()=>{
 for(const settings of [{public_prices_enabled:false},{public_prices_enabled:true,hidden_price_destination_groups:['saudi_arabia']}]){
   expect(JSON.stringify(offerCatalog([route],settings,'en','https://getvendora.net/prices/'))).not.toContain('"price":');
 }
});
