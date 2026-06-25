import fs from 'fs';

// Let's search for some patterns in index.html and en/index.html to see their exact spelling
const ar = fs.readFileSync('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html', 'utf8');
const en = fs.readFileSync('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html', 'utf8');

console.log("=== Checking Arabic Page content ===");
const patternsAr = [
  'توصيل من البحرين',
  'سائق خاص',
  'سواق',
  'جسر الملك',
  'الدمام',
  'الخبر',
  'المنطقة الشرقية',
  'الجبيل',
  'الظهران',
  'الأحساء',
  'بقيق',
  'القطيف',
  'رأس تنورة',
  'ليموزين',
  'مشاوير',
  'واتساب'
];

patternsAr.forEach(p => {
  console.log(`  '${p}' exists:`, ar.includes(p));
});

console.log("\n=== Checking English Page content ===");
const patternsEn = [
  'private driver',
  'private taxi',
  'chauffeur',
  'Yukon',
  '7 seater',
  '7-seater',
  '7-passenger',
  'tolls',
  'Jesr',
  'Aramco',
  'Diplomatic',
  'visa',
  'same day',
  'WhatsApp'
];

patternsEn.forEach(p => {
  console.log(`  '${p}' exists:`, en.includes(p));
});
