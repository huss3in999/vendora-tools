import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const htmlPath = fs.existsSync('public/booking-desk/index.html')
  ? path.resolve('public/booking-desk/index.html')
  : (fs.existsSync('booking-desk/index.html')
      ? path.resolve('booking-desk/index.html')
      : path.resolve('../public/booking-desk/index.html'));
const html = fs.readFileSync(htmlPath, 'utf8');

test('Document Generation Language: Default is English with Arabic selectable option', () => {
  // Document language selector in customer modal defaults to English
  assert.ok(html.includes('id="sel-cust-doc-lang"'), 'Customer modal must have separate sel-cust-doc-lang selector');
  assert.ok(html.includes('<option value="en" selected>'), 'sel-cust-doc-lang must default to English (en)');
  assert.ok(html.includes('<option value="ar">'), 'sel-cust-doc-lang must provide Arabic option');

  // openCustModal sets document language to en
  assert.ok(html.includes("$('sel-cust-doc-lang').value = 'en'"), 'openCustModal must default document language to en');

  // getCustomerShareContext resolves docLang from sel-cust-doc-lang defaulting to en
  assert.ok(html.includes("const docLang = ($('sel-cust-doc-lang') && $('sel-cust-doc-lang').value) || 'en';"), 'getCustomerShareContext must default docLang to en');

  // shareBookingDocument defaults docLang to en
  assert.ok(html.includes("docLang = $('sel-cust-doc-lang').value || 'en';"), 'shareBookingDocument must use sel-cust-doc-lang or fallback to en');

  // PDF modal opens in English by default
  assert.ok(html.includes("const chosenLang = ($('sel-cust-doc-lang') && $('sel-cust-doc-lang').value) || 'en';"), 'btn-cust-open-pdf must pass en by default');
});

test('Time Visibility: Time badge in booking list is larger, bolder, and prominent', () => {
  // .trip-time CSS must specify large 15px font and bold weight
  assert.ok(html.includes('font-size: 15px;'), '.trip-time must have 15px font size');
  assert.ok(html.includes('font-weight: 900;'), '.trip-time must have 900 bold font weight');
  assert.ok(html.includes('border: 1.5px solid rgba(56, 189, 248'), '.trip-time must have high-contrast border');
});

test('Date Filters: Expanded with After Tomorrow, Dynamic Weekday Pills, and Upcoming Default', () => {
  // Filter bar elements
  assert.ok(html.includes('data-filter="upcoming"'), 'Filter bar must include upcoming');
  assert.ok(html.includes('data-filter="after_tomorrow"'), 'Filter bar must include after_tomorrow');
  assert.ok(html.includes('id="cnt-after-tomorrow"'), 'Filter bar must include counter for after_tomorrow');
  assert.ok(html.includes('id="dynamic-weekday-pills"'), 'Filter bar must have dynamic-weekday-pills container');

  // applyFilterTab handles after_tomorrow and date: prefixes
  assert.ok(html.includes("tabName === 'after_tomorrow'"), 'applyFilterTab must handle after_tomorrow');
  assert.ok(html.includes("tabName.startsWith('date:')"), 'applyFilterTab must handle date: prefix');

  // Dictionary entries exist
  assert.ok(html.includes("afterTomorrowTab: 'بعد غد'"), 'Arabic dictionary must have afterTomorrowTab');
  assert.ok(html.includes("afterTomorrowTab: 'Day After Tomorrow'"), 'English dictionary must have afterTomorrowTab');
});

test('Front Complete Button: Direct 1-tap action moves trip to History', () => {
  // Card header contains front complete button
  assert.ok(html.includes('btn-card-complete'), 'Trip cards must include btn-card-complete button class');
  assert.ok(html.includes('data-action="toggle-done"'), 'Complete button must trigger toggle-done action');

  // Styling exists for btn-card-complete
  assert.ok(html.includes('.btn-card-complete {'), 'CSS must define .btn-card-complete');
  assert.ok(html.includes('.btn-card-complete.completed'), 'CSS must define .btn-card-complete.completed');
});

test('Big Date Separator Bar: Prominent day number badge, full date, and trip stats', () => {
  // CSS for big date separator bar exists
  assert.ok(html.includes('.big-date-separator-bar {'), 'CSS must define .big-date-separator-bar');
  assert.ok(html.includes('.big-date-day-badge'), 'CSS must define .big-date-day-badge');
  assert.ok(html.includes('.big-date-day-num'), 'CSS must define .big-date-day-num');
  assert.ok(html.includes('.big-date-stat-pill'), 'CSS must define .big-date-stat-pill');

  // HTML rendering logic creates big-date-separator-bar with day number and stats
  assert.ok(html.includes('big-date-separator-bar date-section-title'), 'Stream renderer must generate big-date-separator-bar');
  assert.ok(html.includes('big-date-day-num'), 'Stream renderer must output big-date-day-num');
  assert.ok(html.includes('big-date-rel-badge'), 'Stream renderer must output relative badge');
});
