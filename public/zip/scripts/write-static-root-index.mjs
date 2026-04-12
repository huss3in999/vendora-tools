import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distIndex = path.join(root, 'dist', 'index.html');
const out = path.join(root, 'index.html');

if (!fs.existsSync(distIndex)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

let html = fs.readFileSync(distIndex, 'utf8');
html = html.replace(/\.\/assets\//g, './dist/assets/');
html = html.replace(/\s+crossorigin/g, '');
fs.writeFileSync(out, html, 'utf8');
console.log('Wrote index.html for static hosting (loads ./dist/assets/*, no /src/main.tsx).');
