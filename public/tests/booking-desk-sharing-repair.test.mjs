import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Resolve index.html path whether run from repo root or public/
const htmlPath = fs.existsSync('public/booking-desk/index.html')
  ? path.resolve('public/booking-desk/index.html')
  : path.resolve('booking-desk/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractFunction(name) {
  const asyncRe = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = html.match(asyncRe);
  if (!match) throw new Error(`Function ${name} not found in index.html`);
  const startIndex = match.index;
  let parenCount = 0;
  let paramsEnded = false;
  let braceCount = 0;
  let bodyStarted = false;
  for (let i = startIndex; i < html.length; i++) {
    const ch = html[i];
    if (!paramsEnded) {
      if (ch === '(') parenCount++;
      else if (ch === ')') {
        parenCount--;
        if (parenCount === 0) paramsEnded = true;
      }
    } else {
      if (ch === '{') {
        braceCount++;
        bodyStarted = true;
      } else if (ch === '}') {
        braceCount--;
        if (bodyStarted && braceCount === 0) {
          return html.slice(startIndex, i + 1);
        }
      }
    }
  }
  throw new Error(`Could not find closing brace for ${name}`);
}

// -----------------------------------------------------------------------------
// 1. ALL 10 SHARING OPTIONS & DOM CONTROLS RESTORED
// -----------------------------------------------------------------------------
test('DOM Controls: All 10 sharing options exist across Customer, Driver, and PDF modals', () => {
  const requiredIds = [
    // Customer modal (#dlg-cust)
    'chk-cust-embed-caption',
    'cust-share-status-bar',
    'btn-cust-share-img',         // 2. Share picture with caption
    'btn-cust-share-img-only',    // 1. Share picture (only)
    'btn-cust-copy-img',          // 3. Copy picture
    'btn-cust-copy-img-caption',  // 4. Copy picture with caption
    'btn-cust-dl-img',            // 5. Download picture
    'btn-cust-share-pdf',         // 6. Share PDF
    'btn-cust-dl-pdf',            // 7. Download PDF
    'btn-cust-open-pdf',          // 10. Existing invoice and booking confirmation studio
    'btn-copy-cust',              // Copy customer caption
    'btn-wa-cust',                // 8. Share with Customer (WhatsApp text)
    'btn-sent-cust',

    // Driver modal (#dlg-driver)
    'chk-drv-embed-caption',
    'drv-share-status-bar',
    'btn-drv-share-img',          // Driver Share picture with caption
    'btn-drv-share-img-only',     // Driver Share picture (only)
    'btn-drv-copy-img',           // Driver Copy picture
    'btn-drv-copy-img-caption',   // Driver Copy picture with caption
    'btn-drv-dl-img',             // Driver Download picture
    'btn-drv-share-pdf',          // Driver Share PDF
    'btn-drv-dl-pdf',             // Driver Download PDF
    'btn-drv-open-pdf',           // Driver Open PDF Studio
    'btn-copy-drv',               // Copy driver message
    'btn-drv-copy-invite',        // Copy 24h registration link
    'btn-wa-drv',                 // 9. Share with Driver (WhatsApp text)
    'btn-sent-drv',

    // PDF Studio modal (#dlg-pdf)
    'btn-pdf-share',
    'btn-pdf-share-img',
    'btn-pdf-download',
    'btn-pdf-dl-img',
    'btn-pdf-copy-img',
    'btn-pdf-print'
  ];

  for (const id of requiredIds) {
    assert.ok(
      html.includes(`id="${id}"`),
      `Expected sharing button/element #${id} to be present in index.html`
    );
  }
});

// -----------------------------------------------------------------------------
// 2. CUSTOMER VS DRIVER DOCUMENT SEPARATION (CANVAS & CAPTIONS)
// -----------------------------------------------------------------------------
test('Document Separation: Driver Dispatch Sheet renders collection amount, accurate payment status, and zero commission disclosure', () => {
  const drawCode = extractFunction('drawVendoraPageOnCanvas');
  const roundRectCode = extractFunction('drawRoundRect');
  const wrapTextCode = extractFunction('wrapCanvasText');
  const barcodeCode = extractFunction('drawBarcodeOnCanvas');

  // Verify driver_dispatch mode is explicitly supported in drawVendoraPageOnCanvas
  assert.ok(
    drawCode.includes("const isDriverDoc = pageType === 'driver_dispatch';"),
    'drawVendoraPageOnCanvas must detect driver_dispatch pageType'
  );
  assert.ok(
    drawCode.includes('DRIVER DISPATCH & COLLECTION SHEET') &&
    drawCode.includes('أمر تشغيل وتحصيل للسائق'),
    'Driver document must display bilingual DRIVER DISPATCH & COLLECTION SHEET title'
  );
  assert.ok(
    drawCode.includes('Collect CASH from passenger:') &&
    drawCode.includes('تحصيل نقدي (كاش) من المسافر:'),
    'Unpaid driver dispatch sheet must clearly state amount to collect from passenger'
  );
  assert.ok(
    drawCode.includes('PREPAID — Do NOT collect from passenger') &&
    drawCode.includes('مدفوع مسبقاً — لا يتم تحصيل أي مبلغ من المسافر'),
    'Paid driver dispatch sheet must clearly instruct driver NOT to collect from passenger'
  );

  // Execute drawVendoraPageOnCanvas in a mock 2D canvas environment to verify actual drawn text
  const drawnTexts = [];
  const mockCtx = {
    direction: 'ltr',
    textAlign: 'left',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    quadraticCurveTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillRect() {},
    strokeRect() {},
    clip() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    fillText(text) {
      drawnTexts.push(String(text));
    },
    measureText(text) {
      return { width: String(text).length * 7 };
    }
  };
  const mockCanvas = {
    width: 0,
    height: 0,
    setAttribute() {},
    getContext() {
      return mockCtx;
    }
  };

  const runner = new Function('canvas', 'b', 'pageType', 'forcedHeight', 'overrideDocLang', 'extraOpts', `
    const App = { lang: 'en', driverInviteUrl: 'https://getvendora.net/d/tok-999', activeCanvasRenderOpts: extraOpts };
    function $(id) { return null; }
    function getTodayStr() { return '2026-10-18'; }
    function isBookingPaid(b) { return String(b.paymentStatus || '').toLowerCase() === 'paid'; }
    function isBookingCancelled(b) { return String(b.bookingStatus || '').toLowerCase() === 'cancelled'; }
    function isDriverAssigned(b) { return Boolean(b && (b.driverName || b.driverPhone)); }
    function normalizeText(v) { return String(v || '').trim(); }
    function formatLocationForDocument(v) { return String(v || ''); }
    function translateLocationText(v) { return String(v || ''); }
    function localizeLocation(v) { return String(v || ''); }
    function localizeLuggage(v) { return String(v || ''); }
    function localizeVehicle(v) { return String(v || ''); }
    function parseLocationField(v) { return { text: String(v || ''), mapUrl: '' }; }
    function toPureEnglishName(v) { return String(v || ''); }
    function toPureArabicName(v) { return String(v || ''); }
    function sanitizeDocumentCustomerName(v) { return String(v || ''); }
    function formatDateHeader(d, l) { return String(d || ''); }
    function formatTimeTo12h(t) { return String(t || ''); }
    function formatTimeDisplay(b) { return String(b.pickupTime || ''); }
    function formatTimeForWhatsApp(b) { return String(b.pickupTime || ''); }
    function getApproxEquivalentNote() { return ''; }
    function parseAmount(v) { return Number(v) || 0; }
    function formatMoney(v, c) { return (Number(v) || 0).toFixed(2) + ' ' + (c || 'BHD'); }
    ${roundRectCode}
    ${wrapTextCode}
    ${barcodeCode}
    ${drawCode}
    return drawVendoraPageOnCanvas(canvas, b, pageType, forcedHeight, overrideDocLang, extraOpts);
  `);

  const sampleBooking = {
    id: 'V-777',
    travelDate: '2026-10-20',
    pickupTime: '09:00 AM',
    customerName: 'Salman Al-Khalifa',
    customerPhone: '+973 3999 8877',
    pickup: 'Manama, Bahrain',
    destination: 'Khobar, Saudi Arabia',
    vehicle: 'GMC Yukon XL',
    passengers: '4',
    luggage: '4 Bags',
    fare: '45',
    currency: 'BHD',
    driverPayout: '35',
    driverPayoutCurrency: 'BHD',
    commission: '10',
    paymentStatus: 'Unpaid',
    driverName: 'Mohammed Ali',
    driverPhone: '+973 3666 5544'
  };

  // Run 1: Customer Confirmation (English)
  drawnTexts.length = 0;
  runner(mockCanvas, sampleBooking, 'confirmation', null, 'en', null);
  const custJoined = drawnTexts.join(' | ');
  assert.ok(custJoined.includes('BOOKING CONFIRMATION'), 'Customer doc must say BOOKING CONFIRMATION');
  assert.ok(custJoined.includes('BHD 45.000'), 'Customer doc must show customer fare BHD 45.000');
  assert.ok(!custJoined.includes('BHD 35.000'), 'Customer doc must NEVER leak driver payout BHD 35.000');
  assert.ok(!custJoined.includes('10.00'), 'Customer doc must NEVER leak company commission');

  // Run 2: Driver Dispatch Sheet (English, Unpaid, with embedded caption)
  drawnTexts.length = 0;
  runner(mockCanvas, sampleBooking, 'driver_dispatch', null, 'en', {
    embedCaptionText: 'Driver Registration Link: https://getvendora.net/d/tok-999'
  });
  const drvJoined = drawnTexts.join(' | ');
  assert.ok(drvJoined.includes('DRIVER DISPATCH & COLLECTION SHEET'), 'Driver doc must say DRIVER DISPATCH & COLLECTION SHEET');
  assert.ok(drvJoined.includes('Collect CASH from passenger: BHD 45.000'), 'Driver doc must show cash collection amount when unpaid');
  assert.ok(drvJoined.includes('BHD 35.000'), 'Driver doc must show agreed driver payout (BHD 35.000)');
  assert.ok(!drvJoined.includes('10.00'), 'Driver doc must NEVER disclose company commission');
  assert.ok(drvJoined.includes('https://getvendora.net/d/tok-999'), 'Driver doc with embedded caption must render registration link');

  // Run 3: Driver Dispatch Sheet (Arabic, Paid)
  drawnTexts.length = 0;
  const paidBooking = { ...sampleBooking, paymentStatus: 'Paid' };
  runner(mockCanvas, paidBooking, 'driver_dispatch', null, 'ar', null);
  const drvPaidAr = drawnTexts.join(' | ');
  assert.ok(drvPaidAr.includes('أمر تشغيل وتحصيل للسائق'), 'Arabic driver doc must show Arabic dispatch header');
  assert.ok(drvPaidAr.includes('مدفوع مسبقاً — لا يتم تحصيل أي مبلغ من المسافر'), 'Paid Arabic driver doc must instruct driver not to collect');
});

// -----------------------------------------------------------------------------
// 3. SHARING SYSTEM MATRIX: BROWSERS, CLIPBOARD, NATIVE SHARE, FALLBACKS
// -----------------------------------------------------------------------------
function createSharingHarness(envConfig = {}) {
  const normCode = extractFunction('normalizeWhatsAppPhone');
  const valCode = extractFunction('validateCustomerRecipient');
  const sessCreateCode = extractFunction('createShareSession');
  const sessCurrentCode = extractFunction('isSessionCurrent');
  const copyCanvasCode = extractFunction('copyCanvasImageToClipboard');
  const shareDocCode = extractFunction('shareBookingDocument');

  const events = {
    clipboardImagesWritten: 0,
    clipboardTextsWritten: [],
    downloadsTriggered: [],
    urlsOpened: [],
    nativeSharesCalled: [],
    toasts: [],
    statusBars: {},
    drawnPages: []
  };

  const domElements = {};
  const fakePngBlob = { type: 'image/png', size: 12345 };
  const fakePdfBlob = { type: 'application/pdf', size: 23456 };

  function getEl(id) {
    if (!domElements[id]) {
      domElements[id] = {
        id,
        value: id.includes('lang') ? (envConfig.docLang === 'ar' ? 'Arabic' : 'English') : '',
        checked: Boolean(envConfig.embedCaptionChecked),
        textContent: '',
        style: {},
        toBlob(cb, mime) {
          cb(fakePngBlob);
        },
        getContext() {
          return {};
        }
      };
    }
    return domElements[id];
  }

  const mockWindow = {
    isSecureContext: envConfig.isSecureContext !== undefined ? envConfig.isSecureContext : true,
    __ALLOW_NATIVE_FILE_SHARE__: true,
    ClipboardItem: envConfig.clipboardImageSupported !== false
      ? function ClipboardItem(items) { this.items = items; }
      : undefined,
    open(url) {
      events.urlsOpened.push(url);
    }
  };

  const mockNavigator = {
    userAgent: envConfig.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    clipboard: envConfig.clipboardImageSupported !== false
      ? {
          async write(items) {
            if (envConfig.clipboardWriteThrows) throw new Error('Clipboard write blocked');
            events.clipboardImagesWritten += items.length;
          }
        }
      : undefined,
    canShare: envConfig.nativeShareSupported
      ? function(data) {
          return Boolean(data && data.files && data.files.length > 0);
        }
      : undefined,
    share: envConfig.nativeShareSupported
      ? async function(data) {
          if (envConfig.nativeShareAborts) {
            const err = new Error('User cancelled');
            err.name = 'AbortError';
            throw err;
          }
          if (envConfig.nativeShareFails) {
            throw new Error('Share failed');
          }
          events.nativeSharesCalled.push(data);
        }
      : undefined
  };

  class MockFile {
    constructor(parts, name, opts = {}) {
      this.parts = parts;
      this.name = name;
      this.type = opts.type || '';
      this.size = 12345;
    }
  }

  const factory = new Function(
    'window',
    'navigator',
    'File',
    'ClipboardItem',
    'events',
    'getEl',
    'fakePdfBlob',
    `
    const App = {
      lang: '${envConfig.appLang || 'en'}',
      pdfMode: 'confirmation',
      activeCustomerBooking: null,
      activeDriverBooking: null,
      activePdfBooking: null,
      activeShareSession: null,
      activeCanvasRenderOpts: null
    };
    let _shareSessionCounter = 0;
    function $(id) { return getEl(id); }
    function showToast(msg, isErr) { events.toasts.push({ msg, isErr: Boolean(isErr) }); }
    async function copyTextToClipboard(text) {
      events.clipboardTextsWritten.push(text);
      return true;
    }
    function triggerBlobDownload(blob, filename) {
      events.downloadsTriggered.push({ filename, type: blob.type });
    }
    function drawVendoraPageOnCanvas(canvas, b, pageType, forcedHeight, overrideDocLang, extraOpts) {
      const effectiveOpts = extraOpts || App.activeCanvasRenderOpts || null;
      events.drawnPages.push({ id: b.id, pageType, overrideDocLang, extraOpts: effectiveOpts });
    }
    function buildPdfBlobFromCanvases(canvases) {
      return fakePdfBlob;
    }
    function setShareModalStatus(dialogId, statusMsg, caption) {
      events.statusBars[dialogId] = { statusMsg, caption };
    }
    ${normCode}
    ${valCode}
    ${sessCreateCode}
    ${sessCurrentCode}
    ${copyCanvasCode}
    ${shareDocCode}
    return { App, shareBookingDocument, getEl };
  `
  );

  const instance = factory(
    mockWindow,
    mockNavigator,
    MockFile,
    mockWindow.ClipboardItem,
    events,
    getEl,
    fakePdfBlob
  );

  return { ...instance, events };
}

const sampleCustomerBooking = {
  id: 'V-101',
  customerName: 'Ahmed Al-Doseri',
  customerPhone: '+973 3999 1122',
  whatsapp: 'https://wa.me/97339991122',
  driverName: 'Ali Hassan',
  driverPhone: '+973 3666 7788',
  fare: '40',
  currency: 'BHD',
  paymentStatus: 'Unpaid'
};

test('Windows Chrome / Edge Desktop Fallback: Share Picture with Caption NEVER overwrites clipboard PNG with text', async () => {
  const h = createSharingHarness({
    nativeShareSupported: false,
    clipboardImageSupported: true,
    docLang: 'en'
  });

  const res = await h.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'confirmation',
    format: 'image',
    caption: 'Vendora Confirmation #V-101',
    targetPhone: '97339991122',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'en',
    actionMode: 'share'
  });

  assert.equal(res.ok, true);
  assert.equal(res.mode, 'fallback_wa_image');
  // CRITICAL CHECK: Image was written to clipboard AND text was NOT written to clipboard over it!
  assert.equal(h.events.clipboardImagesWritten, 1, 'PNG image must be copied to clipboard');
  assert.equal(
    h.events.clipboardTextsWritten.length,
    0,
    'copyTextToClipboard must NOT be called during desktop image share fallback, preserving the PNG on the clipboard'
  );
  assert.equal(h.events.urlsOpened.length, 1, 'WhatsApp chat must open once');
  assert.ok(
    h.events.urlsOpened[0].startsWith('https://wa.me/97339991122?text='),
    'WhatsApp URL must target verified customer phone with prefilled caption'
  );
  assert.ok(
    h.events.statusBars['dlg-cust'].statusMsg.includes('Ctrl+V'),
    'Status bar must instruct operator to press Ctrl+V to paste the image'
  );
});

test('Android Chrome (Native Web Share Level 2): Share Picture with Caption shares PNG File + text natively without fallback download', async () => {
  const h = createSharingHarness({
    nativeShareSupported: true,
    clipboardImageSupported: true,
    docLang: 'ar',
    appLang: 'ar'
  });

  const res = await h.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'confirmation',
    format: 'image',
    caption: 'تأكيد حجز فيندورا #V-101',
    targetPhone: '97339991122',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'ar',
    actionMode: 'share'
  });

  assert.equal(res.ok, true);
  assert.equal(res.mode, 'native_share');
  assert.equal(h.events.nativeSharesCalled.length, 1, 'navigator.share must be invoked once');
  assert.equal(h.events.nativeSharesCalled[0].files[0].type, 'image/png', 'Shared file must be image/png');
  assert.ok(h.events.nativeSharesCalled[0].text.includes('V-101'), 'Shared payload must include Arabic caption');
  assert.equal(h.events.downloadsTriggered.length, 0, 'Must not trigger redundant file download when native share succeeds');
  assert.equal(h.events.urlsOpened.length, 0, 'Must not open extra wa.me tab when native share succeeds');
});

test('All Discrete Image Actions: Share Image Only, Copy Image, Copy Image + Caption, Download Image, and Embedded Caption', async () => {
  // 1. Share Image Only (Native Share omits text payload)
  const h1 = createSharingHarness({ nativeShareSupported: true, clipboardImageSupported: true });
  await h1.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'confirmation',
    format: 'image',
    caption: '',
    targetPhone: '97339991122',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'en',
    actionMode: 'share',
    omitCaptionInShare: true
  });
  assert.equal(h1.events.nativeSharesCalled.length, 1);
  assert.equal(h1.events.nativeSharesCalled[0].text, undefined, 'Share image only must omit text from native share payload');

  // 2. Copy Image Only (no WhatsApp window opened)
  const h2 = createSharingHarness({ nativeShareSupported: false, clipboardImageSupported: true });
  const res2 = await h2.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'confirmation',
    format: 'image',
    caption: 'Caption text',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'en',
    actionMode: 'copy_image'
  });
  assert.equal(res2.mode, 'copy_image');
  assert.equal(h2.events.clipboardImagesWritten, 1);
  assert.equal(h2.events.urlsOpened.length, 0, 'Copy picture must not open WhatsApp');

  // 3. Copy Image + Caption (Embeds caption onto canvas and copies PNG without overwriting clipboard)
  const h3 = createSharingHarness({ nativeShareSupported: false, clipboardImageSupported: true });
  const res3 = await h3.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'confirmation',
    format: 'image',
    caption: 'Complete embedded caption #V-101',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'en',
    actionMode: 'copy_image_caption',
    forceEmbedCaption: true
  });
  assert.equal(res3.mode, 'copy_image_caption');
  assert.equal(h3.events.clipboardImagesWritten, 1);
  assert.equal(h3.events.clipboardTextsWritten.length, 0, 'Must not overwrite clipboard PNG');
  assert.equal(
    h3.events.drawnPages[0].extraOpts.embedCaptionText,
    'Complete embedded caption #V-101',
    'forceEmbedCaption must pass caption text into drawVendoraPageOnCanvas'
  );

  // 4. Download Image Only
  const h4 = createSharingHarness({ nativeShareSupported: false, clipboardImageSupported: true });
  const res4 = await h4.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'confirmation',
    format: 'image',
    caption: 'Caption',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'en',
    actionMode: 'download'
  });
  assert.equal(res4.mode, 'download');
  assert.equal(h4.events.downloadsTriggered.length, 1);
  assert.equal(h4.events.downloadsTriggered[0].filename, 'Vendora-Confirmation-V-101.png');
  assert.equal(h4.events.urlsOpened.length, 0);
});

test('PDF Sharing Repair: Desktop fallback downloads valid PDF, opens WhatsApp chat, and provides truthful two-step attachment instructions', async () => {
  const h = createSharingHarness({
    nativeShareSupported: false,
    clipboardImageSupported: true,
    docLang: 'en'
  });

  const res = await h.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'invoice',
    format: 'pdf',
    caption: 'Official Invoice #V-101',
    targetPhone: '97339991122',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'en',
    actionMode: 'share'
  });

  assert.equal(res.ok, true);
  assert.equal(res.mode, 'fallback_wa_pdf');
  assert.equal(h.events.downloadsTriggered.length, 1, 'PDF must be downloaded once');
  assert.equal(h.events.downloadsTriggered[0].filename, 'Vendora-Invoice-V-101.pdf');
  assert.equal(h.events.downloadsTriggered[0].type, 'application/pdf');
  assert.equal(h.events.urlsOpened.length, 1, 'WhatsApp chat must open once');
  assert.ok(h.events.urlsOpened[0].startsWith('https://wa.me/97339991122?text='));

  const statusMsg = h.events.statusBars['dlg-cust'].statusMsg;
  assert.ok(
    statusMsg.includes('PDF downloaded (Vendora-Invoice-V-101.pdf)') &&
    statusMsg.includes('please attach the downloaded PDF file manually in chat'),
    'Status bar must truthfully instruct operator to attach the downloaded PDF in WhatsApp'
  );
});

test('Driver Sharing Workflow: Uses driver_dispatch pageType, targets driver phone, and includes 24h registration link', async () => {
  const h = createSharingHarness({
    nativeShareSupported: false,
    clipboardImageSupported: true,
    docLang: 'ar',
    appLang: 'ar'
  });

  const res = await h.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'driver_dispatch',
    format: 'image',
    caption: 'تفاصيل المشوار #V-101 https://getvendora.net/d/tok-101',
    targetPhone: '97336667788',
    dialogIdToClose: 'dlg-driver',
    isCustomerShare: false,
    docLang: 'ar',
    actionMode: 'share',
    extraCanvasOpts: { useDriverSheet: true, fareMode: 'cash', includePayout: true }
  });

  assert.equal(res.ok, true);
  assert.equal(h.events.drawnPages[0].pageType, 'driver_dispatch', 'Driver share must use driver_dispatch document template');
  assert.equal(h.events.drawnPages[0].overrideDocLang, 'ar', 'Driver share must honor Arabic document language');
  assert.equal(h.events.clipboardImagesWritten, 1, 'Driver dispatch PNG must be copied to clipboard');
  assert.equal(h.events.urlsOpened.length, 1);
  assert.ok(
    h.events.urlsOpened[0].startsWith('https://wa.me/97336667788?text='),
    'Driver share must open driver WhatsApp number (+973 3666 7788), never customer number'
  );
  assert.ok(
    decodeURIComponent(h.events.urlsOpened[0]).includes('https://getvendora.net/d/tok-101'),
    'Driver WhatsApp caption must include 24-hour driver registration link'
  );
});

test('Clipboard Unsupported Fallback: Downloads PNG automatically when ClipboardItem is unavailable', async () => {
  const h = createSharingHarness({
    nativeShareSupported: false,
    clipboardImageSupported: false,
    docLang: 'en'
  });

  const res = await h.shareBookingDocument({
    booking: sampleCustomerBooking,
    docType: 'confirmation',
    format: 'image',
    caption: 'Caption',
    dialogIdToClose: 'dlg-cust',
    isCustomerShare: true,
    docLang: 'en',
    actionMode: 'copy_image'
  });

  assert.equal(res.mode, 'copy_image_fallback_download');
  assert.equal(h.events.clipboardImagesWritten, 0, 'No clipboard image write when unsupported');
  assert.equal(h.events.downloadsTriggered.length, 1, 'Must automatically fall back to downloading PNG');
  assert.equal(h.events.downloadsTriggered[0].filename, 'Vendora-Confirmation-V-101.png');
  assert.ok(
    h.events.statusBars['dlg-cust'].statusMsg.includes('downloaded Vendora-Confirmation-V-101.png'),
    'Status bar must truthfully report that image was downloaded instead of copied'
  );
});

test('1-Tap Driver Assigned Customer Notification: Opens Customer WhatsApp with only Driver Name, Driver Phone, and Mutual Contact Reassurance', () => {
  assert.ok(html.includes('id="btn-wa-cust-driver-assigned"'), 'Dedicated 1-tap button must exist in #dlg-cust');
  assert.ok(html.includes('data-action="approve-and-notify-customer"'), '1-tap Approve & WhatsApp Customer button must exist on driver link submission banner');
  assert.ok(html.includes('btn-share-driver-contact-primary'), 'Prominent primary Share Driver Contact with Customer button must exist on trip card');

  const normCode = extractFunction('normalizeWhatsAppPhone');
  const valCode = extractFunction('validateCustomerRecipient');
  const buildMsgCode = extractFunction('buildDriverAssignedCustomerMessage');
  const sendWaCode = extractFunction('sendDriverAssignedToCustomerWhatsApp');

  const openedUrls = [];
  const toasts = [];
  const fn = new Function('openedUrls', 'toasts', `
    const App = { lang: 'en' };
    const window = { open(url) { openedUrls.push(url); } };
    function toPureEnglishName(v) { return String(v || ''); }
    function toPureArabicName(v) { return String(v || ''); }
    function showToast(msg, isErr) { toasts.push({ msg, isErr: Boolean(isErr) }); }
    async function copyTextToClipboard() { return true; }
    function logActivity() {}
    ${normCode}
    ${valCode}
    ${buildMsgCode}
    ${sendWaCode}
    return { buildDriverAssignedCustomerMessage, sendDriverAssignedToCustomerWhatsApp };
  `)(openedUrls, toasts);

  // English test
  const okEn = fn.sendDriverAssignedToCustomerWhatsApp(sampleCustomerBooking, 'en');
  assert.equal(okEn, true);
  assert.equal(openedUrls.length, 1);
  assert.ok(openedUrls[0].startsWith('https://wa.me/97339991122?text='), 'Must target verified customer WhatsApp number');
  const decodedEn = decodeURIComponent(openedUrls[0].split('?text=')[1]);
  assert.ok(decodedEn.includes("Your driver has been assigned and will be coming for your order. This is your driver's contact information:"), 'Must state driver will be coming');
  assert.ok(decodedEn.includes('Ali Hassan'), 'Must include driver name');
  assert.ok(decodedEn.includes('+97336667788'), 'Must include driver phone');
  assert.ok(decodedEn.includes('Please contact him in advance, and he will contact you as well'), 'Must instruct customer to contact driver in advance and reassure driver will contact them');

  // Arabic test with Driver Details Received submission from /d/{token}
  const pendingLinkBooking = {
    id: 'V-202',
    customerName: 'سلمان الخليفة',
    customerPhone: '+973 3888 4455',
    driverName: '',
    driverPhone: '',
    pendingDriverSubmission: {
      driverName: 'محمد عبدالله',
      driverPhone: '+973 3777 6655',
      approvalStatus: 'Driver Details Received'
    }
  };
  const okAr = fn.sendDriverAssignedToCustomerWhatsApp(pendingLinkBooking, 'ar');
  assert.equal(okAr, true);
  assert.equal(openedUrls.length, 2);
  assert.ok(openedUrls[1].startsWith('https://wa.me/97338884455?text='));
  const decodedAr = decodeURIComponent(openedUrls[1].split('?text=')[1]);
  assert.ok(decodedAr.includes('محمد عبدالله'), 'Must include driver name submitted via invite link');
  assert.ok(decodedAr.includes('+97337776655'), 'Must include driver phone submitted via invite link');
  assert.ok(decodedAr.includes('يرجى التواصل معه مسبقاً، كما سيقوم السائق بالتواصل معكم أيضاً'), 'Must include Arabic mutual contact reassurance');
});

test('Driver Dispatch WhatsApp Formula (V-052): Matches exact bulleted layout, no separate customer WA URL, and no invented customer name', () => {
  const normCode = extractFunction('normalizeWhatsAppPhone');
  const locLugCode = extractFunction('localizeLuggage');
  const locVehCode = extractFunction('localizeVehicle');
  const fmtFlightCode = extractFunction('formatFlightForWhatsApp');
  const fmtCurrCode = extractFunction('formatCurrencyForWhatsApp');
  const parseLocCode = extractFunction('parseLocationField');
  const padTimeCode = extractFunction('formatDriverTime12hPadded');
  const extFlightCode = extractFunction('extractFlightAndArrivalForDriver');
  const fmtPaxCode = extractFunction('formatPassengersForDriver');
  const realCustCode = extractFunction('getRealCustomerNameForDriver');
  const updDrvCode = extractFunction('updateDriverPreview');

  let previewText = '';
  const elements = {
    'sel-drv-lang': { value: 'Arabic' },
    'sel-drv-faremode': { value: 'prepaid' },
    'inp-drv-note': { value: '' },
    'chk-flight': { checked: true },
    'chk-route': { checked: true },
    'chk-pax': { checked: true },
    'chk-car': { checked: true },
    'chk-fare': { checked: false },
    'chk-payout': { checked: false },
    'chk-cust-name': { checked: true },
    'chk-cust-phone': { checked: true },
    'preview-drv-text': {
      set textContent(v) { previewText = v; },
      get textContent() { return previewText; },
      style: {}
    }
  };

  const bookingV052 = {
    id: 'V-052',
    travelDate: '2026-10-19',
    flightArrival: '08:45 AM',
    pickupTime: '09:30 AM',
    flight: 'EK837',
    pickup: 'مطار البحرين الدولي',
    destination: 'الرياض – العليا والفيحاء',
    passengers: '3',
    luggage: '3 large, 2 small',
    vehicle: 'GMC Yukon XL 2020',
    customerName: '', // No customer name provided -> must NOT invent a placeholder name!
    customerPhone: '+966 50 861 0669',
    driverInvite: {
      token: 'swYhB8K4Ftbpu5rEqJeD',
      url: 'https://getvendora.net/d/swYhB8K4Ftbpu5rEqJeD'
    }
  };

  const runPreview = new Function('elements', 'booking', `
    const App = { activeDriverBooking: booking, drvTemplateStyle: 'full', lang: 'ar' };
    function $(id) { return elements[id] || { value: '', checked: true, style: {} }; }
    function toPureArabicText(s) { return String(s || ''); }
    function localizeLocation(s) { return String(s || ''); }
    function toPureArabicName(s) { return String(s || ''); }
    function toPureEnglishName(s) { return String(s || ''); }
    function formatTimeForWhatsApp(b) { return b.pickupTime || ''; }
    function formatDateHeader(d) { return d; }
    ${normCode}
    ${locLugCode}
    ${locVehCode}
    ${fmtFlightCode}
    ${fmtCurrCode}
    ${parseLocCode}
    ${padTimeCode}
    ${extFlightCode}
    ${fmtPaxCode}
    ${realCustCode}
    ${updDrvCode}
    updateDriverPreview();
    return elements['preview-drv-text'].textContent;
  `);

  const outputNoName = runPreview(elements, bookingV052);
  assert.ok(outputNoName.includes('🚘 فانديرا للنقل | تكليف رحلة'));
  assert.ok(outputNoName.includes('رقم الحجز: V-052'));
  assert.ok(outputNoName.includes('• وصول الطائرة: 08:45 صباحاً'));
  assert.ok(outputNoName.includes('• وقت الاستلام: 09:30 صباحاً'));
  assert.ok(outputNoName.includes('• رقم الرحلة: EK837'));
  assert.ok(outputNoName.includes('• مكان الاستلام: مطار البحرين الدولي'));
  assert.ok(outputNoName.includes('• الوجهة: الرياض – العليا والفيحاء'));
  assert.ok(outputNoName.includes('• عدد الركاب: 3 أشخاص'));
  assert.ok(outputNoName.includes('• الحقائب: 3 كبيرة و2 صغيرة'));
  assert.ok(outputNoName.includes('• المركبة: جمس يوكن XL 2020'));
  assert.ok(outputNoName.includes('📞 بيانات العميل\nرقم التواصل:\n\u200E+966508610669'), 'When customer name is missing, must show only رقم التواصل and phone without inventing a name');
  assert.ok(!outputNoName.includes('عميلنا الكريم'), 'Must never invent عميلنا الكريم in driver message');
  assert.ok(!outputNoName.includes('https://wa.me/'), 'Must not include separate customer WhatsApp URL in driver message');
  assert.ok(outputNoName.includes('🔐 تسجيل بيانات السائق\nيرجى تسجيل البيانات التالية:\n* اسم السائق\n* رقم الهاتف\n\nاضغط على الرابط لتسجيل بياناتك:\nhttps://getvendora.net/d/swYhB8K4Ftbpu5rEqJeD'));
  assert.ok(outputNoName.includes('مهم: سيتم مشاركة بياناتك مع العميل لتسهيل التواصل معك مباشرة عند الحاجة، وتجنب أي تأخير أو إلغاء للرحلة بسبب صعوبة التواصل.'));
  assert.ok(outputNoName.includes('Vendora Transport\n🌐 https://getvendora.net'));

  // Now test when customer name IS present in the booking -> must appear above رقم التواصل:
  const bookingWithName = Object.assign({}, bookingV052, { customerName: 'فهد الدوسري' });
  const outputWithName = runPreview(elements, bookingWithName);
  assert.ok(outputWithName.includes('📞 بيانات العميل\nفهد الدوسري\nرقم التواصل:\n\u200E+966508610669'), 'When customer name is present, must display it above رقم التواصل:');
});

