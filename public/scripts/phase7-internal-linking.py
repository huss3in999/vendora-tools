#!/usr/bin/env python3
"""
Phase 7 — Internal linking authority boost.
Analyzes GSC data + site link graph, then adds safe contextual hub links.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from html import escape
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
GSC = ROOT / "tests" / "gsc-performance-analysis.json"
REPORT = ROOT / "tests" / "phase7-internal-linking-report.json"
BASE = "https://getvendora.net"

SKIP_DIRS = {"_site", "demo", "zip", "node_modules", "nada Menu"}
SKIP_PARTS = {"admin", "care", "ai-chat-test", "tracking-dashboard"}

HREF_RE = re.compile(r"""<a\s+[^>]*href=["']([^"'#]+)["']""", re.I)
MARKER = "<!-- phase7-authority-links -->"

PRIORITY_TARGETS = [
    {
        "path": "/tools/commission-calculator/",
        "label": "Commission Calculator",
        "anchor": "free sales commission calculator",
        "gsc_note": "2,852 impressions",
    },
    {
        "path": "/calculators/bmr-calculator/",
        "label": "BMR Calculator",
        "anchor": "free BMR calculator",
        "gsc_note": "753 impressions, position 6.4",
    },
    {
        "path": "/bahrain-saudi-gcc-transport/bahrain-to-qatar/",
        "label": "Bahrain to Qatar",
        "anchor": "Bahrain to Qatar private transport",
        "gsc_note": "220 impressions, 14 clicks",
    },
    {
        "path": "/bahrain-saudi-gcc-transport/bahrain-to-kuwait/",
        "label": "Bahrain to Kuwait",
        "anchor": "Bahrain to Kuwait transport",
        "gsc_note": "378 impressions, 6 clicks",
    },
    {
        "path": "/bahrain-saudi-gcc-transport/bahrain-to-dammam/",
        "label": "Bahrain to Dammam",
        "anchor": "Bahrain to Dammam route",
        "gsc_note": "331 impressions, 8 clicks",
    },
    {
        "path": "/bahrain-saudi-gcc-transport/bahrain-to-oman/",
        "label": "Bahrain to Oman",
        "anchor": "Bahrain to Oman transport",
        "gsc_note": "279 impressions",
    },
    {
        "path": "/bahrain-saudi-gcc-transport/bahrain-to-dubai/",
        "label": "Bahrain to Dubai",
        "anchor": "Bahrain to Dubai transport",
        "gsc_note": "233 impressions",
    },
    {
        "path": "/tools/delivery-commission-calculator/",
        "label": "Delivery Commission Calculator",
        "anchor": "delivery commission calculator",
        "gsc_note": "333 impressions, 3 clicks",
    },
    {
        "path": "/tools/food-cost-calculator/",
        "label": "Food Cost Calculator",
        "anchor": "food cost calculator",
        "gsc_note": "875 impressions",
    },
    {
        "path": "/tools/daily-sales-summary/",
        "label": "Daily Sales Summary",
        "anchor": "daily sales summary tool",
        "gsc_note": "338 impressions",
    },
    {
        "path": "/guides/delivery-commission-calculator-guide/",
        "label": "Delivery Commission Guide",
        "anchor": "delivery commission guide",
        "gsc_note": "689 impressions, 4 clicks",
    },
]

HUB_SPECS: list[dict] = [
    {
        "file": ROOT / "about" / "index.html",
        "title": "Popular GetVendora tools & GCC routes",
        "intro": "These pages already earn search visibility — use them for fast answers on commissions, food costs, daily sales, and private GCC transport booking.",
        "targets": [
            "/tools/commission-calculator/",
            "/calculators/bmr-calculator/",
            "/tools/food-cost-calculator/",
            "/tools/delivery-commission-calculator/",
            "/tools/daily-sales-summary/",
            "/guides/delivery-commission-calculator-guide/",
            "/bahrain-saudi-gcc-transport/bahrain-to-qatar/",
            "/bahrain-saudi-gcc-transport/bahrain-to-kuwait/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dammam/",
            "/bahrain-saudi-gcc-transport/bahrain-to-oman/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dubai/",
        ],
        "insert_before": "</main>",
        "prefix": "../",
    },
    {
        "file": ROOT / "contact" / "index.html",
        "title": "High-traffic tools & transport routes",
        "intro": "While you contact GetVendora, these free calculators and GCC route pages are the most searched parts of the platform.",
        "targets": [
            "/tools/commission-calculator/",
            "/calculators/bmr-calculator/",
            "/tools/food-cost-calculator/",
            "/tools/delivery-commission-calculator/",
            "/tools/daily-sales-summary/",
            "/bahrain-saudi-gcc-transport/bahrain-to-qatar/",
            "/bahrain-saudi-gcc-transport/bahrain-to-kuwait/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dammam/",
            "/bahrain-saudi-gcc-transport/bahrain-to-oman/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dubai/",
        ],
        "insert_before": "</main>",
        "prefix": "../",
    },
    {
        "file": ROOT / "tools" / "index.html",
        "title": "Most searched GetVendora tools",
        "intro": "Based on recent search demand, these calculators drive the most discovery on GetVendora.",
        "targets": [
            "/tools/commission-calculator/",
            "/calculators/bmr-calculator/",
            "/tools/food-cost-calculator/",
            "/tools/delivery-commission-calculator/",
            "/tools/daily-sales-summary/",
            "/guides/delivery-commission-calculator-guide/",
            "/guides/commission-calculator-guide/",
        ],
        "insert_before": "<footer",
        "prefix": "../",
    },
    {
        "file": ROOT / "guides" / "index.html",
        "title": "High-impression guides & tools",
        "intro": "These guides and calculators already earn the most search visibility on GetVendora — start here before browsing the full library.",
        "targets": [
            "/guides/delivery-commission-calculator-guide/",
            "/guides/commission-calculator-guide/",
            "/guides/food-cost-calculator-guide/",
            "/guides/daily-sales-summary-guide/",
            "/tools/commission-calculator/",
            "/calculators/bmr-calculator/",
            "/tools/delivery-commission-calculator/",
            "/tools/food-cost-calculator/",
            "/tools/daily-sales-summary/",
        ],
        "insert_before": "</main>",
        "prefix": "../",
    },
    {
        "file": ROOT / "all-tools" / "index.html",
        "title": "Top-performing pages on GetVendora",
        "intro": "Start with these high-impression tools and GCC transport routes, then browse the full directory below.",
        "targets": [
            "/tools/commission-calculator/",
            "/calculators/bmr-calculator/",
            "/tools/food-cost-calculator/",
            "/tools/delivery-commission-calculator/",
            "/tools/daily-sales-summary/",
            "/bahrain-saudi-gcc-transport/bahrain-to-qatar/",
            "/bahrain-saudi-gcc-transport/bahrain-to-kuwait/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dammam/",
            "/bahrain-saudi-gcc-transport/bahrain-to-oman/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dubai/",
        ],
        "insert_before": '<div id="catalog-root"',
        "prefix": "../",
    },
    {
        "file": ROOT / "bahrain-saudi-gcc-transport" / "index.html",
        "title": "أكثر المسارات طلباً | Most booked GCC routes",
        "intro": "These routes already receive the strongest search visibility on GetVendora transport.",
        "targets": [
            "/bahrain-saudi-gcc-transport/bahrain-to-qatar/",
            "/bahrain-saudi-gcc-transport/bahrain-to-kuwait/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dammam/",
            "/bahrain-saudi-gcc-transport/bahrain-to-oman/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dubai/",
        ],
        "insert_before": "<footer",
        "prefix": "",
        "bilingual": True,
    },
    {
        "file": ROOT / "index.html",
        "title": "Trending on GetVendora",
        "intro": "Pages with the highest recent search visibility across tools and GCC transport.",
        "targets": [
            "/tools/commission-calculator/",
            "/calculators/bmr-calculator/",
            "/tools/food-cost-calculator/",
            "/tools/delivery-commission-calculator/",
            "/tools/daily-sales-summary/",
            "/bahrain-saudi-gcc-transport/bahrain-to-qatar/",
            "/bahrain-saudi-gcc-transport/bahrain-to-kuwait/",
            "/bahrain-saudi-gcc-transport/bahrain-to-dammam/",
        ],
        "insert_before": '<section id="pricing"',
        "prefix": "",
        "only_if_missing": True,
    },
]

GUIDE_CROSS_LINKS = [
    {
        "file": ROOT / "guides" / "commission-calculator-guide" / "index.html",
        "paragraph_needle": "commission calculator",
        "add_html": ' <a href="/tools/commission-calculator/">Open the free commission calculator</a>',
        "skip_if": "/tools/commission-calculator/",
    },
    {
        "file": ROOT / "guides" / "food-cost-calculator-guide" / "index.html",
        "paragraph_needle": "food cost calculator",
        "add_html": ' — <a href="/tools/food-cost-calculator/">use the free food cost calculator</a>',
        "skip_if": "/tools/food-cost-calculator/",
        "once": True,
    },
    {
        "file": ROOT / "guides" / "daily-sales-summary-guide" / "index.html",
        "paragraph_needle": "daily sales",
        "add_html": ' <a href="/tools/daily-sales-summary/">Open the daily sales summary tool</a>',
        "skip_if": "/tools/daily-sales-summary/",
        "once": True,
    },
]

BMR_CROSS_LINKS = [
    {
        "file": ROOT / "calculators" / "bmr-calculator" / "index.html",
        "needle": MARKER,
        "block": True,
        "targets": [
            ("/tools/commission-calculator/", "Commission calculator"),
            ("/tools/food-cost-calculator/", "Food cost calculator"),
            ("/tools/delivery-commission-calculator/", "Delivery commission calculator"),
            ("/guides/delivery-commission-calculator-guide/", "Delivery commission guide"),
        ],
        "insert_before": "</main>",
        "prefix": "../../",
    },
    {
        "file": ROOT / "tools" / "commission-calculator" / "index.html",
        "needle": MARKER,
        "block": True,
        "targets": [
            ("/calculators/bmr-calculator/", "BMR calculator"),
            ("/tools/delivery-commission-calculator/", "Delivery commission calculator"),
            ("/tools/food-cost-calculator/", "Food cost calculator"),
            ("/guides/commission-calculator-guide/", "Commission calculator guide"),
        ],
        "insert_before": "</main>",
        "prefix": "../../",
    },
    {
        "file": ROOT / "tools" / "delivery-commission-calculator" / "index.html",
        "needle": MARKER,
        "block": True,
        "targets": [
            ("/guides/delivery-commission-calculator-guide/", "Delivery commission guide"),
            ("/tools/commission-calculator/", "Commission calculator"),
            ("/tools/food-cost-calculator/", "Food cost calculator"),
            ("/tools/daily-sales-summary/", "Daily sales summary"),
        ],
        "insert_before": "</main>",
        "prefix": "../../",
    },
    {
        "file": ROOT / "tools" / "food-cost-calculator" / "index.html",
        "needle": MARKER,
        "block": True,
        "targets": [
            ("/guides/food-cost-calculator-guide/", "Food cost guide"),
            ("/tools/delivery-commission-calculator/", "Delivery commission calculator"),
            ("/tools/daily-sales-summary/", "Daily sales summary"),
            ("/calculators/bmr-calculator/", "BMR calculator"),
        ],
        "insert_before": "</main>",
        "prefix": "../../",
    },
    {
        "file": ROOT / "tools" / "daily-sales-summary" / "index.html",
        "needle": MARKER,
        "block": True,
        "targets": [
            ("/guides/daily-sales-summary-guide/", "Daily sales guide"),
            ("/tools/commission-calculator/", "Commission calculator"),
            ("/tools/food-cost-calculator/", "Food cost calculator"),
            ("/tools/delivery-commission-calculator/", "Delivery commission calculator"),
        ],
        "insert_before": "</main>",
        "prefix": "../../",
    },
]


@dataclass
class Report:
    pages_improved: list[str] = field(default_factory=list)
    links_created: list[str] = field(default_factory=list)
    files_modified: list[str] = field(default_factory=list)
    orphans: list[str] = field(default_factory=list)
    weak_links: list[dict] = field(default_factory=list)
    sitemap_only: list[str] = field(default_factory=list)
    top50_impressions: list[dict] = field(default_factory=list)
    top50_clicks: list[dict] = field(default_factory=list)


def should_skip(path: Path) -> bool:
    parts = path.relative_to(ROOT).parts
    if any(p in SKIP_DIRS for p in parts):
        return True
    return any(p in SKIP_PARTS for p in parts)


def page_path_from_file(path: Path) -> str:
    rel = path.relative_to(ROOT)
    if rel.name != "index.html":
        return ""
    if rel.parts == ("index.html",):
        return "/"
    return "/" + "/".join(rel.parts[:-1]) + "/"


def norm_href(href: str, from_path: str) -> str | None:
    href = href.strip()
    if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    if href.startswith("http"):
        if "getvendora.net" not in href:
            return None
        path = urlparse(href).path
    elif href.startswith("/"):
        path = href
    else:
        base = from_path.strip("/")
        path = urljoin(f"/{base}/" if base else "/", href)
    if not path.endswith("/") and not path.endswith(".html"):
        path += "/"
    return path


def load_sitemap_paths() -> set[str]:
    paths: set[str] = set()
    for sm in (
        ROOT / "sitemap.xml",
        ROOT / "sitemap-tools.xml",
        ROOT / "bahrain-saudi-gcc-transport/sitemap-gcc-transport.xml",
        ROOT / "bahrain-saudi-gcc-transport/sitemap-gcc-transport-en.xml",
    ):
        if not sm.exists():
            continue
        tree = ET.parse(sm)
        for loc in tree.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
            if not loc.text or loc.text.endswith(".xml"):
                continue
            p = urlparse(loc.text.strip()).path
            if not p.endswith("/"):
                p += "/"
            paths.add(p)
    return paths


def build_link_graph() -> tuple[dict[str, set[str]], list[str]]:
    inbound: dict[str, set[str]] = {}
    all_pages: list[str] = []
    files: list[Path] = []

    for f in ROOT.rglob("index.html"):
        if should_skip(f):
            continue
        pp = page_path_from_file(f)
        if not pp:
            continue
        all_pages.append(pp)
        inbound.setdefault(pp, set())
        files.append(f)

    for f in files:
        from_path = page_path_from_file(f)
        text = f.read_text(encoding="utf-8", errors="replace")
        for href in HREF_RE.findall(text):
            target = norm_href(href, from_path)
            if target and target in inbound:
                inbound[target].add(from_path)

    return inbound, all_pages


def target_meta(path: str) -> dict | None:
    for t in PRIORITY_TARGETS:
        if t["path"] == path:
            return t
    return None


def rel_href(prefix: str, path: str) -> str:
    if prefix:
        return prefix + path.lstrip("/")
    return path


def render_hub_block(spec: dict) -> str:
    title = spec["title"]
    intro = spec["intro"]
    prefix = spec.get("prefix", "")
    bilingual = spec.get("bilingual", False)
    links: list[str] = []
    for path in spec["targets"]:
        meta = target_meta(path)
        label = meta["label"] if meta else path.strip("/").split("/")[-1].replace("-", " ").title()
        href = rel_href(prefix, path)
        links.append(f'<li><a href="{href}">{escape(label)}</a></li>')
    ul = "\n        ".join(links)
    extra = ""
    if bilingual:
        extra = (
            '<p style="margin-top:10px;font-size:0.92rem;opacity:0.85;">'
            "Part of <a href=\"https://getvendora.net/\">GetVendora</a> — "
            '<a href="../tools/commission-calculator/">commission calculator</a>, '
            '<a href="../calculators/bmr-calculator/">BMR calculator</a>, '
            "and free business tools."
            "</p>"
        )
    return f"""
{MARKER}
<section class="phase7-authority-links" aria-label="Popular GetVendora pages" style="margin:32px auto;max-width:960px;padding:24px;border:1px solid rgba(0,0,0,.08);border-radius:16px;background:rgba(255,255,255,.6);">
  <h2 style="margin:0 0 8px;font-size:1.25rem;">{escape(title)}</h2>
  <p style="margin:0 0 16px;line-height:1.6;">{escape(intro)}</p>
  <ul style="margin:0;padding-left:1.2rem;line-height:1.9;display:grid;gap:4px;">
        {ul}
  </ul>
  {extra}
</section>
"""


def render_compact_block(prefix: str, targets: list[tuple[str, str]]) -> str:
    items = []
    for path, label in targets:
        href = rel_href(prefix, path)
        items.append(f'<a href="{href}" style="margin-right:12px;">{escape(label)}</a>')
    joined = " · ".join(items)
    return f"""
{MARKER}
<section class="phase7-authority-links" aria-label="Related high-traffic pages" style="margin:24px auto;padding:16px 20px;border-top:1px solid rgba(0,0,0,.08);">
  <p style="margin:0;font-size:0.95rem;line-height:1.7;"><strong>Related popular pages:</strong> {joined}</p>
</section>
"""


def inject_hub(spec: dict, report: Report) -> None:
    path = spec["file"]
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8", errors="replace")
    if MARKER in text:
        return
    if spec.get("only_if_missing"):
        # homepage already has many links — only add if none of the targets are present
        if any(t in text for t in spec["targets"][:3]):
            return
    block = render_hub_block(spec)
    needle = spec["insert_before"]
    if needle not in text:
        report.pages_improved.append(str(path.relative_to(ROOT)))
        return
    new_text = text.replace(needle, block + needle, 1)
    path.write_text(new_text, encoding="utf-8")
    rel = path.relative_to(ROOT).as_posix()
    report.files_modified.append(rel)
    report.pages_improved.append(rel)
    for t in spec["targets"]:
        report.links_created.append(f"{rel} → {t}")


def inject_compact(spec: dict, report: Report) -> None:
    path = spec["file"]
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8", errors="replace")
    if MARKER in text:
        return
    block = render_compact_block(spec["prefix"], spec["targets"])
    needle = spec["insert_before"]
    if needle not in text:
        return
    path.write_text(text.replace(needle, block + needle, 1), encoding="utf-8")
    rel = path.relative_to(ROOT).as_posix()
    report.files_modified.append(rel)
    report.pages_improved.append(rel)
    for t, _ in spec["targets"]:
        report.links_created.append(f"{rel} → {t}")


def inject_guide_cross_links(report: Report) -> None:
    for spec in GUIDE_CROSS_LINKS:
        path = spec["file"]
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if spec["skip_if"] in text and spec.get("once"):
            continue
        if spec["add_html"] in text:
            continue
        idx = text.lower().find(spec["paragraph_needle"].lower())
        if idx == -1:
            continue
        # insert after first closing </p> following needle
        p_end = text.find("</p>", idx)
        if p_end == -1:
            continue
        new_text = text[:p_end] + spec["add_html"] + text[p_end:]
        path.write_text(new_text, encoding="utf-8")
        rel = path.relative_to(ROOT).as_posix()
        report.files_modified.append(rel)
        report.pages_improved.append(rel)
        report.links_created.append(f"{rel} → {spec['skip_if']}")


def analyze_gsc(report: Report) -> list[dict]:
    data = json.loads(GSC.read_text(encoding="utf-8"))
    pages = data.get("topPagesAll", [])
    report.top50_impressions = [
        {
            "path": urlparse(p["Top pages"]).path,
            "impressions": p["Impressions"],
            "clicks": p["Clicks"],
            "position": p["Position"],
        }
        for p in sorted(pages, key=lambda x: -x["Impressions"])[:50]
    ]
    report.top50_clicks = [
        {
            "path": urlparse(p["Top pages"]).path,
            "impressions": p["Impressions"],
            "clicks": p["Clicks"],
            "position": p["Position"],
        }
        for p in sorted(pages, key=lambda x: -x["Clicks"])[:50]
    ]
    return pages


def analyze_weakness(inbound: dict[str, set[str]], all_pages: list[str], sitemap: set[str], report: Report) -> None:
    for p in all_pages:
        if p == "/":
            continue
        if len(inbound.get(p, set())) == 0:
            report.orphans.append(p)
        elif len(inbound.get(p, set())) < 3:
            report.weak_links.append({"path": p, "inbound": len(inbound.get(p, set()))})
        if p in sitemap and len(inbound.get(p, set())) == 0:
            report.sitemap_only.append(p)


def main() -> None:
    report = Report()
    inbound, all_pages = build_link_graph()
    sitemap = load_sitemap_paths()
    analyze_gsc(report)
    analyze_weakness(inbound, all_pages, sitemap, report)

    for spec in HUB_SPECS:
        inject_hub(spec, report)

    for spec in BMR_CROSS_LINKS:
        inject_compact(spec, report)

    inject_guide_cross_links(report)

    # Recompute inbound for improved pages after edits
    inbound_after, _ = build_link_graph()
    improved_targets = []
    for t in PRIORITY_TARGETS:
        before = len(inbound.get(t["path"], set()))
        after = len(inbound_after.get(t["path"], set()))
        if after > before:
            improved_targets.append(
                {
                    "path": t["path"],
                    "label": t["label"],
                    "inbound_before": before,
                    "inbound_after": after,
                    "gsc_note": t["gsc_note"],
                }
            )

    report.files_modified = sorted(set(report.files_modified))
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        json.dumps(
            {
                "pages_improved": report.pages_improved,
                "links_created": report.links_created,
                "files_modified": report.files_modified,
                "orphans": report.orphans[:100],
                "orphan_count": len(report.orphans),
                "weak_links_lt3": report.weak_links[:100],
                "weak_link_count": len(report.weak_links),
                "sitemap_only": report.sitemap_only[:50],
                "sitemap_only_count": len(report.sitemap_only),
                "top50_impressions": report.top50_impressions,
                "top50_clicks": report.top50_clicks,
                "priority_targets_improved": improved_targets,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    print(f"Phase 7 complete. Modified {len(report.files_modified)} files.")
    print(f"New links: {len(report.links_created)}")
    print(f"Orphans: {len(report.orphans)} | Weak (<3 inbound): {len(report.weak_links)}")


if __name__ == "__main__":
    main()
