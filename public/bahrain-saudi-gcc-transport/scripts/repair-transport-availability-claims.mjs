import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const excluded = /^(?:admin|ai-chat-test|functions|node_modules|scratch|test-results|tests)(?:[\\/]|$)/;
const changed = [];

function collectHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute);
    if (excluded.test(relative)) continue;
    if (entry.isDirectory()) files.push(...collectHtml(absolute));
    else if (entry.name === "index.html") files.push(absolute);
  }
  return files;
}

const arabicReplacements = [
  [/تشغيل يومي 24 ساعة/g, "استقبال طلبات يومي على مدار الساعة حسب التوفر"],
  [/الخدمة متاحة 24 ساعة و7 أيام في الأسبوع/g, "يمكن إرسال طلب الخدمة على مدار الساعة، ويؤكد الموعد حسب التوفر"],
  [/الخدمة متوفرة 24 ساعة و7 أيام في الأسبوع/g, "يمكن إرسال طلب الخدمة على مدار الساعة، ويؤكد الموعد حسب التوفر"],
  [/هل الخدمة متوفرة 24 ساعة/g, "هل يمكن إرسال طلب الخدمة على مدار الساعة"],
  [/الخدمة متاحة 24 ساعة طوال أيام الأسبوع/g, "يمكن إرسال طلب الخدمة على مدار الساعة، ويؤكد الموعد حسب التوفر"],
  [/خدمة 24 ساعة يومياً/g, "طلبات على مدار الساعة، حسب التوفر وتأكيد الحجز"],
  [/خدمة يومية 24 ساعة/g, "طلبات يومية عبر واتساب حسب التوفر"],
  [/خدمة 24\/7 من وإلى مطار البحرين/g, "طلبات من وإلى مطار البحرين على مدار الساعة حسب التوفر"],
  [/خدمة 24\/7 مع حجز واتساب/g, "طلبات عبر واتساب على مدار الساعة حسب التوفر"],
  [/خدمة 24\/7/g, "طلبات على مدار الساعة حسب التوفر"],
  [/حجز واتساب فوري 24\/7/g, "طلب حجز عبر واتساب على مدار الساعة"],
  [/حجز واتساب فوري/g, "طلب حجز عبر واتساب"],
  [/حجز واتساب سريع 24 ساعة/g, "طلب حجز عبر واتساب على مدار الساعة"],
  [/حجز سريع 24 ساعة/g, "طلب حجز على مدار الساعة حسب التوفر"],
  [/حجز سيارة خاصة 24 ساعة/g, "طلب سيارة خاصة عبر واتساب"],
  [/خدمة ركاب وطرود 24 ساعة/g, "خدمة ركاب وطرود حسب التوفر"],
  [/نقل خاص من البحرين إلى ([^\"<>،]+) 24 ساعة/g, "نقل خاص من البحرين إلى $1 حسب التوفر"],
  [/خدمة نقل خاص من البحرين إلى ([^\"<>،]+) 24 ساعة/g, "خدمة نقل خاص من البحرين إلى $1 حسب التوفر"],
  [/تاكسي ونقل 24 ساعة/g, "تاكسي ونقل حسب التوفر"],
  [/سيارة خاصة 24 ساعة/g, "سيارة خاصة حسب التوفر"],
  [/استقبال وتاكسي مطار 24 ساعة/g, "استقبال وتوصيل مطار حسب التوفر"],
  [/\| 24 ساعة بسيارات GMC\/XL/g, "| خيارات مركبات حسب الرحلة والتوفر"],
  [/\| 24 ساعة \|/g, "| حسب التوفر |"],
  [/\| خدمة يومية 24 ساعة \|/g, "| طلبات يومية حسب التوفر |"],
  [/24 ساعة للركاب والطرود/g, "للركاب والطرود حسب التوفر"],
  [/24 ساعة: ركاب وطرود/g, "للركاب والطرود حسب التوفر:"],
  [/التشغيل 24 ساعة يومياً/g, "يمكن إرسال الطلبات على مدار الساعة حسب التوفر"],
  [/خدمة 24 ساعة يومياً داخل البحرين وإلى السعودية وبقية دول الخليج/g, "يمكن إرسال طلبات النقل داخل البحرين وإلى السعودية وبقية دول الخليج على مدار الساعة، حسب التوفر وتأكيد الحجز"],
  [/خدمة نقل ركاب خاصة 24 ساعة بين البحرين ودول الخليج/g, "خدمة نقل ركاب خاصة بين البحرين ودول الخليج حسب التوفر وتأكيد الحجز"],
  [/24\/7 — مطار وجسر وباب لباب/g, "طلبات على مدار الساعة — مطار وجسر وباب لباب حسب التوفر"],
  [/24 ساعة يومياً/g, "على مدار الساعة حسب التوفر"],
  [/مركبات GMC\s*\/\s*XL، سعة 6 أو 7 ركاب/g, "خيارات مركبات تناسب عدد الركاب والأمتعة حسب التوفر"],
  [/مركبات GMC\s*\/\s*XL تسع حتى 6 أو 7 ركاب/g, "خيارات مركبات تؤكد سعتها حسب عدد الركاب والأمتعة والتوفر"],
  [/GMC\s*\/\s*XL حتى 7 ركاب/g, "خيارات مركبات حسب عدد الركاب والأمتعة والتوفر"],
  [/GMC\s*\/\s*XL بحد أقصى 7 ركاب/g, "خيارات مركبات حسب عدد الركاب والأمتعة والتوفر"],
  [/سعة 6 أو 7 ركاب/g, "سعة تؤكد حسب عدد الركاب والأمتعة"],
  [/سعة حتى 7 ركاب(?: مع أمتعة)?/g, "سعة تؤكد حسب عدد الركاب والأمتعة والتوفر"],
  [/يومياً وعلى مدار الساعة/g, "حسب الموعد والتوفر"],
  [/يومياً بسيارات GMC\s*\/\s*XL/g, "حسب الموعد والتوفر بخيارات مركبات مناسبة"],
  [/\| حسب التوفر \| مدة ([^|]+) \| Vendora/g, "| مدة تقديرية $1 | Vendora"],
];

const englishReplacements = [
  [/24\/7 availability/gi, "availability confirmed for the requested time"],
  [/WhatsApp booking 24\/7/gi, "WhatsApp booking requests around the clock"],
  [/24\/7 WhatsApp booking/gi, "WhatsApp booking requests around the clock"],
  [/available 24\/7/gi, "requestable around the clock, subject to availability"],
  [/24\/7 service/gi, "service subject to availability and booking confirmation"],
  [/service 24\/7/gi, "service subject to availability and booking confirmation"],
  [/GMC\s*\/\s*XL up to 7 passengers/gi, "vehicle options selected for passenger and luggage needs"],
  [/GMC\s*\/\s*XL vehicles? for up to 6 or 7 passengers/gi, "vehicle options selected for passenger and luggage needs"],
  [/up to 6 or 7 passengers per vehicle/gi, "capacity confirmed from passenger and luggage details"],
];

const copyRepairs = [
  ["استقبال طلبات يومي على مدار الساعة حسب التوفر، مركبات GMC/XL، توصيل باب لباب، رحلات ركاب وطرود، وربط واضح بين صفحات المسارات الخليجية.", "نقل خاص للركاب والعائلات والطرود المناسبة، مع توصيل باب لباب وطلبات عبر واتساب حسب المسار والتوفر."],
  ["نركز على خدمة عملية وواضحة للعميل: حجز سريع عبر واتساب، معلومات مسار دقيقة، وصفحات مستقلة تقلل التكرار وتسهل الوصول للخدمة المناسبة.", "نركز على تنسيق نقل خاص واضح للعميل: طلب عبر واتساب، معلومات دقيقة عن الاستلام والوجهة، وتأكيد الركاب والأمتعة والمركبة قبل الحجز."],
  ["مركز يربط الدول والصفحات مع بعضها.", "اختر الدولة ثم المسار الأقرب إلى نقطة الاستلام والوجهة."],
  ["تواصل وحجز واتساب | نقل البحرين والسعودية والخليج 24 ساعة | Vendora", "تواصل وحجز واتساب | نقل البحرين والسعودية والخليج | Vendora"],
  ["نقل ركاب خاص بين البحرين والسعودية ودول الخليج على مدار الساعة: استلام باب لباب، سعة حتى 7 ركاب، أمتعة واسعة، رحلات عودة، ودفع نقداً أو BenefitPay.", "نقل ركاب خاص بين البحرين والسعودية ودول الخليج مع استلام باب لباب، وسعة مركبة تؤكد حسب الركاب والأمتعة والتوفر، وخيارات رحلات عودة."],
  ["من الرياض إلى البحرين بسيارة خاصة | حسب التوفر | مدة 6-8 ساعات | Vendora", "من الرياض إلى البحرين بسيارة خاصة | مدة تقديرية 6-8 ساعات | Vendora"],
  ["خدمة نقل خاص يومية من الرياض إلى البحرين. مدة الطريق المتوقعة 6-8 ساعات، توصيل باب لباب، سيارات خيارات مركبات حسب عدد الركاب والأمتعة والتوفر، وخيارات حجز مرنة.", "خدمة نقل خاص من الرياض إلى البحرين بمدة طريق تقديرية 6-8 ساعات، وتوصيل باب لباب مع مركبة تؤكد حسب الركاب والأمتعة والتوفر."],
  ["مسار الرياض إلى البحرين مناسب للرحلات العملية والعائلية الطويلة، مع تنظيم واضح لموعد الانطلاق والوصول طوال الأسبوع.", "مسار الرياض إلى البحرين مناسب للرحلات العملية والعائلية الطويلة. أرسل موقع الاستلام والوجهة والموعد وعدد الركاب والأمتعة لتأكيد الرحلة."],
  ["ربط داخلي أوضح", "قبل تأكيد الرحلة"],
  ["تربط هذه الصفحة بين الرياض إلى البحرين، والمسار العام من السعودية إلى البحرين، واتجاه البحرين إلى الرياض حتى تبقى تجربة التنقل بين الصفحات منطقية وواضحة.", "مدة الطريق تتأثر بحركة المرور وإجراءات جسر الملك فهد. يؤكد الموعد والمركبة بعد مراجعة تفاصيل الرحلة والتوفر."],
  ["سيارات خيارات مركبات", "خيارات مركبات"],
  ["مركبات خيارات مركبات", "خيارات مركبات"],
  ["ربط داخلي بين الاتجاه المحلي في الخبر والصفحات الأشمل داخل المشروع.", "قارن بين مسار الخبر إلى البحرين والمسارات القريبة لاختيار نقطة الاستلام الأنسب."],
  ["Useful internal links", "Related services"],
  ["Existing pages that help customers choose a route", "Choose the route that matches your trip"],
  ["Internal links point to existing Vendora route pages. Routes without a dedicated reverse page use WhatsApp confirmation.", "Choose a related Vendora route when one matches your trip. Other directions can be checked on WhatsApp before booking."],
];

function replaceAll(source, replacements) {
  return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), source);
}

function addVehicleDisclosure(html, isEnglish) {
  if (!/GMC|Yukon/i.test(html)) return html;

  const englishDisclosure = "Vehicle type and model depend on the route, passenger count, luggage and availability when the booking is confirmed.";
  const arabicDisclosure = "نوع وموديل السيارة يعتمد على المسار وعدد الركاب والأمتعة والتوفر عند تأكيد الحجز.";
  const disclosure = isEnglish ? englishDisclosure : arabicDisclosure;
  if (html.includes(disclosure)) return html;

  const heading = isEnglish ? "Vehicle confirmation" : "تأكيد المركبة";
  const section = `<section class="section vehicle-confirmation"><div class="container section-shell"><div class="section-head"><h2>${heading}</h2><p>${disclosure}</p></div></div></section>`;
  return html.replace(/<\/main>/i, `${section}</main>`);
}

for (const file of collectHtml(root)) {
  const relative = path.relative(root, file);
  const isEnglish = relative.startsWith(`en${path.sep}`);
  const before = fs.readFileSync(file, "utf8");
  let after = replaceAll(before, arabicReplacements);
  after = replaceAll(after, englishReplacements);
  after = copyRepairs.reduce((value, [from, to]) => value.replaceAll(from, to), after);
  after = addVehicleDisclosure(after, isEnglish);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed.push(relative.replaceAll("\\", "/"));
  }
}

console.log(JSON.stringify({ changedCount: changed.length, changed }, null, 2));
