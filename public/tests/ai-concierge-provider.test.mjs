import test from 'node:test';
import assert from 'node:assert/strict';
import * as concierge from '../functions/api/ai-chat.js';
import worker from '../worker.js';

function makeDb(initial = {}) {
  let row = initial === null ? null : {
    id: 1,
    enabled: 0,
    provider: 'cloudflare',
    model: '@cf/meta/llama-3.1-8b-instruct-fast',
    allow_fallback: 0,
    instructions: '',
    reference_name: '',
    reference_data: '',
    ...initial,
  };
  const calls = [];
  return {
    calls,
    prepare(sql) {
      calls.push(sql);
      let binds = [];
      const statement = {
        bind(...values) { binds = values; return statement; },
        async run() {
          if (sql.includes('INSERT INTO concierge_settings')) {
            const [enabled, provider, model, allow_fallback, instructions, reference_name, reference_data] = binds;
            row = { id: 1, enabled, provider, model, allow_fallback, instructions, reference_name, reference_data };
          }
          return { success: true };
        },
        async first() { return sql.includes('SELECT * FROM concierge_settings') && row ? { ...row } : null; },
        async all() {
          if (sql.includes('PRAGMA table_info')) return { results: Object.keys(row || { id: 1, enabled: 0, provider: 'cloudflare', model: '', allow_fallback: 0, instructions: '', reference_name: '', reference_data: '' }).map((name) => ({ name })) };
          return { results: [] };
        },
      };
      return statement;
    },
  };
}

function context(db, extra = {}) {
  return { request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat'), env: { TRANSPORT_DB: db, TRANSPORT_ADMIN_TOKEN: 'test-token', ...extra } };
}

test('AI master switch blocks customer requests without invoking a provider', async () => {
  const db = makeDb({ enabled: 0 });
  let calls = 0;
  const response = await concierge.onRequestPost({ ...context(db, { AI: { run: async () => { calls += 1; } } }), request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat', { method: 'POST', body: JSON.stringify({ message: 'Bahrain to Khobar' }) }) });
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test('Admin settings save creates the missing id=1 row and preserves all fields', async () => {
  const db = makeDb(null);
  const response = await concierge.onRequestPost({
    ...context(db),
    request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token' },
      body: JSON.stringify({ admin_update: true, enabled: true, provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct-fast', allow_fallback: false, instructions: 'Use the approved route rules.', reference_name: 'rules.txt', reference_data: 'Bahrain to Riyadh: ask for date.' }),
    }),
  });
  assert.equal(response.status, 200);
  const saved = await concierge.onRequestGet({ ...context(db), request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat', { headers: { authorization: 'Bearer test-token' } }) });
  const body = await saved.json();
  assert.equal(body.concierge_settings.enabled, true);
  assert.equal(body.concierge_settings.provider, 'cloudflare');
  assert.equal(body.concierge_settings.allow_fallback, false);
  assert.equal(body.concierge_settings.instructions, 'Use the approved route rules.');
  assert.equal(body.concierge_settings.reference_name, 'rules.txt');
  assert.equal(body.concierge_settings.reference_size, 'Bahrain to Riyadh: ask for date.'.length);
});

test('Cloudflare Workers AI is selected without requiring Gemini', async () => {
  const db = makeDb({ enabled: 1, provider: 'cloudflare' });
  let model;
  const env = { AI: { run: async (name) => { model = name; return { response: JSON.stringify({ text: 'Ready', duration: '1 hour', vehicle: 'Executive sedan', price: '40 BHD' }) }; } } };
  const response = await concierge.onRequestPost({ ...context(db, env), request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat', { method: 'POST', body: JSON.stringify({ message: 'Bahrain to Khobar' }) }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.provider, 'cloudflare');
  assert.equal(body.fallback_used, false);
  assert.equal(model, '@cf/meta/llama-3.1-8b-instruct-fast');
});

test('Cloudflare Workers AI nested response objects are parsed as concierge data', async () => {
  const db = makeDb({ enabled: 1, provider: 'cloudflare' });
  const response = await concierge.onRequestPost({ ...context(db, { AI: { run: async () => ({ response: { response: JSON.stringify({ text: 'Ready in English', duration: '5 hours', vehicle: 'Yukon XL', price: 'From 120 BHD' }) } }) } }), request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat', { method: 'POST', body: JSON.stringify({ message: 'Bahrain to Riyadh' }) }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.reply.text.startsWith('Ready in English'), true);
  assert.equal(body.reply.duration, '5 hours');
  assert.equal(body.reply.vehicle, 'Yukon XL');
  assert.equal(body.reply.price, 'From 120 BHD');
});

test('Gemini selection does not silently use Cloudflare when fallback is off', async () => {
  const db = makeDb({ enabled: 1, provider: 'gemini', allow_fallback: 0 });
  const response = await concierge.onRequestPost({ ...context(db, { AI: { run: async () => ({ response: '{}' }) } }), request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat', { method: 'POST', body: JSON.stringify({ message: 'Bahrain to Khobar' }) }) });
  assert.equal(response.status, 503);
});

test('explicit fallback may use the other configured provider', async () => {
  const db = makeDb({ enabled: 1, provider: 'gemini', allow_fallback: 1 });
  const response = await concierge.onRequestPost({ ...context(db, { AI: { run: async () => ({ response: JSON.stringify({ text: 'Fallback response' }) }) } }), request: new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat', { method: 'POST', body: JSON.stringify({ message: 'Bahrain to Khobar' }) }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.provider, 'cloudflare');
  assert.equal(body.fallback_used, true);
});

test('Worker routes the public concierge endpoint through the existing Worker', async () => {
  const db = makeDb({ enabled: 0 });
  const response = await worker.fetch(new Request('https://getvendora.net/bahrain-saudi-gcc-transport/api/ai-chat'), { TRANSPORT_DB: db }, { waitUntil() {} });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, enabled: false });
});
