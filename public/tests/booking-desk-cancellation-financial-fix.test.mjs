import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const htmlPath = path.resolve('public/booking-desk/index.html');
const swPath = path.resolve('public/booking-desk/sw.js');
const html = fs.readFileSync(htmlPath, 'utf8');
const sw = fs.readFileSync(swPath, 'utf8');

function extractFunction(source, fnName) {
  const marker = `function ${fnName}`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Function ${fnName} not found`);
  let depth = 0;
  let inString = false;
  let quoteChar = '';
  let end = -1;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === quoteChar && source[i - 1] !== '\\') inString = false;
    } else {
      if (ch === "'" || ch === '"' || ch === '`') {
        inString = true;
        quoteChar = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
  }
  if (end === -1) throw new Error(`Could not find end of function ${fnName}`);
  return source.slice(start, end);
}

// 9 real canceled bookings from actual Google Sheets dataset
const realCanceledBookings = [
  { id: 'V-013', bookingStatus: 'Cancelled', tripStatus: 'Cancelled', travelDate: '2026-10-16', fare: '40', currency: 'BHD', paymentStatus: 'Unverified' },
  { id: 'V-023', bookingStatus: 'Cancelled', tripStatus: 'Cancelled', travelDate: '2026-10-15', fare: '40', currency: 'BHD', paymentStatus: 'Unverified' },
  { id: 'V-036', bookingStatus: 'Cancelled - customer request', tripStatus: 'Cancelled', travelDate: '2026-10-20', fare: '150', currency: 'BHD', paymentStatus: 'Unverified' },
  { id: 'V-037', bookingStatus: 'Cancelled by operator request', tripStatus: 'Cancelled', travelDate: '2026-10-17', fare: '40', currency: 'BHD', paymentStatus: 'Unverified' },
  { id: 'V-050', bookingStatus: 'Cancelled', tripStatus: 'Cancelled', travelDate: '2026-10-17', fare: '35', currency: 'BHD', paymentStatus: 'Not received' },
  { id: 'V-051', bookingStatus: 'Cancelled by customer', tripStatus: 'Cancelled', travelDate: '2026-10-18', fare: '30', currency: 'BHD', paymentStatus: 'Not received' },
  { id: 'V-053', bookingStatus: 'Cancelled', tripStatus: 'Cancelled', travelDate: '2026-10-17', fare: '120', currency: 'BHD', paymentStatus: 'Not received' },
  { id: 'V-057', bookingStatus: 'Cancelled', tripStatus: 'Cancelled', travelDate: '2026-10-19', fare: '40', currency: 'BHD', paymentStatus: 'Not received' },
  { id: 'V-059', bookingStatus: 'Cancelled', tripStatus: 'Cancelled', travelDate: '2026-10-18', fare: '', currency: '', paymentStatus: 'Not received' }
];

test('1. Robust Cancellation Normalization: isBookingCancelled recognizes all cancellation statuses', () => {
  const isCancCode = extractFunction(html, 'isBookingCancelled');
  const sandbox = { isBookingCancelled: null };
  vm.createContext(sandbox);
  vm.runInContext(isCancCode, sandbox);

  assert.strictEqual(sandbox.isBookingCancelled({ bookingStatus: 'Cancelled', tripStatus: 'Cancelled' }), true);
  assert.strictEqual(sandbox.isBookingCancelled({ bookingStatus: 'Cancelled - customer request', tripStatus: 'Cancelled' }), true);
  assert.strictEqual(sandbox.isBookingCancelled({ bookingStatus: 'Cancelled by operator request', tripStatus: 'Not started' }), true);
  assert.strictEqual(sandbox.isBookingCancelled({ bookingStatus: 'Cancelled - customer not picked up', tripStatus: 'Unverified' }), true);
  assert.strictEqual(sandbox.isBookingCancelled({ bookingStatus: 'Cancelled by customer', tripStatus: '' }), true);
  assert.strictEqual(sandbox.isBookingCancelled({ bookingStatus: 'ملغي من قبل العميل', tripStatus: '' }), true);
  assert.strictEqual(sandbox.isBookingCancelled({ bookingStatus: 'Confirmed', tripStatus: 'Driver Assigned' }), false);
});

test('2. matchesBooking: Canceled bookings pass through even when travelDate is in the past', () => {
  const isCancCode = extractFunction(html, 'isBookingCancelled');
  const matchesDateCode = extractFunction(html, 'matchesDateRange');
  const matchesBookingCode = extractFunction(html, 'matchesBooking');

  const sandbox = {
    isBookingCancelled: null,
    matchesDateRange: null,
    matchesBooking: null,
    isDriverAssigned: () => false,
    isRiyadh: () => false,
    isBahrain: () => false,
    isKhobarDammam: () => false,
    isSaudi: () => false,
    isUAE: () => false,
    isQatar: () => false,
    isAirport: () => false,
    App: {
      fastFilter: 'canceled',
      visibilityFilter: 'canceled_only',
      filter: 'cancelled',
      specificDate: '',
      selectedDates: [],
      dateRangeFrom: '',
      dateRangeTo: '',
      cityFilter: 'all',
      countryFilter: 'all',
      payFilter: 'all',
      driverFilter: 'all'
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(isCancCode, sandbox);
  vm.runInContext(matchesDateCode, sandbox);
  vm.runInContext(matchesBookingCode, sandbox);

  const todayStr = '2026-10-21';
  const tomorrowStr = '2026-10-22';

  // Test every real historical canceled booking
  realCanceledBookings.forEach(b => {
    const passed = sandbox.matchesBooking(b, '', todayStr, tomorrowStr);
    assert.strictEqual(passed, true, `Booking ${b.id} with date ${b.travelDate} must pass in Canceled view`);
  });
});

test('3. matchesBooking: All Bookings passes both active, completed, and canceled bookings', () => {
  const isCancCode = extractFunction(html, 'isBookingCancelled');
  const matchesDateCode = extractFunction(html, 'matchesDateRange');
  const matchesBookingCode = extractFunction(html, 'matchesBooking');

  const sandbox = {
    isBookingCancelled: null,
    matchesDateRange: null,
    matchesBooking: null,
    isDriverAssigned: (b) => Boolean(b.driverName),
    isRiyadh: () => false,
    isBahrain: () => false,
    isKhobarDammam: () => false,
    isSaudi: () => false,
    isUAE: () => false,
    isQatar: () => false,
    isAirport: () => false,
    App: {
      fastFilter: 'all',
      visibilityFilter: 'all',
      filter: 'all',
      specificDate: '',
      selectedDates: [],
      dateRangeFrom: '',
      dateRangeTo: '',
      cityFilter: 'all',
      countryFilter: 'all',
      payFilter: 'all',
      driverFilter: 'all'
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(isCancCode, sandbox);
  vm.runInContext(matchesDateCode, sandbox);
  vm.runInContext(matchesBookingCode, sandbox);

  const todayStr = '2026-10-21';
  const tomorrowStr = '2026-10-22';

  // Active future booking
  const activeBooking = { id: 'V-001', bookingStatus: 'Confirmed', travelDate: '2026-10-25' };
  // Completed past booking
  const completedBooking = { id: 'V-002', bookingStatus: 'Completed', travelDate: '2026-10-14' };
  // Canceled past booking
  const canceledBooking = realCanceledBookings[0];

  assert.strictEqual(sandbox.matchesBooking(activeBooking, '', todayStr, tomorrowStr), true);
  assert.strictEqual(sandbox.matchesBooking(completedBooking, '', todayStr, tomorrowStr), true);
  assert.strictEqual(sandbox.matchesBooking(canceledBooking, '', todayStr, tomorrowStr), true);
});

test('4. matchesBooking: With Driver and Without Driver strictly exclude canceled bookings', () => {
  const isCancCode = extractFunction(html, 'isBookingCancelled');
  const matchesDateCode = extractFunction(html, 'matchesDateRange');
  const matchesBookingCode = extractFunction(html, 'matchesBooking');

  const sandbox = {
    isBookingCancelled: null,
    matchesDateRange: null,
    matchesBooking: null,
    isDriverAssigned: (b) => Boolean(b.driverName),
    isRiyadh: () => false,
    isBahrain: () => false,
    isKhobarDammam: () => false,
    isSaudi: () => false,
    isUAE: () => false,
    isQatar: () => false,
    isAirport: () => false,
    App: {
      fastFilter: 'with_driver',
      visibilityFilter: 'non_canceled',
      filter: 'all',
      specificDate: '',
      selectedDates: [],
      dateRangeFrom: '',
      dateRangeTo: '',
      cityFilter: 'all',
      countryFilter: 'all',
      payFilter: 'all',
      driverFilter: 'all'
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(isCancCode, sandbox);
  vm.runInContext(matchesDateCode, sandbox);
  vm.runInContext(matchesBookingCode, sandbox);

  const todayStr = '2026-10-21';
  const tomorrowStr = '2026-10-22';

  // Canceled booking with driver assigned must NOT appear in With Driver
  const cancWithDrv = Object.assign({}, realCanceledBookings[0], { driverName: 'Ali Driver' });
  assert.strictEqual(sandbox.matchesBooking(cancWithDrv, '', todayStr, tomorrowStr), false);

  // Switch to Without Driver
  sandbox.App.fastFilter = 'without_driver';
  assert.strictEqual(sandbox.matchesBooking(cancWithDrv, '', todayStr, tomorrowStr), false);
  assert.strictEqual(sandbox.matchesBooking(realCanceledBookings[0], '', todayStr, tomorrowStr), false);
});

test('5. Cancellation Financial Calculation: Accurate Original Value, zero invented refunds', () => {
  const isCancCode = extractFunction(html, 'isBookingCancelled');
  const cancStatsCode = extractFunction(html, 'computeCancellationStats');

  const sandbox = {
    isBookingCancelled: null,
    computeCancellationStats: null,
    toBhdAmount: (amt, cur) => {
      const n = parseFloat(amt) || 0;
      if (cur === 'SAR') return n * 0.1005;
      return n;
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(isCancCode, sandbox);
  vm.runInContext(cancStatsCode, sandbox);

  const stats = sandbox.computeCancellationStats(realCanceledBookings);
  assert.strictEqual(stats.count, 9, 'Must count 9 canceled bookings');
  assert.strictEqual(stats.originalBhd, 495, 'Original BHD value must total 495.000 BHD');
  assert.strictEqual(stats.collectedBhd, 0, 'No payments recorded on these 9 cancellations');
  assert.strictEqual(stats.refundedBhd, 0, 'No refunds recorded on these 9 cancellations');
});

test('6. Cancellation Summary Banner and KPI consistency exist in DOM & code', () => {
  assert.ok(html.includes('id="cancellation-summary-banner"'), 'Dedicated cancellation summary banner exists');
  assert.ok(html.includes('computeCancellationStats(list)'), 'renderStream invokes computeCancellationStats in canceled view');
  assert.ok(html.includes('cancStats.originalBhd'), 'Original booking value is rendered in canceled view');
});
