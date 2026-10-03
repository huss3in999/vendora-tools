import { test, expect } from '@playwright/test';
for(const language of ['', 'en/']){
 test(`guide ${language || 'Arabic'} records one direct contact without gating navigation`,async({page,context})=>{
  const leads=[],events=[];
  await context.route('https://wa.me/**',r=>r.fulfill({status:200,body:'<title>WhatsApp</title>'}));
  await page.route('**/api/track',async r=>{events.push(r.request().postDataJSON());await r.fulfill({status:202,json:{ok:true}});});
  await page.route('**/api/transport/event',async r=>{leads.push(r.request().postDataJSON());await r.fulfill({status:201,json:{ok:true,leadId:1,booking_ref:'GCC-1234ABCD',care_token:'a'.repeat(48)}});});
  await page.goto(`/bahrain-saudi-gcc-transport/${language}gcc-private-transport-guide/`,{waitUntil:'networkidle'});
  await expect.poll(()=>events.some(e=>e.event_name==='gcc_guide_page_view')).toBe(true);
  const outgoing=context.waitForEvent('request',{predicate:r=>r.url().startsWith('https://wa.me/')});
  await page.locator('a[data-wa-message]').first().click();
  expect(new URL((await outgoing).url()).pathname).toBe('/97333225954');
  await expect.poll(()=>events.filter(e=>e.event_name==='whatsapp_click'&&e.confirmed_departure===1).length).toBe(1);
  await expect.poll(()=>leads.filter(e=>e.action==='confirm_whatsapp_handoff').length).toBe(1);
  expect(leads.filter(e=>!e.action&&!['pageview','presence_heartbeat'].includes(e.serviceType))).toHaveLength(1);
  await expect(page.locator('#vendora-booking-ready')).toHaveCount(0);
 });
}
