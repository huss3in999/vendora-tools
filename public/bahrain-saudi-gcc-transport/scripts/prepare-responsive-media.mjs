import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imageRoot = resolve(root, 'assets/images');
const output = resolve(imageRoot, 'responsive');
mkdirSync(output, { recursive: true });
const manifest = {};
function discover(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? (e.name === 'responsive' ? [] : discover(resolve(dir, e.name)))
    : (/\.(webp|png|jpe?g)$/i.test(e.name) ? [resolve(dir, e.name)] : []));
}
for (const file of discover(imageRoot)) {
  const bytes = readFileSync(file);
  const meta = await sharp(bytes).metadata();
  if (meta.width < 600) continue;
  const hash = createHash('sha256').update(bytes).update('vendora-webp-q72-v1').digest('hex').slice(0, 12);
  const widths = [...new Set([480, 768, 1200, Math.min(meta.width, 1672)].filter(w => w <= meta.width))].sort((a,b)=>a-b);
  const variants = [];
  for (const width of widths) {
    const name = `media-${hash}-${width}.webp`;
    const target = resolve(output, name);
    if (!existsSync(target)) await sharp(bytes).resize({ width, withoutEnlargement:true }).webp({ quality:72, effort:5 }).toFile(target);
    variants.push({ width, url:`/bahrain-saudi-gcc-transport/assets/images/responsive/${name}` });
  }
  manifest['/bahrain-saudi-gcc-transport/assets/images/' + file.slice(imageRoot.length + 1).replaceAll('\\','/')] = { width:meta.width, height:meta.height, variants };
}
writeFileSync(resolve(root,'config/responsive-media.json'), JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared responsive variants for ${Object.keys(manifest).length} public images.`);
