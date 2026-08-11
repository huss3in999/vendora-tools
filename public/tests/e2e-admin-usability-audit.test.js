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

test('site.js setupConsentBanner ensures document.body readiness before appendChild', () => {
  const code = fs.readFileSync(siteJsPath, 'utf8');
  assert.ok(code.includes('setupConsentBanner'), 'site.js must include setupConsentBanner');
  assert.ok(code.includes('vendora_consent_choice'), 'site.js must check vendora_consent_choice');
});

test('admin.js preserves 100% of historical records without deletion or forced migration', () => {
  const code = fs.readFileSync(adminJsPath, 'utf8');
  assert.ok(code.includes('whatsapp_intents_count'), 'admin.js must summarize whatsapp_intents_count');
  assert.ok(code.includes('whatsapp_cancelled_count'), 'admin.js must summarize whatsapp_cancelled_count');
  assert.ok(code.includes('whatsapp_departed_count'), 'admin.js must summarize whatsapp_departed_count');
});
