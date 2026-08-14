import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(root, '..');
const config = JSON.parse(readFileSync(join(root, 'config', 'search-discovery.json'), 'utf8'));
const excludedRoots = new Set(['admin', 'ai-chat-test', 'functions', 'node_modules', 'scratch', 'test-results', 'tests', 'templates']);
const excludedGuideSegments = new Set(['src', 'content', 'data', 'planning', 'qa', 'references', 'research', 'seo']);
const toPosix = (value) => value.split(sep).join('/');
const errors = [];
const pages = [];
const requireValue = (condition, message) => { if (!condition) errors.push(message); };

function discover(directory = root) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    const rel = toPosix(relative(root, full));
    const segments = rel.split('/');
    if (entry.isDirectory()) {
      if (excludedRoots.has(segments[0])) continue;
      if (segments[0] === 'gcc-private-transport-guide' && segments.slice(1).some((part) => excludedGuideSegments.has(part))) continue;
      discover(full);
    } else if (entry.name.toLowerCase() === 'index.html') {
      pages.push({ file: full, rel, html: readFileSync(full, 'utf8') });
    }
  }
}

function attr(html, pattern, name) {
  const tag = html.match(pattern)?.[0] || '';
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] || '';
}

function visibleText(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pageUrl(rel) {
  return new URL(rel.replace(/index\.html$/i, ''), `${config.site_origin}${config.site_path}`).href;
}

function pairedRel(rel) {
  if (rel === 'index.html') return 'en/index.html';
  return rel.startsWith('en/') ? rel.slice(3) : `en/${rel}`;
}

function tags(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[0]);
}

discover();
const expected = new Set();
const titles = new Map();
const descriptions = new Map();
for (const page of pages) {
  const language = attr(page.html, /<html\b[^>]*>/i, 'lang');
  const isEnglish = language === 'en';
  const direction = attr(page.html, /<html\b[^>]*>/i, 'dir');
  const robots = attr(page.html, /<meta\b[^>]*name=["']robots["'][^>]*>/i, 'content');
  const indexable = !/\bnoindex\b/i.test(robots);
  const title = (page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const description = attr(page.html, /<meta\b[^>]*name=["']description["'][^>]*>/i, 'content');
  const canonicalTags = tags(page.html, /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi);
  const canonical = attr(canonicalTags[0] || '', /<link\b[^>]*>/i, 'href');
  const url = pageUrl(page.rel);
  const visible = visibleText(page.html);
  requireValue(direction === (isEnglish ? 'ltr' : 'rtl'), `Direction mismatch: ${page.rel}`);
  if (isEnglish) requireValue(!/[\u0600-\u06ff]/.test(visible), `Visible Arabic on English page: ${page.rel}`);
  else requireValue(!/\b(?:Home|Contact|About|Book Now|English version|Route Details)\b/.test(visible), `Visible English UI copy on Arabic page: ${page.rel}`);
  requireValue(!/\b(?:GetVendora|Vendora Bahrain GCC Transport)\b/.test(visible), `Legacy entity name: ${page.rel}`);
  requireValue(!/(?:same design|same visual style|نفس التصميم|نفس النسق البصري)/i.test(visible), `Generic template wording: ${page.rel}`);
  if (indexable) {
    requireValue(/<script\b[^>]*type=["']application\/ld\+json["']/i.test(page.html), `Missing structured data: ${page.rel}`);
    requireValue(/data-vendora-transport-analytics/.test(page.html) && /data-vendora-analytics-loader/.test(page.html), `Missing analytics coverage: ${page.rel}`);
    requireValue(/class=["'][^"']*\bdiscovery-trust-links\b/.test(page.html), `Missing trust internal links: ${page.rel}`);
    expected.add(url);
    requireValue(canonicalTags.length === 1, `Expected one canonical tag: ${page.rel}`);
    requireValue(canonical === url, `Canonical mismatch: ${page.rel}`);
    const pair = pairedRel(page.rel);
    const pairPage = pages.find((candidate) => candidate.rel === pair);
    if (pairPage) {
      const arUrl = pageUrl(isEnglish ? pair : page.rel);
      const enUrl = pageUrl(isEnglish ? page.rel : pair);
      const alternateTags = tags(page.html, /<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["'])[^>]*>/gi);
      const alternates = new Map();
      for (const tag of alternateTags) {
        const hreflang = attr(tag, /<link\b[^>]*>/i, 'hreflang');
        const href = attr(tag, /<link\b[^>]*>/i, 'href');
        requireValue(!alternates.has(hreflang), `Duplicate hreflang ${hreflang}: ${page.rel}`);
        alternates.set(hreflang, href);
      }
      requireValue(alternateTags.length === 3, `Expected three hreflang tags: ${page.rel}`);
      requireValue(alternates.get('ar-BH') === arUrl, `Arabic hreflang mismatch: ${page.rel}`);
      requireValue(alternates.get('en') === enUrl, `English hreflang mismatch: ${page.rel}`);
      requireValue(alternates.get('x-default') === arUrl, `x-default hreflang mismatch: ${page.rel}`);
    }
    requireValue(/property=["']og:title["']/i.test(page.html) && /property=["']og:description["']/i.test(page.html) && /property=["']og:url["']/i.test(page.html), `Incomplete Open Graph metadata: ${page.rel}`);
    requireValue(/name=["']twitter:card["']/i.test(page.html), `Missing Twitter card: ${page.rel}`);
    const titleKey = title.toLowerCase();
    const descriptionKey = description.toLowerCase();
    if (titles.has(titleKey)) errors.push(`Duplicate title: ${page.rel} and ${titles.get(titleKey)}`); else titles.set(titleKey, page.rel);
    if (descriptions.has(descriptionKey)) errors.push(`Duplicate description: ${page.rel} and ${descriptions.get(descriptionKey)}`); else descriptions.set(descriptionKey, page.rel);
  }
}

const sitemapUrls = new Set(['sitemap-gcc-transport.xml', 'sitemap-gcc-transport-en.xml'].flatMap((name) => (
  [...readFileSync(join(root, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
)));
requireValue(sitemapUrls.size === expected.size, `Sitemap/public inventory mismatch: ${sitemapUrls.size}/${expected.size}`);
for (const url of expected) requireValue(sitemapUrls.has(url), `Missing sitemap URL: ${url}`);
for (const url of sitemapUrls) requireValue(expected.has(url), `Non-indexable or unknown sitemap URL: ${url}`);

const robots = readFileSync(join(publicRoot, 'robots.txt'), 'utf8');
for (const crawler of ['OAI-SearchBot', 'Googlebot', 'Bingbot']) requireValue(robots.includes(`User-agent: ${crawler}`), `Missing explicit crawler group: ${crawler}`);
requireValue(robots.includes(`Sitemap: ${config.site_origin}${config.site_path}sitemap-index.xml`), 'Root robots missing transport sitemap index');
requireValue(existsSync(join(root, `${config.indexnow.key}.txt`)), 'IndexNow key file missing');
requireValue(readFileSync(join(root, `${config.indexnow.key}.txt`), 'utf8').trim() === config.indexnow.key, 'IndexNow key file mismatch');
requireValue(/chatgpt|perplexity|copilot|gemini/i.test(readFileSync(join(root, 'assets', 'analytics-loader.js'), 'utf8')), 'AI referral classification missing');
requireValue(/AI-assisted illustrative image/.test(readFileSync(join(root, 'en', 'index.html'), 'utf8')), 'English AI-image disclosure missing');
requireValue(/الذكاء الاصطناعي/.test(readFileSync(join(root, 'index.html'), 'utf8')), 'Arabic AI-image disclosure missing');

const result = {
  ok: errors.length === 0,
  public_pages: pages.length,
  indexable_pages: expected.size,
  sitemap_urls: sitemapUrls.size,
  unique_titles: titles.size,
  unique_descriptions: descriptions.size,
  errors
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
