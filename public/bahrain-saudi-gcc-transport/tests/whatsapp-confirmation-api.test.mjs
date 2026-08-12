import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost as handleLead } from '../../functions/api/transport/whatsapp-lead.js';

class D1Statement {
  constructor(statement) { this.statement = statement; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() {
    const result = this.statement.run(...this.values);
    return { success: true, meta: { changes: result.changes } };
  }
  async all() { return { results: this.statement.all(...this.values) }; }
  async first() { return this.statement.get(...this.values) || null; }
}

class D1Database {
  constructor(db) { this.db = db; }
  prepare(sql) { return new D1Statement(this.db.prepare(sql)); }
}

const sqlite = new DatabaseSync(':memory:');
for (const migration of ['0001_transport_control_room.sql', '0002_transport_lead_engagement.sql', '0003_lead_crm_fields.sql', '0004_visitor_intelligence.sql']) {
  sqlite.exec(await readFile(new URL(`../../migrations/${migration}`, import.meta.url), 'utf8'));
}

const env = {
  TRANSPORT_DB: new D1Database(sqlite),
  TRANSPORT_NOTIFY_WEBHOOK_URL: 'https://ntfy.invalid/vendora-test',
};
const originalFetch = globalThis.fetch;
let notificationRequests = 0;
globalThis.fetch = async (url) => {
  if (String(url).startsWith('https://ntfy.invalid/')) notificationRequests += 1;
  return new Response('', { status: 200 });
};

async function post(payload) {
  const request = new Request('http://127.0.0.1:4173/api/transport/event', {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:4173', 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.44' },
    body: JSON.stringify(payload),
  });
  Object.defineProperty(request, 'cf', { value: { city: 'Manama', country: 'BH', timezone: 'Asia/Bahrain' } });
  const pending = [];
  const response = await handleLead({ request, env, waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  return response;
}

try {
  const prepared = await post({
    notificationMode: 'after_confirmation',
    serviceType: 'passenger_transport',
    visitorId: 'visitor-confirmation-test',
    sessionId: 'session-confirmation-test',
    routeSlug: 'saudi-to-qatar',
    routeLabel: 'Saudi Arabia to Qatar',
    pageUrl: 'https://getvendora.net/bahrain-saudi-gcc-transport/en/saudi-to-qatar/',
    pagePath: '/bahrain-saudi-gcc-transport/en/saudi-to-qatar/',
    language: 'en',
    clickText: 'Request a route quotation',
  });
  assert.equal(prepared.status, 201);
  const lead = await prepared.json();
  assert.equal(notificationRequests, 0, 'preparing the confirmation dialog must not alert the owner');

  const confirmed = await post({ action: 'confirm_whatsapp_handoff', leadId: lead.leadId, careToken: lead.care_token });
  assert.equal(confirmed.status, 200);
  assert.equal(notificationRequests, 1, 'the final WhatsApp departure should alert once');
  const storedLead = sqlite.prepare('SELECT whatsapp_confirmed_at, visitor_id, ip_address, session_snapshot_json FROM whatsapp_leads WHERE lead_uuid = ?').get(lead.leadId);
  assert.ok(storedLead.whatsapp_confirmed_at);
  assert.equal(storedLead.visitor_id, 'visitor-confirmation-test');
  assert.equal(storedLead.ip_address, null, 'raw IP must not be retained on new lead rows');
  assert.equal(JSON.parse(storedLead.session_snapshot_json).frozen_at, storedLead.whatsapp_confirmed_at);

  const repeated = await post({ action: 'confirm_whatsapp_handoff', leadId: lead.leadId, careToken: lead.care_token });
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).already_confirmed, true);
  assert.equal(notificationRequests, 1, 'repeating the confirmation request must not duplicate the alert');

  const preparedCancel = await post({
    notificationMode: 'after_confirmation',
    serviceType: 'passenger_transport',
    visitorId: 'visitor-cancel-test',
    sessionId: 'session-cancel-test',
    routeSlug: 'bahrain-to-khobar',
    routeLabel: 'Bahrain to Khobar',
    pageUrl: 'https://getvendora.net/bahrain-saudi-gcc-transport/en/bahrain-to-khobar/',
    pagePath: '/bahrain-saudi-gcc-transport/en/bahrain-to-khobar/',
    language: 'en',
    clickText: 'Book on WhatsApp',
  });
  const cancelLead = await preparedCancel.json();
  const cancelled = await post({ action: 'cancel_whatsapp_handoff', leadId: cancelLead.leadId, careToken: cancelLead.care_token });
  assert.equal(cancelled.status, 200);
  assert.equal(sqlite.prepare('SELECT status FROM whatsapp_leads WHERE lead_uuid = ?').get(cancelLead.leadId).status, 'cancelled');
  const repeatedCancel = await post({ action: 'cancel_whatsapp_handoff', leadId: cancelLead.leadId, careToken: cancelLead.care_token });
  assert.equal((await repeatedCancel.json()).already_cancelled, true);
  assert.equal(notificationRequests, 1, 'cancelling must not send a departure alert');

  console.log(JSON.stringify({ ok: true, prepared_alerts: 0, confirmed_alerts: 1, repeated_alerts: 0, cancel_recorded: true }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
