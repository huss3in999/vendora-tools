import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');

test('Migration 0010_business_visitor_intelligence.sql exists and is valid SQL', () => {
  const migrationPath = path.join(projectRoot, 'migrations', '0010_business_visitor_intelligence.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration 0010 file must exist');

  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.match(content, /CREATE TABLE IF NOT EXISTS lead_status_history/i);
  assert.match(content, /ALTER TABLE analytics_events ADD COLUMN active_seconds/i);
  assert.match(content, /ALTER TABLE whatsapp_leads ADD COLUMN is_bot/i);
  assert.match(content, /CREATE TABLE IF NOT EXISTS daily_analytics_aggregates/i);
});

test('Client tracking in site.js sets up active engagement time and privacy-safe IDs', () => {
  const siteJsPath = path.join(projectRoot, 'bahrain-saudi-gcc-transport', 'site.js');
  assert.ok(fs.existsSync(siteJsPath), 'site.js file must exist');

  const content = fs.readFileSync(siteJsPath, 'utf8');
  assert.match(content, /accumulatedActiveMs/, 'site.js must accumulate active visible time');
  assert.match(content, /visibilitychange/, 'site.js must track visibilitychange to avoid idle time inflation');
  assert.match(content, /activeSeconds/, 'site.js payload must include activeSeconds');
  assert.match(content, /vendora_transport_visitor_id/, 'site.js must use anonymous visitor id');
  assert.match(content, /vendora_transport_session_id/, 'site.js must use anonymous session id');
});

test('Analytics router in js/analytics-router.js covers all content categories', () => {
  const routerPath = path.join(projectRoot, 'js', 'analytics-router.js');
  assert.ok(fs.existsSync(routerPath), 'js/analytics-router.js must exist');

  const content = fs.readFileSync(routerPath, 'utf8');
  assert.match(content, /whatsapp_click/, 'analytics-router must track whatsapp clicks');
  assert.match(content, /transport/, 'analytics-router must handle transport category');
});

test('Admin API functions in admin.js support BI endpoints and status audit logging', () => {
  const adminJsPath = path.join(projectRoot, 'functions', 'api', 'transport', 'admin.js');
  assert.ok(fs.existsSync(adminJsPath), 'admin.js must exist');

  const content = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(content, /lead_status_history/, 'admin.js must insert status history');
  assert.match(content, /getReconciliationData/, 'admin.js must provide reconciliation data endpoint');
  assert.match(content, /getSearchAndAiIntelligence/, 'admin.js must analyze search & AI referrals');
  assert.match(content, /getDataQualityPanel/, 'admin.js must return data quality panel info');
  assert.match(content, /quote_sent/, 'admin.js must support extended lead CRM statuses');
  assert.match(content, /confirmed/, 'admin.js must support confirmed status');
  assert.match(content, /rejected/, 'admin.js must support rejected status');
});

test('Admin index.html dashboard includes BI panels, short IDs and confidence labels', () => {
  const adminHtmlPath = path.join(projectRoot, 'bahrain-saudi-gcc-transport', 'admin', 'index.html');
  assert.ok(fs.existsSync(adminHtmlPath), 'admin index.html must exist');

  const content = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(content, /onlineNowList/, 'admin index.html must render Online Now list');
  assert.match(content, /formattedVisitorShortId|compactId/, 'admin index.html must format short visitor IDs');
  assert.match(content, /formattedSessionShortId|compactId/, 'admin index.html must format short session IDs');
  assert.match(content, /Approx\. City/, 'admin index.html must label city as approximate');
  assert.match(content, /Data last updated/, 'admin index.html must display data update timestamps');
});
