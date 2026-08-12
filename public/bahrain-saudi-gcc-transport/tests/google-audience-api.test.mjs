import test, { before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { onRequestGet, clearGoogleAudienceCacheForTests } from '../../functions/api/transport/google-audience.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

let privateKeyPem;
let originalFetch;

before(async () => {
  originalFetch = globalThis.fetch;
  const pair = await crypto.subtle.generateKey({
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  }, true, ['sign', 'verify']);
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
  privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearGoogleAudienceCacheForTests();
});

function env(withGa = true) {
  return {
    TRANSPORT_ADMIN_TOKEN: 'test-token',
    ...(withGa ? {
      GA4_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: 'analytics-reader@example.iam.gserviceaccount.com',
        private_key: privateKeyPem,
        token_uri: 'https://oauth2.googleapis.com/token',
      }),
    } : {}),
  };
}

function request(days = 30) {
  return new Request(`https://getvendora.net/api/transport/google-audience?days=${days}`, {
    headers: { authorization: 'Bearer test-token' },
  });
}

function report(rows = [], metadata = {}) {
  return {
    rows: rows.map(([label, users]) => ({
      dimensionValues: [{ value: label }],
      metricValues: [{ value: String(users) }],
    })),
    metadata,
  };
}

function reportsAvailable() {
  return [
    report([['18-24', 4], ['25-34', 7], ['unknown', 2]]),
    report([['female', 6], ['male', 4], ['unknown', 1]]),
    report([['Bahrain', 8], ['Saudi Arabia', 3]]),
    report([['google', 7], ['(direct)', 4]]),
  ];
}

function installGoogleMock(reportFactory) {
  let reportCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return Response.json({ access_token: 'mock-access-token' });
    }
    if (String(url).includes('analyticsdata.googleapis.com')) {
      reportCalls += 1;
      return Response.json({ reports: reportFactory(reportCalls) });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return () => reportCalls;
}

test('returns isolated aggregate age, gender, country and source data', async () => {
  installGoogleMock(() => reportsAvailable());
  const response = await onRequestGet({ request: request(30), env: env() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.connected, true);
  assert.equal(body.isolated, true);
  assert.equal(body.property_id, '528414332');
  assert.equal(body.measurement_id, 'G-DFY197R2MS');
  assert.equal(body.audience.age.available, true);
  assert.equal(body.audience.gender.available, true);
  assert.deepEqual(body.audience.age.rows.map((row) => row.label), ['18-24', '25-34']);
  assert.equal(body.audience.age.unknown_users, 2);
});

test('does not present thresholded demographics as zeroes', async () => {
  installGoogleMock(() => [
    report([['18-24', 2]], { subjectToThresholding: true }),
    report([['female', 2]], { subjectToThresholding: true }),
    report([['Bahrain', 2]]),
    report([['google', 2]]),
  ]);
  const response = await onRequestGet({ request: request(30), env: env() });
  const body = await response.json();

  assert.equal(body.audience.age.available, false);
  assert.equal(body.audience.gender.available, false);
  assert.deepEqual(body.audience.age.rows, []);
  assert.deepEqual(body.audience.gender.rows, []);
  assert.equal(body.audience.countries[0].label, 'Bahrain');
});

test('missing secret is isolated and reports not connected', async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error('should not run'); };
  const response = await onRequestGet({ request: request(30), env: env(false) });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.connected, false);
  assert.equal(body.reason, 'missing_secret');
  assert.equal(fetchCalled, false);
});

test('Google API failure returns an isolated safe response', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('oauth2.googleapis.com/token')) return Response.json({ access_token: 'mock-access-token' });
    return Response.json({ error: { message: 'Service unavailable' } }, { status: 503 });
  };
  const response = await onRequestGet({ request: request(30), env: env() });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.connected, false);
  assert.equal(body.reason, 'google_api_unavailable');
  assert.match(body.message, /core admin is unaffected/i);
});

test('7-day empty demographics automatically fall back to available 90-day data', async () => {
  const calls = installGoogleMock((call) => call === 1
    ? [report(), report(), report([['Bahrain', 1]]), report([['google', 1]])]
    : reportsAvailable());
  const response = await onRequestGet({ request: request(7), env: env() });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(calls(), 2);
  assert.equal(body.requested_days, 7);
  assert.equal(body.effective_days, 90);
  assert.equal(body.fallback_used, true);
  assert.equal(body.audience.age.available, true);
});
