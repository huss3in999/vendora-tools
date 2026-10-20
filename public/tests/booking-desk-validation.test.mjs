import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, '../booking-desk/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('Booking Desk: Date Focus Mode DOM elements are present', () => {
  const requiredIds = [
    'date-focus-banner',
    'date-focus-heading',
    'focus-cnt-total',
    'focus-cnt-unassigned',
    'focus-cnt-assigned',
    'btn-focus-prev',
    'btn-focus-next',
    'btn-focus-exit',
    'focus-calendar-input'
  ];

  for (const id of requiredIds) {
    assert.ok(html.includes(`id="${id}"`), `Element with id="${id}" must exist in HTML`);
  }
});

test('Booking Desk: isDriverAssigned strictly requires valid driver phone or real name', () => {
  // Extract function from index.html
  const fnMatch = html.match(/function isDriverAssigned\(b\) \{[\s\S]*?\n    \}/);
  assert.ok(fnMatch, 'isDriverAssigned function must exist in index.html');

  const fnCode = fnMatch[0];
  const isDriverAssigned = new Function('b', `${fnCode}\nreturn isDriverAssigned(b);`);

  // Unassigned cases
  assert.equal(isDriverAssigned(null), false, 'null is false');
  assert.equal(isDriverAssigned({}), false, 'empty object is false');
  assert.equal(isDriverAssigned({ tripStatus: 'Not confirmed' }), false, 'Not confirmed is false');
  assert.equal(isDriverAssigned({ tripStatus: 'Not started' }), false, 'Not started is false');
  assert.equal(isDriverAssigned({ driverName: 'بانتظار سائق' }), false, 'بانتظار سائق is false');
  assert.equal(isDriverAssigned({ driverName: 'none' }), false, 'none is false');
  assert.equal(isDriverAssigned({ driverPhone: '123' }), false, 'short phone <6 digits is false');

  // Assigned cases
  assert.equal(isDriverAssigned({ tripStatus: 'Driver Assigned' }), true, 'tripStatus Driver Assigned is true');
  assert.equal(isDriverAssigned({ tripStatus: 'Driver Assigned', driverName: 'سائق مؤكد' }), true, 'سائق مؤكد is true');
  assert.equal(isDriverAssigned({ driverName: 'أبو فهد' }), true, 'Real name is assigned');
  assert.equal(isDriverAssigned({ driverPhone: '+966507080997' }), true, 'Valid phone is assigned');
  assert.equal(isDriverAssigned({ driverName: 'محمد السائق', driverPhone: '36382200' }), true, 'Both name and phone is assigned');
});

test('Booking Desk: loadData sanitizes corrupted row IDs', () => {
  assert.ok(html.includes('b.id.length > 20 || !/^V-\\d+$/i.test(b.id)'), 'loadData must sanitize corrupted IDs');
});

test('Booking Desk: Date Strip Carousel and City section elements exist', () => {
  assert.ok(html.includes('id="date-strip-section"'), 'date-strip-section must exist in HTML');
  assert.ok(html.includes('id="date-strip"'), 'date-strip must exist in HTML');
  assert.ok(html.includes('id="city-filter-section"'), 'city-filter-section must exist in HTML');
  assert.ok(html.includes('id="lbl-date-strip-title"'), 'lbl-date-strip-title must exist');
  assert.ok(html.includes('id="lbl-city-strip-title"'), 'lbl-city-strip-title must exist');
});

test('Booking Desk: City counter includes explicit trip unit to avoid date confusion', () => {
  assert.ok(html.includes('const tripWord = App.lang === \'ar\' ? \'رحلة\' : \'trips\';'), 'Trip word must be used for city counters');
  assert.ok(html.includes('$(\'cnt-city-airports\').textContent = `${active.filter(isAirport).length} ${tripWord}`;'), 'Airports counter must include tripWord');
});

test('Booking Desk: matchesBooking matches day numbers and avoids 2-digit phone collision', () => {
  assert.ok(html.includes('dNum >= 1 && dNum <= 31'), 'Day number matching must check day of month');
  assert.ok(html.includes('qDigits.length >= 4'), 'Phone number search must require at least 4 digits');
});

test('Booking Desk: parseLocationField cleanly strips raw URLs and technical pins', () => {
  const fnMatch = html.match(/function parseLocationField\(str\) \{[\s\S]*?\n    \}/);
  assert.ok(fnMatch, 'parseLocationField function must exist in index.html');

  const fnCode = fnMatch[0];
  const parseLocationField = new Function('str', `${fnCode}\nreturn parseLocationField(str);`);

  // 1. Messy customer pin with Google Maps link
  const sample1 = 'Customer Pin: Bahrain Airport https://maps.app.goo.gl/xyz123 (Near Gate 3)';
  const res1 = parseLocationField(sample1);
  assert.equal(res1.cleanLocation, 'Bahrain Airport', 'cleanLocation must strip pin label and url');
  assert.equal(res1.mapUrl, 'https://maps.app.goo.gl/xyz123', 'mapUrl must be extracted');
  assert.equal(res1.instructions, 'Near Gate 3', 'instructions must be isolated');

  // 2. Arabic customer pin
  const sample2 = 'موقع العميل: فندق الشيراتون المنامة https://goo.gl/maps/abc (المدخل الرئيسي)';
  const res2 = parseLocationField(sample2);
  assert.equal(res2.cleanLocation, 'فندق الشيراتون المنامة', 'cleanLocation must strip Arabic pin prefix');
  assert.equal(res2.mapUrl, 'https://goo.gl/maps/abc', 'mapUrl must be extracted');
  assert.equal(res2.instructions, 'المدخل الرئيسي', 'instructions must be isolated');

  // 3. Normal clean location
  const sample3 = 'Al Khobar, Saudi Arabia';
  const res3 = parseLocationField(sample3);
  assert.equal(res3.cleanLocation, 'Al Khobar, Saudi Arabia');
  assert.equal(res3.mapUrl, '');
  assert.equal(res3.instructions, '');
});

test('Booking Desk: More Actions modal and trigger binding exist', () => {
  assert.ok(html.includes('id="dlg-more-actions"'), 'dlg-more-actions dialog must exist');
  assert.ok(html.includes('id="more-actions-grid"'), 'more-actions-grid must exist');
  assert.ok(html.includes('function openMoreActionsMenu(b)'), 'openMoreActionsMenu function must exist');
  assert.ok(html.includes("action === 'toggle-more-actions' || action === 'more'"), 'Card header More button must open openMoreActionsMenu');
});

test('Booking Desk: Official Invoice is never labeled as Tax Invoice', () => {
  assert.ok(!html.includes('فاتورة ضريبية'), 'Must not label any document as tax invoice (فاتورة ضريبية)');
  assert.ok(html.includes("pageType === 'invoice' ? 'فاتورة رسمية' : 'تأكيد حجز رسمي'"), 'Arabic invoice must be labeled فاتورة رسمية');
  assert.ok(html.includes("pageType === 'invoice' ? 'OFFICIAL INVOICE' : 'BOOKING CONFIRMATION'"), 'English invoice must be labeled OFFICIAL INVOICE');
});

test('Booking Desk: Driver Invite URL uses /d/{token} and supports general alphanumeric tokens', () => {
  assert.ok(html.includes('/d/${encodeURIComponent(token)}'), 'Short invite link /d/{token} must be used');
  assert.ok(!html.includes("!String(res.token).startsWith('v1.')"), 'Must not reject tokens that do not start with v1.');
});
