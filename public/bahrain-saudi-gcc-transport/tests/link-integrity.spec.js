import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));

function findProjectRoot() {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    join(cwd, 'bahrain-saudi-gcc-transport'),
    join(cwd, 'public', 'bahrain-saudi-gcc-transport'),
    join(testDir, '..'),
  ].map((candidate) => resolve(candidate));

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html')) && existsSync(join(candidate, 'site.js'))) {
      return candidate;
    }
  }

  throw new Error(`Could not find bahrain-saudi-gcc-transport root from ${cwd}`);
}

const root = findProjectRoot();

const mustExist = [
  'index.html',
  'en/index.html',
  'bahrain-to-qatar/index.html',
  'en/bahrain-to-qatar/index.html',
  'bahrain-to-riyadh/index.html',
  'en/bahrain-to-riyadh/index.html',
];

test('required Arabic and English pages exist', () => {
  for (const rel of mustExist) {
    expect(existsSync(join(root, rel)), rel).toBeTruthy();
  }
});

test('Arabic/English cross-links point to existing local files', () => {
  const arHtml = readFileSync(join(root, 'bahrain-to-qatar/index.html'), 'utf8');
  const enHtml = readFileSync(join(root, 'en/bahrain-to-qatar/index.html'), 'utf8');
  expect(arHtml.includes('/bahrain-saudi-gcc-transport/en/bahrain-to-qatar/')).toBeTruthy();
  expect(enHtml.includes('/bahrain-saudi-gcc-transport/bahrain-to-qatar/')).toBeTruthy();

  const hrefRe = /href="(\/bahrain-saudi-gcc-transport\/[^"#?]*)"/g;
  for (const rel of ['index.html', 'en/index.html']) {
    const html = readFileSync(join(root, rel), 'utf8');
    let m;
    while ((m = hrefRe.exec(html)) !== null) {
      let p = m[1].replace('/bahrain-saudi-gcc-transport/', '');
      if (!p.endsWith('/')) continue;
      const local = join(root, p, 'index.html');
      expect(existsSync(local), `${rel} -> ${m[1]}`).toBeTruthy();
    }
  }
});
