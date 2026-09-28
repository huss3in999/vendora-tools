import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const publicRoot = join(repo, 'public');
const retired = new Set([
  'arbaeen-karbala-travel-tips', 'arbaeen-packing-list', 'arbaeen-season-bahrain-to-karbala', 'arbaeen-transport',
  'bahrain-to-iraq', 'bahrain-to-baghdad', 'bahrain-to-basra', 'bahrain-to-karbala', 'bahrain-to-karbala-route-plan',
  'bahrain-to-najaf', 'bahrain-to-najaf-driving-time', 'best-car-for-iraq-family-travel', 'best-time-bahrain-to-iraq',
  'best-way-bahrain-to-karbala', 'book-private-car-bahrain-to-karbala', 'book-private-car-bahrain-to-najaf',
  'direct-transport-bahrain-to-karbala', 'family-transport-bahrain-najaf-karbala', 'family-travel-bahrain-to-iraq',
  'iraq-ziyarat-private-car-bahrain', 'karbala-trip-from-bahrain', 'najaf-trip-from-bahrain',
  'overland-travel-bahrain-to-iraq', 'pilgrims-transport-bahrain-to-iraq', 'private-car-bahrain-to-iraq',
  'private-car-vs-other-iraq-travel', 'ziyarat-iraq-transport'
]);
const retiredUrl = new RegExp(`(?:${[...retired].join('|')})`, 'i');
const xmlFiles = [
  'sitemap.xml',
  'bahrain-saudi-gcc-transport/sitemap.xml',
  'bahrain-saudi-gcc-transport/sitemap-gcc-transport.xml',
  'bahrain-saudi-gcc-transport/sitemap-gcc-transport-en.xml'
];
const discoveryFiles = [
  'ai-index.json', 'llms.txt', '.well-known/llms.txt',
  'bahrain-saudi-gcc-transport/llms.txt', 'bahrain-saudi-gcc-transport/.well-known/llms.txt'
];

function update(file, transform) {
  const path = join(publicRoot, file);
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) writeFileSync(path, after, 'utf8');
}

for (const file of xmlFiles) update(file, (text) => text.replace(/\s*<url>[\s\S]*?<\/url>/gi, (block) => retiredUrl.test(block) ? '' : block));

function cleanJson(value) {
  if (Array.isArray(value)) return value.map(cleanJson).filter((item) => item !== null);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanJson(item)]).filter(([, item]) => item !== null));
  if (typeof value !== 'string') return value;
  if (retiredUrl.test(value) || /\b(?:iraq|karbala|najaf|arbaeen|ziyarat|pilgrims)\b|العراق|كربلاء|النجف|الأربعين|زيارة/i.test(value)) return null;
  return value;
}
update('ai-index.json', (text) => `${JSON.stringify(cleanJson(JSON.parse(text)), null, 2)}\n`);

for (const file of discoveryFiles.slice(1)) update(file, (text) => {
  const lines = text.split(/\r?\n/);
  const output = [];
  let skipping = false;
  for (const line of lines) {
    if (/^### Iraq transport article guides|^### Iraq ziyarat and seasonal route notes/i.test(line)) { skipping = true; continue; }
    if (skipping && /^### /.test(line)) skipping = false;
    if (!skipping && !retiredUrl.test(line) && !/\b(?:Iraq|Karbala|Najaf|Arbaeen|Ziyarat|pilgrim)\b|العراق|كربلاء|النجف|الأربعين|زيارة/i.test(line)) output.push(line);
  }
  return output.join('\n');
});

const transportRoot = join(publicRoot, 'bahrain-saudi-gcc-transport');
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name.toLowerCase() === 'index.html') {
      const rel = full.slice(transportRoot.length + 1).replaceAll('\\', '/');
      const slug = rel.split('/').filter(Boolean)[0] === 'en' ? rel.split('/')[1] : rel.split('/')[0];
      if (retired.has(slug)) continue;
      update(full.slice(publicRoot.length + 1), (html) => html
        .replace(/<article class="route-card" data-active-route="BH-IQ">[\s\S]*?<\/article>/gi, '')
        .replace(/<a\b[^>]*href=["'][^"']*(?:bahrain-to-iraq|bahrain-to-karbala|bahrain-to-najaf)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
        .replace(/<span class="flag-badge"><span class="flag-emoji">🇮🇶<\/span><span>العراق<\/span><\/span>/g, '')
        .replace(/<span class="chip">Iraq<\/span>/g, '')
        .replace(/\s+and Iraq\b/gi, '').replace(/\s+and Iraq(?=[.,])/gi, '')
        .replace(/، والعراق(?=[،。.,])/g, '').replace(/والعراق،/g, ''));
    }
  }
}
visit(transportRoot);

const prices = join(transportRoot, 'config', 'route-prices.json');
const priceText = readFileSync(prices, 'utf8').replace(/\{ "route_id": "bahrain-to-iraq"[^\n]*\n/g, '');
writeFileSync(prices, priceText, 'utf8');

for (const file of ['bahrain-saudi-gcc-transport/assets/vendora-config.js', 'functions/api/transport/public-settings.js']) {
  update(file, (text) => text
    .replace(/\n\s*\{\s*\n\s*"route_id": "bahrain-to-iraq"[\s\S]*?\n\s*\},/i, '')
    .replace(/\n\s*\{\s*\n\s*"route_slug": "bahrain-to-iraq"[\s\S]*?\n\s*\},/i, ''));
}
for (const file of ['bahrain-saudi-gcc-transport/prices/index.html', 'bahrain-saudi-gcc-transport/en/prices/index.html']) {
  update(file, (html) => html
    .replace(/<article class="price-card" data-vendora-price="bahrain-to-iraq">[\s\S]*?<\/article>/gi, '')
    .replace(/,\{"@type":"ListItem","position":14,"item":\{"@type":"Service","name":"(?:Iraq routes|مسارات العراق)"[\s\S]*?\}\}/gi, ''));
}

for (const file of ['bahrain-saudi-gcc-transport/gcc-destinations/index.html', 'bahrain-saudi-gcc-transport/en/gcc-destinations/index.html']) {
  update(file, (html) => html.replace(/,\{"@type":"ListItem","position":6,"url":"[^"]*bahrain-to-iraq\/"\}/gi, ''));
}
update('bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html', (html) => html
  .replace(/ \| Bahrain, Saudi Arabia, Qatar, Kuwait, UAE, Oman & Iraq/g, ' | Bahrain, Saudi Arabia, Qatar, Kuwait, UAE and Oman')
  .replace(/, and Iraq\b/g, '')
  .replace(/, "Iraq"/g, '')
  .replace(/\s*\{ "@type": "ListItem", "position": 4, "name": "Iraq routes: Najaf and Karbala private transport planning" \}/g, '')
  .replace(/, Najaf or Karbala/g, '')
  .replace(/Iraq Ziyarat/g, 'GCC private transport')
  .replace(/ or Iraq Ziyarat routes/g, '')
  .replace(/<article class="card"><h3>Bahrain to Iraq<\/h3>[\s\S]*?<\/article>/g, '')
  .replace(/<article class="card"><h3>Iraq<\/h3>[\s\S]*?<\/article>/g, '')
  .replace(/, and Ziyarat routes to Najaf or Karbala \(Iraq\)/g, '')
  .replace(/, Najaf or Karbala/g, ''));
update('bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html', (html) => html
  .replace(/, Ziyarat routes\./g, '.').replace(/, UAE, Oman &amp; Iraq/g, ', UAE and Oman'));

console.log('Retired non-GCC transport routes from public discovery, navigation, and pricing sources.');
