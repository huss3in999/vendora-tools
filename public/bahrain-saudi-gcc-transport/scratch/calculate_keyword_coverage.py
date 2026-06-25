import re
import os

ar_path = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html'
en_path = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html'
js_path = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/src/shared/gcc-guide.js'

with open(ar_path, 'r', encoding='utf-8') as f:
    ar_html = f.read()
with open(en_path, 'r', encoding='utf-8') as f:
    en_html = f.read()
with open(js_path, 'r', encoding='utf-8') as f:
    js_code = f.read()

combined_ar = ar_html + js_code
combined_en = en_html + js_code

def check_exists(keyword, content):
    pattern = re.compile(re.escape(keyword), re.I)
    return bool(pattern.search(content))

# Define our keyword groups to audit
keyword_groups = {
    'country': {
        'Bahrain / Al-Bahrain': (check_exists('Bahrain', combined_en) and check_exists('البحرين', combined_ar)),
        'Saudi Arabia / Al-Saudia': (check_exists('Saudi Arabia', combined_en) and check_exists('السعودية', combined_ar)),
        'Qatar / Qatar': (check_exists('Qatar', combined_en) and check_exists('قطر', combined_ar)),
        'Kuwait / Al-Kuwait': (check_exists('Kuwait', combined_en) and check_exists('الكويت', combined_ar)),
        'UAE / Al-Imarat': (check_exists('UAE', combined_en) and check_exists('الإمارات', combined_ar)),
        'Oman / Oman': (check_exists('Oman', combined_en) and check_exists('عمان', combined_ar)),
        'Iraq / Al-Iraq': (check_exists('Iraq', combined_en) and check_exists('العراق', combined_ar)),
    },
    'city': {
        'Khobar': (check_exists('Khobar', combined_en) and check_exists('الخبر', combined_ar)),
        'Dammam': (check_exists('Dammam', combined_en) and check_exists('الدمام', combined_ar)),
        'Riyadh': (check_exists('Riyadh', combined_en) and check_exists('الرياض', combined_ar)),
        'Saar': (check_exists('Saar', combined_en) and check_exists('سار', combined_ar)),
        'Seef': (check_exists('Seef', combined_en) and check_exists('السيف', combined_ar)),
        'Juffair': (check_exists('Juffair', combined_en) and check_exists('الجفير', combined_ar)),
        'Dhahran': (check_exists('Dhahran', combined_en) and check_exists('الظهران', combined_ar)),
        'Jubail': (check_exists('Jubail', combined_en) and check_exists('الجبيل', combined_ar)),
        'Qatif': (check_exists('Qatif', combined_en) and check_exists('القطيف', combined_ar)),
        'Hofuf': (check_exists('Hofuf', combined_en) and check_exists('الهفوف', combined_ar)),
        'Al Ahsa': (check_exists('Al Ahsa', combined_en) and check_exists('الأحساء', combined_ar)),
        'Ras Tanura': (check_exists('Ras Tanura', combined_en) and check_exists('رأس تنورة', combined_ar)),
        'Abqaiq': (check_exists('Abqaiq', combined_en) and check_exists('بقيق', combined_ar)),
        'Najaf': (check_exists('Najaf', combined_en) and check_exists('النجف', combined_ar)),
        'Karbala': (check_exists('Karbala', combined_en) and check_exists('كربلاء', combined_ar)),
        'Baghdad': (check_exists('Baghdad', combined_en) and check_exists('بغداد', combined_ar)),
        'Basra': (check_exists('Basra', combined_en) and check_exists('البصرة', combined_ar)),
    },
    'airport': {
        'Bahrain Airport': (check_exists('Bahrain International Airport', combined_en) and check_exists('مطار البحرين الدولي', combined_ar)),
        'Dammam Airport': (check_exists('King Fahd International Airport', combined_en) and check_exists('مطار الملك فهد الدولي', combined_ar)),
        'Riyadh Airport': (check_exists('King Khalid International Airport', combined_en) and check_exists('مطار الملك خالد الدولي', combined_ar)),
        'Doha Airport': (check_exists('Hamad International Airport', combined_en) and check_exists('مطار حمد الدولي', combined_ar)),
        'Kuwait Airport': (check_exists('Kuwait International Airport', combined_en) and check_exists('مطار الكويت الدولي', combined_ar)),
        'Najaf Airport': (check_exists('Najaf International Airport', combined_en) and check_exists('مطار النجف الدولي', combined_ar)),
        'Baghdad Airport': (check_exists('Baghdad International Airport', combined_en) and check_exists('مطار بغداد الدولي', combined_ar)),
    },
    'arabic_phrase': {
        'transport from Bahrain to Saudi': check_exists('نقل من البحرين إلى السعودية', combined_ar),
        'delivery from Bahrain to Dammam': check_exists('توصيل من البحرين إلى الدمام', combined_ar),
        'private driver from Bahrain': check_exists('سائق خاص من البحرين', combined_ar),
        'private car': check_exists('سيارة خاصة', combined_ar),
        'airport delivery': check_exists('توصيل المطارات', combined_ar) or check_exists('توصيل مطار', combined_ar),
        'King Fahd causeway': check_exists('جسر الملك فهد', combined_ar),
        'limousine Bahrain Saudi': check_exists('ليموزين البحرين', combined_ar),
        'towsil mashawir': check_exists('توصيل مشاوير', combined_ar) or check_exists('توصيل المشاوير', combined_ar),
        'driver for causeway': check_exists('سواق للجسر', combined_ar) or check_exists('سائق للجسر', combined_ar),
        'reception from DMM airport': check_exists('استقبال من مطار الدمام', combined_ar),
        'family transfer': check_exists('نقل عائلي', combined_ar),
        'pilgrim transfer': check_exists('نقل زوار', combined_ar),
        'arbaeen transfer': check_exists('نقل الأربعين', combined_ar),
    },
    'english_phrase': {
        'Bahrain to Saudi transport': check_exists('Bahrain to Saudi transport', combined_en) or check_exists('Bahrain to Saudi Arabia transport', combined_en),
        'private driver': check_exists('private driver', combined_en),
        'private taxi': check_exists('private taxi', combined_en),
        'airport transfers': check_exists('airport transfers', combined_en) or check_exists('airport transfer', combined_en),
        'family travel': check_exists('family travel', combined_en),
        'business travel': check_exists('business travel', combined_en) or check_exists('business/corporate', combined_en),
        'King Fahd causeway private car': check_exists('Causeway private car', combined_en) or check_exists('Causeway private transfer', combined_en),
        'KSA cross-border chauffeur': check_exists('cross-border chauffeur', combined_en),
        'corporate causeway transfer': check_exists('corporate causeway', combined_en) or check_exists('corporate transfer', combined_en),
        'same car across border': check_exists('same car', combined_en),
        'visa run transport': check_exists('visa run', combined_en),
        'same day visa U-turn': check_exists('visa U-turn', combined_en) or check_exists('visa run', combined_en),
    },
    'gulf_dialect': {
        'abi towsil': check_exists('ابي ', combined_ar) or check_exists('أبي ', combined_ar),
        'abgha mashwar': check_exists('ابغى ', combined_ar) or check_exists('ابغي ', combined_ar),
        'kam towsil / bikam': check_exists('بكم ', combined_ar) or check_exists('جم ', combined_ar),
        'shlon ahjiz': check_exists('شلون ', combined_ar),
        'shno el-se3r': check_exists('شنو ', combined_ar),
        'waddi': check_exists('ودي ', combined_ar),
        'mashwar': check_exists('مشوار', combined_ar),
    },
    'airport_intent': {
        'flight number': check_exists('flight number', combined_en),
        'airport pickup': check_exists('airport pickup', combined_en),
        'Bahrain Airport to Khobar taxi': check_exists('Bahrain Airport to Khobar', combined_en),
        'Dammam Airport to Bahrain pickup': check_exists('Dammam Airport to Bahrain', combined_en),
    },
    'price_intent': {
        'what affects the quote': check_exists('affects the quote', combined_en) or check_exists('affects the price', combined_en),
        'no fixed price': check_exists('no fixed price', combined_en) or check_exists('not show a fixed price', combined_en),
        'request a quote': check_exists('request a quote', combined_en),
        'Bahrain to Dammam taxi price': check_exists('Dammam taxi price', combined_en) or check_exists('taxi fare', combined_en),
    },
    'family_intent': {
        'GMC Yukon': check_exists('GMC', combined_en) and check_exists('Yukon', combined_en),
        '7-seater': check_exists('7-seater', combined_en) or check_exists('7 seater', combined_en),
        'extra luggage': check_exists('extra luggage', combined_en) or check_exists('luggage count', combined_en),
        'child seat': check_exists('child seat', combined_en) or check_exists('baby seat', combined_en),
    },
    'business_vip_intent': {
        'business meeting': check_exists('business meeting', combined_en) or check_exists('meeting', combined_en),
        'executive chauffeur': check_exists('executive chauffeur', combined_en) or check_exists('chauffeur', combined_en),
        'VIP airport transfer': check_exists('VIP airport', combined_en) or check_exists('VIP', combined_en),
        'Aramco compounds / Dhahran Aramco': check_exists('Aramco', combined_en),
        'Diplomatic Area': check_exists('Diplomatic Area', combined_en) or check_exists('Diplomatic', combined_en),
    },
    'whats_app_intent': {
        'WhatsApp booking': check_exists('WhatsApp booking', combined_en) or check_exists('WhatsApp', combined_en),
        'what details to send': check_exists('what to send', combined_en) or check_exists('details to send', combined_en),
        'send pickup point': check_exists('pickup point', combined_en) or check_exists('pickup details', combined_en),
    },
    'border_causeway_intent': {
        'King Fahd Causeway': check_exists('King Fahd Causeway', combined_en) or check_exists('Causeway', combined_en),
        'wait time': check_exists('wait time', combined_en) or check_exists('waiting time', combined_en),
        'Jesr app': check_exists('Jesr', combined_en),
        'tolls': check_exists('toll', combined_en),
    },
    'iraq_ziyarat_intent': {
        'Ziyarat': check_exists('Ziyarat', combined_en) or check_exists('ziyarat', combined_en),
        'Najaf / kearbala routes': check_exists('Najaf', combined_en) and check_exists('Karbala', combined_en),
        'Arbaeen transport': check_exists('Arbaeen', combined_en),
    }
}

# Calculate coverage score
total = 0
covered = 0
for group, items in keyword_groups.items():
    print(f"\nGroup: {group}")
    for item, status in items.items():
        total += 1
        if status:
            covered += 1
        # Print without unicode characters
        clean_item_name = "".join([c for c in item if ord(c) < 128])
        print(f"  {clean_item_name}: {'COVERED' if status else 'MISSING'}")

score = (covered / total) * 100
print(f"\nTotal Keywords checked: {total}")
print(f"Covered: {covered}")
print(f"Score: {score:.2f}%")

with open('e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/scratch/keyword_audit_report.txt', 'w', encoding='utf-8') as out:
    out.write(f"=== KEYWORD COVERAGE REPORT ===\n")
    out.write(f"Total Keywords checked: {total}\n")
    out.write(f"Covered: {covered}\n")
    out.write(f"Score: {score:.2f}%\n\n")
    for group, items in keyword_groups.items():
        out.write(f"Group: {group}\n")
        for item, status in items.items():
            out.write(f"  {item}: {'COVERED' if status else 'MISSING'}\n")
