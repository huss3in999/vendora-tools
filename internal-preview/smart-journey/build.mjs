import { cp,mkdir,readFile,writeFile } from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {injectPreview} from './server.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(here,'../../public/bahrain-saudi-gcc-transport');
const dest=path.join(here,'dist/bahrain-saudi-gcc-transport');
await mkdir(dest,{recursive:true});
for(const f of ['site.css','site.js','business-config.js','file-protocol-links.js','assets','config'])await cp(path.join(source,f),path.join(dest,f),{recursive:true});
for(const lang of ['','en/']){const target=path.join(dest,lang,'bahrain-to-dammam');await mkdir(target,{recursive:true});await writeFile(path.join(target,'index.html'),injectPreview(await readFile(path.join(source,lang,'bahrain-to-dammam/index.html'),'utf8')));}
await mkdir(path.join(here,'dist/__journey'),{recursive:true});
for(const f of ['component.js','component.css'])await cp(path.join(here,f),path.join(here,'dist/__journey',f));
await writeFile(path.join(here,'dist/robots.txt'),'User-agent: *\nDisallow: /\n');
console.log('Isolated preview built; not deployed.');
