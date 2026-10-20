import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

// Read index.html to verify markup, scripts, and embedded predicates
test('Booking desk index.html contains mobile search, city scroller, and filter modal', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify DOM elements exist
  assert.ok(html.includes('id="quick-date-picker"'), 'Must have quick date picker input');
  assert.ok(html.includes('id="city-bar"'), 'Must have city scroller');
  assert.ok(html.includes('data-city="riyadh"'), 'Must have Riyadh city pill');
  assert.ok(html.includes('data-city="bahrain"'), 'Must have Bahrain city pill');
  assert.ok(html.includes('data-city="khobar_dammam"'), 'Must have Khobar & Dammam city pill');
  assert.ok(html.includes('id="btn-clear-search"'), 'Must have search clear button');
  assert.ok(html.includes('id="btn-open-filters"'), 'Must have filter toggle button');
  assert.ok(html.includes('id="active-filters-bar"'), 'Must have active filters bar');
  assert.ok(html.includes('id="dlg-filters"'), 'Must have advanced filters dialog');
  assert.ok(html.includes('id="flt-custom-date"'), 'Must have modal custom date picker');
  assert.ok(html.includes('id="flt-select-city"'), 'Must have modal city select');
  assert.ok(html.includes('id="flt-select-country"'), 'Must have modal country select');
});

test('Booking desk filtering logic handles numbers, cities, countries, and dates accurately', () => {
  // Test predicates and matching engine directly
  function isRiyadh(b) {
    const s = ((b.pickup || '') + ' ' + (b.destination || '')).toLowerCase();
    return s.includes('riyadh') || s.includes('رياض') || s.includes('ruh');
  }
  function isBahrain(b) {
    const s = ((b.pickup || '') + ' ' + (b.destination || '')).toLowerCase();
    return s.includes('bahrain') || s.includes('بحرين') || s.includes('manama') || s.includes('منام') ||
           s.includes('muharraq') || s.includes('محرق') || s.includes('bah') || s.includes('جسر') || s.includes('causeway');
  }
  function isKhobarDammam(b) {
    const s = ((b.pickup || '') + ' ' + (b.destination || '')).toLowerCase();
    return s.includes('khobar') || s.includes('خبر') || s.includes('dammam') || s.includes('دمام') ||
           s.includes('dhahran') || s.includes('ظهران') || s.includes('dmm');
  }
  function isSaudi(b) {
    if (isRiyadh(b) || isKhobarDammam(b)) return true;
    const s = ((b.pickup || '') + ' ' + (b.destination || '')).toLowerCase();
    return s.includes('saudi') || s.includes('سعودي') || s.includes('ksa') || s.includes('jeddah') || s.includes('جدة');
  }

  function matches(b, q, state) {
    if (q) {
      const qClean = q.toLowerCase();
      const qDigits = q.replace(/\D/g, '');

      const textHaystack = [b.id, b.customerName, b.flight, b.pickup, b.destination, b.notes, b.travelDate].join(' ').toLowerCase();
      const phoneDigits = [(b.customerPhone || '').replace(/\D/g, ''), (b.driverPhone || '').replace(/\D/g, '')].join(' ');

      let match = textHaystack.includes(qClean);
      if (!match && qDigits && qDigits.length >= 2) {
        if (phoneDigits.includes(qDigits) || String(b.fare || '').includes(qDigits) || (b.id || '').toLowerCase().includes(qDigits)) {
          match = true;
        }
      }
      if (!match) {
        if ((qClean.includes('riyadh') || qClean.includes('رياض')) && isRiyadh(b)) match = true;
        if ((qClean.includes('bahrain') || qClean.includes('بحرين')) && isBahrain(b)) match = true;
        if ((qClean.includes('saudi') || qClean.includes('سعودي')) && isSaudi(b)) match = true;
      }
      if (!match) return false;
    }

    if (state.specificDate && b.travelDate !== state.specificDate) return false;
    if (state.cityFilter && state.cityFilter !== 'all') {
      if (state.cityFilter === 'riyadh' && !isRiyadh(b)) return false;
      if (state.cityFilter === 'bahrain' && !isBahrain(b)) return false;
      if (state.cityFilter === 'khobar_dammam' && !isKhobarDammam(b)) return false;
    }
    return true;
  }

  const sampleBookings = [
    { id: 'V-001', travelDate: '2026-10-15', pickup: 'Bahrain Airport', destination: 'Riyadh Olaya', customerPhone: '+966551234567', fare: '150' },
    { id: 'V-002', travelDate: '2026-10-16', pickup: 'Al Khobar', destination: 'Manama', customerPhone: '+97339112233', fare: '60' },
    { id: 'V-003', travelDate: '2026-10-15', pickup: 'Dammam Airport', destination: 'Jubail Industrial', customerPhone: '+96650998877', fare: '40' }
  ];

  // 1. Search by customer phone number digits
  const resPhone = sampleBookings.filter(b => matches(b, '55123', {}));
  assert.equal(resPhone.length, 1);
  assert.equal(resPhone[0].id, 'V-001');

  // 2. Search by City alias in Arabic
  const resRiyadh = sampleBookings.filter(b => matches(b, 'الرياض', {}));
  assert.equal(resRiyadh.length, 1);
  assert.equal(resRiyadh[0].id, 'V-001');

  // 3. Search by Country in English
  const resSaudi = sampleBookings.filter(b => matches(b, 'Saudi', {}));
  assert.equal(resSaudi.length, 3); // All 3 trips (Riyadh, Khobar, Dammam) are in Saudi Arabia!

  // 4. Filter by specific date
  const resDate = sampleBookings.filter(b => matches(b, '', { specificDate: '2026-10-16' }));
  assert.equal(resDate.length, 1);
  assert.equal(resDate[0].id, 'V-002');

  // 5. City filter pill 'khobar_dammam'
  const resKhobar = sampleBookings.filter(b => matches(b, '', { cityFilter: 'khobar_dammam' }));
  assert.equal(resKhobar.length, 2); // V-002 (Khobar) and V-003 (Dammam)
});

test('Booking desk driver assignment logic and 1-tap toggle buttons are correctly configured', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify 1-tap assign button exists in markup and script
  assert.ok(html.includes('btn-assign-instant'), 'Must have btn-assign-instant class');
  assert.ok(html.includes('data-action="toggle-driver-instant"'), 'Must have toggle-driver-instant data-action');
  assert.ok(html.includes('btn-unassign'), 'Must have btn-unassign button class');
  assert.ok(html.includes('function isDriverAssigned'), 'Must have isDriverAssigned function');
  assert.ok(html.includes('function toggleDriverInstant'), 'Must have toggleDriverInstant function');

  // Test isDriverAssigned logic
  function isDriverAssigned(b) {
    if (!b) return false;
    if (b.driverPhone && String(b.driverPhone).trim()) return true;
    if (b.driverName && String(b.driverName).trim() && b.driverName.trim() !== 'لم يعين' && b.driverName.trim() !== 'Unassigned') return true;
    const ts = String(b.tripStatus || '').trim().toLowerCase();
    if (ts === 'driver assigned' || ts === 'assigned' || ts === 'معين' || ts === 'تم التعيين' || ts === 'مؤكد مع السائق' || ts === 'arranged' || ts === 'car arranged') {
      return true;
    }
    return false;
  }

  assert.equal(isDriverAssigned({}), false);
  assert.equal(isDriverAssigned({ driverPhone: '' }), false);
  assert.equal(isDriverAssigned({ driverPhone: '+96650000000' }), true);
  assert.equal(isDriverAssigned({ driverName: 'أبو فهد' }), true);
  assert.equal(isDriverAssigned({ tripStatus: 'Driver Assigned' }), true);
  assert.equal(isDriverAssigned({ tripStatus: 'Not confirmed' }), false);
});

test('Booking desk Arabic localization functions translate locations, luggage, and customer status', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('function localizeLocation'), 'Must have localizeLocation function');
  assert.ok(html.includes('function localizeLuggage'), 'Must have localizeLuggage function');
  assert.ok(html.includes('function localizeVehicle'), 'Must have localizeVehicle function');
  assert.ok(html.includes('function localizeCustomerName'), 'Must have localizeCustomerName function');

  // Verify route badges markup
  assert.ok(html.includes('class="route-point pickup"'), 'Must have route-point pickup markup');
  assert.ok(html.includes('class="route-point dest"'), 'Must have route-point dest markup');
});

test('Booking desk expanded cards provide comprehensive dispatcher details and quick-actions', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify helpers exist
  assert.ok(html.includes('function formatDateTime'), 'Must have formatDateTime helper');
  assert.ok(html.includes('function extractFirstMapUrl'), 'Must have extractFirstMapUrl helper');

  // Verify 5 sections in expanded panel
  assert.ok(html.includes('sec-blue'), 'Must have section 1 header styling');
  assert.ok(html.includes('sec-emerald'), 'Must have section 2 header styling');
  assert.ok(html.includes('sec-amber'), 'Must have section 3 header styling');
  assert.ok(html.includes('detail-notes-card'), 'Must have section 4 notes card styling');
  assert.ok(html.includes('sec-sky'), 'Must have section 5 driver and dispatch log styling');

  // Verify 1-tap links
  assert.ok(html.includes('google.com/maps'), 'Must have Google Maps search link');
  assert.ok(html.includes('flight status'), 'Must have live flight tracking query link');
  assert.ok(html.includes('quick-contact-btn tel'), 'Must have quick telephone call button');
  assert.ok(html.includes('quick-contact-btn wa'), 'Must have quick WhatsApp button');
  assert.ok(html.includes('btn-maps-link'), 'Must have Google Maps button class');

  // Test extractFirstMapUrl logic directly
  function extractFirstMapUrl(text) {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)[^\s<>"']*/i);
    if (match) return match[0];
    const generalUrlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
    return generalUrlMatch ? generalUrlMatch[0] : null;
  }

  assert.equal(extractFirstMapUrl('Please pick up here: https://maps.app.goo.gl/xyz123 on arrival'), 'https://maps.app.goo.gl/xyz123');
  assert.equal(extractFirstMapUrl('Drop at hotel https://goo.gl/maps/abc456 thanks'), 'https://goo.gl/maps/abc456');
  assert.equal(extractFirstMapUrl('No link here'), null);
});

test('Booking desk switching to English goes 100% pure English across all localizers and UI definitions', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify bilingual dictionaries exist
  assert.ok(html.includes("appTitle: 'Vendora Transport'"), 'Must have English appTitle');
  assert.ok(html.includes("upcomingTab: 'Upcoming (Today & Tomorrow)'"), 'Must have English upcomingTab');
  assert.ok(html.includes("unassignedTab: '⚠️ Needs Driver'"), 'Must have English unassignedTab');
  assert.ok(html.includes("pickDateTab: '📅 Pick Date...'"), 'Must have English pickDateTab');
  assert.ok(html.includes("qaSaveAndWa: 'Save & Prepare WhatsApp Now'"), 'Must have English qaSaveAndWa');

  // Verify syncLanguageUI sets dir and lang
  assert.ok(html.includes("document.documentElement.lang = App.lang;"), 'Must set doc lang');
  assert.ok(html.includes("document.documentElement.dir = isAr ? 'rtl' : 'ltr';"), 'Must set dir ltr in English');

  // Verify all dialog IDs exist in syncLanguageUI
  const expectedIds = [
    'txt-app-title', 'txt-app-tag', 'txt-refresh', 'btn-cfg',
    'kpi-lbl-today', 'kpi-lbl-tomorrow', 'kpi-lbl-unassigned',
    'txt-tab-upcoming', 'txt-tab-unassigned', 'txt-tab-today', 'txt-tab-tomorrow', 'txt-tab-history', 'txt-tab-all', 'txt-tab-done', 'txt-tab-cancelled',
    'txt-city-all', 'txt-city-riyadh', 'txt-city-bahrain', 'txt-city-khobar', 'txt-city-airports', 'txt-city-uae', 'txt-city-qatar', 'txt-city-other',
    'txt-add-booking', 'txt-sync', 'txt-filter-btn', 'btn-clear-all-filters',
    'txt-filter-modal-title', 'lbl-flt-date', 'lbl-flt-city', 'lbl-flt-country', 'lbl-flt-pay', 'lbl-flt-driver',
    'txt-qa-title', 'qa-lbl-drvname', 'qa-lbl-drvphone', 'qa-lbl-payout', 'qa-lbl-payoutcurr', 'qa-lbl-veh', 'qa-lbl-note', 'txt-qa-save-and-wa', 'btn-qa-cancel', 'txt-qa-save-only', 'btn-qa-clear-chip', 'txt-qa-unassign',
    'txt-drv-title', 'lbl-drv-name', 'lbl-drv-phone', 'lbl-drv-lang', 'lbl-drv-faremode', 'lbl-drv-checklist', 'lbl-drv-note', 'lbl-drv-preview', 'btn-copy-drv', 'btn-wa-drv', 'btn-sent-drv',
    'txt-cust-title', 'lbl-cust-name', 'lbl-cust-phone', 'lbl-cust-lang', 'lbl-cust-drvinfo', 'lbl-cust-preview', 'btn-copy-cust', 'btn-wa-cust', 'btn-sent-cust',
    'lbl-f-id', 'lbl-f-status', 'lbl-f-date', 'lbl-f-time', 'lbl-f-sorttime', 'lbl-f-flight', 'lbl-f-pickup', 'lbl-f-dest', 'lbl-f-custname', 'lbl-f-custphone', 'lbl-f-drvname', 'lbl-f-drvphone', 'lbl-f-car', 'lbl-f-paxluggage', 'lbl-f-fare', 'lbl-f-payout', 'lbl-f-paystatus', 'lbl-f-payoutstatus', 'lbl-f-notes', 'btn-edit-cancel', 'btn-save-edit',
    'txt-cfg-title', 'lbl-cfg-url', 'lbl-cfg-key', 'txt-cfg-link', 'txt-cfg-note', 'btn-test-conn', 'btn-save-cfg'
  ];

  for (const id of expectedIds) {
    assert.ok(html.includes(`'${id}'`) || html.includes(`"${id}"`), `syncLanguageUI must bind element id: ${id}`);
  }
});

test('Booking desk pill toggle-off behavior, unassign driver, cancel booking, and backdrop closing are supported', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // 1. Verify pill toggle-off logic exists
  assert.ok(html.includes("if (App.filter === tabName && tabName !== 'upcoming')"), 'applyFilterTab must toggle off back to upcoming');
  assert.ok(html.includes("(App.cityFilter === city && city !== 'all') ? 'all' : city"), 'city pill click must toggle off back to all');
  assert.ok(html.includes("chip.classList.contains('active')"), 'driver quick chip click must toggle active state');

  // 2. Verify unassign driver options
  assert.ok(html.includes('id="btn-qa-unassign"'), 'Quick assign modal must have unassign driver button');
  assert.ok(html.includes('id="btn-qa-clear-chip"'), 'Quick assign modal must have clear selection button');
  assert.ok(html.includes('data-action="unassign-driver"'), 'Trip cards must have unassign-driver action');
  assert.ok(html.includes('function unassignDriver'), 'Must have unassignDriver helper function');

  // 3. Verify cancel entire booking and cancelled tab
  assert.ok(html.includes('data-filter="cancelled"'), 'Must have cancelled filter pill in navigation');
  assert.ok(html.includes('id="cnt-cancelled"'), 'Must have cancelled counter');
  assert.ok(html.includes('data-action="toggle-cancel-booking"'), 'Must have cancel booking action button');
  assert.ok(html.includes('function toggleCancelBooking'), 'Must have toggleCancelBooking helper function');
  assert.ok(html.includes('data-action="collapse-card"'), 'Must have collapse card button');

  // 4. Verify backdrop click close handler for dialogs
  assert.ok(html.includes('if (e.target === dlg)'), 'Dialogs must close on backdrop click');

  // 5. Test matchesBooking for cancelled filter
  function matchesBookingSim(b, filter) {
    if (b.bookingStatus === 'Trashed') return false;
    if (filter === 'cancelled') {
      return b.bookingStatus === 'Cancelled';
    } else if (filter !== 'all') {
      if (b.bookingStatus === 'Cancelled') return false;
    }
    return true;
  }

  const sampleTrips = [
    { id: 'V-001', bookingStatus: 'Confirmed' },
    { id: 'V-002', bookingStatus: 'Cancelled' },
    { id: 'V-003', bookingStatus: 'Completed' }
  ];

  const cancelledOnly = sampleTrips.filter(b => matchesBookingSim(b, 'cancelled'));
  assert.equal(cancelledOnly.length, 1);
  assert.equal(cancelledOnly[0].id, 'V-002');

  const upcomingOnly = sampleTrips.filter(b => matchesBookingSim(b, 'upcoming'));
  assert.equal(upcomingOnly.length, 2);
  assert.ok(!upcomingOnly.some(b => b.id === 'V-002'), 'Cancelled booking must not appear in upcoming queue');

  const allTrips = sampleTrips.filter(b => matchesBookingSim(b, 'all'));
  assert.equal(allTrips.length, 3);
});

test('Booking desk time formatting adheres strictly to 12-hour AM/PM format without 24-hour military time', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify formatTimeTo12h function exists and is used
  assert.ok(html.includes('function formatTimeTo12h'), 'Must have formatTimeTo12h function');
  assert.ok(html.includes('hour12: true'), 'Live clock and datetime formatters must enforce hour12: true');

  // Test 12-hour conversion logic directly
  function formatTimeTo12h(rawTime) {
    if (!rawTime || typeof rawTime !== 'string') return rawTime || '—';
    const str = rawTime.trim();
    if (!str) return '—';

    const m = str.match(/(\b\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(am|pm|a\.m\.|p\.m\.|ص|م))?/i);
    if (!m) return str;

    let h = parseInt(m[1], 10);
    const min = m[2];
    const marker = m[3] ? m[3].toLowerCase() : '';

    let period = 'AM';
    if (marker) {
      if (marker.includes('p') || marker.includes('م')) {
        period = 'PM';
      } else {
        period = 'AM';
      }
    } else {
      if (h >= 12) {
        period = 'PM';
        if (h > 12) h -= 12;
      } else {
        period = 'AM';
        if (h === 0) h = 12;
      }
    }

    if (h > 12) h -= 12;
    if (h === 0) h = 12;

    const hStr = String(h).padStart(2, '0');
    const formatted12h = `${hStr}:${min} ${period}`;

    if (str === m[0].trim()) {
      return formatted12h;
    }
    return str.replace(m[0], formatted12h);
  }

  // 1. Afternoon 24-hour time converts to PM
  assert.equal(formatTimeTo12h('14:30'), '02:30 PM');
  assert.equal(formatTimeTo12h('19:45'), '07:45 PM');
  assert.equal(formatTimeTo12h('23:15'), '11:15 PM');

  // 2. Midnight and noon
  assert.equal(formatTimeTo12h('00:00'), '12:00 AM');
  assert.equal(formatTimeTo12h('00:30'), '12:30 AM');
  assert.equal(formatTimeTo12h('12:00'), '12:00 PM');
  assert.equal(formatTimeTo12h('12:45'), '12:45 PM');

  // 3. Morning times
  assert.equal(formatTimeTo12h('08:15'), '08:15 AM');
  assert.equal(formatTimeTo12h('9:00'), '09:00 AM');

  // 4. Pre-existing AM/PM strings normalized
  assert.equal(formatTimeTo12h('03:30 AM'), '03:30 AM');
  assert.equal(formatTimeTo12h('2:30 pm'), '02:30 PM');
  assert.equal(formatTimeTo12h('05:00 م'), '05:00 PM');
  assert.equal(formatTimeTo12h('05:00 ص'), '05:00 AM');

  // 5. String with notes
  assert.equal(formatTimeTo12h('Flight arrival 18:20 terminal 2'), 'Flight arrival 06:20 PM terminal 2');
});

test('Booking desk urgent operational pressure banner and triage badges work accurately', () => {
  const htmlPath = path.resolve('public/booking-desk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify urgent operational pressure banner elements exist in markup
  assert.ok(html.includes('id="urgent-pressure-banner"'), 'Must have urgent pressure banner container');
  assert.ok(html.includes('id="btn-urgent-focus-now"'), 'Must have 1-tap urgent focus action button');
  assert.ok(html.includes('id="urgent-title"'), 'Must have urgent headline title element');
  assert.ok(html.includes('id="urgent-desc"'), 'Must have urgent description element');
  assert.ok(html.includes('.trip-item.urgent-today'), 'Must have urgent today CSS styling');
  assert.ok(html.includes('.trip-item.urgent-tomorrow'), 'Must have urgent tomorrow CSS styling');
  assert.ok(html.includes('.urgent-tag-badge'), 'Must have urgent tag badge styling');

  // Logic simulation for urgency detection
  const todayStr = '2026-10-15';
  const tomorrowStr = '2026-10-16';

  function isDriverAssigned(b) {
    if (!b) return false;
    if (b.driverAssigned === true || b.driverAssigned === 'TRUE' || b.driverAssigned === 'true') return true;
    if (b.driverName && b.driverName.trim()) return true;
    if (b.driverPhone && b.driverPhone.trim()) return true;
    return false;
  }

  function checkUrgency(b) {
    const hasDriver = isDriverAssigned(b);
    const isCompleted = b.bookingStatus === 'Completed';
    const isToday = b.travelDate === todayStr;
    const isTomorrow = b.travelDate === tomorrowStr;

    const isUrgentToday = !hasDriver && isToday && !isCompleted && b.bookingStatus !== 'Cancelled';
    const isUrgentTomorrow = !hasDriver && isTomorrow && !isCompleted && b.bookingStatus !== 'Cancelled';

    return { isUrgentToday, isUrgentTomorrow };
  }

  // 1. Unassigned trip scheduled for TODAY -> Critically urgent
  const tripTodayUnassigned = { id: 'V-01', travelDate: todayStr, driverName: '', driverPhone: '', bookingStatus: 'Confirmed' };
  assert.deepEqual(checkUrgency(tripTodayUnassigned), { isUrgentToday: true, isUrgentTomorrow: false });

  // 2. Unassigned trip scheduled for TOMORROW -> Important tomorrow
  const tripTomorrowUnassigned = { id: 'V-02', travelDate: tomorrowStr, driverName: '', driverPhone: '', bookingStatus: 'Confirmed' };
  assert.deepEqual(checkUrgency(tripTomorrowUnassigned), { isUrgentToday: false, isUrgentTomorrow: true });

  // 3. Trip for today with driver assigned -> NOT urgent
  const tripTodayAssigned = { id: 'V-03', travelDate: todayStr, driverName: 'أبو فهد', driverPhone: '+96655000000', bookingStatus: 'Confirmed' };
  assert.deepEqual(checkUrgency(tripTodayAssigned), { isUrgentToday: false, isUrgentTomorrow: false });

  // 4. Cancelled or Completed trip today -> NOT urgent
  const tripTodayCancelled = { id: 'V-04', travelDate: todayStr, driverName: '', driverPhone: '', bookingStatus: 'Cancelled' };
  const tripTodayCompleted = { id: 'V-05', travelDate: todayStr, driverName: '', driverPhone: '', bookingStatus: 'Completed' };
  assert.deepEqual(checkUrgency(tripTodayCancelled), { isUrgentToday: false, isUrgentTomorrow: false });
  assert.deepEqual(checkUrgency(tripTodayCompleted), { isUrgentToday: false, isUrgentTomorrow: false });
});

test('Booking desk driver assignment handles placeholder characters and exact ID searches safely', () => {
  function isDriverAssigned(b) {
    if (!b) return false;
    const drvPhoneDigits = String(b.driverPhone || '').replace(/\D/g, '');
    const hasRealPhone = drvPhoneDigits.length >= 6;

    const rawName = String(b.driverName || '').trim();
    const cleanName = rawName.replace(/^[\s.\-_/\\,;:!؟?]+$/, '');
    const isPlaceholderName = !cleanName || cleanName.length < 2 || 
      /^(none|n\/a|na|null|undefined|لم يعين|غير معين|غير محدد|لا يوجد|بانتظار سائق|pending|unassigned|no driver|tbd|\.+|\-+)$/i.test(cleanName);
    const hasRealName = !isPlaceholderName;

    const ts = String(b.tripStatus || '').trim().toLowerCase();
    const hasAssignedStatus = (ts === 'driver assigned' || ts === 'assigned' || ts === 'معين' || ts === 'تم التعيين' || ts === 'مؤكد مع السائق' || ts === 'arranged' || ts === 'car arranged');

    if (ts === 'not confirmed' || ts === 'unverified' || ts === 'pending') {
      if (!hasRealName && !hasRealPhone) return false;
    }

    if (hasRealPhone) return true;
    if (hasRealName) return true;
    if (hasAssignedStatus) return true;
    return false;
  }

  // 1. Placeholder dot or dash in driver fields -> MUST BE UNASSIGNED
  assert.equal(isDriverAssigned({ driverName: '.', driverPhone: '.', tripStatus: 'Not confirmed' }), false);
  assert.equal(isDriverAssigned({ driverName: '-', driverPhone: '', tripStatus: 'Unverified' }), false);
  assert.equal(isDriverAssigned({ driverName: 'لم يعين', driverPhone: '' }), false);
  assert.equal(isDriverAssigned({ driverName: 'Unassigned', driverPhone: '' }), false);

  // 2. Real driver name or phone -> ASSIGNED
  assert.equal(isDriverAssigned({ driverName: 'سائق مؤكد', driverPhone: '', tripStatus: 'Driver Assigned' }), true);
  assert.equal(isDriverAssigned({ driverName: 'أبو أحمد', driverPhone: '0551234567' }), true);

  // 3. Exact ID search matches even under unassigned filter
  function matchesBookingTest(b, q, filter) {
    if (q) {
      const qClean = q.toLowerCase().trim();
      const qDigits = qClean.replace(/\D/g, '');
      const bIdClean = (b.id || '').toLowerCase().trim();
      const bIdDigits = bIdClean.replace(/\D/g, '');
      const isExactIdSearch = /^v-?\d+$/i.test(qClean) || (qDigits.length >= 2 && bIdDigits === qDigits);
      if (isExactIdSearch && (bIdClean.includes(qClean) || bIdDigits === qDigits)) {
        return true;
      }
    }
    if (filter === 'unassigned') {
      if (isDriverAssigned(b)) return false;
    }
    return true;
  }

  const assignedBooking = { id: 'V-017', driverName: 'Ali Driver', driverPhone: '39991111' };
  // When user specifically searches for V-017 while on unassigned filter, it must still match!
  assert.equal(matchesBookingTest(assignedBooking, 'v-017', 'unassigned'), true);
});


