import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const changed = [];

function edit(relative, update) {
  const file = join(root, relative);
  const before = readFileSync(file, 'utf8');
  const after = update(before);
  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    changed.push(relative);
  }
}

function get(html, pattern) {
  return html.match(pattern)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] || '';
}

function ensureMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\b[^>]*${attribute}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  if (pattern.test(html)) return html;
  return html.replace(/<\/head>/i, `  <meta ${attribute}="${key}" content="${content.replace(/"/g, '&quot;')}">\n</head>`);
}

function ensureAlternate(html, hreflang, href) {
  const pattern = new RegExp(`<link\\b[^>]*rel=["']alternate["'][^>]*hreflang=["']${hreflang.replace('-', '\\-')}["'][^>]*>`, 'i');
  const replacement = `<link rel="alternate" hreflang="${hreflang}" href="${href}">`;
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace(/<\/head>/i, `  ${replacement}\n</head>`);
}

const englishMixedCopy = [
  'en/bahrain-to-dammam/index.html', 'en/bahrain-to-dubai/index.html', 'en/bahrain-to-iraq/index.html',
  'en/bahrain-to-khobar/index.html', 'en/bahrain-to-kuwait/index.html', 'en/bahrain-to-oman/index.html',
  'en/bahrain-to-qatar/index.html', 'en/bahrain-to-riyadh/index.html', 'en/bahrain-to-saudi/index.html',
  'en/bahrain-to-uae/index.html', 'en/dammam-to-bahrain/index.html', 'en/khobar-to-bahrain/index.html',
  'en/riyadh-to-bahrain/index.html', 'en/saudi-to-bahrain/index.html', 'en/king-fahd-causeway-guide/index.html',
  'en/prices/index.html', 'en/privacy/index.html',
];

for (const file of englishMixedCopy) {
  edit(file, (html) => html
    .replace(/<span\b[^>]*class=["'][^"']*\bar-copy\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/>العربية<\/a>/g, '>Arabic</a>'));
}

for (const [file, arHref, enHref] of [
  ['privacy/index.html', 'https://getvendora.net/bahrain-saudi-gcc-transport/privacy/', 'https://getvendora.net/bahrain-saudi-gcc-transport/en/privacy/'],
  ['en/privacy/index.html', 'https://getvendora.net/bahrain-saudi-gcc-transport/privacy/', 'https://getvendora.net/bahrain-saudi-gcc-transport/en/privacy/'],
  ['king-fahd-causeway-guide/index.html', 'https://getvendora.net/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/', 'https://getvendora.net/bahrain-saudi-gcc-transport/en/king-fahd-causeway-guide/'],
  ['en/king-fahd-causeway-guide/index.html', 'https://getvendora.net/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/', 'https://getvendora.net/bahrain-saudi-gcc-transport/en/king-fahd-causeway-guide/'],
]) {
  edit(file, (html) => {
    html = ensureAlternate(html, 'ar-BH', arHref);
    html = ensureAlternate(html, 'en', enHref);
    return ensureAlternate(html, 'x-default', arHref);
  });
}

for (const file of [
  'booking-terms/index.html', 'en/booking-terms/index.html',
  'prices/index.html', 'en/prices/index.html',
  'privacy/index.html', 'en/privacy/index.html',
  'king-fahd-causeway-guide/index.html', 'en/king-fahd-causeway-guide/index.html',
  'gcc-private-transport-guide/index.html', 'en/gcc-private-transport-guide/index.html',
]) {
  edit(file, (html) => {
    const title = get(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const descriptionTag = html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)?.[0] || '';
    const description = attr(descriptionTag, 'content');
    const canonicalTag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || '';
    const canonical = attr(canonicalTag, 'href');
    html = ensureMeta(html, 'property', 'og:title', title);
    html = ensureMeta(html, 'property', 'og:description', description);
    html = ensureMeta(html, 'property', 'og:url', canonical);
    return ensureMeta(html, 'name', 'twitter:card', 'summary');
  });
}

edit('care/index.html', (html) => ensureMeta(html, 'name', 'description', 'صفحة خاصة لمتابعة طلب النقل وإرسال الملاحظات المرتبطة بالرحلة المؤكدة.'));
edit('care/en/index.html', (html) => ensureMeta(html, 'name', 'description', 'Private page for following up a confirmed transport request and submitting journey feedback.'));

edit('privacy/index.html', (html) => html.replace(
  /<meta\b[^>]*name=["']description["'][^>]*>/i,
  '<meta name="description" content="شرح واضح لبيانات طلب النقل التي تستخدمها فندورا للتنسيق والمتابعة والخصوصية عند التواصل عبر الموقع وواتساب.">',
));

edit('sitemap-gcc-transport-en.xml', (xml) => {
  const url = 'https://getvendora.net/bahrain-saudi-gcc-transport/en/king-fahd-causeway-guide/';
  if (xml.includes(`<loc>${url}</loc>`)) return xml;
  return xml.replace('</urlset>', `  <url><loc>${url}</loc><lastmod>2026-07-21</lastmod></url>\n</urlset>`);
});

const createdEnglishPairs = [
  'bahrain-airport-transfer', 'bahrain-to-hamad-airport', 'bahrain-to-kuwait-airport',
  'dubai-to-bahrain', 'hamad-airport-to-bahrain', 'kuwait-airport-to-bahrain',
  'kuwait-to-bahrain', 'oman-to-bahrain', 'qatar-to-bahrain',
];

for (const slug of createdEnglishPairs) {
  edit(`${slug}/index.html`, (html) => ensureAlternate(html, 'en', `https://getvendora.net/bahrain-saudi-gcc-transport/en/${slug}/`));
}

edit('sitemap-gcc-transport-en.xml', (xml) => {
  const additions = createdEnglishPairs
    .map((slug) => `https://getvendora.net/bahrain-saudi-gcc-transport/en/${slug}/`)
    .filter((url) => !xml.includes(`<loc>${url}</loc>`))
    .map((url) => `  <url><loc>${url}</loc><lastmod>2026-07-21</lastmod></url>`)
    .join('\n');
  return additions ? xml.replace('</urlset>', `${additions}\n</urlset>`) : xml;
});

for (const file of ['dammam-to-bahrain/index.html', 'khobar-to-bahrain/index.html', 'riyadh-to-bahrain/index.html']) {
  edit(file, (html) => ensureMeta(html, 'name', 'twitter:card', 'summary'));
}

console.log(`Changed ${changed.length} files`);
changed.forEach((file) => console.log(file));
