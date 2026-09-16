const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('presence tracking has no continuous 60s or 30s setInterval heartbeat to D1', () => {
  const source = fs.readFileSync(path.join(root, 'bahrain-saudi-gcc-transport', 'site.js'), 'utf8');
  assert.match(source, /if \(document\.visibilityState === 'hidden'\) return;/);
  assert.doesNotMatch(source, /setInterval\s*\(\s*sendHeartbeat/);
  assert.doesNotMatch(source, /setInterval\(sendHeartbeat, 60000\);/);
  assert.doesNotMatch(source, /setInterval\(sendHeartbeat, 30000\);/);
});

test('admin has initial and manual loading without background polling', () => {
  const source = fs.readFileSync(path.join(root, 'bahrain-saudi-gcc-transport', 'admin', 'index.html'), 'utf8');
  assert.match(source, /async function unlock\(token\)[\s\S]*?await loadDashboard\(\);/);
  assert.match(source, /document\.getElementById\('refreshBtn'\)\.addEventListener\('click', async \(\) => \{[\s\S]*?await loadDashboard\(\);/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /analyticsAutoRefresh|analyticsRefreshSeconds|analyticsRefreshTimer|configureAnalyticsAutoRefresh/);
});

test('GET endpoints execute 0 schema writes and do not run DDL or unindexed subqueries', () => {
  const adminSource = fs.readFileSync(path.join(root, 'functions', 'api', 'transport', 'admin.js'), 'utf8');
  const careSource = fs.readFileSync(path.join(root, 'functions', 'api', 'transport', 'passenger-care.js'), 'utf8');
  const routeReviewsSource = fs.readFileSync(path.join(root, 'functions', 'api', 'transport', 'route-reviews.js'), 'utf8');

  // onRequestGet must NOT run ensureAdminSchema
  const onGetBlock = adminSource.slice(
    adminSource.indexOf('export async function onRequestGet'),
    adminSource.indexOf('export async function onRequestPost')
  );
  assert.doesNotMatch(onGetBlock, /await ensureAdminSchema/);

  // onRequestGet in route-reviews must NOT run ensurePassengerCareSchema
  const routeGetBlock = routeReviewsSource.slice(
    routeReviewsSource.indexOf('export async function onRequestGet'),
    routeReviewsSource.indexOf('export async function onRequestPost')
  );
  assert.doesNotMatch(routeGetBlock, /await ensurePassengerCareSchema/);

  // getPassengerCareAdminRows must NOT run ensurePassengerCareSchema
  const adminRowsBlock = careSource.slice(
    careSource.indexOf('export async function getPassengerCareAdminRows'),
    careSource.indexOf('export async function getPublicRouteReviews')
  );
  assert.doesNotMatch(adminRowsBlock, /await ensurePassengerCareSchema/);

  // getPublicRouteReviews must NOT run ensurePassengerCareSchema
  const reviewsBlock = careSource.slice(
    careSource.indexOf('export async function getPublicRouteReviews'),
    careSource.indexOf('export async function updatePassengerCareReviewApproval')
  );
  assert.doesNotMatch(reviewsBlock, /await ensurePassengerCareSchema/);

  // buildLeadFilters must not contain the 17k-row scanning LEAD_HAS_PUBLIC_PAGEVIEW_SQL
  assert.doesNotMatch(adminSource, /const clauses = \[PUBLIC_TRANSPORT_LEAD_SQL, LEAD_HAS_PUBLIC_PAGEVIEW_SQL\]/);
});
