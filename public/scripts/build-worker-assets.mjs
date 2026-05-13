#!/usr/bin/env node
import { mkdirSync, readdirSync, statSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..');
const outDir = resolve(publicDir, '_site');

const topLevelExclude = new Set(['_site', 'node_modules', '.wrangler', '.git']);
const pathExclude = [
  /^scripts\//,
  /^bahrain-saudi-gcc-transport\/tests\//,
  /^bahrain-saudi-gcc-transport\/playwright\.config\.js$/,
  /^bahrain-saudi-gcc-transport\/package\.json$/,
  /^zip\//,
];

function shouldExclude(rel) {
  const norm = rel.replaceAll('\\\\', '/');
  const top = norm.split('/')[0];
  if (topLevelExclude.has(top)) return true;
  return pathExclude.some((re) => re.test(norm));
}

function copyTree(srcRoot, dstRoot, rel = '') {
  const src = rel ? join(srcRoot, rel) : srcRoot;
  for (const entry of readdirSync(src)) {
    const entryRel = rel ? `${rel}/${entry}` : entry;
    if (shouldExclude(entryRel)) continue;

    const from = join(srcRoot, entryRel);
    const to = join(dstRoot, entryRel);
    const st = statSync(from);

    if (st.isDirectory()) {
      mkdirSync(to, { recursive: true });
      copyTree(srcRoot, dstRoot, entryRel);
    } else if (st.isFile()) {
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
    }
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree(publicDir, outDir);

const mustHave = [
  'bahrain-saudi-gcc-transport/index.html',
  'bahrain-saudi-gcc-transport/en/index.html',
  'bahrain-saudi-gcc-transport/en/bahrain-to-qatar/index.html',
  '_redirects',
];

let missing = 0;
for (const rel of mustHave) {
  if (!existsSync(join(outDir, rel))) {
    console.error(`MISSING ${rel}`);
    missing++;
  }
}

if (missing) {
  console.error(`\nBuild failed: ${missing} required deployment files missing in _site.`);
  process.exit(1);
}

console.log('Built worker assets in public/_site');
