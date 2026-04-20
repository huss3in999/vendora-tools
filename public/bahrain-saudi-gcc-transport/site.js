(function () {
  const config = window.pageConfig || {};
  const phoneNumber = config.phoneNumber || '97333225954';
  const siteSegment = '/bahrain-saudi-gcc-transport/';
  const defaultArabicMessage = config.defaultWhatsAppMessage || 'مرحباً، أود معرفة تفاصيل الحجز والخدمة.';
  const pageUrl = window.location.href;
  const state = {
    lang: localStorage.getItem('vendora_lang') || 'ar',
  };

  const translations = [
    ['الصفحات الأكثر طلباً وروابط الوجهات', 'Top routes and destination links'],
    ['صفحات الدول والوجهات', 'Country and destination pages'],
    ['كل دولة أساسية لها صفحة مستقلة مع علم واضح وكلمة مفتاحية مباشرة وروابط سريعة للحجز.', 'Each core destination has its own page, clear flag cue, focused keyword, and fast booking links.'],
    ['النقل البحريني والسعودي ودول مجلس التعاون الخليجي', 'Bahrain, Saudi and GCC transport'],
    ['الحجز السريع للنقل والتوصيل من البحرين إلى السعودية ودول مجلس التعاون الخليجي', 'Fast transport and delivery booking from Bahrain to Saudi Arabia and GCC destinations'],
    ['خدمة واضحة باللغة العربية مع رؤية قوية للطريق وأهداف النقر الكبيرة والحجز المباشر عبر تطبيق WhatsApp.', 'A clear transport service with direct booking, focused routes, and fast WhatsApp access.'],
    ['متاح للتنسيق السريع على مدار الساعة للرحلات المباشرة والطلبات المرنة.', 'Available around the clock for direct trips and flexible requests.'],
    ['ماذا يمكنك أن تحجز هنا؟', 'What can you book here?'],
    ['الأفراد والعائلات والطرود والاستقبال من المطار والسفر المباشر بين البحرين والمملكة العربية السعودية مع تغطية دول مجلس التعاون الخليجي عند الحاجة.', 'Passenger trips, family travel, parcel delivery, airport pickup, and direct transport between Bahrain and Saudi Arabia with GCC coverage when needed.'],
    ['خدمة واضحة وحجز أسرع', 'Clear service and faster booking'],
    ['واجهة خفيفة وسريعة مصممة للعملاء الذين يرغبون في الوصول إلى الخدمة والوجهة والواتساب في أقصر وقت.', 'A light, fast interface designed for customers who want to reach the service, destination, and WhatsApp in the shortest time.'],
    ['واجهة خفيفة وسريعة مصممة للعملاء الذين يرغبون في الوصول إلى الخدمة والوجهة والواتس اب في أقصر وقت.', 'A light, fast interface designed for customers who want to reach the service, destination, and WhatsApp in the shortest time.'],
    ['الخدمات الرئيسية', 'Core services'],
    ['تساعد البطاقات القصيرة العملاء على فهم الخدمة المناسبة في ثوانٍ.', 'Short service cards help customers understand the right option in seconds.'],
    ['رحلات مباشرة ومريحة للأفراد والعائلات بين البحرين والسعودية.', 'Direct and comfortable trips for individuals and families between Bahrain and Saudi Arabia.'],
    ['المستندات والأغراض الشخصية والتسليم الخفيف مع التنسيق السريع.', 'Documents, personal items, and light parcel delivery with quick coordination.'],
    ['وسائل نقل مرنة لاجتماعات العمل والرحلات الخاصة والزيارات الخاصة.', 'Flexible transport for business meetings, private trips, and special visits.'],
    ['ترتيبات واضحة للركوب العائلي والزيارات الخاصة.', 'Clear arrangements for family travel and private visits.'],
    ['قم بمسح ترتيبات الاستقبال والتوصيل في المطار باستخدام أزرار كبيرة متوافقة مع الهاتف المحمول.', 'Review airport pickup and drop-off arrangements through large mobile-friendly actions.'],
    ['وصول سريع إلى الخبر والدمام والرياض من خلال الحجز المباشر عبر الواتساب.', 'Fast access to Khobar, Dammam, and Riyadh through direct WhatsApp booking.'],
    ['وفر الوقت وانتقل مباشرة إلى الصفحة التي تتوافق مع وجهتك أو حاجة الحجز.', 'Save time and jump directly to the page that matches your destination or booking need.'],
    ['صفحة طريق رئيسية تجمع الخدمات وروابط الوجهة.', 'A main route page that gathers services and destination links.'],
    ['اختيار جيد للرحلات السريعة والحجوزات المتكررة.', 'A strong option for fast trips and repeat bookings.'],
    ['صفحة واضحة للنقل اليومي وطلبات الرحلات الخاصة.', 'A clear page for daily transport and private trip requests.'],
    ['مسار أوضح للرحلات الطويلة والحجز المنظم.', 'A clearer route for longer trips and organized booking.'],
    ['الصفحة الرئيسية للسعودية مع روابط الخبر والدمام والرياض.', 'The main Saudi Arabia page with links for Khobar, Dammam, and Riyadh.'],
    ['صفحة مستقلة للكويت مع خدمة ركاب وطرود وسائق خاص.', 'A dedicated Kuwait page with passenger transport, parcel delivery, and private driver service.'],
    ['بوابة الإمارات العامة مع رابط مباشر إلى دبي.', 'A UAE destination page with a direct link to Dubai.'],
    ['صفحة مستقلة لدبي لمن يريد استهدافاً أدق داخل الإمارات.', 'A dedicated Dubai page for more precise targeting within the UAE.'],
    ['صفحة مخصصة لقطر والدوحة مع حجز مباشر.', 'A dedicated Qatar page with direct booking for Doha trips.'],
    ['تغطية لمسقط وصلالة وصحار بصياغة واضحة وخفيفة.', 'Coverage for Muscat, Salalah, and Sohar with clear, simple wording.'],
    ['صفحة مستقلة للعراق مع خدمة الركاب والطرود والتنسيق المباشر.', 'A dedicated Iraq page with passenger service, parcel delivery, and direct coordination.'],
    ['احجز عبر الواتساب في أقل من دقيقة', 'Book on WhatsApp in under a minute'],
    ['اختر الخدمة والمنشأ والوجهة، ثم أرسل طلبًا نظيفًا عبر الواتساب مع التفاصيل المعدة مسبقًا.', 'Choose the service, origin, and destination, then send a clean WhatsApp request with the main details already prepared.'],
    ['اختر الخدمة والأصل والوجهة لإعداد رسالة واتساب تلقائيًا.', 'Choose the service, origin, and destination to prepare a WhatsApp message automatically.'],
    ['لماذا يختارنا العملاء', 'Why customers choose us'],
    ['وينصب التركيز على الوضوح والسرعة والوصول إلى الخدمة بسرعة من الهاتف المحمول.', 'The focus is on clarity, speed, and getting to the service quickly from mobile.'],
    ['يبدأ الطلب من رسالة واتساب جاهزة بدلاً من عملية معقدة.', 'The request starts from a ready WhatsApp message instead of a complex process.'],
    ['يمكن ترتيب الرحلات والتوصيل حسب الموقع والوقت المطلوب.', 'Trips and delivery can be arranged based on the location and required time.'],
    ['يتم ترتيب العناوين والبطاقات والروابط لإجراء مسح أسرع واختيار أسهل.', 'Headings, cards, and links are organized for faster scanning and easier selection.'],
    ['الصياغة مباشرة ومهنية وتركز على ما يحتاجه العميل بالفعل.', 'The wording is direct, professional, and focused on what the customer actually needs.'],
    ['كيف يعمل الحجز؟', 'How booking works'],
    ['اختر الخدمة والمدن، ثم افتح واتساب برسالة جاهزة تتضمن المعلومات الأساسية بالفعل.', 'Choose the service and cities, then open WhatsApp with a ready message that already includes the essential information.'],
    ['نقل الركاب، توصيل الطرود، سائق خاص، رحلة عائلية أو النقل من المطار.', 'Passenger transport, parcel delivery, private driver, family trips, or airport transfer.'],
    ['اختر الدولة والمدينة التي يبدأ فيها الطلب.', 'Choose the country and city where the request starts.'],
    ['اختر البلد والمدينة الوجهة، ثم أضف أي ملاحظة مفيدة.', 'Choose the destination country and city, then add any useful note.'],
    ['يتم فتح الطلب مباشرة في الواتساب بتنسيق منظم يسرع التنسيق.', 'The request opens directly in WhatsApp with a structured format that speeds up coordination.'],
    ['يتم فتح الطلب مباشرة في الواتس اب بتنسيق منظم يسرع التنسيق.', 'The request opens directly in WhatsApp with a structured format that speeds up coordination.'],
    ['الأسئلة المتداولة', 'Frequently asked questions'],
    ['إجابات قصيرة تساعد العملاء على اتخاذ القرار بسرعة.', 'Short answers that help customers decide quickly.'],
    ['هل يمكنني الحجز مباشرة من الموقع؟', 'Can I book directly from the website?'],
    ['نعم. يقوم نموذج الحجز بإعداد رسالة واتساب منظمة مع الخدمة والمصدر والوجهة قبل فتح الدردشة.', 'Yes. The booking form prepares a structured WhatsApp message with the service, origin, and destination before the chat opens.'],
    ['هل الموقع متوافق مع الجوال؟', 'Is the website mobile friendly?'],
    ['نعم. تستخدم الصفحات أزرارًا كبيرة ومسافات واضحة وأقسامًا خفيفة مصممة للتصفح عبر الهاتف المحمول أولاً.', 'Yes. The pages use large buttons, clear spacing, and light sections designed for mobile-first browsing.'],
    ['هل يمكنني اختيار وجهات أخرى في دول مجلس التعاون الخليجي؟', 'Can I choose other destinations across the GCC?'],
    ['نعم. نموذج الحجز يدعم البحرين والمملكة العربية السعودية والكويت والإمارات العربية المتحدة وقطر وعمان مع مدن الوجهة المشتركة.', 'Yes. The booking form supports Bahrain, Saudi Arabia, Kuwait, the UAE, Qatar, and Oman with shared destination cities.'],
    ['خدمة نقل وتوصيل عربية واضحة بين البحرين والمملكة العربية السعودية، مع إمكانية الوصول إلى دول مجلس التعاون الخليجي والحجز المباشر عبر الواتساب في تجربة أسرع وأكثر احترافية.', 'A clear transport and delivery service between Bahrain and Saudi Arabia with access to GCC destinations and direct WhatsApp booking in a faster, more professional experience.'],
    ['مصمم للعملاء الذين يبحثون عن حجز سريع وطرق واضحة ولغة خدمة احترافية.', 'Designed for customers looking for quick booking, clear routes, and professional service language.'],
    ['البحرين إلى السعودية والكويت والإمارات ودبي وقطر وعمان والعراق مع صفحات مستقلة وروابط أوضح لكل وجهة.', 'Bahrain to Saudi Arabia, Kuwait, the UAE, Dubai, Qatar, Oman, and Iraq with dedicated pages and clearer links for each destination.'],
    ['الرئيسية', 'Home'],
    ['نقل الركاب', 'Passenger transport'],
    ['توصيل الطرود', 'Parcel delivery'],
    ['وجهات الخليج', 'GCC destinations'],
    ['تواصل معنا', 'Contact'],
    ['من نحن', 'About'],
    ['طلب الخدمة', 'Request service'],
    ['واتساب الآن', 'WhatsApp now'],
    ['واتساب الان', 'WhatsApp now'],
    ['واتساب', 'WhatsApp'],
    ['ابدأ الحجز الآن', 'Start booking'],
    ['أرسل الطلب على الواتساب', 'Send request on WhatsApp'],
    ['استفسار سريع', 'Quick inquiry'],
    ['افتح الصفحة', 'Open page'],
    ['عرض الصفحة', 'View page'],
    ['اطلب الخدمة', 'Request service'],
    ['اعرف أكثر', 'Learn more'],
    ['يتعلم أكثر', 'Learn more'],
    ['خطط للرحلة', 'Plan trip'],
    ['احجز الآن', 'Book now'],
    ['عرض الطرق', 'View routes'],
    ['الخدمات الرئيسية', 'Core services'],
    ['الأسئلة المتداولة', 'Frequently asked questions'],
    ['احجز عبر الواتساب في أقل من دقيقة', 'Book through WhatsApp in under a minute'],
    ['نوع الخدمة', 'Service type'],
    ['من البلد', 'From country'],
    ['من البلاد', 'From country'],
    ['من المدينة', 'From city'],
    ['إلى البلد', 'To country'],
    ['الى البلد', 'To country'],
    ['إلى المدينة', 'To city'],
    ['الى المدينة', 'To city'],
    ['ملاحظات إضافية', 'Additional notes'],
    ['اختر نوع الخدمة', 'Choose service type'],
    ['اختر البلد', 'Choose country'],
    ['اختر المدينة', 'Choose city'],
    ['اختر الخدمة ونقطة الانطلاق والوجهة ليتم تجهيز رسالة واتساب تلقائياً.', 'Choose the service, origin, and destination to prepare your WhatsApp request automatically.'],
    ['يمكنك إضافة الوقت أو عدد الركاب أو وصف مختصر للطرد أو الرحلة.', 'You can add the time, number of passengers, or a short parcel/trip note.'],
    ['الحجز السريع', 'Fast booking'],
    ['خدمة مرنة', 'Flexible service'],
    ['واجهة واضحة', 'Clear interface'],
    ['ثقة أقوى', 'Stronger trust'],
    ['كيف يعمل الحجز؟', 'How booking works'],
    ['اختر الخدمة', 'Choose the service'],
    ['حدد الأصل', 'Choose the origin'],
    ['حدد الوجهة', 'Choose the destination'],
    ['أرسل على الواتساب', 'Send on WhatsApp'],
    ['صفحات الوجهات', 'Destination pages'],
    ['روابط سريعة', 'Quick links'],
    ['الحجز على الواتساب', 'Book on WhatsApp'],
    ['البحرين', 'Bahrain'],
    ['المملكة العربية السعودية', 'Saudi Arabia'],
    ['السعودية', 'Saudi Arabia'],
    ['الكويت', 'Kuwait'],
    ['الإمارات العربية المتحدة', 'United Arab Emirates'],
    ['الإمارات', 'UAE'],
    ['دبي', 'Dubai'],
    ['قطر', 'Qatar'],
    ['عمان', 'Oman'],
    ['العراق', 'Iraq'],
    ['الخبر', 'Khobar'],
    ['الدمام', 'Dammam'],
    ['الرياض', 'Riyadh'],
    ['المحرق', 'Muharraq'],
    ['الرفاع', 'Riffa'],
    ['مدينة حمد', 'Hamad Town'],
    ['مدينة عيسى', 'Isa Town'],
    ['سترة', 'Sitra'],
    ['الظهران', 'Dhahran'],
    ['الجبيل', 'Jubail'],
    ['مطار الدمام', 'Dammam Airport'],
    ['أبوظبي', 'Abu Dhabi'],
    ['الشارقة', 'Sharjah'],
    ['العين', 'Al Ain'],
    ['الدوحة', 'Doha'],
    ['الريان', 'Al Rayyan'],
    ['الوكرة', 'Al Wakrah'],
    ['مسقط', 'Muscat'],
    ['صلالة', 'Salalah'],
    ['صحار', 'Sohar'],
    ['البصرة', 'Basra'],
    ['بغداد', 'Baghdad'],
    ['النجف', 'Najaf'],
    ['مدينة الكويت', 'Kuwait City'],
    ['المنامة', 'Manama'],
    ['البحرين إلى السعودية', 'Bahrain to Saudi Arabia'],
    ['البحرين إلى الخبر', 'Bahrain to Khobar'],
    ['البحرين إلى الدمام', 'Bahrain to Dammam'],
    ['البحرين إلى الرياض', 'Bahrain to Riyadh'],
    ['البحرين إلى الكويت', 'Bahrain to Kuwait'],
    ['البحرين إلى الإمارات', 'Bahrain to UAE'],
    ['البحرين إلى دبي', 'Bahrain to Dubai'],
    ['البحرين إلى قطر', 'Bahrain to Qatar'],
    ['البحرين إلى عمان', 'Bahrain to Oman'],
    ['البحرين إلى العراق', 'Bahrain to Iraq'],
    ['السعودية إلى البحرين', 'Saudi Arabia to Bahrain'],
    ['الخبر إلى البحرين', 'Khobar to Bahrain'],
    ['الدمام إلى البحرين', 'Dammam to Bahrain'],
    ['الرياض إلى البحرين', 'Riyadh to Bahrain'],
    ['النقل البحريني والسعودي ودول مجلس التعاون الخليجي', 'Bahrain, Saudi and GCC transport'],
    ['واجهة عربية واضحة ومهنية لرحلات الركاب وتوصيل الطرود والحجز المباشر عبر واتساب، مع ربط داخلي يساعد Google والزائر على الوصول إلى كل صفحة مناسبة.', 'A clear Arabic-first interface for passenger trips, parcel delivery, and direct WhatsApp booking, with internal linking that helps both Google and visitors reach the right page.'],
    ['ما الذي يغطيه هذا المشروع؟', 'What does this project cover?'],
    ['الصفحة الرئيسية تربط خدمات الركاب والطرود والوجهات الخليجية وصفحات السعودية إلى البحرين، لذلك هي نقطة دخول إلى المشروع كله وليست صفحة منفصلة فقط.', 'The homepage connects passenger services, parcel delivery, GCC destination pages, and Saudi-to-Bahrain pages, so it works as the main entry point for the whole project rather than a standalone page.'],
    ['مسارات العودة من السعودية إلى البحرين', 'Return routes from Saudi Arabia to Bahrain'],
    ['الخدمة ليست باتجاه واحد فقط، لذلك أضفنا صفحات مستقلة للطلبات التي تبدأ من السعودية وتعود إلى البحرين.', 'The service is not one-way only, so we added dedicated pages for requests that start in Saudi Arabia and return to Bahrain.'],
    ['الصفحة العامة للمسار العكسي مع ربط مباشر إلى الخبر والدمام والرياض.', 'The main reverse-route page with direct links to Khobar, Dammam, and Riyadh.'],
    ['صفحة محلية لطلبات الخبر إلى البحرين والعودة المباشرة.', 'A local page for Khobar-to-Bahrain requests and direct return trips.'],
    ['صفحة مخصصة للدمام إلى البحرين بنفس النسق البصري والحجز.', 'A dedicated Dammam-to-Bahrain page with the same visual style and booking flow.'],
    ['صفحة مستقلة للرحلات الأطول من الرياض إلى البحرين.', 'A dedicated page for longer Riyadh-to-Bahrain trips.'],
    ['اختر الخدمة والمنشأ والوجهة، ثم أرسل طلباً منظماً عبر الواتساب مع التفاصيل الأساسية جاهزة.', 'Choose the service, origin, and destination, then send a structured WhatsApp request with the main details prepared.'],
    ['يمكنك إضافة وصف مختصر للرحلة أو الموعد أو مكان الالتقاء.', 'You can add a short trip note, timing, or pickup location.'],
    ['إجابات قصيرة تساعد العميل على الوصول بسرعة إلى الصفحة والخدمة المناسبة.', 'Short answers help the customer reach the right page and service quickly.'],
    ['هل الصفحات الأخرى يجب حذفها؟', 'Should the other pages be deleted?'],
    ['لا. صفحات الخدمات والوجهات والتواصل ومن نحن كلها تخدم هذا المشروع، بينما الصفحات خارج هذا المجلد تخص بقية موقع Vendora ولا يجب حذفها بسبب هذا القسم.', 'No. The service, destination, contact, and about pages all support this project, while pages outside this folder belong to the wider Vendora site and should not be deleted because of this section.'],
    ['هل يوجد نقل من السعودية إلى البحرين أيضاً؟', 'Do you also offer transport from Saudi Arabia to Bahrain?'],
    ['نعم. أضفنا صفحات مستقلة للمسار العكسي من السعودية إلى البحرين، وكذلك صفحات الخبر والدمام والرياض إلى البحرين.', 'Yes. We added dedicated pages for the reverse route from Saudi Arabia to Bahrain, as well as Khobar-to-Bahrain, Dammam-to-Bahrain, and Riyadh-to-Bahrain pages.'],
    ['هل كل الصفحات مرتبطة ببعضها؟', 'Are all the pages linked together?'],
    ['نعم. الصفحة الرئيسية ومركز وجهات الخليج وصفحات الدول وصفحات السعودية إلى البحرين مرتبطة بروابط داخلية واضحة.', 'Yes. The homepage, GCC hub, country pages, and Saudi-to-Bahrain pages are connected through clear internal links.'],
    ['هذا المشروع يربط صفحات النقل بين البحرين والسعودية وبقية دول الخليج بروابط واضحة، ونموذج حجز سريع، ورسائل واتساب جاهزة لتسهيل الوصول إلى الخدمة.', 'This project links transport pages between Bahrain, Saudi Arabia, and the rest of the GCC with clear internal links, a fast booking form, and ready WhatsApp messages.'],
    ['كل صفحة ترتبط بالصفحات الأقرب لها حتى يبقى التنقل منطقياً وواضحاً للزائر ولمحركات البحث.', 'Each page links to the most relevant nearby pages so navigation stays logical and clear for both visitors and search engines.'],
    ['المشروع يشمل البحرين إلى السعودية والكويت والإمارات ودبي وقطر وعمان والعراق، مع مسارات عكسية من السعودية إلى البحرين.', 'The project covers Bahrain to Saudi Arabia, Kuwait, UAE, Dubai, Qatar, Oman, and Iraq, with reverse routes from Saudi Arabia to Bahrain as well.'],
    ['روابط المشروع', 'Project links'],
    ['صفحات مرتبطة', 'Related pages'],
    ['حول المشروع', 'About the project'],
    ['مشروع نقل وتوصيل عربي يربط البحرين والسعودية ودول الخليج بواجهة أوضح', 'An Arabic-first transport and delivery project connecting Bahrain, Saudi Arabia, and the GCC through a clearer interface.'],
    ['هدف المشروع هو تقديم صفحات خفيفة ومهنية تصل العميل بسرعة إلى الخدمة والوجهة ورسالة الحجز، مع بنية واضحة تساعد محركات البحث على فهم كل مسار.', 'The goal is to provide light, professional pages that quickly guide the customer to the service, destination, and booking message, with a clear structure that helps search engines understand each route.'],
    ['ما فائدة هذه الصفحة؟', 'What is this page for?'],
    ['صفحة من نحن تبني الثقة وتعطي سياقاً واضحاً عن المشروع وتدعم SEO للمستخدم الذي يريد فهم الخدمة قبل الحجز.', 'The about page builds trust, gives clear project context, and supports SEO for users who want to understand the service before booking.'],
    ['صفحات مهمة داخل المشروع', 'Important pages inside the project'],
    ['يمكنك الانتقال مباشرة من صفحة من نحن إلى أهم صفحات الحجز والخدمات.', 'You can move directly from the about page to the most important booking and service pages.'],
    ['نقطة الدخول الأساسية للمشروع بالكامل.', 'The main entry point for the whole project.'],
    ['مركز يربط الدول والصفحات مع بعضها.', 'A hub that connects the countries and pages together.'],
    ['صفحة المسار العكسي للطلبات القادمة من السعودية.', 'The reverse-route page for requests coming from Saudi Arabia.'],
    ['تواصل مباشر', 'Direct contact'],
    ['تواصل معنا للحجز أو الاستفسار عن النقل والتوصيل بين البحرين ودول الخليج', 'Contact us for booking or inquiries about transport and delivery between Bahrain and GCC destinations.'],
    ['هذه الصفحة مخصصة للوصول السريع إلى الواتساب مع روابط أوضح إلى الصفحات التي قد يحتاجها العميل قبل الحجز.', 'This page is designed for fast WhatsApp access with clearer links to the pages the customer may need before booking.'],
    ['متى أستخدم صفحة التواصل؟', 'When should I use the contact page?'],
    ['استخدمها عندما تريد استفساراً عاماً أو عندما لا تعرف بعد أي صفحة وجهة هي الأنسب لطلبك.', 'Use it when you want a general inquiry or when you are not yet sure which destination page best fits your request.'],
    ['ابدأ رسالة الحجز أو الاستفسار', 'Start a booking or inquiry message'],
    ['اختر المسار المبدئي والخدمة، ثم افتح واتساب مباشرة.', 'Choose the initial route and service, then open WhatsApp directly.'],
    ['خدمة الركاب', 'Passenger transport'],
    ['نقل الركاب بين البحرين والسعودية ودول الخليج بصفحة أوضح وحجز أسرع', 'Passenger transport between Bahrain, Saudi Arabia, and GCC destinations through a clearer page and faster booking.'],
    ['صفحة خدمة أساسية للرحلات الخاصة والعائلية والتنقل المباشر، مع ربط داخلي إلى الصفحات الأقرب للوجهة التي يريدها العميل.', 'A core service page for private trips, family travel, and direct transport, with internal links to the pages closest to the customer’s destination.'],
    ['ماذا تتضمن الخدمة؟', 'What does the service include?'],
    ['رحلات خاصة، تنقل عائلي، مشاوير مباشرة، استقبال من المطار، وحجوزات مرنة حسب الوجهة المطلوبة.', 'Private trips, family transport, direct rides, airport pickup, and flexible bookings based on the requested destination.'],
    ['صفحات مرتبطة بخدمة الركاب', 'Passenger service related pages'],
    ['هذه الصفحات تكمل خدمة الركاب بمسارات أوضح حسب الجهة المطلوبة.', 'These pages support the passenger service with clearer route targeting based on the requested destination.'],
    ['المسار الأكثر طلباً داخل خدمة الركاب.', 'The most requested route inside the passenger service.'],
    ['مركز ربط لبقية الدول الخليجية.', 'A hub linking the rest of the GCC destinations.'],
    ['المسار العكسي لطلبات العودة من السعودية.', 'The reverse route for return requests from Saudi Arabia.'],
    ['احجز خدمة نقل الركاب', 'Book passenger transport'],
    ['ابدأ الخدمة من البلد والمدينة المناسبة، ثم أرسل الطلب عبر الواتساب.', 'Start the service from the right country and city, then send the request through WhatsApp.'],
    ['خدمة الطرود', 'Parcel delivery'],
    ['توصيل الطرود والمستندات بين البحرين والسعودية ودول الخليج بواجهة واضحة', 'Parcel and document delivery between Bahrain, Saudi Arabia, and the GCC through a clearer interface.'],
    ['صفحة مخصصة للمستندات والأغراض الشخصية والطلبات الخفيفة، مع روابط داخلية إلى وجهات الخليج وصفحات السعودية.', 'A dedicated page for documents, personal items, and light requests, with internal links to GCC destinations and Saudi pages.'],
    ['متى أستخدم هذه الصفحة؟', 'When should I use this page?'],
    ['عندما يكون الطلب طرداً أو مستنداً أو غرضاً شخصياً، وتريد الوصول بسرعة إلى واتساب مع رسالة منظمة.', 'Use this page when the request is a parcel, document, or personal item and you want fast WhatsApp access with a structured message.'],
    ['صفحات مرتبطة بخدمة الطرود', 'Parcel service related pages'],
    ['يمكنك الانتقال من خدمة الطرود إلى الوجهة المناسبة مباشرة.', 'You can move directly from the parcel service to the appropriate destination page.'],
    ['صفحة المسار الأوضح للطرود بين البحرين والسعودية.', 'The clearest parcel route page between Bahrain and Saudi Arabia.'],
    ['صفحة مخصصة للطلبات إلى الكويت.', 'A dedicated page for requests going to Kuwait.'],
    ['مركز جميع الدول المرتبطة بالمشروع.', 'A hub for all countries linked inside the project.'],
    ['احجز توصيل الطرود', 'Book parcel delivery'],
    ['اختر الأصل والوجهة وأضف وصفاً مختصراً للطرد، ثم افتح واتساب مباشرة.', 'Choose the origin and destination, add a short parcel description, then open WhatsApp directly.'],
    ['وجهات الخليج من البحرين', 'GCC destinations from Bahrain'],
    ['صفحة مركزية لربط جميع وجهات الخليج من البحرين', 'A central page linking all GCC destinations from Bahrain.'],
    ['هذه الصفحة تجمع مسارات السعودية والكويت والإمارات ودبي وقطر وعمان والعراق، حتى ينتقل الزائر بسرعة من أي صفحة إلى الصفحة المناسبة.', 'This page gathers Saudi Arabia, Kuwait, UAE, Dubai, Qatar, Oman, and Iraq routes so the visitor can quickly move from any page to the right one.'],
    ['لماذا هذه الصفحة مهمة؟', 'Why is this page important?'],
    ['لأنها تعمل كحلقة وصل بين الصفحة الرئيسية وصفحات الدول وصفحات الخدمات، وتمنح Google والزائر مساراً أوضح بين جميع الصفحات المهمة.', 'It acts as a connecting hub between the homepage, country pages, and service pages, giving both Google and visitors a clearer path across the important pages.'],
    ['كل دولة مرتبطة مباشرة من هذه الصفحة، ويمكن استخدامها كنقطة بداية أو نقطة انتقال إلى بقية الصفحات.', 'Each country is linked directly from this page, and it can work as either a starting point or a navigation hub to the rest of the pages.'],
    ['الصفحة الرئيسية للسعودية مع روابط الخبر والدمام والرياض.', 'The main Saudi Arabia page with links to Khobar, Dammam, and Riyadh.'],
    ['صفحة مستقلة للكويت مع خدمة الركاب والطرود والحجز السريع.', 'A dedicated Kuwait page with passenger service, parcel delivery, and fast booking.'],
    ['بوابة الإمارات العامة مع ربط مباشر إلى دبي.', 'The general UAE gateway with a direct link to Dubai.'],
    ['صفحة مستقلة لمن يريد استهداف دبي مباشرة داخل الإمارات.', 'A dedicated page for users who want to target Dubai directly within the UAE.'],
    ['صفحة مخصصة لقطر والدوحة مع حجز مباشر.', 'A dedicated page for Qatar and Doha with direct booking.'],
    ['تغطية أوضح لمسقط والرحلات المرتبطة بعمان.', 'Clearer coverage for Muscat and Oman-related trips.'],
    ['صفحة مستقلة للعراق مع خدمة الركاب والطرود.', 'A dedicated Iraq page with passenger and parcel services.'],
    ['وجهات الخليج ترتبط أيضاً بمسارات العودة من السعودية إلى البحرين حتى لا يبقى الربط في اتجاه واحد فقط.', 'The GCC hub also links to Saudi-to-Bahrain return routes so the site is not linked in one direction only.'],
    ['الصفحة الرئيسية للمسار العكسي من السعودية إلى البحرين.', 'The main page for the reverse route from Saudi Arabia to Bahrain.'],
    ['صفحة محلية لطلبات الخبر إلى البحرين.', 'A local page for Khobar-to-Bahrain requests.'],
    ['صفحة مستقلة للدمام إلى البحرين بنفس أسلوب الحجز.', 'A dedicated Dammam-to-Bahrain page with the same booking style.'],
    ['صفحة أوضح للرحلات من الرياض إلى البحرين.', 'A clearer page for trips from Riyadh to Bahrain.'],
    ['ابدأ الحجز إلى أي وجهة خليجية', 'Start booking to any GCC destination'],
    ['اختر الخدمة والمنشأ والوجهة، ثم أرسل الطلب مباشرة إلى الواتساب.', 'Choose the service, origin, and destination, then send the request directly to WhatsApp.'],
    ['التوصيل من البحرين إلى الكويت بصفحة مستقلة وواضحة', 'Transport from Bahrain to Kuwait through a dedicated and clearer page.'],
    ['صفحة مخصصة للكويت داخل نفس مشروع النقل الخليجي، مناسبة للركاب والطرود والحجز السريع.', 'A dedicated Kuwait page inside the GCC transport project, suitable for passengers, parcels, and fast booking.'],
    ['كلمة مفتاحية أوضح', 'Clearer keyword focus'],
    ['هذه الصفحة تستهدف البحث المباشر عن البحرين إلى الكويت، مع ربط داخلي إلى مركز الوجهات والخدمات الأساسية.', 'This page targets direct Bahrain-to-Kuwait search with internal links to the destination hub and the core services.'],
    ['المركز الذي يجمع بقية الدول والصفحات.', 'The hub that gathers the rest of the countries and pages.'],
    ['صفحة الخدمة الأساسية للرحلات الخاصة والعائلية.', 'The core service page for private and family trips.'],
    ['صفحة مستقلة للطرود والمستندات.', 'A dedicated page for parcels and documents.'],
    ['احجز البحرين إلى الكويت', 'Book Bahrain to Kuwait'],
    ['التوصيل من البحرين إلى الإمارات بصفحة أوضح وروابط أدق', 'Transport from Bahrain to the UAE through a clearer page and more precise links.'],
    ['بوابة الإمارات العامة داخل المشروع، مع ربط مباشر إلى دبي وصفحات الخدمات الرئيسية.', 'The UAE gateway inside the project, with a direct link to Dubai and the core service pages.'],
    ['لماذا صفحة الإمارات؟', 'Why a UAE page?'],
    ['لأن بعض العملاء يبحث عن الإمارات بشكل عام وبعضهم يبحث مباشرة عن دبي. هذه الصفحة تربط الاتجاهين.', 'Some customers search for the UAE in general while others search for Dubai directly. This page connects both intents.'],
    ['صفحة مستقلة لمن يريد استهداف دبي مباشرة.', 'A dedicated page for people who want to target Dubai directly.'],
    ['الانتقال إلى بقية الوجهات من نفس المشروع.', 'Move to the rest of the destinations from the same project.'],
    ['خدمة الرحلات الخاصة والعائلية.', 'Private and family trip service.'],
    ['احجز البحرين إلى الإمارات', 'Book Bahrain to UAE'],
    ['التوصيل من البحرين إلى دبي بصفحة مركزة وواضحة', 'Transport from Bahrain to Dubai through a focused and clearer page.'],
    ['صفحة مخصصة للعميل الذي يريد دبي مباشرة، مع نموذج حجز سريع وروابط داخلية إلى الإمارات وبقية الخليج.', 'A dedicated page for customers targeting Dubai directly, with a fast booking form and internal links to the UAE and the rest of the GCC.'],
    ['استهداف أدق', 'More precise targeting'],
    ['عندما يبحث العميل عن دبي تحديداً فهذه الصفحة تكون أقرب لنواياه من صفحة الإمارات العامة.', 'When a customer searches specifically for Dubai, this page is closer to that intent than the general UAE page.'],
    ['البوابة العامة للإمارات داخل المشروع.', 'The general UAE gateway inside the project.'],
    ['صفحة مركزية لبقية الدول والخدمات.', 'A central page for the rest of the countries and services.'],
    ['إذا كان الطلب طرداً أو مستندات.', 'If the request is a parcel or documents.'],
    ['احجز البحرين إلى دبي', 'Book Bahrain to Dubai'],
    ['التوصيل من البحرين إلى قطر بصفحة أوضح للرحلات والحجز', 'Transport from Bahrain to Qatar through a clearer page for trips and booking.'],
    ['صفحة مستقلة لقطر والدوحة، مصممة للوصول السريع إلى الخدمة والواتساب دون ازدحام.', 'A dedicated Qatar and Doha page designed for fast access to the service and WhatsApp without clutter.'],
    ['صفحة قطر المستقلة', 'Dedicated Qatar page'],
    ['وجود صفحة مستقلة لقطر يجعل الكلمة المفتاحية أوضح ويقوي ربط الوجهة داخل المشروع الخليجي.', 'Having a dedicated Qatar page makes the keyword clearer and strengthens destination linking within the GCC project.'],
    ['مركز يربط بقية دول الخليج من نفس المشروع.', 'A hub linking the rest of the GCC destinations from the same project.'],
    ['صفحة الخدمة الأساسية للرحلات الخاصة.', 'The core service page for private trips.'],
    ['صفحة خاصة للطرود والمستندات.', 'A dedicated page for parcels and documents.'],
    ['احجز البحرين إلى قطر', 'Book Bahrain to Qatar'],
    ['التوصيل من البحرين إلى عمان بصفحة واضحة وخفيفة', 'Transport from Bahrain to Oman through a clear and lightweight page.'],
    ['صفحة مخصصة لعمان تشمل مسقط وتغطي الرحلات والطلبات المباشرة بروابط واضحة.', 'A dedicated Oman page covering Muscat and direct trip requests through clear links.'],
    ['تغطية أوضح', 'Clearer coverage'],
    ['وجود صفحة مستقلة لعمان يساعد في استهداف الرحلات والطلبات إلى مسقط وصلالة وصحار ضمن نفس النسق.', 'A dedicated Oman page helps target trips and requests to Muscat, Salalah, and Sohar within the same structure.'],
    ['مركز يربط بقية الدول والخدمات.', 'A hub linking the rest of the countries and services.'],
    ['صفحة الرحلات الخاصة والعائلية.', 'The private and family trips page.'],
    ['صفحة الطلبات الخفيفة والمستندات.', 'The light requests and documents page.'],
    ['احجز البحرين إلى عمان', 'Book Bahrain to Oman'],
    ['التوصيل من البحرين إلى العراق بصفحة مستقلة وواضحة', 'Transport from Bahrain to Iraq through a dedicated and clear page.'],
    ['صفحة مخصصة للعراق داخل نفس المشروع، مناسبة للركاب والطرود والحجز المباشر عبر واتساب.', 'A dedicated Iraq page inside the same project, suitable for passengers, parcels, and direct WhatsApp booking.'],
    ['ربط داخلي مهم', 'Important internal linking'],
    ['صفحة العراق مرتبطة بخدمات المشروع ومركز وجهات الخليج حتى لا تكون صفحة معزولة داخل البنية.', 'The Iraq page is linked to the project services and the GCC destinations hub so it does not remain isolated in the site structure.'],
    ['المركز الذي يربط بقية الدول والخدمات.', 'The hub that links the rest of the countries and services.'],
    ['صفحة الخدمة الأساسية للرحلات.', 'The core trips service page.'],
    ['احجز البحرين إلى العراق', 'Book Bahrain to Iraq'],
    ['المسار العكسي', 'Reverse route'],
    ['التوصيل والنقل من السعودية إلى البحرين بصفحة واضحة وحجز أسرع', 'Transport and delivery from Saudi Arabia to Bahrain through a clearer page and faster booking.'],
    ['صفحة مخصصة للمسار العكسي من السعودية إلى البحرين، مناسبة للعملاء الذين يبدأون من الخبر أو الدمام أو الرياض ويريدون الوصول إلى البحرين بخطوات مباشرة.', 'A dedicated reverse-route page for customers starting in Khobar, Dammam, or Riyadh and heading to Bahrain through direct steps.'],
    ['ربط مباشر بين صفحات الذهاب وصفحات العودة حتى يجد العميل الاتجاه المناسب بسرعة.', 'Direct links between outbound and return pages help the customer find the right direction quickly.'],
    ['لأن الخدمة ليست باتجاه واحد فقط. بعض الطلبات تبدأ من السعودية إلى البحرين، لذلك تحتاج هذه الرحلات إلى صفحات مستقلة وربط واضح مع بقية المسارات.', 'Because the service is not one-way only. Some requests start in Saudi Arabia and head to Bahrain, so these trips need dedicated pages and clear linking with the rest of the routes.'],
    ['روابط مفيدة', 'Useful links'],
    ['يمكنك الانتقال من هذه الصفحة إلى السعودية إلى البحرين أو إلى صفحة البحرين إلى الخبر حتى تعمل الروابط بين الاتجاهين بشكل طبيعي.', 'You can move from this page to Saudi Arabia to Bahrain or Bahrain to Khobar so both directions stay naturally linked.'],
    ['الصفحات المرتبطة', 'Linked pages'],
    ['ربط داخلي بين الاتجاه المحلي في الخبر والصفحات الأشمل داخل المشروع.', 'Internal linking between the local Khobar route and the broader pages inside the project.'],
    ['الصفحة العامة للعودة من السعودية إلى البحرين.', 'The general return page from Saudi Arabia to Bahrain.'],
    ['صفحة الاتجاه المقابل للربط بين الاتجاهين.', 'The opposite-direction page to connect both directions.'],
    ['صفحة مركزية تربط الوجهات والخدمات معاً.', 'A central page connecting destinations and services together.'],
    ['احجز من الخبر إلى البحرين', 'Book from Khobar to Bahrain'],
    ['ابدأ من الخبر واختر وجهتك داخل البحرين وسيتم إعداد رسالة الحجز مباشرة.', 'Start from Khobar, choose your destination inside Bahrain, and the booking message will be prepared directly.'],
    ['صفحة محلية مخصصة للخبر إلى البحرين مع نفس الواجهة ونفس طريقة الحجز الموجودة في بقية المشروع.', 'A local Khobar-to-Bahrain page with the same interface and booking approach used across the project.'],
    ['روابط العودة', 'Return links'],
    ['التوصيل من الدمام إلى البحرين بواجهة مرتبة وواضحة', 'Transport from Dammam to Bahrain through a clean and clear interface.'],
    ['صفحة مستقلة للمسار من الدمام إلى البحرين، مناسبة للرحلات المتكررة وللطلبات التي تحتاج تنسيقاً سريعاً وواضحاً.', 'A dedicated Dammam-to-Bahrain page for repeat trips and requests that need fast, clear coordination.'],
    ['الاتجاهان مرتبطان', 'Both directions are linked'],
    ['تم ربط الدمام إلى البحرين مع البحرين إلى الدمام ومع الصفحة العامة السعودية إلى البحرين لزيادة الوضوح والربط الداخلي.', 'Dammam to Bahrain is linked with Bahrain to Dammam and the general Saudi Arabia to Bahrain page for clearer internal linking.'],
    ['صفحات تكمل اتجاه البحث والحجز في الاتجاهين.', 'Pages that complete the search and booking intent in both directions.'],
    ['المسار العام من السعودية إلى البحرين.', 'The general route from Saudi Arabia to Bahrain.'],
    ['صفحة الاتجاه المقابل من البحرين إلى الدمام.', 'The opposite-direction page from Bahrain to Dammam.'],
    ['صفحة مركزية تربط جميع المسارات معاً.', 'A central page linking all routes together.'],
    ['احجز من الدمام إلى البحرين', 'Book from Dammam to Bahrain'],
    ['اختر الخدمة ونقطة الانطلاق ثم أرسل الطلب إلى الواتساب مباشرة.', 'Choose the service and starting point, then send the request to WhatsApp directly.'],
    ['صفحة مخصصة للدمام إلى البحرين بنفس النمط البصري والربط الداخلي الموجود في بقية صفحات النقل.', 'A Dammam-to-Bahrain page with the same visual style and internal linking used across the rest of the transport pages.'],
    ['الرحلات من الرياض إلى البحرين بصفحة أوضح للمسار الطويل', 'Trips from Riyadh to Bahrain through a clearer long-route page.'],
    ['صفحة مخصصة للمستخدم الذي يبدأ من الرياض ويحتاج مساراً واضحاً وخدمة مباشرة للوصول إلى البحرين مع حجز سريع عبر واتساب.', 'A dedicated page for users starting in Riyadh who need a clear route and direct service to Bahrain with fast WhatsApp booking.'],
    ['ربط داخلي أوضح', 'Clearer internal linking'],
    ['تربط هذه الصفحة بين الرياض إلى البحرين، والمسار العام من السعودية إلى البحرين، واتجاه البحرين إلى الرياض حتى تبقى تجربة التنقل بين الصفحات منطقية وواضحة.', 'This page links Riyadh to Bahrain, the general Saudi Arabia to Bahrain route, and Bahrain to Riyadh so navigation stays logical and clear.'],
    ['الصفحة العامة للمسار العكسي.', 'The main reverse-route page.'],
    ['صفحة الاتجاه المقابل من البحرين إلى الرياض.', 'The opposite-direction page from Bahrain to Riyadh.'],
    ['مركز ربط لبقية المسارات والخدمات.', 'A linking hub for the rest of the routes and services.'],
    ['احجز من الرياض إلى البحرين', 'Book from Riyadh to Bahrain'],
    ['اختر الخدمة ونقطة الانطلاق من الرياض ثم أرسل الطلب مباشرة إلى الواتساب.', 'Choose the service and starting point in Riyadh, then send the request directly to WhatsApp.'],
    ['صفحة مخصصة للرياض إلى البحرين ضمن نفس النسق البصري ونفس لغة الخدمة داخل المشروع.', 'A Riyadh-to-Bahrain page within the same visual style and service language used across the project.'],
    ['توصيل من البحرين إلى السعودية', 'Delivery from Bahrain to Saudi Arabia'],
    ['توصيل من البحرين إلى الكويت', 'Delivery from Bahrain to Kuwait'],
    ['توصيل من البحرين إلى الإمارات', 'Delivery from Bahrain to the UAE'],
    ['توصيل من البحرين إلى دبي', 'Delivery from Bahrain to Dubai'],
    ['توصيل من البحرين إلى قطر', 'Delivery from Bahrain to Qatar'],
    ['توصيل من البحرين إلى عمان', 'Delivery from Bahrain to Oman'],
    ['توصيل من البحرين إلى العراق', 'Delivery from Bahrain to Iraq'],
    ['توصيل من السعودية إلى البحرين', 'Delivery from Saudi Arabia to Bahrain'],
    ['توصيل من الخبر إلى البحرين', 'Delivery from Khobar to Bahrain'],
    ['توصيل من الدمام إلى البحرين', 'Delivery from Dammam to Bahrain'],
    ['توصيل من الرياض إلى البحرين', 'Delivery from Riyadh to Bahrain'],
    ['روابط مرتبطة', 'Related links'],
    ['صفحات تكمل اتجاه البحث والحجز في المشروع نفسه.', 'Pages that complete the search and booking intent within the same project.'],
    ['اختر الخدمة ونقطة الانطلاق والوجهة، ثم أرسل الطلب مباشرة إلى الواتساب.', 'Choose the service, start point, and destination, then send the request directly to WhatsApp.'],
    ['حولي', 'Hawalli'],
    ['الفروانية', 'Farwaniya'],
    ['نفس الأسلوب ونفس الحجز', 'Same style and same booking flow'],
    ['تستخدم هذه الصفحة نفس التصميم ونفس نموذج الحجز ونفس لغة الخدمة الموجودة في بقية صفحات المشروع.', 'This page uses the same design, booking form, and service language found across the rest of the project.'],
    ['المسارات المرتبطة من السعودية إلى البحرين', 'Related routes from Saudi Arabia to Bahrain'],
    ['يمكن استخدام هذه الصفحات للبحث المحلي أو كنقاط دخول مباشرة إلى الحجز من المدن السعودية الأكثر طلباً.', 'These pages can be used for local search or as direct entry points for booking from the most requested Saudi cities.'],
    ['الصفحة الرئيسية للمسار العكسي مع ربط واضح إلى المدن السعودية الأساسية.', 'The main reverse-route page with clear links to the key Saudi cities.'],
    ['صفحة مخصصة لطلبات الخبر والرحلات المتكررة والعودة المباشرة إلى البحرين.', 'A dedicated page for Khobar requests, repeat trips, and direct return journeys to Bahrain.'],
    ['صفحة واضحة للنقل من الدمام إلى البحرين مع تنسيق سريع عبر واتساب.', 'A clear Dammam-to-Bahrain transport page with fast WhatsApp coordination.'],
    ['صفحة مخصصة للرحلات الأطول من الرياض إلى البحرين مع خطوات أوضح.', 'A dedicated page for longer Riyadh-to-Bahrain trips with clearer steps.'],
    ['احجز من السعودية إلى البحرين', 'Book from Saudi Arabia to Bahrain'],
    ['اختر الخدمة ومدينة الانطلاق في السعودية ثم أرسل طلباً مرتباً إلى الواتساب مع الوجهة داخل البحرين.', 'Choose the service and the starting city in Saudi Arabia, then send an organized WhatsApp request with the destination inside Bahrain.'],
    ['يمكن كتابة تفاصيل الوصول إلى الجسر أو نقطة الالتقاء أو وصف مختصر للطرد.', 'You can add bridge-arrival details, the pickup point, or a short parcel note.'],
    ['المسار العكسي من السعودية إلى البحرين أصبح جزءاً مرتبطاً بالكامل من نفس مشروع النقل، بنفس اللغة ونفس التصميم ونفس طريقة الحجز.', 'The Saudi Arabia to Bahrain reverse route is now fully connected within the same transport project, with the same language, design, and booking approach.'],
    ['صفحات العودة', 'Return route pages'],
    ['الحجز من الخبر إلى البحرين بصفحة أخف وأكثر وضوحاً', 'Booking from Khobar to Bahrain through a lighter and clearer page.'],
    ['هذه الصفحة مخصصة للعملاء الذين يبدأون من الخبر ويريدون الوصول إلى البحرين من خلال تنسيق سريع وواضح عبر واتساب.', 'This page is designed for customers starting in Khobar who want to reach Bahrain through fast and clear WhatsApp coordination.'],
    ['النقل والتوصيل من البحرين إلى السعودية بصفحة رئيسية أوضح', 'Transport and delivery from Bahrain to Saudi Arabia through a clearer main page.'],
    ['هذه الصفحة هي المسار الرئيسي للطلبات المتجهة من البحرين إلى السعودية، وتربط المدن السعودية الأساسية والخدمات المرتبطة والمسارات العكسية.', 'This page is the main route for requests traveling from Bahrain to Saudi Arabia, connecting the key Saudi cities, related services, and reverse routes.'],
    ['لماذا هذه الصفحة أساسية؟', 'Why is this page essential?'],
    ['لأنها تجمع البحث العام عن البحرين إلى السعودية، ثم توزع الزائر إلى الخبر أو الدمام أو الرياض أو إلى صفحة العودة من السعودية إلى البحرين.', 'It captures the broad Bahrain-to-Saudi Arabia search intent, then guides visitors to Khobar, Dammam, Riyadh, or the return route page from Saudi Arabia to Bahrain.'],
    ['صفحة محلية للخبر والطلبات السريعة.', 'A focused Khobar page for local and fast requests.'],
    ['صفحة أوضح للدمام والمشاوير الخاصة.', 'A clearer Dammam page for direct rides and private trips.'],
    ['صفحة مستقلة للرحلات الأطول إلى الرياض.', 'A dedicated page for longer trips to Riyadh.'],
    ['المسار العكسي لنفس الخدمة.', 'The reverse route for the same service.'],
    ['الحجز من البحرين إلى الخبر بصفحة أخف وأكثر وضوحاً', 'Booking from Bahrain to Khobar through a lighter and clearer page.'],
    ['صفحة محلية للعميل الذي يستهدف الخبر مباشرة ويريد الوصول إلى الخدمة بسرعة مع نموذج حجز واضح.', 'A focused page for customers targeting Khobar directly and wanting to reach the service quickly through a clear booking form.'],
    ['روابط الاتجاهين', 'Two-way route links'],
    ['هذه الصفحة مرتبطة بالخبر إلى البحرين وبالصفحة العامة من البحرين إلى السعودية حتى يبقى التنقل بين الاتجاهين منطقياً.', 'This page is linked to the Khobar-to-Bahrain page and the general Bahrain-to-Saudi Arabia page so navigation between both directions stays logical.'],
    ['المسار الرئيسي الذي يحتوي الخبر والدمام والرياض.', 'The main route page that includes Khobar, Dammam, and Riyadh.'],
    ['صفحة العودة من الخبر إلى البحرين.', 'The return page from Khobar to Bahrain.'],
    ['النقل والتوصيل من البحرين إلى الدمام بصفحة مستقلة وواضحة', 'Transport and delivery from Bahrain to Dammam through a dedicated and clear page.'],
    ['صفحة مخصصة للعميل الذي يريد الدمام مباشرة، مع حجز واتساب منظم وربط داخلي إلى الاتجاه المقابل.', 'A dedicated page for customers who want Dammam directly, with organized WhatsApp booking and internal links to the reverse direction.'],
    ['الدمام مرتبطة بالمسار العام من البحرين إلى السعودية، وكذلك بصفحة الدمام إلى البحرين حتى تغطي الصفحة الاتجاهين.', 'Dammam is linked to the general Bahrain-to-Saudi Arabia route and also to the Dammam-to-Bahrain page so the page covers both directions.'],
    ['الصفحة الرئيسية للمسار السعودي.', 'The main page for the Saudi route.'],
    ['صفحة الاتجاه العكسي من الدمام إلى البحرين.', 'The reverse-direction page from Dammam to Bahrain.'],
    ['رحلات البحرين إلى الرياض بصفحة أوضح للحجز والمسار الطويل', 'Bahrain to Riyadh trips through a clearer page for booking and long-distance travel.'],
    ['هذه الصفحة مناسبة للمشاوير الأطول إلى الرياض، مع ربط داخلي يساعد العميل على فهم الاتجاهين.', 'This page is designed for longer trips to Riyadh, with internal links that help the customer understand both directions.'],
    ['مسار أوضح', 'A clearer route'],
    ['الرياض صفحة مهمة لأنها تختلف عن الخبر والدمام من ناحية المسافة، لذلك لها صفحة مستقلة وربط واضح مع المسار العكسي.', 'Riyadh is an important page because it differs from Khobar and Dammam in travel distance, so it has a dedicated page and clear linking to the reverse route.'],
    ['الصفحة الرئيسية للمسار من البحرين إلى السعودية.', 'The main page for the Bahrain-to-Saudi Arabia route.'],
    ['صفحة الاتجاه المقابل من الرياض إلى البحرين.', 'The reverse-direction page from Riyadh to Bahrain.'],
    ['احجز Bahrain to Saudi Arabia', 'Book Bahrain to Saudi Arabia'],
    ['احجز Bahrain to Khobar', 'Book Bahrain to Khobar'],
    ['احجز Bahrain to Dammam', 'Book Bahrain to Dammam'],
    ['احجز Bahrain to Riyadh', 'Book Bahrain to Riyadh'],
    ['احجز البحرين إلى السعودية', 'Book Bahrain to Saudi Arabia'],
    ['احجز البحرين إلى الخبر', 'Book Bahrain to Khobar'],
    ['احجز البحرين إلى الدمام', 'Book Bahrain to Dammam'],
    ['احجز البحرين إلى الرياض', 'Book Bahrain to Riyadh'],
    ['الانتقال إلى بقية دول الخليج من نفس المشروع.', 'Navigate to the rest of the GCC destinations from the same project.'],
    ['الانتقال إلى بقية الوجهات والخدمات.', 'Navigate to the remaining destinations and services.'],
    ['مركز يربط بقية الوجهات والخدمات.', 'A hub that connects the remaining destinations and services.'],
    ['الاستقبال في المطار والتوصيل إليه', 'Airport pickup and drop-off'],
    ['رحلات عائلية', 'Family trips'],
    ['سائق خاص', 'Private driver'],
    ['خدمة توصيل الطرود', 'Parcel delivery service'],
    ['رحلات بين البحرين والوجهة المطلوبة', 'Trips from Bahrain to your destination'],
    ['رحلات بين البحرين والسعودية', 'Trips between Bahrain and Saudi Arabia'],
    ['رحلات بين البحرين و السعودية', 'Trips between Bahrain and Saudi Arabia'],
    ['Vendora Transport', 'Vendora Transport'],
    ['البحرين إلى السعودية ودول مجلس التعاون الخليجي', 'Bahrain to Saudi Arabia and GCC destinations'],
    ['البحرين إلى السعودية والكويت والإمارات وقطر وعمان والعراق', 'Bahrain to Saudi Arabia, Kuwait, UAE, Qatar, Oman, and Iraq'],
    ['خدمة نقل خاصة 24 ساعة من البحرين إلى السعودية ودول الخليج', 'Private transport service 24 hours a day from Bahrain to Saudi Arabia and the GCC'],
    ['من نحن: نقل خاص موثوق بين البحرين ودول الخليج', 'About us: trusted private transport between Bahrain and the GCC'],
    ['تواصل معنا لحجز النقل الخاص في أي وقت', 'Contact us to book private transport at any time'],
    ['دليل وجهات الخليج للحجز من البحرين', 'GCC destination guide for bookings from Bahrain'],
    ['خدمة نقل ركاب خاصة 24 ساعة بين البحرين ودول الخليج', 'Private passenger transport 24 hours a day between Bahrain and the GCC'],
    ['خدمة توصيل طرود بين البحرين والسعودية ودول الخليج', 'Parcel delivery between Bahrain, Saudi Arabia, and the GCC'],
    ['النقل من البحرين إلى الدمام', 'Private transport from Bahrain to Dammam'],
    ['حجز بري خاص من البحرين إلى دبي', 'Book private road transport from Bahrain to Dubai'],
    ['حجز نقل خاص من البحرين إلى العراق', 'Book private transport from Bahrain to Iraq'],
    ['النقل من البحرين إلى الخبر', 'Private transport from Bahrain to Khobar'],
    ['حجز نقل خاص من البحرين إلى الكويت', 'Book private transport from Bahrain to Kuwait'],
    ['حجز رحلة خاصة من البحرين إلى عمان', 'Book a private trip from Bahrain to Oman'],
    ['النقل من البحرين إلى قطر', 'Private transport from Bahrain to Qatar'],
    ['النقل من البحرين إلى الرياض', 'Private transport from Bahrain to Riyadh'],
    ['النقل من البحرين إلى السعودية', 'Private transport from Bahrain to Saudi Arabia'],
    ['حجز من البحرين إلى الإمارات (دبي وأبوظبي وغيرها)', 'Bookings from Bahrain to the UAE (Dubai, Abu Dhabi, and more)'],
    ['حجز عودة خاص من الدمام إلى البحرين', 'Book private return transport from Dammam to Bahrain'],
    ['حجز نقل خاص من الخبر إلى البحرين', 'Book private transport from Khobar to Bahrain'],
    ['حجز رحلة خاصة من الرياض إلى البحرين', 'Book a private trip from Riyadh to Bahrain'],
    ['حجز نقل خاص من السعودية إلى البحرين', 'Book private transport from Saudi Arabia to Bahrain'],
    ['مدة الطريق إلى الدمام عبر جسر الملك فهد', 'Road time to Dammam via the King Fahd Causeway'],
    ['مدة الرحلة من البحرين إلى الدمام', 'Trip duration from Bahrain to Dammam'],
    ['رحلات VIP يومية من البحرين إلى الدمام عبر جسر الملك فهد بسيارة GMC XL عائلية (حتى 7 ركاب) وSUV واسعة للركاب والنقل المؤسسي وتشغيل المطار (BAH / DMM) ونقل طرود خليجي، مع توصيل مباشر من الجفير أو السيف أو الفنادق وخيارات ذهاب وعودة مناسبة لتجديد التأشيرة.', 'Daily VIP trips from Bahrain to Dammam via the King Fahd Causeway in a GMC XL family vehicle (up to 7 passengers) and a spacious SUV for passengers, corporate transport, and airport runs (BAH / DMM), plus GCC parcel handoffs, with direct pickup from Juffair, Seef, or hotels and same-day return options suitable for visa renewals.'],
    ['الوقت المعتاد من 1 إلى 2 ساعة تقريباً بعد عبور جسر الملك فهد، لذلك يمكن ترتيب مشاوير نفس اليوم ذهاباً وعودة حسب جدولك أو رحلات مطار DMM.', 'The usual travel time is about 1 to 2 hours after crossing the King Fahd Causeway, so same-day return trips can be arranged to suit your schedule or DMM airport runs.'],
    ['المدة المتوقعة من البحرين إلى الدمام بعد جسر الملك فهد: 1 إلى 2 ساعة، مناسبة لتشغيل المطار أو النقل المؤسسي بنفس اليوم.', 'The expected duration from Bahrain to Dammam after the King Fahd Causeway is 1 to 2 hours, suitable for airport runs or corporate transport on the same day.'],
    ['يتوفر استقبال وتوصيل من وإلى مطار البحرين (BAH) ومطار الدمام (DMM) وبقية مطارات الخليج حسب الطلب.', 'Pickup and drop-off are available to and from Bahrain Airport (BAH), Dammam Airport (DMM), and other GCC airports on request.'],
    ['نقل خاص للركاب وتوصيل الطرود الصغيرة والمتوسطة التي تتسع داخل سيارة GMC XL أو SUV عائلية، بما يشمل نقل طرود خليجي داخل حدود السعة الآمنة.', 'Private passenger transport and small to medium parcels that fit inside a GMC XL or family SUV, including GCC parcel handoffs within safe capacity limits.'],
    ['سعة 6 إلى 7 ركاب في تكوين SUV عائلية مع مساحة أمتعة وحامل خلفي مناسب للأمتعة والطرود الصغيرة.', 'Seating for 6 to 7 passengers in a family SUV layout with luggage space and a rear rack suited to bags and small parcels.'],
    ['تفاصيل النقل الخاص من البحرين إلى الخبر', 'Private transport details from Bahrain to Khobar'],
    ['مراجعة مسار البحرين إلى الدمام', 'Review the Bahrain to Dammam route'],
    ['تفاصيل النقل الخاص من البحرين إلى الرياض', 'Private transport details from Bahrain to Riyadh'],
    ['تفاصيل النقل الخاص من البحرين إلى الدوحة', 'Private transport details from Bahrain to Doha'],
    ['يمكن الحجز قبل 1 إلى 3 ساعات، والخدمة متوفرة طوال اليوم، والحجز السريع عبر واتساب.', 'You can book 1 to 3 hours ahead, the service is available all day, and fast booking is available via WhatsApp.'],
    ['صفحات مرتبطة لمقارنة المسارات وحجز رحلة العودة.', 'Related pages to compare routes and book a return trip.'],
    ['الأسئلة الشائعة', 'Frequently asked questions'],
    ['أهم الأسئلة قبل الحجز إلى الدمام.', 'Key questions before booking to Dammam.'],
    ['هل الخدمة متوفرة 24 ساعة؟', 'Is the service available 24 hours a day?'],
    ['نعم، الخدمة متوفرة 24 ساعة و7 أيام في الأسبوع.', 'Yes, the service is available 24 hours a day, 7 days a week.'],
    ['كم تستغرق الرحلة؟', 'How long does the trip take?'],
    ['المدة المتوقعة من البحرين إلى الدمام: 1 إلى 2 ساعة.', 'Expected travel time from Bahrain to Dammam is 1 to 2 hours.'],
    ['هل يمكن نقل الأمتعة؟', 'Can luggage be transported?'],
    ['نعم، توجد مساحة أمتعة وحامل خلفي متاح حسب حجم الحمولة.', 'Yes, there is luggage space and a rear rack available depending on load size.'],
    ['هل يمكن الحجز في نفس اليوم؟', 'Can I book on the same day?'],
    ['نعم، ويمكن الحجز قبل 1 إلى 3 ساعات حسب وقت الرحلة.', 'Yes, and you can book 1 to 3 hours before the trip time.'],
    ['هل توجد خدمة توصيل من المطار؟', 'Is airport pickup available?'],
    ['نعم، يتوفر استقبال وتوصيل من وإلى جميع مطارات الخليج.', 'Yes, pickup and drop-off are available from and to all GCC airports.'],
    ['معلومات الحجز', 'Booking information'],
    ['موعد الحجز', 'Booking timing'],
    ['يفضّل إرسال الحجز قبل 1 إلى 3 ساعات من وقت الرحلة.', 'Prefer sending your booking 1 to 3 hours before trip time.'],
    ['تأكيد سريع', 'Fast confirmation'],
    ['أرسل نقطة الاستلام والوجهة وعدد الركاب عبر واتساب لتأكيد الطلب بسرعة.', 'Send pickup point, destination, and passenger count via WhatsApp to confirm quickly.'],
    ['روابط داخلية مفيدة', 'Useful internal links'],
    ['تفاصيل الوقت', 'Time details'],
    ['الوقت تقريبي ويتأثر بوقت الانطلاق وحركة الطريق ونقطة الاستلام.', 'Timing is approximate and depends on departure time, traffic, and pickup point.'],
    ['خدمة مطارات الخليج', 'GCC airport service'],
    ['تفاصيل الخدمة', 'Service details'],
    ['24 ساعة يومياً', '24 hours a day'],
    ['الخدمة متاحة 24 ساعة و7 أيام في الأسبوع.', 'The service is available 24 hours a day, 7 days a week.'],
    ['سيارة GMC / XL', 'GMC / XL vehicle'],
    ['من الباب إلى الباب', 'Door to door'],
    ['استلام من المنزل أو الفندق أو المطار أو المكتب.', 'Pickup from home, hotel, airport, or office.'],
    ['الدفع والعودة', 'Payment and return trips'],
    ['الدفع نقداً أو BenefitPay مع توفر رحلات ذهاب وعودة.', 'Cash or BenefitPay payment with round-trip options available.'],
    ['اختر الخدمة ونقطة الانطلاق والوجهة، ثم أرسل الطلب مباشرة إلى الواتساب.', 'Choose the service, pickup point, and destination, then send the request directly to WhatsApp.'],
    ['أضف الوقت أو عدد الركاب أو أي ملاحظة مفيدة.', 'Add the time, passenger count, or any useful note.'],
  ].sort((a, b) => b[0].length - a[0].length);
  const exactTranslations = new Map(translations.map(([ar, en]) => [ar.trim(), en]));

  const textNodeMap = new WeakMap();
  const attrMap = new WeakMap();
  const headOriginal = {
    cached: false,
    title: '',
    description: '',
    ogTitle: '',
    ogDescription: '',
    twitterTitle: '',
    twitterDescription: '',
  };

  function cacheHeadStrings() {
    if (headOriginal.cached) return;
    headOriginal.cached = true;
    headOriginal.title = document.title || '';
    const desc = document.querySelector('meta[name="description"]');
    headOriginal.description = desc ? desc.getAttribute('content') || '' : '';
    const ogT = document.querySelector('meta[property="og:title"]');
    headOriginal.ogTitle = ogT ? ogT.getAttribute('content') || '' : '';
    const ogD = document.querySelector('meta[property="og:description"]');
    headOriginal.ogDescription = ogD ? ogD.getAttribute('content') || '' : '';
    const twT = document.querySelector('meta[name="twitter:title"]');
    headOriginal.twitterTitle = twT ? twT.getAttribute('content') || '' : '';
    const twD = document.querySelector('meta[name="twitter:description"]');
    headOriginal.twitterDescription = twD ? twD.getAttribute('content') || '' : '';
  }

  function translateHeadStrings() {
    cacheHeadStrings();
    const useEn = state.lang === 'en';
    document.title = useEn ? translateString(headOriginal.title) : headOriginal.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', useEn ? translateString(headOriginal.description) : headOriginal.description);
    const ogT = document.querySelector('meta[property="og:title"]');
    if (ogT && headOriginal.ogTitle) ogT.setAttribute('content', useEn ? translateString(headOriginal.ogTitle) : headOriginal.ogTitle);
    const ogD = document.querySelector('meta[property="og:description"]');
    if (ogD && headOriginal.ogDescription) ogD.setAttribute('content', useEn ? translateString(headOriginal.ogDescription) : headOriginal.ogDescription);
    const twT = document.querySelector('meta[name="twitter:title"]');
    if (twT && headOriginal.twitterTitle) twT.setAttribute('content', useEn ? translateString(headOriginal.twitterTitle) : headOriginal.twitterTitle);
    const twD = document.querySelector('meta[name="twitter:description"]');
    if (twD && headOriginal.twitterDescription) twD.setAttribute('content', useEn ? translateString(headOriginal.twitterDescription) : headOriginal.twitterDescription);
  }

  const headerLabels = [
    { match: '/bahrain-saudi-gcc-transport/', ar: 'الرئيسية', en: 'Home' },
    { match: '/bahrain-saudi-gcc-transport/passenger-transport/', ar: 'نقل الركاب', en: 'Passenger transport' },
    { match: '/bahrain-saudi-gcc-transport/parcel-delivery/', ar: 'توصيل الطرود', en: 'Parcel delivery' },
    { match: '/bahrain-saudi-gcc-transport/gcc-destinations/', ar: 'وجهات الخليج', en: 'GCC destinations' },
    { match: '/bahrain-saudi-gcc-transport/contact/', ar: 'تواصل معنا', en: 'Contact' },
    { match: '/bahrain-saudi-gcc-transport/about/', ar: 'من نحن', en: 'About' },
  ];

  const countryFlags = {
    'البحرين': 'bh',
    'السعودية': 'sa',
    'المملكة العربية السعودية': 'sa',
    'الكويت': 'kw',
    'الإمارات': 'ae',
    'الإمارات العربية المتحدة': 'ae',
    'دبي': 'ae',
    'قطر': 'qa',
    'عمان': 'om',
    'العراق': 'iq',
  };

  const locations = {
    'البحرين': ['المنامة', 'المحرق', 'الرفاع', 'مدينة حمد', 'مدينة عيسى', 'سترة'],
    'المملكة العربية السعودية': ['الخبر', 'الدمام', 'الرياض', 'الظهران', 'الجبيل', 'مطار الدمام'],
    'الكويت': ['مدينة الكويت', 'حولي', 'الفروانية'],
    'الإمارات العربية المتحدة': ['دبي', 'أبوظبي', 'الشارقة', 'العين'],
    'قطر': ['الدوحة', 'الريان', 'الوكرة'],
    'عمان': ['مسقط', 'صلالة', 'صحار'],
    'العراق': ['البصرة', 'بغداد', 'النجف'],
  };

  const serviceOptions = [
    'نقل الركاب',
    'خدمة توصيل الطرود',
    'سائق خاص',
    'رحلات عائلية',
    'الاستقبال في المطار والتوصيل إليه',
    'رحلات بين البحرين والوجهة المطلوبة',
  ];

  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function injectStructuredData() {
    if (document.querySelector('script[type="application/ld+json"][data-vendora-schema]')) {
      return;
    }
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const pageUrl = canonicalEl?.href || window.location.href;
    const title = document.title || 'Vendora Transport';
    const descMeta = document.querySelector('meta[name="description"]');
    const description = descMeta?.getAttribute('content') || '';

    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': 'https://getvendora.net/bahrain-saudi-gcc-transport/#website',
          name: 'Vendora Transport',
          url: 'https://getvendora.net/bahrain-saudi-gcc-transport/',
          inLanguage: ['ar', 'en'],
          publisher: { '@id': 'https://getvendora.net/bahrain-saudi-gcc-transport/#org' },
        },
        {
          '@type': 'Organization',
          '@id': 'https://getvendora.net/bahrain-saudi-gcc-transport/#org',
          name: 'Vendora Transport',
          url: 'https://getvendora.net/bahrain-saudi-gcc-transport/',
          telephone: '+973-3322-5954',
          areaServed: ['BH', 'SA', 'KW', 'AE', 'QA', 'OM', 'IQ'],
        },
        {
          '@type': 'WebPage',
          '@id': `${pageUrl}#webpage`,
          url: pageUrl,
          name: title,
          description,
          isPartOf: { '@id': 'https://getvendora.net/bahrain-saudi-gcc-transport/#website' },
          inLanguage: document.documentElement.lang || 'ar',
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-vendora-schema', '');
    script.textContent = JSON.stringify(graph);
    document.head.appendChild(script);
  }

  function toWhatsApp(message) {
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  }

  function translateString(value) {
    const source = `${value || ''}`;
    const normalized = source.replace(/\s+/g, ' ').trim();
    if (!normalized || !/[\u0600-\u06FF]/.test(normalized)) {
      return source;
    }

    if (exactTranslations.has(normalized)) {
      return exactTranslations.get(normalized);
    }

    // Longest Arabic phrases first so route names and full sentences win over short tokens.
    let output = normalized;
    for (let i = 0; i < translations.length; i++) {
      const ar = translations[i][0].trim();
      const en = translations[i][1];
      if (!ar) continue;
      output = output.split(ar).join(en);
      if (!/[\u0600-\u06FF]/.test(output)) break;
    }
    return output;
  }

  function syncStaticUi() {
    document.querySelectorAll('.nav-link').forEach((link, index) => {
      const href = link.getAttribute('href') || '';
      const item = headerLabels[index] || headerLabels.find((entry) => href === entry.match);
      if (item) {
        link.setAttribute('href', item.match);
        link.textContent = state.lang === 'en' ? item.en : item.ar;
      }
    });

    const brandSub = document.querySelector('.brand-sub');
    if (brandSub) {
      brandSub.textContent = state.lang === 'en'
        ? 'Bahrain to Saudi Arabia and GCC destinations'
        : 'البحرين إلى السعودية ودول مجلس التعاون الخليجي';
    }
  }

  function setStaticLinks() {
    document.querySelectorAll('[data-wa-message]').forEach((link) => {
      const message = link.getAttribute('data-wa-message') || defaultArabicMessage;
      link.href = toWhatsApp(message);
      link.target = '_blank';
      link.rel = 'noopener';
    });
  }

  function getCurrentDepth() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const match = path.match(/bahrain-saudi-gcc-transport\/(.*)$/);
    if (!match || !match[1] || match[1].endsWith('index.html')) {
      const clean = (match && match[1]) ? match[1].replace(/index\.html$/, '') : '';
      return clean ? clean.split('/').filter(Boolean).length : 0;
    }
    return match[1].split('/').filter(Boolean).length;
  }

  function makeRelativeToRoot(targetPath) {
    const depth = getCurrentDepth();
    const prefix = depth === 0 ? './' : '../'.repeat(depth);
    if (!targetPath) {
      return `${prefix}index.html`;
    }
    return `${prefix}${targetPath.replace(/\/$/, '')}/index.html`;
  }

  function normalizeInternalLinks() {
    const anchors = document.querySelectorAll('a[href]');
    anchors.forEach((anchor) => {
      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('http') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      if (window.location.protocol === 'file:') {
        if (rawHref.startsWith(siteSegment)) {
          const clean = rawHref.slice(siteSegment.length).replace(/^\/+/, '');
          anchor.setAttribute('href', makeRelativeToRoot(clean));
          return;
        }
        if (rawHref.startsWith('/') && rawHref.includes(siteSegment)) {
          const clean = rawHref.split(siteSegment)[1] || '';
          anchor.setAttribute('href', makeRelativeToRoot(clean));
          return;
        }
      }
    });
  }

  function injectFlagImages() {
    document.querySelectorAll('.flag-emoji').forEach((node) => {
      const parentText = node.parentElement ? node.parentElement.textContent || '' : '';
      const match = Object.keys(countryFlags).find((country) => parentText.includes(country));
      if (!match || node.querySelector('img')) {
        return;
      }
      const img = document.createElement('img');
      img.className = 'flag-icon';
      img.loading = 'lazy';
      img.alt = match;
      img.src = `https://flagcdn.com/w40/${countryFlags[match]}.png`;
      node.textContent = '';
      node.appendChild(img);
    });
  }

  function setOptions(select, options, placeholder) {
    if (!select) return;
    const current = select.dataset.currentValue || select.value || '';
    select.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    options.forEach((option) => {
      const item = document.createElement('option');
      item.value = option;
      item.textContent = state.lang === 'en' ? translateString(option) : option;
      item.dataset.ar = option;
      if (option === current) item.selected = true;
      select.appendChild(item);
    });
  }

  function buildBookingSummary(data) {
    if (state.lang === 'en') {
      const parts = [];
      if (data.service) parts.push(`Service: ${translateString(data.service)}`);
      if (data.fromCountry || data.fromCity) parts.push(`From: ${translateString(data.fromCountry || '')}${data.fromCity ? ` - ${translateString(data.fromCity)}` : ''}`);
      if (data.toCountry || data.toCity) parts.push(`To: ${translateString(data.toCountry || '')}${data.toCity ? ` - ${translateString(data.toCity)}` : ''}`);
      return parts.join(' | ') || 'Choose the service, origin, and destination to prepare your WhatsApp request automatically.';
    }

    return [
      data.service && `الخدمة: ${data.service}`,
      (data.fromCountry || data.fromCity) && `الانطلاق: ${data.fromCountry || ''}${data.fromCity ? ` - ${data.fromCity}` : ''}`,
      (data.toCountry || data.toCity) && `الوجهة: ${data.toCountry || ''}${data.toCity ? ` - ${data.toCity}` : ''}`,
    ].filter(Boolean).join(' | ') || 'اختر الخدمة ونقطة الانطلاق والوجهة ليتم تجهيز رسالة واتساب تلقائياً.';
  }

  function buildWhatsAppMessage(data) {
    if (state.lang === 'en') {
      const lines = [
        'Hello, I would like to book through the website.',
        '',
        `Service: ${translateString(data.service || 'Not selected')}`,
        `From: ${translateString(data.fromCountry || 'Not selected')}${data.fromCity ? ` - ${translateString(data.fromCity)}` : ''}`,
        `To: ${translateString(data.toCountry || 'Not selected')}${data.toCity ? ` - ${translateString(data.toCity)}` : ''}`,
      ];
      if (data.notes) lines.push(`Extra details: ${data.notes}`);
      lines.push(`Page URL: ${pageUrl}`);
      return lines.join('\n');
    }

    const lines = [
      'السلام عليكم، أريد الحجز عن طريق الموقع.',
      '',
      `نوع الخدمة: ${data.service || 'غير محدد'}`,
      `من: ${data.fromCountry || 'غير محدد'}${data.fromCity ? ` - ${data.fromCity}` : ''}`,
      `إلى: ${data.toCountry || 'غير محدد'}${data.toCity ? ` - ${data.toCity}` : ''}`,
    ];
    if (data.notes) lines.push(`تفاصيل إضافية: ${data.notes}`);
    lines.push(`رابط الصفحة: ${pageUrl}`);
    return lines.join('\n');
  }

  function setupForms() {
    document.querySelectorAll('[data-booking-form]').forEach((form) => {
      const service = form.querySelector('[data-booking="service"]');
      const fromCountry = form.querySelector('[data-booking="from-country"]');
      const fromCity = form.querySelector('[data-booking="from-city"]');
      const toCountry = form.querySelector('[data-booking="to-country"]');
      const toCity = form.querySelector('[data-booking="to-city"]');
      const notes = form.querySelector('[data-booking="notes"]');
      const submit = form.querySelector('[data-booking-submit]');
      const summary = form.querySelector('[data-booking-summary]');

      service.dataset.currentValue = form.dataset.defaultService || service.dataset.currentValue || '';
      fromCountry.dataset.currentValue = form.dataset.defaultFromCountry || fromCountry.dataset.currentValue || '';
      toCountry.dataset.currentValue = form.dataset.defaultToCountry || toCountry.dataset.currentValue || '';

      setOptions(service, serviceOptions, state.lang === 'en' ? 'Choose service type' : 'اختر نوع الخدمة');
      setOptions(fromCountry, Object.keys(locations), state.lang === 'en' ? 'Choose country' : 'اختر البلد');
      setOptions(toCountry, Object.keys(locations), state.lang === 'en' ? 'Choose country' : 'اختر البلد');

      fromCity.dataset.currentValue = form.dataset.defaultFromCity || fromCity.dataset.currentValue || '';
      toCity.dataset.currentValue = form.dataset.defaultToCity || toCity.dataset.currentValue || '';
      setOptions(fromCity, locations[fromCountry.value] || [], state.lang === 'en' ? 'Choose city' : 'اختر المدينة');
      setOptions(toCity, locations[toCountry.value] || [], state.lang === 'en' ? 'Choose city' : 'اختر المدينة');

      notes.placeholder = state.lang === 'en'
        ? 'Add the estimated time or any useful note for the booking.'
        : 'أضف الوقت التقريبي أو أي ملاحظة تساعدنا في ترتيب الخدمة.';

      const update = () => {
        const data = {
          service: service.value,
          fromCountry: fromCountry.value,
          fromCity: fromCity.value,
          toCountry: toCountry.value,
          toCity: toCity.value,
          notes: notes.value.trim(),
        };
        submit.href = toWhatsApp(buildWhatsAppMessage(data));
        summary.textContent = buildBookingSummary(data);
      };

      if (form.dataset.bookingReady !== 'true') {
        fromCountry.addEventListener('change', () => {
          fromCity.dataset.currentValue = '';
          setOptions(fromCity, locations[fromCountry.value] || [], state.lang === 'en' ? 'Choose city' : 'اختر المدينة');
          update();
        });

        toCountry.addEventListener('change', () => {
          toCity.dataset.currentValue = '';
          setOptions(toCity, locations[toCountry.value] || [], state.lang === 'en' ? 'Choose city' : 'اختر المدينة');
          update();
        });

        [service, fromCity, toCity, notes].forEach((field) => {
          field.addEventListener('change', update);
          field.addEventListener('input', update);
        });

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          submit.click();
        });

        form.dataset.bookingReady = 'true';
      }

      update();
    });
  }

  function insertLanguageToggle() {
    const quickLinks = document.querySelector('.quick-links');
    if (!quickLinks || quickLinks.querySelector('.lang-toggle')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lang-toggle';
    button.setAttribute('data-language-toggle', '');
    button.setAttribute('aria-label', 'Language toggle');
    button.innerHTML = '<i data-lucide="languages"></i><span></span>';
    button.addEventListener('click', () => {
      state.lang = state.lang === 'ar' ? 'en' : 'ar';
      localStorage.setItem('vendora_lang', state.lang);
      applyLanguage();
    });
    quickLinks.appendChild(button);
  }

  function translateTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (!textNodeMap.has(node)) textNodeMap.set(node, node.nodeValue);
      const original = textNodeMap.get(node);
      node.nodeValue = state.lang === 'en' ? translateString(original) : original;
    });
  }

  function translateAttributes() {
    document.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
      if (!attrMap.has(element)) {
        attrMap.set(element, {
          placeholder: element.getAttribute('placeholder'),
          title: element.getAttribute('title'),
          ariaLabel: element.getAttribute('aria-label'),
        });
      }
      const original = attrMap.get(element);
      if (original.placeholder !== null) element.setAttribute('placeholder', state.lang === 'en' ? translateString(original.placeholder) : original.placeholder);
      if (original.title !== null) element.setAttribute('title', state.lang === 'en' ? translateString(original.title) : original.title);
      if (original.ariaLabel !== null) element.setAttribute('aria-label', state.lang === 'en' ? translateString(original.ariaLabel) : original.ariaLabel);
    });
  }

  function applyLanguage() {
    document.body.classList.toggle('lang-en', state.lang === 'en');
    document.documentElement.lang = state.lang === 'en' ? 'en' : 'ar';
    document.documentElement.dir = state.lang === 'en' ? 'ltr' : 'rtl';
    syncStaticUi();
    translateHeadStrings();
    translateTextNodes();
    translateAttributes();
    const toggle = document.querySelector('.lang-toggle span');
    if (toggle) toggle.textContent = state.lang === 'en' ? 'AR' : 'EN';
    setupForms();
    normalizeInternalLinks();
    injectFlagImages();
    renderIcons();
  }

  function init() {
    normalizeInternalLinks();
    injectStructuredData();
    setStaticLinks();
    insertLanguageToggle();
    setupForms();
    injectFlagImages();
    applyLanguage();
    renderIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
