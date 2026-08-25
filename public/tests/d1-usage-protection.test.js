const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('presence tracking writes at most once per visible minute', () => {
  const source = fs.readFileSync(path.join(root, 'bahrain-saudi-gcc-transport', 'site.js'), 'utf8');
  assert.match(source, /if \(document\.visibilityState === 'hidden'\) return;/);
  assert.match(source, /setInterval\(sendHeartbeat, 60000\);/);
  assert.doesNotMatch(source, /setInterval\(sendHeartbeat, 30000\);/);
});

test('admin has initial and manual loading without background polling', () => {
  const source = fs.readFileSync(path.join(root, 'bahrain-saudi-gcc-transport', 'admin', 'index.html'), 'utf8');
  assert.match(source, /async function unlock\(token\)[\s\S]*?await loadDashboard\(\);/);
  assert.match(source, /document\.getElementById\('refreshBtn'\)\.addEventListener\('click', async \(\) => \{[\s\S]*?await loadDashboard\(\);/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /analyticsAutoRefresh|analyticsRefreshSeconds|analyticsRefreshTimer|configureAnalyticsAutoRefresh/);
});
