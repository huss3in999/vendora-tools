import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteBase = 'https://getvendora.net/bahrain-saudi-gcc-transport/';
const excludedRoots = new Set(['admin', 'ai-chat-test', 'functions', 'node_modules', 'scratch', 'test-results', 'tests']);
const excludedSegments = new Set(['src', 'content', 'data', 'planning', 'qa', 'references', 'research', 'seo']);

function walk(directory, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    const rel = relative(root, full).split(sep).join('/');
    const segments = rel.split('/');
    if (entry.isDirectory()) {
      if (excludedRoots.has(segments[0])) continue;
      if (segments[0] === 'gcc-private-transport-guide' && segments.slice(1).some((part) => excludedSegments.has(part))) continue;
      walk(full, found);
    } else if (entry.name.toLowerCase() === 'index.html') {
      found.push(full);
    }
  }
  return found;
}

function attr(html, selectorPattern, name) {
  const tag = html.match(selectorPattern)?.[0] || '';
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] || '';
}

function textMatch(html, pattern) {
  return (html.match(pattern)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageUrl(rel) {
  const folder = rel.replace(/index\.html$/i, '').replace(/\\/g, '/');
  return new URL(folder, siteBase).href;
}

function pairRel(rel) {
  if (rel === 'index.html') return 'en/index.html';
  if (rel.startsWith('en/')) return rel.slice(3);
  if (rel === 'care/index.html') return 'care/en/index.html';
  if (rel === 'care/en/index.html') return 'care/index.html';
  return `en/${rel}`;
}

function localTarget(rel, raw) {
  const clean = raw.split(/[?#]/)[0];
  if (!clean || clean.startsWith('#') || /^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(clean)) return null;
  let target;
  if (clean.startsWith('/bahrain-saudi-gcc-transport/')) target = join(root, clean.slice('/bahrain-saudi-gcc-transport/'.length));
  else if (clean.startsWith('/')) return null;
  else target = resolve(dirname(join(root, rel)), clean);
  if (clean.endsWith('/')) target = join(target, 'index.html');
  return target;
}

const sitemapFiles = ['sitemap-gcc-transport.xml', 'sitemap-gcc-transport-en.xml'];
const sitemapUrls = new Map();
for (const file of sitemapFiles) {
  const xml = readFileSync(join(root, file), 'utf8');
  sitemapUrls.set(file, [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim()));
}
const allSitemapUrls = [...sitemapUrls.values()].flat();

const files = walk(root).sort();
const relFiles = new Set(files.map((file) => relative(root, file).split(sep).join('/')));
const pages = [];

for (const file of files) {
  const rel = relative(root, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || '';
  const lang = attr(htmlTag, /<html\b[^>]*>/i, 'lang').toLowerCase();
  const dir = attr(htmlTag, /<html\b[^>]*>/i, 'dir').toLowerCase();
  const title = textMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = attr(html, /<meta\b[^>]*name=["']description["'][^>]*>/i, 'content');
  const canonical = attr(html, /<link\b[^>]*rel=["']canonical["'][^>]*>/i, 'href');
  const robots = attr(html, /<meta\b[^>]*name=["']robots["'][^>]*>/i, 'content');
  const indexable = !/\bnoindex\b/i.test(robots);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  const visible = visibleText(html);
  const intendedLanguage = rel.startsWith('en/') || rel === 'care/en/index.html' ? 'en' : 'ar';
  const alternates = Object.fromEntries([...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*>/gi)].map((match) => [match[1], attr(match[0], /<link\b[^>]*>/i, 'href')]));
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const sources = [...html.matchAll(/<(?:img|script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]);
  const brokenLinks = links.map((url) => ({ url, target: localTarget(rel, url) })).filter((item) => item.target && !existsSync(item.target)).map((item) => item.url);
  const brokenAssets = sources.map((url) => ({ url, target: localTarget(rel, url) })).filter((item) => item.target && !existsSync(item.target)).map((item) => item.url);
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
  const invalidSchema = jsonLd.map((value, index) => { try { JSON.parse(value); return null; } catch (error) { return { index, error: error.message }; } }).filter(Boolean);
  const waNumbers = [...html.matchAll(/(?:wa\.me\/|phoneNumber["']?\s*[:=]\s*["']?)(\+?\d{8,15})/gi)].map((match) => match[1].replace(/\D/g, ''));
  const pair = pairRel(rel);
  const expected = pageUrl(rel);
  const sitemapCount = allSitemapUrls.filter((url) => url === expected).length;
  const issues = [];
  const add = (severity, code, detail) => issues.push({ severity, code, detail });

  if (!['ar', 'ar-bh', 'en'].includes(lang)) add('critical', 'invalid-lang', lang || 'missing');
  if ((intendedLanguage === 'en' && dir !== 'ltr') || (intendedLanguage === 'ar' && dir !== 'rtl')) add('critical', 'invalid-direction', dir || 'missing');
  if (!title || title.length < 20) add('high', 'weak-title', title || 'missing');
  if (!description || description.length < 70) add('high', 'weak-description', description || 'missing');
  if (h1s.length !== 1 || (h1s[0] || '').length < 12) add('high', 'invalid-h1', `${h1s.length}: ${h1s.join(' | ')}`);
  if (indexable && canonical !== expected) add('critical', 'canonical-mismatch', `${canonical || 'missing'} != ${expected}`);
  if (indexable && sitemapCount !== 1) add('high', sitemapCount ? 'duplicate-sitemap-entry' : 'missing-from-sitemap', `${sitemapCount}`);
  if (indexable && relFiles.has(pair)) {
    const arExpected = intendedLanguage === 'ar' ? expected : pageUrl(pair);
    const enExpected = intendedLanguage === 'en' ? expected : pageUrl(pair);
    const arAlt = alternates['ar-BH'] || alternates.ar || '';
    if (arAlt !== arExpected) add('high', 'arabic-hreflang-mismatch', `${arAlt || 'missing'} != ${arExpected}`);
    if (alternates.en !== enExpected) add('high', 'english-hreflang-mismatch', `${alternates.en || 'missing'} != ${enExpected}`);
  }
  if (indexable && !relFiles.has(pair)) add('medium', 'missing-language-pair', pair);
  if (brokenLinks.length) add('critical', 'broken-links', brokenLinks.join(', '));
  if (brokenAssets.length) add('critical', 'broken-assets', brokenAssets.join(', '));
  if (invalidSchema.length) add('critical', 'invalid-jsonld', JSON.stringify(invalidSchema));
  if (jsonLd.some((value) => /AggregateRating|"@type"\s*:\s*"Review"/i.test(value))) add('high', 'unsupported-rating-schema', 'rating/review schema present');
  if (intendedLanguage === 'en' && /[\u0600-\u06ff]/.test(visible)) add('high', 'visible-arabic-on-english', visible.match(/[\u0600-\u06ff].{0,40}/)?.[0] || 'Arabic characters found');
  if (/هل الصفحات|يجب حذفها|developer|TODO|PLACEHOLDER|lorem ipsum|internal SEO|owner should/i.test(visible)) add('high', 'internal-or-placeholder-copy', 'developer/placeholder marker found');
  if (/Ã|Â|Ø[\u0080-\u00ff]|Ù[\u0080-\u00ff]|â€|ï¿½|�/.test(html)) add('critical', 'mojibake', 'encoding marker found');
  if (waNumbers.some((number) => number !== '97333225954')) add('critical', 'whatsapp-number-mismatch', [...new Set(waNumbers)].join(', '));
  if (!attr(html, /<meta\b[^>]*property=["']og:title["'][^>]*>/i, 'content') && indexable) add('medium', 'missing-og-title', '');
  if (!attr(html, /<meta\b[^>]*property=["']og:description["'][^>]*>/i, 'content') && indexable) add('medium', 'missing-og-description', '');
  if (!attr(html, /<meta\b[^>]*property=["']og:url["'][^>]*>/i, 'content') && indexable) add('medium', 'missing-og-url', '');
  if (!attr(html, /<meta\b[^>]*name=["']twitter:card["'][^>]*>/i, 'content') && indexable) add('low', 'missing-twitter-card', '');

  pages.push({
    file: rel, intendedLanguage, lang, dir, indexable, pair, pairExists: relFiles.has(pair),
    title, description, h1s, canonical, expectedCanonical: expected, alternates, robots,
    sitemapCount, brokenLinks, brokenAssets, schemaBlocks: jsonLd.length, invalidSchema,
    waNumbers: [...new Set(waNumbers)], visibleCharacters: visible.length, issues,
  });
}

for (const field of ['title', 'description']) {
  const groups = new Map();
  for (const page of pages.filter((item) => item.indexable)) {
    const value = page[field].trim().toLowerCase();
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(page.file);
  }
  for (const filesWithDuplicate of groups.values()) {
    if (filesWithDuplicate.length < 2) continue;
    for (const file of filesWithDuplicate) {
      pages.find((page) => page.file === file).issues.push({ severity: 'high', code: `duplicate-${field}`, detail: filesWithDuplicate.join(', ') });
    }
  }
}

const counts = {
  total: pages.length,
  arabic: pages.filter((page) => page.intendedLanguage === 'ar').length,
  english: pages.filter((page) => page.intendedLanguage === 'en').length,
  indexable: pages.filter((page) => page.indexable).length,
  noindex: pages.filter((page) => !page.indexable).length,
  missingArabicPairs: pages.filter((page) => page.intendedLanguage === 'en' && !page.pairExists && page.indexable).map((page) => page.file),
  missingEnglishPairs: pages.filter((page) => page.intendedLanguage === 'ar' && !page.pairExists && page.indexable).map((page) => page.file),
  bySeverity: Object.fromEntries(['critical', 'high', 'medium', 'low'].map((severity) => [severity, pages.reduce((sum, page) => sum + page.issues.filter((issue) => issue.severity === severity).length, 0)])),
  pagesWithIssues: pages.filter((page) => page.issues.length).length,
  pagesWithoutIssues: pages.filter((page) => !page.issues.length).length,
};

const report = { generatedAt: new Date().toISOString(), root, scope: { excludedRoots: [...excludedRoots], excludedInternalGuideSegments: [...excludedSegments] }, counts, sitemapFiles: Object.fromEntries(sitemapUrls), pages };
writeFileSync(join(root, 'full-site-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(counts, null, 2));
for (const severity of ['critical', 'high', 'medium', 'low']) {
  const hits = pages.flatMap((page) => page.issues.filter((issue) => issue.severity === severity).map((issue) => `${page.file}\t${issue.code}\t${issue.detail}`));
  console.log(`\n${severity.toUpperCase()} (${hits.length})`);
  hits.forEach((line) => console.log(line));
}
