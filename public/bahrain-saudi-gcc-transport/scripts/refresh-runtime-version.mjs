import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const version = '20261010-wcag-aa';
const excluded = new Set(['node_modules', 'scratch', 'tests', 'test-results', 'admin', 'functions', 'scripts', 'templates', 'src', 'content', 'data', 'planning', 'qa', 'references', 'research', 'seo']);
let changed = 0;

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!excluded.has(e.name)) walk(p);
    } else if (e.name === 'index.html') {
      const before = readFileSync(p, 'utf8');
      let after = before
        .replace(/(src=["'][^"']*?)(site\.js|vendora-config\.js)(?:\?[^"']*)?(["'])/g, `$1$2?v=${version}$3`)
        .replace(/(href=["'][^"']*?)(site\.css|vendora-theme\.css|theme\.css)(?:\?[^"']*)?(["'])/g, `$1$2?v=${version}$3`);
      if (after !== before) {
        writeFileSync(p, after);
        changed++;
      }
    }
  }
}

walk(root);
// Also update root public/index.html if present
const publicRoot = join(root, '..');
const rootIndex = join(publicRoot, 'index.html');
try {
  const beforeRoot = readFileSync(rootIndex, 'utf8');
  let afterRoot = beforeRoot
    .replace(/(src=["'][^"']*?)(site\.js|vendora-config\.js)(?:\?[^"']*)?(["'])/g, `$1$2?v=${version}$3`)
    .replace(/(href=["'][^"']*?)(site\.css|vendora-theme\.css|theme\.css)(?:\?[^"']*)?(["'])/g, `$1$2?v=${version}$3`);
  if (afterRoot !== beforeRoot) {
    writeFileSync(rootIndex, afterRoot);
    changed++;
  }
} catch {}

console.log(JSON.stringify({ version, changed }));
