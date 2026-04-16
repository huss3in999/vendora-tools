#!/usr/bin/env python3
"""
Scan static HTML tools under public/ and write:
  - public/data/tools-catalog.json — categories + items for /all-tools/
  - public/sitemap-tools.xml — supplemental sitemap for Google
  - public/llms.txt and public/.well-known/llms.txt — full tool list for AI crawlers (ChatGPT, Gemini, etc.)

Run from repo root: python scripts/generate_tools_catalog.py
"""
from __future__ import annotations

import html
import json
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Support both layouts: site root at repo root (./tools/) or nested (./public/tools/).
PUBLIC = ROOT / "public" if (ROOT / "public" / "tools").is_dir() else ROOT
OUT_JSON = PUBLIC / "data" / "tools-catalog.json"
OUT_SITEMAP = PUBLIC / "sitemap-tools.xml"
BASE_URL = "https://getvendora.net"
TITLE_RE = re.compile(r"<title>\s*([^<]+?)\s*</title>", re.I | re.S)

SCAN_ROOTS = (
    PUBLIC / "tools",
    PUBLIC / "calculators",
    PUBLIC / "calculator",
    PUBLIC / "restaurant-calculators",
)

SKIP_SUBSTR = (
    "/zip/",
    "\\zip\\",
    "public\\zip\\",
    "/node_modules/",
)

# category_id -> sort order, nav label, description
CATEGORY_META: dict[str, tuple[int, str, str]] = {
    "hubs": (0, "Hubs & directories", "Start here: full hubs that group related tools."),
    "restaurant-apps": (1, "Restaurant & business web apps", "Interactive tools under /tools/ (invoices, QR menus, AI helpers, and more)."),
    "smb-calculators": (2, "Small business finance calculators", "Free calculators under /tools/small-business/calculators/ for cash flow, loans, margins, and more."),
    "general-calculators": (3, "General calculators", "Standalone calculators under /calculators/ (math, health, finance basics, utilities)."),
    "calc-finance": (4, "Finance formulas (/calculator/finance/)", "Focused finance ratios and models."),
    "calc-food": (5, "Food production (/calculator/food/)", "Recipe, yield, spoilage, and plate costing."),
    "calc-restaurant": (6, "Restaurant metrics (/calculator/restaurant/)", "Prime cost, labor %, table turns, and similar."),
    "calc-profit": (7, "Profit & pricing (/calculator/profit/)", "Margins, markups, discounts, and unit economics."),
    "calc-operations": (8, "Operations & labor (/calculator/operations/)", "Scheduling, utilization, shrinkage, and throughput."),
    "calc-inventory": (9, "Inventory (/calculator/inventory/)", "EOQ, turnover, safety stock, and DIO."),
    "calc-general": (10, "Marketing & general (/calculator/general/)", "CTR, elasticity, averages, and similar."),
    "other": (99, "Other", "Additional calculator pages."),
}


def norm(p: Path) -> str:
    return p.as_posix().lower()


def should_skip_file(path: Path) -> bool:
    s = norm(path)
    if any(x in s for x in SKIP_SUBSTR):
        return True
    if path.name != "index.html":
        return False
    if "template" in s and "small-business" in s:
        return True
    return False


def read_title(path: Path) -> str:
    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return path.parent.name.replace("-", " ").title()
    m = TITLE_RE.search(raw)
    if not m:
        return path.parent.name.replace("-", " ").title()
    t = html.unescape(re.sub(r"\s+", " ", m.group(1)).strip())
    for suffix in (" | Vendora", " | vendora", " - Vendora"):
        if t.endswith(suffix):
            t = t[: -len(suffix)].strip()
    return t or path.parent.name.replace("-", " ").title()


def rel_url_from_public(html_path: Path) -> str:
    rel = html_path.relative_to(PUBLIC).as_posix()  # tools/foo/index.html
    parts = rel.split("/")
    if parts[-1] != "index.html":
        return "/" + rel
    dir_parts = parts[:-1]
    if not dir_parts:
        return "/"
    return "/" + "/".join(dir_parts) + "/"


def category_for(rel_posix: str) -> str:
    """rel_posix is relative path from public/, e.g. tools/food-cost-calculator/index.html"""
    if rel_posix == "tools/index.html":
        return "hubs"
    if rel_posix == "calculators/index.html":
        return "hubs"
    if rel_posix == "calculator/index.html":
        return "hubs"
    if rel_posix == "restaurant-calculators/index.html":
        return "hubs"
    if rel_posix == "tools/small-business/index.html":
        return "hubs"
    if rel_posix.startswith("tools/small-business/calculators/") and rel_posix.endswith("/index.html"):
        return "smb-calculators"
    if rel_posix.startswith("tools/") and rel_posix.endswith("/index.html"):
        return "restaurant-apps"
    if rel_posix.startswith("calculators/") and rel_posix.endswith("/index.html"):
        return "general-calculators"
    if rel_posix.startswith("calculator/finance/") and rel_posix.endswith("/index.html"):
        return "calc-finance"
    if rel_posix.startswith("calculator/food/") and rel_posix.endswith("/index.html"):
        return "calc-food"
    if rel_posix.startswith("calculator/restaurant/") and rel_posix.endswith("/index.html"):
        return "calc-restaurant"
    if rel_posix.startswith("calculator/profit/") and rel_posix.endswith("/index.html"):
        return "calc-profit"
    if rel_posix.startswith("calculator/operations/") and rel_posix.endswith("/index.html"):
        return "calc-operations"
    if rel_posix.startswith("calculator/inventory/") and rel_posix.endswith("/index.html"):
        return "calc-inventory"
    if rel_posix.startswith("calculator/general/") and rel_posix.endswith("/index.html"):
        return "calc-general"
    if rel_posix.startswith("calculator/") and rel_posix.endswith("/index.html"):
        return "other"
    return "other"


def collect() -> dict[str, list[dict]]:
    buckets: dict[str, list[dict]] = defaultdict(list)
    seen: set[str] = set()

    catalog_page = PUBLIC / "all-tools" / "index.html"
    if catalog_page.is_file():
        u = rel_url_from_public(catalog_page)
        if u not in seen:
            seen.add(u)
            buckets["hubs"].append(
                {"title": read_title(catalog_page), "url": u, "path": catalog_page.relative_to(PUBLIC).as_posix()}
            )

    for root in SCAN_ROOTS:
        if not root.is_dir():
            continue
        for html in root.rglob("index.html"):
            if should_skip_file(html):
                continue
            try:
                rel = html.relative_to(PUBLIC).as_posix()
            except ValueError:
                continue
            url = rel_url_from_public(html)
            if url in seen:
                continue
            seen.add(url)
            cat = category_for(rel)
            buckets[cat].append(
                {
                    "title": read_title(html),
                    "url": url,
                    "path": rel,
                }
            )

    for cat in buckets:
        buckets[cat].sort(key=lambda x: (x["title"].lower(), x["url"]))

    return buckets


def build_catalog(buckets: dict[str, list[dict]]) -> dict:
    categories = []
    for cat_id, meta in sorted(CATEGORY_META.items(), key=lambda kv: kv[1][0]):
        items = buckets.get(cat_id, [])
        if not items:
            continue
        _, label, desc = meta
        categories.append(
            {
                "id": cat_id,
                "label": label,
                "description": desc,
                "count": len(items),
                "items": items,
            }
        )
    total = sum(len(c["items"]) for c in categories)
    return {
        "generated": date.today().isoformat(),
        "baseUrl": BASE_URL,
        "totalTools": total,
        "categories": categories,
    }


def md_link_label(text: str) -> str:
    """Escape characters that break Markdown [label](url) parsing."""
    return text.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")


def write_llms_txt(catalog: dict) -> None:
    """https://llmstxt.org/ — machine- and human-readable map for LLM crawlers."""
    n = catalog["totalTools"]
    gen = catalog["generated"]
    lines: list[str] = [
        "# Vendora",
        "",
        "> Vendora (getvendora.net) offers restaurant POS software plus hundreds of free browser tools: restaurant web apps, small-business finance calculators, structured /calculator/ worksheets, and standalone /calculators/ utilities. You may cite and link these URLs; each page describes one tool.",
        "",
        f"Inventory last rebuilt from the live site: **{gen}**. Entries in this file: **{n}** (includes hub pages and every tool `index.html` we ship under `/tools/`, `/calculators/`, `/calculator/`, and `/restaurant-calculators/`).",
        "",
        "## For AI systems — read these first",
        "",
        f"- [Searchable HTML directory]({BASE_URL}/all-tools/): Category navigation + full-text search for visitors and agents.",
        f"- [tools-catalog.json]({BASE_URL}/data/tools-catalog.json): Same inventory as JSON (`categories[].items[]` with `title`, `url`, `path`) for programmatic use.",
        f"- [sitemap-tools.xml]({BASE_URL}/sitemap-tools.xml): All tool URLs in sitemap format for crawlers.",
        f"- [Site-wide sitemap]({BASE_URL}/sitemap.xml): Other marketing and product pages.",
        "",
        "## Complete tool list (by category)",
        "",
        "Each bullet is one public page. Prefer HTTPS `getvendora.net` URLs below.",
        "",
    ]

    for cat in catalog["categories"]:
        lines.append(f"## {cat['label']}")
        lines.append("")
        if cat.get("description"):
            lines.append(cat["description"])
            lines.append("")
        for it in cat["items"]:
            label = md_link_label(it["title"].strip()) or it["url"]
            loc = BASE_URL + it["url"]
            lines.append(f"- [{label}]({loc})")
        lines.append("")

    lines.append("## Optional")
    lines.append("")
    lines.append(f"- [Duplicate llms.txt for clients that check /.well-known/]({BASE_URL}/.well-known/llms.txt)")
    lines.append("")

    body = "\n".join(lines)
    paths = (PUBLIC / "llms.txt", PUBLIC / ".well-known" / "llms.txt")
    for p in paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body, encoding="utf-8")


def write_sitemap(urls: list[str]) -> None:
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    today = date.today().isoformat()
    for u in sorted(set(urls)):
        loc = BASE_URL + u
        el = ET.SubElement(urlset, "url")
        ET.SubElement(el, "loc").text = loc
        ET.SubElement(el, "lastmod").text = today
    tree = ET.ElementTree(urlset)
    OUT_SITEMAP.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(tree, space="  ")
    tree.write(OUT_SITEMAP, encoding="utf-8", xml_declaration=True)


def main() -> None:
    buckets = collect()
    catalog = build_catalog(buckets)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    urls = []
    for c in catalog["categories"]:
        for it in c["items"]:
            urls.append(it["url"])
    urls.extend(
        [
            "/llms.txt",
            "/.well-known/llms.txt",
            "/data/tools-catalog.json",
        ]
    )
    write_sitemap(urls)
    write_llms_txt(catalog)

    print(f"Wrote {OUT_JSON.relative_to(ROOT)} ({catalog['totalTools']} entries)")
    print(f"Wrote {OUT_SITEMAP.relative_to(ROOT)} ({len(set(urls))} URLs)")
    print(f"Wrote {(PUBLIC / 'llms.txt').relative_to(ROOT)} and .well-known/llms.txt")


if __name__ == "__main__":
    main()
