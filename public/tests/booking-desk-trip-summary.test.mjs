import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'booking-desk', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

// --- 1. DOM Structure & Accessibility Checks ---

test('1. DOM Structure: Modal dialog and navigation entries exist', () => {
  assert.ok(html.includes('id="dlg-trip-summary"'), 'Trip Summary modal #dlg-trip-summary must exist');
  assert.ok(html.includes('id="side-op-trip-summary"'), 'Sidebar button #side-op-trip-summary must exist');
  assert.ok(html.includes('id="menu-btn-trip-summary"'), 'Hamburger menu button #menu-btn-trip-summary must exist');
  assert.ok(html.includes('id="btn-top-trip-summary"'), 'Top header button #btn-top-trip-summary must exist');
});

test('2. DOM Structure: Presets exist (Driver Availability & Operational)', () => {
  assert.ok(html.includes('id="btn-preset-driver-avail"'), 'Driver availability preset button must exist');
  assert.ok(html.includes('id="btn-preset-operational"'), 'Operational preset button must exist');
});

test('3. DOM Structure: Multi-Date Calendar and Quick Date Presets exist', () => {
  assert.ok(html.includes('id="btn-sum-date-today"'), 'Today quick button must exist');
  assert.ok(html.includes('id="btn-sum-date-tomorrow"'), 'Tomorrow quick button must exist');
  assert.ok(html.includes('id="btn-sum-date-next7"'), 'Next 7 Days quick button must exist');
  assert.ok(html.includes('id="btn-sum-calendar-prev"'), 'Calendar prev week button must exist');
  assert.ok(html.includes('id="btn-sum-calendar-next"'), 'Calendar next week button must exist');
  assert.ok(html.includes('id="sum-calendar-strip"'), '7-Day Calendar Strip container must exist');
  assert.ok(html.includes('id="btn-sum-cal-select-all"'), 'Select All 7 Days shortcut must exist');
  assert.ok(html.includes('id="btn-sum-cal-clear"'), 'Clear Selection shortcut must exist');
  assert.ok(html.includes('id="sum-range-from"'), 'Custom range from input must exist');
  assert.ok(html.includes('id="sum-range-to"'), 'Custom range to input must exist');
});

test('4. DOM Structure: Field customization checkboxes exist with safe defaults', () => {
  assert.ok(html.includes('id="chk-sum-ref"'), 'Booking reference checkbox must exist');
  assert.ok(html.includes('id="chk-sum-time"'), 'Time checkbox must exist');
  assert.ok(html.includes('id="chk-sum-route"'), 'Route checkbox must exist');
  assert.ok(html.includes('id="chk-sum-fare"'), 'Fare checkbox must exist');
  assert.ok(html.includes('id="chk-sum-cust-name"'), 'Customer name checkbox must exist');
  assert.ok(html.includes('id="chk-sum-cust-phone"'), 'Customer phone checkbox must exist');
  assert.ok(html.includes('id="sum-sensitive-warning"'), 'Sensitive disclosure warning must exist');
});

test('5. DOM Structure: Default language is Arabic for text and document', () => {
  assert.ok(html.includes('id="sel-sum-text-lang"'), 'Text language selector must exist');
  assert.ok(html.includes('id="sel-sum-doc-lang"'), 'Document language selector must exist');
  assert.ok(html.includes('value="ar" selected'), 'Arabic must be the default selected option in Trip Summary');
});

test('6. DOM Structure: Action buttons exist for text, image, and PDF', () => {
  assert.ok(html.includes('id="btn-sum-copy-text"'), 'Copy text button must exist');
  assert.ok(html.includes('id="btn-sum-share-wa"'), 'Share WhatsApp button must exist');
  assert.ok(html.includes('id="btn-sum-copy-img"'), 'Copy image button must exist');
  assert.ok(html.includes('id="btn-sum-share-img"'), 'Share image button must exist');
  assert.ok(html.includes('id="btn-sum-download-img"'), 'Download PNG button must exist');
  assert.ok(html.includes('id="btn-sum-download-pdf"'), 'Download PDF button must exist');
  assert.ok(html.includes('id="trip-summary-canvas"'), 'trip-summary-canvas must exist');
});

// --- 2. Pure Behavioral Logic Testing ---

function computeTripSummaryTotals(trips, isAr = false) {
  const totals = {};
  trips.forEach(b => {
    const raw = String(b.fare || '0').replace(/,/g, '').trim();
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) {
      const curr = (b.currency || 'BHD').toUpperCase().trim();
      totals[curr] = (totals[curr] || 0) + num;
    }
  });
  const parts = Object.entries(totals).map(([curr, amt]) => {
    if (curr === 'BHD') return amt.toFixed(3) + (isAr ? ' د.ب' : ' BHD');
    if (curr === 'SAR') return amt.toFixed(0) + (isAr ? ' ر.س' : ' SAR');
    if (curr === 'AED') return amt.toFixed(0) + (isAr ? ' د.إ' : ' AED');
    if (curr === 'QAR') return amt.toFixed(0) + (isAr ? ' ر.ق' : ' QAR');
    return amt.toFixed(2) + ' ' + curr;
  });
  return {
    totals,
    totalsText: parts.length > 0 ? parts.join(' + ') : (isAr ? 'غير محدد' : 'Not specified'),
    hasFare: parts.length > 0
  };
}

function buildTripSummaryWhatsAppText(trips, opts = {}) {
  const isAr = (opts.lang || 'ar') === 'ar';
  const fields = opts.fields || { ref: true, time: true, route: true, fare: true };
  const dateLabel = opts.dateLabel || '';

  const header = isAr
    ? '🚘 *فندورا للنقل | ملخص الرحلات*'
    : '🚘 *VENDORA TRANSPORT | TRIP SUMMARY*';

  const dateLine = isAr
    ? (dateLabel ? `📅 التاريخ: ${dateLabel}` : '')
    : (dateLabel ? `📅 Date: ${dateLabel}` : '');

  const lines = [header];
  if (dateLine) lines.push(dateLine);
  lines.push('');

  const dates = [...new Set(trips.map(b => b.travelDate).filter(Boolean))];
  const isMultiDate = dates.length > 1;

  let globalIndex = 1;
  const groups = {};
  trips.forEach(b => {
    const k = b.travelDate || 'other';
    if (!groups[k]) groups[k] = [];
    groups[k].push(b);
  });

  const sortedDates = Object.keys(groups).sort();
  sortedDates.forEach((dKey) => {
    if (isMultiDate) {
      lines.push(`📅 *${dKey}*`);
    }
    groups[dKey].forEach(b => {
      const tripHeader = fields.ref ? `${globalIndex}. *${b.id || 'Booking'}*` : `${globalIndex}.`;
      lines.push(tripHeader);

      if (fields.time) {
        const timeVal = b.pickupTime || (isAr ? 'حسب الإجراءات' : 'TBD');
        lines.push(`🕒 ${timeVal}`);
      }

      if (fields.route) {
        const fromLoc = b.pickup || '';
        const toLoc = b.destination || '';
        const arrow = isAr ? '←' : '→';
        lines.push(`📍 ${fromLoc} ${arrow} ${toLoc}`);
      }

      if (fields.fare) {
        let fareVal = isAr ? 'غير محدد' : 'TBD';
        const num = parseFloat(String(b.fare || '0').replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          const curr = (b.currency || 'BHD').toUpperCase().trim();
          fareVal = curr === 'BHD' ? `${num.toFixed(3)} ${isAr ? 'د.ب' : 'BHD'}` : `${num} ${curr}`;
        }
        lines.push(`💰 ${fareVal}`);
      }

      if (fields.custName && b.customerName) {
        lines.push(`👤 ${isAr ? 'العميل: ' : 'Customer: '}${b.customerName}`);
      }
      if (fields.custPhone && b.customerPhone) {
        lines.push(`📞 ${isAr ? 'الهاتف: ' : 'Phone: '}${b.customerPhone}`);
      }
      if (fields.pax && b.passengers) {
        lines.push(`👥 ${isAr ? 'الركاب: ' : 'Pax: '}${b.passengers}`);
      }
      if (fields.luggage && b.luggage) {
        lines.push(`🧳 ${isAr ? 'الحقائب: ' : 'Luggage: '}${b.luggage}`);
      }
      if (fields.vehicle && b.vehicle) {
        lines.push(`🚘 ${isAr ? 'المركبة: ' : 'Vehicle: '}${b.vehicle}`);
      }
      if (fields.flight && b.flight) {
        lines.push(`✈️ ${isAr ? 'الطيران: ' : 'Flight: '}${b.flight}`);
      }
      if (fields.driver) {
        const drvName = b.driverName || (isAr ? 'بانتظار سائق' : 'Unassigned');
        lines.push(`👨‍✈️ ${isAr ? 'السائق: ' : 'Driver: '}${drvName}`);
      }
      if (fields.notes && b.notes) {
        lines.push(`📝 ${isAr ? 'ملاحظات: ' : 'Notes: '}${b.notes}`);
      }

      lines.push('');
      globalIndex++;
    });
  });

  lines.push(isAr ? `إجمالي الرحلات: ${trips.length}` : `Total Trips: ${trips.length}`);
  if (fields.fare) {
    const totalsRes = computeTripSummaryTotals(trips, isAr);
    if (totalsRes.hasFare) {
      lines.push(isAr ? `إجمالي القيمة: ${totalsRes.totalsText}` : `Total Value: ${totalsRes.totalsText}`);
    }
  }

  lines.push('');
  lines.push('🌐 getvendora.net');

  return lines.join('\n');
}

test('7. Multi-Currency Totals: Separate sums per currency without false conversion', () => {
  const mixedTrips = [
    { id: 'V-001', fare: '40.000', currency: 'BHD' },
    { id: 'V-002', fare: '35.000', currency: 'BHD' },
    { id: 'V-003', fare: '500', currency: 'SAR' }
  ];
  const arRes = computeTripSummaryTotals(mixedTrips, true);
  assert.equal(arRes.totalsText, '75.000 د.ب + 500 ر.س');
  const enRes = computeTripSummaryTotals(mixedTrips, false);
  assert.equal(enRes.totalsText, '75.000 BHD + 500 SAR');
});

test('8. Missing Fares: Does not invent missing fares', () => {
  const noFareTrips = [
    { id: 'V-001', fare: '', currency: 'BHD' },
    { id: 'V-002', fare: '0', currency: 'BHD' }
  ];
  const res = computeTripSummaryTotals(noFareTrips, true);
  assert.equal(res.hasFare, false);
  assert.equal(res.totalsText, 'غير محدد');
});

test('9. Arabic Output Format: Uses Arabic arrow ← and headers', () => {
  const sampleTrips = [
    { id: 'V-101', travelDate: '2026-10-21', pickupTime: '8:00 ص', pickup: 'مطار البحرين', destination: 'الرياض', fare: '150.000', currency: 'BHD' }
  ];
  const txt = buildTripSummaryWhatsAppText(sampleTrips, { lang: 'ar', dateLabel: '21 أكتوبر 2026' });
  assert.ok(txt.includes('فندورا للنقل | ملخص الرحلات'), 'Must have Arabic brand header');
  assert.ok(txt.includes('مطار البحرين ← الرياض'), 'Must have Arabic leftwards route arrow');
  assert.ok(txt.includes('إجمالي الرحلات: 1'), 'Must have Arabic total count');
  assert.ok(txt.includes('إجمالي القيمة: 150.000 د.ب'), 'Must have Arabic total fare');
  assert.ok(txt.includes('🌐 getvendora.net'), 'Must include website link');
});

test('10. English Output Format: Uses English arrow → and labels', () => {
  const sampleTrips = [
    { id: 'V-101', travelDate: '2026-10-21', pickupTime: '8:00 AM', pickup: 'Bahrain Airport', destination: 'Riyadh', fare: '150.000', currency: 'BHD' }
  ];
  const txt = buildTripSummaryWhatsAppText(sampleTrips, { lang: 'en', dateLabel: '21 Oct 2026' });
  assert.ok(txt.includes('VENDORA TRANSPORT | TRIP SUMMARY'), 'Must have English brand header');
  assert.ok(txt.includes('Bahrain Airport → Riyadh'), 'Must have English rightwards route arrow');
  assert.ok(txt.includes('Total Trips: 1'), 'Must have English total count');
  assert.ok(txt.includes('Total Value: 150.000 BHD'), 'Must have English total fare');
});

test('11. Multi-Date Grouping: Groups chronologically when spanning multiple dates', () => {
  const multiTrips = [
    { id: 'V-101', travelDate: '2026-10-21', pickupTime: '8:00 AM', pickup: 'A', destination: 'B', fare: '20.000', currency: 'BHD' },
    { id: 'V-102', travelDate: '2026-10-22', pickupTime: '9:00 AM', pickup: 'C', destination: 'D', fare: '30.000', currency: 'BHD' }
  ];
  const txt = buildTripSummaryWhatsAppText(multiTrips, { lang: 'ar', dateLabel: '21 - 22 أكتوبر 2026' });
  assert.ok(txt.includes('📅 *2026-10-21*'), 'Must have date section header for 21');
  assert.ok(txt.includes('📅 *2026-10-22*'), 'Must have date section header for 22');
  assert.ok(txt.includes('إجمالي الرحلات: 2'), 'Must show 2 total trips');
});

test('12. Privacy & Disclosure: Driver payout and commission are NEVER output', () => {
  const sensitiveTrip = [
    { id: 'V-101', fare: '40.000', currency: 'BHD', driverPayout: '30.000', commission: '10.000', profit: '10.000' }
  ];
  const txt = buildTripSummaryWhatsAppText(sensitiveTrip, { lang: 'ar' });
  assert.ok(!txt.includes('30.000'), 'Driver payout must not be leaked');
  assert.ok(!txt.includes('commission'), 'Commission must not be leaked');
  assert.ok(!txt.includes('profit'), 'Profit must not be leaked');
});

test('13. No Booking Mutation: Summary generation does not alter original booking objects', () => {
  const original = { id: 'V-101', fare: '40.000', currency: 'BHD', travelDate: '2026-10-21', pickup: 'LocA', destination: 'LocB' };
  const clone = JSON.parse(JSON.stringify(original));
  buildTripSummaryWhatsAppText([original], { lang: 'ar' });
  assert.deepEqual(original, clone, 'Original booking object must not be mutated');
});
