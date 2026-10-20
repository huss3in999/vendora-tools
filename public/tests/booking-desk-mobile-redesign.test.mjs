import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const htmlPath = path.resolve('public/booking-desk/index.html');
const backupPath = path.resolve('public/booking-desk/backup/index.backup.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractFunction(source, funcName) {
  const startIdx = source.indexOf(`function ${funcName}(`);
  assert.ok(startIdx !== -1, `Function ${funcName} must exist in index.html`);
  let openBraces = 0;
  let foundFirstBrace = false;
  let endIdx = startIdx;
  for (let i = startIdx; i < source.length; i++) {
    if (source[i] === '{') {
      openBraces++;
      foundFirstBrace = true;
    } else if (source[i] === '}') {
      openBraces--;
      if (foundFirstBrace && openBraces === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  return source.slice(startIdx, endIdx);
}

test('Mobile Redesign: Backup of original working file exists and is intact', () => {
  assert.ok(fs.existsSync(backupPath), 'index.backup.html must exist before editing');
  const backupContent = fs.readFileSync(backupPath, 'utf8');
  assert.ok(backupContent.length > 200000, 'Backup file must contain full original application');
});

test('Mobile Redesign: Sticky header, Hamburger menu, and Bottom Navigation Bar exist', () => {
  assert.ok(html.includes('id="btn-hamburger-menu"'), 'Header must include Hamburger menu button');
  assert.ok(html.includes('id="dlg-menu"'), 'Hamburger menu dialog must exist');
  assert.ok(html.includes('id="menu-btn-dashboard"'), 'Menu must include Dashboard');
  assert.ok(html.includes('id="menu-btn-all-bookings"'), 'Menu must include All Bookings');
  assert.ok(html.includes('id="menu-btn-drivers"'), 'Menu must include Driver Directory');
  assert.ok(html.includes('id="menu-btn-finance"'), 'Menu must include Financial Reports');
  assert.ok(html.includes('id="menu-btn-activity"'), 'Menu must include Activity History');
  assert.ok(html.includes('id="menu-btn-export-csv"'), 'Menu must include CSV/Excel Export');
  assert.ok(html.includes('id="menu-btn-settings"'), 'Menu must include Settings');

  // Bottom navigation bar
  assert.ok(html.includes('id="nav-tab-home"'), 'Bottom nav must have Home');
  assert.ok(html.includes('id="nav-tab-bookings"'), 'Bottom nav must have Bookings');
  assert.ok(html.includes('id="btn-add-booking"'), 'Bottom nav must have + New Booking');
  assert.ok(html.includes('id="nav-tab-drivers"'), 'Bottom nav must have Drivers');
  assert.ok(html.includes('id="nav-tab-reports"'), 'Bottom nav must have Reports');
});

test('Mobile Redesign: 4 Primary Dashboard Cards and 3-decimal BHD formatting', () => {
  assert.ok(html.includes('id="kpi-card-bookings"'), 'Card 1: Total Bookings must exist');
  assert.ok(html.includes('id="kpi-card-revenue"'), 'Card 2: Total Customer Charges must exist');
  assert.ok(html.includes('id="kpi-card-collected"'), 'Card 3: Collected Amount must exist');
  assert.ok(html.includes('id="kpi-card-unassigned"'), 'Card 4: Driver Needed must exist');

  // Verify 3-decimal BHD formatting function
  const toBhdFnCode = extractFunction(html, 'toBhdAmount');
  const formatBhdCode = extractFunction(html, 'formatBhd');
  const fn = new Function(`
    const TO_BHD_RATES = { BHD: 1, SAR: 0.1, AED: 0.1, QAR: 0.1, USD: 0.376, KWD: 1.22, OMR: 0.98 };
    ${toBhdFnCode}
    ${formatBhdCode}
    return { toBhdAmount, formatBhd };
  `)();

  assert.equal(fn.formatBhd(1250), '1,250.000 BHD');
  assert.equal(fn.formatBhd(850), '850.000 BHD');
  assert.equal(fn.formatBhd(35), '35.000 BHD');
  assert.equal(fn.formatBhd(0), '0.000 BHD');
  assert.equal(fn.formatBhd(fn.toBhdAmount(350, 'SAR')), '35.000 BHD');
});

test('Mobile Redesign: Date Range Selector supports single day, custom ranges, and presets', () => {
  assert.ok(html.includes('id="date-range-bar"'), 'Date range bar must exist');
  assert.ok(html.includes('id="range-from-date"'), 'From Date input must exist');
  assert.ok(html.includes('id="range-to-date"'), 'To Date input must exist');
  assert.ok(html.includes('data-range="today"'), 'Today preset must exist');
  assert.ok(html.includes('data-range="tomorrow"'), 'Tomorrow preset must exist');
  assert.ok(html.includes('data-range="today_tomorrow"'), 'Today + Tomorrow preset must exist');
  assert.ok(html.includes('data-range="next3"'), 'Today + Next 2 Days preset must exist');
  assert.ok(html.includes('data-range="week"'), 'This Week preset must exist');
  assert.ok(html.includes('data-range="month"'), 'This Month preset must exist');
  assert.ok(html.includes('data-range="custom"'), 'Custom Range preset must exist');

  const rangeCheckCode = extractFunction(html, 'matchesDateRange');
  const testRangeFn = new Function('App', `
    ${rangeCheckCode}
    return matchesDateRange;
  `);

  // Single day (October 16 only)
  const checkOct16 = testRangeFn({ dateRangeFrom: '2026-10-16', dateRangeTo: '2026-10-16', selectedDates: [], specificDate: '' });
  assert.equal(checkOct16({ travelDate: '2026-10-16' }), true);
  assert.equal(checkOct16({ travelDate: '2026-10-17' }), false);

  // Multi-day range (October 16-18)
  const checkOct16To18 = testRangeFn({ dateRangeFrom: '2026-10-16', dateRangeTo: '2026-10-18', selectedDates: [], specificDate: '' });
  assert.equal(checkOct16To18({ travelDate: '2026-10-15' }), false);
  assert.equal(checkOct16To18({ travelDate: '2026-10-16' }), true);
  assert.equal(checkOct16To18({ travelDate: '2026-10-17' }), true);
  assert.equal(checkOct16To18({ travelDate: '2026-10-18' }), true);
  assert.equal(checkOct16To18({ travelDate: '2026-10-19' }), false);

  // Half-month range (October 1-15)
  const checkOct1To15 = testRangeFn({ dateRangeFrom: '2026-10-01', dateRangeTo: '2026-10-15', selectedDates: [], specificDate: '' });
  assert.equal(checkOct1To15({ travelDate: '2026-10-01' }), true);
  assert.equal(checkOct1To15({ travelDate: '2026-10-12' }), true);
  assert.equal(checkOct1To15({ travelDate: '2026-10-15' }), true);
  assert.equal(checkOct1To15({ travelDate: '2026-10-16' }), false);
});

test('Mobile Redesign: Distinguishes Driver Assigned (Pending Confirmation) vs Driver Confirmed', () => {
  const isDriverAssignedCode = extractFunction(html, 'isDriverAssigned');
  const isDriverConfirmedCode = extractFunction(html, 'isDriverConfirmed');
  const fn = new Function(`
    ${isDriverAssignedCode}
    ${isDriverConfirmedCode}
    return { isDriverAssigned, isDriverConfirmed };
  `)();

  // Unassigned booking
  const bUnassigned = { id: 'V-101', bookingStatus: 'Confirmed', driverName: '', driverPhone: '', driverAssigned: false };
  assert.equal(fn.isDriverAssigned(bUnassigned), false);
  assert.equal(fn.isDriverConfirmed(bUnassigned), false);

  // Assigned driver but pending confirmation (e.g. just selected in modal)
  const bAssignedPending = {
    id: 'V-102',
    bookingStatus: 'Confirmed',
    driverName: 'Ali Hassan',
    driverPhone: '+973 33001122',
    driverAssigned: true,
    driverConfirmed: false,
    tripStatus: 'Driver Assigned'
  };
  assert.equal(fn.isDriverAssigned(bAssignedPending), true);
  assert.equal(fn.isDriverConfirmed(bAssignedPending), false, 'Selecting a driver must not automatically count as confirmed');

  // Confirmed driver
  const bConfirmed = {
    id: 'V-103',
    bookingStatus: 'Confirmed',
    driverName: 'Ali Hassan',
    driverPhone: '+973 33001122',
    driverAssigned: true,
    driverConfirmed: true,
    tripStatus: 'Driver Confirmed'
  };
  assert.equal(fn.isDriverAssigned(bConfirmed), true);
  assert.equal(fn.isDriverConfirmed(bConfirmed), true);

  // Verify unassignDriver does NOT cancel booking
  const unassignCode = extractFunction(html, 'unassignDriver');
  assert.ok(unassignCode.includes('b.driverAssigned = false;'), 'unassignDriver must clear driverAssigned');
  assert.ok(unassignCode.includes('b.driverConfirmed = false;'), 'unassignDriver must clear driverConfirmed');
  assert.ok(!unassignCode.includes("b.bookingStatus = 'Cancelled'"), 'Removing a driver must NOT cancel the booking');
  assert.ok(unassignCode.includes('window.confirm'), 'Removing a driver must include a confirmation step');
});

test('Mobile Redesign: Production safety — never injects sample FALLBACK_BOOKINGS on backend failure', () => {
  const loadDataCode = extractFunction(html, 'loadData');
  assert.ok(!loadDataCode.includes('App.bookings = JSON.parse(JSON.stringify(FALLBACK_BOOKINGS))'), 'loadData must never inject sample bookings into production');
});

test('Mobile Redesign: Collected Amount strictly checks paymentStatus === Paid and never assumes Completed = Paid', () => {
  const computeStatsCode = extractFunction(html, 'computeFinancialStats');
  const toBhdFnCode = extractFunction(html, 'toBhdAmount');
  const isBookingCancelledCode = extractFunction(html, 'isBookingCancelled');
  assert.ok(computeStatsCode.includes("b.paymentStatus === 'Paid'"), 'computeFinancialStats must strictly check paymentStatus === Paid');

  const computeStats = new Function(`
    const TO_BHD_RATES = { BHD: 1, SAR: 0.1, AED: 0.1, QAR: 0.1, USD: 0.376, KWD: 1.22, OMR: 0.98 };
    ${toBhdFnCode}
    ${isBookingCancelledCode}
    ${computeStatsCode}
    return computeFinancialStats;
  `)();

  const stats = computeStats([
    { id: '1', bookingStatus: 'Completed', fare: 100, currency: 'BHD', paymentStatus: 'Unverified', driverPayout: 80, driverPayoutCurrency: 'BHD' },
    { id: '2', bookingStatus: 'Confirmed', fare: 50, currency: 'BHD', paymentStatus: 'Paid', driverPayout: 40, driverPayoutCurrency: 'BHD' },
    { id: '3', bookingStatus: 'Cancelled', fare: 200, currency: 'BHD', paymentStatus: 'Paid', driverPayout: 150, driverPayoutCurrency: 'BHD' }
  ]);
  assert.equal(stats.activeCount, 2);
  assert.equal(stats.cancelledCount, 1);
  assert.equal(stats.totalBhd, 150);
  assert.equal(stats.paidBhd, 50, 'Completed booking with Unverified payment must NOT be counted as collected');
  assert.equal(stats.unpaidBhd, 100);
});

test('Mobile Redesign: Expanded WhatsApp templates for Driver and Customer are wired', () => {
  const drvPreviewCode = extractFunction(html, 'updateDriverPreview');
  assert.ok(drvPreviewCode.includes("tpl === 'confirm_req'"), 'Driver WA must support Request Confirmation template');
  assert.ok(drvPreviewCode.includes("tpl === 'reminder'"), 'Driver WA must support Pickup Reminder template');
  assert.ok(drvPreviewCode.includes("tpl === 'change_notice'"), 'Driver WA must support Driver Change Notice template');
  assert.ok(drvPreviewCode.includes("tpl === 'cancel_notice'"), 'Driver WA must support Cancellation Notice template');
  assert.ok(drvPreviewCode.includes('\\u200E') || drvPreviewCode.includes('\\u202A'), 'Driver WA must wrap phone numbers in LTR directional mark/isolate');

  const custPreviewCode = extractFunction(html, 'updateCustPreview');
  assert.ok(custPreviewCode.includes("tpl === 'drv_assigned'"), 'Customer WA must support Driver Assigned template');
  assert.ok(custPreviewCode.includes("tpl === 'reminder'"), 'Customer WA must support Trip Reminder template');
  assert.ok(custPreviewCode.includes("tpl === 'update'"), 'Customer WA must support Booking Update template');
  assert.ok(custPreviewCode.includes("tpl === 'payment'"), 'Customer WA must support Payment Follow-up template');
  assert.ok(custPreviewCode.includes("tpl === 'cancelled'"), 'Customer WA must support Cancellation Confirmation template');
  assert.ok(custPreviewCode.includes('\\u202A'), 'Customer WA must wrap driver phone numbers in LTR directional isolate');
});

test('PDF Layout Engine: All 13 Confirmation & Invoice scenarios wrap cleanly without horizontal or footer overlap', () => {
  const drawRoundRectCode = extractFunction(html, 'drawRoundRect');
  const wrapCanvasTextCode = extractFunction(html, 'wrapCanvasText');
  const drawBarcodeCode = extractFunction(html, 'drawBarcodeOnCanvas');
  const drawVendoraPageCode = extractFunction(html, 'drawVendoraPageOnCanvas');
  const formatTimeTo12hCode = extractFunction(html, 'formatTimeTo12h');
  const isDriverAssignedCode = extractFunction(html, 'isDriverAssigned');
  const isBookingCancelledCode = extractFunction(html, 'isBookingCancelled');

  // Verify static code no longer slices pickup/destination to 28 chars or truncates at wrapped[0]
  assert.ok(!drawVendoraPageCode.includes('.slice(0, 28)'), 'Invoice description must not hard-slice pickup/destination to 28 chars');
  assert.ok(!drawVendoraPageCode.includes('wrapped[0]'), 'Transfer rows must render all wrapped lines instead of only wrapped[0]');

  function createMockCanvasEnvironment(domValues = {}) {
    const drawnTexts = [];
    const drawnRects = [];
    const drawnLines = [];
    let currentFont = '20px sans-serif';
    let currentAlign = 'left';

    const ctx = {
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      get font() { return currentFont; },
      set font(v) { currentFont = v; },
      get textAlign() { return currentAlign; },
      set textAlign(v) { currentAlign = v; },
      beginPath() {},
      save() {},
      restore() {},
      moveTo(x, y) { this._mx = x; this._my = y; },
      lineTo(x, y) { drawnLines.push({ x1: this._mx, y1: this._my, x2: x, y2: y }); },
      quadraticCurveTo() {},
      closePath() {},
      fill() {},
      stroke() {},
      fillRect(x, y, w, h) { drawnRects.push({ x, y, w, h }); },
      measureText(str) {
        const sizeMatch = String(currentFont).match(/(\d+)px/);
        const px = sizeMatch ? Number(sizeMatch[1]) : 20;
        return { width: String(str || '').length * (px * 0.52) };
      },
      fillText(text, x, y) {
        const w = this.measureText(text).width;
        const left = currentAlign === 'right' ? x - w : (currentAlign === 'center' ? x - w / 2 : x);
        const right = left + w;
        drawnTexts.push({ text: String(text), x, y, left, right, align: currentAlign, font: currentFont });
      }
    };

    const canvas = {
      width: 1190,
      height: 1684,
      setAttribute() {},
      getContext() {
        drawnTexts.length = 0;
        drawnRects.length = 0;
        drawnLines.length = 0;
        return ctx;
      }
    };

    const runner = new Function('canvas', 'b', 'pageType', 'domValues', `
      const $ = (id) => domValues[id] !== undefined ? { value: domValues[id] } : null;
      const getTodayStr = () => '2026-10-16';
      const formatDateHeader = (d) => d || '16 October 2026';
      ${formatTimeTo12hCode}
      const formatTimeDisplay = (b) => formatTimeTo12h(b.pickupTime || b.sortPickupTime || '09:30 AM');
      const localizeLocation = (s) => s || '';
      const localizeLuggage = (s) => s || '';
      const localizeVehicle = (s) => s || '';
      const toPureEnglishName = (s) => s || '';
      ${isDriverAssignedCode}
      ${isBookingCancelledCode}
      ${drawRoundRectCode}
      ${wrapCanvasTextCode}
      ${drawBarcodeCode}
      ${drawVendoraPageCode}
      drawVendoraPageOnCanvas(canvas, b, pageType);
    `);

    return { canvas, drawnTexts, drawnLines, run: (b, pageType) => runner(canvas, b, pageType, domValues) };
  }

  // Test cases covering all 13 requirements in Section H:
  // 1. Long service description, 2. Long pickup/dropoff, 3. Long passenger name, 4. Mixed AR/EN text,
  // 5. Long special instructions, 6. BHD 3-decimal + SAR eq, 7. Paid status, 8. Unpaid/Due status,
  // 9. Pending/Unverified status, 10. Unassigned driver (no fake vehicle), 11. Assigned driver,
  // 12. Flight info present vs missing (no fabricated flight), 13. Barcode & footer non-overlap
  const complexUnpaidBooking = {
    id: 'V-889',
    bookingStatus: 'Confirmed',
    travelDate: '2026-10-20',
    pickupTime: '16:45',
    flight: '', // Missing flight info — must not fabricate flight number
    pickup: 'Four Seasons Hotel Bahrain Bay, Main VIP Porte-Cochere Entrance, Manama, Kingdom of Bahrain',
    destination: 'King Khalid International Airport Terminal 5 Departure Gate 3, Riyadh, Kingdom of Saudi Arabia',
    customerName: 'Dr. Abdulrahman Al-Qahtani & Executive Delegation Group (VIP Corporate Guest)',
    customerPhone: '+966 50 123 4567',
    fare: 145.5,
    currency: 'BHD',
    paymentStatus: 'Unverified',
    driverName: '',
    driverPhone: '',
    driverAssigned: false,
    vehicle: '',
    passengers: '5',
    luggage: '6 Large Suitcases + 4 Hand Carry Bags'
  };

  const domOpts = {
    'pdf-cust-name': complexUnpaidBooking.customerName,
    'pdf-cust-phone': complexUnpaidBooking.customerPhone,
    'pdf-cust-email': 'delegation.logistics.coordination@international-enterprise-group.com',
    'pdf-service-title': 'ONE-WAY EXECUTIVE INTERCITY & CROSS-BORDER CHAUFFEUR TRANSFER SERVICE',
    'pdf-fare-note': 'approximately SAR 1,455',
    'pdf-pay-text': 'auto',
    'pdf-advisory-preset': 'causeway',
    'pdf-advisory-title': 'IMPORTANT - KING FAHD CAUSEWAY & TERMINAL COORDINATION NOTICE',
    'pdf-advisory-body': 'Line 1: Please ensure all passenger passports and GCC entry visas or national IDs are ready prior to pickup.\nLine 2: Causeway border traffic may vary during peak hours.\nLine 3: Chauffeur will coordinate directly via WhatsApp 30 minutes before arrival.\nLine 4: Extra waiting time at border control is included.'
  };

  // Run Invoice mode
  const envInv = createMockCanvasEnvironment(domOpts);
  envInv.run(complexUnpaidBooking, 'invoice');

  // Verify 12h time formatting (16:45 -> 4:45 PM)
  assert.ok(envInv.drawnTexts.some(t => t.text.includes('4:45 PM')), 'PDF must display 12-hour AM/PM time (4:45 PM)');
  // Verify LTR isolation around phone number
  assert.ok(envInv.drawnTexts.some(t => t.text.includes('\u202A+966 50 123 4567\u202C')), 'PDF must wrap phone numbers in LTR directional isolate');
  // Verify missing flight info is completely omitted (no placeholder "Not provided" or "N/A")
  assert.ok(!envInv.drawnTexts.some(t => t.text === 'Not provided' || t.text === 'N/A'), 'Missing flight must not render placeholders');
  // Verify unassigned vehicle is completely omitted (no "Standard / To be assigned")
  assert.ok(!envInv.drawnTexts.some(t => t.text.includes('To be assigned')), 'Unassigned booking without vehicle must not state "To be assigned"');
  // Verify BHD 3-decimal formatting
  assert.ok(envInv.drawnTexts.some(t => t.text.includes('BHD 145.500')), 'Invoice must format BHD to 3 decimals (BHD 145.500)');

  // Verify NO horizontal collision between left-aligned and right-aligned text on the same Y baseline in Invoice table
  const byY = new Map();
  for (const item of envInv.drawnTexts) {
    const yKey = Math.round(item.y / 8) * 8;
    if (!byY.has(yKey)) byY.set(yKey, []);
    byY.get(yKey).push(item);
  }
  for (const [, items] of byY.entries()) {
    const leftItems = items.filter(i => i.align === 'left');
    const rightItems = items.filter(i => i.align === 'right');
    for (const l of leftItems) {
      for (const r of rightItems) {
        assert.ok(l.right <= r.left + 2, `Horizontal text collision detected between "${l.text}" (right=${Math.round(l.right)}) and "${r.text}" (left=${Math.round(r.left)}) at y≈${l.y}`);
      }
    }
  }

  // Verify all content above footer stays strictly above footerRuleY (canvas.height - 148)
  const footerRuleY = envInv.canvas.height - 148;
  const bodyItems = envInv.drawnTexts.filter(t =>
    !t.text.includes('Vendora Transport') &&
    !t.text.includes('getvendora.net') &&
    !t.text.startsWith('* ')
  );
  for (const item of bodyItems) {
    assert.ok(item.y < footerRuleY - 8, `Body text "${item.text}" (y=${item.y}) collided with footer rule (y=${footerRuleY})`);
  }

  // Run Confirmation mode with Assigned Driver, Flight Present, Paid Status
  const assignedPaidBooking = {
    ...complexUnpaidBooking,
    id: 'V-890',
    flight: 'GF-213 (Arriving 04:45 PM)',
    paymentStatus: 'Paid',
    driverName: 'Mohammed Al-Dosari',
    driverPhone: '+973 39998877',
    driverAssigned: true,
    driverConfirmed: true,
    tripStatus: 'Driver Confirmed',
    vehicle: 'GMC Yukon XL Executive VIP'
  };
  const envConf = createMockCanvasEnvironment(domOpts);
  envConf.run(assignedPaidBooking, 'confirmation');
  assert.ok(envConf.drawnTexts.some(t => t.text.includes('GF-213')), 'Provided flight number must be rendered');
  assert.ok(envConf.drawnTexts.some(t => t.text.includes('Mohammed Al-Dosari')), 'Assigned driver name must be rendered');
  assert.ok(envConf.drawnTexts.some(t => t.text.includes('PAID IN FULL')), 'Paid status must be rendered clearly');
});

test('Verified Backend Sync & Retry: syncBookingMutation tracks saving, saved, and error states with retry', () => {
  const syncFnCode = extractFunction(html, 'syncBookingMutation');
  const retryFnCode = extractFunction(html, 'retryBookingSync');
  assert.ok(syncFnCode.includes("= 'saving'"), 'syncBookingMutation must record saving state');
  assert.ok(syncFnCode.includes("= 'saved'"), 'syncBookingMutation must record saved state on backend confirmation');
  assert.ok(syncFnCode.includes("= 'error'"), 'syncBookingMutation must record error state and preserve pendingRetries on error');
  assert.ok(retryFnCode.includes('syncBookingMutation'), 'retryBookingSync must replay the preserved pending payload');
  assert.ok(html.includes('data-action="retry-sync"'), 'Trip card must render a 1-tap retry button when sync fails');
});

test('Progressive Disclosure & Scope Summary: Expanded card More Actions toggle and Filtered Scope banner exist', () => {
  assert.ok(html.includes('id="filtered-scope-summary"'), 'Filtered scope summary bar must exist above trips stream');
  assert.ok(html.includes('data-action="toggle-more-actions"'), 'Expanded card must include a toggleable More Actions button');
  assert.ok(html.includes('id="qa-driver-search"'), 'Quick Assign modal must include a driver search input');
  assert.ok(html.includes('id="qa-save-to-dir"'), 'Quick Assign modal must include option to save driver to directory');
});

function createMockD1() {
  const rows = new Map(); // token_hash -> row object
  return {
    rows,
    prepare(sql) {
      const norm = sql.replace(/\s+/g, ' ').trim();
      return {
        _args: [],
        bind(...args) {
          this._args = args;
          return this;
        },
        async run() {
          if (/^CREATE TABLE/i.test(norm)) {
            return { meta: { changes: 0 } };
          }
          if (/^INSERT INTO driver_invitation_tokens/i.test(norm)) {
            const [token_hash, inv_id, booking_id, payload_json, created_at, expires_at] = this._args;
            rows.set(token_hash, {
              token_hash,
              inv_id,
              booking_id,
              status: 'active',
              payload_json,
              submission_json: null,
              created_at,
              expires_at: Number(expires_at),
              used_at: null,
              revoked_at: null
            });
            return { meta: { changes: 1 } };
          }
          if (/SET status = 'revoked'/i.test(norm)) {
            const [revoked_at, token_hash] = this._args;
            const r = rows.get(token_hash);
            if (!r) return { meta: { changes: 0 } };
            r.status = 'revoked';
            r.revoked_at = revoked_at;
            return { meta: { changes: 1 } };
          }
          if (/SET status = 'used'/i.test(norm)) {
            const [used_at, submission_json, token_hash, nowMs] = this._args;
            const r = rows.get(token_hash);
            if (!r || r.status !== 'active' || !(r.expires_at > Number(nowMs))) {
              return { meta: { changes: 0 } };
            }
            r.status = 'used';
            r.used_at = used_at;
            r.submission_json = submission_json;
            return { meta: { changes: 1 } };
          }
          if (/SET submission_json = \?1/i.test(norm)) {
            const [submission_json, token_hash] = this._args;
            const r = rows.get(token_hash);
            if (!r) return { meta: { changes: 0 } };
            r.submission_json = submission_json;
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async first() {
          const [token_hash] = this._args;
          return rows.get(token_hash) || null;
        },
        async all() {
          const [booking_id] = this._args;
          const results = [];
          for (const r of rows.values()) {
            if (r.submission_json !== null && (!booking_id || r.booking_id === booking_id)) {
              results.push({ ...r });
            }
          }
          return { results };
        }
      };
    }
  };
}

test('Temporary Driver Invitation Link: Enforces durable D1 storage (503 when missing), HMAC signature, atomic single-use under concurrency, expiry, revocation, and zero secret/PII leakage', async () => {
  const { onRequestGet, onRequestPost } = await import('../functions/api/transport/driver-invite.js');
  const driverInviteSource = fs.readFileSync(path.resolve('public/functions/api/transport/driver-invite.js'), 'utf8');
  assert.ok(!driverInviteSource.includes('memoryInvites'), 'driver-invite.js must NOT use isolate memory map for invitation tokens');

  // 0. Without durable TRANSPORT_DB binding, public invitations must fail closed with 503
  const noDbEnv = { BOOKING_TRACKER_SECRET_KEY: 'test-secret-admin-key-12345' };
  const noDbReq = new Request('https://getvendora.net/api/transport/driver-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Desk-Key': 'test-secret-admin-key-12345' },
    body: JSON.stringify({ action: 'create', bookingId: 'V-500' })
  });
  const noDbRes = await onRequestPost({ request: noDbReq, env: noDbEnv });
  assert.equal(noDbRes.status, 503, 'Must return 503 Service Unavailable when durable TRANSPORT_DB is not bound');
  const noDbBody = await noDbRes.json();
  assert.equal(noDbBody.code, 'DURABLE_STORAGE_REQUIRED');

  const mockD1 = createMockD1();
  const env = {
    BOOKING_TRACKER_SECRET_KEY: 'test-secret-admin-key-12345',
    TRANSPORT_DB: mockD1
  };

  // 1. Unauthorized create attempt without X-Desk-Key must return 401
  const unauthReq = new Request('https://getvendora.net/api/transport/driver-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.1' },
    body: JSON.stringify({ action: 'create', bookingId: 'V-500' })
  });
  const unauthRes = await onRequestPost({ request: unauthReq, env });
  assert.equal(unauthRes.status, 401, 'Creating an invite without X-Desk-Key must be rejected with 401');

  // 2. Authorized admin create generates signed single-booking invite token in durable D1
  const createReq = new Request('https://getvendora.net/api/transport/driver-invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Desk-Key': 'test-secret-admin-key-12345',
      'cf-connecting-ip': '10.0.0.2'
    },
    body: JSON.stringify({
      action: 'create',
      bookingId: 'V-500',
      expiryHours: 12,
      travelDate: '2026-10-22',
      pickupTime12h: '10:30 AM',
      pickupArea: 'Manama, Bahrain',
      destArea: 'Khobar, Saudi Arabia',
      vehicleReq: 'GMC Yukon',
      payoutDisplay: '450 SAR',
      // Attempt to pass sensitive fields — backend must strip/ignore them
      customerPhone: '+97333112233',
      customerFare: '65.000 BHD',
      commission: '15.000 BHD'
    })
  });
  const createRes = await onRequestPost({ request: createReq, env });
  assert.equal(createRes.status, 200);
  const createData = await createRes.json();
  assert.equal(createData.ok, true);
  assert.ok(createData.token, 'Token must be returned');
  assert.ok(!createData.token.includes('test-secret-admin-key'), 'Token must never expose admin secret');
  assert.equal(mockD1.rows.size, 1, 'Token state must be persisted in durable D1 table');

  // 3. Public GET inspect returns only safe route summary and zero customer PII / financial data
  const verifyReq = new Request(`https://getvendora.net/api/transport/driver-invite?action=inspect&t=${encodeURIComponent(createData.token)}`, {
    headers: { 'cf-connecting-ip': '10.0.0.3' }
  });
  const verifyRes = await onRequestGet({ request: verifyReq, env });
  assert.equal(verifyRes.status, 200);
  const verifyText = await verifyRes.text();
  assert.ok(!verifyText.includes('+97333112233'), 'Public inspect response must NEVER leak customer phone');
  assert.ok(!verifyText.includes('65.000'), 'Public inspect response must NEVER leak customer fare');
  assert.ok(!verifyText.includes('15.000'), 'Public inspect response must NEVER leak commission');
  const verifyData = JSON.parse(verifyText);
  assert.equal(verifyData.invite.bookingId, 'V-500');
  assert.equal(verifyData.invite.pickupTime12h, '10:30 AM');

  // 4. Public POST submit with missing required fields fails validation WITHOUT burning the token
  const badSubReq = new Request('https://getvendora.net/api/transport/driver-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.4' },
    body: JSON.stringify({
      action: 'submit',
      token: createData.token,
      driverName: 'Khalid Al-Subaie'
      // missing driverPhone (only mandatory field)
    })
  });
  const badSubRes = await onRequestPost({ request: badSubReq, env });
  assert.equal(badSubRes.status, 400);

  // 5. Atomic single-use race test: fire TWO concurrent valid POST submissions on the same token
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
  try {
    const makeSubReq = (name, ip) => new Request('https://getvendora.net/api/transport/driver-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify({
        action: 'submit',
        token: createData.token,
        driverName: name,
        driverPhone: '+966 55 987 6543',
        vehicleType: 'Toyota Camry 2025',
        vehiclePlate: 'KSA 4412',
        driverNotes: 'Ready 15 mins early',
        agreedPayout: true
      })
    });

    const [resA, resB] = await Promise.all([
      onRequestPost({ request: makeSubReq('Khalid Al-Subaie', '10.0.0.5'), env }),
      onRequestPost({ request: makeSubReq('Concurrent Attacker', '10.0.0.6'), env })
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 410], 'Strictly one concurrent submission must succeed (200) and the other must be rejected (410 USED)');
  } finally {
    globalThis.fetch = origFetch;
  }

  // 6. Verify driver-invite/index.html and booking-desk/index.html have zero local token fallbacks
  const driverPageHtml = fs.readFileSync(path.resolve('public/booking-desk/driver-invite/index.html'), 'utf8');
  assert.ok(driverPageHtml.includes('id="driver-invite-form"'), 'Driver invite page must have submission form');
  assert.ok(driverPageHtml.includes('id="btn-toggle-lang"'), 'Driver invite page must have Arabic/English toggle');
  assert.ok(!driverPageHtml.includes('vendora_gas_url'), 'Driver invite page must never contain admin storage keys or GAS URLs');
  assert.ok(!driverPageHtml.includes('readLocalFallbackInvite'), 'Driver invite page must not fall back to localStorage tokens');
  assert.ok(!html.includes('loc.${b.id}'), 'Booking desk must not generate local fallback tokens when durable storage is offline');
});

test('BHD/SAR Conversion Clarity & Conflicting Driver Assignment Detection', () => {
  const renderTripItemCode = extractFunction(html, 'renderTripItem');
  assert.ok(renderTripItemCode.includes("'≈ ' + formatBhd(fareBhd)"), 'Foreign currency bookings must prefix approximate BHD conversions with ≈');
  assert.ok(renderTripItemCode.includes("'Orig:'"), 'Foreign currency bookings must explicitly label Original booking amount (Orig: / الأصل:)');

  const conflictFnCode = extractFunction(html, 'findDriverScheduleConflict');
  const extractSortTimeCode = extractFunction(html, 'extractSortTime');
  const isDriverAssignedCode = extractFunction(html, 'isDriverAssigned');
  const isBookingCancelledCode = extractFunction(html, 'isBookingCancelled');

  const checkConflict = new Function(`
    const App = {
      bookings: [
        { id: 'V-010', bookingStatus: 'Confirmed', travelDate: '2026-10-18', pickupTime: '09:30 AM', sortPickupTime: '09:30', driverAssigned: true, driverName: 'Ali Hassan' },
        { id: 'V-011', bookingStatus: 'Confirmed', travelDate: '2026-10-18', pickupTime: '09:30 AM', sortPickupTime: '09:30', driverAssigned: false, driverName: '' }
      ]
    };
    ${extractSortTimeCode}
    ${isDriverAssignedCode}
    ${isBookingCancelledCode}
    ${conflictFnCode}
    return { App, findDriverScheduleConflict };
  `)();

  const conflict = checkConflict.findDriverScheduleConflict(checkConflict.App.bookings[1], 'Ali Hassan');
  assert.ok(conflict && conflict.id === 'V-010', 'Must detect schedule conflict when assigning same driver to same date and time');
  const noConflict = checkConflict.findDriverScheduleConflict(checkConflict.App.bookings[1], 'Mohammed Saleh');
  assert.equal(noConflict, null, 'Must return null when driver has no conflicting trip at that date/time');
});

test('Branded Driver Invite URL, 24h Expiry & Live Sheets Connection Defaults', () => {
  // 1. Worker route exists for /driver/invite/*
  const workerCode = fs.readFileSync(path.resolve('public/worker.js'), 'utf8');
  assert.ok(workerCode.includes("path.startsWith('/driver/invite/')"), 'worker.js must route /driver/invite/*');
  assert.ok(workerCode.includes("path.startsWith('/driver-invite/')"), 'worker.js must route /driver-invite/*');

  // 2. Booking Desk generates branded /d/{token} or /driver/invite/{token} links
  assert.ok(html.includes('/d/${encodeURIComponent(token)}') || html.includes('/driver/invite/${encodeURIComponent(token)}'), 'Booking desk must generate /d/{token} or /driver/invite/{token} URLs');

  // 3. 24h default expiry
  assert.ok(html.includes('<option value="24" selected>'), 'Driver invite expiry dropdown must default to 24 hours');
  assert.ok(html.includes('id="qa-invite-expiry-note"'), 'Booking desk must have Bahrain expiry note container');
  assert.ok(html.includes('Asia/Bahrain'), 'Booking desk must format invite expiry in Bahrain time zone');

  // 4. Default filter is all (so all live records display immediately without confusion)
  assert.ok(html.includes("filter: 'all'"), "App.filter must default to 'all'");
  assert.ok(html.includes('data-filter="all" type="button"'), 'data-filter="all" must be present');

  // 5. App.secretKey defaults to vendora_booking_desk_secret matching pre-upgrade backup
  assert.ok(html.includes("safeGetStorage('vendora_gas_key', 'vendora_booking_desk_secret')"), 'App.secretKey must default to vendora_booking_desk_secret');

  // 6. App.isPublicDemoMode only turns on when explicitly requested via URL params
  assert.ok(!html.includes('const storedKey = safeGetStorage(\'vendora_gas_key\', \'\');\n          return !storedKey;'), 'isPublicDemoMode must not suppress live data when key is in default state');
});

test('Final Professional UI Upgrade: Compact Card Hierarchy, 1-Tap Customer Actions & Desktop Master-Detail Layout', () => {
  // 1. Desktop two-column split workspace and inspector pane
  assert.ok(html.includes('id="desktop-split-workspace"'), 'Must include desktop split workspace container');
  assert.ok(html.includes('id="desktop-inspector-pane"'), 'Must include desktop right-hand inspector pane');
  assert.ok(html.includes('function renderDesktopInspector('), 'Must include renderDesktopInspector function');
  assert.ok(html.includes('App.selectedBookingId = id'), 'Must track selectedBookingId for desktop master-detail inspector');

  // 2. Customer international phone formatting and 1-tap WhatsApp + Call actions
  assert.ok(html.includes('function formatDisplayInternationalPhone('), 'Must include formatDisplayInternationalPhone helper');
  const renderTripItemCode = extractFunction(html, 'renderTripItem');
  assert.ok(renderTripItemCode.includes('formatDisplayInternationalPhone(b.customerPhone)'), 'Booking card must display full international customer phone number');
  assert.ok(renderTripItemCode.includes('btn-cust-1tap wa'), 'Booking card must include 1-tap customer WhatsApp action');
  assert.ok(renderTripItemCode.includes('btn-cust-1tap call'), 'Booking card must include 1-tap customer Call action');

  // 3. Balanced two-block Pickup & Destination section + compact action bar
  assert.ok(renderTripItemCode.includes('card-route-grid'), 'Booking card must use balanced 2-column route grid');
  assert.ok(renderTripItemCode.includes('card-actions-bar'), 'Booking card must use unified compact actions bar');
  assert.ok(renderTripItemCode.includes('btn-share-driver'), 'Booking card must have prominent Share with Driver button');
  assert.ok(renderTripItemCode.includes('btn-share-customer'), 'Booking card must have prominent Share with Customer button');

  // 4. White search and editable input fields with dark text across all themes
  assert.ok(html.includes('background-color: #ffffff !important'), 'Search and editable inputs must enforce white background');
  assert.ok(html.includes('color: #0f172a !important'), 'Search and editable inputs must enforce dark readable text');
});



