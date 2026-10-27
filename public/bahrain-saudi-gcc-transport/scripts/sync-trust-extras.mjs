import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { publishTrust } from './trust-publisher.mjs';
import profiles from '../config/route-profiles.mjs';
import { gccBrandCopy } from '../assets/gcc-brand-copy.mjs';
import { businessEntity, pricingCopy } from '../assets/trust-schema.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const business = JSON.parse(readFileSync(resolve(root,'config/business-config.json'),'utf8'));
const config = { settings:{public_prices_enabled:false}, routes:[] };
const pairs = Object.keys(pricingCopy.ar).map((key)=>[pricingCopy.ar[key],pricingCopy.en[key]]);
pairs.push(...Object.keys(gccBrandCopy.ar).map(key => [gccBrandCopy.ar[key], gccBrandCopy.en[key]]));
pairs.push(['عروض أسعار المسارات الشائعة','Popular route quotes']);
for (const slug of Object.keys(profiles)) {
  const texts = ['ar','en'].map((lang) => {
    const html = publishTrust('<html><head></head><body><main><section></section></main></body></html>', {slug,lang,url:'https://getvendora.net/',business,config,assetPrefix:''});
    const section = html.match(/<section[^>]*data-route-profile[\s\S]*?<\/section>/)?.[0] || '';
    return [...section.matchAll(/>([^<>]+)</g)].map((m)=>m[1].trim()).filter(Boolean);
  });
  if(texts[0].length !== texts[1].length) throw new Error(`Unpaired translation on ${slug}`);
  texts[0].forEach((ar,i) => { if(/[\u0600-\u06ff]/.test(ar)) pairs.push([ar,texts[1][i]]); });
}
const sitePath=resolve(root,'site.js'); let site=readFileSync(sitePath,'utf8');
site=site.replace(/\s*\/\/ BEGIN GENERATED TRUST TRANSLATIONS[\s\S]*?\/\/ END GENERATED TRUST TRANSLATIONS\r?\n/g,'\n');
site=site.replace('const translations = [',`const translations = [\n    // BEGIN GENERATED TRUST TRANSLATIONS\n${[...new Map(pairs.map(p=>[p[0],p])).values()].map(p=>'    '+JSON.stringify(p)+',').join('\n')}\n    // END GENERATED TRUST TRANSLATIONS\n`);
const legalTemplate = "`${state.lang === 'en' ? config.legal_name : config.legal_name_ar} | ${state.lang === 'en' ? 'CR No:' : 'س.ت:'} ${config.cr_number} | ${state.lang === 'en' ? config.public_address : config.public_address_ar}`";
site=site.replace(/crSmall.textContent = state.lang === 'en'[\s\S]*?;\n/,`crSmall.textContent = ${legalTemplate};\n`);
site=site.replaceAll('font-size: 11px; opacity: 0.75;', 'font-size: 11px; opacity: 1;');
site=site.replace(/<small style="display:block; font-size: 11px; opacity: 1; margin-top: 6px;">[^<]+134858-1[^<]+<\/small>/g, '<small data-vendora-cr style="display:block; font-size:11px;margin-top:6px;">${config.legal_name} | CR No: ${config.cr_number} | ${config.public_address}</small>');
// Arabic footer uses the matching localized company configuration.
const arStart=site.indexOf(': `<div class="container footer-grid">');
if(arStart>=0) site=site.slice(0,arStart)+site.slice(arStart).replace('${config.legal_name} | CR No: ${config.cr_number} | ${config.public_address}', '${config.legal_name_ar} | س.ت: ${config.cr_number} | ${config.public_address_ar}');
writeFileSync(sitePath,site);

for(const rel of ['index.html','about/index.html','privacy-policy/index.html']) {
 const file=resolve(root,'..',rel); let html=readFileSync(file,'utf8');
 html=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
 const slug=rel==='index.html'?'home':rel.split('/')[0];
 const url='https://getvendora.net/'+(slug==='home'?'':slug+'/');
 html=publishTrust(html,{slug,lang:'en',url,business,config,assetPrefix:'/bahrain-saudi-gcc-transport/assets/'});
 writeFileSync(file,html);
}
const privatePaths=['/admin/','/api/private/','/_site/','/demo/','/nada%20Menu/','/bahrain-saudi-gcc-transport/admin/','/bahrain-saudi-gcc-transport/care/','/bahrain-saudi-gcc-transport/ai-chat-test/','/booking-desk/','/desk/'];
const robots=['Googlebot','Bingbot','GPTBot','OAI-SearchBot','PerplexityBot','ClaudeBot','*'].map(bot=>`User-agent: ${bot}\nAllow: /\n${privatePaths.map(p=>'Disallow: '+p).join('\n')}`).join('\n\n')+'\n\nSitemap: https://getvendora.net/sitemap.xml\nSitemap: https://getvendora.net/bahrain-saudi-gcc-transport/sitemap-index.xml\n';
for(const file of [resolve(root,'robots.txt'),resolve(root,'../robots.txt')]) writeFileSync(file,robots);
console.log(`Synchronized ${pairs.length} bilingual trust phrases, root company schema and bot policies.`);
