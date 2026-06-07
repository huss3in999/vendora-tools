#!/usr/bin/env node
/**
 * Full-site tracking audit — scans public HTML pages and checks analytics/tracking markers.
 * Run: node scripts/audit-website-tracking.mjs
 * Optional: AUDIT_BASE_URL=https://getvendora.net node scripts/audit-website-tracking.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const baseUrl = (process.env.AUDIT_BASE_URL || 'https://getvendora.net').replace(/\/$/, '');
const SKIP_DIRS = new Set(['node_modules', '.git', '.wrangler', 'test-results', 'playwright-report', 'zip', 'backups', 'demo']);

function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walkHtml(full, out);
      continue;
    }
    if (!name.endsWith('.html')) continue;
    if (full.includes(`${sep}backups${sep}`) || full.includes(`${sep}test-results${sep}`)) continue;
    out.push(full);
  }
  return out;
}

function toUrl(absPath) {
  let rel = relative(root, absPath).split(sep).join('/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -('/index.html'.length)) + '/';
  else if (rel === 'index.html') rel = '';
  else if (rel.endsWith('index.html')) rel = rel.replace(/index\.html$/, '');
  return `${baseUrl}/${rel}`.replace(/([^:]\/)\/+/g, '$1');
}

function analyzeHtml(content, url) {
  const lower = content.toLowerCase();
  const isTransport = url.includes('/bahrain-saudi-gcc-transport/');
  const isCare = url.includes('/bahrain-saudi-gcc-transport/care');
  const isAdmin = url.includes('/admin');
  const isNoindex = /noindex/i.test(content);

  const hasGaMeta = /meta[^>]+name=["']ga4-measurement-id["']/i.test(content);
  const hasGaScript = /googletagmanager\.com\/gtag\/js/i.test(content);
  const hasAnalyticsLoader = /analytics-loader\.js/i.test(content);
  const hasClarityInline = /clarity\.ms\/tag\//i.test(content);
  const hasGtagFn = /window\.gtag|function gtag/i.test(content);
  const hasSiteJs = /site\.js/i.test(content);
  const hasCareJs = /care\.js/i.test(content);
  const hasWa = /data-wa-message|data-track-wa|wa\.me|floating-wa/i.test(content);

  return {
    url,
    isTransport,
    isCare,
    isAdmin,
    isNoindex,
    hasGaMeta,
    hasGaScript,
    hasAnalyticsLoader,
    hasClarityInline,
    hasGtagFn,
    hasSiteJs,
    hasCareJs,
    hasWa,
    missingGa: !isAdmin && !hasGaMeta && !hasGaScript && !hasAnalyticsLoader && !hasGtagFn,
    missingClarity: !isAdmin && !hasAnalyticsLoader && !hasClarityInline,
    transportMissingSiteJs: isTransport && !isCare && !isAdmin && !hasSiteJs,
  };
}

async function fetchStatus(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return { status: res.status, ok: res.ok };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

const files = walkHtml(root);
const results = [];
const concurrency = 20;
let idx = 0;

async function worker() {
  while (idx < files.length) {
    const i = idx++;
    const file = files[i];
    const url = toUrl(file);
    let content = '';
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    const analysis = analyzeHtml(content, url);
    const http = await fetchStatus(url);
    results.push({ ...analysis, httpStatus: http.status, httpOk: http.ok, httpError: http.error || null, file: relative(root, file) });
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  totalPages: results.length,
  http404: results.filter((r) => r.httpStatus === 404),
  httpErrors: results.filter((r) => !r.httpOk && r.httpStatus !== 0),
  missingGa: results.filter((r) => r.missingGa),
  missingClarity: results.filter((r) => r.missingClarity),
  transportMissingSiteJs: results.filter((r) => r.transportMissingSiteJs),
  adminPages: results.filter((r) => r.isAdmin),
  carePages: results.filter((r) => r.isCare),
  transportPages: results.filter((r) => r.isTransport && !r.isCare && !r.isAdmin),
};

const outPath = join(root, 'bahrain-saudi-gcc-transport', 'tests', 'audit-report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  totalPages: report.totalPages,
  http404: report.http404.length,
  httpErrors: report.httpErrors.length,
  missingGa: report.missingGa.length,
  missingClarity: report.missingClarity.length,
  transportMissingSiteJs: report.transportMissingSiteJs.length,
  reportPath: outPath,
}, null, 2));
