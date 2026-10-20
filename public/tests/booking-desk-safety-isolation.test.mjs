import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Resolve index.html path whether run from repo root or public/
const htmlPath = fs.existsSync('public/booking-desk/index.html')
  ? path.resolve('public/booking-desk/index.html')
  : path.resolve('booking-desk/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Helper to extract function code from index.html
function extractFunction(name) {
  const re = new RegExp(`function\\s+${name}\\s*\\([\\s\\S]*?\\)\\s*\\{`);
  const match = html.match(re);
  if (!match) throw new Error(`Function ${name} not found in index.html`);
  const startIndex = match.index;
  let braceCount = 0;
  let started = false;
  for (let i = startIndex; i < html.length; i++) {
    if (html[i] === '{') {
      braceCount++;
      started = true;
    } else if (html[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        return html.slice(startIndex, i + 1);
      }
    }
  }
  throw new Error(`Could not find closing brace for ${name}`);
}

// -----------------------------------------------------------------------------
// PART 1: PHONE VALIDATION & COLUMN G / COLUMN H RECIPIENT RECONCILIATION
// -----------------------------------------------------------------------------
test('Phone Validation: normalizeWhatsAppPhone correctly parses Gulf and International numbers', () => {
  const normCode = extractFunction('normalizeWhatsAppPhone');
  const normalizeWhatsAppPhone = new Function('val', `${normCode}\nreturn normalizeWhatsAppPhone(val);`);

  // Bahrain numbers
  assert.equal(normalizeWhatsAppPhone('+973 3999 1234'), '97339991234');
  assert.equal(normalizeWhatsAppPhone('39991234'), '97339991234', '8-digit Bahrain gets 973 prefix');
  assert.equal(normalizeWhatsAppPhone('66332211'), '97366332211');
  assert.equal(normalizeWhatsAppPhone('17223344'), '97317223344');

  // Saudi numbers
  assert.equal(normalizeWhatsAppPhone('+966 50 123 4567'), '966501234567');
  assert.equal(normalizeWhatsAppPhone('0501234567'), '966501234567', '05 local Saudi converted to 9665');
  assert.equal(normalizeWhatsAppPhone('501234567'), '966501234567', '9-digit Saudi starting with 5 gets 966');
  assert.equal(normalizeWhatsAppPhone('00966501234567'), '966501234567', '00 prefix stripped');

  // UAE, Kuwait, Qatar, International
  assert.equal(normalizeWhatsAppPhone('+971 50 999 8888'), '971509998888');
  assert.equal(normalizeWhatsAppPhone('+965 9988 7766'), '96599887766');
  assert.equal(normalizeWhatsAppPhone('+974 5544 3322'), '97455443322');
  assert.equal(normalizeWhatsAppPhone('+44 7911 123456'), '447911123456');

  // Empty or invalid input
  assert.equal(normalizeWhatsAppPhone(''), '');
  assert.equal(normalizeWhatsAppPhone(null), '');
  assert.equal(normalizeWhatsAppPhone('abc'), '');
});

test('Recipient Validation: validateCustomerRecipient strictly resolves Column G and validates Column H', () => {
  const normCode = extractFunction('normalizeWhatsAppPhone');
  const valCode = extractFunction('validateCustomerRecipient');
  const validateCustomerRecipient = new Function('b', `${normCode}\n${valCode}\nreturn validateCustomerRecipient(b);`);

  // 1. Valid Bahrain booking with no Column H
  const bBh = { id: 'V-101', customerPhone: '+973 3999 1234', whatsapp: '' };
  const resBh = validateCustomerRecipient(bBh);
  assert.equal(resBh.valid, true);
  assert.equal(resBh.cleanDigits, '97339991234');
  assert.equal(resBh.displayPhone, '+97339991234');

  // 2. Valid Saudi booking with matching Column H link
  const bSa = { id: 'V-102', customerPhone: '+966 50 123 4567', whatsapp: 'https://wa.me/966501234567' };
  const resSa = validateCustomerRecipient(bSa);
  assert.equal(resSa.valid, true);
  assert.equal(resSa.cleanDigits, '966501234567');

  // 3. Mismatch between Column G and Column H -> MUST BE BLOCKED
  const bMismatch = { id: 'V-103', customerPhone: '+973 3999 1234', whatsapp: 'https://wa.me/96655551234' };
  const resMismatch = validateCustomerRecipient(bMismatch);
  assert.equal(resMismatch.valid, false, 'Mismatched Column H WhatsApp must be blocked');
  assert.equal(resMismatch.reason, 'phone_mismatch');
  assert.ok(resMismatch.warningAr.includes('غير متطابق'));
  assert.ok(resMismatch.warningEn.includes('does not match'));

  // 4. Missing phone -> MUST BE BLOCKED
  const bMissing = { id: 'V-104', customerPhone: '', whatsapp: '' };
  const resMissing = validateCustomerRecipient(bMissing);
  assert.equal(resMissing.valid, false);
  assert.equal(resMissing.reason, 'missing_phone');

  // 5. Incomplete / invalid short number -> MUST BE BLOCKED
  const bShort = { id: 'V-105', customerPhone: '12345', whatsapp: '' };
  const resShort = validateCustomerRecipient(bShort);
  assert.equal(resShort.valid, false);
  assert.equal(resShort.reason, 'invalid_phone');
});

// -----------------------------------------------------------------------------
// PART 2: RECIPIENT ISOLATION & IMMUTABLE SHARE SESSION
// -----------------------------------------------------------------------------
test('Recipient Isolation: Immutable share session prevents cross-booking leakage on rapid switching', () => {
  const normCode = extractFunction('normalizeWhatsAppPhone');
  const valCode = extractFunction('validateCustomerRecipient');
  const createCode = extractFunction('createShareSession');
  const isCurrentCode = extractFunction('isSessionCurrent');

  const contextFactory = new Function(`
    const App = { activeCustomerBooking: null, activeShareSession: null };
    let _shareSessionCounter = 0;
    ${normCode}
    ${valCode}
    ${createCode}
    ${isCurrentCode}
    return { App, createShareSession, isSessionCurrent, validateCustomerRecipient };
  `);

  const ctx = contextFactory();

  // Booking V-101 (+973)
  const booking101 = { id: 'V-101', customerName: 'Khalifa Al-Mannai', customerPhone: '+973 3999 1010' };
  // Booking V-102 (+966)
  const booking102 = { id: 'V-102', customerName: 'Fahad Al-Otaibi', customerPhone: '+966 50 202 2020' };

  // Dispatcher opens V-101
  ctx.App.activeCustomerBooking = booking101;
  const session1 = ctx.createShareSession(booking101, 'confirmation', 'ar', 'image');
  assert.equal(session1.bookingId, 'V-101');
  assert.equal(session1.cleanDigits, '97339991010');
  assert.equal(ctx.isSessionCurrent(session1), true);

  // Dispatcher rapidly clicks V-102 while async generation was running for V-101
  ctx.App.activeCustomerBooking = booking102;
  const session2 = ctx.createShareSession(booking102, 'confirmation', 'en', 'image');
  assert.equal(session2.bookingId, 'V-102');
  assert.equal(session2.cleanDigits, '966502022020');
  assert.equal(ctx.isSessionCurrent(session2), true);

  // Verification: Session 1 for V-101 is now invalidated and must be rejected!
  assert.equal(ctx.isSessionCurrent(session1), false, 'Old session for V-101 must be invalid after switching to V-102');
  assert.equal(session1.active, false, 'Old session active flag must be false');

  // Dispatcher switches back to V-101 rapidly: V-101 -> V-102 -> V-101
  ctx.App.activeCustomerBooking = booking101;
  const session3 = ctx.createShareSession(booking101, 'confirmation', 'ar', 'image');
  assert.equal(session3.bookingId, 'V-101');
  assert.equal(ctx.isSessionCurrent(session3), true);
  assert.equal(ctx.isSessionCurrent(session2), false, 'Session 2 for V-102 must now be invalid');
});

// -----------------------------------------------------------------------------
// PART 3: STRICT LANGUAGE ISOLATION & CANVAS/CAPTION CONSISTENCY
// -----------------------------------------------------------------------------
test('Language Isolation: Document language strictly follows document selection, completely isolated from App.lang', () => {
  assert.ok(
    html.includes('function drawVendoraPageOnCanvas(canvas, b, pageType, forcedHeight, overrideDocLang)'),
    'drawVendoraPageOnCanvas must support explicit overrideDocLang parameter'
  );
  assert.ok(
    html.includes('const pdfLang = overrideDocLang || ($(\'pdf-doc-lang\') && $(\'pdf-doc-lang\').value) || \'en\';'),
    'pdfLang must honor overrideDocLang before checking DOM or interface language'
  );
  assert.ok(
    html.includes('drawVendoraPageOnCanvas(canvas, b, pageType, curY + advBoxH + 195, overrideDocLang)'),
    'Recursive auto-expand in canvas must forward overrideDocLang'
  );
  assert.ok(
    html.includes('drawVendoraPageOnCanvas(canvas, b, pageType, curY + 195, overrideDocLang)'),
    'Second recursive auto-expand in canvas must forward overrideDocLang'
  );
});

test('Language Isolation: buildPdfWhatsAppCaption uses explicit document language override', () => {
  const captionFnCode = extractFunction('buildPdfWhatsAppCaption');
  const dummyHelpers = `
    const App = { lang: 'ar', pdfMode: 'confirmation', activePdfBooking: null };
    function $(id) { return null; }
    function formatDateHeader(d, lang) { return lang === 'ar' ? '15 أكتوبر 2026' : '15 October 2026'; }
    function formatTimeForWhatsApp(b, isAr) { return isAr ? '8:30 مساءً' : '8:30 PM'; }
    function formatCurrencyForWhatsApp(f, c, isAr) { return isAr ? '35 د.ب' : 'BHD 35'; }
  `;
  const buildCaption = new Function('booking', 'overrideLang', `${dummyHelpers}\n${captionFnCode}\nreturn buildPdfWhatsAppCaption(booking, overrideLang);`);

  const sampleBooking = {
    id: 'V-101',
    travelDate: '2026-10-18',
    pickupTime: '08:30 PM',
    customerPhone: '+97339991010',
    fare: '35',
    currency: 'BHD'
  };

  // 1. Arabic App.lang + English document override -> MUST BE PURE ENGLISH
  const enCaption = buildCaption(sampleBooking, 'en');
  assert.ok(enCaption.includes('Vendora Transport | Booking Confirmation'), 'Must have English header');
  assert.ok(enCaption.includes('*Travel Date:* 15 October 2026'), 'Date must be formatted in English');
  assert.ok(enCaption.includes('*Pickup Time:* 8:30 PM'), 'Time must be in English');
  assert.ok(enCaption.includes('*Amount:* BHD 35'), 'Currency label must be in English');
  assert.ok(!enCaption.includes('فندورا'), 'Must not leak Arabic brand in English caption');

  // 2. English App.lang + Arabic document override -> MUST BE PURE ARABIC
  const arCaption = buildCaption(sampleBooking, 'ar');
  assert.ok(arCaption.includes('فندورا للنقل | تأكيد الحجز'), 'Must have Arabic header');
  assert.ok(arCaption.includes('*التاريخ:* 15 أكتوبر 2026'), 'Date must be formatted in Arabic');
  assert.ok(arCaption.includes('*وقت الاستلام:* 8:30 مساءً'), 'Time must be in Arabic');
  assert.ok(arCaption.includes('*المبلغ:* 35 د.ب'), 'Currency label must be in Arabic');
});

// -----------------------------------------------------------------------------
// PART 4: TARGETED WHATSAPP SHARING & MOBILE SAFE WORKFLOW
// -----------------------------------------------------------------------------
test('Customer WhatsApp Workflow: Primary button is targeted wa.me and never opens generic picker', () => {
  // Check that dlg-cust primary button is btn-wa-cust
  assert.ok(html.includes('id="btn-wa-cust"'), 'Primary targeted WhatsApp button must exist');
  assert.ok(html.includes('متابعة إلى هذا الزبون (فتح واتساب) ↗'), 'Arabic label indicates targeted customer continuation');
  assert.ok(html.includes('Continue to This Customer (Open WhatsApp) ↗'), 'English label indicates targeted customer continuation');

  // Check that customer sharing in shareBookingDocument uses targeted wa.me and skips generic navigator.share
  assert.ok(html.includes('const isCust = isCustomerShare || dialogIdToClose === \'dlg-cust\';'), 'shareBookingDocument must isolate customer share mode');
  assert.ok(html.includes('const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;'), 'Targeted WhatsApp link must use cleanPhone and encoded caption');
});

test('Customer Safety Card: Visible, read-only phone and verified recipient card in dlg-cust', () => {
  assert.ok(html.includes('id="cust-safety-card"'), 'Pre-send safety verification card must exist in dlg-cust');
  assert.ok(html.includes('id="cust-val-ref"'), 'Booking reference display must exist');
  assert.ok(html.includes('id="cust-val-name"'), 'Customer name display must exist');
  assert.ok(html.includes('id="cust-val-phone"'), 'Read-only destination phone display must exist');
  assert.ok(html.includes('id="cust-phone-warning"'), 'Recipient mismatch/invalid warning element must exist');
  assert.ok(html.includes('id="cust-safety-badge"'), 'Safety verification badge must exist');
  assert.ok(html.includes('id="inp-cust-phone" readonly'), 'Customer phone input field must be read-only to prevent tampering');
});

// -----------------------------------------------------------------------------
// PART 5: IMAGE VS PDF OUTPUT INTEGRITY
// -----------------------------------------------------------------------------
test('File Generation: Image action creates genuine PNG and PDF action creates genuine PDF', () => {
  // Image branch
  assert.ok(html.includes('filename = `${filePrefix}-${safeId}.png`'), 'Image filename must end in .png');
  assert.ok(html.includes('type: \'image/png\''), 'Image file type must be image/png');
  assert.ok(html.includes('canvas.toBlob'), 'Image must be exported from canvas blob');

  // PDF branch
  assert.ok(html.includes('filename = `${filePrefix}-${safeId}.pdf`'), 'PDF filename must end in .pdf');
  assert.ok(html.includes('type: \'application/pdf\''), 'PDF file type must be application/pdf');
  assert.ok(html.includes('buildPdfBlobFromCanvases'), 'PDF must be exported from real PDF builder');
});

// -----------------------------------------------------------------------------
// PART 6: PRIVACY & SENSITIVE DATA PROTECTION
// -----------------------------------------------------------------------------
test('Privacy: Customer confirmations never contain driver payout, commission, or internal notes', () => {
  // Check that updateCustPreview lines do NOT add driverPayout or vendoraCommission
  const custPreviewFn = extractFunction('updateCustPreview');
  assert.ok(!custPreviewFn.includes('b.driverPayout'), 'Customer preview must never access or display driverPayout');
  assert.ok(!custPreviewFn.includes('b.vendoraCommission'), 'Customer preview must never access or display vendoraCommission');
  assert.ok(!custPreviewFn.includes('b.notes'), 'Customer preview must never expose internal coordinator notes');
  assert.ok(!custPreviewFn.includes('shortInviteUrl'), 'Customer preview must never include driver 24h registration URL');
});

// -----------------------------------------------------------------------------
// PART 7: RUNTIME STABILITY & TIMEOUT INTEGRITY
// -----------------------------------------------------------------------------
test('Runtime Stability: index.html script parses with zero syntax errors', () => {
  const start = html.indexOf('<script>') + 8;
  const end = html.lastIndexOf('</script>');
  assert.ok(start > 7 && end > start, 'Script tags must be found');
  const body = html.slice(start, end);
  assert.doesNotThrow(() => {
    new Function(body);
  }, 'Script body must parse without any SyntaxError or duplicate declarations');
});

test('Network Timeout: apiRequest and fetchWithTimeout allow at least 10s for Google Apps Script', () => {
  assert.ok(html.includes('async function fetchWithTimeout(url, options = {}, timeoutMs = 15000)'), 'fetchWithTimeout default timeout must be at least 15s');
  assert.ok(html.includes('}, 15000);'), 'apiRequest fetchWithTimeout must use at least 15s');
});
