import {chromium} from '@playwright/test';
const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();
p.on('request',q=>{if(/wa\.me|api\.whatsapp/.test(q.url())){const u=new URL(q.url());console.log(JSON.stringify({whatsappAttempt:u.host,phone:u.pathname,hasMessage:u.searchParams.has('text')}));}});
await c.addInitScript(()=>{window.__auditOpened=[];window.open=(url)=>{window.__auditOpened.push(url);return null;};});
await c.route('**/*',r=>{const q=r.request();if(/wa\.me|api\.whatsapp|google-analytics|googletagmanager|clarity\.ms/.test(q.url())||(!['GET','HEAD'].includes(q.method())&&/\/api\//.test(q.url())))return r.abort();return r.continue();});
for(const path of ['en/','en/bahrain-to-khobar/','en/prices/']){
 await p.goto('https://getvendora.net/bahrain-saudi-gcc-transport/'+path,{waitUntil:'networkidle'});
 console.log(JSON.stringify({path,arabicLines:await p.evaluate(()=>document.body.innerText.split('\n').filter(x=>/[\u0600-\u06ff]/.test(x)))}));
 await p.locator('a[data-wa-message]:visible').first().click();await p.locator('[data-booking-continue]').waitFor({timeout:15000});await p.locator('[data-booking-continue]').click();
 console.log(JSON.stringify({path,opened:await p.evaluate(()=>window.__auditOpened.map(u=>({host:new URL(u).host,phone:new URL(u).pathname,hasMessage:new URL(u).searchParams.has('text')})))}));
}await b.close();
