/**
 * Google Analytics GA4 audit core — scans all HTML under public/.
 * Used by scripts/google-analytics-audit.mjs and Playwright e2e tests.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const REQUIRED_GA4_ID = 'G-DFY197R2MS';

export const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.wrangler',
  'test-results',
  'playwright-report',
  'zip',
  'backups',
  'demo',
]);

const FRAGMENT_PATTERNS = [
  /\.inc\.html$/i,
  /-fragment\.html$/i,
  /-partial\.html$/i,
  /-include\.html$/i,
];

export function walkHtml(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
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

export function fileToPath(relFile) {
  let rel = relFile.split(sep).join('/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -('/index.html'.length)) + '/';
  else if (rel === 'index.html') rel = '';
  else if (rel.endsWith('index.html')) rel = rel.replace(/index\.html$/, '');
  return '/' + rel.replace(/^\/+/, '');
}

export function toUrl(baseUrl, pagePath) {
  const clean = pagePath === '/' ? '' : pagePath.replace(/^\//, '');
  return `${baseUrl.replace(/\/$/, '')}/${clean}`.replace(/([^:]\/)\/+/g, '$1');
}

function extractGaIds(content) {
  const ids = new Set();
  const re = /G-[A-Z0-9]{6,12}/g;
  let m;
  while ((m = re.exec(content)) !== null) ids.add(m[0]);
  return [...ids];
}

function hasNoindex(content) {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(content);
}

function isFullDocument(content) {
  return /<!doctype\s+html/i.test(content) || /<html[\s>]/i.test(content);
}

function classifyFragment(relFile, content) {
  const base = relFile.split(/[/\\]/).pop() || '';
  if (FRAGMENT_PATTERNS.some((re) => re.test(base))) return true;
  if (!isFullDocument(content)) return true;
  if (/^\s*<(tbody|tr|td|thead|tfoot|div|section|article|main|header|footer|nav|ul|ol|li)\b/i.test(content.trim())) {
    return true;
  }
  return false;
}

export function analyzePage({ relFile, content, baseUrl }) {
  const pagePath = fileToPath(relFile);
  const url = toUrl(baseUrl, pagePath);
  const gaIds = extractGaIds(content);

  const isSiteDuplicate = relFile.split(sep).includes('_site');
  const isFragment = classifyFragment(relFile, content);
  const isNoindex = hasNoindex(content);
  const isAdmin = /\/admin(\/|$)/.test(pagePath);
  const isCare = /\/bahrain-saudi-gcc-transport\/care(\/|$)/.test(pagePath);
  const isTestPage = /\/(ai-chat-test|test-results)(\/|$)/.test(pagePath);
  const isPrivate = isAdmin || isCare;

  const hasAnalyticsLoader = /analytics-loader\.js/i.test(content);
  const hasInlineGtagScript = /googletagmanager\.com\/gtag\/js/i.test(content);
  const hasGtagFn = /(?:window\.)?gtag\s*=|function\s+gtag\s*\(/i.test(content);
  const hasGaMeta = /meta[^>]+name=["']ga4-measurement-id["']/i.test(content);
  const hasGa4Var = /__GA4_MEASUREMENT_ID__/i.test(content);

  const hasGoogleAnalytics = hasAnalyticsLoader || hasInlineGtagScript || hasGtagFn || hasGaMeta || hasGa4Var;
  const hasRequiredGa4Id =
    gaIds.includes(REQUIRED_GA4_ID) ||
    hasAnalyticsLoader ||
    hasGa4Var ||
    (hasGaMeta && content.includes(REQUIRED_GA4_ID));

  const wrongGaIds = gaIds.filter((id) => id !== REQUIRED_GA4_ID);
  const hasWrongGa4Id = wrongGaIds.length > 0;

  const usesInlineGtagOnly = (hasInlineGtagScript || hasGtagFn) && !hasAnalyticsLoader;
  const usesAnalyticsLoader = hasAnalyticsLoader;

  const isRealPublicPage =
    !isFragment &&
    !isSiteDuplicate &&
    isFullDocument(content) &&
    !isPrivate;

  const needsGaFix =
    isRealPublicPage &&
    !isNoindex &&
    !isTestPage &&
    (!hasGoogleAnalytics || !hasRequiredGa4Id || hasWrongGa4Id);

  return {
    file: relFile.split(sep).join('/'),
    pagePath,
    url,
    classification: isFragment
      ? 'fragment'
      : isSiteDuplicate
        ? '_site_duplicate'
        : isPrivate
          ? 'private'
          : isTestPage
            ? 'test'
            : 'real_public',
    isFragment,
    isSiteDuplicate,
    isNoindex,
    isAdmin,
    isCare,
    isTestPage,
    isPrivate,
    isRealPublicPage,
    hasGoogleAnalytics,
    hasRequiredGa4Id,
    hasWrongGa4Id,
    wrongGaIds,
    gaIdsFound: gaIds,
    hasAnalyticsLoader,
    hasInlineGtagScript,
    hasGtagFn,
    hasGaMeta,
    usesInlineGtagOnly,
    usesAnalyticsLoader,
    needsGaFix,
    httpStatus: null,
    httpOk: null,
    httpError: null,
    localHttpStatus: null,
    localHttpOk: null,
    consoleAnalyticsErrors: [],
  };
}

export async function fetchStatus(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    return { status: res.status, ok: res.ok, error: null };
  } catch (e) {
    clearTimeout(timer);
    return { status: 0, ok: false, error: e.message || String(e) };
  }
}

export async function scanAllPages({
  publicRoot,
  liveBaseUrl = 'https://getvendora.net',
  localBaseUrl = null,
  checkLiveHttp = true,
  checkLocalHttp = false,
  concurrency = 20,
}) {
  const files = walkHtml(publicRoot);
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < files.length) {
      const i = idx++;
      const abs = files[i];
      const relFile = relative(publicRoot, abs);
      let content = '';
      try {
        content = readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      const page = analyzePage({ relFile, content, baseUrl: liveBaseUrl });

      if (checkLiveHttp && !page.isFragment) {
        const http = await fetchStatus(page.url);
        page.httpStatus = http.status;
        page.httpOk = http.ok;
        page.httpError = http.error;
      }

      if (checkLocalHttp && localBaseUrl && !page.isFragment) {
        const localUrl = toUrl(localBaseUrl, page.pagePath);
        const http = await fetchStatus(localUrl);
        page.localHttpStatus = http.status;
        page.localHttpOk = http.ok;
      }

      results.push(page);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  results.sort((a, b) => a.pagePath.localeCompare(b.pagePath));
  return results;
}

export function buildSummary(pages, meta = {}) {
  const realPublic = pages.filter((p) => p.isRealPublicPage);
  const withGa4 = pages.filter((p) => p.hasGoogleAnalytics && p.hasRequiredGa4Id && !p.hasWrongGa4Id);
  const missingGa4 = pages.filter((p) => p.isRealPublicPage && !p.isNoindex && !p.isTestPage && !p.hasGoogleAnalytics);
  const needsFix = pages.filter((p) => p.needsGaFix);
  const inlineOnly = pages.filter((p) => p.usesInlineGtagOnly && p.isRealPublicPage && !p.isNoindex);
  const loaderPages = pages.filter((p) => p.usesAnalyticsLoader);
  const noindexPages = pages.filter((p) => p.isNoindex);
  const fragments = pages.filter((p) => p.isFragment);
  const siteDupes = pages.filter((p) => p.isSiteDuplicate);
  const wrongId = pages.filter((p) => p.hasWrongGa4Id);

  return {
    generatedAt: new Date().toISOString(),
    requiredGa4Id: REQUIRED_GA4_ID,
    ...meta,
    totalHtmlPages: pages.length,
    totalRealPublicPages: realPublic.length,
    pagesWithGa4: withGa4.length,
    pagesMissingGa4: missingGa4.length,
    pagesUsingAnalyticsLoader: loaderPages.length,
    pagesUsingInlineGtagOnly: inlineOnly.length,
    pagesNoindex: noindexPages.length,
    pagesFragmentIgnored: fragments.length,
    pagesSiteDuplicateIgnored: siteDupes.length,
    realPublicNeedsFixing: needsFix.length,
    pagesWithWrongGa4Id: wrongId.length,
    lists: {
      missingGa4RealPublic: missingGa4.map((p) => ({ pagePath: p.pagePath, url: p.url, file: p.file })),
      inlineGtagRealPublic: inlineOnly.map((p) => ({ pagePath: p.pagePath, url: p.url, file: p.file })),
      realPublicNeedsFixing: needsFix.map((p) => ({
        pagePath: p.pagePath,
        url: p.url,
        file: p.file,
        reason: !p.hasGoogleAnalytics
          ? 'missing_ga'
          : p.hasWrongGa4Id
            ? 'wrong_ga_id'
            : 'missing_required_ga4_id',
        wrongGaIds: p.wrongGaIds,
      })),
      wrongGa4IdPages: wrongId.map((p) => ({
        pagePath: p.pagePath,
        url: p.url,
        file: p.file,
        gaIdsFound: p.gaIdsFound,
        wrongGaIds: p.wrongGaIds,
      })),
      noindexPages: noindexPages.map((p) => ({ pagePath: p.pagePath, url: p.url, file: p.file })),
      fragmentsIgnored: fragments.map((p) => ({ pagePath: p.pagePath, file: p.file })),
      siteDuplicatesIgnored: siteDupes.map((p) => ({ pagePath: p.pagePath, url: p.url, file: p.file })),
    },
  };
}

export function renderSummaryMarkdown(summary, pages) {
  const lines = [];
  lines.push('# Google Analytics GA4 Audit Summary');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Required GA4 ID: \`${summary.requiredGa4Id}\``);
  if (summary.liveBaseUrl) lines.push(`Live base URL: ${summary.liveBaseUrl}`);
  if (summary.localBaseUrl) lines.push(`Local base URL: ${summary.localBaseUrl}`);
  if (summary.playwrightConsoleChecks != null) {
    lines.push(`Playwright console checks run: ${summary.playwrightConsoleChecks}`);
  }
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total HTML pages checked | ${summary.totalHtmlPages} |`);
  lines.push(`| Real public pages | ${summary.totalRealPublicPages} |`);
  lines.push(`| Pages with GA4 (correct ID) | ${summary.pagesWithGa4} |`);
  lines.push(`| Real public pages missing GA4 | ${summary.pagesMissingGa4} |`);
  lines.push(`| Pages using analytics-loader.js | ${summary.pagesUsingAnalyticsLoader} |`);
  lines.push(`| Real public pages using inline gtag only | ${summary.pagesUsingInlineGtagOnly} |`);
  lines.push(`| Pages with noindex | ${summary.pagesNoindex} |`);
  lines.push(`| Fragments/includes ignored | ${summary.pagesFragmentIgnored} |`);
  lines.push(`| _site duplicate folder ignored | ${summary.pagesSiteDuplicateIgnored} |`);
  lines.push(`| **Real public pages needing fix** | **${summary.realPublicNeedsFixing}** |`);
  lines.push(`| Pages with wrong GA4 ID | ${summary.pagesWithWrongGa4Id} |`);
  lines.push('');

  const http404 = pages.filter((p) => p.httpStatus === 404 && p.isRealPublicPage);
  if (http404.length) {
    lines.push('## Live HTTP 404 (real public pages)');
    lines.push('');
    http404.forEach((p) => lines.push(`- \`${p.pagePath}\` — ${p.url}`));
    lines.push('');
  }

  lines.push('## Real public pages missing Google Analytics');
  lines.push('');
  if (summary.lists.missingGa4RealPublic.length === 0) {
    lines.push('_None._');
  } else {
    summary.lists.missingGa4RealPublic.forEach((p) => lines.push(`- \`${p.pagePath}\` — ${p.url}`));
  }
  lines.push('');

  lines.push('## Real public pages using inline gtag (not analytics-loader.js)');
  lines.push('');
  if (summary.lists.inlineGtagRealPublic.length === 0) {
    lines.push('_None._');
  } else {
    summary.lists.inlineGtagRealPublic.forEach((p) => lines.push(`- \`${p.pagePath}\` — ${p.url}`));
  }
  lines.push('');

  lines.push('## Real public pages that need fixing (urgent)');
  lines.push('');
  if (summary.lists.realPublicNeedsFixing.length === 0) {
    lines.push('_None — all real indexable public pages have GA4._');
  } else {
    summary.lists.realPublicNeedsFixing.forEach((p) => {
      lines.push(`- \`${p.pagePath}\` — ${p.url} (${p.reason}${p.wrongGaIds?.length ? `: ${p.wrongGaIds.join(', ')}` : ''})`);
    });
  }
  lines.push('');

  lines.push('## Pages with wrong GA4 measurement ID');
  lines.push('');
  if (summary.lists.wrongGa4IdPages.length === 0) {
    lines.push('_None._');
  } else {
    summary.lists.wrongGa4IdPages.forEach((p) => {
      lines.push(`- \`${p.pagePath}\` — found: ${p.gaIdsFound.join(', ') || 'none'}, wrong: ${p.wrongGaIds.join(', ')}`);
    });
  }
  lines.push('');

  lines.push('## Ignored: fragments / includes');
  lines.push('');
  summary.lists.fragmentsIgnored.forEach((p) => lines.push(`- \`${p.file}\``));
  lines.push('');

  lines.push('## Ignored: _site duplicates (not urgent unless deployed separately)');
  lines.push('');
  lines.push(`_${summary.pagesSiteDuplicateIgnored} pages under \`_site/\` — see JSON report for full list._`);
  lines.push('');

  lines.push('## Ignored: noindex / private (not urgent)');
  lines.push('');
  const privateNoindex = pages.filter((p) => (p.isNoindex || p.isPrivate) && !p.isFragment && !p.isSiteDuplicate);
  privateNoindex.forEach((p) => {
    const tags = [p.isNoindex ? 'noindex' : null, p.isAdmin ? 'admin' : null, p.isCare ? 'care' : null]
      .filter(Boolean)
      .join(', ');
    lines.push(`- \`${p.pagePath}\` (${tags}) — GA: ${p.hasGoogleAnalytics ? 'yes' : 'no'}`);
  });
  lines.push('');

  const consoleIssues = pages.filter((p) => p.consoleAnalyticsErrors?.length);
  if (consoleIssues.length) {
    lines.push('## Playwright console errors (analytics-related)');
    lines.push('');
    consoleIssues.forEach((p) => {
      lines.push(`### \`${p.pagePath}\``);
      p.consoleAnalyticsErrors.forEach((e) => lines.push(`- ${e}`));
      lines.push('');
    });
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- Pages using `analytics-loader.js` load GA4 (`G-DFY197R2MS`) at runtime even if inline gtag is absent.');
  lines.push('- Care and admin pages are private/noindex and are not counted as urgent GA gaps.');
  lines.push('- `_site/` mirrors are legacy build output; canonical live URLs are outside `_site/`.');
  lines.push('');

  return lines.join('\n');
}

export function writeReports({ publicRoot, pages, summary, reportJsonPath, summaryMdPath }) {
  mkdirSync(join(reportJsonPath, '..'), { recursive: true });
  const report = { summary, pages };
  writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
  writeFileSync(summaryMdPath, renderSummaryMarkdown(summary, pages));
  return { reportJsonPath, summaryMdPath };
}

export function getPublicRootFromModule(metaUrl) {
  return join(metaUrl, '..', '..');
}
