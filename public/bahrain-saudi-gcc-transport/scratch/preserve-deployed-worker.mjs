import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,basename} from 'node:path';
const config=readFileSync('C:/Users/hussa/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8');
const token=config.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];if(!token)throw Error('Wrangler OAuth token unavailable');
const res=await fetch('https://api.cloudflare.com/client/v4/accounts/3f5dcaaeaf14a8a1c4bbda38d93ceda0/workers/scripts/vendora-tools/content/v2',{headers:{Authorization:`Bearer ${token}`}});
if(!res.ok)throw Error(`Worker download HTTP ${res.status}`);
const destination='C:/Users/hussa/Documents/Vendora Private/GCC Backlinks/deployed-worker-backup-2026-10-01';mkdirSync(destination,{recursive:true});
if(res.headers.get('content-type')?.includes('multipart')){
 const form=await res.formData();for(const [key,value]of form){const name=basename(value.name||key);const body=typeof value==='string'?value:await value.text();writeFileSync(join(destination,name),body);console.log(JSON.stringify({module:name,bytes:body.length,adminSchemaPromises:body.includes('adminSchemaPromises')}));}
}else{const body=await res.text();writeFileSync(join(destination,'worker.js'),body);console.log(JSON.stringify({module:'worker.js',bytes:body.length,adminSchemaPromises:body.includes('adminSchemaPromises')}));}
