import os

ar_page = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html'
en_page = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html'

def patch_file(path, replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return False
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original_len = len(content)
    
    for target, replacement in replacements:
        if target not in content:
            print(f"TARGET NOT FOUND in {path}:")
            print(repr(target[:200]))
            return False
        content = content.replace(target, replacement)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Successfully patched {path}. Size changed from {original_len} to {len(content)}")
    return True

# --- ENGLISH REPLACEMENTS ---
en_replacements = [
    # 1. Causeway paragraph update to include Jesr app
    (
        '''          <h2>King Fahd Causeway taxi & border transfers</h2>
          <p>When booking a King Fahd Causeway taxi or cross-border transfer, factor in Causeway wait times, border timing, and bridge tolls. Drivers can help coordinate same-day return trips or visa run / U-turn transit when available. Travel documents and border clearances remain the passenger's sole responsibility.</p>''',
        '''          <h2>King Fahd Causeway taxi & border transfers</h2>
          <p>When booking a King Fahd Causeway taxi or cross-border transfer, factor in Causeway wait times (which can be checked via the Jesr app), border timing, and bridge tolls. Drivers can help coordinate same-day return trips or visa run / U-turn transit when available. Travel documents and border clearances remain the passenger's sole responsibility.</p>'''
    ),
    # 2. FAQ Schema Update
    (
        '''      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Do you publish fixed prices here?",
            "acceptedAnswer": { "@type": "Answer", "text": "No. This page uses request-quote placeholders until an approved pricing table is provided." }
          },
          {
            "@type": "Question",
            "name": "How much is private transport or a taxi fare from Bahrain to Dammam or Khobar?",
            "acceptedAnswer": { "@type": "Answer", "text": "There is no fixed transport cost published here. Private driver prices depend on route, vehicle type, and luggage. You can request a WhatsApp quote." }
          },
          {
            "@type": "Question",
            "name": "Do you guarantee border or visa approval?",
            "acceptedAnswer": { "@type": "Answer", "text": "No. Border approval, visa approval and official travel procedures cannot be guaranteed. Passengers are responsible for their documents and requirements." }
          },
          {
            "@type": "Question",
            "name": "Can I request a same-day return?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, you can request it. Quote and availability depend on route, waiting time and return timing." }
          },
          {
            "@type": "Question",
            "name": "When should I leave for an airport trip?",
            "acceptedAnswer": { "@type": "Answer", "text": "Send the flight number and required arrival or departure time. Routes that cross borders need extra time for road, Causeway or official procedures." }
          },
          {
            "@type": "Question",
            "name": "Can I book a 7-seater or GMC Yukon for family travel?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. Large SUVs and 7-seater vehicles (GMC Yukon or equivalent, depending on vehicle availability) can be coordinated for family transfers." }
          },
          {
            "@type": "Question",
            "name": "What should I send on WhatsApp?",
            "acceptedAnswer": { "@type": "Answer", "text": "Send pickup point, destination, date, time, passengers, luggage and flight number if the trip is airport-related." }
          },
          {
            "@type": "Question",
            "name": "Do you coordinate transport to Dhahran, Jubail, Qatif, Hofuf or Al Ahsa?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, we coordinate private car with driver services to Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, and Abqaiq." }
          },
          {
            "@type": "Question",
            "name": "Can you deliver documents or parcels?",
            "acceptedAnswer": { "@type": "Answer", "text": "Parcel and document delivery can be requested depending on item type, route and timing. Details must be confirmed first." }
          },
          {
            "@type": "Question",
            "name": "Does this replace the route pages?",
            "acceptedAnswer": { "@type": "Answer", "text": "No. This is the master guide. Route pages remain useful for exact city, airport and country details." }
          },
          {
            "@type": "Question",
            "name": "Which vehicle size should I request?",
            "acceptedAnswer": { "@type": "Answer", "text": "Share passenger count, luggage, children, trip length and comfort needs so the vehicle request can be coordinated properly." }
          },
          {
            "@type": "Question",
            "name": "Can I request a same-day return or Causeway U-turn? Are tolls included?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, same-day returns and visa run U-turns can be coordinated. We specify in your WhatsApp quote whether bridge tolls are included." }
          }
        ]
      }''',
        '''      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How much is private transport from Bahrain to Dammam or Khobar?",
            "acceptedAnswer": { "@type": "Answer", "text": "There is no fixed taxi fare or transport cost published here. The private driver price depends on route, vehicle type, and luggage. You can request a WhatsApp quote." }
          },
          {
            "@type": "Question",
            "name": "Can I book a private driver from Bahrain to Saudi Arabia?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. You can book a professional private driver with a private car or chauffeur service, ensuring you keep the same car across the border." }
          },
          {
            "@type": "Question",
            "name": "Do you provide transport to Dhahran, Jubail, Qatif, Hofuf or Al Ahsa?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. We coordinate passenger transport and corporate causeway transfers to Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, and Abqaiq." }
          },
          {
            "@type": "Question",
            "name": "Can I book a 7-seater or GMC Yukon for family travel?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, large family SUVs like a 7-seater GMC Yukon or equivalent can be booked depending on availability for family transfers with a child seat." }
          },
          {
            "@type": "Question",
            "name": "Can I request a same-day return or Causeway U-turn?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. We coordinate same-day returns for visa run transport or a quick Causeway U-turn for travel document renewals." }
          },
          {
            "@type": "Question",
            "name": "Are bridge tolls, waiting time, or airport pickup included in the quote?",
            "acceptedAnswer": { "@type": "Answer", "text": "When we send your quote by WhatsApp, we specify whether bridge tolls, Causeway wait time, and airport pickup fees are included." }
          }
        ]
      }'''
    ),
    # 3. Visible FAQ Update
    (
        '''    <section class="section" id="faq">
      <div class="container">
        <div class="section-head"><span class="section-kicker">FAQs</span><h2>Important answers before requesting a quote</h2></div>
        <div class="grid-2">
          <div class="faq-group">
            <details><summary>Do you publish fixed prices here?</summary><p>No. This page uses request-quote placeholders until an approved pricing table is provided.</p></details>
            <details><summary>How much is private transport or a taxi fare from Bahrain to Dammam or Khobar?</summary><p>There is no fixed transport cost published here. Private driver prices depend on the exact pickup point (like Seef, Juffair, or Bahrain Airport), destination (such as a hotel in Khobar or corporate offices in Dammam), passenger count, and luggage. You can request a fixed quote by WhatsApp for your specific trip.</p></details>
            <details><summary>Do you guarantee border or visa approval?</summary><p>No. Border approval, visa approval and official travel procedures cannot be guaranteed. Passengers are responsible for their documents and requirements.</p></details>
            <details><summary>Can I request a same-day return?</summary><p>Yes, you can request it. Quote and availability depend on route, waiting time and return timing.</p></details>
            <details><summary>When should I leave for an airport trip?</summary><p>Send the flight number and required arrival or departure time. Routes that cross borders need extra time for road, Causeway or official procedures.</p></details>
            <details><summary>Can I book a 7-seater or GMC Yukon for family travel?</summary><p>Yes. Large SUVs and 7-seater family SUVs (such as a GMC Yukon or equivalent, depending on vehicle availability) can be coordinated to ensure plenty of luggage space for airport bags and comfortable family transfers.</p></details>
          </div>
          <div class="faq-group">
            <details><summary>What should I send on WhatsApp?</summary><p>Send pickup point, destination, date, time, passengers, luggage and flight number if the trip is airport-related.</p></details>
            <details><summary>Do you coordinate transport to Dhahran, Jubail, Qatif, Hofuf or Al Ahsa?</summary><p>Yes, we coordinate private car with driver services to all cities in the Eastern Province, including Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, Abqaiq, and Half Moon Bay, as well as Dammam Airport to Bahrain pickup services.</p></details>
            <details><summary>Can you deliver documents or parcels?</summary><p>Parcel and document delivery can be requested depending on item type, route and timing. Details must be confirmed first.</p></details>
            <details><summary>Does this replace the route pages?</summary><p>No. This is the master guide. Route pages remain useful for exact city, airport and country details.</p></details>
            <details><summary>Which vehicle size should I request?</summary><p>Share passenger count, luggage, children, trip length and comfort needs. GetVendora can then coordinate the right vehicle request instead of guessing from passenger count alone.</p></details>
            <details><summary>Can I request a same-day return or Causeway U-turn? Are tolls included?</summary><p>Yes, same-day return trips and Causeway U-turn transit for visa runs can be arranged. We will clarify in your WhatsApp quote whether bridge tolls and wait times are included in the final fare.</p></details>
          </div>
        </div>
      </div>
    </section>''',
        '''    <section class="section" id="faq">
      <div class="container">
        <div class="section-head"><span class="section-kicker">FAQs</span><h2>Important answers before requesting a quote</h2></div>
        <div class="grid-2">
          <div class="faq-group">
            <details><summary>How much is private transport from Bahrain to Dammam or Khobar?</summary><p>There is no fixed taxi fare or transport cost published here. The private driver price depends on the exact route, travel times, vehicle requirements, passenger count, and luggage. You can request a fixed quote by WhatsApp for your specific trip, whether it is a business transfer or a private taxi service.</p></details>
            <details><summary>Can I book a private driver from Bahrain to Saudi Arabia?</summary><p>Yes. You can book a professional private driver with a private car with driver or chauffeur service for a comfortable journey. This ensures that you have the same car across the border, rather than switching vehicles at the King Fahd Causeway.</p></details>
            <details><summary>Do you provide transport to Dhahran, Jubail, Qatif, Hofuf or Al Ahsa?</summary><p>Yes. We coordinate passenger transport and corporate causeway transfer services to Dhahran (including Aramco compounds and the Dhahran Aramco area), Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, Abqaiq, and Half Moon Bay.</p></details>
          </div>
          <div class="faq-group">
            <details><summary>Can I book a 7-seater or GMC Yukon for family travel?</summary><p>Yes, you can book a large family SUV like a 7-seater GMC Yukon or equivalent (depending on vehicle availability). These vehicles offer generous luggage space for all your airport bags, with a child seat or baby seat available upon request, ensuring a comfortable family transfer.</p></details>
            <details><summary>Can I request a same-day return or Causeway U-turn?</summary><p>Yes. We coordinate same-day return trips for visa run transport or a quick Causeway U-turn for travel document processing. These services are subject to vehicle and driver availability.</p></details>
            <details><summary>Are bridge tolls, waiting time, or airport pickup included in the quote?</summary><p>When we send your quote by WhatsApp, we will clarify whether bridge tolls, Causeway wait time, waiting time, and airport pickup fees are included. This ensures transparency for your cross-border taxi or chauffeur service.</p></details>
          </div>
        </div>
        <p class="notice" style="margin-top: 24px;">
          <strong>Note on WhatsApp requests:</strong> Our team coordinates many custom requests. You can ask for a cross-border chauffeur, a Causeway private car, a corporate causeway transfer, or a private taxi. We make sure you have the same car across the border. Whether you need a visa run transport, a visa U-turn trip, a Bahrain Airport to Khobar taxi transfer, or a Dammam Airport to Bahrain pickup, we coordinate it all responsibly.
        </p>
      </div>
    </section>'''
    )
]

# --- ARABIC REPLACEMENTS ---
ar_replacements = [
    # 1. FAQ Schema Update
    (
        '''      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "هل تعرض الصفحة أسعار ثابتة؟",
            "acceptedAnswer": { "@type": "Answer", "text": "لا. يتم استخدام طلب سعر فقط إلى أن يتم توفير جدول أسعار معتمد." }
          },
          {
            "@type": "Question",
            "name": "كم سعر التوصيل من البحرين إلى الدمام أو الخبر؟ وبكم مشوار البحرين الخبر؟",
            "acceptedAnswer": { "@type": "Answer", "text": "لا توجد أسعار ثابتة؛ يعتمد السعر على نقطة الاستلام، الوجهة، عدد الركاب، الشنط، وحجم السيارة. اطلب السعر عبر واتساب." }
          },
          {
            "@type": "Question",
            "name": "من المسؤول عن مستندات السفر؟",
            "acceptedAnswer": { "@type": "Answer", "text": "المسافر مسؤول عن الجواز أو الهوية أو التأشيرة أو أي مستندات مطلوبة للسفر." }
          },
          {
            "@type": "Question",
            "name": "هل يمكن طلب عودة في نفس اليوم؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم يمكن طلب العودة في نفس اليوم، لكن السعر والتوفر يعتمدان على المسار ووقت الانتظار وتوقيت الرجعة." }
          },
          {
            "@type": "Question",
            "name": "متى أنطلق لرحلة المطار؟",
            "acceptedAnswer": { "@type": "Answer", "text": "أرسل رقم الرحلة ووقت الوصول أو المغادرة المطلوب. الرحلات التي تعبر الحدود تحتاج وقتاً إضافياً للطريق أو الجسر أو الإجراءات الرسمية." }
          },
          {
            "@type": "Question",
            "name": "هل أقدر أطلب سيارة عائلية كبيرة أو جمس يوكن؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، نوفر خيارات عائلية واسعة (مثل جمس يوكن 7 مقاعد حسب التوفر) لتوفير مساحة كافية للشنط وحقائب السفر." }
          },
          {
            "@type": "Question",
            "name": "ما التفاصيل المطلوبة في واتساب؟",
            "acceptedAnswer": { "@type": "Answer", "text": "أرسل نقطة الانطلاق والوجهة والتاريخ والوقت وعدد الركاب وعدد الشنط ورقم الرحلة إذا كانت الرحلة للمطار." }
          },
          {
            "@type": "Question",
            "name": "هل يوجد توصيل إلى الظهران والجبيل والقطيف والأحساء؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، نوفر خدمات التوصيل والليموزين إلى الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، ورأس تنورة." }
          },
          {
            "@type": "Question",
            "name": "هل يمكن توصيل مستندات أو طرود؟",
            "acceptedAnswer": { "@type": "Answer", "text": "يمكن طلب توصيل المستندات أو الطرود حسب نوع الغرض والمسار والوقت، ويجب تأكيد التفاصيل أولاً." }
          },
          {
            "@type": "Question",
            "name": "هل الصفحة بديل عن صفحات المسارات؟",
            "acceptedAnswer": { "@type": "Answer", "text": "لا. هذه الصفحة دليل رئيسي يربط المسارات المهمة، بينما صفحات المسارات تعطي تفاصيل أكثر لكل اتجاه." }
          },
          {
            "@type": "Question",
            "name": "ما حجم السيارة المناسب؟",
            "acceptedAnswer": { "@type": "Answer", "text": "أرسل عدد الركاب والشنط والأطفال ومدة الطريق واحتياج الراحة حتى يتم تنسيق طلب السيارة المناسبة." }
          },
          {
            "@type": "Question",
            "name": "هل أقدر أطلب رجعة نفس اليوم أو يوتيرن الجسر؟ وهل رسوم الجسر تدخل في السعر؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، يمكن ترتيب رحلات العودة في نفس اليوم أو يوتيرن الجسر، ويتم توضيح رسوم الجسر والانتظار في تسعيرة الواتساب." }
          }
        ]
      }''',
        '''      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "كم سعر التوصيل من البحرين إلى الدمام أو الخبر؟",
            "acceptedAnswer": { "@type": "Answer", "text": "لا توجد أسعار ثابتة؛ يعتمد السعر على نقطة الاستلام، الوجهة، عدد الركاب، الشنط، وحجم السيارة. اطلب السعر عبر واتساب." }
          },
          {
            "@type": "Question",
            "name": "هل أقدر أحجز سائق خاص من البحرين إلى السعودية؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، يمكنك حجز سائق خاص أو سواق خاص من البحرين إلى السعودية، لضمان بقائك في نفس السيارة عبر الحدود وتنسيق ليموزين البحرين السعودية." }
          },
          {
            "@type": "Question",
            "name": "هل يوجد توصيل إلى الظهران والجبيل والقطيف والأحساء؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، نوفر خدمات التوصيل والليموزين إلى كافة مدن المنطقة الشرقية بالسعودية مثل الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، ورأس تنورة." }
          },
          {
            "@type": "Question",
            "name": "هل أقدر أطلب سيارة عائلية أو جمس يوكن؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، نوفر خيارات عائلية واسعة (مثل جمس يوكن 7 مقاعد حسب التوفر) لتوفير مساحة كافية للشنط وحقائب السفر الكبيرة." }
          },
          {
            "@type": "Question",
            "name": "هل أقدر أطلب رجعة نفس اليوم أو يوتيرن الجسر؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، يمكن ترتيب رحلات العودة في نفس اليوم أو يوتيرن الجسر لتجديد الفيزا وتعديل الوضع حسب توفر السيارات." }
          },
          {
            "@type": "Question",
            "name": "هل رسوم الجسر أو الانتظار أو المطار تدخل في السعر؟",
            "acceptedAnswer": { "@type": "Answer", "text": "عند طلب السعر وتنسيق الرحلة عبر واتساب، سنوضح لك ما إذا كانت رسوم عبور جسر الملك فهد وتكاليف الانتظار أو المطار مشمولة في التسعيرة." }
          }
        ]
      }'''
    ),
    # 2. Visible FAQ Update
    (
        '''    <section class="section" id="faq">
      <div class="container">
        <div class="section-head"><span class="section-kicker">الأسئلة الشائعة</span><h2>إجابات مهمة قبل طلب السعر</h2></div>
        <div class="grid-2">
          <div class="faq-group">
            <details><summary>هل يوجد سعر ثابت؟</summary><p>لا يوجد سعر ثابت منشور حالياً. يتم إرسال السعر بعد معرفة المسار والوقت وعدد الركاب والشنط ونوع الرحلة.</p></details>
            <details><summary>كم سعر التوصيل من البحرين إلى الدمام أو الخبر؟ وبكم مشوار البحرين الخبر؟</summary><p>لا توجد أسعار ثابتة؛ حيث يعتمد السعر على نقطة الاستلام الدقيقة (مثل السيف أو الجفير أو مطار البحرين)، والوجهة (سواء فندق بالخبر أو مجمع أرامكو بالظهران)، وعدد الركاب، وحقائب السفر. يمكنك طلب السعر عبر واتساب والحصول على عرض سريع بناءً على تفاصيل رحلتك.</p></details>
            <details><summary>هل تضمنون عبور الحدود أو التأشيرة؟</summary><p>لا. لا يمكن ضمان الموافقة الحدودية أو التأشيرة أو أي إجراء رسمي. المسافر مسؤول عن مستنداته ومتطلبات سفره.</p></details>
            <details><summary>هل يمكن الحجز لعودة في نفس اليوم؟</summary><p>نعم يمكن طلب ذلك، لكن السعر والتوفر يعتمدان على المسار ووقت الانتظار والعودة.</p></details>
            <details><summary>متى أنطلق لرحلة المطار؟</summary><p>أرسل رقم الرحلة ووقت الوصول أو المغادرة المطلوب. الرحلات التي تعبر الحدود تحتاج وقتاً إضافياً للطريق أو الجسر أو الإجراءات الرسمية.</p></details>
            <details><summary>هل أقدر أطلب سيارة عائلية كبيرة أو جمس يوكن؟</summary><p>نعم، نوفر خيارات سيارات عائلية واسعة (مثل جمس يوكن 7 مقاعد أو ما يعادلها حسب التوفر) لتوفير مساحة كافية للعائلات مع شنط وحقائب السفر الكبيرة. يرجى توضيح متطلباتك مثل كرسي أطفال عند الحجز.</p></details>
          </div>
          <div class="faq-group">
            <details><summary>ما التفاصيل المطلوبة في واتساب؟</summary><p>أرسل نقطة الانطلاق، الوجهة، التاريخ، الوقت، عدد الركاب، عدد الشنط، ورقم الرحلة إذا كانت الرحلة للمطار.</p></details>
            <details><summary>هل يوجد توصيل إلى الظهران، الجبيل، القطيف، الهفوف، أو الأحساء؟</summary><p>نعم، نقوم بتنسيق خدمات التوصيل والليموزين إلى كافة مدن المنطقة الشرقية بالسعودية (مثل الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، رأس تنورة، هاف مون) شاملةً رحلات التوصيل والاستقبال من مطار الدمام إلى البحرين.</p></details>
            <details><summary>هل يمكن توصيل مستندات أو طرود؟</summary><p>يمكن طلب توصيل مستندات أو طرود حسب نوع الغرض والمسار والوقت. يجب توضيح التفاصيل قبل القبول.</p></details>
            <details><summary>هل الصفحة بديل عن صفحات المسارات؟</summary><p>لا. هذه الصفحة دليل رئيسي يربط المسارات المهمة، بينما صفحات المسارات تعطي تفاصيل أكثر لكل اتجاه.</p></details>
            <details><summary>ما حجم السيارة المناسب؟</summary><p>أرسل عدد الركاب والشنط والأطفال ومدة الطريق واحتياج الراحة حتى يتم تنسيق طلب السيارة المناسبة بدل التخمين من عدد الركاب فقط.</p></details>
            <details><summary>هل أقدر أطلب رجعة نفس اليوم أو يوتيرن الجسر؟ وهل رسوم الجسر تدخل في السعر؟</summary><p>نعم، يمكن ترتيب رحلات العودة في نفس اليوم أو مشوار للجسر لتجديد الفيزا وتعديل الوضع (يوتيرن الجسر). عند طلب السعر، يتم توضيح ما إذا كانت رسوم عبور الجسر والانتظار مشمولة في التسعيرة لضمان الشفافية الكاملة.</p></details>
          </div>
        </div>
      </div>
    </section>''',
        '''    <section class="section" id="faq">
      <div class="container">
        <div class="section-head"><span class="section-kicker">الأسئلة الشائعة</span><h2>إجابات مهمة قبل طلب السعر</h2></div>
        <div class="grid-2">
          <div class="faq-group">
            <details><summary>كم سعر التوصيل من البحرين إلى الدمام أو الخبر؟</summary><p>لا توجد أسعار ثابتة؛ حيث يعتمد السعر على نقطة الاستلام الدقيقة (مثل السيف أو الجفير أو مطار البحرين)، والوجهة (سواء فندق بالخبر أو مجمع أرامكو بالظهران)، وعدد الركاب، وحقائب السفر. يمكنك طلب السعر عبر واتساب والحصول على عرض سريع بناءً على تفاصيل رحلتك.</p></details>
            <details><summary>هل أقدر أحجز سائق خاص من البحرين إلى السعودية؟</summary><p>نعم، يمكنك حجز سائق خاص أو سواق خاص من البحرين إلى السعودية لضمان بقائك في نفس السيارة عبر الحدود وتنسيق ليموزين البحرين السعودية لتجنب تغيير السيارات على جسر الملك فهد.</p></details>
            <details><summary>هل يوجد توصيل إلى الظهران والجبيل والقطيف والأحساء؟</summary><p>نعم، نقوم بتنسيق خدمات التوصيل والليموزين إلى كافة مدن المنطقة الشرقية بالسعودية (مثل الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، ورأس تنورة) شاملةً رحلات التوصيل والاستقبال من مطار الدمام إلى البحرين.</p></details>
          </div>
          <div class="faq-group">
            <details><summary>هل أقدر أطلب سيارة عائلية أو جمس يوكن؟</summary><p>نعم، نوفر خيارات سيارات عائلية واسعة (مثل جمس يوكن 7 مقاعد أو ما يعادلها حسب التوفر) لتوفير مساحة كافية للعائلات مع شنط وحقائب السفر الكبيرة. يرجى توضيح متطلباتك مثل مقعد أطفال عند الحجز.</p></details>
            <details><summary>هل أقدر أطلب رجعة نفس اليوم أو يوتيرن الجسر؟</summary><p>نعم، يمكن ترتيب رحلات العودة في نفس اليوم أو مشوار للجسر لتجديد الفيزا وتعديل الوضع (يوتيرن الجسر) حسب توفر السيارات والانتظار المطلوب.</p></details>
            <details><summary>هل رسوم الجسر أو الانتظار أو المطار تدخل في السعر؟</summary><p>عند طلب السعر عبر واتساب وتنسيق الرحلة، سنوضح لك ما إذا كانت رسوم عبور جسر الملك فهد وتكاليف الانتظار أو رسوم المطار مشمولة في التسعيرة لضمان الشفافية الكاملة.</p></details>
          </div>
        </div>
        <div class="notice" style="margin-top: 24px;">
          <p><strong>أمثلة على استفسارات واتساب الشائعة:</strong> نفهم جميع اللهجات الخليجية ونستقبل استفسارات مثل: «ابي توصيل للدمام»، «ابغى سواق للخبر»، «بكم التوصيل للدمام»، «جم سعر المشوار للخبر»، «ابي سيارة عائلية للسعودية»، «شلون احجز»، «شنو سعر التوصيل»، «يوتيرن الجسر»، أو «مشوار للجسر».</p>
          <p>سواء كنت تبحث عن نقل من البحرين إلى السعودية، سائق خاص من البحرين، ليموزين البحرين، توصيل مشاوير المنطقة الشرقية، سواق للجسر، نقل عائلي، نقل زوار، أو نقل الأربعين وكربلاء، فإننا نساعدك في تنسيق كافة التفاصيل.</p>
        </div>
      </div>
    </section>'''
    )
]

patch_file(en_page, en_replacements)
patch_file(ar_page, ar_replacements)
