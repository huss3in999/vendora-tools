import http from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshot } from './providers.mjs';
import { DatabaseSync } from 'node:sqlite';
import { budgetSchema,reserveStatement } from './budget.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.resolve(here,'../../public');
const env={...process.env};
try{for(const line of (await readFile(path.join(here,'.env'),'utf8')).split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!env[m[1]])env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');}}catch{}
const weatherDir=path.join(here,'.cache');await mkdir(weatherDir,{recursive:true});
const budgetDb=new DatabaseSync(path.join(weatherDir,'google-budget.sqlite'));budgetDb.exec(budgetSchema);
const budget={reserve:async kind=>{try{const {sql,args}=reserveStatement(kind);return budgetDb.prepare(sql).run(...args).changes===1;}catch{return false;}}};
const cache={get:async key=>{try{return JSON.parse(await readFile(path.join(weatherDir,Buffer.from(key).toString('hex')+'.json'),'utf8'));}catch{return null;}},set:async(key,v)=>writeFile(path.join(weatherDir,Buffer.from(key).toString('hex')+'.json'),JSON.stringify(v))};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
export function injectPreview(html){
  const en=/<html[^>]*lang="en"/.test(html);
  return html.replace(/(<meta name="robots" content=")[^"]*/,'$1noindex,nofollow')
    .replace('</head>','<link rel="stylesheet" href="/__journey/component.css"><script>window.__VENDORA_TRACKING_DISABLED__=true;</script><script defer src="/__journey/component.js"></script></head>')
    .replace(/(<body[^>]*>)/,`$1<div class="sj-preview">${en?'Private preview · Live website unchanged':'معاينة خاصة · الموقع المباشر دون تغيير'}</div>`);
}
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Preview is read-only');return;}
    if(u.pathname==='/api/smart-journey'){
      const data=await snapshot(u.searchParams.get('route'),env,cache,fetch,budget);res.writeHead(data?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify(data||{error:'unknown_route'}));return;
    }
    if(u.pathname.includes('/api/')){
      // Read-only review preparation: no production writes or invented ratings.
      if(u.pathname.endsWith('/route-reviews')){
        const remote=await fetch('https://getvendora.net/api/transport/route-reviews?route='+encodeURIComponent(u.searchParams.get('route')||'bahrain-to-dammam'),{signal:AbortSignal.timeout(6000)});
        res.writeHead(remote.status,{'Content-Type':'application/json'});res.end(await remote.text());return;
      }
      res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:'Preview: production writes disabled'}));return;
    }
    let root=publicRoot,requested=decodeURIComponent(u.pathname);
    if(requested==='/'){res.writeHead(302,{Location:'/bahrain-saudi-gcc-transport/bahrain-to-dammam/'});res.end();return;}
    if(requested.startsWith('/__journey/')){root=here;requested=requested.slice('/__journey'.length);if(!['/component.js','/component.css'].includes(requested)){res.writeHead(404);res.end();return;}}
    let file=path.resolve(root,'.'+requested);
    if(!file.startsWith(root+path.sep)||requested.includes('/.')||!['.html','.js','.css','.svg','.webp','.png','.jpg','.jpeg','.json','.ico','.woff2','.txt'].includes(path.extname(file))&&path.extname(file)!==''){res.writeHead(404);res.end();return;}
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    let body=await readFile(file);const ext=path.extname(file);
    if(ext==='.html')body=Buffer.from(injectPreview(body.toString()));
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Unavailable');}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(env.PREVIEW_PORT)||8791,'127.0.0.1',()=>console.log('Vendora private preview: http://127.0.0.1:8791/bahrain-saudi-gcc-transport/bahrain-to-dammam/'));
