#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..');
const wranglerPath = resolve(publicDir, 'wrangler.jsonc');
const wrangler = JSON.parse(readFileSync(wranglerPath, 'utf8'));
const assetsDir = resolve(publicDir, wrangler.assets?.directory || '.');

const required = [
  'bahrain-saudi-gcc-transport/en/index.html',
  'bahrain-saudi-gcc-transport/en/bahrain-to-qatar/index.html',
  'bahrain-saudi-gcc-transport/index.html',
  'bahrain-saudi-gcc-transport/bahrain-to-qatar/index.html',
  'worker.js',
  'functions/api/transport/admin.js',
  'functions/api/transport/whatsapp-lead.js',
  'functions/bahrain-saudi-gcc-transport/api/transport/admin.js',
  'functions/bahrain-saudi-gcc-transport/api/transport/whatsapp-lead.js',
];

let missing = 0;
for (const rel of required) {
  const ok = existsSync(resolve(assetsDir, rel));
  console.log(`${ok ? 'OK' : 'MISSING'} ${rel}`);
  if (!ok) missing++;
}

if (missing) {
  console.error(`\nDeploy asset directory is missing ${missing} required transport files: ${assetsDir}`);
  process.exit(1);
}

console.log(`\nDeploy asset directory verified: ${assetsDir}`);
