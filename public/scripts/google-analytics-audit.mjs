#!/usr/bin/env node
/**
 * Google Analytics GA4 full-site audit (static + live HTTP).
 * Run: node scripts/google-analytics-audit.mjs
 * Optional: AUDIT_LIVE_URL=https://getvendora.net node scripts/google-analytics-audit.mjs
 */
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  scanAllPages,
  buildSummary,
  writeReports,
} from './lib/google-analytics-audit-core.mjs';

const publicRoot = join(fileURLToPath(import.meta.url), '..', '..');
const liveBaseUrl = (process.env.AUDIT_LIVE_URL || 'https://getvendora.net').replace(/\/$/, '');
const reportJsonPath = join(publicRoot, 'tests', 'google-analytics-audit-report.json');
const summaryMdPath = join(publicRoot, 'tests', 'google-analytics-audit-summary.md');

const pages = await scanAllPages({
  publicRoot,
  liveBaseUrl,
  checkLiveHttp: true,
  checkLocalHttp: false,
});

const summary = buildSummary(pages, {
  liveBaseUrl,
  auditMode: 'static+live-http',
  command: 'node scripts/google-analytics-audit.mjs',
});

writeReports({ publicRoot, pages, summary, reportJsonPath, summaryMdPath });

console.log(JSON.stringify({
  reportJsonPath,
  summaryMdPath,
  totalHtmlPages: summary.totalHtmlPages,
  realPublicNeedsFixing: summary.realPublicNeedsFixing,
  pagesMissingGa4: summary.pagesMissingGa4,
  inlineGtagOnly: summary.pagesUsingInlineGtagOnly,
  wrongGa4Id: summary.pagesWithWrongGa4Id,
}, null, 2));
