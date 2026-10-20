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

function extractFunction(source, fnName) {
  const match = source.match(new RegExp(`function\\s+${fnName}\\s*\\([^{]*\\)\\s*\\{`));
  if (!match) throw new Error(`Function ${fnName} not found`);
  const start = match.index + match[0].length;
  let depth = 1;
  let i = start;
  while (depth > 0 && i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  return source.substring(match.index, i);
}

test('1. Mobile Overflow Fix: Pickup & Flight Arrival Separate Fields', () => {
  assert.ok(html.includes('parseTripTimingDetails'), 'Must include parseTripTimingDetails helper');
  assert.ok(html.includes('class="card-timing-row"'), 'Booking card must include card-timing-row');
  assert.ok(html.includes('timing-field pickup-field'), 'Must have separate pickup-field');
  assert.ok(html.includes('timing-field flight-field'), 'Must have separate flight-field');
  assert.ok(html.includes('timing-label'), 'Timing elements must have distinct labels');

  const parseFnCode = extractFunction(html, 'parseTripTimingDetails');
  const format12hCode = extractFunction(html, 'formatTimeTo12h');

  const testEnv = new Function(`
    const App = { lang: 'en' };
    ${format12hCode}
    ${parseFnCode}
    return { parseTripTimingDetails };
  `)();

  // Test case matching problem description: "9:15 PM flight arrival; pickup after airport procedures"
  const b1 = {
    pickupTime: '9:15 PM flight arrival; pickup after airport procedures',
    flight: 'GF214',
    notes: ''
  };
  const res1 = testEnv.parseTripTimingDetails(b1, 'en');
  assert.equal(res1.flightArrivalTime, '9:15 PM', 'Must extract flight arrival time');
  assert.equal(res1.pickupVal, 'After airport procedures', 'Must extract qualitative pickup instructions');
  assert.equal(res1.isClock, false, 'Qualitative pickup must not be marked as clock time');
  assert.ok(res1.hasFlightArrival, 'Must flag flight arrival present');

  // Test case with explicit pickup time: "10:30 PM"
  const b2 = {
    pickupTime: '10:30 PM',
    flight: '',
    notes: ''
  };
  const res2 = testEnv.parseTripTimingDetails(b2, 'en');
  assert.equal(res2.pickupVal, '10:30 PM', 'Must extract clean clock time');
  assert.equal(res2.isClock, true, 'Explicit pickup time must be marked as clock');

  // CSS overflow assertions
  assert.ok(html.includes('word-break: break-word;'), 'Timing fields must wrap properly without clipped text');
  assert.ok(html.includes('@media (max-width: 480px)'), 'Mobile media queries must support compact phone screens');
});

test('2. Seven-Day Date Selector & Bahrain Timezone Navigation', () => {
  // DOM Elements
  assert.ok(html.includes('id="seven-day-nav-wrapper"'), 'Must have 7-day navigation wrapper');
  assert.ok(html.includes('id="seven-day-strip"'), 'Must have 7-day strip container');
  assert.ok(html.includes('id="btn-prev-week"'), 'Must have previous week button');
  assert.ok(html.includes('id="btn-next-week"'), 'Must have next week button');
  assert.ok(html.includes('id="btn-shortcut-today"'), 'Must have Today shortcut button');
  assert.ok(html.includes('id="btn-shortcut-all"'), 'Must have All Dates shortcut button');
  assert.ok(html.includes('id="btn-toggle-custom-range"'), 'Must have Custom Range toggle button');

  // CSS Styling
  assert.ok(html.includes('.active-teal'), 'Active date card must highlight in teal');
  assert.ok(html.includes('#0d9488') || html.includes('teal') || html.includes('20, 184, 166'), 'Teal styling must be defined');

  // Timezone enforcement
  const renderStripCode = extractFunction(html, 'renderSevenDayStrip');
  assert.ok(renderStripCode.includes("timeZone: 'Asia/Bahrain'"), 'Must dynamically compute dates using Asia/Bahrain timezone');
});

test('3. Individual Compact Black Date Box on Every Booking', () => {
  assert.ok(html.includes('renderBookingDateBadgeBox'), 'Must have renderBookingDateBadgeBox helper');
  assert.ok(html.includes('.booking-date-badge-box'), 'CSS must define booking-date-badge-box');
  assert.ok(html.includes('.badge-day-num'), 'CSS must define large day number');
  assert.ok(html.includes('.badge-month'), 'CSS must define small month');
  assert.ok(html.includes('.badge-weekday'), 'CSS must define weekday');

  const badgeFnCode = extractFunction(html, 'renderBookingDateBadgeBox');
  const badgeEnv = new Function(`
    const App = { lang: 'en' };
    const esc = s => String(s);
    ${badgeFnCode}
    return { renderBookingDateBadgeBox };
  `)();

  const badgeHtml = badgeEnv.renderBookingDateBadgeBox('2026-10-21');
  assert.ok(badgeHtml.includes('class="booking-date-badge-box"'), 'Badge HTML must render container');
  assert.ok(badgeHtml.includes('>21<'), 'Must show day 21');
  assert.ok(badgeHtml.toLowerCase().includes('oct'), 'Must show month OCT');
  assert.ok(badgeHtml.toLowerCase().includes('wed'), 'Must show weekday WED');
});

test('4. 5-Row Information Hierarchy for Collapsed Cards', () => {
  const renderTripItemCode = extractFunction(html, 'renderTripItem');

  // Row 1: Booking reference, Individual date badge, Booking status
  assert.ok(renderTripItemCode.includes('renderBookingDateBadgeBox(b.travelDate)'), 'Row 1 must include date badge box');
  assert.ok(renderTripItemCode.includes('class="trip-id"'), 'Row 1 must include booking ref #id');
  assert.ok(renderTripItemCode.includes('status-op-pill'), 'Row 1 must include status pill');

  // Row 2: Timing row (pickup & flight)
  assert.ok(renderTripItemCode.includes('card-timing-row'), 'Row 2 must render card-timing-row');
  assert.ok(renderTripItemCode.includes('timing-val trip-time'), 'Row 2 must render prominent trip time');

  // Row 3: Route
  assert.ok(renderTripItemCode.includes('card-route-grid trip-route-text'), 'Row 3 must render route grid');

  // Row 4: Driver status & Trip price
  assert.ok(renderTripItemCode.includes('card-fourth-row'), 'Row 4 must render fourth row');
  assert.ok(renderTripItemCode.includes('getDriverStatusIndicator'), 'Row 4 must render driver indicator');
  assert.ok(renderTripItemCode.includes('trip-price'), 'Row 4 must render trip price');

  // Row 5: Actions & Expand toggle
  assert.ok(renderTripItemCode.includes('card-actions-bar'), 'Row 5 must render card-actions-bar');
  assert.ok(renderTripItemCode.includes('btn-toggle-expand'), 'Row 5 must include View Details / expand toggle');

  // Preserved expanded details
  assert.ok(renderTripItemCode.includes('trip-details-panel'), 'Card must retain expanded details panel');
});

test('5. Driver Assignment Visual Indicators: Green, Amber, Red & Strict Isolation', () => {
  const getIndCode = extractFunction(html, 'getDriverStatusIndicator');
  const isAssignedCode = extractFunction(html, 'isDriverAssigned');
  const isConfirmedCode = extractFunction(html, 'isDriverConfirmed');
  const isCancCode = extractFunction(html, 'isBookingCancelled');

  const env = new Function(`
    ${isCancCode}
    ${isAssignedCode}
    ${isConfirmedCode}
    ${getIndCode}
    return { getDriverStatusIndicator };
  `)();

  const today = '2026-10-21';
  const tomorrow = '2026-10-22';

  // 1. Confirmed driver -> GREEN
  const bConfirmed = {
    bookingStatus: 'Confirmed',
    tripStatus: 'Driver Confirmed',
    driverAssigned: true,
    driverConfirmed: true,
    driverName: 'Ali Hassan',
    driverPhone: '+97339001122',
    travelDate: today
  };
  const indConfirmed = env.getDriverStatusIndicator(bConfirmed, today, tomorrow);
  assert.equal(indConfirmed.color, 'green');
  assert.equal(indConfirmed.type, 'confirmed');

  // 2. Assigned pending confirmation -> AMBER
  const bPending = {
    bookingStatus: 'Confirmed',
    tripStatus: 'Assigned',
    driverAssigned: true,
    driverConfirmed: false,
    driverName: 'Ahmed Omar',
    driverPhone: '+97339001133',
    travelDate: today
  };
  const indPending = env.getDriverStatusIndicator(bPending, today, tomorrow);
  assert.equal(indPending.color, 'amber');
  assert.equal(indPending.type, 'pending');

  // 3. Urgent unassigned trip today or tomorrow -> RED
  const bUrgent = {
    bookingStatus: 'Confirmed',
    tripStatus: 'Unassigned',
    driverAssigned: false,
    driverName: '',
    driverPhone: '',
    travelDate: today
  };
  const indUrgent = env.getDriverStatusIndicator(bUrgent, today, tomorrow);
  assert.equal(indUrgent.color, 'red');
  assert.equal(indUrgent.type, 'urgent');

  // 4. Canceled trip -> MUST RETURN NULL (no active alerts)
  const bCanceled = {
    bookingStatus: 'Cancelled',
    tripStatus: 'Cancelled',
    driverAssigned: false,
    travelDate: today
  };
  const indCanceled = env.getDriverStatusIndicator(bCanceled, today, tomorrow);
  assert.equal(indCanceled, null, 'Canceled trips must never generate active driver alerts');

  // 5. Completed past trip -> MUST RETURN NULL (no active alerts)
  const bCompleted = {
    bookingStatus: 'Completed',
    tripStatus: 'Completed',
    driverAssigned: false,
    travelDate: '2026-10-18'
  };
  const indCompleted = env.getDriverStatusIndicator(bCompleted, today, tomorrow);
  assert.equal(indCompleted, null, 'Completed past trips must never produce new driver alerts');
});

test('6. Canceled Bookings Management: 3-Option Visibility & Prominent Canceled Badge', () => {
  // Visibility control elements
  assert.ok(html.includes('id="booking-visibility-bar"'), 'Must have booking-visibility-bar');
  assert.ok(html.includes('data-vis="non_canceled"'), 'Must have Non-canceled option (default)');
  assert.ok(html.includes('data-vis="canceled_only"'), 'Must have Canceled Only option');
  assert.ok(html.includes('data-vis="all"'), 'Must have All Bookings option');

  // Default app state
  assert.ok(html.includes("visibilityFilter: 'non_canceled'"), 'visibilityFilter must default to non_canceled');

  // Large canceled badge styling
  assert.ok(html.includes('.badge-card-canceled'), 'Must define badge-card-canceled');
  assert.ok(html.includes('✕ CANCELED') || html.includes('CANCELED'), 'Badge must include unmistakable CANCELED text');
  assert.ok(html.includes('✕ ملغي') || html.includes('ملغي'), 'Badge must include unmistakable Arabic ملغي text');

  // Financial safety: Canceled excluded from revenue & collection
  const finFnCode = extractFunction(html, 'computeFinancialStats');
  const isCancCode = extractFunction(html, 'isBookingCancelled');
  const toBhdCode = extractFunction(html, 'toBhdAmount');

  const finEnv = new Function(`
    const TO_BHD_RATES = { BHD: 1, SAR: 0.1004, KWD: 1.229, AED: 0.1026, QAR: 0.1035, OMR: 0.980, USD: 0.377 };
    ${isCancCode}
    ${toBhdCode}
    ${finFnCode}
    return { computeFinancialStats };
  `)();

  const testList = [
    { id: '1', bookingStatus: 'Confirmed', paymentStatus: 'Paid', fare: 50, currency: 'BHD' },
    { id: '2', bookingStatus: 'Cancelled', paymentStatus: 'Paid', fare: 100, currency: 'BHD' },
    { id: '3', bookingStatus: 'Confirmed', paymentStatus: 'Unpaid', fare: 30, currency: 'BHD' }
  ];
  const stats = finEnv.computeFinancialStats(testList);
  assert.equal(stats.activeCount, 2, 'Active count must exclude canceled booking');
  assert.equal(stats.cancelledCount, 1, 'Cancelled count must record 1');
  assert.equal(stats.totalBhd, 80, 'Total revenue must exclude canceled fare (50 + 30 = 80)');
  assert.equal(stats.paidBhd, 50, 'Paid collection must exclude canceled payment (only 50)');
});

test('7. Chronological Pickup Time Sorting with Id Tie-Breaking', () => {
  const extractSortCode = extractFunction(html, 'extractSortTime');
  const env = new Function(`
    ${extractSortCode}
    return { extractSortTime };
  `)();

  const trips = [
    { id: 'V-003', pickupTime: '11:00 AM' },
    { id: 'V-001', pickupTime: '08:15 AM' },
    { id: 'V-002', pickupTime: '08:15 AM' },
    { id: 'V-004', pickupTime: '02:30 PM' }
  ];

  trips.sort((a, b) => {
    const tA = env.extractSortTime(a);
    const tB = env.extractSortTime(b);
    if (tA !== tB) return tA.localeCompare(tB);
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  assert.equal(trips[0].id, 'V-001', 'Earliest time first');
  assert.equal(trips[1].id, 'V-002', 'Tie broken chronologically by ID');
  assert.equal(trips[2].id, 'V-003', '11:00 AM third');
  assert.equal(trips[3].id, 'V-004', '02:30 PM last');
});

test('8. Bilingual Language Completeness for New Controls', () => {
  // Arabic dictionary checks
  assert.ok(html.includes("prevWeek: 'السابق'"), 'Arabic dict must include prevWeek');
  assert.ok(html.includes("nextWeek: 'التالي'"), 'Arabic dict must include nextWeek');
  assert.ok(html.includes("todayBtn: 'اليوم'"), 'Arabic dict must include todayBtn');
  assert.ok(html.includes("allDatesBtn: 'كل التواريخ'"), 'Arabic dict must include allDatesBtn');
  assert.ok(html.includes("visNonCanceled: 'غير الملغية'"), 'Arabic dict must include visNonCanceled');
  assert.ok(html.includes("visCanceledOnly: 'الملغية فقط'"), 'Arabic dict must include visCanceledOnly');
  assert.ok(html.includes("visAllBookings: 'جميع الحجوزات'"), 'Arabic dict must include visAllBookings');

  // English dictionary checks
  assert.ok(html.includes("prevWeek: 'Prev'"), 'English dict must include prevWeek');
  assert.ok(html.includes("nextWeek: 'Next'"), 'English dict must include nextWeek');
  assert.ok(html.includes("todayBtn: 'Today'"), 'English dict must include todayBtn');
  assert.ok(html.includes("allDatesBtn: 'All Dates'"), 'English dict must include allDatesBtn');
  assert.ok(html.includes("visNonCanceled: 'Non-canceled'"), 'English dict must include visNonCanceled');
  assert.ok(html.includes("visCanceledOnly: 'Canceled Only'"), 'English dict must include visCanceledOnly');
  assert.ok(html.includes("visAllBookings: 'All Bookings'"), 'English dict must include visAllBookings');
});

test('9. Color-Coded Driver Attention Thin Accents (Green, Amber, Red & RTL)', () => {
  assert.ok(html.includes('.trip-item.driver-confirmed-ok'), 'Must define driver-confirmed-ok accent');
  assert.ok(html.includes('.trip-item.driver-pending-confirm'), 'Must define driver-pending-confirm accent');
  assert.ok(html.includes('.trip-item.driver-urgent-needed'), 'Must define driver-urgent-needed accent');
  assert.ok(html.includes('border-inline-start: 3.5px solid #10b981'), 'Green accent must be #10b981');
  assert.ok(html.includes('border-inline-start: 3.5px solid #f59e0b'), 'Amber accent must be #f59e0b');
  assert.ok(html.includes('border-inline-start: 3.5px solid #ef4444'), 'Red accent must be #ef4444');
});
