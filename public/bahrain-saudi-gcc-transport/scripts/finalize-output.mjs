import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizePublicHtml } from './finalize-public-html.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const sitemap=readFileSync(resolve(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
for(const url of urls){
  const pathname=new URL(url).pathname;
  const file=resolve(root,'.'+pathname,'index.html');
  if(!existsSync(file))continue;
  const lang=pathname.includes('/en/') || !pathname.startsWith('/bahrain-saudi-gcc-transport/')?'en':'ar';
  const slug=pathname.replace('/bahrain-saudi-gcc-transport/','').replace(/^en\//,'').split('/').filter(Boolean).at(-1)||'home';
  const current=readFileSync(file,'utf8');
  const next=finalizePublicHtml(current,{slug,lang,url});
  if(current!==next) {
    // Windows scanners can briefly hold a page just written by the publisher.
    for(let attempt=0;;attempt++) {
      try { writeFileSync(file,next); break; }
      catch(error) {
        if(attempt>=5 || !['EBUSY','EPERM','UNKNOWN'].includes(error.code)) throw error;
        await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));
      }
    }
  }
}
console.log(`Finalized versioned public assets for ${urls.length} sitemap entries.`);
