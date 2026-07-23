import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(siteRoot, '..', '..');
const previewRoot = join(repositoryRoot, 'planning-output', 'gcc-preview');
const reviewRoot = join(repositoryRoot, 'planning-output', 'gcc-preview-review');
const contactSheetPath = join(reviewRoot, 'contact-sheet.png');

if (
  !previewRoot.startsWith(repositoryRoot) ||
  !reviewRoot.startsWith(repositoryRoot) ||
  previewRoot.includes(`${join(repositoryRoot, 'public')}`) ||
  reviewRoot.includes(`${join(repositoryRoot, 'public')}`)
) {
  throw new Error('Preview review output must remain outside public/');
}

const targets = [
  ['Saudi Arabia → Qatar — Arabic', 'ar', 'routes', 'saudi-to-qatar'],
  ['Saudi Arabia → Qatar — English', 'en', 'routes', 'saudi-to-qatar'],
  ['Qatar → Saudi Arabia — Arabic', 'ar', 'routes', 'qatar-to-saudi'],
  ['Qatar → Saudi Arabia — English', 'en', 'routes', 'qatar-to-saudi'],
  ['UAE → Bahrain — Arabic', 'ar', 'routes', 'uae-to-bahrain'],
  ['UAE → Bahrain — English', 'en', 'routes', 'uae-to-bahrain'],
  ['Bahrain origin hub — Arabic', 'ar', 'hubs', 'transport-from-bahrain'],
  ['Bahrain origin hub — English', 'en', 'hubs', 'transport-from-bahrain'],
  ['Chauffeur hub — Arabic', 'ar', 'services', 'chauffeur-services'],
  ['Chauffeur hub — English', 'en', 'services', 'chauffeur-services']
];

mkdirSync(reviewRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 520 }, deviceScaleFactor: 1 });
const captures = [];

for (const [label, lang, type, slug] of targets) {
  const file = join(previewRoot, lang, type, slug, 'index.html');
  const url = pathToFileURL(file).href;
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const image = await page.screenshot({ type: 'png', fullPage: false });
  captures.push({ label, image });
}

const cards = captures.map(({ label, image }) => `
  <article>
    <h2>${label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</h2>
    <img src="data:image/png;base64,${image.toString('base64')}" alt="">
  </article>`).join('');

await page.setViewportSize({ width: 1500, height: 1000 });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;padding:28px;background:#f4efe5;color:#071827;font-family:Arial,sans-serif}
  h1{margin:0 0 20px;font-size:28px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  article{background:#fff;border:1px solid #d7c9a6;border-radius:14px;padding:12px;box-shadow:0 8px 22px #07182718}
  h2{margin:0 0 9px;font-size:17px}img{display:block;width:100%;height:auto;border-radius:9px;border:1px solid #ddd}
</style></head><body><h1>Vendora GCC private preview — representative review sheet</h1><div class="grid">${cards}</div></body></html>`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: contactSheetPath, type: 'png', fullPage: true });
await browser.close();

const summaryPath = join(reviewRoot, 'README.md');
writeFileSync(summaryPath, `# GCC private preview contact sheet

Repository-only review output. This folder is outside \`public/\` and is not a deployment asset.

- Contact sheet: \`contact-sheet.png\`
- Captures: ${targets.length}
- Preview source: \`planning-output/gcc-preview/\`
`, 'utf8');

console.log(JSON.stringify({
  captures: targets.length,
  contact_sheet: contactSheetPath,
  bytes: readFileSync(contactSheetPath).length
}, null, 2));
