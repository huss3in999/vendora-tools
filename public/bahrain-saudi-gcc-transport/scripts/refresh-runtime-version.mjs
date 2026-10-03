import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const version='20261004-conversion1';
const excluded=new Set(['node_modules','scratch','tests','test-results','admin','functions','scripts','templates','src','content','data','planning','qa','references','research','seo']);
let changed=0;
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()){if(!excluded.has(e.name))walk(p);}else if(e.name==='index.html'){
 const before=readFileSync(p,'utf8');const after=before.replace(/(src=["'][^"']*?)(site\.js|vendora-config\.js)(?:\?[^"']*)?(["'])/g,`$1$2?v=${version}$3`);
 if(after!==before){writeFileSync(p,after);changed++;}
}}}
walk(root);console.log(JSON.stringify({version,changed}));
