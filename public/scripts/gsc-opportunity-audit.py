#!/usr/bin/env python3
"""GSC opportunity audit + safe title/meta auto-fix."""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from html import escape, unescape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
GSC = ROOT / "tests" / "gsc-performance-analysis.json"
OUT = ROOT / "tests" / "gsc-opportunity-report.json"

SECTION_RULES = [
    ("Homepage", lambda p: p in ("", "/")),
    ("Airport pages", lambda p: "airport" in p and "/bahrain-saudi-gcc-transport/" in p),
    ("Iraq/Ziyarat pages", lambda p: "/bahrain-saudi-gcc-transport/" in p and any(
        x in p for x in ("iraq", "karbala", "najaf", "arbaeen", "ziyarat", "baghdad", "basra", "pilgrim")
    )),
    ("Transport pages", lambda p: p.startswith("/bahrain-saudi-gcc-transport/")),
    ("PDF tools", lambda p: "/tools/pdf-converter/" in p),
    ("Tools", lambda p: p.startswith("/tools/")),
    ("Calculators", lambda p: p.startswith("/calculators/") or p.startswith("/calculator/")),
    ("Guides", lambda p: p.startswith("/guides/")),
    ("Restaurant/POS pages", lambda p: p.startswith("/restaurant-calculators/") or p in ("/about/", "/contact/", "/")),
]


def classify(path: str) -> str:
    for name, fn in SECTION_RULES:
        if fn(path):
            return name
    return "Other"


def load_sitemap_urls() -> set[str]:
    urls: set[str] = set()
    files = [
        ROOT / "sitemap.xml",
        ROOT / "sitemap-tools.xml",
        ROOT / "bahrain-saudi-gcc-transport/sitemap-gcc-transport.xml",
        ROOT / "bahrain-saudi-gcc-transport/sitemap-gcc-transport-en.xml",
    ]
    for sm in files:
        if not sm.exists():
            continue
        tree = ET.parse(sm)
        for loc in tree.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc") + tree.findall(".//loc"):
            u = loc.text.strip()
            if u.endswith(".xml"):
                continue
            p = urlparse(u).path
            if not p.endswith("/"):
                p += "/"
            urls.add(p)
    return urls


def path_to_file(path: str) -> Path | None:
    rel = path.strip("/")
    if not rel:
        f = ROOT / "index.html"
    else:
        f = ROOT / rel / "index.html"
    return f if f.exists() else None


def get_meta(content: str, name: str) -> str:
    m = re.search(rf'<meta\s+name="{re.escape(name)}"\s+content="([^"]*)"', content, re.I)
    return unescape(m.group(1)) if m else ""


def get_title(content: str) -> str:
    m = re.search(r"<title>([^<]*)</title>", content, re.I)
    return unescape(m.group(1)) if m else ""


def get_h1(content: str) -> str:
    m = re.search(r"<h1[^>]*>([\s\S]*?)</h1>", content, re.I)
    if not m:
        return ""
    return re.sub(r"<[^>]+>", "", m.group(1)).strip()


def set_title(content: str, title: str) -> str:
    return re.sub(r"<title>[^<]*</title>", f"<title>{escape(title, quote=False)}</title>", content, count=1, flags=re.I)


def set_meta_description(content: str, desc: str) -> str:
    if re.search(r'<meta\s+name="description"', content, re.I):
        return re.sub(
            r'(<meta\s+name="description"\s+content=")([^"]*)(")',
            lambda m: m.group(1) + escape(desc, quote=True) + m.group(3),
            content,
            count=1,
            flags=re.I,
        )
    insert = f'  <meta name="description" content="{escape(desc, quote=True)}" />\n'
    return re.sub(r"(</head>)", insert + r"\1", content, count=1, flags=re.I)


def set_og(content: str, title: str, desc: str) -> str:
    content = re.sub(
        r'(<meta\s+property="og:title"\s+content=")([^"]*)(")',
        lambda m: m.group(1) + escape(title, quote=True) + m.group(3),
        content,
        count=1,
        flags=re.I,
    )
    content = re.sub(
        r'(<meta\s+property="og:description"\s+content=")([^"]*)(")',
        lambda m: m.group(1) + escape(desc, quote=True) + m.group(3),
        content,
        count=1,
        flags=re.I,
    )
    return content


def set_h1(content: str, h1: str) -> str:
    return re.sub(
        r"(<h1[^>]*>)([\s\S]*?)(</h1>)",
        lambda m: m.group(1) + escape(h1, quote=False) + m.group(3),
        content,
        count=1,
        flags=re.I,
    )


FIXES: dict[str, dict[str, str]] = {
    "/bahrain-saudi-gcc-transport/bahrain-to-oman/": {
        "title": "من البحرين إلى عمان بسيارة خاصة | كم ساعة بالسيارة | 24 ساعة | Vendora",
        "description": "كم ساعة من البحرين إلى عمان بالسيارة؟ رحلة 8–10 ساعات بسيارة GMC/XL خاصة، توصيل باب لباب، حجز واتساب فوري من Vendora Transport.",
        "h1": "حجز نقل خاص من البحرين إلى عمان — كم ساعة بالسيارة؟",
    },
    "/bahrain-saudi-gcc-transport/khobar-to-bahrain/": {
        "title": "من الخبر إلى البحرين بسيارة خاصة | تاكسي ونقل 24 ساعة | Vendora",
        "description": "نقل خاص من الخبر إلى البحرين عبر جسر الملك فهد. سائق خاص، GMC/XL، استلام من الفندق أو المطار. احجز عبر واتساب خلال دقيقة.",
        "h1": "نقل من الخبر إلى البحرين بسيارة خاصة",
    },
    "/bahrain-saudi-gcc-transport/bahrain-airport-transfer/": {
        "title": "توصيل مطار البحرين BAH | استقبال وتاكسي مطار 24 ساعة | Vendora",
        "description": "توصيل واستقبال مطار البحرين (BAH): سائق خاص، GMC/XL، تتبع الرحلة، حجز واتساب فوري. خدمة 24/7 من وإلى مطار البحرين.",
        "h1": "توصيل واستقبال مطار البحرين BAH",
    },
    "/bahrain-saudi-gcc-transport/parcel-delivery/": {
        "title": "توصيل طرود من البحرين إلى السعودية والخليج | شحن بري خاص | Vendora",
        "description": "توصيل طرود وشحن بري خاص بين البحرين والسعودية ودول الخليج. تسليم باب لباب، تتبع عبر واتساب، حجز سريع 24 ساعة.",
        "h1": "توصيل طرود بين البحرين والسعودية ودول الخليج",
    },
    "/bahrain-saudi-gcc-transport/bahrain-to-dammam/": {
        "title": "من البحرين إلى الدمام بسيارة خاصة | 1–2 ساعة | جسر الملك فهد | Vendora",
        "description": "توصيل من البحرين إلى الدمام بسيارة خاصة عبر جسر الملك فهد. مدة 1–2 ساعة، GMC/XL، مطار DMM، حجز واتساب فوري 24/7.",
    },
    "/calculators/bmr-calculator/": {
        "title": "BMR Calculator — Mifflin-St Jeor Equation | Free Online",
        "description": "Free BMR calculator using the Mifflin-St Jeor equation. Calculate basal metabolic rate for men and women instantly — no signup.",
    },
    "/tools/commission-calculator/": {
        "title": "Commission Calculator — Sales, Retail & Reverse Commission | Free",
        "description": "Calculate sales commission, retail margin commission, and reverse commission instantly. Free online tool for reps, stores, and small business.",
    },
    "/": {
        "title": "Vendora | Free Tools, GCC Transport Bahrain–Saudi & Restaurant Apps",
        "description": "Vendora: free business calculators, PDF tools, restaurant apps, and private Bahrain–Saudi–GCC transport booking via WhatsApp. Tools + transport in one place.",
    },
    "/about/": {
        "title": "About Vendora | Free Business Tools & GCC Transport Services",
        "description": "Vendora offers free restaurant tools, business calculators, and private Bahrain–Saudi–GCC transport. Learn about our tools and transport services.",
    },
    "/guides/delivery-commission-calculator-guide/": {
        "title": "Delivery Commission Calculator Guide — Uber Eats, Talabat & More",
        "description": "Learn how delivery marketplace commissions affect restaurant profit. Step-by-step guide with free calculator for Uber Eats, Talabat, and direct orders.",
    },
    "/bahrain-saudi-gcc-transport/dammam-to-bahrain/": {
        "title": "من الدمام إلى البحرين بسيارة خاصة | تاكسي ونقل 24 ساعة | Vendora",
        "description": "نقل من الدمام إلى البحرين بسيارة خاصة عبر جسر الملك فهد. سائق خاص، GMC/XL، استلام من DMM أو الفندق. حجز واتساب فوري.",
        "h1": "نقل من الدمام إلى البحرين بسيارة خاصة",
    },
}


def apply_fixes() -> list[str]:
    modified: list[str] = []
    for path, changes in FIXES.items():
        f = path_to_file(path)
        if not f:
            continue
        original = f.read_text(encoding="utf-8", errors="ignore")
        html = original
        if "title" in changes:
            html = set_title(html, changes["title"])
            html = set_og(html, changes["title"], changes.get("description", get_meta(html, "description")))
        if "description" in changes:
            html = set_meta_description(html, changes["description"])
        if "h1" in changes:
            html = set_h1(html, changes["h1"])
        if html != original:
            f.write_text(html, encoding="utf-8", newline="\n")
            modified.append(f.relative_to(ROOT).as_posix())
    return modified


def main() -> None:
    gsc = json.loads(GSC.read_text(encoding="utf-8"))
    sitemap = load_sitemap_urls()

    pages: dict[str, dict] = {}
    for row in gsc.get("topPagesAll", []):
        url = row["Top pages"]
        p = urlparse(url).path
        if not p.endswith("/"):
            p += "/"
        pages[p] = {
            "url": url,
            "path": p,
            "clicks": row["Clicks"],
            "impressions": row["Impressions"],
            "ctr": row["CTR"],
            "position": row["Position"],
            "section": classify(p),
        }

    # merge gcc-only pages not in topPagesAll tail
    for row in gsc.get("gccPagesInExport", {}).get("pages", []):
        url = row["Top pages"]
        p = urlparse(url).path
        if not p.endswith("/"):
            p += "/"
        if p not in pages:
            pages[p] = {
                "url": url,
                "path": p,
                "clicks": row["Clicks"],
                "impressions": row["Impressions"],
                "ctr": row["CTR"],
                "position": row["Position"],
                "section": classify(p),
            }

    with_impressions = sorted(pages.values(), key=lambda x: (-x["impressions"], -x["clicks"]))
    close_to_success = [
        p for p in with_impressions
        if 5 <= p["position"] <= 20 and p["impressions"] >= 10
    ]
    close_to_success.sort(key=lambda x: (-x["impressions"], x["position"]))

    gsc_paths = set(pages.keys())
    zero_imp_sitemap: dict[str, list[str]] = {}
    for sp in sorted(sitemap):
        if sp in gsc_paths:
            continue
        if any(x in sp for x in ("/admin/", "/care/", "/demo/", "pdf-converter-lab", "nada")):
            continue
        sec = classify(sp)
        zero_imp_sitemap.setdefault(sec, []).append(sp)

    modified = apply_fixes()

    report = {
        "dateRange": gsc["dateRange"],
        "totals": gsc["totals"],
        "top20": with_impressions[:20],
        "closeToSuccess": close_to_success[:25],
        "zeroImpressionSitemapBySection": {k: v[:15] for k, v in zero_imp_sitemap.items()},
        "zeroImpressionCounts": {k: len(v) for k, v in zero_imp_sitemap.items()},
        "modifiedFiles": modified,
        "allPagesWithImpressions": len(with_impressions),
    }
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"top20": len(report["top20"]), "close": len(report["closeToSuccess"]), "modified": len(modified)}, indent=2))


if __name__ == "__main__":
    main()
