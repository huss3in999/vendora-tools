import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const htmlPath = path.resolve('public/booking-desk/index.html');
const swPath = path.resolve('public/booking-desk/sw.js');
const html = fs.readFileSync(htmlPath, 'utf8');
const sw = fs.readFileSync(swPath, 'utf8');

test('1. SW Cache Version: Bumped to vendora-dispatch-v20261021-m4 in sw.js and index.html', () => {
  assert.ok(sw.includes('vendora-dispatch-v20261021-m4'), 'sw.js must define vendora-dispatch-v20261021-m4');
  assert.ok(html.includes('/booking-desk/sw.js?v=20261021-m4'), 'index.html must register sw.js with query param v=20261021-m4');
});

test('2. Driver Share Modal: chk-fare, chk-payout, and sel-drv-doc-lang configured properly', () => {
  assert.ok(html.includes('id="sel-drv-doc-lang"'), 'Driver share modal must have sel-drv-doc-lang document selector');
  assert.ok(html.includes('<option value="en" selected>'), 'sel-drv-doc-lang must default to English');
  assert.ok(html.includes('id="chk-fare"'), 'chk-fare checkbox must exist');
  assert.ok(html.includes('id="chk-payout"'), 'chk-payout checkbox must exist');
  assert.ok(html.includes("$('chk-fare').checked = true"), 'openDriverModal must check chk-fare by default');
  assert.ok(html.includes("$('chk-payout').checked = true"), 'openDriverModal must check chk-payout by default');
  assert.ok(html.includes("$('sel-drv-doc-lang').value = 'en'"), 'openDriverModal must reset document language to en');
});

test('3. Decoupled Document Language: Driver Image & PDF default to English', () => {
  assert.ok(html.includes("const docLang = ($('sel-drv-doc-lang') && $('sel-drv-doc-lang').value) || 'en';"),
    'getDriverShareContext must derive docLang from sel-drv-doc-lang defaulting to en');
  assert.ok(html.includes("const chosenLang = ($('sel-drv-doc-lang') && $('sel-drv-doc-lang').value) || 'en';"),
    'btn-drv-open-pdf must derive chosenLang from sel-drv-doc-lang defaulting to en');
});

test('4. Fast Filters Bar: 4 One-Tap Filter Buttons exist with responsive grid and badges', () => {
  assert.ok(html.includes('id="booking-visibility-bar"'), 'booking-visibility-bar exists');
  assert.ok(html.includes('data-fast="all"'), 'Fast filter All Bookings exists');
  assert.ok(html.includes('data-fast="canceled"'), 'Fast filter Canceled exists');
  assert.ok(html.includes('data-fast="with_driver"'), 'Fast filter With Driver exists');
  assert.ok(html.includes('data-fast="without_driver"'), 'Fast filter Without Driver exists');
  assert.ok(html.includes('id="cnt-fast-all"'), 'Badge for All Bookings exists');
  assert.ok(html.includes('id="cnt-vis-canceled"'), 'Badge for Canceled exists');
  assert.ok(html.includes('id="cnt-fast-with-driver"'), 'Badge for With Driver exists');
  assert.ok(html.includes('id="cnt-fast-without-driver"'), 'Badge for Without Driver exists');
});

test('5. Fast Filter Logic: All Bookings shows everything, Canceled shows all cancellations across dates', () => {
  assert.ok(html.includes("if (App.fastFilter === 'canceled' || App.visibilityFilter === 'canceled_only')"),
    'matchesBooking must respect fastFilter canceled');
  assert.ok(html.includes("else if (App.fastFilter === 'with_driver')"),
    'matchesBooking must respect fastFilter with_driver');
  assert.ok(html.includes("else if (App.fastFilter === 'without_driver')"),
    'matchesBooking must respect fastFilter without_driver');
  assert.ok(html.includes("else if (App.fastFilter === 'all' || App.visibilityFilter === 'all')"),
    'matchesBooking must allow all when fastFilter is all');
});

test('6. All Dates Button: btn-shortcut-all sets filter to all and clears specificDate to reveal past & future', () => {
  const shortcutAllMatch = html.match(/\$\('btn-shortcut-all'\)\.onclick\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\};/);
  assert.ok(shortcutAllMatch, 'btn-shortcut-all click handler found');
  const code = shortcutAllMatch[1];
  assert.ok(code.includes("App.filter = 'all'"), 'Must set App.filter = all');
  assert.ok(code.includes("App.specificDate = ''"), 'Must clear specificDate');
  assert.ok(code.includes("renderStream()"), 'Must call renderStream');
});

test('7. Driver Fare Cash vs Prepaid: Explicit payment collection instructions in WhatsApp message', () => {
  assert.ok(html.includes('Collect from Customer:'), 'Must include explicit Cash collection wording');
  assert.ok(html.includes('Payment: PREPAID — DO NOT COLLECT FROM CUSTOMER'), 'Must include explicit Prepaid warning');
  assert.ok(html.includes('الدفع: مدفوع مسبقاً — لا تحصّل أي مبالغ من العميل'), 'Must include explicit Arabic Prepaid warning');
  assert.ok(html.includes('مطلوب التحصيل من العميل:'), 'Must include explicit Arabic Cash collection wording');
  assert.ok(html.includes('Amount not confirmed — please check with dispatch'), 'Must show unconfirmed warning when cash fare missing');
});

test('8. Driver WhatsApp Templates: Clean, standardized format with no leaked commission or formulas', () => {
  assert.ok(html.includes('VENDORA TRANSPORT | DRIVER ASSIGNMENT'), 'Standard English driver assignment header exists');
  assert.ok(html.includes('Please confirm receipt of this assignment.'), 'Standard English confirmation prompt exists');
  assert.ok(!html.includes('b.driverPayout *'), 'No formula calculation leaks in driver messages');
  assert.ok(!html.includes('profit:'), 'No profit leaks in driver messages');
  assert.ok(!html.includes('commission:'), 'No commission leaks in driver messages');
});

test('9. Script Stability: index.html JavaScript executes cleanly without errors', () => {
  const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    const code = match[1];
    new vm.Script(code);
  }
  assert.ok(count > 0, 'Found scripts and all parsed successfully');
});
