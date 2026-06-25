import os

ar_page = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html'
en_page = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html'

def replace_lead_paragraph(html_content, new_lead_html):
    start_idx = html_content.find('<p class="lead">')
    if start_idx == -1:
        print("Lead paragraph start not found")
        return None
    end_idx = html_content.find('</p>', start_idx)
    if end_idx == -1:
        print("Lead paragraph end not found")
        return None
    return html_content[:start_idx] + new_lead_html + html_content[end_idx + len('</p>'):]

def replace_field_help(html_content, new_help_html):
    # Locate class="field-help"
    idx = html_content.find('class="field-help"')
    if idx == -1:
        print("field-help class not found")
        return None
    # Go back to find opening tag
    open_tag_idx = html_content.rfind('<', 0, idx)
    if open_tag_idx == -1:
        print("field-help open tag not found")
        return None
    # Find matching closing tag (we know it is a </p> tag in both files)
    close_tag = '</p>'
    close_tag_idx = html_content.find(close_tag, idx)
    if close_tag_idx == -1:
        print(f"field-help closing tag {close_tag} not found")
        return None
    
    end_idx = close_tag_idx + len(close_tag)
    return html_content[:open_tag_idx] + new_help_html + html_content[end_idx:]

def replace_section(html_content, section_id, new_section_html):
    start_idx = html_content.find(f'id="{section_id}"')
    if start_idx == -1:
        start_idx = html_content.find(f"id='{section_id}'")
    if start_idx == -1:
        print(f"Section with id={section_id} not found")
        return None
        
    open_tag_idx = html_content.rfind('<section', 0, start_idx)
    if open_tag_idx == -1:
        print(f"Opening section tag for id={section_id} not found")
        return None
        
    close_tag_idx = html_content.find('</section>', start_idx)
    if close_tag_idx == -1:
        print(f"Closing section tag for id={section_id} not found")
        return None
        
    end_idx = close_tag_idx + len('</section>')
    return html_content[:open_tag_idx] + new_section_html + html_content[end_idx:]

def replace_faq_schema(html_content, new_faq_schema_str):
    idx = html_content.find('"@type": "FAQPage"')
    if idx == -1:
        idx = html_content.find("'@type': 'FAQPage'")
    if idx == -1:
        print("Schema FAQPage type not found")
        return None
        
    open_brace_idx = html_content.rfind('{', 0, idx)
    if open_brace_idx == -1:
        print("Schema FAQPage opening brace not found")
        return None
        
    brace_count = 0
    close_brace_idx = -1
    for i in range(open_brace_idx, len(html_content)):
        if html_content[i] == '{':
            brace_count += 1
        elif html_content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                close_brace_idx = i
                break
                
    if close_brace_idx == -1:
        print("Schema FAQPage closing brace not found")
        return None
        
    return html_content[:open_brace_idx] + new_faq_schema_str + html_content[close_brace_idx+1:]

def process_file(path, is_english=True):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return False
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original_len = len(content)
    
    # 1. Lead paragraph replacement
    if is_english:
        new_lead = '<p class="lead">Plan private transport across Bahrain, Saudi Arabia, Qatar, Kuwait, UAE, Oman and Iraq. GetVendora is not just sending a random driver. GetVendora coordinates the journey details, confirms the pickup, reviews passenger/luggage information, and prepares the WhatsApp request clearly.</p>'
    else:
        new_lead = '<p class="lead">ننسق رحلتك بين البحرين والسعودية وقطر والكويت والإمارات وعمان والعراق. GetVendora لا تعطيك فقط رقم سواق. نحن ننسق تفاصيل الرحلة، وقت الاستلام، عدد الركاب، الشنط، المطار أو الجسر، ونؤكد الطلب عبر واتساب.</p>'
    
    content = replace_lead_paragraph(content, new_lead)
    if content is None:
        return False
        
    # 2. Field help (Common searches) replacement
    if is_english:
        new_help = '''            <div class="field-help" style="margin: 0 0 15px; font-size: 13px; color: var(--muted); line-height: 1.5; border-left: 2px solid var(--accent); padding-left: 10px;">
              <p style="margin: 0 0 5px;">* Select from popular GCC cities, airports and areas. If your location is not listed, choose Other and write it manually.</p>
              <p style="margin: 0; font-style: italic;"><strong>Common searches:</strong> Customers may ask for Bahrain to Dammam private taxi, Bahrain to Khobar driver, Dammam Airport to Bahrain transfer, or Saudi to Bahrain private car. If the exact area is not listed, choose Other and write the location.</p>
            </div>'''
    else:
        new_help = '''            <div class="field-help" style="margin: 0 0 15px; font-size: 13px; color: var(--muted); line-height: 1.5; border-right: 2px solid var(--accent); padding-right: 10px;">
              <p style="margin: 0 0 5px;">* اختر من بين مدن ومطارات ومناطق الخليج الشهيرة. إذا لم تجد موقعك، اختر أخرى واكتبه يدوياً.</p>
              <p style="margin: 0; font-style: italic;"><strong>عمليات البحث الشائعة:</strong> بعض العملاء يكتبون: ابي توصيل للدمام، ابغى سواق للخبر، بكم مشوار البحرين الدمام، أو توصيل مطار الدمام إلى البحرين. إذا لم تجد منطقتك، اختر أخرى واكتب الموقع بالتفصيل.</p>
            </div>'''
            
    content = replace_field_help(content, new_help)
    if content is None:
        return False
        
    # 3. Visible FAQ replacement
    if is_english:
        new_faq_section = '''    <section class="section" id="faq">
      <div class="container">
        <div class="section-head"><span class="section-kicker">FAQs</span><h2>Important answers before requesting a quote</h2></div>
        <div class="grid-2">
          <div class="faq-group">
            <details><summary>How much is private transport from Bahrain to Dammam or Khobar?</summary><p>There is no fixed taxi fare or transport cost published here. The private driver price depends on the exact route, travel times, vehicle requirements, passenger count, and luggage. You can request a fixed quote by WhatsApp for your specific trip, whether it is a business transfer or a private taxi service.</p></details>
            <details><summary>Can I book a private driver from Bahrain to Saudi Arabia?</summary><p>Yes. You can book a professional private driver with a private car with driver or chauffeur service for a comfortable journey. This ensures that you have the same car across the border, rather than switching vehicles at the King Fahd Causeway.</p></details>
            <details><summary>Do you provide transport to Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura or Abqaiq?</summary><p>Yes. We coordinate passenger transport and corporate causeway transfer services to Dhahran (including Aramco compounds and the Dhahran Aramco area), Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, and Abqaiq.</p></details>
            <details><summary>Can I book a 7-seater or GMC Yukon for family travel?</summary><p>Yes, you can book a large family SUV like a 7-seater GMC Yukon or equivalent (depending on vehicle availability). These vehicles offer generous luggage space for all your airport bags, with a child seat or baby seat available upon request, ensuring a comfortable family transfer.</p></details>
          </div>
          <div class="faq-group">
            <details><summary>Can I request a same-day return, visa run, or Causeway U-turn?</summary><p>Yes. We coordinate same-day return trips for visa run transport or a quick Causeway U-turn for travel document processing. These services are subject to vehicle and driver availability.</p></details>
            <details><summary>Are bridge tolls, waiting time, or airport pickup included in the quote?</summary><p>When we send your quote by WhatsApp, we will clarify whether bridge tolls, Causeway wait time, waiting time, and airport pickup fees are included. This ensures transparency for your cross-border taxi or chauffeur service.</p></details>
            <details><summary>Can I book Bahrain to Doha, Kuwait, Dubai, Abu Dhabi, Muscat, Najaf or Karbala?</summary><p>Yes. We coordinate long-distance GCC transport between Bahrain and Doha (Qatar), Kuwait City, Dubai or Abu Dhabi (UAE), Muscat (Oman), and Ziyarat routes to Najaf or Karbala (Iraq). Availability and travel cost depend on the route, timing, and vehicle choice.</p></details>
            <details><summary>Can I use WhatsApp to request a private driver or quote?</summary><p>Yes. You can easily use WhatsApp to request a quote or private driver. The route planner compiles your trip details (such as date, pickup/destination, passengers, and bags) into a structured request to make booking fast and straightforward.</p></details>
          </div>
        </div>
        <p class="notice" style="margin-top: 24px;">
          <strong>Note on WhatsApp requests:</strong> Our team coordinates many custom requests. You can ask for a cross-border chauffeur, a Causeway private car, a corporate causeway transfer, or a private taxi. We make sure you have the same car across the border. Whether you need a visa run transport, a visa U-turn trip, a Bahrain Airport to Khobar taxi transfer, or a Dammam Airport to Bahrain pickup, we coordinate it all responsibly.
        </p>
      </div>
    </section>'''
    else:
        new_faq_section = '''    <section class="section" id="faq">
      <div class="container">
        <div class="section-head"><span class="section-kicker">الأسئلة الشائعة</span><h2>إجابات مهمة قبل طلب السعر</h2></div>
        <div class="grid-2">
          <div class="faq-group">
            <details><summary>كم سعر التوصيل من البحرين إلى الدمام أو الخبر؟</summary><p>لا توجد أسعار ثابتة؛ تعتمد تكلفة التوصيل من البحرين إلى الدمام أو الخبر على نقطة الاستلام الدقيقة (مثل السيف أو الجفير أو مطار البحرين)، والوجهة، وعدد الركاب، والشنط. يمكنك طلب السعر عبر واتساب والحصول على عرض سريع بناءً على تفاصيل رحلتك.</p></details>
            <details><summary>هل أقدر أحجز سائق خاص من البحرين إلى السعودية؟</summary><p>نعم، يمكنك حجز سائق خاص أو سواق خاص من البحرين إلى السعودية لضمان بقائك في نفس السيارة عبر الحدود وتنسيق ليموزين البحرين السعودية لتجنب تغيير السيارات على جسر الملك فهد.</p></details>
            <details><summary>هل يوجد توصيل إلى الظهران والجبيل والقطيف والأحساء ورأس تنورة وبقيق؟</summary><p>نعم، نقوم بتنسيق خدمات التوصيل والليموزين إلى كافة مدن المنطقة الشرقية بالسعودية (مثل الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، ورأس تنورة) شاملةً رحلات التوصيل والاستقبال من مطار الدمام إلى البحرين.</p></details>
            <details><summary>هل أقدر أطلب سيارة عائلية أو جمس يوكن 7 مقاعد؟</summary><p>نعم، نوفر خيارات سيارات عائلية واسعة (مثل جمس يوكن 7 مقاعد أو ما يعادلها حسب التوفر) لتوفير مساحة كافية للعائلات مع شنط وحقائب السفر الكبيرة. يرجى توضيح متطلباتك مثل مقعد أطفال عند الحجز.</p></details>
          </div>
          <div class="faq-group">
            <details><summary>هل أقدر أطلب رجعة نفس اليوم أو يوتيرن الجسر؟</summary><p>نعم، يمكن ترتيب رحلات العودة في نفس اليوم أو رحلات سريعة لتجديد الفيزا وتعديل الوضع عبر الحدود (يوتيرن الجسر) حسب توفر السيارات والانتظار المطلوب.</p></details>
            <details><summary>هل رسوم الجسر أو الانتظار أو المطار تدخل في السعر؟</summary><p>عند طلب السعر وتنسيق الرحلة عبر واتساب، سنوضح لك ما إذا كانت رسوم عبور جسر الملك فهد وتكاليف الانتظار أو المطار مشمولة في التسعيرة لضمان الشفافية الكاملة.</p></details>
            <details><summary>هل يوجد توصيل من البحرين إلى قطر أو الكويت أو دبي أو أبوظبي أو مسقط أو النجف أو كربلاء؟</summary><p>نعم، نقوم بتنسيق رحلات طويلة بين البحرين وكافة دول الخليج والعراق، بما في ذلك الدوحة (قطر)، مدينة الكويت، دبي وأبوظبي (الإمارات)، مسقط (عمان)، والنجف وكربلاء (العراق) لرحلات الزيارة والعائلات.</p></details>
            <details><summary>هل أقدر أطلب السعر أو السائق عبر واتساب؟</summary><p>نعم، يمكنك طلب السعر أو حجز السائق مباشرة عبر واتساب. يقوم مخطط الرحلات بتجميع كافة تفاصيل رحلتك (الوجهة، التاريخ، الركاب، الشنط) في رسالة منظمة لتسهيل عملية التأكيد السريع.</p></details>
          </div>
        </div>
        <div class="notice" style="margin-top: 24px;">
          <p><strong>أمثلة على استفسارات واتساب الشائعة:</strong> نفهم جميع اللهجات الخليجية ونستقبل استفسارات مثل: «ابي توصيل للدمام»، «ابغى سواق للخبر»، «بكم التوصيل للدمام»، «جم سعر المشوار للخبر»، «ابي سيارة عائلية للسعودية»، «شلون احجز»، «شنو سعر التوصيل»، «يوتيرن الجسر»، أو «مشوار للجسر».</p>
          <p>سواء كنت تبحث عن نقل من البحرين إلى السعودية، سائق خاص من البحرين، ليموزين البحرين، توصيل مشاوير المنطقة الشرقية، سواق للجسر، نقل عائلي، نقل زوار، أو نقل الأربعين وكربلاء، فإننا نساعدك في تنسيق كافة التفاصيل.</p>
        </div>
      </div>
    </section>'''
    
    content = replace_section(content, "faq", new_faq_section)
    if content is None:
        return False
        
    # 4. Schema FAQ replacement
    if is_english:
        new_schema = '''      {
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
            "name": "Do you provide transport to Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura or Abqaiq?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. We coordinate passenger transport and corporate causeway transfers to Dhahran, Jubail, Qatif, Hofuf, Al Ahsa, Ras Tanura, and Abqaiq." }
          },
          {
            "@type": "Question",
            "name": "Can I book a 7-seater or GMC Yukon for family travel?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, large family SUVs like a 7-seater GMC Yukon or equivalent can be booked depending on availability for family transfers with a child seat." }
          },
          {
            "@type": "Question",
            "name": "Can I request a same-day return, visa run, or Causeway U-turn?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. We coordinate same-day returns for visa run transport or a quick Causeway U-turn for travel document renewals." }
          },
          {
            "@type": "Question",
            "name": "Are bridge tolls, waiting time, or airport pickup included in the quote?",
            "acceptedAnswer": { "@type": "Answer", "text": "When we send your quote by WhatsApp, we specify whether bridge tolls, Causeway wait time, and airport pickup fees are included." }
          },
          {
            "@type": "Question",
            "name": "Can I book Bahrain to Doha, Kuwait, Dubai, Abu Dhabi, Muscat, Najaf or Karbala?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes, we coordinate long-distance GCC transport between Bahrain and Qatar, Kuwait, UAE, Oman, and Iraq Ziyarat routes." }
          },
          {
            "@type": "Question",
            "name": "Can I use WhatsApp to request a private driver or quote?",
            "acceptedAnswer": { "@type": "Answer", "text": "Yes. You can easily use WhatsApp to request a quote or driver using the structured details compiled by the route planner." }
          }
        ]
      }'''
    else:
        new_schema = '''      {
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
            "name": "هل يوجد توصيل إلى الظهران والجبيل والقطيف والأحساء ورأس تنورة وبقيق؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، نوفر خدمات التوصيل والليموزين إلى كافة مدن المنطقة الشرقية بالسعودية مثل الظهران، الجبيل، القطيف، الهفوف، الأحساء، بقيق، ورأس تنورة." }
          },
          {
            "@type": "Question",
            "name": "هل أقدر أطلب سيارة عائلية أو جمس يوكن 7 مقاعد؟",
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
          },
          {
            "@type": "Question",
            "name": "هل يوجد توصيل من البحرين إلى قطر أو الكويت أو دبي أو أبوظبي أو مسقط أو النجف أو كربلاء؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، نقوم بتنسيق رحلات طويلة بين البحرين وكافة دول الخليج والعراق، بما في ذلك الدوحة، مدينة الكويت، دبي، أبوظبي، مسقط، والنجف وكربلاء." }
          },
          {
            "@type": "Question",
            "name": "هل أقدر أطلب السعر أو السائق عبر واتساب؟",
            "acceptedAnswer": { "@type": "Answer", "text": "نعم، يمكنك طلب السعر أو حجز السائق مباشرة عبر واتساب باستخدام التفاصيل المنظمة التي يجمعها مخطط الرحلات." }
          }
        ]
      }'''
      
    content = replace_faq_schema(content, new_schema)
    if content is None:
        return False
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Successfully processed {path}. Size changed from {original_len} to {len(content)}")
    return True

print("Processing English page...")
e_ok = process_file(en_page, is_english=True)
print(f"English page processed: {e_ok}")

print("Processing Arabic page...")
a_ok = process_file(ar_page, is_english=False)
print(f"Arabic page processed: {a_ok}")
