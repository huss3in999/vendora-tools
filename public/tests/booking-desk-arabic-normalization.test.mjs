import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'booking-desk', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const scriptContent = html.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/i)[1];

function createIsolatedContext(mockAppLang = 'en') {
  const dummyEl = new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'value') return '';
      if (prop === 'textContent') return '';
      if (prop === 'style') return {};
      if (prop === 'classList') return { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false };
      if (prop === 'querySelectorAll') return () => [];
      if (prop === 'querySelector') return () => dummyEl;
      if (prop === 'getContext') return () => ({
        measureText: (text) => ({ width: text.length * 10 }),
        fillText: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} })
      });
      return () => dummyEl;
    },
    set: () => true
  });

  const context = {
    console,
    Math,
    Date,
    Intl,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    Set,
    Map,
    parseFloat,
    parseInt,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    $: () => dummyEl,
    document: {
      documentElement: dummyEl,
      body: dummyEl,
      head: dummyEl,
      createElement: () => dummyEl,
      getElementById: () => dummyEl,
      querySelectorAll: () => [dummyEl],
      querySelector: () => dummyEl
    },
    navigator: {
      clipboard: { writeText: async () => {}, write: async () => {} }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    window: {
      addEventListener: () => {},
      removeEventListener: () => {}
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptContent + '\nwindow.__App = App; window.__fn = { formatTimeTo12hArabic, localizeLocation, toPureArabicText, buildTripSummaryWhatsAppText };', context);
  context.__App.lang = mockAppLang;
  return { fn: context.__fn, App: context.__App };
}

test('1. Arabic Normalization: Operational phrases translation', () => {
  const { fn } = createIsolatedContext('ar');
  const b1 = { pickupTime: 'pickup after immigration', notes: '' };
  assert.equal(fn.formatTimeTo12hArabic(b1.pickupTime, true), 'الاستلام بعد إنهاء إجراءات الجوازات');

  const b2 = { pickupTime: 'pickup after immigration/baggage', notes: '' };
  assert.equal(fn.formatTimeTo12hArabic(b2.pickupTime, true), 'الاستلام بعد إنهاء إجراءات الجوازات واستلام الأمتعة');

  const b3 = { pickupTime: 'pickup after airport procedures', notes: '' };
  assert.equal(fn.formatTimeTo12hArabic(b3.pickupTime, true), 'الاستلام بعد إجراءات المطار');

  assert.equal(fn.toPureArabicText('name pending'), 'الاسم غير مؤكد');
});

test('2. Arabic Normalization: Proper nouns and grammar descriptor word order', () => {
  const { fn } = createIsolatedContext('ar');
  
  // District: Descriptor before name, no "Al Qurtubah حي"
  const qurtubahRes = fn.localizeLocation('Al Qurtubah District, Riyadh', 'ar');
  assert.ok(qurtubahRes.includes('حي القرطبة'), 'Must use حي القرطبة');
  assert.ok(!qurtubahRes.includes('Al Qurtubah حي'), 'Must not have inverted Al Qurtubah حي');

  // Hotel: Descriptor before name, no "Novo فندق"
  const hotelRes = fn.localizeLocation('Novo Hotel, Olaya Street, Riyadh', 'ar');
  assert.ok(hotelRes.includes('فندق نوفو'), 'Must use فندق نوفو');
  assert.ok(!hotelRes.includes('Novo فندق'), 'Must not have inverted Novo فندق');

  // Compound: Descriptor before name
  const compRes = fn.localizeLocation('Andorra Village Compound, Saudi Arabia', 'ar');
  assert.ok(compRes.includes('مجمع قرية أندورا'), 'Must use مجمع قرية أندورا');
  assert.ok(!compRes.includes('Compound مجمع'), 'Must not have inverted compound');

  // Special cases: Between Residential, Marassi, and Hotel in Saudi Eastern Province
  const betweenRes = fn.localizeLocation('Between Residential | بيتوين ريزيدنشال, Riyadh', 'ar');
  assert.ok(betweenRes.includes('بيتوين ريزيدنشال (حي سكني)'), 'Must translate Between Residential cleanly');

  const marassiRes = fn.localizeLocation('Marassi, Bahrain', 'ar');
  assert.ok(marassiRes.includes('مراسي، البحرين'), 'Must translate Marassi to مراسي');

  const eastHotelRes = fn.localizeLocation('Hotel in Saudi Eastern Province', 'ar');
  assert.ok(eastHotelRes.includes('فندق في المنطقة الشرقية، السعودية'), 'Must translate Hotel in Saudi Eastern Province');
  assert.ok(!eastHotelRes.includes('in Saudi'), 'Must not leak English in Saudi');
});

test('3. Arabic Normalization: Time formatting in Arabic uses ص and م', () => {
  const { fn } = createIsolatedContext('ar');
  
  assert.equal(fn.formatTimeTo12hArabic('10:35 AM', true), '10:35 ص');
  assert.equal(fn.formatTimeTo12hArabic('11:30 PM', true), '11:30 م');
  assert.equal(fn.formatTimeTo12hArabic('08:10 arrival', true), '8:10 ص (وصول الرحلة)');
  assert.equal(fn.formatTimeTo12hArabic('21:00 estimated arrival', true), '9:00 م (وصول متوقع)');
  
  const complexTime = fn.formatTimeTo12hArabic('10:35 scheduled arrival; 11:15 requested pickup', true);
  assert.ok(complexTime.includes('11:15 ص'), 'Main pickup time must be 11:15 ص');
  assert.ok(complexTime.includes('10:35 ص'), 'Arrival time must be 10:35 ص');
  assert.ok(!complexTime.includes('AM'), 'Must not contain English AM');
  assert.ok(!complexTime.includes('PM'), 'Must not contain English PM');
});

test('4. Language Consistency: App.lang = "en" does NOT leak into Arabic Trip Summary', () => {
  const { fn, App } = createIsolatedContext('en');
  assert.equal(App.lang, 'en');

  const sampleTrips = [
    {
      id: 'V-020',
      travelDate: '2026-10-21',
      pickupTime: '10:35 scheduled arrival; 11:15 requested pickup',
      pickup: 'Bahrain International Airport',
      destination: 'Between Residential | بيتوين ريزيدنشال, Riyadh',
      fare: '150',
      currency: 'BHD',
      driverName: 'سائق معتمد'
    }
  ];

  const waText = fn.buildTripSummaryWhatsAppText(sampleTrips, { lang: 'ar', dateLabel: 'الأربعاء، ٢١ أكتوبر ٢٠٢٦' });

  assert.ok(waText.includes('فندورا للنقل | ملخص الرحلات'), 'Must have Arabic brand header');
  assert.ok(waText.includes('←'), 'Must use Arabic route arrow ←');
  assert.ok(waText.includes('مطار البحرين الدولي'), 'Must translate airport to Arabic');
  assert.ok(waText.includes('بيتوين ريزيدنشال (حي سكني)، الرياض'), 'Must translate destination to Arabic');
  assert.ok(waText.includes('11:15 ص'), 'Must use Arabic ص for pickup');
  assert.ok(!waText.includes(' AM'), 'Must not contain English AM');
  assert.ok(!waText.includes(' PM'), 'Must not contain English PM');
  assert.ok(waText.includes('إجمالي الرحلات: 1'), 'Must have Arabic trip count');
  assert.ok(waText.includes('150.000 د.ب'), 'Must format BHD in Arabic د.ب');
});

test('5. Summary Image: 1400px width and enlarged readable typography targets', () => {
  assert.ok(html.includes('const W = 1400;'), 'Canvas width must be increased to 1400px for WhatsApp readability');
  assert.ok(html.includes('bold 36px Cairo') || html.includes('bold 38px Cairo') || html.includes('bold 40px Cairo'), 'Title font must target 36-40px');
  assert.ok(html.includes('bold 26px Cairo'), 'Subtitle & totals font must target 26px');
  assert.ok(html.includes('bold 25px Cairo'), 'Main route line font must target 25px');
  assert.ok(html.includes('bold 24px Cairo'), 'Reference font must target 24px');
  assert.ok(html.includes('bold 22px Cairo'), 'Time & fare font must target 22px');
  assert.ok(html.includes('20px Cairo'), 'Secondary text & notes must target 20px');
  assert.ok(html.includes('wrapTextLines'), 'Canvas must support dynamic text wrapping');
});
