#!/usr/bin/env python3
"""Phase 10 — GSC-driven content expansion for priority pages."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "tests" / "phase10-content-expansion-report.json"
MARKER = "<!-- phase10-content -->"

report_pages: list[dict] = []


def track(url: str, keywords: list[str], sections: list[str], faq: str, title_changed: bool, path: str, impact: str) -> None:
    report_pages.append(
        {
            "url": url,
            "keywords": keywords,
            "sections": sections,
            "faq_schema": faq,
            "title_meta_changed": title_changed,
            "file": path,
            "expected_impact": impact,
        }
    )


def patch(path: Path, old: str, new: str) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    if old not in text:
        return False
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    return True


def insert_once(path: Path, needle: str, block: str) -> bool:
    if not path.exists() or MARKER in path.read_text(encoding="utf-8"):
        return False
    text = path.read_text(encoding="utf-8")
    if needle not in text:
        return False
    path.write_text(text.replace(needle, needle + block, 1), encoding="utf-8")
    return True


def append_faq_schema(path: Path, questions: list[tuple[str, str]]) -> None:
    text = path.read_text(encoding="utf-8")
    for q, a in questions:
        if q in text:
            continue
        entry = json.dumps(
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}},
            ensure_ascii=False,
        )
        if '"FAQPage"' in text and '"mainEntity": [' in text:
            text = text.replace('"mainEntity": [', '"mainEntity": [' + entry + ", ", 1)
        # visible FAQ for tools
        if '<section class="faq"' in text or 'class="faq-wrap"' in text:
            faq_html = f'<details class="faq-item"><summary>{q}</summary><p>{a}</p></details>'
            if 'class="faq-wrap"' in text:
                text = text.replace('<div class="faq-wrap">', '<div class="faq-wrap">' + faq_html, 1)
            elif '<section class="faq"' in text:
                text = text.replace('<section class="faq"', faq_html + '\n    <section class="faq"', 1)
    path.write_text(text, encoding="utf-8")


def patch_commission() -> None:
    p = ROOT / "tools" / "commission-calculator" / "index.html"
    t_changed = patch(
        p,
        "<title>Free Commission Calculator — Sales %, Pay &amp; Reverse Rate | Online</title>",
        "<title>Sales Commission Calculator Free — Calculate Pay &amp; Reverse Rate</title>",
    )
    patch(
        p,
        'content="Free commission calculator: enter sales amount and rate to get commission pay instantly. Reverse rate, total earnings with salary, and target sales — no signup."',
        'content="Free sales commission calculator: calculate commission pay, reverse commission rate, and total earnings. Example: 8% on $3,000 = $240 commission — instant results, no signup."',
    )
    block = f"""
{MARKER}
<section class="card input-card" style="margin-top:0" aria-label="Quick example">
  <h2 class="section-title">Worked example (above the calculator)</h2>
  <p class="section-copy"><strong>How to calculate commission:</strong> Sales × (Rate ÷ 100). Example: <strong>$3,000 sales at 8%</strong> → $3,000 × 0.08 = <strong>$240 commission</strong>. If you earned $240 on an 8% deal, the sale was $3,000 (reverse commission).</p>
  <p class="formula-note">Formula: Commission = Sales Amount × (Commission Rate ÷ 100)</p>
</section>
"""
    insert_once(p, "</section>\n\n    <div class=\"stack\">", block)
    append_faq_schema(
        p,
        [
            (
                "How do you calculate sales commission?",
                "Multiply the sales amount by the commission rate divided by 100. Example: $5,000 at 10% equals $500 commission.",
            ),
            (
                "What is a reverse commission calculator?",
                "Enter the commission amount and rate to find the original sale. Example: $240 commission at 8% means the sale was $3,000.",
            ),
            (
                "How do you calculate commission on a $5,000 sale at 10%?",
                "Multiply $5,000 by 0.10 to get $500 commission.",
            ),
        ],
    )
    track(
        "https://getvendora.net/tools/commission-calculator/",
        ["commission calculation", "sales commission calculation", "how to calculate commission", "reverse commission calculator", "calculate sales commission"],
        ["Worked example above fold", "How to calculate commission formula"],
        "Added 3 GSC-matched FAQ items (visible + schema)",
        t_changed,
        "tools/commission-calculator/index.html",
        "High — 2,852 impressions at pos 12.6; CTR lift target 0.04% → 1%+",
    )


def patch_bmr() -> None:
    p = ROOT / "calculators" / "bmr-calculator" / "index.html"
    t_changed = patch(
        p,
        "<title>BMR Calculator Free — Mifflin-St Jeor (Men &amp; Women) | Instant</title>",
        "<title>BMR Calculator — Mifflin-St Jeor Equation (Men &amp; Women) Free</title>",
    )
    patch(
        p,
        'content="Free BMR calculator using Mifflin-St Jeor. Enter age, height, weight and sex — see basal metabolic rate (resting calories) instantly. No signup required."',
        'content="Free BMR calculator using the Mifflin-St Jeor equation. Women: BMR = 10×weight + 6.25×height − 5×age − 161. Instant resting calorie estimate — no signup."',
    )
    block = f"""
{MARKER}
<div class="mb-4 p-4 rounded-lg border border-white/10 bg-vendora-bg/50 text-sm text-vendora-muted">
  <p class="font-semibold text-vendora-text mb-1">Quick answer — Mifflin-St Jeor BMR</p>
  <p><strong>Example (woman, 30 years, 165 cm, 70 kg):</strong> BMR ≈ 10×70 + 6.25×165 − 5×30 − 161 ≈ <strong>1,411 kcal/day</strong> at rest. Use the form below for your numbers.</p>
</div>
"""
    insert_once(p, '<p class="text-sm text-vendora-muted mb-6">Mifflin–St Jeor: resting calories per day.</p>', block)
    append_faq_schema(
        p,
        [
            (
                "What is the Mifflin-St Jeor equation for women?",
                "BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161.",
            ),
            (
                "What is the Mifflin-St Jeor equation for men?",
                "BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5.",
            ),
        ],
    )
    track(
        "https://getvendora.net/calculators/bmr-calculator/",
        ["mifflin-st jeor equation", "BMR calculator", "mifflin st jeor equation women"],
        ["Worked example above fold", "Mifflin-St Jeor formula block"],
        "Added 2 equation FAQ items",
        t_changed,
        "calculators/bmr-calculator/index.html",
        "High — 753 imp, pos 6.4; equation queries at pos 2.3",
    )


def patch_food_cost() -> None:
    p = ROOT / "tools" / "food-cost-calculator" / "index.html"
    t_changed = patch(
        p,
        "<title>Food Cost Calculator | Recipe &amp; Menu Food Cost % for Restaurants</title>",
        "<title>Food Cost Calculator Free — Recipe &amp; Menu Cost % for Restaurants</title>",
    )
    patch(
        p,
        'content="Calculate recipe cost, plate cost, food cost percentage, and target selling price. Free tool for restaurants, cafes, food trucks, bakeries, and cloud kitchens."',
        'content="Free food cost calculator for restaurants: recipe cost, food cost percentage, and menu pricing. Example: $4 cost on $16 menu price = 25% food cost — instant results."',
    )
    block = f"""
{MARKER}
<section class="card input-card" aria-label="Quick food cost example">
  <h2 class="section-title">How to calculate food cost percentage</h2>
  <p class="section-copy"><strong>Formula:</strong> Food Cost % = (Total food cost ÷ Selling price) × 100. <strong>Example:</strong> $4.50 ingredient cost on a $18 menu price → 25% food cost. Enter your numbers below.</p>
</section>
"""
    insert_once(p, '<section class="calculator-shell">', block)
    append_faq_schema(
        p,
        [
            (
                "How do you calculate food cost for a restaurant?",
                "Add ingredient, packaging, and prep costs for one portion, divide by selling price, then multiply by 100 for food cost percentage.",
            ),
            (
                "What is a good food cost percentage?",
                "Many restaurants target roughly 28–35% food cost, but the right number depends on your concept, location, and overhead.",
            ),
        ],
    )
    track(
        "https://getvendora.net/tools/food-cost-calculator/",
        ["food cost calculator", "how to calculate food cost", "restaurant food cost calculator", "menu cost calculator"],
        ["Food cost % formula + example", "How to calculate section"],
        "Added 2 FAQ items",
        t_changed,
        "tools/food-cost-calculator/index.html",
        "Medium-high — 875 imp; tool at pos 67 needs snippet match",
    )


def patch_delivery_commission() -> None:
    p = ROOT / "tools" / "delivery-commission-calculator" / "index.html"
    t_changed = patch(
        p,
        "<title>Delivery Commission Calculator | Uber Eats, DoorDash &amp; App Fee Estimator</title>",
        "<title>Delivery Commission Calculator — Restaurant App Fees &amp; Margin Tool</title>",
    )
    block = f"""
{MARKER}
<section class="card input-card" aria-label="Delivery commission example">
  <h2 class="section-title">Worked example</h2>
  <p class="section-copy"><strong>Example:</strong> $20 menu item with 25% delivery app commission → platform keeps $5, you keep $15 before food cost. Enter your average order value and commission % below to see monthly impact.</p>
  <p class="section-copy">Read the <a href="/guides/delivery-commission-calculator-guide/">delivery commission guide</a> or use our <a href="/tools/food-cost-calculator/">food cost calculator</a> for full margin planning.</p>
</section>
"""
    insert_once(p, '<section class="tool-layout">', block)
    append_faq_schema(
        p,
        [
            (
                "How much do delivery apps charge restaurants?",
                "Marketplace commission often ranges from about 15% to 30% depending on plan and market. Use this calculator to model your net revenue after fees.",
            ),
        ],
    )
    track(
        "https://getvendora.net/tools/delivery-commission-calculator/",
        ["delivery commission calculator", "delivery app fees", "restaurant delivery cost"],
        ["Worked example", "Guide + food cost internal links"],
        "Added 1 FAQ item",
        t_changed,
        "tools/delivery-commission-calculator/index.html",
        "Medium — 333 imp, pos 10; pairs with guide (689 imp)",
    )


def patch_daily_sales() -> None:
    p = ROOT / "tools" / "daily-sales-summary" / "index.html"
    t_changed = patch(
        p,
        "<title>Daily Sales Summary Tool | Restaurant Revenue, AOV &amp; Sales Mix</title>",
        "<title>Daily Sales Summary — Restaurant Sales Report &amp; AOV Tool Free</title>",
    )
    patch(
        p,
        'content="Track daily restaurant sales: revenue, profit, average order value, discounts, refunds, and category mix. Free daily sales summary for owners and managers."',
        'content="Free restaurant daily sales summary: net sales, average order value, and mix in one view. Build your end-of-day sales report in minutes — no signup."',
    )
    block = f"""
{MARKER}
<section class="card input-card" aria-label="Daily sales example">
  <h2 class="section-title">What is a restaurant daily sales summary?</h2>
  <p class="section-copy">A daily sales report totals orders, gross and net sales, discounts, and average order value for one day. <strong>Example:</strong> 80 orders, $2,400 gross, $180 discounts → $2,220 net sales, AOV ≈ $27.75.</p>
</section>
"""
    insert_once(p, '<section class="tool-layout">', block)
    append_faq_schema(
        p,
        [
            (
                "How do you calculate restaurant daily sales?",
                "Sum all orders for the day, subtract discounts and refunds for net sales, then divide net sales by order count for average order value.",
            ),
        ],
    )
    track(
        "https://getvendora.net/tools/daily-sales-summary/",
        ["daily sales reports", "restaurant daily sales calculation", "restaurant daily sales report"],
        ["Daily sales definition + example"],
        "Added 1 FAQ item",
        t_changed,
        "tools/daily-sales-summary/index.html",
        "Medium — 338 imp; query at pos 10.5",
    )


def patch_ar_transport(rel: str, url: str, ar_query: str, duration: str, wa_msg: str, keywords: list[str]) -> None:
    p = ROOT / rel.strip("/") / "index.html"
    if not p.exists():
        return
    text = p.read_text(encoding="utf-8")
    if MARKER in text:
        return
    answer = (
        f'{MARKER}<div class="phase10-answer-first" style="margin:14px 0;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.06);">'
        f'<p><strong>{ar_query}</strong> المدة المتوقعة <strong>{duration}</strong> تقريباً (باب إلى باب). '
        f"السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة — "
        f'أرسل التفاصيل عبر <a class="wa-inline" data-wa-message="{wa_msg}">واتساب</a> للحصول على عرض.</p></div>'
    )
    if '<p class="lead">' not in text:
        return
    text = text.replace('<p class="lead">', answer + '<p class="lead">', 1)
    price_faq = (
        '<details class="faq-item"><summary>كم يكلف النقل؟</summary>'
        "<p>السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة. أرسل التفاصيل عبر واتساب للحصول على عرض بدون التزام.</p></details>"
    )
    if "كم يكلف النقل؟" not in text and '<div class="faq-wrap">' in text:
        text = text.replace('<div class="faq-wrap">', '<div class="faq-wrap">' + price_faq, 1)
    if '"FAQPage"' in text and "كم يكلف النقل؟" not in text:
        entry = json.dumps(
            {
                "@type": "Question",
                "name": "كم يكلف النقل؟",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة. أرسل التفاصيل عبر واتساب للحصول على عرض.",
                },
            },
            ensure_ascii=False,
        )
        text = text.replace('"mainEntity":[', '"mainEntity":[' + entry + ",", 1)
    p.write_text(text, encoding="utf-8")
    track(
        url,
        keywords,
        ["Answer-first Arabic duration block", "Price FAQ (no fixed price)", "WhatsApp quote CTA"],
        "Added visible price FAQ + FAQPage entry",
        False,
        rel.strip("/") + "/index.html",
        "Medium-high — transport clicks + Arabic duration queries",
    )


def patch_khobar_dammam_reverse(rel: str, url: str, h1_needle: str, ar_taxi_kw: list[str]) -> None:
    p = ROOT / rel.strip("/") / "index.html"
    if not p.exists() or MARKER in p.read_text(encoding="utf-8"):
        return
    text = p.read_text(encoding="utf-8")
    block = (
        f'{MARKER}<div class="phase10-answer-first" style="margin:14px 0;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.06);">'
        f"<p><strong>تاكسي / سيارة خاصة عبر جسر الملك فهد:</strong> خدمة باب إلى باب مع GMC/XL للعائلات والأمتعة. "
        f"المدة تختلف حسب نقطة الالتقاء وازدحام المعبر. السعر يعتمد على الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ — "
        f"احجز عبر واتساب للحصول على عرض.</p></div>"
    )
    if "<h1>" in text:
        text = text.replace("</h1>", "</h1>" + block, 1)
    price_faq = (
        '<details class="faq-item"><summary>كم يكلف التاكسي أو السيارة الخاصة؟</summary>'
        "<p>السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة. أرسل التفاصيل عبر واتساب.</p></details>"
    )
    if '<div class="faq-wrap">' in text:
        text = text.replace('<div class="faq-wrap">', '<div class="faq-wrap">' + price_faq, 1)
    if '"FAQPage"' not in text:
        schema = (
            '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":['
            '{"@type":"Question","name":"كم يكلف التاكسي أو السيارة الخاصة؟","acceptedAnswer":{"@type":"Answer","text":"السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة."}}'
            "]}</script>"
        )
        text = text.replace("</head>", schema + "\n</head>", 1)
    p.write_text(text, encoding="utf-8")
    track(
        url,
        ar_taxi_kw,
        ["Causeway taxi answer-first", "Price FAQ", "FAQPage schema added"],
        "New FAQPage schema where missing",
        False,
        rel.strip("/") + "/index.html",
        "Medium — reverse route + taxi GSC queries",
    )


def patch_bahrain_to_khobar() -> None:
    p = ROOT / "bahrain-saudi-gcc-transport" / "bahrain-to-khobar" / "index.html"
    if not p.exists() or MARKER in p.read_text(encoding="utf-8"):
        return
    text = p.read_text(encoding="utf-8")
    block = (
        f'{MARKER}<div class="phase10-answer-first" style="margin:14px 0;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.06);">'
        f"<p><strong>تاكسي من البحرين إلى الخبر / من البحرين إلى الدمام:</strong> نقل خاص عبر جسر الملك فهد — GMC/XL، استلام من المنزل أو المطار. "
        f"السعر يعتمد على نقطة الاستلام والتوصيل والركاب والأمتعة — احجز عبر واتساب للعرض.</p></div>"
    )
    text = text.replace('<p class="lead">', block + '<p class="lead">', 1)
    p.write_text(text, encoding="utf-8")
    track(
        "https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-khobar/",
        ["taxi from bahrain to khobar", "bahrain to khobar taxi", "taxi bahrain to dammam", "bahrain to al khobar"],
        ["Taxi/causeway answer-first block"],
        "Existing FAQ retained",
        False,
        "bahrain-saudi-gcc-transport/bahrain-to-khobar/index.html",
        "Medium-high — 5 clicks, 4.67% CTR",
    )


def patch_bahrain_to_dammam() -> None:
    p = ROOT / "bahrain-saudi-gcc-transport" / "bahrain-to-dammam" / "index.html"
    if not p.exists() or MARKER in p.read_text(encoding="utf-8"):
        return
    text = p.read_text(encoding="utf-8")
    block = (
        f'{MARKER}<div class="phase10-answer-first" style="margin:14px 0;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.06);">'
        f"<p><strong>من البحرين إلى الدمام سيارة / تاكسي:</strong> عبر جسر الملك فهد، ثم حوالي 1–2 ساعة إلى الدمام بعد المعبر حسب الازدحام. "
        f"السعر يعتمد على الاستلام والتوصيل والركاب والأمتعة — أرسل التفاصيل عبر واتساب.</p></div>"
    )
    text = text.replace('<p class="lead">', block + '<p class="lead">', 1)
    p.write_text(text, encoding="utf-8")
    track(
        "https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-dammam/",
        ["من البحرين إلى الدمام سيارة", "taxi bahrain to dammam", "bahrain to dammam airport service", "driver from bahrain to dammam"],
        ["Causeway + duration answer-first"],
        "Existing FAQ retained",
        False,
        "bahrain-saudi-gcc-transport/bahrain-to-dammam/index.html",
        "High — 8 clicks, 331 imp",
    )


def patch_homepage() -> None:
    p = ROOT / "index.html"
    if MARKER in p.read_text(encoding="utf-8"):
        return
    block = f"""
{MARKER}
<section class="py-12 bg-light border-t border-gray-100" aria-label="Popular on GetVendora">
  <div class="max-w-6xl mx-auto px-4">
    <h2 class="text-2xl font-bold text-dark mb-4">Most searched on GetVendora</h2>
    <p class="text-gray-600 mb-6 max-w-3xl">Free business tools and GCC private transport — book routes via WhatsApp or use calculators instantly.</p>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
      <a href="tools/commission-calculator/" class="home-tool-card">Commission Calculator<span>Sales pay &amp; reverse rate</span></a>
      <a href="calculators/bmr-calculator/" class="home-tool-card">BMR Calculator<span>Mifflin-St Jeor equation</span></a>
      <a href="bahrain-saudi-gcc-transport/bahrain-to-qatar/" class="home-tool-card">Bahrain to Qatar<span>Private transport booking</span></a>
      <a href="bahrain-saudi-gcc-transport/bahrain-to-dammam/" class="home-tool-card">Bahrain to Dammam<span>Causeway private car</span></a>
    </div>
  </div>
</section>
"""
    insert_once(p, '<section id="pricing"', block)
    track(
        "https://getvendora.net/",
        ["vendvora com", "vendora", "vendora restaurant"],
        ["Most searched internal links section"],
        "None added",
        False,
        "index.html",
        "Medium — 971 imp; strengthens money page discovery",
    )


def patch_about() -> None:
    p = ROOT / "about" / "index.html"
    block = f"""
{MARKER}
<section class="card" style="margin-top:24px">
  <h2 class="section-title">GetVendora at a glance</h2>
  <p class="section-copy">GetVendora (Vendora) is a business platform with three services: <strong>GCC private transport</strong> (Vendora Transport), <strong>free business calculators</strong>, and <strong>restaurant POS tools</strong>. Transport bookings: WhatsApp +973 3322 5954. Tools support: +973 3340 4044.</p>
  <p class="section-copy"><a href="../bahrain-saudi-gcc-transport/bahrain-to-qatar/">Bahrain to Qatar transport</a> · <a href="../tools/commission-calculator/">Commission calculator</a> · <a href="../tools/food-cost-calculator/">Food cost calculator</a> · <a href="../tools/">All tools</a></p>
</section>
"""
    insert_once(p, "<!-- phase7-authority-links -->", block)
    track(
        "https://getvendora.net/about/",
        ["vendora restaurant", "what is getvendora"],
        ["GetVendora at a glance answer-first", "Money page links"],
        "Existing FAQ retained",
        False,
        "about/index.html",
        "Low-medium — 448 imp brand queries",
    )


def patch_contact() -> None:
    p = ROOT / "contact" / "index.html"
    block = f"""
{MARKER}
<section class="card" style="margin-top:24px">
  <h2 class="section-title">Quick answers before you contact us</h2>
  <ul class="section-copy" style="line-height:1.8">
    <li><strong>GCC transport quote:</strong> Price depends on pickup, drop-off, passengers, luggage, date, and vehicle availability — WhatsApp transport line for a quote.</li>
    <li><strong>Free tools:</strong> <a href="../tools/commission-calculator/">Commission calculator</a>, <a href="../calculators/bmr-calculator/">BMR calculator</a>, <a href="../tools/food-cost-calculator/">Food cost calculator</a> — no signup.</li>
    <li><strong>Popular routes:</strong> <a href="../bahrain-saudi-gcc-transport/bahrain-to-qatar/">Bahrain to Qatar</a>, <a href="../bahrain-saudi-gcc-transport/bahrain-to-kuwait/">Kuwait</a>, <a href="../bahrain-saudi-gcc-transport/bahrain-to-dammam/">Dammam</a>.</li>
  </ul>
</section>
"""
    insert_once(p, "<!-- phase7-authority-links -->", block)
    track(
        "https://getvendora.net/contact/",
        ["getvendora contact", "transport booking"],
        ["Quick answers section", "Tool + route links"],
        "None added",
        False,
        "contact/index.html",
        "Low — supports conversion paths from brand traffic",
    )


def main() -> None:
    patch_commission()
    patch_bmr()
    patch_food_cost()
    patch_delivery_commission()
    patch_daily_sales()
    patch_ar_transport(
        "bahrain-saudi-gcc-transport/bahrain-to-qatar",
        "https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-qatar/",
        "كم ساعة من البحرين إلى قطر بالسيارة؟ / توصيل من البحرين إلى قطر",
        "4 إلى 6 ساعات",
        "مرحباً، أريد حجز خدمة من البحرين إلى قطر.",
        ["توصيل من البحرين إلى قطر", "bahrain to qatar transport"],
    )
    patch_ar_transport(
        "bahrain-saudi-gcc-transport/bahrain-to-kuwait",
        "https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-kuwait/",
        "كم ساعة من البحرين إلى الكويت بالسيارة؟",
        "6 إلى 7 ساعات",
        "مرحباً، أريد حجز خدمة من البحرين إلى الكويت.",
        ["من البحرين إلى الكويت كم ساعة بالسياره"],
    )
    patch_bahrain_to_dammam()
    patch_bahrain_to_khobar()
    patch_ar_transport(
        "bahrain-saudi-gcc-transport/bahrain-to-oman",
        "https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-oman/",
        "كم ساعة من البحرين إلى عمان بالسيارة؟",
        "14 إلى 16 ساعة",
        "مرحباً، أريد حجز خدمة من البحرين إلى عمان.",
        ["من البحرين إلى عمان كم ساعة بالسياره"],
    )
    patch_ar_transport(
        "bahrain-saudi-gcc-transport/bahrain-to-dubai",
        "https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-dubai/",
        "كم ساعة من البحرين إلى دبي بالسيارة؟",
        "8 إلى 10 ساعات",
        "مرحباً، أريد حجز خدمة من البحرين إلى دبي.",
        ["من البحرين إلى دبي كم ساعة بالسياره"],
    )
    patch_khobar_dammam_reverse(
        "bahrain-saudi-gcc-transport/dammam-to-bahrain",
        "https://getvendora.net/bahrain-saudi-gcc-transport/dammam-to-bahrain/",
        "dammam to bahrain",
        ["من الدمام إلى البحرين سيارة", "dammam to bahrain transportation"],
    )
    patch_khobar_dammam_reverse(
        "bahrain-saudi-gcc-transport/khobar-to-bahrain",
        "https://getvendora.net/bahrain-saudi-gcc-transport/khobar-to-bahrain/",
        "khobar to bahrain",
        ["من الخبر إلى البحرين", "taxi from khobar to bahrain", "khobar to bahrain taxi"],
    )
    patch_homepage()
    patch_about()
    patch_contact()

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({"pages": report_pages}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Phase 10 complete. {len(report_pages)} pages updated.")


if __name__ == "__main__":
    main()
