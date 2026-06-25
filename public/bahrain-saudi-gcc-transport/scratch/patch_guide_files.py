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

# --- ARABIC REPLACEMENTS ---
ar_replacements = [
    # 1. H3/paragraph for Eastern Province cities (already run, but we keep it here to allow re-runs safely if content hasn't changed or if we run it)
    # Actually, the Arabic page is already patched! We don't need to patch it again unless we want to, but if we do, it might complain "target not found" since it's already updated.
    # To prevent errors if the Arabic file is already patched, let's check if it is. If it has the replacement already, we skip or verify it.
]

# Let's check if Arabic index.html already has the patched content:
with open(ar_page, 'r', encoding='utf-8') as f:
    ar_content = f.read()

if 'نوفر خدمة سائق خاص إلى الظهران' not in ar_content:
    ar_replacements = [
        (
            '<article class="card compact"><h3>مدن المنطقة الشرقية</h3><p>الظهران، الجبيل، القطيف، الهفوف والأحساء مسارات مهمة للعمل والعائلات والتنقل بين البحرين والسعودية.</p></article>',
            '<article class="card compact"><h3>مدن المنطقة الشرقية</h3><p>نوفر خدمة سائق خاص إلى الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، رأس تنورة، ومنطقة أرامكو، وهي مسارات مهمة للعمل والشركات والعائلات للتنقل بين البحرين والسعودية.</p></article>'
        ),
        (
            '''        <article class="card" id="saudi-causeway">
          <img src="../assets/images/gcc-route-map-bahrain-saudi-kuwait-qatar-uae-oman.webp" width="1672" height="941" alt="خريطة مسارات التوصيل الخاص بين البحرين والسعودية وقطر والكويت والإمارات وعمان" loading="lazy" decoding="async" />
          <h2>جسر الملك فهد والحدود</h2>
          <p>لرحلات البحرين والسعودية، يجب التخطيط لوقت الجسر والانتظار المحتمل. لا يمكن ضمان وقت العبور أو الموافقة الحدودية.</p>
          <a class="btn ghost" href="/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/">دليل الجسر</a>
        </article>''',
            '''        <article class="card" id="saudi-causeway">
          <img src="../assets/images/gcc-route-map-bahrain-saudi-kuwait-qatar-uae-oman.webp" width="1672" height="941" alt="خريطة مسارات التوصيل الخاص بين البحرين والسعودية وقطر والكويت والإمارات وعمان" loading="lazy" decoding="async" />
          <h2>تاكسي جسر الملك فهد والحدود</h2>
          <p>عند حجز تاكسي جسر الملك فهد، يجب التخطيط لزمن العبور ورسوم عبور الجسر والانتظار المحتمل. يمكن متابعة زحمة الجسر عبر تطبيق جسر، مع إمكانية تنسيق رحلات يوتيرن الجسر سريعة لتعديل الوضع وتجديد الفيزا أو رحلات العودة في نفس اليوم حسب التوفر. يرجى العلم بأن متطلبات السفر والوثائق الرسمية تقع تماماً على مسؤولية المسافر.</p>
          <a class="btn ghost" href="/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/">دليل الجسر</a>
        </article>'''
        ),
        (
            'alt="مساحة شنط وحقائب لرحلة خاصة بين دول الخليج"',
            'alt="حقائب سفر عائلية وسعة حقائب مطار الدمام والرياض في صندوق سيارة خاصة"'
        ),
        (
            'alt="حقائب سفر عائلية وعربة أطفال مرتبة في صندوق سيارة خاصة"',
            'alt="صندوق سيارة عائلية جمس يوكن 7 مقاعد واسعة للشنط وحقائب السفر"'
        ),
        (
            '''            <details><summary>هل يوجد سعر ثابت؟</summary><p>لا يوجد سعر ثابت منشور حالياً. يتم إرسال السعر بعد معرفة المسار والوقت وعدد الركاب والشنط ونوع الرحلة.</p></details>
            <details><summary>هل تضمنون عبور الحدود أو التأشيرة؟</summary><p>لا. لا يمكن ضمان الموافقة الحدودية أو التأشيرة أو أي إجراء رسمي. المسافر مسؤول عن مستنداته ومتطلبات سفره.</p></details>
            <details><summary>هل يمكن الحجز لعودة في نفس اليوم؟</summary><p>نعم يمكن طلب ذلك، لكن السعر والتوفر يعتمدان على المسار ووقت الانتظار والعودة.</p></details>
            <details><summary>متى أنطلق لرحلة المطار؟</summary><p>أرسل رقم الرحلة ووقت الوصول أو المغادرة المطلوب. الرحلات التي تعبر الحدود تحتاج وقتاً إضافياً للطريق أو الجسر أو الإجراءات الرسمية.</p></details>''',
            '''            <details><summary>هل يوجد سعر ثابت؟</summary><p>لا يوجد سعر ثابت منشور حالياً. يتم إرسال السعر بعد معرفة المسار والوقت وعدد الركاب والشنط ونوع الرحلة.</p></details>
            <details><summary>كم سعر التوصيل من البحرين إلى الدمام أو الخبر؟ وبكم مشوار البحرين الخبر؟</summary><p>لا توجد أسعار ثابتة؛ حيث يعتمد السعر على نقطة الاستلام الدقيقة (مثل السيف أو الجفير أو مطار البحرين)، والوجهة (سواء فندق بالخبر أو مجمع أرامكو بالظهران)، وعدد الركاب، وحقائب السفر. يمكنك طلب السعر عبر واتساب والحصول على عرض سريع بناءً على تفاصيل رحلتك.</p></details>
            <details><summary>هل تضمنون عبور الحدود أو التأشيرة؟</summary><p>لا. لا يمكن ضمان الموافقة الحدودية أو التأشيرة أو أي إجراء رسمي. المسافر مسؤول عن مستنداته ومتطلبات سفره.</p></details>
            <details><summary>هل يمكن الحجز لعودة في نفس اليوم؟</summary><p>نعم يمكن طلب ذلك، لكن السعر والتوفر يعتمدان على المسار ووقت الانتظار والعودة.</p></details>
            <details><summary>متى أنطلق لرحلة المطار؟</summary><p>أرسل رقم الرحلة ووقت الوصول أو المغادرة المطلوب. الرحلات التي تعبر الحدود تحتاج وقتاً إضافياً للطريق أو الجسر أو الإجراءات الرسمية.</p></details>
            <details><summary>هل أقدر أطلب سيارة عائلية كبيرة أو جمس يوكن؟</summary><p>نعم، نوفر خيارات سيارات عائلية واسعة (مثل جمس يوكن 7 مقاعد أو ما يعادلها حسب التوفر) لتوفير مساحة كافية للعائلات مع شنط وحقائب السفر الكبيرة. يرجى توضيح متطلباتك مثل كرسي أطفال عند الحجز.</p></details>'''
        ),
        (
            '''            <details><summary>ما التفاصيل المطلوبة في واتساب؟</summary><p>أرسل نقطة الانطلاق، الوجهة، التاريخ، الوقت، عدد الركاب، عدد الشنط، ورقم الرحلة إذا كانت الرحلة للمطار.</p></details>
            <details><summary>هل يمكن توصيل مستندات أو طرود؟</summary><p>يمكن طلب توصيل مستندات أو طرود حسب نوع الغرض والمسار والوقت. يجب توضيح التفاصيل قبل القبول.</p></details>
            <details><summary>هل الصفحة بديل عن صفحات المسارات؟</summary><p>لا. هذه الصفحة دليل رئيسي يربط المسارات المهمة، بينما صفحات المسارات تعطي تفاصيل أكثر لكل اتجاه.</p></details>
            <details><summary>ما حجم السيارة المناسب؟</summary><p>أرسل عدد الركاب والشنط والأطفال ومدة الطريق واحتياج الراحة حتى يتم تنسيق طلب السيارة المناسبة بدل التخمين من عدد الركاب فقط.</p></details>''',
            '''            <details><summary>ما التفاصيل المطلوبة في واتساب؟</summary><p>أرسل نقطة الانطلاق، الوجهة، التاريخ، الوقت، عدد الركاب، عدد الشنط، ورقم الرحلة إذا كانت الرحلة للمطار.</p></details>
            <details><summary>هل يوجد توصيل إلى الظهران، الجبيل، القطيف، الهفوف، أو الأحساء؟</summary><p>نعم، نقوم بتنسيق خدمات التوصيل والليموزين إلى كافة مدن المنطقة الشرقية بالسعودية (مثل الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، رأس تنورة، هاف مون) شاملةً رحلات التوصيل والاستقبال من مطار الدمام إلى البحرين.</p></details>
            <details><summary>هل يمكن توصيل مستندات أو طرود?</summary><p>يمكن طلب توصيل مستندات أو طرود حسب نوع الغرض والمسار والوقت. يجب توضيح التفاصيل قبل القبول.</p></details>
            <details><summary>هل الصفحة بديل عن صفحات المسارات؟</summary><p>لا. هذه الصفحة دليل رئيسي يربط المسارات المهمة، بينما صفحات المسارات تعطي تفاصيل أكثر لكل اتجاه.</p></details>
            <details><summary>ما حجم السيارة المناسب؟</summary><p>أرسل عدد الركاب والشنط والأطفال ومدة الطريق واحتياج الراحة حتى يتم تنسيق طلب السيارة المناسبة بدل التخمين من عدد الركاب فقط.</p></details>
            <details><summary>هل أقدر أطلب رجعة نفس اليوم أو يوتيرن الجسر؟ وهل رسوم الجسر تدخل في السعر؟</summary><p>نعم، يمكن ترتيب رحلات العودة في نفس اليوم أو مشوار للجسر لتجديد الفيزا وتعديل الوضع (يوتيرن الجسر). عند طلب السعر، يتم توضيح ما إذا كانت رسوم عبور الجسر والانتظار مشمولة في التسعيرة لضمان الشفافية الكاملة.</p></details>'''
        ),
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
            "name": "ما التفاصيل المطلوبة في واتساب؟",
            "acceptedAnswer": { "@type": "Answer", "text": "أرسل نقطة الانطلاق والوجهة والتاريخ والوقت وعدد الركاب وعدد الشنط ورقم الرحلة إذا كانت الرحلة للمطار." }
          },
          {
            "@type": "Question",
            "name": "هل يمكن توصيل مستندات أو طرود؟",
            "acceptedAnswer": { "@type": "Answer", "text": "يمكن طلب توصيل المستندات أو الطرود حسب نوع الغرض والمسار والوقت، ويجب تأكيد التفاصيل أولاً." }
          },
          {
            "@type": "Question",
            "name": "متى أنطلق لرحلة المطار؟",
            "acceptedAnswer": { "@type": "Answer", "text": "أرسل رقم الرحلة ووقت الوصول أو المغادرة المطلوب. الرحلات التي تعبر الحدود تحتاج وقتاً إضافياً للطريق أو الجسر أو الإجراءات الرسمية." }
          },
          {
            "@type": "Question",
            "name": "ما حجم السيارة المناسب؟",
            "acceptedAnswer": { "@type": "Answer", "text": "أرسل عدد الركاب والشنط والأطفال ومدة الطريق واحتياج الراحة حتى يتم تنسيق طلب السيارة المناسبة." }
          },
          {
            "@type": "Question",
            "name": "هل الصفحة بديل عن صفحات المسارات؟",
            "acceptedAnswer": { "@type": "Answer", "text": "لا. هذه الصفحة دليل رئيسي يربط المسارات المهمة، بينما صفحات المسارات تعطي تفاصيل أكثر لكل اتجاه." }
          }
        ]
      }''',
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
      }'''
        )
    ]

# --- ENGLISH REPLACEMENTS ---
en_replacements = [
    # 1. H3/paragraph for Eastern Province cities
    (
        '<article class="card compact"><h3>Eastern Province cities</h3><p>Dhahran, Jubail, Qatif, Hofuf and Al Ahsa are important Saudi route entities for work, family and airport movement.</p></article>',
        '<article class="card compact"><h3>Eastern Province cities</h3><p>We provide private driver and chauffeur services to Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, Abqaiq, and the Aramco / Dhahran area, covering hotel and corporate compounds between Bahrain and Saudi Arabia.</p></article>'
    ),
    # 2. Causeway Section Update
    (
        '''        <article class="card" id="saudi-causeway">
          <img src="../../assets/images/gcc-route-map-bahrain-saudi-kuwait-qatar-uae-oman.webp" width="1672" height="941" alt="GCC route map for Bahrain Saudi Qatar Kuwait UAE and Oman private transport" loading="lazy" decoding="async" />
          <h2>King Fahd Causeway and borders</h2>
          <p>For Bahrain and Saudi Arabia routes, plan for Causeway timing and possible waiting. Border approval and exact crossing time cannot be guaranteed.</p>
          <a class="btn ghost" href="/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/">Causeway guide</a>
        </article>''',
        '''        <article class="card" id="saudi-causeway">
          <img src="../../assets/images/gcc-route-map-bahrain-saudi-kuwait-qatar-uae-oman.webp" width="1672" height="941" alt="GCC route map for Bahrain Saudi Qatar Kuwait UAE and Oman private transport" loading="lazy" decoding="async" />
          <h2>King Fahd Causeway taxi & border transfers</h2>
          <p>When booking a King Fahd Causeway taxi or cross-border transfer, factor in Causeway wait times, border timing, and bridge tolls. Drivers can help coordinate same-day return trips or visa run / U-turn transit when available. Travel documents and border clearances remain the passenger's sole responsibility.</p>
          <a class="btn ghost" href="/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/">Causeway guide</a>
        </article>'''
    ),
    # 3. Image alts updates
    (
        'alt="Luggage space for private GCC transport trips"',
        'alt="Large luggage space in family SUV for Dammam and Riyadh airport transfers"'
    ),
    (
        'alt="Family suitcases and stroller organized in private transfer trunk"',
        'alt="7-seater GMC Yukon family SUV trunk with suitcases organized for airport transfers"'
    ),
    # 4. FAQ Section column 1 update
    (
        '''            <details><summary>Do you publish fixed prices here?</summary><p>No. This page uses request-quote placeholders until an approved pricing table is provided.</p></details>
            <details><summary>Do you guarantee border or visa approval?</summary><p>No. Border approval, visa approval and official travel procedures cannot be guaranteed. Passengers are responsible for their documents and requirements.</p></details>
            <details><summary>Can I request a same-day return?</summary><p>Yes, you can request it. Quote and availability depend on route, waiting time and return timing.</p></details>
            <details><summary>When should I leave for an airport trip?</summary><p>Send the flight number and required arrival or departure time. Routes that cross borders need extra time for road, Causeway or official procedures.</p></details>''',
        '''            <details><summary>Do you publish fixed prices here?</summary><p>No. This page uses request-quote placeholders until an approved pricing table is provided.</p></details>
            <details><summary>How much is private transport or a taxi fare from Bahrain to Dammam or Khobar?</summary><p>There is no fixed transport cost published here. Private driver prices depend on the exact pickup point (like Seef, Juffair, or Bahrain Airport), destination (such as a hotel in Khobar or corporate offices in Dammam), passenger count, and luggage. You can request a fixed quote by WhatsApp for your specific trip.</p></details>
            <details><summary>Do you guarantee border or visa approval?</summary><p>No. Border approval, visa approval and official travel procedures cannot be guaranteed. Passengers are responsible for their documents and requirements.</p></details>
            <details><summary>Can I request a same-day return?</summary><p>Yes, you can request it. Quote and availability depend on route, waiting time and return timing.</p></details>
            <details><summary>When should I leave for an airport trip?</summary><p>Send the flight number and required arrival or departure time. Routes that cross borders need extra time for road, Causeway or official procedures.</p></details>
            <details><summary>Can I book a 7-seater or GMC Yukon for family travel?</summary><p>Yes. Large SUVs and 7-seater family SUVs (such as a GMC Yukon or equivalent, depending on vehicle availability) can be coordinated to ensure plenty of luggage space for airport bags and comfortable family transfers.</p></details>'''
    ),
    # 5. FAQ Section column 2 update
    (
        '''            <details><summary>What should I send on WhatsApp?</summary><p>Send pickup point, destination, date, time, passengers, luggage and flight number if the trip is airport-related.</p></details>
            <details><summary>Can you deliver documents or parcels?</summary><p>Parcel and document delivery can be requested depending on item type, route and timing. Details must be confirmed first.</p></details>
            <details><summary>Does this replace the route pages?</summary><p>No. This is the master guide. Route pages remain useful for exact city, airport and country details.</p></details>
            <details><summary>Which vehicle size should I request?</summary><p>Share passenger count, luggage, children, trip length and comfort needs. GetVendora can then coordinate the right vehicle request instead of guessing from passenger count alone.</p></details>''',
        '''            <details><summary>What should I send on WhatsApp?</summary><p>Send pickup point, destination, date, time, passengers, luggage and flight number if the trip is airport-related.</p></details>
            <details><summary>Do you coordinate transport to Dhahran, Jubail, Qatif, Hofuf or Al Ahsa?</summary><p>Yes, we coordinate private car with driver services to all cities in the Eastern Province, including Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, Abqaiq, and Half Moon Bay, as well as Dammam Airport to Bahrain pickup services.</p></details>
            <details><summary>Can you deliver documents or parcels?</summary><p>Parcel and document delivery can be requested depending on item type, route and timing. Details must be confirmed first.</p></details>
            <details><summary>Does this replace the route pages?</summary><p>No. This is the master guide. Route pages remain useful for exact city, airport and country details.</p></details>
            <details><summary>Which vehicle size should I request?</summary><p>Share passenger count, luggage, children, trip length and comfort needs. GetVendora can then coordinate the right vehicle request instead of guessing from passenger count alone.</p></details>
            <details><summary>Can I request a same-day return or Causeway U-turn? Are tolls included?</summary><p>Yes, same-day return trips and Causeway U-turn transit for visa runs can be arranged. We will clarify in your WhatsApp quote whether bridge tolls and wait times are included in the final fare.</p></details>'''
    ),
    # 6. Schema updates (FAQ list in Graph)
    (
        '''      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Does this page show fixed prices?",
            "acceptedAnswer": { "@type": "Answer", "text": "No. The page uses quote request placeholders until an approved pricing table is provided." }
          },
          {
            "@type": "Question",
            "name": "Who is responsible for travel documents?",
            "acceptedAnswer": { "@type": "Answer", "text": "Passengers are responsible for passports, IDs, visas, and any travel documents required for their journey." }
          },
          {
            "@type": "Question",
            "name": "Can I request a same-day return?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, same-day return trips can be requested. Quote and availability depend on the route, waiting time and return timing." }
          },
          {
            "@type": "Question",
            "name": "What should I send on WhatsApp?",
            "acceptedAnswer": { "@type": "Answer", "text": "Send pickup point, destination, date, time, passengers, luggage and flight number if the trip is airport-related." }
          },
          {
            "@type": "Question",
            "name": "Can GetVendora deliver documents or parcels?",
            "acceptedAnswer": { "@type": "Answer", "text": "Parcel and document delivery can be requested depending on item type, route and timing. Details must be confirmed first." }
          },
          {
            "@type": "Question",
            "name": "When should I leave for an airport trip?",
            "acceptedAnswer": { "@type": "Answer", "text": "Send the flight number and required arrival or departure time. Routes that cross borders need extra time for road, Causeway or official procedures." }
          },
          {
            "@type": "Question",
            "name": "Which vehicle size should I request?",
            "acceptedAnswer": { "@type": "Answer", "text": "Share passenger count, luggage, children, trip length and comfort needs so the vehicle request can be coordinated properly." }
          },
          {
            "@type": "Question",
            "name": "Does this replace the route pages?",
            "acceptedAnswer": { "@type": "Answer", "text": "No. This master guide links to route pages that remain useful for exact city, airport and country details." }
          }
        ]
      }''',
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
      }'''
    )
]

patch_file(ar_page, ar_replacements)
patch_file(en_page, en_replacements)
