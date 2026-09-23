import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://getvendora.net/bahrain-saudi-gcc-transport/';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

const pagesData = [
  // 1. Bahrain to Al Ahsa (Arabic)
  {
    isEn: false,
    dir: 'bahrain-to-al-ahsa',
    pairDir: 'en/bahrain-to-al-ahsa',
    slug: 'bahrain-to-al-ahsa',
    title: 'توصيل من البحرين إلى الأحساء بسيارة خاصة | الهفوف والمبرز | Vendora',
    description: 'نقل خاص من البحرين إلى الأحساء والهفوف والمبرز عبر جسر الملك فهد. سيارة خاصة 70 د.ب للمركبة شامل الجسر، عائلية GMC أو سيدان، حجز سريع عبر واتساب.',
    eyebrow: 'البحرين إلى الأحساء',
    h1: 'النقل من البحرين إلى الأحساء — الهفوف والمبرز',
    answerFirst: '<strong>تاكسي وسائق خاص من البحرين إلى الأحساء:</strong> نقل مباشر من الباب إلى الباب عبر جسر الملك فهد إلى الهفوف، المبرز، وكافة مدن واحة الأحساء. السعر القياسي 70 د.ب (~700 ريال سعودي) للمركبة كاملة — شامل رسوم عبور الجسر. سيارة GMC/XL عائلية أو سيدان مريحة، استلام من المطار أو المنزل، وحجز فوري عبر واتساب.',
    lead: 'خدمة نقل مباشر ومريحة إلى واحة الأحساء والمنطقة الشرقية بسيارة خاصة وسائق خبير، مناسبة للزيارات العائلية، سياحة واحة الأحساء، واجتماعات الأعمال وتوصيل الطرود.',
    duration: 'المدة المتوقعة من البحرين إلى الأحساء: 1.5 إلى 2 ساعة (حوالي 150–170 كم) حسب حركة المرور وإجراءات جسر الملك فهد.',
    pickupTitle: 'نقاط الاستلام في البحرين',
    pickupDesc: 'استلام مباشر من المنازل، الفنادق، مطار البحرين الدولي (BAH)، ضاحية السيف، المنامة، الجفير، أمواج وكافة مناطق البحرين.',
    dropoffTitle: 'وجهات الوصول في الأحساء',
    dropoffDesc: 'توصيل إلى الهفوف، المبرز، العيون، العمران، فندق الإنتركونتيننتال، محطة قطار الأحساء، والمواقع التجارية والسكنية.',
    defaultFromCountry: 'البحرين',
    defaultFromCity: 'المنامة',
    defaultToCountry: 'المملكة العربية السعودية',
    defaultToCity: 'الأحساء',
    waMessage: 'مرحباً، أريد حجز خدمة نقل خاصة من البحرين إلى الأحساء.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/al-ahsa-to-bahrain/', text: 'الأحساء إلى البحرين (مسار العودة)' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-khobar/', text: 'البحرين إلى الخبر' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-dammam/', text: 'البحرين إلى الدمام' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-riyadh/', text: 'البحرين إلى الرياض' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-jubail/', text: 'البحرين إلى الجبيل' },
      { url: '/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/', text: 'دليل جسر الملك فهد' }
    ],
    faqs: [
      { q: 'كم سعر التوصيل من البحرين إلى الأحساء؟', a: 'السعر القياسي للمركبة كاملة هو 70 د.ب (~700 ريال سعودي) اتجاه واحد شامل رسوم عبور جسر الملك فهد. السعر للمركبة وليس لكل راكب.' },
      { q: 'كم تستغرق الرحلة بالسيارة من البحرين إلى الأحساء؟', a: 'تستغرق الرحلة من 1.5 إلى 2 ساعة تقريباً (حوالي 160 كم) عبر جسر الملك فهد وطريق الهفوف، وتعتمد المدة على حركة الجسر ونقطة الوصول المحددة.' },
      { q: 'هل يتوفر الاستلام من مطار البحرين الدولي؟', a: 'نعم، يتوفر استقبال مباشر من مطار البحرين الدولي (BAH) مع متابعة مواعيد الرحلات والاستقبال بالاسم عند بوابة الوصول.' },
      { q: 'ما هي أنواع المركبات المتوفرة؟', a: 'تتوفر سيارات سيدان مريحة وسيارات عائلية فسيحة من فئة GMC / XL أو SUV متعددة المقاعد تناسب العائلات والأمتعة.' },
      { q: 'ما هي طرق الدفع المتاحة؟', a: 'يمكن الدفع نقداً بالدينار البحريني أو الريال السعودي، أو عبر خدمة بنفت بي (BenefitPay) المباشرة.' }
    ]
  },

  // 2. Bahrain to Al Ahsa (English)
  {
    isEn: true,
    dir: 'en/bahrain-to-al-ahsa',
    pairDir: 'bahrain-to-al-ahsa',
    slug: 'bahrain-to-al-ahsa',
    title: 'Private Taxi from Bahrain to Al Ahsa | Hofuf & Mubarraz Transfer | Vendora',
    description: 'Book a private taxi from Bahrain to Al Ahsa, Hofuf, and Al Mubarraz via King Fahd Causeway. Fixed 70 BHD per vehicle including tolls, GMC SUV or sedan, WhatsApp booking.',
    eyebrow: 'Bahrain to Al Ahsa & Hofuf',
    h1: 'Private Taxi from Bahrain to Al Ahsa',
    answerFirst: '<strong>Private taxi & chauffeur from Bahrain to Al Ahsa:</strong> Direct door-to-door cross-border transfer across King Fahd Causeway to Hofuf, Al Mubarraz, and Al Ahsa Oasis. Standard price is 70 BHD (~700 SAR) per complete vehicle (not per passenger) — King Fahd Causeway toll included. Comfortable sedans and spacious GMC / XL family SUVs with fast WhatsApp confirmation.',
    lead: 'Reliable, comfortable road transport to Al Ahsa and the Eastern Province with experienced cross-border drivers. Perfect for family visits, oasis tourism, business trips, and secure parcel transport.',
    duration: 'Estimated travel time from Bahrain to Al Ahsa: 1.5 to 2 hours (approx. 150–170 km) depending on King Fahd Causeway border flow and your exact destination.',
    pickupTitle: 'Pickup Locations in Bahrain',
    pickupDesc: 'Door-to-door pickup from homes, hotels, Bahrain International Airport (BAH), Seef, Manama, Juffair, Amwaj Islands, and all Bahrain areas.',
    dropoffTitle: 'Drop-off Areas in Al Ahsa',
    dropoffDesc: 'Direct drop-off across Hofuf, Al Mubarraz, Al Oyoun, Al Umran, Al Ahsa InterContinental Hotel, railway station, and residential districts.',
    defaultFromCountry: 'Bahrain',
    defaultFromCity: 'Manama',
    defaultToCountry: 'Saudi Arabia',
    defaultToCity: 'Al Ahsa',
    waMessage: 'Hello, I would like to book a private taxi from Bahrain to Al Ahsa.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/en/al-ahsa-to-bahrain/', text: 'Al Ahsa to Bahrain (Return Route)' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-khobar/', text: 'Bahrain to Khobar' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-dammam/', text: 'Bahrain to Dammam' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-riyadh/', text: 'Bahrain to Riyadh' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-jubail/', text: 'Bahrain to Jubail' },
      { url: '/bahrain-saudi-gcc-transport/en/king-fahd-causeway-guide/', text: 'King Fahd Causeway Guide' }
    ],
    faqs: [
      { q: 'How much does a private taxi from Bahrain to Al Ahsa cost?', a: 'The standard fixed rate is 70 BHD (~700 SAR) per complete vehicle one way, with King Fahd Causeway tolls fully included. The rate is for the private car, not per passenger.' },
      { q: 'How long does the drive from Bahrain to Al Ahsa take?', a: 'The drive usually takes approximately 1.5 to 2 hours (about 160 km) via King Fahd Causeway and Route 75, depending on border clearance and your exact drop-off point in Hofuf or Mubarraz.' },
      { q: 'Can I be picked up directly at Bahrain International Airport (BAH)?', a: 'Yes. We provide terminal pickups at Bahrain Airport (BAH) with flight arrival tracking and meet-and-greet service.' },
      { q: 'What vehicles are available for this route?', a: 'We provide executive sedans for individuals and business travellers, as well as spacious GMC / XL family SUVs with ample luggage space.' },
      { q: 'What payment methods are supported?', a: 'You can pay in cash (BHD or SAR) or electronically via BenefitPay upon trip confirmation.' }
    ]
  },

  // 3. Al Ahsa to Bahrain (Arabic)
  {
    isEn: false,
    dir: 'al-ahsa-to-bahrain',
    pairDir: 'en/al-ahsa-to-bahrain',
    slug: 'al-ahsa-to-bahrain',
    title: 'توصيل من الأحساء إلى البحرين بسيارة خاصة | نقل مباشر للمطار والمنامة | Vendora',
    description: 'نقل مباشر من الأحساء والهفوف إلى البحرين عبر جسر الملك فهد. سيارة خاصة 70 د.ب للمركبة شامل الجسر، توصيل لمطار البحرين BAH والفنادق، حجز واتساب 24/7.',
    eyebrow: 'الأحساء إلى البحرين',
    h1: 'نقل من الأحساء إلى البحرين بسيارة خاصة — الهفوف والمبرز',
    answerFirst: '<strong>توصيل خاص من الأحساء إلى البحرين:</strong> استلام من الهفوف، المبرز، الفنادق أو محطة القطار وتوصيل مباشر إلى مطار البحرين الدولي (BAH)، المنامة، السيف أو أي عنوان في البحرين. السعر القياسي 70 د.ب (~700 ريال سعودي) للمركبة كاملة — شامل رسوم جسر الملك فهد. سيارة خاصة GMC/XL أو سيدان دون تبديل المركبة على الحدود.',
    lead: 'خدمة نقل عكسية سلسة من الأحساء إلى البحرين عبر جسر الملك فهد. استلام من عنوانك بالهفوف أو المبرز مع سائقين معتمدين وتوصيل مباشر إلى وجهتك في البحرين.',
    duration: 'المدة المتوقعة من الأحساء إلى البحرين: 1.5 إلى 2 ساعة (حوالي 150–170 كم) حسب إجراءات العبور على جسر الملك فهد وحركة السير.',
    pickupTitle: 'نقاط الاستلام في الأحساء',
    pickupDesc: 'استلام من المنازل، الفنادق، محطة قطار سار في الهفوف، المبرز، العيون، وكافة مناطق واحة الأحساء.',
    dropoffTitle: 'وجهات الوصول في البحرين',
    dropoffDesc: 'توصيل مباشر إلى مطار البحرين الدولي (BAH)، المنامة، ضاحية السيف، الجفير، الفنادق، أو أي عنوان سكني أو تجاري.',
    defaultFromCountry: 'المملكة العربية السعودية',
    defaultFromCity: 'الأحساء',
    defaultToCountry: 'البحرين',
    defaultToCity: 'المنامة',
    waMessage: 'مرحباً، أريد حجز خدمة نقل خاصة من الأحساء إلى البحرين.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-al-ahsa/', text: 'البحرين إلى الأحساء (مسار الذهاب)' },
      { url: '/bahrain-saudi-gcc-transport/khobar-to-bahrain/', text: 'الخبر إلى البحرين' },
      { url: '/bahrain-saudi-gcc-transport/dammam-to-bahrain/', text: 'الدمام إلى البحرين' },
      { url: '/bahrain-saudi-gcc-transport/saudi-to-bahrain/', text: 'السعودية إلى البحرين' },
      { url: '/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/', text: 'دليل جسر الملك فهد' }
    ],
    faqs: [
      { q: 'كم سعر المشوار من الأحساء إلى البحرين؟', a: 'السعر القياسي للمركبة كاملة هو 70 د.ب (~700 ريال سعودي) اتجاه واحد شامل رسوم عبور جسر الملك فهد. السعر للمركبة كاملة وليس للشخص.' },
      { q: 'هل توفرون توصيل لمطار البحرين للحاق برحلة طيران؟', a: 'نعم، نوفر خدمة نقل دقيقة ومباشرة إلى صالة المغادرة بمطار البحرين الدولي (BAH)، ونوصي بجدولة الانطلاق قبل موعد إقلاع الطائرة بـ 4 إلى 5 ساعات.' },
      { q: 'هل يتم تبديل السيارة على جسر الملك فهد؟', a: 'لا، النقل مباشر بنفس المركبة الخاصة والسائق من نقطة استلامك في الأحساء حتى وجهتك النهائية في البحرين دون أي تبديل للمركبة.' },
      { q: 'هل يمكن حجز رحلة عودة في نفس اليوم؟', a: 'نعم، يمكن ترتيب رحلات ذهاب وعودة في نفس اليوم بأسعار خاصة وجداول مرنة تناسب زيارتك.' }
    ]
  },

  // 4. Al Ahsa to Bahrain (English)
  {
    isEn: true,
    dir: 'en/al-ahsa-to-bahrain',
    pairDir: 'al-ahsa-to-bahrain',
    slug: 'al-ahsa-to-bahrain',
    title: 'Private Taxi from Al Ahsa to Bahrain | Hofuf to Bahrain Airport | Vendora',
    description: 'Direct private taxi from Al Ahsa and Hofuf to Bahrain via King Fahd Causeway. 70 BHD per vehicle including causeway tolls, BAH airport drop-off, WhatsApp booking.',
    eyebrow: 'Al Ahsa to Bahrain Transfer',
    h1: 'Private Taxi from Al Ahsa to Bahrain',
    answerFirst: '<strong>Private taxi from Al Ahsa to Bahrain:</strong> Door-to-door pickup across Hofuf, Al Mubarraz, and Al Ahsa hotels directly to Bahrain International Airport (BAH), Manama, Seef, and all Bahrain districts. Standard price is 70 BHD (~700 SAR) per complete vehicle — King Fahd Causeway toll included. Travel in comfort without changing vehicles at the border.',
    lead: 'Smooth reverse-route transport from Al Ahsa to Bahrain via King Fahd Causeway. Convenient hotel or home pickup across Hofuf with licensed drivers and direct drop-off at your Bahrain destination.',
    duration: 'Estimated drive time from Al Ahsa to Bahrain: 1.5 to 2 hours (approx. 150–170 km) depending on causeway border clearance and traffic.',
    pickupTitle: 'Pickup Across Al Ahsa',
    pickupDesc: 'Pickup from homes, hotels, SAR railway station in Hofuf, Al Mubarraz, Al Oyoun, and all Al Ahsa Oasis areas.',
    dropoffTitle: 'Drop-off Across Bahrain',
    dropoffDesc: 'Direct drop-off at Bahrain International Airport (BAH) departure terminal, Manama, Seef, Juffair, hotels, or residential addresses.',
    defaultFromCountry: 'Saudi Arabia',
    defaultFromCity: 'Al Ahsa',
    defaultToCountry: 'Bahrain',
    defaultToCity: 'Manama',
    waMessage: 'Hello, I would like to book a private taxi from Al Ahsa to Bahrain.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-al-ahsa/', text: 'Bahrain to Al Ahsa (Outbound Route)' },
      { url: '/bahrain-saudi-gcc-transport/en/khobar-to-bahrain/', text: 'Khobar to Bahrain' },
      { url: '/bahrain-saudi-gcc-transport/en/dammam-to-bahrain/', text: 'Dammam to Bahrain' },
      { url: '/bahrain-saudi-gcc-transport/en/saudi-to-bahrain/', text: 'Saudi Arabia to Bahrain' },
      { url: '/bahrain-saudi-gcc-transport/en/king-fahd-causeway-guide/', text: 'King Fahd Causeway Guide' }
    ],
    faqs: [
      { q: 'How much is a private taxi from Al Ahsa to Bahrain?', a: 'The standard fixed rate is 70 BHD (~700 SAR) per complete vehicle one way, including all King Fahd Causeway tolls. The fare is for the entire vehicle, not per passenger.' },
      { q: 'Do you drop off passengers for flights at Bahrain Airport (BAH)?', a: 'Yes. We drop off directly at the Bahrain Airport departures terminal. We recommend departing Al Ahsa 4 to 5 hours prior to your flight departure time.' },
      { q: 'Do passengers have to change vehicles at the border?', a: 'No. The entire journey is direct in the same private vehicle from your pickup in Al Ahsa all the way to your destination in Bahrain.' },
      { q: 'Can same-day return journeys be coordinated?', a: 'Yes. Same-day return trips can easily be arranged with flexible waiting times or scheduled return pickups.' }
    ]
  },

  // 5. Bahrain to Jubail (Arabic)
  {
    isEn: false,
    dir: 'bahrain-to-jubail',
    pairDir: 'en/bahrain-to-jubail',
    slug: 'bahrain-to-jubail',
    title: 'توصيل من البحرين إلى الجبيل بسيارة خاصة | الجبيل الصناعية والبلد | Vendora',
    description: 'نقل خاص من البحرين إلى الجبيل والجبيل الصناعية والفناتير عبر جسر الملك فهد. سيارة خاصة 70 د.ب للمركبة شامل رسوم الجسر، GMC/XL وسيدان أعمال، حجز عبر واتساب.',
    eyebrow: 'البحرين إلى الجبيل',
    h1: 'النقل من البحرين إلى الجبيل — الجبيل الصناعية والبلد',
    answerFirst: '<strong>تاكسي وسائق خاص من البحرين إلى الجبيل:</strong> نقل مباشر وسريع عبر جسر الملك فهد إلى مدينة الجبيل الصناعية، الهيئة الملكية، الفناتير، ومجمعات سابك وأرامكو. السعر القياسي 70 د.ب (~700 ريال سعودي) للمركبة كاملة — شامل رسوم الجسر. خيارات سيدان أعمال ومركبات GMC/XL عائلية، استلام من مطار البحرين أو الفندق، وحجز فوري عبر واتساب.',
    lead: 'خدمة نقل متخصصة لرجال الأعمال والمهندسين والعائلات بين البحرين ومدينة الجبيل الصناعية. سيارة خاصة مريحة بسائق محترف مع مرونة كاملة في المواعيد وخدمة طرود ومستندات مستعجلة.',
    duration: 'المدة المتوقعة من البحرين إلى الجبيل: 1.5 إلى 2 ساعة (حوالي 140–160 كم) عبر جسر الملك فهد وطريق الظهران–الجبيل السريع.',
    pickupTitle: 'نقاط الاستلام في البحرين',
    pickupDesc: 'استلام مباشر من المنازل، الفنادق، مطار البحرين الدولي (BAH)، ضاحية السيف، المنامة، الجفير، والشركات والمؤسسات.',
    dropoffTitle: 'وجهات الوصول في الجبيل',
    dropoffDesc: 'مدينة الجبيل الصناعية، الهيئة الملكية، حي الفناتير، الجبيل البلد، المجمعات البتروكيماوية والصناعية، وفنادق الجبيل.',
    defaultFromCountry: 'البحرين',
    defaultFromCity: 'المنامة',
    defaultToCountry: 'المملكة العربية السعودية',
    defaultToCity: 'الجبيل',
    waMessage: 'مرحباً، أريد حجز خدمة نقل خاصة من البحرين إلى الجبيل.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/jubail-to-bahrain/', text: 'الجبيل إلى البحرين (مسار العودة)' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-dammam/', text: 'البحرين إلى الدمام' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-khobar/', text: 'البحرين إلى الخبر' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-dammam-airport/', text: 'البحرين إلى مطار الدمام' },
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-al-ahsa/', text: 'البحرين إلى الأحساء' },
      { url: '/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/', text: 'دليل جسر الملك فهد' }
    ],
    faqs: [
      { q: 'كم سعر التوصيل من البحرين إلى الجبيل؟', a: 'السعر القياسي للمركبة كاملة هو 70 د.ب (~700 ريال سعودي) اتجاه واحد شامل رسوم عبور جسر الملك فهد. السعر للمركبة كاملة وليس لكل راكب.' },
      { q: 'كم تستغرق الرحلة من البحرين إلى الجبيل الصناعية؟', a: 'تستغرق الرحلة حوالي 1.5 إلى 2 ساعة (حوالي 150 كم) عبر جسر الملك فهد وطريق الظهران–الجبيل السريع، وتعتمد على حركة العبور ونقطة الوصول.' },
      { q: 'هل تناسب الخدمة نقل موظفي الشركات والمهندسين؟', a: 'نعم، الخدمة مثالية لنقل المهندسين والاستشاريين والوفود المؤسسية إلى مجمعات الهيئة الملكية والشركات الصناعية مع توفر فواتير رسمية ودفع إلكتروني.' },
      { q: 'هل يمكن نقل الطرود والمستندات العاجلة للجبيل؟', a: 'نعم، نوفر خدمة نقل وتسليم الطرود والمستندات الهامة والمشتريات التي تتسع داخل المركبة بأمان تام وتسليم مباشر من الباب إلى الباب.' }
    ]
  },

  // 6. Bahrain to Jubail (English)
  {
    isEn: true,
    dir: 'en/bahrain-to-jubail',
    pairDir: 'bahrain-to-jubail',
    slug: 'bahrain-to-jubail',
    title: 'Private Taxi from Bahrain to Jubail | Industrial City Transfer | Vendora',
    description: 'Book a private taxi from Bahrain to Jubail Industrial City & Royal Commission via King Fahd Causeway. Fixed 70 BHD per vehicle including tolls, executive SUV/sedan.',
    eyebrow: 'Bahrain to Jubail Industrial City',
    h1: 'Private Taxi from Bahrain to Jubail',
    answerFirst: '<strong>Private taxi & chauffeur from Bahrain to Jubail:</strong> Direct overland transfer across King Fahd Causeway to Jubail Industrial City, Royal Commission, Fanateer, and corporate plant sites. Standard price is 70 BHD (~700 SAR) per complete vehicle — King Fahd Causeway toll included. Executive sedans and spacious GMC / XL SUVs for engineers, executives, and families.',
    lead: 'Dedicated cross-border private transport linking Bahrain and Jubail Industrial City. Professional drivers, flexible departure times, corporate invoicing capability, and urgent parcel transport.',
    duration: 'Estimated travel time from Bahrain to Jubail: 1.5 to 2 hours (approx. 140–160 km) via King Fahd Causeway and the Dhahran–Jubail expressway.',
    pickupTitle: 'Pickup Locations in Bahrain',
    pickupDesc: 'Pickup available from homes, hotels, corporate headquarters, Seef, Manama, and Bahrain International Airport (BAH).',
    dropoffTitle: 'Drop-off Across Jubail',
    dropoffDesc: 'Jubail Industrial City, Royal Commission compounds, Fanateer beachfront, Jubail Balad, industrial plants, and hotels.',
    defaultFromCountry: 'Bahrain',
    defaultFromCity: 'Manama',
    defaultToCountry: 'Saudi Arabia',
    defaultToCity: 'Jubail',
    waMessage: 'Hello, I would like to book a private taxi from Bahrain to Jubail.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/en/jubail-to-bahrain/', text: 'Jubail to Bahrain (Return Route)' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-dammam/', text: 'Bahrain to Dammam' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-khobar/', text: 'Bahrain to Khobar' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-dammam-airport/', text: 'Bahrain to Dammam Airport' },
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-al-ahsa/', text: 'Bahrain to Al Ahsa' },
      { url: '/bahrain-saudi-gcc-transport/en/king-fahd-causeway-guide/', text: 'King Fahd Causeway Guide' }
    ],
    faqs: [
      { q: 'What is the price of a private taxi from Bahrain to Jubail?', a: 'The standard fixed price is 70 BHD (~700 SAR) per complete vehicle one way, with all King Fahd Causeway tolls included. The charge is per car, not per seat.' },
      { q: 'How long does the drive to Jubail Industrial City take?', a: 'The journey typically takes 1.5 to 2 hours (approx. 150 km) via King Fahd Causeway and Route 613, depending on border traffic and your exact drop-off area in Jubail.' },
      { q: 'Is this service suitable for corporate and industrial travel?', a: 'Yes. It is frequently booked by engineers, consultants, and business executives visiting SABIC, Sadara, and Royal Commission facilities.' },
      { q: 'Can urgent documents or small commercial parts be transported?', a: 'Yes. We offer secure hand-carry parcel and document delivery between Bahrain and Jubail facilities.' }
    ]
  },

  // 7. Jubail to Bahrain (Arabic)
  {
    isEn: false,
    dir: 'jubail-to-bahrain',
    pairDir: 'en/jubail-to-bahrain',
    slug: 'jubail-to-bahrain',
    title: 'توصيل من الجبيل إلى البحرين بسيارة خاصة | نقل مباشر لمطار البحرين والمنامة | Vendora',
    description: 'نقل مباشر من الجبيل الصناعية والفناتير إلى البحرين عبر جسر الملك فهد. سيارة خاصة 70 د.ب للمركبة شامل رسوم الجسر، توصيل لمطار البحرين BAH والمنامة، حجز 24/7.',
    eyebrow: 'الجبيل إلى البحرين',
    h1: 'نقل من الجبيل إلى البحرين بسيارة خاصة — الجبيل الصناعية والبلد',
    answerFirst: '<strong>توصيل خاص من الجبيل إلى البحرين:</strong> استلام من الجبيل الصناعية، الهيئة الملكية، الفناتير أو الفنادق وتوصيل مباشر إلى مطار البحرين الدولي (BAH)، المنامة، السيف، ومختلف مناطق البحرين. السعر القياسي 70 د.ب (~700 ريال سعودي) للمركبة كاملة — شامل رسوم عبور جسر الملك فهد. مثالي للمهندسين ورجال الأعمال والعائلات دون تبديل المركبة.',
    lead: 'خدمة نقل مريحة وسريعة من مدينة الجبيل إلى البحرين عبر جسر الملك فهد. سائقون محترفون ومركبات حديثة لنقلك مباشرة إلى مطار البحرين أو إقامتك بكل يسر وسهولة.',
    duration: 'المدة المتوقعة من الجبيل إلى البحرين: 1.5 إلى 2 ساعة (حوالي 140–160 كم) حسب حركة الجسر ووقت الانطلاق.',
    pickupTitle: 'نقاط الاستلام في الجبيل',
    pickupDesc: 'استلام من مدينة الجبيل الصناعية، مجمعات الهيئة الملكية، حي الفناتير، الجبيل البلد، الفنادق والمواقع الصناعية.',
    dropoffTitle: 'وجهات الوصول في البحرين',
    dropoffDesc: 'توصيل مباشر إلى مطار البحرين الدولي (BAH)، المنامة، ضاحية السيف، الجفير، أمواج، والفنادق والمقرات التجارية.',
    defaultFromCountry: 'المملكة العربية السعودية',
    defaultFromCity: 'الجبيل',
    defaultToCountry: 'البحرين',
    defaultToCity: 'المنامة',
    waMessage: 'مرحباً، أريد حجز خدمة نقل خاصة من الجبيل إلى البحرين.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/bahrain-to-jubail/', text: 'البحرين إلى الجبيل (مسار الذهاب)' },
      { url: '/bahrain-saudi-gcc-transport/dammam-to-bahrain/', text: 'الدمام إلى البحرين' },
      { url: '/bahrain-saudi-gcc-transport/khobar-to-bahrain/', text: 'الخبر إلى البحرين' },
      { url: '/bahrain-saudi-gcc-transport/saudi-to-bahrain/', text: 'السعودية إلى البحرين' },
      { url: '/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/', text: 'دليل جسر الملك فهد' }
    ],
    faqs: [
      { q: 'كم سعر المشوار من الجبيل إلى البحرين؟', a: 'السعر القياسي للمركبة كاملة هو 70 د.ب (~700 ريال سعودي) اتجاه واحد شامل رسوم عبور جسر الملك فهد. السعر للمركبة كاملة وليس لكل راكب.' },
      { q: 'هل تتوفر خدمة توصيل لمطار البحرين الدولي؟', a: 'نعم، نوفر خدمة نقل مباشرة لصالة المغادرة بمطار البحرين الدولي (BAH)، ونوصي بحجز الانطلاق قبل موعد الطائرة بـ 4 إلى 5 ساعات.' },
      { q: 'هل يتم تبديل السيارة عند الحدود؟', a: 'لا، التوصيل مباشر بنفس السيارة والسائق من موقع استلامك بالجبيل وحتى عنوانك بالبحرين دون أي تبديل.' },
      { q: 'كيف يمكن تأكيد الحجز وموعد الانطلاق؟', a: 'يمكنك تأكيد الحجز فوراً عبر إرسال موعد الانطلاق وموقع الاستلام وعدد الركاب والحقائب إلى رقم الواتساب الرسمي.' }
    ]
  },

  // 8. Jubail to Bahrain (English)
  {
    isEn: true,
    dir: 'en/jubail-to-bahrain',
    pairDir: 'jubail-to-bahrain',
    slug: 'jubail-to-bahrain',
    title: 'Private Taxi from Jubail to Bahrain | Royal Commission to Bahrain Airport | Vendora',
    description: 'Direct private taxi from Jubail Industrial City & Fanateer to Bahrain via King Fahd Causeway. 70 BHD per vehicle including causeway tolls, BAH airport drop-off.',
    eyebrow: 'Jubail to Bahrain Transfer',
    h1: 'Private Taxi from Jubail to Bahrain',
    answerFirst: '<strong>Private taxi from Jubail to Bahrain:</strong> Door-to-door pickup across Jubail Industrial City, Royal Commission, and Fanateer compounds directly to Bahrain International Airport (BAH), Manama, Seef, and all Bahrain destinations. Standard price is 70 BHD (~700 SAR) per complete vehicle — King Fahd Causeway toll included. Ideal for business travellers, airport departures, and weekend visits.',
    lead: 'Fast, premium private transfer from Jubail to Bahrain across King Fahd Causeway. Experienced cross-border drivers taking you straight to Bahrain Airport or your hotel without changing vehicles.',
    duration: 'Estimated drive time from Jubail to Bahrain: 1.5 to 2 hours (approx. 140–160 km) depending on causeway border processing and road conditions.',
    pickupTitle: 'Pickup Locations Across Jubail',
    pickupDesc: 'Pickup from Jubail Industrial City, Royal Commission residential sectors, Fanateer beachfront, Jubail Balad, and company sites.',
    dropoffTitle: 'Drop-off Locations in Bahrain',
    dropoffDesc: 'Direct drop-off at Bahrain International Airport (BAH) departure terminal, Manama, Seef District, Juffair, hotels, and offices.',
    defaultFromCountry: 'Saudi Arabia',
    defaultFromCity: 'Jubail',
    defaultToCountry: 'Bahrain',
    defaultToCity: 'Manama',
    waMessage: 'Hello, I would like to book a private taxi from Jubail to Bahrain.',
    relatedLinks: [
      { url: '/bahrain-saudi-gcc-transport/en/bahrain-to-jubail/', text: 'Bahrain to Jubail (Outbound Route)' },
      { url: '/bahrain-saudi-gcc-transport/en/dammam-to-bahrain/', text: 'Dammam to Bahrain' },
      { url: '/bahrain-saudi-gcc-transport/en/khobar-to-bahrain/', text: 'Khobar to Bahrain' },
      { url: '/bahrain-saudi-gcc-transport/en/saudi-to-bahrain/', text: 'Saudi Arabia to Bahrain' },
      { url: '/bahrain-saudi-gcc-transport/en/king-fahd-causeway-guide/', text: 'King Fahd Causeway Guide' }
    ],
    faqs: [
      { q: 'What is the price of a private taxi from Jubail to Bahrain?', a: 'The standard fixed rate is 70 BHD (~700 SAR) per complete vehicle one way, including King Fahd Causeway tolls. The fare covers the entire vehicle, not per passenger.' },
      { q: 'Can I book a transfer from Jubail directly to Bahrain Airport (BAH)?', a: 'Yes. We drop off directly at the Bahrain Airport departures terminal. We advise scheduling pickup at least 4 to 5 hours prior to your flight departure time.' },
      { q: 'Do passengers switch vehicles at the border crossing?', a: 'No. You travel smoothly in the same vehicle and with the same driver from Jubail all the way to Bahrain.' },
      { q: 'How quickly can a car be arranged in Jubail?', a: 'Bookings can be coordinated 24/7. We recommend requesting 1 to 3 hours in advance via WhatsApp for prompt dispatch.' }
    ]
  }
];

function generateHtml(p) {
  const isEn = p.isEn;
  const canonical = `${base}${p.dir}/`;
  const arUrl = isEn ? `${base}${p.pairDir}/` : canonical;
  const enUrl = isEn ? canonical : `${base}${p.pairDir}/`;
  const xDefault = arUrl;

  const relAssetPrefix = isEn ? '../../' : '../';
  const analyticsLoaderPrefix = isEn ? '../../../' : '../../';

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isEn ? 'English home' : 'نقليات فيندورا',
            item: isEn ? `${base}en/` : base
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isEn ? 'Bahrain to Saudi' : 'البحرين إلى السعودية',
            item: isEn ? `${base}en/bahrain-to-saudi/` : `${base}bahrain-to-saudi/`
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: p.eyebrow,
            item: canonical
          }
        ]
      },
      {
        '@type': 'TaxiService',
        '@id': `${canonical}#service`,
        name: p.h1,
        serviceType: 'Private GCC Transport',
        description: p.description,
        url: canonical,
        provider: {
          '@type': 'Organization',
          '@id': `${base}#organization`,
          name: 'Vendora Transport',
          url: isEn ? `${base}en/` : base
        },
        offers: {
          '@type': 'Offer',
          price: 70,
          priceCurrency: 'BHD',
          description: isEn ? 'Per complete vehicle, one way. King Fahd Causeway toll included.' : 'للمركبة كاملة، اتجاه واحد. شامل رسوم عبور جسر الملك فهد.'
        },
        areaServed: [
          { '@type': 'Country', name: 'Bahrain' },
          { '@type': 'Country', name: 'Saudi Arabia' }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: p.faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.a
          }
        }))
      }
    ]
  };

  const navBrandSub = isEn ? 'Bahrain to Saudi Arabia and GCC destinations' : 'البحرين إلى السعودية ودول مجلس التعاون الخليجي';
  const navHome = isEn ? 'Home' : 'الرئيسية';
  const navPassengers = isEn ? 'Passengers' : 'نقل الركاب';
  const navParcels = isEn ? 'Parcels' : 'توصيل الطرود';
  const navGcc = isEn ? 'GCC routes' : 'وجهات الخليج';
  const navContact = isEn ? 'Contact' : 'تواصل معنا';
  const navAbout = isEn ? 'About' : 'من نحن';
  const waLabel = isEn ? 'WhatsApp' : 'واتساب';
  const waNow = isEn ? 'Book on WhatsApp' : 'واتساب الآن';
  const startBooking = isEn ? 'Start booking' : 'ابدأ الحجز الآن';
  const whyCardTitle = isEn ? 'Why this direct route?' : 'مزايا المسار المباشر';
  const whyCardText = isEn
    ? 'Direct door-to-door private ride with no vehicle transfer at the border, King Fahd Causeway tolls included, and flexible scheduling 24/7.'
    : 'نقل مباشر من الباب إلى الباب دون تبديل المركبة على الحدود، مع شمول رسوم جسر الملك فهد ومواعيد مرنة طوال اليوم.';
  const durationHeading = isEn ? 'Trip Duration & Distance' : 'مدة ومسافة الرحلة';
  const serviceHeading = isEn ? 'Service Highlights' : 'تفاصيل الخدمة';
  const serviceSub = isEn ? 'Private passenger transport and personal parcel delivery.' : 'نقل خاص للركاب وتوصيل الطرود الشخصية والتجارية الصغيرة.';
  const bookingInfoHeading = isEn ? 'Booking Information' : 'معلومات الحجز';
  const bookingInfoSub = isEn ? 'Fast WhatsApp coordination 1 to 3 hours in advance, available 24/7.' : 'تأكيد سريع عبر واتساب، يفضل الحجز قبل 1 إلى 3 ساعات.';
  const relatedHeading = isEn ? 'Related Routes & Return Trips' : 'مسارات وروابط ذات صلة';
  const relatedSub = isEn ? 'Compare alternative Eastern Province destinations and return options.' : 'قارن الوجهات القريبة ومسارات العودة المباشرة.';
  const bookingCardHeading = isEn ? `Book ${p.eyebrow}` : `احجز ${p.eyebrow}`;
  const bookingCardSub = isEn
    ? 'Choose your service and locations, then send your request directly to WhatsApp.'
    : 'اختر الخدمة ونقطة الانطلاق والوجهة، ثم أرسل الطلب مباشرة إلى الواتساب.';
  const faqHeading = isEn ? 'Frequently Asked Questions' : 'الأسئلة الشائعة';
  const faqSub = isEn ? 'Key details before booking your journey.' : 'أهم المعلومات قبل تأكيد الحجز.';
  const openLinkText = isEn ? 'Open route' : 'فتح الصفحة';

  const footerCopy = isEn
    ? 'Vendora Transport coordinates private cross-border travel between Bahrain, Saudi Arabia, and the GCC via WhatsApp with dedicated route pricing and transparent service details.'
    : 'تنسق Vendora Transport طلبات النقل الخاص بين البحرين والسعودية ودول الخليج عبر واتساب، مع صفحات واضحة للمسارات والخدمات.';
  const footerTrust = isEn
    ? '<span>Private door-to-door vehicle with experienced cross-border driver.</span><span>Service covers Bahrain, Saudi Arabia (Khobar, Dammam, Al Ahsa, Jubail, Riyadh), Kuwait, Qatar, UAE, and Oman.</span>'
    : '<span>استخدم روابط المسارات القريبة لاختيار الوجهة المناسبة ثم أرسل تفاصيل الطلب عبر واتساب.</span><span>تشمل الخدمة البحرين إلى السعودية (الخبر، الدمام، الأحساء، الجبيل، الرياض) والكويت والإمارات وقطر وعمان.</span>';

  const trustLinksHtml = isEn
    ? `<nav class="discovery-trust-links" aria-label="Booking and Trust Information"><a href="/bahrain-saudi-gcc-transport/en/booking-policy/">Booking Policy</a><a href="/bahrain-saudi-gcc-transport/en/cancellation-policy/">Cancellation Policy</a><a href="/bahrain-saudi-gcc-transport/en/passenger-safety/">Passenger Safety</a><a href="/bahrain-saudi-gcc-transport/en/payment-policy/">Payment Policy</a><a href="/bahrain-saudi-gcc-transport/en/support-policy/">Support Policy</a><a href="/bahrain-saudi-gcc-transport/en/complaints/">Complaints</a><a href="/bahrain-saudi-gcc-transport/en/customer-reviews/">Customer Reviews</a></nav>`
    : `<nav class="discovery-trust-links" aria-label="معلومات الحجز والثقة"><a href="/bahrain-saudi-gcc-transport/booking-policy/">سياسة الحجز</a><a href="/bahrain-saudi-gcc-transport/cancellation-policy/">سياسة الإلغاء</a><a href="/bahrain-saudi-gcc-transport/passenger-safety/">سلامة الركاب</a><a href="/bahrain-saudi-gcc-transport/payment-policy/">سياسة الدفع</a><a href="/bahrain-saudi-gcc-transport/support-policy/">الدعم</a><a href="/bahrain-saudi-gcc-transport/complaints/">الشكاوى</a><a href="/bahrain-saudi-gcc-transport/customer-reviews/">آراء العملاء</a></nav>`;

  const vehicleLuggageHtml = isEn
    ? `<section class="section vehicle-confirmation" data-vendora-vehicle-luggage-notice><div class="container section-shell"><div class="section-head"><h2>Vehicle and luggage arrangements</h2><p>Vehicle type and model depend on the route, passenger count, luggage and availability when the booking is confirmed. Customers must provide the number and approximate size of their bags. Additional luggage arrangements may be possible when suitable and confirmed in advance.</p><p>Only vehicle categories and booking options are presented. The vehicle may be arranged by Vendora or an approved operating partner, and no specific vehicle is permanently tied to the service.</p></div></div></section>`
    : `<section class="section vehicle-confirmation" data-vendora-vehicle-luggage-notice><div class="container section-shell"><div class="section-head"><h2>ترتيبات المركبة والأمتعة</h2><p>يعتمد نوع المركبة وموديلها على المسار وعدد الركاب والأمتعة والتوفر عند تأكيد الحجز. يجب على العملاء تزويدنا بعدد الحقائب وحجمها التقريبي. قد تتوفر ترتيبات أمتعة إضافية عند الانطباق والتأكيد المسبق.</p><p>تُعرض فئات المركبات وخيارات الحجز فقط. قد تُرتب المركبة بواسطة فندورا أو شريك تشغيل معتمد، ولا ترتبط الخدمة بشكل دائم بمركبة محددة.</p></div></div></section>`;

  return `<!DOCTYPE html><html lang="${isEn ? 'en' : 'ar'}" dir="${isEn ? 'ltr' : 'rtl'}"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(p.title)}</title><meta name="description" content="${escapeHtml(p.description)}" /><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" /><meta name="theme-color" content="#10071d" /><link rel="alternate" type="text/markdown" href="https://getvendora.net/bahrain-saudi-gcc-transport/llms.txt" title="Vendora GCC transport — AI discovery" /><meta property="og:type" content="website" /><meta property="og:locale" content="${isEn ? 'en_US' : 'ar_BH'}" /><meta property="og:url" content="${canonical}" /><meta property="og:title" content="${escapeHtml(p.title)}" /><meta property="og:description" content="${escapeHtml(p.description)}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(p.title)}" /><meta name="twitter:description" content="${escapeHtml(p.description)}" /><link rel="stylesheet" href="${relAssetPrefix}site.css" /><script defer src="${relAssetPrefix}assets/lucide.min.js"></script>
  <script type="application/ld+json" data-vendora-schema>${JSON.stringify(schema)}</script>
<meta property="og:image" content="https://getvendora.net/bahrain-saudi-gcc-transport/assets/images/hero-vendora-vip-gmc-airport.webp">
  <meta name="twitter:image" content="https://getvendora.net/bahrain-saudi-gcc-transport/assets/images/hero-vendora-vip-gmc-airport.webp">
  <!-- Vendora brand sources: generated by scripts/sync-transport-site.mjs. -->
  <link rel="icon" type="image/svg+xml" href="${relAssetPrefix}assets/brand/vendora-transport-app-icon.svg" data-vendora-brand-icon />
  <link rel="icon" type="image/png" sizes="512x512" href="${relAssetPrefix}assets/brand/vendora-transport-app-icon-512.png" data-vendora-brand-icon />
  <link rel="apple-touch-icon" sizes="512x512" href="${relAssetPrefix}assets/brand/vendora-transport-app-icon-512.png" data-vendora-brand-icon />
  <!-- Vendora global sources: edit config/*.json and assets/vendora-theme.css, then run npm run sync. -->
  <link rel="stylesheet" href="${relAssetPrefix}assets/vendora-theme.css" data-vendora-global-theme />
  <script defer src="${relAssetPrefix}assets/vendora-config.js" data-vendora-global-config></script>
  <script defer src="${relAssetPrefix}assets/transport-analytics-map.js" data-vendora-analytics-map></script>
  <script defer src="${relAssetPrefix}assets/transport-analytics.js" data-vendora-transport-analytics></script>
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ar-BH" href="${arUrl}">
  <link rel="alternate" hreflang="en" href="${enUrl}">
  <link rel="alternate" hreflang="x-default" href="${xDefault}">
</head><body class="home-premium${isEn ? ' lang-en' : ''} vip-transport"><header class="topbar"><div class="container nav"><a class="brand" href="/bahrain-saudi-gcc-transport/${isEn ? 'en/' : ''}"><span class="logo"><img class="vip-app-icon" src="${relAssetPrefix}assets/brand/vendora-transport-app-icon.svg" alt="" width="512" height="512" decoding="async" aria-hidden="true"></span><span class="brand-copy"><span class="brand-title">Vendora Transport</span><span class="brand-sub">${navBrandSub}</span></span></a><nav class="nav-menu" aria-label="Primary"><a class="nav-link" href="/bahrain-saudi-gcc-transport/${isEn ? 'en/' : ''}">${navHome}</a><a class="nav-link" href="/bahrain-saudi-gcc-transport/${isEn ? 'en/passenger-transport/' : 'passenger-transport/'}">${navPassengers}</a><a class="nav-link" href="/bahrain-saudi-gcc-transport/${isEn ? 'en/parcel-delivery/' : 'parcel-delivery/'}">${navParcels}</a><a class="nav-link active" href="/bahrain-saudi-gcc-transport/${isEn ? 'en/gcc-destinations/' : 'gcc-destinations/'}">${navGcc}</a><a class="nav-link" href="/bahrain-saudi-gcc-transport/${isEn ? 'en/contact/' : 'contact/'}">${navContact}</a><a class="nav-link" href="/bahrain-saudi-gcc-transport/${isEn ? 'en/about/' : 'about/'}">${navAbout}</a></nav><div class="quick-links"><a href="https://wa.me/97333225954" class="wa-inline" data-wa-message="${escapeHtml(p.waMessage)}" data-vendora-config="whatsapp-link"><i data-lucide="message-circle"></i><span>${waLabel}</span></a></div></div></header><main><section class="hero"><div class="container hero-grid"><div class="hero-copy glass"><span class="eyebrow"><strong>${escapeHtml(p.eyebrow)}</strong></span><h1>${escapeHtml(p.h1)}</h1><!-- phase10-content --><div class="phase10-answer-first" style="margin:14px 0;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.06);"><p>${p.answerFirst}</p></div><p class="lead">${escapeHtml(p.lead)}</p><div class="hero-actions"><a class="primary-btn" href="#booking"><i data-lucide="${isEn ? 'calendar-check' : 'arrow-up-left'}"></i><span>${startBooking}</span></a><a href="https://wa.me/97333225954" class="wa-inline" data-wa-message="${escapeHtml(p.waMessage)}" data-vendora-config="whatsapp-link"><i data-lucide="message-circle"></i><span>${waNow}</span></a></div><div class="flag-badges" style="margin-top:18px;"><span class="flag-badge"><span class="flag-emoji">🇧🇭</span><span>${isEn ? 'Bahrain' : 'البحرين'}</span></span><span class="flag-badge"><span class="flag-emoji">🇸🇦</span><span>${isEn ? 'Saudi Arabia' : 'السعودية'}</span></span><span class="flag-badge"><span class="flag-emoji">🇰🇼</span><span>${isEn ? 'Kuwait' : 'الكويت'}</span></span><span class="flag-badge"><span class="flag-emoji">🇦🇪</span><span>${isEn ? 'UAE' : 'الإمارات'}</span></span><span class="flag-badge"><span class="flag-emoji">🇶🇦</span><span>${isEn ? 'Qatar' : 'قطر'}</span></span><span class="flag-badge"><span class="flag-emoji">🇴🇲</span><span>${isEn ? 'Oman' : 'عمان'}</span></span></div></div><aside class="hero-side glass"><div class="hero-icon"><i data-lucide="map-pin"></i></div><h2 style="margin:0 0 10px;">${whyCardTitle}</h2><p class="footer-copy">${whyCardText}</p></aside></div></section><section class="section"><div class="container section-shell"><div class="section-head"><h2>${durationHeading}</h2><p>${escapeHtml(p.duration)}</p></div><div class="route-grid"><article class="route-card"><h3>${escapeHtml(p.pickupTitle)}</h3><p>${escapeHtml(p.pickupDesc)}</p></article><article class="route-card"><h3>${escapeHtml(p.dropoffTitle)}</h3><p>${escapeHtml(p.dropoffDesc)}</p></article><article class="route-card"><h3>${isEn ? 'King Fahd Causeway Included' : 'رسوم الجسر مشمولة'}</h3><p>${isEn ? 'Official causeway toll is fully included in the standard 70 BHD / 700 SAR rate.' : 'رسوم عبور جسر الملك فهد مشمولة بالكامل ضمن السعر القياسي 70 د.ب / 700 ر.س.'}</p></article></div></div></section><section class="section"><div class="container section-shell"><div class="section-head"><h2>${serviceHeading}</h2><p>${serviceSub}</p></div><div class="route-grid"><article class="route-card"><h3>${isEn ? '24/7 Booking Subject to Availability' : 'على مدار الساعة حسب التوفر'}</h3><p>${isEn ? 'Booking requests can be submitted 24/7 with rapid WhatsApp dispatch confirmation.' : 'يمكن إرسال طلب الخدمة على مدار الساعة، ويؤكد الموعد حسب التوفر.'}</p></article><article class="route-card"><h3>${isEn ? 'Spacious Sedan & GMC XL SUV' : 'سيارة سيدان أو GMC / XL'}</h3><p>${isEn ? 'Passenger and luggage capacity is confirmed upon booking based on your party size.' : 'تُؤكد سعة الركاب والأمتعة فقط بعد تحديد فئة المركبة وتجهيزها الفعلي للحجز.'}</p></article><article class="route-card"><h3>${isEn ? 'Direct Door-to-Door' : 'من الباب إلى الباب'}</h3><p>${isEn ? 'Direct pickup from home, hotel, office, or airport directly to your address.' : 'استلام من المنزل أو الفندق أو المطار أو المكتب مباشرة دون تبديل السيارة.'}</p></article><article class="route-card"><h3>${isEn ? 'Payment & Return Trips' : 'الدفع ورحلات العودة'}</h3><p>${isEn ? 'Cash (BHD/SAR) or BenefitPay accepted, with same-day return options available.' : 'الدفع نقداً بالدينار أو الريال أو عبر BenefitPay مع توفر رحلات عودة.'}</p></article></div></div></section><section class="section"><div class="container section-shell"><div class="section-head"><h2>${bookingInfoHeading}</h2><p>${bookingInfoSub}</p></div><div class="route-grid"><article class="route-card"><h3>${isEn ? 'Advance Notice' : 'موعد الحجز'}</h3><p>${isEn ? 'We recommend sending details 1 to 3 hours prior to travel for smooth coordination.' : 'يفضّل إرسال الحجز قبل 1 إلى 3 ساعات من وقت الرحلة.'}</p></article><article class="route-card"><h3>${isEn ? 'Instant WhatsApp Confirmation' : 'تأكيد سريع عبر واتساب'}</h3><p>${isEn ? 'Send pickup location, destination, date, passengers, and bags for immediate confirmation.' : 'أرسل نقطة الاستلام والوجهة وعدد الركاب عبر واتساب لتأكيد الطلب بسرعة.'}</p></article></div></div></section><section class="section"><div class="container section-shell"><div class="section-head"><h2>${relatedHeading}</h2><p>${relatedSub}</p></div><div class="route-grid">${p.relatedLinks.map(l => `<article class="route-card"><h3>${escapeHtml(l.text)}</h3><a class="ghost-btn" href="${escapeHtml(l.url)}"><span>${openLinkText}</span><i data-lucide="${isEn ? 'arrow-right' : 'arrow-up-left'}"></i></a></article>`).join('')}</div></div></section><section class="section" id="booking"><div class="container"><div class="booking-card glass"><div class="section-head"><h2>${bookingCardHeading}</h2><p>${bookingCardSub}</p></div><form class="booking-form" data-booking-form data-default-service="${isEn ? 'Passenger Transport' : 'نقل الركاب'}" data-default-from-country="${escapeHtml(p.defaultFromCountry)}" data-default-from-city="${escapeHtml(p.defaultFromCity)}" data-default-to-country="${escapeHtml(p.defaultToCountry)}" data-default-to-city="${escapeHtml(p.defaultToCity)}"><div class="field-grid"><div class="field-group"><label>${isEn ? 'Service Type' : 'نوع الخدمة'}</label><select data-booking="service"></select></div><div class="field-group"><label>${isEn ? 'From Country' : 'من البلاد'}</label><select data-booking="from-country"></select></div><div class="field-group"><label>${isEn ? 'From City' : 'من المدينة'}</label><select data-booking="from-city"></select></div><div class="field-group"><label>${isEn ? 'To Country' : 'إلى البلد'}</label><select data-booking="to-country"></select></div><div class="field-group"><label>${isEn ? 'To City' : 'إلى المدينة'}</label><select data-booking="to-city"></select></div></div><div class="field-group"><label>${isEn ? 'Additional Notes' : 'ملاحظات إضافية'}</label><textarea data-booking="notes" placeholder="${isEn ? 'Add pickup address, date, time, passengers, or luggage details.' : 'أضف الوقت أو عدد الركاب أو أي ملاحظة مفيدة.'}"></textarea><span class="field-help">${isEn ? 'Provide trip details, flight number, or preferred meeting point.' : 'يمكنك إضافة وصف مختصر للرحلة أو الموعد أو مكان الالتقاء.'}</span></div><p class="booking-summary" data-booking-summary>${isEn ? 'Select service and origin/destination to generate your WhatsApp message automatically.' : 'اختر الخدمة والأصل والوجهة لإعداد رسالة واتساب تلقائياً.'}</p><div class="booking-actions"><a href="https://wa.me/97333225954" class="wa-inline" data-booking-submit data-vendora-config="whatsapp-link"><i data-lucide="message-circle"></i><span>${isEn ? 'Send Booking Request via WhatsApp' : 'أرسل الطلب على الواتساب'}</span></a><a href="https://wa.me/97333225954" class="ghost-btn" data-wa-message="${escapeHtml(p.waMessage)}" data-vendora-config="whatsapp-link"><i data-lucide="phone"></i><span>${isEn ? 'Quick Enquiry' : 'استفسار سريع'}</span></a></div></form></div></div></section><section class="section"><div class="container section-shell"><div class="section-head"><h2>${faqHeading}</h2><p>${faqSub}</p></div><div class="faq-wrap">${p.faqs.map(f => `<details class="faq-item"><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`).join('')}</div></div></section><footer class="footer"><div class="container footer-grid"><div class="footer-card glass"><img class="vip-footer-logo" src="${relAssetPrefix}assets/brand/vendora-transport-logo-light.svg" alt="" width="840" height="180" loading="lazy" decoding="async" aria-hidden="true"><h3>Vendora Transport</h3><p class="footer-copy">${footerCopy}</p><div class="footer-actions"><a href="https://wa.me/97333225954" class="wa-inline" data-wa-message="${escapeHtml(p.waMessage)}" data-vendora-config="whatsapp-link"><i data-lucide="message-circle"></i><span>${isEn ? 'Book on WhatsApp' : 'الحجز على الواتساب'}</span></a></div><div class="trust-line">${footerTrust}</div></div><div class="footer-card glass"><h3>${isEn ? 'Useful Links' : 'روابط مفيدة'}</h3><div class="footer-links"><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/' : ''}">${navHome}</a><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/passenger-transport/' : 'passenger-transport/'}">${navPassengers}</a><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/parcel-delivery/' : 'parcel-delivery/'}">${navParcels}</a><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/contact/' : 'contact/'}">${navContact}</a><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/about/' : 'about/'}">${navAbout}</a><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/gcc-private-transport-guide/' : 'gcc-private-transport-guide/'}">${isEn ? 'GCC Transport Guide' : 'دليل التوصيل الخاص بين دول الخليج'}</a></div></div><div class="footer-card glass"><h3>${isEn ? 'Related Routes' : 'صفحات مرتبطة'}</h3><div class="footer-links"><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/bahrain-to-saudi/' : 'bahrain-to-saudi/'}">${isEn ? 'Bahrain to Saudi' : 'البحرين إلى السعودية'}</a><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/saudi-to-bahrain/' : 'saudi-to-bahrain/'}">${isEn ? 'Saudi to Bahrain' : 'السعودية إلى البحرين'}</a><a href="/bahrain-saudi-gcc-transport/${isEn ? 'en/gcc-destinations/' : 'gcc-destinations/'}">${navGcc}</a></div></div></div>${trustLinksHtml}</footer>${vehicleLuggageHtml}</main><a href="https://wa.me/97333225954" class="floating-wa" data-wa-message="${escapeHtml(p.waMessage)}" aria-label="WhatsApp" data-vendora-config="whatsapp-link"><i data-lucide="message-circle"></i></a><script>window.pageConfig={"phoneNumber":"97333225954","defaultWhatsAppMessage":"${escapeHtml(p.waMessage)}"};</script><script defer src="${relAssetPrefix}business-config.js"></script><script defer src="${relAssetPrefix}site.js?v=20260605-care5"></script>
  <script defer src="${analyticsLoaderPrefix}assets/analytics-loader.js" data-vendora-analytics-loader></script>
</body></html>`;
}

for (const p of pagesData) {
  const targetDir = join(root, p.dir);
  mkdirSync(targetDir, { recursive: true });
  const html = generateHtml(p);
  writeFileSync(join(targetDir, 'index.html'), html, 'utf8');
  console.log(`Generated: ${p.dir}/index.html`);
}
