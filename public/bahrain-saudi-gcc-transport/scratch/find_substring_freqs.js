import fs from 'fs';

const en = fs.readFileSync('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html', 'utf8');

console.log("=== Checking substrings in English page ===");
const words = ['chauffeur', 'chauff', 'driver', 'driv', 'taxi', 'tax', 'price', 'rate', 'fare', 'cost', 'family', 'vip', 'business', 'causeway', 'bridge', 'border', 'document', 'whatsapp', 'wa.me', 'same-day', 'sameday', '7-seater', '7seater', 'yukon', 'gmc', 'xl'];

words.forEach(w => {
  const regex = new RegExp(w, 'gi');
  const count = (en.match(regex) || []).length;
  console.log(`  '${w}' count:`, count);
});

console.log("\n=== Checking substrings in Arabic page ===");
const ar = fs.readFileSync('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html', 'utf8');
const wordsAr = ['توصيل', 'نقل', 'سائق', 'سواق', 'ليموزين', 'تكسي', 'تاكسي', 'جسر', 'ملك', 'فهد', 'شرقية', 'المنطقة', 'جبيل', 'ظهران', 'خبر', 'دمام', 'رياض', 'عراق', 'نجف', 'كربلاء', 'أربعين', 'اربعين', 'زيارة', 'زوار', 'واتساب', 'واتس', 'بكم', 'كم', 'سعر', 'اسعار', 'أسعار', 'مشاوير', 'مشوار'];

wordsAr.forEach(w => {
  const regex = new RegExp(w, 'gi');
  const count = (ar.match(regex) || []).length;
  console.log(`  '${w}' count:`, count);
});
