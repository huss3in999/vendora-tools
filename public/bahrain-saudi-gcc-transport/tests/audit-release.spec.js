import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const business=JSON.parse(readFileSync(fileURLToPath(new URL('../config/business-config.json',import.meta.url)),'utf8'));
const paths=['/','/contact/','/bahrain-saudi-gcc-transport/en/bahrain-to-riyadh/','/bahrain-saudi-gcc-transport/en/prices/','/bahrain-saudi-gcc-transport/en/b2b-travel-partners/','/bahrain-saudi-gcc-transport/en/bahrain-airport-to-hotel-transfers/'];
const route={route_slug:'bahrain-to-riyadh',route_name_en:'Bahrain to Riyadh',route_name_ar:'البحرين إلى الرياض',price_bhd:155,public_price_enabled:true,is_active:true,price_kind:'standard',unit_kind:'one_way_vehicle'};
for(const width of [390,768,1440]) for(const path of paths) test(`audit release ${width}px ${path}`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/api/transport/public-settings',r=>r.fulfill({json:{settings:{...business,public_prices_enabled:false},routes:[route]}}));
  await page.route('**/api/transport/event',r=>r.fulfill({json:{ok:true}}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.auditShifts=[];
    new PerformanceObserver(l=>l.getEntries().filter(e=>!e.hadRecentInput).forEach(e=>auditShifts.push({t:e.startTime,v:e.value}))).observe({type:'layout-shift',buffered:true});
  });
  await page.goto(path,{waitUntil:'load'});
  await page.waitForTimeout(2000);
  const data=await page.evaluate(()=>{
    let max=0,sum=0,start=0,last=0;
    for(const s of auditShifts){if(s.t-last>1000||s.t-start>5000){sum=0;start=s.t}sum+=s.v;max=Math.max(max,sum);last=s.t}
    return {cls:max,overflow:document.documentElement.scrollWidth-innerWidth,title:document.title,arabic:/[\u0600-\u06ff]/.test(document.body.innerText),configs:[...document.scripts].filter(s=>/\/(?:vendora-config|business-config)\.js/.test(s.src)).length,
      broken:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash.length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash),
      hero:[...document.images].find(i=>i.hasAttribute('data-media-source'))?.getAttribute('fetchpriority')};
  });
  expect(errors).toEqual([]);
  expect(data.overflow).toBeLessThanOrEqual(1);
  expect(data.arabic).toBe(false);
  expect(data.configs).toBe(1);
  expect(data.title).not.toMatch(/&amp;|From Price on request/);
  expect(data.broken).toEqual([]);
  expect(data.cls,JSON.stringify(data)).toBeLessThan(0.1);
  if(path!='/contact/')expect(data.hero).toBe('high');
  if(path.includes('bahrain-to-riyadh')){
    const text=await page.locator('body').innerText();
    expect(text).toContain('460–520 km');expect(text).not.toContain('450 km');
    expect(text).toContain('BHD 2.500 / SAR 25');
    await page.locator('a[href="#faq"]').click();
    await page.locator('#faq summary').first().click();
    await expect(page.locator('#faq details').first()).toHaveAttribute('open','');
  }
  await page.screenshot({path:`test-results/audit-release-${width}-${path.replace(/\W/g,'-')||'home'}.png`});
});
