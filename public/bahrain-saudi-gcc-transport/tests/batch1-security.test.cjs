const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const transport = path.resolve(__dirname, '..');
const publicRoot = path.resolve(transport, '..');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');

test('approved public catalog is complete and does not contain driver pricing fields', () => {
  const source = read(publicRoot, 'functions/api/transport/public-settings.js');
  assert.match(source, /DEFAULT_PUBLIC_ROUTES/);
  assert.equal((source.match(/^  \['bahrain-|^  \['king-|^  \['first-|^  \['dammam-|^  \['additional-/gm) || []).length, 23);
  assert.doesNotMatch(source, /driver_(?:rate|price)|internal_(?:rate|price)|wholesale_price/i);
});

test('legal identity and address are configured with real details by default', () => {
  const source = read(publicRoot, 'functions/api/transport/public-settings.js');
  assert.match(source, /public_address: 'Office 240, Second Floor, The Address Tower, Seef, Kingdom of Bahrain',[\s\S]*address_display_enabled: true/);
  assert.match(source, /legal_name: 'Vendora Transport',[\s\S]*cr_number: '',[\s\S]*legal_information_enabled: true/);
});

test('Passenger Care requires a strong token and an existing lead', () => {
  const source = read(publicRoot, 'functions/api/transport/passenger-care.js');
  assert.match(source, /CARE_TOKEN_RE = \/\^\[a-f0-9\]\{48\}/);
  assert.match(source, /findLeadByCareToken/);
  assert.doesNotMatch(source, /provisional:\s*true/);
  assert.doesNotMatch(source, /resolveLeadForFeedback/);
});

test('legacy tracking uses session-only token storage and escaped rendering', () => {
  const source = read(transport, 'admin/tracking-dashboard/index.html');
  assert.doesNotMatch(source, /localStorage\.(?:getItem|setItem)\([^)]*token/i);
  assert.match(source, /sessionStorage\.setItem/);
  assert.match(source, /function escapeHtml/);
  assert.doesNotMatch(source, /onclick=/i);
  assert.match(source, /Content-Security-Policy/);
});

test('generic analytics allowlist excludes booking personal data', () => {
  const source = read(transport, 'assets/analytics-loader.js');
  assert.match(source, /allowedExtraKeys/);
  ['customer_name', 'customer_phone', 'flight_number', 'paid_amount', 'passenger_care_comment'].forEach((key) => {
    assert.doesNotMatch(source, new RegExp(`${key}\\s*:\\s*true`, 'i'));
  });
});

test('public deployment exclusions cover internal transport artifacts', () => {
  const ignore = read(publicRoot, '.assetsignore');
  ['tests', 'scratch', 'research', 'qa', 'references', 'wrangler'].forEach((name) => assert.match(ignore, new RegExp(name, 'i')));
});

test('pricing pages have canonical, hreflang, same-source schema and mobile grid', () => {
  const ar = read(transport, 'prices/index.html');
  const en = read(transport, 'en/prices/index.html');
  for (const source of [ar, en]) {
    assert.match(source, /rel="canonical"/);
    assert.match(source, /hreflang="ar"/);
    assert.match(source, /hreflang="en"/);
    assert.match(source, /id="pricesSchema"/);
    assert.match(source, /class="price-grid route-grid"/);
  }
  const sharedCss = read(transport, 'site.css');
  assert.match(sharedCss, /\.price-card\{/);
  const script = read(transport, 'assets/prices-page.js');
  assert.match(script, /list\.innerHTML/);
  assert.match(script, /pricesSchema'\)\.textContent = JSON\.stringify\(schema\)/);
  assert.match(script, /per vehicle, one way/);
});

test('both pricing URLs are present in transport sitemaps', () => {
  assert.match(read(transport, 'sitemap-gcc-transport.xml'), /\/prices\//);
  assert.match(read(transport, 'sitemap-gcc-transport-en.xml'), /\/en\/prices\//);
});
