import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const target = path.join(root, 'app');

if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run npm run build first.');
  process.exit(1);
}

fs.rmSync(target, {recursive: true, force: true});
fs.cpSync(dist, target, {recursive: true});
console.log('Copied dist/ -> app/ (upload app/ or point your host at it)');
