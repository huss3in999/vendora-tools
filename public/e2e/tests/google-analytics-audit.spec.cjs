/**
 * Playwright Google Analytics GA4 audit — full public site scan + browser console checks.
 *
 * Run from public/:
 *   npx playwright test e2e/tests/google-analytics-audit.spec.cjs --config=e2e/playwright.config.cjs
 */
const { test, expect } = require('@playwright/test');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const publicRoot = join(__dirname, '..', '..');
const corePath = join(publicRoot, 'scripts', 'lib', 'google-analytics-audit-core.mjs');
const LIVE_BASE = (process.env.AUDIT_LIVE_URL || 'https://getvendora.net').replace(/\/$/, '');
const LOCAL_BASE = 'http://127.0.0.1:4173';
const REPORT_JSON = join(publicRoot, 'tests', 'google-analytics-audit-report.json');
const REPORT_MD = join(publicRoot, 'tests', 'google-analytics-audit-summary.md');

const ANALYTICS_ERROR_RE =
  /analytics|gtag|googletagmanager|ga4|measurement id|G-[A-Z0-9]{6,12}/i;

async function loadCore() {
  return import(pathToFileURL(corePath).href);
}

test.describe.configure({ mode: 'serial' });

test('scan all HTML pages and write GA audit report', async () => {
  test.setTimeout(600_000);
  const core = await loadCore();

  const pages = await core.scanAllPages({
    publicRoot,
    liveBaseUrl: LIVE_BASE,
    localBaseUrl: LOCAL_BASE,
    checkLiveHttp: true,
    checkLocalHttp: true,
    concurrency: 25,
  });

  const summary = core.buildSummary(pages, {
    liveBaseUrl: LIVE_BASE,
    localBaseUrl: LOCAL_BASE,
    auditMode: 'playwright-static+http',
    command:
      'npx playwright test e2e/tests/google-analytics-audit.spec.cjs --config=e2e/playwright.config.cjs',
    playwrightConsoleChecks: 0,
  });

  core.writeReports({
    publicRoot,
    pages,
    summary,
    reportJsonPath: REPORT_JSON,
    summaryMdPath: REPORT_MD,
  });

  expect(summary.totalHtmlPages).toBeGreaterThan(100);
  expect(existsSync(REPORT_JSON)).toBe(true);
  expect(existsSync(REPORT_MD)).toBe(true);
});

test('Playwright browser console checks on priority pages', async ({ page }) => {
  test.setTimeout(600_000);
  test.skip(!existsSync(REPORT_JSON), 'Run scan test first');

  const core = await loadCore();
  const report = JSON.parse(readFileSync(REPORT_JSON, 'utf8'));
  const pages = report.pages;

  const priority = pages
    .filter(
      (p) =>
        p.needsGaFix ||
        p.usesInlineGtagOnly ||
        (p.isRealPublicPage && !p.isNoindex && p.hasAnalyticsLoader),
    )
    .sort((a, b) => {
      if (a.isSiteDuplicate !== b.isSiteDuplicate) return a.isSiteDuplicate ? 1 : -1;
      if (a.needsGaFix !== b.needsGaFix) return a.needsGaFix ? -1 : 1;
      if (a.usesInlineGtagOnly !== b.usesInlineGtagOnly) return a.usesInlineGtagOnly ? -1 : 1;
      return a.pagePath.localeCompare(b.pagePath);
    });

  const toCheck = [];
  const seen = new Set();
  for (const p of priority) {
    if (seen.has(p.pagePath)) continue;
    seen.add(p.pagePath);
    toCheck.push(p);
    if (toCheck.length >= 80) break;
  }

  for (const entry of toCheck) {
    const localPath = entry.pagePath.endsWith('/') ? entry.pagePath : `${entry.pagePath}/`;
    const localUrl = `${LOCAL_BASE}${localPath === '/' ? '/' : localPath}`;

    const errors = [];
    const onConsole = (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (ANALYTICS_ERROR_RE.test(text)) errors.push(text);
    };
    const onPageError = (err) => {
      const text = err.message || String(err);
      if (ANALYTICS_ERROR_RE.test(text)) errors.push(text);
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    try {
      const res = await page.goto(localUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (res && !res.ok()) {
        errors.push(`HTTP ${res.status()} for ${localUrl}`);
      }
      await page.waitForTimeout(1200);

      const runtime = await page.evaluate((requiredId) => {
        const hasGtag = typeof window.gtag === 'function';
        const hasLoader = !!document.querySelector('script[src*="analytics-loader.js"]');
        const hasGtmScript = !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
        const meta = document.querySelector('meta[name="ga4-measurement-id"]');
        const metaId = meta ? meta.getAttribute('content') : '';
        const scripts = Array.from(document.querySelectorAll('script[src]')).map((s) => s.src);
        const gtmSrc = scripts.find((s) => /googletagmanager\.com\/gtag\/js/.test(s)) || '';
        const gtmMatch = gtmSrc.match(/id=(G-[A-Z0-9]+)/);
        const gtmId = gtmMatch ? gtmMatch[1] : '';
        const winId =
          typeof window.__GA4_MEASUREMENT_ID__ === 'string' ? window.__GA4_MEASUREMENT_ID__ : '';
        const effectiveId = metaId || gtmId || winId || (hasLoader ? requiredId : '');
        return {
          hasGtag,
          hasLoader,
          hasGtmScript,
          metaId,
          gtmId,
          effectiveId,
          gaPresent: hasGtag || hasLoader || hasGtmScript,
          correctId: effectiveId === requiredId || hasLoader,
        };
      }, core.REQUIRED_GA4_ID);

      entry.playwright = {
        localUrl,
        runtime,
        checkedAt: new Date().toISOString(),
      };

      if (entry.isRealPublicPage && !entry.isNoindex && !entry.isTestPage) {
        if (!runtime.gaPresent && entry.needsGaFix) {
          errors.push('Runtime: no gtag/analytics-loader detected');
        }
        if (runtime.effectiveId && runtime.effectiveId !== core.REQUIRED_GA4_ID) {
          errors.push(`Runtime GA4 ID mismatch: ${runtime.effectiveId}`);
        }
      }
    } catch (e) {
      errors.push(`Navigation failed: ${e.message || String(e)}`);
    } finally {
      page.removeListener('console', onConsole);
      page.removeListener('pageerror', onPageError);
    }

    entry.consoleAnalyticsErrors = errors;
  }

  const summary = core.buildSummary(pages, {
    ...report.summary,
    playwrightConsoleChecks: toCheck.length,
    auditMode: 'playwright-static+http+browser',
    command:
      'npx playwright test e2e/tests/google-analytics-audit.spec.cjs --config=e2e/playwright.config.cjs',
  });

  core.writeReports({
    publicRoot,
    pages,
    summary,
    reportJsonPath: REPORT_JSON,
    summaryMdPath: REPORT_MD,
  });

  expect(toCheck.length).toBeGreaterThan(0);
});
