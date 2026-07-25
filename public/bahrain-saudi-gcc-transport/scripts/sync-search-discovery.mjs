import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'config', 'search-discovery.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');
const excludedRoots = new Set(['admin', 'ai-chat-test', 'functions', 'node_modules', 'scratch', 'test-results', 'tests', 'templates']);
const excludedGuideSegments = new Set(['src', 'content', 'data', 'planning', 'qa', 'references', 'research', 'seo']);
const toPosix = (value) => value.split(sep).join('/');
const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
}[character]));

function discover(directory = root, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    const rel = toPosix(relative(root, full));
    const segments = rel.split('/');
    if (entry.isDirectory()) {
      if (excludedRoots.has(segments[0])) continue;
      if (segments[0] === 'gcc-private-transport-guide' && segments.slice(1).some((part) => excludedGuideSegments.has(part))) continue;
      discover(full, files);
    } else if (entry.name.toLowerCase() === 'index.html') {
      files.push(full);
    }
  }
  return files;
}

function attribute(html, tagPattern, name) {
  const tag = html.match(tagPattern)?.[0] || '';
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] || '';
}

function text(html, pattern) {
  return (html.match(pattern)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pageUrl(rel) {
  return new URL(rel.replace(/index\.html$/i, ''), `${config.site_origin}${config.site_path}`).href;
}

function pairedRel(rel) {
  if (rel === 'index.html') return 'en/index.html';
  return rel.startsWith('en/') ? rel.slice(3) : `en/${rel}`;
}

function replaceOrInsertHead(html, matcher, markup) {
  if (matcher.test(html)) return html;
  return html.replace(/\s*<\/head>/i, `\n  ${markup}\n</head>`);
}

function schemaFor({ url, title, description, language }) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${config.site_origin}${config.site_path}#organization`,
        name: config.brand_name,
        url: `${config.site_origin}${config.site_path}`
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: language,
        isPartOf: { '@id': `${config.site_origin}${config.site_path}#website` },
        about: { '@id': `${config.site_origin}${config.site_path}#organization` }
      }
    ]
  }).replace(/</g, '\\u003c');
}

const genericReplacements = [
  ['Vendora Bahrain GCC Transport', 'Vendora Transport'],
  ['GetVendora Transport', 'Vendora Transport'],
  ['GetVendora', 'Vendora Transport'],
  ['This page uses the same design, booking form, and service language found across the rest of the project.', 'Use this hub to choose the Saudi pickup city, then review the matching route details before requesting availability.'],
  ['The Saudi Arabia to Bahrain reverse route is now fully connected within the same transport project, with the same language, design, and booking approach.', 'Choose Khobar, Dammam, or Riyadh for route-specific pickup guidance before sending the journey details.'],
  ['صفحة مخصصة للدمام إلى البحرين بنفس النمط البصري والربط الداخلي الموجود في بقية صفحات النقل.', 'لرحلات الدمام إلى البحرين، أرسل موقع الاستلام والموعد والوجهة داخل البحرين لتأكيد المسار والتوفر.'],
  ['صفحة مخصصة للرياض إلى البحرين ضمن نفس النسق البصري ونفس لغة الخدمة داخل المشروع.', 'لرحلات الرياض إلى البحرين، أرسل موقع الاستلام والموعد والتوقفات المطلوبة لتأكيد خطة الطريق والتوفر.'],
  ['تستخدم هذه الصفحة نفس التصميم ونفس نموذج الحجز ونفس لغة الخدمة الموجودة في بقية صفحات الخدمة.', 'اختر مدينة الاستلام في السعودية ثم راجع تفاصيل المسار المناسب قبل طلب التوفر.'],
  ['المسار العكسي من السعودية إلى البحرين أصبح جزءاً مرتبطاً بالكامل من نفس مشروع النقل، بنفس اللغة ونفس التصميم ونفس طريقة الحجز.', 'اختر الخبر أو الدمام أو الرياض للاطلاع على إرشادات الاستلام الخاصة بكل مسار قبل إرسال تفاصيل الرحلة.']
];

function trustLinks(language) {
  const prefix = language === 'en' ? `${config.site_path}en/` : config.site_path;
  const labels = language === 'en'
    ? ['Booking policy', 'Cancellation policy', 'Passenger safety', 'Payment policy', 'Support', 'Complaints', 'Customer feedback']
    : ['سياسة الحجز', 'سياسة الإلغاء', 'سلامة الركاب', 'سياسة الدفع', 'الدعم', 'الشكاوى', 'آراء العملاء'];
  const slugs = ['booking-policy', 'cancellation-policy', 'passenger-safety', 'payment-policy', 'support-policy', 'complaints', 'customer-reviews'];
  return `<nav class="discovery-trust-links" aria-label="${language === 'en' ? 'Booking and trust information' : 'معلومات الحجز والثقة'}">${slugs.map((slug, index) => `<a href="${prefix}${slug}/">${labels[index]}</a>`).join('')}</nav>`;
}

function synchronizePage(file, original) {
  const rel = toPosix(relative(root, file));
  const language = rel.startsWith('en/') || /<html\b[^>]*lang=["']en/i.test(original) ? 'en' : 'ar';
  const robots = attribute(original, /<meta\b[^>]*name=["']robots["'][^>]*>/i, 'content');
  const indexable = !/\bnoindex\b/i.test(robots);
  const url = pageUrl(rel);
  const title = text(original, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = attribute(original, /<meta\b[^>]*name=["']description["'][^>]*>/i, 'content');
  let html = original;

  for (const [before, after] of genericReplacements) html = html.replaceAll(before, after);
  if (language === 'en') {
    html = html.replace(/(<a\b[^>]*class=["'][^"']*\blang-toggle\b[^"']*["'][^>]*>)[\s\S]*?(<\/a>)/i, '$1Arabic$2');
  } else {
    html = html.replace(/\s*<span\b[^>]*class=["'][^"']*\ben-sub\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');
  }

  const locale = language === 'en' ? 'en_GB' : 'ar_BH';
  html = replaceOrInsertHead(html, /<meta\b[^>]*property=["']og:type["']/i, '<meta property="og:type" content="website">');
  html = replaceOrInsertHead(html, /<meta\b[^>]*property=["']og:locale["']/i, `<meta property="og:locale" content="${locale}">`);
  html = replaceOrInsertHead(html, /<meta\b[^>]*property=["']og:title["']/i, `<meta property="og:title" content="${escapeXml(title)}">`);
  html = replaceOrInsertHead(html, /<meta\b[^>]*property=["']og:description["']/i, `<meta property="og:description" content="${escapeXml(description)}">`);
  html = replaceOrInsertHead(html, /<meta\b[^>]*property=["']og:url["']/i, `<meta property="og:url" content="${url}">`);
  html = replaceOrInsertHead(html, /<meta\b[^>]*property=["']og:image["']/i, `<meta property="og:image" content="${config.default_social_image}">`);
  html = replaceOrInsertHead(html, /<meta\b[^>]*name=["']twitter:card["']/i, '<meta name="twitter:card" content="summary_large_image">');
  html = replaceOrInsertHead(html, /<meta\b[^>]*name=["']twitter:title["']/i, `<meta name="twitter:title" content="${escapeXml(title)}">`);
  html = replaceOrInsertHead(html, /<meta\b[^>]*name=["']twitter:description["']/i, `<meta name="twitter:description" content="${escapeXml(description)}">`);
  html = replaceOrInsertHead(html, /<meta\b[^>]*name=["']twitter:image["']/i, `<meta name="twitter:image" content="${config.default_social_image}">`);

  if (!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(html)) {
    html = html.replace(/\s*<\/head>/i, `\n  <script type="application/ld+json">${schemaFor({ url, title, description, language })}</script>\n</head>`);
  }

  html = html.replace(/\s*<nav\b[^>]*class=["'][^"']*\bdiscovery-trust-links\b[^"']*["'][^>]*>[\s\S]*?<\/nav>\s*/i, '\n');
  if (!indexable) {
    // Private/noindex utilities should not receive discovery navigation.
  } else if (/<\/footer>/i.test(html)) {
    html = html.replace(/<\/footer>/i, `${trustLinks(language)}</footer>`);
  } else if (/<script\b[^>]*analytics-loader\.js[^>]*><\/script>/i.test(html)) {
    html = html.replace(/<script\b[^>]*analytics-loader\.js[^>]*><\/script>/i, `${trustLinks(language)}\n  $&`);
  } else {
    html = html.replace(/<\/body>/i, `${trustLinks(language)}</body>`);
  }
  html = html.replace(/(<span class="image-provenance">[\s\S]*?<\/span>)(?:\s*\1)+/g, '$1');

  if (rel === 'index.html' && !/class=["'][^"']*\bimage-provenance\b/.test(html)) {
    html = html.replace(
      /(<div class="hero-visual-note">[\s\S]*?<\/span>)(<\/div>)/i,
      '$1<span class="image-provenance">صورة توضيحية مُنشأة بمساعدة الذكاء الاصطناعي؛ تُؤكد فئة المركبة بشكل منفصل لكل حجز.</span>$2'
    );
  }
  if (rel === 'en/index.html' && !/class=["'][^"']*\bimage-provenance\b/.test(html)) {
    html = html.replace(
      /(<div class="hero-visual-note">[\s\S]*?<\/span>)(<\/div>)/i,
      '$1<span class="image-provenance">AI-assisted illustrative image; the vehicle category is confirmed separately for each booking.</span>$2'
    );
  }
  return html;
}

const changes = [];
const files = discover().sort();
for (const file of files) {
  const current = readFileSync(file, 'utf8');
  const expected = synchronizePage(file, current);
  if (current !== expected) {
    changes.push(toPosix(relative(root, file)));
    if (!checkOnly) writeFileSync(file, expected, 'utf8');
  }
}

const indexable = files.map((file) => {
  const rel = toPosix(relative(root, file));
  const html = checkOnly ? synchronizePage(file, readFileSync(file, 'utf8')) : readFileSync(file, 'utf8');
  const robots = attribute(html, /<meta\b[^>]*name=["']robots["'][^>]*>/i, 'content');
  return { file, rel, html, language: rel.startsWith('en/') ? 'en' : 'ar', indexable: !/\bnoindex\b/i.test(robots) };
}).filter((page) => page.indexable);

function sitemap(language) {
  const pages = indexable.filter((page) => page.language === language);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map((page) => {
    const pair = pairedRel(page.rel);
    const pairExists = indexable.some((candidate) => candidate.rel === pair);
    const arUrl = pageUrl(language === 'ar' ? page.rel : pair);
    const enUrl = pageUrl(language === 'en' ? page.rel : pair);
    return `  <url>\n    <loc>${escapeXml(pageUrl(page.rel))}</loc>\n    <lastmod>${config.last_reviewed}</lastmod>${pairExists ? `\n    <xhtml:link rel="alternate" hreflang="ar-BH" href="${escapeXml(arUrl)}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(arUrl)}"/>` : ''}\n  </url>`;
  }).join('\n')}\n</urlset>\n`;
}

const generated = new Map([
  ['sitemap-gcc-transport.xml', sitemap('ar')],
  ['sitemap-gcc-transport-en.xml', sitemap('en')],
  ['sitemap-index.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${config.site_origin}${config.site_path}sitemap-gcc-transport.xml</loc><lastmod>${config.last_reviewed}</lastmod></sitemap>\n  <sitemap><loc>${config.site_origin}${config.site_path}sitemap-gcc-transport-en.xml</loc><lastmod>${config.last_reviewed}</lastmod></sitemap>\n</sitemapindex>\n`]
]);
for (const [name, expected] of generated) {
  const path = join(root, name);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (current !== expected) {
    changes.push(name);
    if (!checkOnly) writeFileSync(path, expected, 'utf8');
  }
}

console.log(JSON.stringify({
  mode: checkOnly ? 'check' : 'write',
  public_pages: files.length,
  indexable_pages: indexable.length,
  arabic_indexable: indexable.filter((page) => page.language === 'ar').length,
  english_indexable: indexable.filter((page) => page.language === 'en').length,
  changed_files: changes.length,
  files: changes
}, null, 2));
if (checkOnly && changes.length) process.exitCode = 1;
