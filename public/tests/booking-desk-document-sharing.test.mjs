import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const htmlPath = fs.existsSync('public/booking-desk/index.html')
  ? path.resolve('public/booking-desk/index.html')
  : path.resolve('booking-desk/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('Document Sharing Workflow: Buttons and IDs exist for Driver and Customer', () => {
  // Driver modal buttons
  assert.ok(html.includes('id="btn-drv-share-img"'), 'Driver Share Image button must exist');
  assert.ok(html.includes('id="btn-drv-share-pdf"'), 'Driver Share PDF button must exist');
  assert.ok(html.includes('id="btn-copy-drv"'), 'Driver Copy Message button must exist');

  // Customer modal buttons
  assert.ok(html.includes('id="btn-cust-share-img"'), 'Customer Share Image button must exist');
  assert.ok(html.includes('id="btn-cust-share-pdf"'), 'Customer Share PDF button must exist');
  assert.ok(html.includes('id="btn-copy-cust"'), 'Customer Copy Message button must exist');
});

test('Document Sharing Workflow: shareBookingDocument function implements Web Share API with canShare and fallback', () => {
  assert.ok(html.includes('async function shareBookingDocument'), 'shareBookingDocument function must be defined');
  assert.ok(html.includes('navigator.canShare({ files: [fileToShare] })'), 'Must check navigator.canShare before sharing files');
  assert.ok(html.includes('navigator.share({'), 'Must call navigator.share with files and caption');
  assert.ok(html.includes('files: [fileToShare]'), 'Must pass real File object to navigator.share');
  assert.ok(html.includes('text: caption'), 'Must pass caption text to navigator.share');
  assert.ok(html.includes('err.name === \'AbortError\''), 'Must handle user share cancellation gracefully without error toast');
  assert.ok(html.includes('copyTextToClipboard(caption)'), 'Must copy caption to clipboard on mobile as safety backup');
});

test('Document Sharing Workflow: Fallback copies document image, downloads file, and opens WhatsApp', () => {
  assert.ok(html.includes('copyCanvasImageToClipboard(canvas)'), 'Fallback must copy canvas image to clipboard');
  assert.ok(html.includes('triggerBlobDownload(fallbackBlob, filename)'), 'Fallback must trigger file download');
  assert.ok(html.includes('https://wa.me/'), 'Fallback must open WhatsApp with encoded caption');
});

test('Customer Name Fallback: Customer preview uses Valued Customer / عميلنا الكريم while Driver preview uses getRealCustomerNameForDriver without inventing a name', () => {
  assert.ok(html.includes('Valued Customer'), 'English fallback customer name must be Valued Customer');
  assert.ok(html.includes('عميلنا الكريم'), 'Arabic fallback customer name must be عميلنا الكريم');
  assert.ok(html.includes('getRealCustomerNameForDriver(b.customerName, isAr)'), 'Driver preview must only include real customer name if present without inventing a placeholder');
  assert.ok(html.includes("(isAr ? toPureArabicName(rawCustInput || b.customerName) : toPureEnglishName(rawCustInput || b.customerName)) || (isAr ? 'عميلنا الكريم' : 'Valued Customer')"), 'Customer preview must fallback to عميلنا الكريم / Valued Customer');
});

test('Customer Confirmation: Driver unassigned messaging strictly enforced', () => {
  // English message requirement
  assert.ok(html.includes("Your driver's contact details will be shared with you shortly."), 'English copy must inform customer driver details will be shared shortly');
  // Arabic message requirement
  assert.ok(html.includes('سيتم تزويدكم ببيانات السائق ورقم التواصل قريباً.'), 'Arabic copy must inform customer driver details will be shared shortly');
});

test('Driver Sharing: Relevant customer contact info enabled by default', () => {
  assert.ok(html.includes("$('chk-cust-phone').checked = true"), 'Customer phone must be checked by default in driver modal');
  assert.ok(html.includes("$('chk-cust-name').checked = true"), 'Customer name must be checked by default in driver modal');
  assert.ok(html.includes('shortInviteUrl'), 'Driver caption must include 24-hour driver invite link');
});

test('Mobile Layout Corrections: Viewport constraints and tpl-switcher wrapping', () => {
  assert.ok(html.includes('flex-wrap: wrap'), 'tpl-switcher must wrap buttons to prevent horizontal overflow');
  assert.ok(html.includes('max-width: 100%'), 'form inputs and selects must have max-width 100%');
  assert.ok(html.includes('box-sizing: border-box'), 'form inputs must have border-box sizing');
});

test('Bilingual Support: syncLanguageUI translates sharing buttons in Arabic and English', () => {
  assert.ok(html.includes('Share Invoice Image + Caption'), 'English translation for invoice image share button');
  assert.ok(html.includes('مشاركة صورة الفاتورة + النص'), 'Arabic translation for invoice image share button');
  assert.ok(html.includes('Share Confirmation Image + Caption'), 'English translation for confirmation image share button');
  assert.ok(html.includes('مشاركة صورة التأكيد + النص'), 'Arabic translation for confirmation image share button');
});

test('Driver Assignment WhatsApp Template: Strictly adheres to user approved format', () => {
  assert.ok(html.includes('🚘 فانديرا للنقل | تكليف رحلة'), 'Header must match user approved Arabic header');
  assert.ok(html.includes('رقم الحجز:'), 'Must include رقم الحجز:');
  assert.ok(html.includes('• التاريخ:'), 'Must include bulleted date');
  assert.ok(html.includes('• وصول الطائرة:'), 'Must include bulleted flight arrival time when present');
  assert.ok(html.includes('• وقت الاستلام:'), 'Must include bulleted pickup time');
  assert.ok(html.includes('• رقم الرحلة:'), 'Must include bulleted flight number');
  assert.ok(html.includes('• مكان الاستلام:'), 'Must include bulleted pickup location');
  assert.ok(html.includes('• الوجهة:'), 'Must include bulleted destination');
  assert.ok(html.includes('• عدد الركاب:'), 'Must include bulleted passenger count');
  assert.ok(html.includes('• الحقائب:'), 'Must include bulleted luggage');
  assert.ok(html.includes('• المركبة:'), 'Must include bulleted vehicle');
  assert.ok(html.includes('📞 بيانات العميل'), 'Must include customer details header');
  assert.ok(html.includes('رقم التواصل:'), 'Must include contact number label');
  assert.ok(html.includes('🔐 تسجيل بيانات السائق'), 'Must include driver registration header');
  assert.ok(html.includes('يرجى تسجيل البيانات التالية:'), 'Must include registration instructions');
  assert.ok(html.includes('* اسم السائق'), 'Must list driver name requirement');
  assert.ok(html.includes('* رقم الهاتف'), 'Must list phone number requirement');
  assert.ok(html.includes('اضغط على الرابط لتسجيل بياناتك:'), 'Must include link prompt');
  assert.ok(html.includes('⏳ الرابط صالح لمدة 24 ساعة.'), 'Must include 24 hour validity notice');
  assert.ok(html.includes('مهم: سيتم مشاركة بياناتك مع العميل لتسهيل التواصل معك مباشرة عند الحاجة، وتجنب أي تأخير أو إلغاء للرحلة بسبب صعوبة التواصل.'), 'Must include important customer sharing notice');
  assert.ok(html.includes('Vendora Transport'), 'Must include Vendora Transport brand name');
  assert.ok(html.includes('🌐 https://getvendora.net'), 'Must include Vendora website URL');
});

test('Driver Modal: Dedicated Copy Driver Registration Link button exists', () => {
  assert.ok(html.includes('id="btn-drv-copy-invite"'), 'Button btn-drv-copy-invite must exist');
  assert.ok(html.includes('🔗 نسخ رابط تسجيل السائق'), 'Arabic translation for copy invite link');
  assert.ok(html.includes('🔗 Copy Driver Registration Link'), 'English translation for copy invite link');
});

test('Customer Modal: 4 Action Buttons exist in dlg-cust with proper IDs and responsive structure', () => {
  assert.ok(html.includes('id="btn-cust-share-img"'), 'Primary Image share button must exist');
  assert.ok(html.includes('id="btn-cust-share-pdf"'), 'Secondary PDF share button must exist');
  assert.ok(html.includes('id="btn-copy-cust"'), 'Copy Caption button must exist');
  assert.ok(html.includes('id="btn-wa-cust"'), 'Open Customer WhatsApp button must exist');
  assert.ok(html.includes('id="btn-sent-cust"'), 'Mark Sent button must exist');
});

test('Customer Sharing: normalizeWhatsAppPhone accurately normalizes Gulf and international numbers', () => {
  const fnMatch = html.match(/function normalizeWhatsAppPhone\(val\) \{[\s\S]*?\n    \}/);
  assert.ok(fnMatch, 'normalizeWhatsAppPhone function must exist in index.html');

  const fnCode = fnMatch[0];
  const normalizeWhatsAppPhone = new Function('val', `${fnCode}\nreturn normalizeWhatsAppPhone(val);`);

  assert.equal(normalizeWhatsAppPhone('+973 3638 2200'), '97336382200', 'Bahrain international formatted');
  assert.equal(normalizeWhatsAppPhone('36382200'), '97336382200', 'Bahrain local 8 digits gets 973 prefix');
  assert.equal(normalizeWhatsAppPhone('00966507080997'), '966507080997', 'Saudi with 00 gets clean international digits');
  assert.equal(normalizeWhatsAppPhone('+966 50 708 0997'), '966507080997', 'Saudi international formatted');
  assert.equal(normalizeWhatsAppPhone('0507080997'), '966507080997', 'Saudi local 05 gets 9665 prefix');
  assert.equal(normalizeWhatsAppPhone('+971 50 123 4567'), '971501234567', 'UAE number preserved');
  assert.equal(normalizeWhatsAppPhone('+44 7911 123456'), '447911123456', 'UK number preserved without distortion');
  assert.equal(normalizeWhatsAppPhone(''), '', 'Empty returns empty string');
});

test('Customer Sharing: Image and PDF generate genuine distinct formats and professional filenames', () => {
  // Check image branch generates image/png and Vendora-Confirmation-*.png
  assert.ok(html.includes("filename = `${filePrefix}-${safeId}.png`"), 'Filename must be Vendora-Confirmation-*.png');
  assert.ok(html.includes("canvas.toBlob((blob) => {\n            resolve(blob);\n          }, 'image/png')"), 'Must generate real image/png blob');
  assert.ok(html.includes("fileToShare = new File([pngBlob], filename, { type: 'image/png' })"), 'Must wrap in File with image/png MIME');

  // Check PDF branch generates application/pdf and Vendora-Confirmation-*.pdf
  assert.ok(html.includes("filename = `${filePrefix}-${safeId}.pdf`"), 'Filename must be Vendora-Confirmation-*.pdf');
  assert.ok(html.includes("fileToShare = new File([pdfBlob], filename, { type: 'application/pdf' })"), 'Must wrap in File with application/pdf MIME');
});

test('Customer Sharing: Open Customer WhatsApp button uses https://wa.me/{digits} and pre-copies text', () => {
  assert.ok(html.includes('https://wa.me/${cleanDigits}'), 'Open WA must target wa.me with cleanDigits');
  assert.ok(html.includes('await copyTextToClipboard(rawTxt)'), 'Open WA must copy text before opening');
});

test('Driver Sharing: Shares driver document, includes customer contact number (no separate WA link) + 24-hour driver confirmation URL', () => {
  assert.ok(html.includes('id="btn-wa-drv"'), 'Driver modal must contain direct WhatsApp action button btn-wa-drv');
  assert.ok(html.includes('رقم التواصل:'), 'Driver message must include customer contact number');
  assert.ok(html.includes('https://getvendora.net/d/'), 'Driver message must construct 24-hour driver confirmation link');
  assert.ok(html.includes('ensureDriverInviteForBooking'), 'ensureDriverInviteForBooking must ensure active invite for booking');
});


