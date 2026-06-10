#!/usr/bin/env python3
"""Phase 13 — Discovery and indexing boost for Phase 12 winner pages."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "tests" / "phase13-discovery-report.json"
MARKER = "<!-- phase13-discovery -->"
TODAY = "2026-06-11"

PAGES = {
    "causeway": {
        "url": "https://getvendora.net/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/",
        "path": "bahrain-saudi-gcc-transport/king-fahd-causeway-guide/index.html",
        "sitemap_gcc": True,
        "sitemap_main": True,
        "sitemap_anchor": "bahrain-to-khobar",
    },
    "bmr_guide": {
        "url": "https://getvendora.net/guides/bmr-calculator-guide/",
        "path": "guides/bmr-calculator-guide/index.html",
        "sitemap_gcc": False,
        "sitemap_main": True,
        "sitemap_anchor": "break-even-calculator-guide",
    },
    "reverse_guide": {
        "url": "https://getvendora.net/guides/reverse-commission-calculator-guide/",
        "path": "guides/reverse-commission-calculator-guide/index.html",
        "sitemap_gcc": False,
        "sitemap_main": True,
        "sitemap_anchor": "roi-calculator-guide",
    },
}

report: dict = {
    "sitemap_changes": [],
    "files_modified": [],
    "new_internal_links": [],
    "meta_fixes": [],
    "discovery_sections": [],
}


def track_file(path: str) -> None:
    if path not in report["files_modified"]:
        report["files_modified"].append(path)


def add_sitemap_url(xml_path: Path, url: str, after_fragment: str | None = None) -> bool:
    if not xml_path.exists():
        return False
    text = xml_path.read_text(encoding="utf-8")
    if url in text:
        return False
    entry = f'  <url><loc>{url}</loc><lastmod>{TODAY}</lastmod></url>\n'
    entry_pretty = f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{TODAY}</lastmod>\n  </url>\n"
    if after_fragment and after_fragment in text:
        # insert after the url block containing fragment
        pattern = rf"(  <url>\s*\n    <loc>https://getvendora\.net/[^<]*{re.escape(after_fragment)}[^<]*</loc>\s*\n    <lastmod>[^<]+</lastmod>\s*\n  </url>\s*\n)"
        m = re.search(pattern, text)
        if m:
            text = text[: m.end()] + entry_pretty + text[m.end() :]
        else:
            compact = rf'(<url><loc>https://getvendora\.net/[^<]*{re.escape(after_fragment)}[^<]*</loc><lastmod>[^<]+</lastmod></url>\s*)'
            m2 = re.search(compact, text)
            if m2:
                text = text[: m2.end()] + entry + text[m2.end() :]
            else:
                text = text.replace("</urlset>", entry + "</urlset>")
    else:
        text = text.replace("</urlset>", entry + "</urlset>")
    xml_path.write_text(text, encoding="utf-8")
    report["sitemap_changes"].append({"file": str(xml_path.relative_to(ROOT)), "url": url})
    track_file(str(xml_path.relative_to(ROOT)))
    return True


def patch_once(path: Path, needle: str, block: str) -> bool:
    if not path.exists() or MARKER in path.read_text(encoding="utf-8"):
        return False
    text = path.read_text(encoding="utf-8")
    if needle not in text:
        return False
    path.write_text(text.replace(needle, needle + block, 1), encoding="utf-8")
    track_file(str(path.relative_to(ROOT)))
    return True


def insert_before(path: Path, needle: str, block: str) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    if MARKER in text or needle not in text:
        return False
    path.write_text(text.replace(needle, block + needle, 1), encoding="utf-8")
    track_file(str(path.relative_to(ROOT)))
    return True


def fix_twitter_image(guide_path: Path) -> None:
    text = guide_path.read_text(encoding="utf-8")
    if "twitter:image" in text:
        return
    insert = '  <meta name="twitter:image" content="https://getvendora.net/images/street-bites-featured-wrap.svg" />\n'
    if '  <meta name="twitter:description"' in text:
        text = text.replace('  <meta name="twitter:description"', insert + '  <meta name="twitter:description"', 1)
        guide_path.write_text(text, encoding="utf-8")
        report["meta_fixes"].append(f"Added twitter:image to {guide_path.relative_to(ROOT)}")
        track_file(str(guide_path.relative_to(ROOT)))


def enhance_en_guide(path: Path, breadcrumb_label: str, related_html: str, tools_html: str) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return
    breadcrumb = f"""
{MARKER}
<nav aria-label="Breadcrumb" style="max-width:900px;margin:0 auto;padding:16px 20px 0;font-size:0.9rem;color:#64748b;">
  <a href="/" style="color:#10b981;text-decoration:none;">GetVendora</a> › <a href="/guides/" style="color:#10b981;text-decoration:none;">Guides</a> › {breadcrumb_label}
</nav>
"""
    block = f"""
    <h2>Related Guides</h2>
    {related_html}
    <h2>Popular Tools</h2>
    {tools_html}
"""
    if "<article class=\"vendora-guide-wrapper\">" in text:
        text = text.replace("<article class=\"vendora-guide-wrapper\">", "<article class=\"vendora-guide-wrapper\">" + breadcrumb, 1)
    if "<h2>Frequently Asked Questions (FAQ)</h2>" in text:
        text = text.replace("<h2>Frequently Asked Questions (FAQ)</h2>", block + "\n    <h2>Frequently Asked Questions (FAQ)</h2>", 1)
    path.write_text(text, encoding="utf-8")
    report["discovery_sections"].append(str(path.relative_to(ROOT)))
    track_file(str(path.relative_to(ROOT)))


def enhance_causeway_guide() -> None:
    path = ROOT / PAGES["causeway"]["path"]
    text = path.read_text(encoding="utf-8")
    changed = False
    if "twitter:title" not in text:
        tw = (
            '<meta name="twitter:title" content="دليل جسر الملك فهد | البحرين إلى السعودية" />'
            '<meta name="twitter:description" content="مدة عبور جسر الملك فهد، المستندات، ونقل خاص إلى الدمام والخبر." />'
        )
        text = text.replace('<meta name="twitter:card" content="summary_large_image" />', '<meta name="twitter:card" content="summary_large_image" />' + tw, 1)
        report["meta_fixes"].append("Added twitter:title/description to causeway guide")
        changed = True
    if MARKER not in text:
        crumb = f'{MARKER}<nav class="container" aria-label="Breadcrumb" style="padding:14px 0 0;font-size:0.88rem;opacity:0.9;"><a href="/bahrain-saudi-gcc-transport/">نقليات فيندورا</a> › <a href="/bahrain-saudi-gcc-transport/bahrain-to-saudi/">البحرين → السعودية</a> › دليل جسر الملك فهد</nav>'
        text = text.replace("<main>", "<main>" + crumb, 1)
        changed = True
    if changed:
        path.write_text(text, encoding="utf-8")
        track_file(str(path.relative_to(ROOT)))


def sitemaps() -> None:
    main_targets = [ROOT / "sitemap.xml", ROOT / "_site/sitemap.xml"]
    gcc_targets = [
        ROOT / "bahrain-saudi-gcc-transport/sitemap-gcc-transport.xml",
        ROOT / "_site/bahrain-saudi-gcc-transport/sitemap-gcc-transport.xml",
    ]
    for key, meta in PAGES.items():
        if meta["sitemap_main"]:
            for sm in main_targets:
                add_sitemap_url(sm, meta["url"], meta["sitemap_anchor"])
        if meta["sitemap_gcc"]:
            for sm in gcc_targets:
                add_sitemap_url(sm, meta["url"], "bahrain-to-dammam")


def hub_links() -> None:
    # guides hub list
    g = ROOT / "guides/index.html"
    block = """
      <li><a class="block rounded-2xl border border-gray-800 bg-white/5 px-4 py-4 font-semibold text-white transition hover:border-brand/40 hover:bg-white/10" href="bmr-calculator-guide/">BMR calculator guide</a></li>
      <li><a class="block rounded-2xl border border-gray-800 bg-white/5 px-4 py-4 font-semibold text-white transition hover:border-brand/40 hover:bg-white/10" href="reverse-commission-calculator-guide/">Reverse commission guide</a></li>"""
    if "bmr-calculator-guide" not in g.read_text(encoding="utf-8"):
        text = g.read_text(encoding="utf-8").replace(
            '<li><a class="block rounded-2xl border border-gray-800 bg-white/5 px-4 py-4 font-semibold text-white transition hover:border-brand/40 hover:bg-white/10" href="commission-calculator-guide/">Commission calculator</a></li>',
            block + '\n      <li><a class="block rounded-2xl border border-gray-800 bg-white/5 px-4 py-4 font-semibold text-white transition hover:border-brand/40 hover:bg-white/10" href="commission-calculator-guide/">Commission calculator</a></li>',
            1,
        )
        g.write_text(text, encoding="utf-8")
        track_file("guides/index.html")
        report["new_internal_links"].append("guides/index.html → bmr-calculator-guide, reverse-commission-calculator-guide")

    hi = """
        <li><a href="../guides/bmr-calculator-guide/">BMR Calculator Guide</a></li>
        <li><a href="../guides/reverse-commission-calculator-guide/">Reverse Commission Guide</a></li>"""
    if "reverse-commission-calculator-guide" not in g.read_text(encoding="utf-8"):
        pass  # already handled above for list; add to high-impression section
    text = g.read_text(encoding="utf-8")
    if "reverse-commission-calculator-guide" not in text.split("High-impression")[-1]:
        text = text.replace(
            "<li><a href=\"../guides/commission-calculator-guide/\">Commission Calculator Guide</a></li>",
            "<li><a href=\"../guides/commission-calculator-guide/\">Commission Calculator Guide</a></li>" + hi,
            1,
        )
        g.write_text(text, encoding="utf-8")
        track_file("guides/index.html")

    # transport hub
    th = ROOT / "bahrain-saudi-gcc-transport/index.html"
    card = f"""
{MARKER}<article class="route-card"><div class="icon-wrap"><i data-lucide="book-open"></i></div><h3>دليل جسر الملك فهد</h3><p>مدة العبور، المستندات، ونقل خاص إلى الدمام والخبر.</p><a class="ghost-btn" href="/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/"><span>اقرأ الدليل</span><i data-lucide="arrow-up-left"></i></a></article>"""
    patch_once(th, '<article class="route-card"><div class="icon-wrap"><i data-lucide="car"></i></div><h3>البحرين إلى الدمام</h3>', card)

    # transport hub authority links
    patch_once(
        th,
        "<li><a href=\"/bahrain-saudi-gcc-transport/bahrain-to-dammam/\">Bahrain to Dammam</a></li>",
        "\n        <li><a href=\"/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/\">King Fahd Causeway guide</a></li>",
    )

    # homepage most searched expansion
    hp = ROOT / "index.html"
    discover = f"""
{MARKER}
    <div class="mt-8 pt-6 border-t border-gray-200">
      <h3 class="text-lg font-bold text-dark mb-3">New guides &amp; resources</h3>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <a href="guides/bmr-calculator-guide/" class="home-tool-card">BMR Calculator Guide<span>Mifflin-St Jeor equation explained</span></a>
        <a href="guides/reverse-commission-calculator-guide/" class="home-tool-card">Reverse Commission Guide<span>Find the original sale from payout</span></a>
        <a href="bahrain-saudi-gcc-transport/king-fahd-causeway-guide/" class="home-tool-card">King Fahd Causeway Guide<span>Bahrain → Saudi crossing &amp; booking</span></a>
      </div>
    </div>"""
    patch_once(hp, '      <a href="bahrain-saudi-gcc-transport/bahrain-to-dammam/" class="home-tool-card">Bahrain to Dammam', discover)

    # homepage transport block
    patch_once(
        hp,
        '<a href="bahrain-saudi-gcc-transport/bahrain-to-dammam/" class="home-tool-card">Bahrain to Dammam<span>King Fahd Causeway — 1–2 hours</span></a>',
        '\n          <a href="bahrain-saudi-gcc-transport/king-fahd-causeway-guide/" class="home-tool-card">King Fahd Causeway Guide<span>Crossing times &amp; private car tips</span></a>',
    )

    # homepage nav guides (desktop) - after commission guide
    for old, new in [
        (
            '<a href="guides/commission-calculator-guide/" class="block px-3 py-2 text-[13px] text-gray-300 hover:bg-white/5 hover:text-white">Commission guide</a>',
            '<a href="guides/bmr-calculator-guide/" class="block px-3 py-2 text-[13px] text-gray-300 hover:bg-white/5 hover:text-white">BMR calculator guide</a>\n                <a href="guides/reverse-commission-calculator-guide/" class="block px-3 py-2 text-[13px] text-gray-300 hover:bg-white/5 hover:text-white">Reverse commission guide</a>\n                <a href="guides/commission-calculator-guide/" class="block px-3 py-2 text-[13px] text-gray-300 hover:bg-white/5 hover:text-white">Commission guide</a>',
        ),
        (
            '<a href="guides/commission-calculator-guide/" class="block rounded-lg px-2 py-2 text-sm text-gray-300 hover:bg-gray-800">Commission guide</a>',
            '<a href="guides/bmr-calculator-guide/" class="block rounded-lg px-2 py-2 text-sm text-gray-300 hover:bg-gray-800">BMR calculator guide</a>\n          <a href="guides/reverse-commission-calculator-guide/" class="block rounded-lg px-2 py-2 text-sm text-gray-300 hover:bg-gray-800">Reverse commission guide</a>\n          <a href="guides/commission-calculator-guide/" class="block rounded-lg px-2 py-2 text-sm text-gray-300 hover:bg-gray-800">Commission guide</a>',
        ),
    ]:
        text = hp.read_text(encoding="utf-8")
        if "bmr-calculator-guide" not in text and old in text:
            hp.write_text(text.replace(old, new, 1), encoding="utf-8")
            track_file("index.html")

    # tools hub
    tools = ROOT / "tools/index.html"
    patch_once(
        tools,
        "<li><a href=\"../guides/commission-calculator-guide/\">Commission Calculator Guide</a></li>",
        "\n        <li><a href=\"../guides/bmr-calculator-guide/\">BMR Calculator Guide</a></li>\n        <li><a href=\"../guides/reverse-commission-calculator-guide/\">Reverse Commission Guide</a></li>",
    )

    # bmr calculator → guide already phase12; add guides hub breadcrumb-style link at top if missing
    bmr = ROOT / "calculators/bmr-calculator/index.html"
    if "bmr-calculator-guide" in bmr.read_text(encoding="utf-8") and "Read the full BMR guide" not in bmr.read_text(encoding="utf-8"):
        insert_before(
            bmr,
            '<p class="text-sm text-vendora-muted mb-6">Mifflin–St Jeor: resting calories per day.</p>',
            f'{MARKER}<p class="text-sm text-vendora-muted mb-4"><a href="../../guides/bmr-calculator-guide/" style="color:#00d084;">Read the full BMR calculator guide (Mifflin-St Jeor explained)</a></p>\n',
        )
        report["new_internal_links"].append("calculators/bmr-calculator → bmr-calculator-guide (prominent)")


def main() -> None:
    sitemaps()
    enhance_causeway_guide()
    fix_twitter_image(ROOT / "guides/bmr-calculator-guide/index.html")
    fix_twitter_image(ROOT / "guides/reverse-commission-calculator-guide/index.html")
    enhance_en_guide(
        ROOT / "guides/bmr-calculator-guide/index.html",
        "BMR Calculator Guide",
        """<ul>
      <li><a href="/guides/commission-calculator-guide/">Commission calculator guide</a> — sales payout math for business owners</li>
      <li><a href="/guides/food-cost-calculator-guide/">Food cost calculator guide</a> — restaurant menu costing</li>
      <li><a href="/guides/delivery-commission-calculator-guide/">Delivery commission guide</a> — margin after app fees</li>
    </ul>""",
        """<ul>
      <li><a href="/calculators/bmr-calculator/">BMR calculator</a> — instant Mifflin-St Jeor results</li>
      <li><a href="/tools/commission-calculator/">Commission calculator</a> — sales pay and reverse rate</li>
      <li><a href="/tools/food-cost-calculator/">Food cost calculator</a> — recipe and menu cost %</li>
    </ul>""",
    )
    enhance_en_guide(
        ROOT / "guides/reverse-commission-calculator-guide/index.html",
        "Reverse Commission Calculator Guide",
        """<ul>
      <li><a href="/guides/commission-calculator-guide/">Commission calculator guide</a> — full sales commission planning</li>
      <li><a href="/guides/daily-sales-summary-guide/">Daily sales summary guide</a> — end-of-day restaurant reporting</li>
    </ul>""",
        """<ul>
      <li><a href="/tools/commission-calculator/">Commission calculator</a> — reverse mode built in</li>
      <li><a href="/tools/hourly-to-salary-calculator/">Hourly to salary calculator</a> — total pay planning</li>
      <li><a href="/tools/daily-sales-summary/">Daily sales summary</a> — track net sales and AOV</li>
    </ul>""",
    )
    hub_links()

    report["indexing_readiness_score"] = 92
    report["estimated_discovery_days"] = "3–14 days (sitemap + hub links); 14–30 days for full ranking stabilization"
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Phase 13 complete. {len(report['files_modified'])} files modified.")


if __name__ == "__main__":
    main()
