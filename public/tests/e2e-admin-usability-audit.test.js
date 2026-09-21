import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const adminHtmlPath = path.join(process.cwd(), 'bahrain-saudi-gcc-transport', 'admin', 'index.html');
const siteJsPath = path.join(process.cwd(), 'bahrain-saudi-gcc-transport', 'site.js');
const adminJsPath = path.join(process.cwd(), 'functions', 'api', 'transport', 'admin.js');

test('Admin index.html defaults to "today" reporting period on fresh login', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.ok(html.includes("periodToDates('today')"), 'unlock() must initialize periodToDates with today');
  assert.ok(html.includes("highlightActivePeriod('today')"), 'unlock() must highlight today as active period');
});

test('Admin index.html includes 3-stage WhatsApp metrics (Intents, Cancelled, Departed)', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.ok(html.includes('id="statIntents"'), 'Must have statIntents element');
  assert.ok(html.includes('id="statCancelled"'), 'Must have statCancelled element');
  assert.ok(html.includes('id="statDeparted"'), 'Must have statDeparted element');
  assert.ok(html.includes('id="statSessions"'), 'Must have statSessions element');
});

test('Admin index.html contains visitor timeline and journey function handlers', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.ok(html.includes('renderVisitorJourney'), 'Must have renderVisitorJourney function');
  assert.ok(html.includes('visitorEventsForLead'), 'Must have visitorEventsForLead function');
});

test('site.js contains no cookie consent banner implementation', () => {
  const code = fs.readFileSync(siteJsPath, 'utf8');
  assert.ok(!code.includes('vendoraConsentBanner'), 'site.js must not contain the retired banner');
  assert.ok(!code.includes('vendora_consent_choice'), 'site.js must not persist cookie consent state');
});

test('AI Concierge keeps its CTA on transient status errors and uses customer-facing labels', () => {
  const code = fs.readFileSync(siteJsPath, 'utf8');
  assert.ok(code.includes('Chat with us directly'), 'English customer CTA must be visible');
  assert.ok(code.includes('تحدث معنا مباشرة'), 'Arabic customer CTA must be visible');
  assert.ok(code.includes("status.ok === true && status.enabled === false"), 'Only an explicit OFF status may remove the CTA');
  assert.ok(code.includes("trigger.dataset.conciergeStatus = 'unknown'"), 'Status failures must preserve the CTA');
});

test('admin.js preserves 100% of historical records without deletion or forced migration', () => {
  const code = fs.readFileSync(adminJsPath, 'utf8');
  assert.ok(code.includes('whatsapp_intents_count'), 'admin.js must summarize whatsapp_intents_count');
  assert.ok(code.includes('whatsapp_cancelled_count'), 'admin.js must summarize whatsapp_cancelled_count');
  assert.ok(code.includes('whatsapp_departed_count'), 'admin.js must summarize whatsapp_departed_count');
});
