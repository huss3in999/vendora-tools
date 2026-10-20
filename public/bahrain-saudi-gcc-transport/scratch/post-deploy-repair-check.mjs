import {readFileSync,writeFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const base='https://getvendora.net/bahrain-saudi-gcc-transport/';const evidence={version:'5ded681e-2cc4-4edf-a424-5db94a0c2e35',checkedAt:new Date().toISOString(),pages:[],runtime:[],browser:[],security:[]};
for(const file of ['assets/vendora-config.js','site.js']){const r=await fetch(base+file+'?v=20261001-repair1');const body=await r.text();new Script(body,{filename:file});const hash=s=>createHash('sha256').update(s).digest('hex');evidence.runtime.push({file,status:r.status,valid:true,matchesLocal:hash(body)===hash(readFileSync(file,'utf8'))});}
const urls=[...['sitemap-gcc-transport.xml','sitemap-gcc-transport-en.xml'].flatMap(f=>[...readFileSync(f,'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]))];let n=0;
await Promise.all(Array.from({length:5},async()=>{while(n<urls.length){const url=urls[n++];const r=await fetch(url);const s=await r.text();evidence.pages.push({url,status:r.status,runtimeVersion:s.includes('site.js?v=20261001-repair1')&&s.includes('vendora-config.js?v=20261001-repair1'),canonical:!!s.match(/rel="canonical"/),noindex:/name="robots"[^>]*noindex/.test(s)});}}));
for(const path of ['/api/transport/health','/api/transport/admin','/.env','/.git/config','/bahrain-saudi-gcc-transport/scratch/']){const r=await fetch('https://getvendora.net'+path);evidence.security.push({path,status:r.status,body:path.endsWith('health')?await r.json():undefined});}
const b=await chromium.launch();
for(const path of ['','en/','en/prices/','en/customer-reviews/']){
 const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();const errors=[],whatsapp=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',q=>{if(q.url().startsWith('https://wa.me/')){const u=new URL(q.url());whatsapp.push({phone:u.pathname,hasMessage:!!u.searchParams.get('text')});}});
 await c.route('**/*',r=>{const q=r.request();if(/wa\.me|google-analytics|googletagmanager|clarity\.ms/.test(q.url())||(!['GET','HEAD'].includes(q.method())&&/\/api\//.test(q.url())))return r.abort();return r.continue();});
 await p.goto(base+path,{waitUntil:'networkidle'});const details=await p.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,arabic:(document.body.innerText.match(/[\u0600-\u06ff]/g)||[]).length,routes:window.VENDORA_ROUTE_PRICES?.filter(r=>r.active).length,overflow:document.documentElement.scrollWidth-innerWidth}));
 await p.screenshot({path:'C:/Users/hussa/Documents/Vendora Private/GCC Backlinks/repair-live-'+(path.replaceAll('/','-')||'ar-home')+'.png',fullPage:true});
 if(path!=='en/customer-reviews/'){await p.locator('a[data-wa-message]:visible').first().click();await p.locator('[data-booking-continue]').waitFor({timeout:15000});await p.locator('[data-booking-continue]').click();await p.waitForTimeout(500);}
 evidence.browser.push({path,details,errors,whatsapp});await c.close();
}await b.close();
evidence.ok=evidence.runtime.every(r=>r.status===200&&r.matchesLocal)&&evidence.pages.every(p=>p.status===200&&p.runtimeVersion&&!p.noindex)&&evidence.browser.every(p=>!p.errors.length&&(!p.path.startsWith('en/')||p.details.arabic===0)&&p.whatsapp.every(w=>w.phone==='/97333225954'));
writeFileSync('C:/Users/hussa/Documents/Vendora Private/GCC Backlinks/PRODUCTION_REPAIR_VERIFICATION_2026-10-01.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({ok:evidence.ok,pages:evidence.pages.length,runtime:evidence.runtime,browser:evidence.browser,security:evidence.security},null,2));if(!evidence.ok)process.exitCode=1;
