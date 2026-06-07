#!/usr/bin/env node
/**
 * Read-only SEO / traffic diagnostic for getvendora.net (no site edits).
 * Run: node scripts/seo-traffic-diagnostic.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const outDir = join(root, 'tests');
const LIVE = 'https://getvendora.net';

const SKIP = new Set(['node_modules', '.git', '.wrangler', 'backups', 'test-results', '_site', 'zip', 'demo']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP.has(name)) continue;
      walk(full, out);
      continue;
    }
    if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function extractTag(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function pagePath(rel) {
  let p = rel.split(sep).join('/');
  if (p.endsWith('/index.html')) p = p.slice(0, -10) + '/';
  else if (p === 'index.html') p = '/';
  return '/' + p.replace(/^\/+/, '');
}

function countSitemapUrls(file) {
  try {
    const xml = readFileSync(file, 'utf8');
    return (xml.match(/<loc>/g) || []).length;
  } catch {
    return 0;
  }
}

const files = walk(root);
const gccPages = [];
const toolPages = [];
const issues = [];

for (const abs of files) {
  const rel = relative(root, abs);
  if (rel.includes(`${sep}backups${sep}`)) continue;
  let html = '';
  try { html = readFileSync(abs, 'utf8'); } catch { continue; }

  const robots = extractTag(html, /name=["']robots["'][^>]+content=["']([^"']+)/i);
  const noindex = /noindex/i.test(robots);
  const canonical = extractTag(html, /rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  const title = extractTag(html, /<title>([^<]+)/i);
  const h1 = extractTag(html, /<h1[^>]*>([^<]+)/i);
  const desc = extractTag(html, /name=["']description["'][^>]+content=["']([^"']+)/i);
  const gaLoader = /analytics-loader\.js/i.test(html);
  const inlineGa = /googletagmanager\.com\/gtag\/js/i.test(html);
  const gaId = /G-DFY197R2MS/.test(html) || gaLoader;
  const path = pagePath(rel);

  const row = { path, file: rel.split(sep).join('/'), title, h1, desc: desc.slice(0, 120), noindex, canonical, gaLoader, inlineGa, hasGa: gaLoader || inlineGa || gaId };

  if (path.includes('/bahrain-saudi-gcc-transport/')) {
    gccPages.push(row);
    if (!noindex && !row.hasGa && !path.includes('/admin')) {
      issues.push({ type: 'gcc_missing_ga', path });
    }
  } else if (path.includes('/calculator/') || path.includes('/calculators/') || path.includes('/tools/')) {
    toolPages.push(row);
  }

  if (!noindex && !path.includes('/admin') && !path.includes('/care') && !path.includes('/demo') && !row.hasGa) {
    issues.push({ type: 'public_missing_ga', path });
  }
}

const sitemapCounts = {
  main: countSitemapUrls(join(root, 'sitemap.xml')),
  tools: countSitemapUrls(join(root, 'sitemap-tools.xml')),
  gccAr: countSitemapUrls(join(root, 'bahrain-saudi-gcc-transport', 'sitemap-gcc-transport.xml')),
  gccEn: countSitemapUrls(join(root, 'bahrain-saudi-gcc-transport', 'sitemap-gcc-transport-en.xml')),
};

async function fetchLive(path) {
  const url = `${LIVE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      redirect: 'follow',
    });
    const text = await res.text();
    return {
      url,
      status: res.status,
      ok: res.ok,
      robots: extractTag(text, /name=["']robots["'][^>]+content=["']([^"']+)/i),
      hasGa: /G-DFY197R2MS|analytics-loader/.test(text),
    };
  } catch (e) {
    return { url, error: e.message };
  }
}

const sampleLive = await Promise.all([
  fetchLive('/'),
  fetchLive('/bahrain-saudi-gcc-transport/'),
  fetchLive('/bahrain-saudi-gcc-transport/bahrain-to-dammam/'),
  fetchLive('/calculator/finance/cagr-calculator/'),
  fetchLive('/robots.txt'),
]);

let adminSummary = null;
try {
  const token = process.env.TRANSPORT_ADMIN_TOKEN || '33404044';
  const res = await fetch(`${LIVE}/api/transport/admin?resource=summary`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.ok) adminSummary = await res.json();
} catch {}

const gccIndexable = gccPages.filter((p) => !p.noindex && !p.path.includes('/admin') && !p.path.includes('/care'));
const gccNoindex = gccPages.filter((p) => p.noindex);

const keywordThemes = {};
for (const p of gccIndexable) {
  const key = (p.h1 || p.title || '').slice(0, 80);
  if (key) keywordThemes[key] = (keywordThemes[key] || 0) + 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  domain: 'getvendora.net',
  sitemapCounts,
  totalGccHtmlPages: gccPages.length,
  gccIndexablePages: gccIndexable.length,
  gccNoindexPages: gccNoindex.length,
  totalToolHtmlPages: toolPages.length,
  toolIndexablePages: toolPages.filter((p) => !p.noindex).length,
  technicalIssues: issues,
  liveSampleChecks: sampleLive,
  transportAnalytics: adminSummary?.summary
    ? {
        totalPageviews: adminSummary.summary.total_pageviews,
        pageviewsToday: adminSummary.summary.pageviews_today,
        totalVisitors: adminSummary.summary.total_visitors,
        whatsappLeads: adminSummary.summary.total,
        bySource: adminSummary.summary.by_source,
        topPages: adminSummary.summary.top_pages?.slice(0, 15),
      }
    : null,
  gccSamplePages: gccIndexable.slice(0, 20).map((p) => ({ path: p.path, title: p.title, h1: p.h1 })),
};

mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'seo-traffic-diagnostic.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, ...report, gccSamplePages: undefined, transportAnalytics: report.transportAnalytics }, null, 2));
