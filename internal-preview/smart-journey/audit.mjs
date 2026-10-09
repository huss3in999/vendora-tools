import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../public/package.json'));
const {chromium}=require('@playwright/test');
await mkdir(path.join(here,'artifacts'),{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try{for(const language of ['ar','en'])for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();let requests=0;
  // Keep external analytics and all production mutations disabled during QA.
  await page.route('**/*',async route=>{const req=route.request();const url=new URL(req.url());if(url.hostname!=='127.0.0.1'&&/google-analytics|googletagmanager|clarity|facebook/.test(url.hostname))return route.abort();return route.continue();});
  page.on('request',r=>{if(r.url().includes('/api/smart-journey?'))requests++;});
  await page.goto('http://127.0.0.1:8791/bahrain-saudi-gcc-transport/'+(language==='en'?'en/':'')+'bahrain-to-dammam/',{waitUntil:'domcontentloaded'});
  try { await page.locator('[data-sj-traffic]').filter({hasText:language==='en'?'unavailable':'غير متاحة'}).waitFor({timeout:20000}); }
  catch(error){console.log({url:page.url(),lang:await page.locator('html').getAttribute('lang'),traffic:await page.locator('[data-sj-traffic]').allTextContents()});await page.screenshot({path:path.join(here,'artifacts','audit-failure.png')});throw error;}
  const component=page.locator('[data-smart-journey]');assert.equal(await component.count(),1);assert.equal(requests,1);
  assert.equal(await page.locator('html').getAttribute('dir'),language==='en'?'ltr':'rtl');
  assert.equal(await page.locator('.sj-pill[data-active]').count(),0);
  const text=await page.locator('body').innerText();if(language==='en')assert.ok(!/[\u0600-\u06ff]/.test(text),'English visible copy contains Arabic');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'horizontal overflow');
  assert.ok((await page.locator('[data-sj-book]').getAttribute('href')).startsWith('https://wa.me/97333225954'));
  const share=new URL(await page.locator('[data-sj-share]').getAttribute('href'));assert.ok(share.searchParams.get('text').includes('https://getvendora.net/'));
  await page.locator('[data-sj-copy]').click();assert.ok(await page.evaluate(()=>navigator.clipboard.readText()).then(s=>s.startsWith('https://getvendora.net/')));
  await component.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(here,'artifacts',`${language}-${viewport.width}-journey.png`)});
  await component.screenshot({path:path.join(here,'artifacts',`${language}-${viewport.width}-component.png`)});
  await page.screenshot({path:path.join(here,'artifacts',`${language}-${viewport.width}-page.png`),fullPage:true});
  const weather=await page.locator('[data-sj-weather]').innerText();results.push({language,viewport,requests,overflow,weather,booking:true,share:true,copy:true});await context.close();
}
const page=await browser.newPage();await page.route('**/api/smart-journey?*',r=>r.fulfill({status:503,body:'Unavailable'}));await page.goto('http://127.0.0.1:8791/bahrain-saudi-gcc-transport/en/bahrain-to-dammam/');await page.locator('.sj-status').filter({hasText:'Snapshot unavailable'}).waitFor();assert.equal(await page.locator('.sj-pill[data-active]').count(),0);results.push({providerFailure:'passed'});
await writeFile(path.join(here,'artifacts/ui-audit.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
