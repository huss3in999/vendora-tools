// Representative road journeys, not address-to-address measurements. Recheck with
// the customer before booking. Border queues and stops are additional to drive time.
// Existing planner ranges are retained; country routes use their capital as a reference.
const places = {
  bahrain: ['Bahrain', 'البحرين', 'Manama hotels, Seef and Bahrain International Airport', 'فنادق المنامة والسيف ومطار البحرين الدولي', 'Share the building entrance and a reachable mobile number for pickup.', 'أرسل مدخل المبنى ورقم هاتف متاحاً لتنسيق الاستلام.'],
  khobar: ['Khobar', 'الخبر', 'Khobar Corniche and Al Olaya hotels', 'كورنيش الخبر وفنادق العليا', 'Choose the Corniche entrance or hotel lobby; waterfront event traffic can change the final approach.', 'حدد مدخل الكورنيش أو بهو الفندق؛ قد تغير حركة الفعاليات على الواجهة البحرية طريق الوصول الأخير.'],
  dammam: ['Dammam', 'الدمام', 'Dammam railway station and city hotels; King Fahd Airport by separate arrangement', 'محطة قطار الدمام وفنادق المدينة؛ ومطار الملك فهد بترتيب منفصل', 'A railway connection needs a train departure time. The airport is outside central Dammam, so specify it separately.', 'يتطلب الربط بالقطار تحديد وقت المغادرة. يقع المطار خارج وسط الدمام، لذا حدد وجهته بصورة منفصلة.'],
  'dammam-airport': ['Dammam Airport', 'مطار الدمام', 'King Fahd International Airport terminal and agreed meeting point', 'صالة مطار الملك فهد الدولي ونقطة اللقاء المتفق عليها', 'Send the flight number, terminal, landing or departure time and checked-bag count. Airport waiting is confirmed separately.', 'أرسل رقم الرحلة والصالة ووقت الوصول أو الإقلاع وعدد الحقائب المشحونة. يتم تأكيد انتظار المطار بصورة منفصلة.'],
  riyadh: ['Riyadh', 'الرياض', 'KAFD, Diplomatic Quarter and central Riyadh hotels', 'مركز الملك عبدالله المالي وحي السفارات وفنادق وسط الرياض', 'KAFD and the Diplomatic Quarter have different access points. Send the building pin and allow time for city traffic after the highway.', 'تختلف مداخل مركز الملك عبدالله المالي وحي السفارات. أرسل موقع المبنى واترك وقتاً لحركة المدينة بعد الطريق السريع.'],
  'al-ahsa': ['Al Ahsa', 'الأحساء', 'Al Hofuf hotels and Al Mubarraz', 'فنادق الهفوف والمبرز', 'Specify Hofuf or Mubarraz and the exact hotel; farm and oasis visits require a separate stop plan.', 'حدد الهفوف أو المبرز والفندق بدقة؛ تحتاج زيارات المزارع والواحات إلى خطة توقف منفصلة.'],
  jubail: ['Jubail', 'الجبيل', 'Jubail city hotels and Jubail Industrial City', 'فنادق مدينة الجبيل والجبيل الصناعية', 'Industrial sites may require an invitation or gate pass. Confirm the gate, contact person and shift start.', 'قد تتطلب المواقع الصناعية دعوة أو تصريح دخول. أكد البوابة والشخص المسؤول ووقت بداية العمل.'],
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
  khobar: [45,95,0.75,1.5], dammam: [90,130,1,2], 'dammam-airport': [105,145,1,1.75],
  riyadh: [460,520,4.5,6], 'al-ahsa': [160,210,2,3], jubail: [180,230,2,3], khafji: [320,380,3.5,5],
  kuwait: [430,520,5.5,7], 'kuwait-airport': [430,520,5.5,7], qatar: [420,520,4.5,6],
  'hamad-airport': [440,540,4.5,6], dubai: [850,980,9,11], 'abu-dhabi': [760,900,8,10],
  uae: [760,900,8,11], oman: [1050,1250,12,15], saudi: [45,95,0.75,1.5]
};
const countryPairs = [ ['saudi','qatar',580,650,6,8], ['saudi','uae',900,1050,9,12], ['qatar','uae',550,700,6,9] ];
const profiles = {};
function add(origin, destination, range, usesCauseway) {
  const a = places[origin], b = places[destination];
  const slug = `${origin}-to-${destination}`;
  const profile = { slug, origin_en: a[0], origin_ar: a[1], destination_en: b[0], destination_ar: b[1],
    name_en: `${a[0]} to ${b[0]}`, name_ar: `${a[1]} إلى ${b[1]}`,
    distance_km: range.slice(0,2), driving_hours: range.slice(2), uses_causeway: usesCauseway,
    hubs_en: b[2], hubs_ar: b[3], arrival_en: b[4], arrival_ar: b[5],
    pickup_en: a[4], pickup_ar: a[5], reference_en: origin === 'saudi' || destination === 'saudi' ? (usesCauseway ? 'Khobar' : 'Riyadh') : '',
    reviewed: '2026-10-20' };
  profile.faq_en = [
    [`How long is the ${profile.name_en} road journey?`, `Allow approximately ${range[2]}–${range[3]} driving hours over ${range[0]}–${range[1]} km. Border processing, traffic and rest stops add time. ${profile.reference_en ? `The Saudi reference city is ${profile.reference_en}. ` : ''}Confirm exact addresses before departure.`],
    [`Where can I be dropped off in ${b[0]}?`, `${b[2]}. ${b[4]}`],
    [`What should I send to book ${profile.name_en}?`, `Send the pickup pin in ${a[0]}, the destination pin in ${b[0]}, date, passenger and luggage counts. ${a[4]} Ask for the confirmed vehicle, fare and border-document checklist on WhatsApp.`]
  ];
  profile.faq_ar = [
    [`كم تستغرق رحلة ${profile.name_ar} البرية؟`, `تستغرق القيادة تقريباً ${range[2]}–${range[3]} ساعة لمسافة ${range[0]}–${range[1]} كم. يضاف وقت لإجراءات الحدود والازدحام والاستراحات. أكد العناوين الدقيقة قبل المغادرة.`],
    [`أين يمكن التوصيل في ${b[1]}؟`, `${b[3]}. ${b[5]}`],
    [`ماذا أرسل لحجز رحلة ${profile.name_ar}؟`, `أرسل موقع الاستلام في ${a[1]} وموقع الوصول في ${b[1]} والتاريخ وعدد الركاب والحقائب. ${a[5]} اطلب تأكيد المركبة والسعر وقائمة وثائق الحدود عبر واتساب.`]
  ];
  profiles[slug] = profile;
}
for (const [destination, range] of Object.entries(bahrainPairs)) {
  add('bahrain', destination, range, true);
  add(destination, 'bahrain', range, true);
}
for (const [a,b,...range] of countryPairs) { add(a,b,range,false); add(b,a,range,false); }
export default profiles;
