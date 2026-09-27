import { readFile, writeFile } from "node:fs/promises";

const replacements = {
  "en/bahrain-to-kuwait/index.html": [
    ["Private Chauffeur Transfer between Bahrain and Kuwait | Vendora", "Bahrain to Kuwait Private Transport | Vendora Transport"],
    ["Private transport from Bahrain to Kuwait", "Bahrain to Kuwait Private Car with Driver"],
    ["instant WhatsApp confirmation", "availability confirmation on WhatsApp"],
    ["Useful when your itinerary continues west.", "Useful for road travel from Bahrain through Saudi Arabia to Kuwait."]
  ],
  "en/bahrain-to-riyadh/index.html": [
    ["Private Chauffeur &amp; SUV Transfer between Riyadh and Bahrain | Vendora", "Bahrain to Riyadh Private Transport | Vendora Transport"],
    ["Private taxi from Bahrain to Riyadh", "Bahrain to Riyadh Private Car with Driver"],
    ["Direct private road transfer between Riyadh and Bahrain via King Fahd Causeway. Comfortable ~4.5–5.5 hour ride in VIP GMC Yukon XL or luxury sedan. Door-to-door WhatsApp booking.", "Private road transport from Bahrain to Riyadh via King Fahd Causeway. Vehicle-wide pricing and availability confirmation by WhatsApp."]
  ],
  "en/riyadh-to-bahrain/index.html": [
    ["Private Chauffeur &amp; SUV Transfer between Riyadh and Bahrain | Vendora", "Riyadh to Bahrain Private Transport | Vendora Transport"],
    ["Private taxi from Riyadh to Bahrain", "Riyadh to Bahrain Private Car with Driver"],
    ["Direct private road transfer between Riyadh and Bahrain via King Fahd Causeway. Comfortable ~4.5–5.5 hour ride in VIP GMC Yukon XL or luxury sedan. Door-to-door WhatsApp booking.", "Private road transport from Riyadh to Bahrain via King Fahd Causeway. Vehicle-wide pricing and availability confirmation by WhatsApp."]
  ],
  "bahrain-to-riyadh/index.html": [
    ["مشاوير ونقل خاص بين الرياض والبحرين | جمس يوكون وسيدان VIP | فندورا", "نقل خاص من البحرين إلى الرياض | فندورا للنقل"],
    ["رحلات خاصة وسائق مباشر بين الرياض والبحرين عبر جسر الملك فهد. سيارات عائلية VIP وسيدان فسيحة. مدة تقديرية 4.5–5.5 ساعات حسب الطريق والمنفذ. حجز وتنسيق واتساب فوري.", "رحلة نقل خاص من البحرين إلى الرياض عبر جسر الملك فهد، بسعر للمركبة كاملة وتأكيد التوفر عبر واتساب."],
    ["وتأكيد الموعد عبر واتساب", "وتأكيد التوفر عبر واتساب"]
  ],
  "riyadh-to-bahrain/index.html": [
    ["مشاوير ونقل خاص بين الرياض والبحرين | جمس يوكون وسيدان VIP | فندورا", "نقل خاص من الرياض إلى البحرين | فندورا للنقل"],
    ["رحلات خاصة وسائق مباشر بين الرياض والبحرين عبر جسر الملك فهد. سيارات عائلية VIP وسيدان فسيحة. مدة تقديرية 4.5–5.5 ساعات حسب الطريق والمنفذ. حجز وتنسيق واتساب فوري.", "رحلة نقل خاص من الرياض إلى البحرين عبر جسر الملك فهد، مع تنسيق الاستلام والتوصيل وتأكيد التوفر عبر واتساب."],
    ["بتأكيد فوري عبر واتساب", "مع تأكيد التوفر عبر واتساب"]
  ]
};

for (const [file, pairs] of Object.entries(replacements)) {
  const path = new URL(`../${file}`, import.meta.url);
  let text = await readFile(path, "utf8");
  for (const [from, to] of pairs) text = text.split(from).join(to);
  await writeFile(path, text);
}
