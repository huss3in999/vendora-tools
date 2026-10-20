// Representative road journeys, not address-to-address measurements. Recheck with
// the customer before booking. Border queues and stops are additional to drive time.
// Existing planner ranges are retained; country routes use their capital as a reference.
const places = {
  bahrain: [
    'Bahrain',
    'البحرين',
    'Manama hotels, Seef business district, Juffair, and Bahrain International Airport',
    'فنادق المنامة وضاحية السيف الدبلوماسية والجفير ومطار البحرين الدولي',
    'Share the building entrance, hotel lobby, or flight arrival details for pickup.',
    'أرسل مدخل المبنى أو بهو الفندق أو تفاصيل رحلة الطيران لتنسيق الاستلام بدقة.'
  ],
  'bahrain-airport': [
    'Bahrain International Airport',
    'مطار البحرين الدولي',
    'Bahrain International Airport (BAH) arrivals gate, flight terminal exit and VIP greeting point',
    'صالة الوصول بمطار البحرين الدولي (BAH) وبوابة الخروج واستقبال كبار الشخصيات بالاسم',
    'Provide airline, flight number, arrival time and luggage count. Your driver tracks flight landing live.',
    'أرسل شركة الطيران ورقم الرحلة ووقت الوصول وعدد الحقائب. يتابع السائق موعد هبوط الطائرة مباشرة ويستقبلك بالاسم.'
  ],
  khobar: [
    'Khobar',
    'الخبر',
    'Khobar Corniche, Al Olaya hotels, Dhahran Aramco hubs, and waterfront business centers',
    'كورنيش الخبر وفنادق العليا ومراكز أرامكو في الظهران ومجمعات الأعمال البحرية',
    'Choose the Corniche entrance, Aramco gate or hotel lobby; waterfront event traffic can change approach routes.',
    'حدد مدخل الكورنيش أو بوابة أرامكو أو بهو الفندق؛ قد تغير حركة الفعاليات على الواجهة مسار الوصول الأخير.'
  ],
  dammam: [
    'Dammam',
    'الدمام',
    'Dammam city center, corporate towers, and Dammam railway station; King Fahd Airport by dedicated transfer',
    'وسط مدينة الدمام والأبراج التجارية ومحطة قطار الدمام؛ ومطار الملك فهد برحلة مخصصة',
    'A railway connection needs a train departure time. The airport is outside central Dammam, so specify it separately.',
    'يتطلب الربط بالقطار تحديد وقت المغادرة. يقع المطار خارج وسط الدمام، لذا حدد وجهته بصورة منفصلة.'
  ],
  'dammam-airport': [
    'Dammam Airport',
    'مطار الدمام',
    'King Fahd International Airport (DMM) passenger terminal and curbside VIP meeting point',
    'صالة مطار الملك فهد الدولي بالدمام (DMM) ونقطة اللقاء السريع لكبار الشخصيات',
    'Send the flight number, terminal, landing or departure time and bag count. Chauffeur meets you at terminal exit.',
    'أرسل رقم الرحلة ووقت الهبوط أو المغادرة وعدد الحقائب. يستقبلك السائق مباشرة عند مخرج الصالة بعد الجمارك.'
  ],
  riyadh: [
    'Riyadh',
    'الرياض',
    'KAFD, Diplomatic Quarter, Olaya financial district and central Riyadh luxury hotels',
    'مركز الملك عبدالله المالي (KAFD) وحي السفارات وفنادق العليا الفاخرة ووسط الرياض',
    'KAFD and Diplomatic Quarter require specific security gates. Send building pins and allow for highway traffic.',
    'تتطلب بوابات مركز كافد وحي السفارات تنسيقاً مسبقاً. أرسل موقع المبنى واترك وقتاً لحركة السير السريعة.'
  ],
  'al-ahsa': [
    'Al Ahsa',
    'الأحساء',
    'Al Hofuf city hotels, Al Mubarraz commercial hubs, and historic oasis districts',
    'فنادق الهفوف والمجمعات التجارية في المبرز ومناطق واحة الأحساء التاريخية',
    'Specify Hofuf or Mubarraz and the exact hotel; farm and oasis visits require a separate stop plan.',
    'حدد الهفوف أو المبرز والفندق بدقة؛ تحتاج زيارات المزارع والواحات إلى خطة توقف منفصلة.'
  ],
  jubail: [
    'Jubail',
    'الجبيل',
    'Jubail Industrial City, Royal Commission headquarters, Fanateer waterfront hotels, and SABIC/Sadara facilities',
    'مدينة الجبيل الصناعية ومقر الهيئة الملكية وفنادق واجهة الفناتير البحرية ومجمعات سابك وصدارة',
    'Corporate industrial sites may require security gate clearance. Confirm gate number, visitor pass and shift timing.',
    'قد تتطلب المجمعات الصناعية تصاريح أمنية للبوابات. أكد رقم البوابة ومسؤول الاستقبال ومواعيد الورديات.'
  ],
  makkah: [
    'Makkah Al-Mukarramah',
    'مكة المكرمة',
    'Central Haram hotels, Abraj Al Bait Clock Tower, Aziziyah, and Madinah Munawwarah pilgrim routes',
    'فنادق المنطقة المركزية للحرم وبرج الساعة والعزيزية ومحاور طريق الهجرة إلى المدينة المنورة',
    'Dedicated to private family Umrah journeys. Confirm prayer stop schedules, luggage capacity and hotel drop-off points.',
    'مخصصة لرحلات العمرة العائلية المريحة. أكد محطات الصلاة المفضلة وسعة الأمتعة وموقع الفندق بمكة.'
  ],
  'causeway-terminal': [
    'King Fahd Causeway',
    'جسر الملك فهد',
    'King Fahd Causeway passport island, border customs terminals, and Bahrain/Saudi lane entrances',
    'الجزيرة الوسطية لجسر الملك فهد ومنافذ الجوازات والجمارك بالجانبين البحريني والسعودي',
    'Single-vehicle cross-border transit between Bahrain and Eastern Province without changing cars.',
    'توصيل مباشر عبر مسارات الجسر ومنافذ الجوازات في مركبة واحدة مريحة دون تبديل السيارة عند الحدود.'
  ],
  khafji: ['Khafji', 'الخفجي', 'Khafji Corniche and central hotels', 'كورنيش الخفجي وفنادق وسط المدينة', 'A Khafji drop-off stays in Saudi Arabia. Continuing to Kuwait requires a separate border and visa review.', 'تظل وجهة الخفجي داخل السعودية. تتطلب متابعة الرحلة إلى الكويت مراجعة منفصلة للحدود والتأشيرة.'],
  kuwait: ['Kuwait', 'الكويت', 'Kuwait City hotels, Salmiya and Sharq', 'فنادق مدينة الكويت والسالمية وشرق', 'State whether the stop is Kuwait City or Salmiya and check Saudi transit as well as Kuwait entry eligibility.', 'حدد مدينة الكويت أو السالمية وتحقق من أهلية عبور السعودية والدخول إلى الكويت.'],
  'kuwait-airport': ['Kuwait International Airport', 'مطار الكويت الدولي', 'Kuwait International Airport terminal confirmed by the airline', 'صالة مطار الكويت الدولي التي تؤكدها شركة الطيران', 'Airlines use different terminals. Send the terminal and flight number before agreeing the pickup point.', 'تستخدم شركات الطيران صالات مختلفة. أرسل الصالة ورقم الرحلة قبل الاتفاق على نقطة الاستلام.'],
  qatar: ['Qatar', 'قطر', 'Doha West Bay, Lusail and central Doha hotels', 'الخليج الغربي ولوسيل وفنادق وسط الدوحة', 'A road trip uses the Saudi–Qatar border. Specify West Bay or Lusail and include time for the second border.', 'تمر الرحلة البرية بالحدود السعودية القطرية. حدد الخليج الغربي أو لوسيل واترك وقتاً للحدود الثانية.'],
  'hamad-airport': ['Hamad International Airport', 'مطار حمد الدولي', 'Hamad International Airport passenger terminal', 'صالة المسافرين في مطار حمد الدولي', 'Confirm the airline check-in deadline and leave a border buffer before a departing flight.', 'أكد موعد إغلاق إجراءات السفر لدى شركة الطيران واترك هامشاً للحدود قبل رحلة المغادرة.'],
  dubai: ['Dubai', 'دبي', 'Downtown Dubai, Dubai Marina and city hotels', 'وسط دبي ودبي مارينا وفنادق المدينة', 'Downtown and Marina are separate stops. Include the hotel and any extra stop so road tolls and waiting can be quoted.', 'وسط دبي ومارينا وجهتان منفصلتان. أرسل الفندق وأي توقف إضافي لتسعير رسوم الطريق والانتظار.'],
  'abu-dhabi': ['Abu Dhabi', 'أبوظبي', 'Abu Dhabi Corniche, Yas Island and city hotels', 'كورنيش أبوظبي وجزيرة ياس وفنادق المدينة', 'Yas Island and the Corniche need different final approaches. Confirm the venue entrance and event time.', 'تختلف طرق الوصول إلى جزيرة ياس والكورنيش. أكد مدخل الموقع وموعد الفعالية.'],
  uae: ['United Arab Emirates', 'الإمارات العربية المتحدة', 'Abu Dhabi or Dubai, confirmed before quoting', 'أبوظبي أو دبي حسب التأكيد قبل التسعير', 'Name the emirate first. The estimate uses Abu Dhabi; Dubai or another emirate changes distance and charges.', 'حدد الإمارة أولاً. يستخدم التقدير أبوظبي؛ تتغير المسافة والرسوم عند اختيار دبي أو إمارة أخرى.'],
  oman: ['Oman', 'عُمان', 'Muscat hotels and agreed city meeting points', 'فنادق مسقط ونقاط اللقاء المتفق عليها داخل المدينة', 'This is a long multi-border journey. Agree rest stops, driver arrangements and Saudi, UAE and Oman entry conditions in advance.', 'هذه رحلة طويلة عبر عدة حدود. اتفق مسبقاً على الاستراحات وترتيبات السائق وشروط دخول السعودية والإمارات وعُمان.'],
  saudi: ['Saudi Arabia', 'السعودية', 'Khobar, Dammam or Riyadh, according to the confirmed city', 'الخبر أو الدمام أو الرياض حسب المدينة المؤكدة', 'Saudi Arabia is a country, not one drop-off. The representative estimate uses Khobar; send the city for a final plan.', 'السعودية دولة وليست نقطة وصول واحدة. يستخدم التقدير الخبر؛ أرسل المدينة لتحديد الخطة النهائية.']
};

// km range, driving-hour range. Capital/reference-city estimates remain explicit.
const bahrainPairs = {
  khobar: [45, 95, 0.75, 1.5],
  dammam: [90, 130, 1.0, 2.0],
  'dammam-airport': [95, 130, 1.25, 2.0],
  riyadh: [460, 520, 4.5, 6.0],
  'al-ahsa': [160, 210, 2.0, 3.0],
  jubail: [180, 230, 2.0, 3.0],
  khafji: [320, 380, 3.5, 5.0],
  kuwait: [430, 520, 5.5, 7.0],
  'kuwait-airport': [430, 520, 5.5, 7.0],
  qatar: [420, 520, 4.5, 6.0],
  'hamad-airport': [440, 540, 4.5, 6.0],
  dubai: [850, 980, 9.0, 11.0],
  'abu-dhabi': [760, 900, 8.0, 10.0],
  uae: [760, 900, 8.0, 11.0],
  oman: [1050, 1250, 12.0, 15.0],
  saudi: [45, 95, 0.75, 1.5]
};

const customRoutes = [
  // 1. Bahrain Airport to Khobar & reverse
  ['bahrain-airport', 'khobar', [60, 75, 0.8, 1.1], true],
  ['khobar', 'bahrain-airport', [60, 75, 0.8, 1.1], true],
  // 2. Bahrain Airport to Jubail & reverse
  ['bahrain-airport', 'jubail', [135, 155, 1.5, 2.0], true],
  ['jubail', 'bahrain-airport', [135, 155, 1.5, 2.0], true],
  // 3. Bahrain to Makkah Umrah SUV
  ['bahrain', 'makkah', [1250, 1400, 12.0, 14.0], true, 'bahrain-to-makkah-umrah-suv', 'Bahrain to Makkah Umrah VIP SUV', 'من البحرين إلى مكة المكرمة للعمرة VIP'],
  // 4. King Fahd Causeway Dedicated Chauffeur
  ['bahrain', 'causeway-terminal', [25, 40, 0.4, 0.7], true, 'king-fahd-causeway-chauffeur', 'King Fahd Causeway Cross-Border Chauffeur', 'سائق خاص عبر جسر الملك فهد']
];

const countryPairs = [
  ['saudi', 'qatar', 580, 650, 6.0, 8.0],
  ['saudi', 'uae', 900, 1050, 9.0, 12.0],
  ['qatar', 'uae', 550, 700, 6.0, 9.0]
];

const profiles = {};

function add(origin, destination, range, usesCauseway, customSlug = null, customNameEn = null, customNameAr = null) {
  const a = places[origin], b = places[destination];
  if (!a || !b) throw new Error(`Unknown place in route profile: ${origin} -> ${destination}`);
  const slug = customSlug || `${origin}-to-${destination}`;
  const name_en = customNameEn || `${a[0]} to ${b[0]}`;
  const name_ar = customNameAr || `${a[1]} إلى ${b[1]}`;
  const profile = {
    slug,
    origin_en: a[0],
    origin_ar: a[1],
    destination_en: b[0],
    destination_ar: b[1],
    name_en,
    name_ar,
    distance_km: range.slice(0, 2),
    driving_hours: range.slice(2, 4),
    uses_causeway: usesCauseway,
    hubs_en: b[2],
    hubs_ar: b[3],
    arrival_en: b[4],
    arrival_ar: b[5],
    pickup_en: a[4],
    pickup_ar: a[5],
    reference_en: origin === 'saudi' || destination === 'saudi' ? (usesCauseway ? 'Khobar' : 'Riyadh') : '',
    reviewed: '2026-10-20'
  };

  profile.faq_en = [
    [
      `How long is the ${profile.name_en} road journey?`,
      `Allow approximately ${range[2]}–${range[3]} driving hours over ${range[0]}–${range[1]} km. King Fahd Causeway processing, customs inspection, traffic and rest stops add time. Confirm exact pickup and drop-off addresses before departure.`
    ],
    [
      `Where can I be dropped off in ${b[0]}?`,
      `${b[2]}. ${b[4]}`
    ],
    [
      `What should I send to book ${profile.name_en}?`,
      `Send pickup location in ${a[0]}, destination address in ${b[0]}, preferred date, passenger count and luggage volume. ${a[4]} Confirm your vehicle preference (VIP GMC Yukon XL or Executive Sedan) on WhatsApp.`
    ]
  ];

  profile.faq_ar = [
    [
      `كم تستغرق رحلة ${profile.name_ar} البرية؟`,
      `تستغرق القيادة تقريباً ${range[2]}–${range[3]} ساعة لمسافة ${range[0]}–${range[1]} كم. يضاف وقت لإجراءات جسر الملك فهد والجوازات والجمارك والاستراحات. أكد العناوين الدقيقة قبل الانطلاق.`
    ],
    [
      `أين يمكن التوصيل في ${b[1]}؟`,
      `${b[3]}. ${b[5]}`
    ],
    [
      `ماذا أرسل لحجز رحلة ${profile.name_ar}؟`,
      `أرسل موقع الاستلام في ${a[1]} وموقع الوصول في ${b[1]} والتاريخ وعدد الركاب والحقائب. ${a[5]} اختر فئة السيارة (جمس يوكون عائلية فاخرة أو سيدان تنفيذية) عبر واتساب.`
    ]
  ];

  profiles[slug] = profile;
}

for (const [destination, range] of Object.entries(bahrainPairs)) {
  add('bahrain', destination, range, true);
  add(destination, 'bahrain', range, true);
}

for (const item of customRoutes) {
  add(item[0], item[1], item[2], item[3], item[4], item[5], item[6]);
}

for (const [a, b, ...range] of countryPairs) {
  add(a, b, range, false);
  add(b, a, range, false);
}

export default profiles;
