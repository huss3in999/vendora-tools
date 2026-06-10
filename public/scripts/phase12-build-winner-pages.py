#!/usr/bin/env python3
"""Phase 12 — Create winner cluster support pages and cross-links."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = "<!-- phase12-cluster-links -->"

GUIDE_CSS = Path(ROOT / "guides/commission-calculator-guide/index.html").read_text(encoding="utf-8")
CSS_START = GUIDE_CSS.index("<style>")
CSS_END = GUIDE_CSS.index("</style>") + len("</style>")
GUIDE_STYLES = GUIDE_CSS[CSS_START:CSS_END]


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"Created {path.relative_to(ROOT)}")


def patch_once(path: Path, needle: str, block: str) -> bool:
    if not path.exists() or MARKER in path.read_text(encoding="utf-8"):
        return False
    text = path.read_text(encoding="utf-8")
    if needle not in text:
        return False
    path.write_text(text.replace(needle, needle + block, 1), encoding="utf-8")
    print(f"Linked {path.relative_to(ROOT)}")
    return True


def king_fahd_causeway_guide() -> None:
    url = "https://getvendora.net/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/"
    html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><link rel="icon" type="image/png" href="https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png" /><link rel="apple-touch-icon" href="https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png" /><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>دليل جسر الملك فهد | السفر من البحرين إلى السعودية بالسيارة | Vendora</title><meta name="description" content="دليل جسر الملك فهد: مدة العبور، المستندات، ونقل خاص من البحرين إلى الدمام والخبر. السعر يعتمد على الاستلام والتوصيل — احجز عبر واتساب." /><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" /><meta name="theme-color" content="#10071d" /><link rel="canonical" href="{url}" /><meta property="og:type" content="article" /><meta property="og:locale" content="ar_BH" /><meta property="og:url" content="{url}" /><meta property="og:title" content="دليل جسر الملك فهد | البحرين إلى السعودية بالسيارة" /><meta property="og:description" content="مدة عبور جسر الملك فهد، المستندات، ونقل خاص إلى الدمام والخبر — حجز واتساب." /><meta name="twitter:card" content="summary_large_image" /><link rel="stylesheet" href="../site.css" /><script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script><script type="application/ld+json">{{"@context":"https://schema.org","@graph":[{{"@type":"BreadcrumbList","itemListElement":[{{"@type":"ListItem","position":1,"name":"نقليات فيندورا","item":"https://getvendora.net/bahrain-saudi-gcc-transport/"}},{{"@type":"ListItem","position":2,"name":"البحرين إلى السعودية","item":"https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-saudi/"}},{{"@type":"ListItem","position":3,"name":"دليل جسر الملك فهد","item":"{url}"}}]}},{{"@type":"Article","headline":"دليل جسر الملك فهد: السفر من البحرين إلى السعودية بالسيارة","inLanguage":"ar-BH","url":"{url}","description":"دليل عملي لعبور جسر الملك فهد والنقل الخاص إلى الدمام والخبر من البحرين.","publisher":{{"@type":"Organization","name":"Vendora Transport","url":"https://getvendora.net/bahrain-saudi-gcc-transport/"}}}},{{"@type":"FAQPage","mainEntity":[{{"@type":"Question","name":"كم يستغرق عبور جسر الملك فهد؟","acceptedAnswer":{{"@type":"Answer","text":"مدة العبور على الجسر نفسه غالباً 20–45 دقيقة، لكن الوقت الكلي للرحلة من البحرين إلى الدمام أو الخبر يعتمد على ازدحام المعبر ونقطة الاستلام والتوصيل."}}}},{{"@type":"Question","name":"ما المستندات المطلوبة لعبور الجسر؟","acceptedAnswer":{{"@type":"Answer","text":"يحتاج كل راكب جواز سفر أو هوية خليجية سارية، وتأكد من صلاحية الوثائق قبل السفر. قد تُطلب تأشيرة حسب جنسية الراكب."}}}},{{"@type":"Question","name":"كم يكلف التاكسي أو السيارة الخاصة عبر الجسر؟","acceptedAnswer":{{"@type":"Answer","text":"السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة. أرسل التفاصيل عبر واتساب للحصول على عرض بدون التزام."}}}},{{"@type":"Question","name":"ما الفرق بين الحجز إلى الدمام والخبر؟","acceptedAnswer":{{"@type":"Answer","text":"كلاهما عبر نفس الجسر، لكن نقطة التوصيل النهائية مختلفة. الدمام أبعد قليلاً عن الخبر بعد المعبر، لذا يختلف وقت الوصول والمسار داخل المنطقة الشرقية."}}}},{{"@type":"Question","name":"هل يمكن الذهاب إلى مطار الدمام من البحرين؟","acceptedAnswer":{{"@type":"Answer","text":"نعم. نوفر توصيلاً باباً إلى باباً من البحرين إلى مطار الملك فهد (DMM) عبر الجسر. أرسل موعد الرحلة وعدد الركاب عبر واتساب."}}}}]}}]}}</script></head>
<body class="home-premium"><header class="topbar"><div class="container nav"><a class="brand" href="/bahrain-saudi-gcc-transport/"><span class="logo">V</span><span class="brand-copy"><span class="brand-title">Vendora Transport</span><span class="brand-sub">البحرين إلى السعودية ودول مجلس التعاون الخليجي</span></span></a><nav class="nav-menu" aria-label="Primary"><a class="nav-link" href="/bahrain-saudi-gcc-transport/">الرئيسية</a><a class="nav-link" href="/bahrain-saudi-gcc-transport/passenger-transport/">نقل الركاب</a><a class="nav-link" href="/bahrain-saudi-gcc-transport/bahrain-to-saudi/">البحرين → السعودية</a><a class="nav-link" href="/bahrain-saudi-gcc-transport/contact/">تواصل معنا</a></nav><div class="quick-links"><a class="wa-inline" data-wa-message="مرحباً، أريد حجز نقل عبر جسر الملك فهد من البحرين إلى السعودية."><i data-lucide="message-circle"></i><span>واتساب</span></a></div></div></header>
<main>
<section class="hero"><div class="container hero-grid"><div class="hero-copy glass"><span class="eyebrow"><strong>دليل السفر</strong><span class="en-sub">King Fahd Causeway Guide</span></span><h1>دليل جسر الملك فهد: من البحرين إلى السعودية بالسيارة</h1>
<div class="phase10-answer-first" style="margin:14px 0;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.06);"><p><strong>إجابة سريعة:</strong> جسر الملك فهد يربط البحرين بالمملكة العربية السعودية. عبور الجسر يستغرق غالباً <strong>20–45 دقيقة</strong> حسب الازدحام، ثم تُضاف مدة القيادة إلى <a href="/bahrain-saudi-gcc-transport/bahrain-to-dammam/">الدمام</a> (حوالي 1–2 ساعة إجمالاً) أو <a href="/bahrain-saudi-gcc-transport/bahrain-to-khobar/">الخبر</a> (حوالي 45–60 دقيقة بعد المعبر). السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة — <a class="wa-inline" data-wa-message="مرحباً، أريد عرضاً لنقل عبر جسر الملك فهد.">احجز عبر واتساب</a>.</p></div>
<p class="lead">دليل عملي للمسافرين والعائلات الذين يريدون فهم عبور الجسر قبل حجز سيارة خاصة أو تاكسي من البحرين إلى الدمام، الخبر، أو مطار الدمام.</p>
<div class="hero-actions"><a class="primary-btn wa-inline" data-wa-message="مرحباً، أريد حجز نقل من البحرين إلى السعودية عبر جسر الملك فهد."><i data-lucide="message-circle"></i><span>طلب عرض واتساب</span></a><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/bahrain-to-dammam/"><span>البحرين → الدمام</span><i data-lucide="arrow-up-left"></i></a></div></div>
<aside class="hero-side glass"><div class="hero-icon"><i data-lucide="route"></i></div><h2 style="margin:0 0 10px;">ملخص الجسر</h2><ul class="footer-copy" style="line-height:1.8;padding-right:18px;"><li>يربط البحرين بالمنطقة الشرقية</li><li>مناسب للعائلات والأمتعة (GMC/XL)</li><li>خدمة 24/7 مع حجز واتساب</li></ul></aside></div></section>

<section class="section"><div class="container section-shell"><div class="section-head"><h2>ما هو جسر الملك فهد؟</h2><p>King Fahd Causeway — المعبر البري الرئيسي بين البحرين والسعودية</p></div>
<p class="footer-copy" style="max-width:720px;line-height:1.85;">جسر الملك فهد (King Fahd Causeway) هو المعبر البري الذي يربط مملكة البحرين بالمملكة العربية السعودية عبر مجموعة جسور وجزر اصطناعية. معظم رحلات النقل الخاص من البحرين إلى <strong>الدمام</strong>، <strong>الخبر</strong>، <strong>الظهران</strong>، أو <strong>مطار الملك فهد (DMM)</strong> تمر عبر هذا الجسر. إذا كنت تبحث عن «من البحرين إلى الدمام سيارة» أو «تاكسي من البحرين إلى الخبر»، فالجسر هو نقطة العبور الأساسية.</p></div></section>

<section class="section"><div class="container section-shell"><div class="section-head"><h2>كم يستغرق عبور الجسر؟</h2><p>المدة تختلف حسب الازدحام ووقت السفر</p></div>
<div class="route-grid"><article class="route-card"><h3>عبور الجسر فقط</h3><p>غالباً <strong>20–45 دقيقة</strong> في نقاط التفتيش والعبور، وأطول في أوقات الذروة (عطلات نهاية الأسبوع، مواسم السفر).</p></article><article class="route-card"><h3>البحرين → الدمام (باب إلى باب)</h3><p>حوالي <strong>1–2 ساعة</strong> إجمالاً بعد المعبر حسب نقطة الاستلام في البحرين والازدحام. راجع <a href="/bahrain-saudi-gcc-transport/bahrain-to-dammam/">صفحة البحرين إلى الدمام</a>.</p></article><article class="route-card"><h3>البحرين → الخبر (باب إلى باب)</h3><p>حوالي <strong>45–60 دقيقة</strong> بعد المعبر في ظروف عادية. راجع <a href="/bahrain-saudi-gcc-transport/bahrain-to-khobar/">صفحة البحرين إلى الخبر</a>.</p></article><article class="route-card"><h3>عوامل تؤثر على الوقت</h3><p>ازدحام المعبر، وقت الانطلاق، الموسم، ونقطة الالتقاء (المنزل، الفندق، أو مطار البحرين).</p></article></div></div></section>

<section class="section"><div class="container section-shell"><div class="section-head"><h2>المستندات والإجراءات عند المعبر</h2><p>تأكد من جاهزية الوثائق قبل الانطلاق</p></div>
<div class="route-grid"><article class="route-card"><h3>جواز السفر / الهوية الخليجية</h3><p>يجب أن تكون الوثائق سارية المفعول لكل راكب. مواطنو دول مجلس التعاون الخليجي غالباً يسافرون بهوية وطنية سارية.</p></article><article class="route-card"><h3>التأشيرات</h3><p>قد تحتاج تأشيرة دخول للسعودية حسب جنسية الراكب. تحقق من متطلباتك قبل الحجز.</p></article><article class="route-card"><h3>الأمتعة والمركبة</h3><p>في السيارة الخاصة مع Vendora Transport، تُراجع الأمتعة مع السائق مسبقاً. GMC/XL مناسبة للعائلات حتى 7 ركاب مع حقائب.</p></article><article class="route-card"><h3>نصيحة عملية</h3><p>احجز قبل 1–3 ساعات على الأقل وأرسل موقع الاستلام الدقيق عبر واتساب لتقليل التأخير.</p></article></div></div></section>

<section class="section"><div class="container section-shell"><div class="section-head"><h2>سيارة خاصة vs تاكسي عبر الجسر</h2><p>لماذا يختار المسافرون النقل الخاص door-to-door</p></div>
<p class="footer-copy" style="max-width:720px;line-height:1.85;margin-bottom:20px;">كثير من طلبات GSC تأتي بصيغة «تاكسي من البحرين إلى الدمام» أو «taxi from bahrain to khobar». النقل الخاص مع سائق يعرف مسار الجسر يوفّر استلاماً من المنزل أو المطار، مرونة في المواعيد، ومركبة مناسبة للعائلة. <strong>السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة</strong> — لا نعرض أسعاراً ثابتة على الموقع.</p>
<div class="route-grid"><article class="route-card"><h3>استلام من المنزل أو المطار</h3><p>من مطار البحرين (BAH) أو أي منطقة في المملكة إلى وجهتك في السعودية.</p></article><article class="route-card"><h3>GMC / XL للعائلات</h3><p>6–7 ركاب مع مساحة أمتعة — مناسب للسفر العائلي عبر الجسر.</p></article><article class="route-card"><h3>ذهاب وعودة</h3><p>رحلات <a href="/bahrain-saudi-gcc-transport/dammam-to-bahrain/">من الدمام إلى البحرين</a> و<a href="/bahrain-saudi-gcc-transport/khobar-to-bahrain/">من الخبر إلى البحرين</a> متاحة حسب الطلب.</p></article><article class="route-card"><h3>مطار الدمام DMM</h3><p>توصيل مباشر إلى أو من <a href="/bahrain-saudi-gcc-transport/bahrain-to-dammam-airport/">مطار الدمام</a> عبر الجسر.</p></article></div></div></section>

<section class="section"><div class="container section-shell"><div class="section-head"><h2>مسارات مرتبطة عبر جسر الملك فهد</h2><p>صفحات الحجز الأكثر طلباً</p></div>
<div class="route-grid"><article class="route-card"><h3>البحرين → الدمام</h3><p>8+ نقرات GSC — أقوى مسار سعودي</p><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/bahrain-to-dammam/"><span>احجز الدمام</span><i data-lucide="arrow-up-left"></i></a></article><article class="route-card"><h3>البحرين → الخبر</h3><p>تاكسي ونقل خاص للمنطقة الشرقية</p><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/bahrain-to-khobar/"><span>احجز الخبر</span><i data-lucide="arrow-up-left"></i></a></article><article class="route-card"><h3>الدمام → البحرين</h3><p>مسار العودة — 128+ ظهور GSC</p><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/dammam-to-bahrain/"><span>احجز العودة</span><i data-lucide="arrow-up-left"></i></a></article><article class="route-card"><h3>الخبر → البحرين</h3><p>من الخبر إلى البحرين بالسيارة</p><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/khobar-to-bahrain/"><span>احجز العودة</span><i data-lucide="arrow-up-left"></i></a></article></div></div></section>

<section class="section"><div class="container"><div class="booking-card glass"><div class="section-head"><h2>احجز نقلاً عبر جسر الملك فهد</h2><p>أرسل نقطة الاستلام والوجهة وعدد الركاب والأمتعة والتاريخ — نرد بعرض عبر واتساب</p></div><div class="hero-actions"><a class="primary-btn wa-inline" data-wa-message="مرحباً، أريد حجز نقل من البحرين إلى السعودية عبر جسر الملك فهد. الاستلام: [اكتب الموقع]. الوجهة: [الدمام/الخبر/مطار DMM]. الركاب: [العدد]. التاريخ: [الموعد]."><i data-lucide="message-circle"></i><span>إرسال الطلب على واتساب</span></a><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/passenger-transport/"><span>نقل الركاب</span><i data-lucide="arrow-up-left"></i></a></div></div></div></section>

<section class="section seo-route-faq"><div class="container section-shell"><div class="section-head"><h2>الأسئلة الشائعة عن جسر الملك فهد</h2></div><div class="faq-wrap"><details class="faq-item"><summary>كم يستغرق عبور جسر الملك فهد؟</summary><p>عبور الجسر نفسه غالباً 20–45 دقيقة حسب الازدحام. الرحلة الكاملة إلى الدمام أو الخبر أطول لأنها تشمل القيادة قبل وبعد المعبر.</p></details><details class="faq-item"><summary>ما المستندات المطلوبة لعبور الجسر؟</summary><p>جواز سفر أو هوية خليجية سارية لكل راكب، مع التحقق من متطلبات التأشيرة حسب الجنسية.</p></details><details class="faq-item"><summary>كم يكلف التاكسي أو السيارة الخاصة؟</summary><p>السعر يعتمد على نقطة الاستلام والتوصيل وعدد الركاب والأمتعة والتاريخ وتوفر المركبة. أرسل التفاصيل عبر واتساب للحصول على عرض.</p></details><details class="faq-item"><summary>ما الفرق بين الحجز إلى الدمام والخبر؟</summary><p>نفس الجسر، لكن وجهة التوصيل مختلفة داخل المنطقة الشرقية. حدّد المدينة بدقة عند الحجز.</p></details><details class="faq-item"><summary>هل يمكن التوصيل إلى مطار الدمام؟</summary><p>نعم. نوفر توصيلاً من البحرين إلى مطار الملك فهد (DMM) وبالعكس عبر الجسر.</p></details><details class="faq-item"><summary>هل الخدمة مناسبة للعائلات؟</summary><p>نعم. مركبات GMC/XL تتسع لـ 6–7 ركاب مع أمتعة. أرسل عدد الركاب مسبقاً عبر واتساب.</p></details></div></div></section>
</main>
<footer class="footer"><div class="container footer-grid"><div class="footer-card glass"><h3>Vendora Transport</h3><p class="footer-copy">دليل جسر الملك فهد — نقل خاص من البحرين إلى السعودية</p></div><div class="footer-card glass"><h3>مسارات</h3><div class="footer-links"><a href="/bahrain-saudi-gcc-transport/bahrain-to-dammam/">البحرين → الدمام</a><a href="/bahrain-saudi-gcc-transport/bahrain-to-khobar/">البحرين → الخبر</a><a href="/bahrain-saudi-gcc-transport/bahrain-to-saudi/">البحرين → السعودية</a><a href="/bahrain-saudi-gcc-transport/gcc-destinations/">وجهات الخليج</a></div></div></div></footer>
<a class="floating-wa" data-wa-message="مرحباً، أريد حجز نقل عبر جسر الملك فهد." aria-label="WhatsApp"><i data-lucide="message-circle"></i></a>
<script>window.pageConfig={{"phoneNumber":"97333225954","defaultWhatsAppMessage":"مرحباً، أريد حجز نقل عبر جسر الملك فهد."}};</script><script src="../site.js?v=20260605-care5"></script><script defer src="../../assets/analytics-loader.js"></script></body></html>"""
    # Fix double braces from f-string - I used {{ }} correctly for JSON but pageConfig has issue
    html = html.replace('window.pageConfig={{"phoneNumber"', 'window.pageConfig={"phoneNumber"')
    html = html.replace('"}};', '"};')
    html = html.replace("البahrain", "البحرين")
    write(ROOT / "bahrain-saudi-gcc-transport/king-fahd-causeway-guide/index.html", html)


def guide_shell(
    *,
    slug: str,
    title: str,
    meta_desc: str,
    h1: str,
    lead: str,
    answer_html: str,
    body_html: str,
    faq_items: list[tuple[str, str]],
    cta_h2: str,
    cta_text: str,
    cta_btn_text: str,
    cta_href: str,
    breadcrumb_name: str,
    keywords: str,
) -> str:
    url = f"https://getvendora.net/guides/{slug}/"
    faq_schema = []
    faq_html = []
    for q, a in faq_items:
        faq_schema.append(
            '{"@type": "Question", "name": '
            + json_escape(q)
            + ', "acceptedAnswer": {"@type": "Answer", "text": '
            + json_escape(a)
            + "}}"
        )
        faq_html.append(
            f'    <div class="vendora-faq-item">\n      <h3>{q}</h3>\n      <p>{a}</p>\n    </div>'
        )
    faq_schema_str = ",\n                                          ".join(faq_schema)
    faq_html_str = "\n\n".join(faq_html)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="icon" type="image/png" href="https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png">
  <link rel="apple-touch-icon" href="https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png">
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{meta_desc}" />
  <meta name="keywords" content="{keywords}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="{url}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{meta_desc}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="https://getvendora.net/images/street-bites-featured-wrap.svg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{meta_desc}" />
  <script type="application/ld+json">
{{
    "@context": "https://schema.org",
    "@graph": [
        {{
            "@type": "BreadcrumbList",
            "itemListElement": [
                {{"@type": "ListItem", "position": 1, "name": "GetVendora", "item": "https://getvendora.net/"}},
                {{"@type": "ListItem", "position": 2, "name": "Guides", "item": "https://getvendora.net/guides/"}},
                {{"@type": "ListItem", "position": 3, "name": "{breadcrumb_name}", "item": "{url}"}}
            ]
        }},
        {{
            "@type": "Article",
            "headline": "{h1}",
            "description": "{meta_desc}",
            "mainEntityOfPage": {{"@type": "WebPage", "@id": "{url}"}},
            "author": {{"@type": "Organization", "name": "Vendora Editorial Team"}},
            "publisher": {{
                "@type": "Organization",
                "name": "Vendora",
                "logo": {{"@type": "ImageObject", "url": "https://getvendora.net/images/street-bites-featured-wrap.svg"}}
            }},
            "datePublished": "2026-06-11",
            "dateModified": "2026-06-11",
            "image": "https://getvendora.net/images/street-bites-featured-wrap.svg"
        }},
        {{
            "@type": "FAQPage",
            "mainEntity": [
                {faq_schema_str}
            ]
        }}
    ]
}}
  </script>
  <script defer src="/assets/clarity-helper.js"></script>
{GUIDE_STYLES}
</head>
<body>
<article class="vendora-guide-wrapper">
  <header class="vendora-hero">
    <div class="vendora-hero-bg"></div>
    <div class="vendora-hero-content">
      <h1>{h1}</h1>
      <p class="lead">{lead}</p>
      <div class="vendora-highlight" style="text-align:left;margin:24px auto;max-width:720px;">
        {answer_html}
      </div>
    </div>
  </header>
  <section class="vendora-content">
{body_html}
    <h2>Frequently Asked Questions (FAQ)</h2>
{faq_html_str}
    <div class="vendora-cta-section">
      <h2>{cta_h2}</h2>
      <p>{cta_text}</p>
      <a href="{cta_href}" class="vendora-btn">{cta_btn_text}</a>
    </div>
  </section>
</article>
<script defer src="../../assets/analytics-loader.js"></script>
</body>
</html>"""


def json_escape(s: str) -> str:
    import json

    return json.dumps(s, ensure_ascii=False)


def bmr_calculator_guide() -> None:
    body = """
    <p>Basal metabolic rate (BMR) is the number of calories your body burns at complete rest — before walking, working, or exercise. Our free <a href="/calculators/bmr-calculator/">BMR calculator</a> uses the <strong>Mifflin-St Jeor equation</strong>, which Google Search data shows is one of the highest-impression query clusters for this page (753 impressions, average position 6.4 in the last 90 days).</p>

    <h2>What Is BMR and Why Measure It?</h2>
    <p>BMR represents the energy required for breathing, circulation, cell production, and basic organ function. It is <em>not</em> your total daily calorie target — activity adds on top. Still, BMR is the foundation for nutrition planning, weight management, and fitness coaching.</p>
    <ul>
      <li><strong>Weight loss planning:</strong> Know your resting burn before setting a safe calorie deficit.</li>
      <li><strong>Meal planning:</strong> Dietitians start with BMR before applying activity multipliers.</li>
      <li><strong>Fitness benchmarks:</strong> Compare resting metabolism across cut/bulk phases.</li>
    </ul>

    <h2>The Mifflin-St Jeor Equation</h2>
    <p>Published in 1990, Mifflin-St Jeor is widely used because it performs well across general adult populations. The calculator on GetVendora applies these formulas:</p>
    <div class="vendora-highlight">
      <h4>Women</h4>
      <p><strong>BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161</strong></p>
      <h4>Men</h4>
      <p><strong>BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5</strong></p>
    </div>

    <h2>Worked Examples</h2>
    <div class="vendora-table-wrapper">
      <table class="vendora-table">
        <thead><tr><th>Profile</th><th>Inputs</th><th>Approximate BMR</th></tr></thead>
        <tbody>
          <tr><td>Woman, 30 years</td><td>165 cm, 70 kg</td><td><strong>~1,411 kcal/day</strong></td></tr>
          <tr><td>Man, 30 years</td><td>175 cm, 70 kg</td><td><strong>~1,665 kcal/day</strong></td></tr>
          <tr><td>Woman, 45 years</td><td>160 cm, 65 kg</td><td><strong>~1,315 kcal/day</strong></td></tr>
        </tbody>
      </table>
    </div>
    <p>Use the <a href="/calculators/bmr-calculator/">BMR calculator</a> for your exact numbers — results update instantly with no signup.</p>

    <h2>BMR vs TDEE: What Comes Next?</h2>
    <p>Total daily energy expenditure (TDEE) = BMR × activity factor. Sedentary office work might use 1.2× BMR; very active jobs or athletes might use 1.6–1.9×. BMR alone answers “resting calories”; TDEE answers “what should I eat today?”</p>
    <p>If you are building a restaurant or wellness business on GetVendora, pair this guide with our <a href="/tools/food-cost-calculator/">food cost calculator</a> for menu math — different domain, same precision mindset.</p>

    <h2>How to Use the BMR Calculator Step by Step</h2>
    <ol>
      <li>Enter age, sex, height (cm), and weight (kg).</li>
      <li>Click calculate — the tool applies Mifflin-St Jeor automatically.</li>
      <li>Read the result as <em>resting</em> calories per day.</li>
      <li>Multiply by an activity factor if you need TDEE (see FAQ below).</li>
    </ol>

    <h2>When BMR Estimates May Differ From Reality</h2>
    <p>Equations are population averages. Muscle mass, thyroid conditions, medications, genetics, and pregnancy can shift real metabolism. Treat BMR as a strong starting estimate — not a medical diagnosis.</p>
    """
    faq = [
        (
            "What is the Mifflin-St Jeor equation for women?",
            "BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161. This is the formula used in the GetVendora BMR calculator for female inputs.",
        ),
        (
            "What is the Mifflin-St Jeor equation for men?",
            "BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5. Enter your metrics in the calculator for an instant result.",
        ),
        (
            "What is the difference between BMR and TDEE?",
            "BMR is calories burned at rest. TDEE includes activity — it is typically BMR multiplied by an activity factor (for example 1.2 for sedentary, 1.55 for moderately active).",
        ),
        (
            "Is BMR the same as my daily calorie target?",
            "No. You need additional calories above BMR for daily movement and exercise. Use BMR as the base, then add activity.",
        ),
        (
            "How accurate is the Mifflin-St Jeor equation?",
            "It is among the most validated resting-metabolism formulas for general adults. Individual results can still vary by roughly 10%.",
        ),
        (
            "Which units does the calculator use?",
            "Metric: kilograms for weight, centimeters for height, and years for age — as labeled on the calculator form.",
        ),
    ]
    html = guide_shell(
        slug="bmr-calculator-guide",
        title="BMR Calculator Guide — Mifflin-St Jeor Equation Explained | Vendora",
        meta_desc="Learn BMR and the Mifflin-St Jeor equation with worked examples. Free BMR calculator for men and women — resting calories explained step by step.",
        h1="BMR Calculator Guide: Mifflin-St Jeor Equation & Resting Calories",
        lead="Understand basal metabolic rate, use the Mifflin-St Jeor formula, and calculate resting calories with worked examples. <a href=\"/calculators/bmr-calculator/\">Open the free BMR calculator</a>",
        answer_html="<p><strong>Quick answer:</strong> For a 30-year-old woman (165 cm, 70 kg), Mifflin-St Jeor gives BMR ≈ <strong>1,411 kcal/day</strong> at rest. For a 30-year-old man (175 cm, 70 kg), BMR ≈ <strong>1,665 kcal/day</strong>. Use the calculator below for your numbers.</p>",
        body_html=body,
        faq_items=faq,
        cta_h2="Calculate Your BMR Now",
        cta_text="Get an instant resting calorie estimate with the free Mifflin-St Jeor BMR calculator — no signup required.",
        cta_btn_text="Open BMR Calculator",
        cta_href="https://getvendora.net/calculators/bmr-calculator/",
        breadcrumb_name="BMR Calculator Guide",
        keywords="BMR calculator guide, mifflin-st jeor equation, basal metabolic rate, BMR formula women, BMR formula men",
    )
    write(ROOT / "guides/bmr-calculator-guide/index.html", html)


def reverse_commission_guide() -> None:
    body = """
    <p>A <strong>reverse commission calculator</strong> answers the opposite question from a normal sales commission tool. Instead of “how much do I earn on this sale?” you ask: <em>“what was the original sale if I earned this commission at this rate?”</em> GetVendora’s <a href="/tools/commission-calculator/">commission calculator</a> includes reverse mode — and this guide explains the math behind it.</p>

    <h2>What Is Reverse Commission?</h2>
    <p>Standard commission: <strong>Commission = Sales × (Rate ÷ 100)</strong></p>
    <p>Reverse commission: <strong>Sales = Commission ÷ (Rate ÷ 100)</strong></p>
    <p>Example: you earned <strong>$240</strong> at an <strong>8%</strong> rate. Original sale = $240 ÷ 0.08 = <strong>$3,000</strong>. This matches a common Google Search word-problem pattern (32 impressions, position ~6.6 in recent GSC data).</p>

    <h2>When You Need Reverse Commission Math</h2>
    <ul>
      <li><strong>Sales reps verifying payouts:</strong> You received a commission deposit but not the gross sale on the statement.</li>
      <li><strong>Managers auditing deals:</strong> Confirm the implied sale size from a commission line item.</li>
      <li><strong>Freelancers &amp; caterers:</strong> A booking agent took 10% — you know their fee, not the client’s total contract value.</li>
      <li><strong>Homework &amp; training:</strong> Word problems like “8% commission on a laptop sale earned $240 — what was the price?”</li>
    </ul>

    <h2>Reverse Commission Formula Step by Step</h2>
    <ol>
      <li>Convert the rate to decimal: 8% → 0.08</li>
      <li>Divide commission by that decimal: $240 ÷ 0.08 = $3,000</li>
      <li>Check forward: $3,000 × 0.08 = $240 ✓</li>
    </ol>
    <div class="vendora-table-wrapper">
      <table class="vendora-table">
        <thead><tr><th>Commission earned</th><th>Rate</th><th>Implied sale (reverse)</th></tr></thead>
        <tbody>
          <tr><td>$240</td><td>8%</td><td>$3,000</td></tr>
          <tr><td>$500</td><td>10%</td><td>$5,000</td></tr>
          <tr><td>$150</td><td>5%</td><td>$3,000</td></tr>
          <tr><td>$600</td><td>12%</td><td>$5,000</td></tr>
        </tbody>
      </table>
    </div>

    <h2>Worked Word Problem</h2>
    <p><strong>Question:</strong> A salesperson earns 8% commission on every laptop sold. If they earned $240 in commission from one sale, what was the price of the laptop?</p>
    <p><strong>Solution:</strong> Sale = $240 ÷ 0.08 = <strong>$3,000</strong>.</p>
    <p>Open the <a href="/tools/commission-calculator/">commission calculator</a>, use the reverse commission section, enter $240 commission and 8% rate — the tool returns the same $3,000 sale.</p>

    <h2>Reverse Rate vs Reverse Sale</h2>
    <p>Two related reverse calculations appear in business:</p>
    <ul>
      <li><strong>Find the sale</strong> (given commission + rate) — covered above.</li>
      <li><strong>Find the effective rate</strong> (given commission + sale): Rate = (Commission ÷ Sales) × 100. Example: $240 on $3,000 → 8%.</li>
    </ul>
    <p>For full payout planning including base salary, see our <a href="/guides/commission-calculator-guide/">commission calculator guide</a>.</p>

    <h2>Common Mistakes</h2>
    <h3>1. Forgetting to Convert the Percentage</h3>
    <p>Dividing $240 by 8 instead of 0.08 gives $30 — wrong by a factor of 100. Always divide by the decimal form of the rate.</p>
    <h3>2. Using Net Commission on Gross Sales</h3>
    <p>If taxes or fees were removed before commission was calculated, reverse the same base amount your plan uses — usually net sales, not invoice total with tax.</p>
    <h3>3. Mixing Up Tiered Rates</h3>
    <p>Reverse math assumes a single flat rate. Tiered plans need segment-by-segment calculation.</p>
    """
    faq = [
        (
            "What is a reverse commission calculator?",
            "It finds the original sale amount when you know the commission paid and the commission rate. Formula: Sales = Commission ÷ (Rate ÷ 100).",
        ),
        (
            "How do you calculate reverse commission?",
            "Divide the commission amount by the rate expressed as a decimal. Example: $240 at 8% → $240 ÷ 0.08 = $3,000 sale.",
        ),
        (
            "If I earned $240 at 8% commission, what was the sale?",
            "$3,000. Check: $3,000 × 0.08 = $240.",
        ),
        (
            "How do you find commission rate from a sale?",
            "Divide commission by sales and multiply by 100. Example: $240 ÷ $3,000 × 100 = 8%.",
        ),
        (
            "Can reverse commission include base salary?",
            "No. Reverse commission isolates the variable commission portion. Base salary is added separately in total pay calculations.",
        ),
        (
            "Where is the reverse commission tool on GetVendora?",
            "Use the reverse mode in the free <a href=\"/tools/commission-calculator/\">commission calculator</a> — enter commission amount and rate to find the sale.",
        ),
    ]
    # Fix FAQ answer with HTML link - use plain text for schema
    faq[-1] = (
        "Where is the reverse commission tool on GetVendora?",
        "Use the reverse mode in the free commission calculator at getvendora.net/tools/commission-calculator/ — enter commission amount and rate to find the sale.",
    )
    html = guide_shell(
        slug="reverse-commission-calculator-guide",
        title="Reverse Commission Calculator Guide — Find the Original Sale | Vendora",
        meta_desc="Reverse commission formula explained: find the original sale from commission pay and rate. Examples, word problems, and free calculator.",
        h1="Reverse Commission Calculator Guide: Find the Original Sale",
        lead="Earned a commission but need the sale amount? Learn the reverse formula with examples. <a href=\"/tools/commission-calculator/\">Use the free reverse commission calculator</a>",
        answer_html="<p><strong>Quick answer:</strong> <strong>Sales = Commission ÷ (Rate ÷ 100)</strong>. If you earned <strong>$240</strong> at <strong>8%</strong>, the sale was <strong>$3,000</strong> because $240 ÷ 0.08 = $3,000.</p>",
        body_html=body,
        faq_items=faq,
        cta_h2="Run the Reverse Calculation",
        cta_text="Enter your commission amount and rate in the free commission calculator — reverse mode finds the original sale instantly.",
        cta_btn_text="Open Commission Calculator",
        cta_href="https://getvendora.net/tools/commission-calculator/",
        breadcrumb_name="Reverse Commission Calculator Guide",
        keywords="reverse commission calculator, reverse commission formula, find sale from commission, commission word problem",
    )
    write(ROOT / "guides/reverse-commission-calculator-guide/index.html", html)


def add_cross_links() -> None:
    transport_block = f"""
{MARKER}
<article class="route-card"><h3>دليل جسر الملك فهد</h3><p>مدة العبور، المستندات، ونقل خاص إلى الدمام والخبر</p><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/"><span>اقرأ الدليل</span><i data-lucide="arrow-up-left"></i></a></article>"""
    for rel in (
        "bahrain-saudi-gcc-transport/bahrain-to-dammam/index.html",
        "bahrain-saudi-gcc-transport/bahrain-to-khobar/index.html",
        "bahrain-saudi-gcc-transport/dammam-to-bahrain/index.html",
        "bahrain-saudi-gcc-transport/khobar-to-bahrain/index.html",
    ):
        patch_once(ROOT / rel, '<div class="route-grid">', transport_block)

    bmr_block = f' · <a href="../../guides/bmr-calculator-guide/" style="margin-right:12px;">BMR calculator guide</a>'
    p = ROOT / "calculators/bmr-calculator/index.html"
    if MARKER not in p.read_text(encoding="utf-8"):
        text = p.read_text(encoding="utf-8")
        if "BMR calculator guide" not in text:
            text = text.replace(
                '<a href="../../guides/delivery-commission-calculator-guide/"',
                f'{MARKER}<a href="../../guides/bmr-calculator-guide/" style="margin-right:12px;">BMR calculator guide</a> · <a href="../../guides/delivery-commission-calculator-guide/"',
                1,
            )
            p.write_text(text, encoding="utf-8")
            print(f"Linked {p.relative_to(ROOT)}")

    comm_related = """
      <p class="related-links">
        <a href="/guides/reverse-commission-calculator-guide/">Reverse commission guide</a> |
        <a href="/guides/commission-calculator-guide/">Commission calculator guide</a> |"""
    p = ROOT / "tools/commission-calculator/index.html"
    if MARKER not in p.read_text(encoding="utf-8"):
        text = p.read_text(encoding="utf-8")
        old = '      <p class="related-links">\n        <a href="/guides/commission-calculator-guide/">Commission calculator guide</a> |'
        if old in text:
            text = text.replace(old, f"{MARKER}{comm_related}", 1)
            p.write_text(text, encoding="utf-8")
            print(f"Linked {p.relative_to(ROOT)}")

    cg = ROOT / "guides/commission-calculator-guide/index.html"
    if cg.exists() and MARKER not in cg.read_text(encoding="utf-8"):
        text = cg.read_text(encoding="utf-8")
        needle = '<a href="https://getvendora.net/tools/commission-calculator/">commission calculator</a> will instantly process'
        if needle in text:
            insert = ' Need reverse math? Read our <a href="/guides/reverse-commission-calculator-guide/">reverse commission calculator guide</a>. The '
            text = text.replace("The ", insert, 1)
            text = text.replace(f"{MARKER}{insert}", insert.replace(MARKER, MARKER + "\n      ", 1), 1)
        # simpler: add before CTA
        cta = '<div class="vendora-cta-section">'
        block = f'{MARKER}\n    <p>Working backward from a commission payout? See the <a href="/guides/reverse-commission-calculator-guide/">reverse commission calculator guide</a> or use <a href="/tools/commission-calculator/">reverse mode in the tool</a>.</p>\n    '
        if cta in text and MARKER not in text:
            text = text.replace(cta, block + cta, 1)
            cg.write_text(text, encoding="utf-8")
            print(f"Linked {cg.relative_to(ROOT)}")


def main() -> None:
    king_fahd_causeway_guide()
    bmr_calculator_guide()
    reverse_commission_guide()
    add_cross_links()
    print("Phase 12 complete.")


if __name__ == "__main__":
    main()
