#!/usr/bin/env python3
"""Phase 4 content pruning analysis — read-only inventory + GSC classification."""
import json
import re
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
GSC = json.loads((ROOT / "tests/gsc-performance-analysis.json").read_text(encoding="utf-8"))

gsc_norm = {}
for row in GSC.get("topPagesAll", []):
    path = row["Top pages"].replace("https://getvendora.net", "").rstrip("/") or "/"
    gsc_norm[path] = {
        "clicks": float(row.get("Clicks", 0)),
        "impressions": float(row.get("Impressions", 0)),
        "ctr": float(row.get("CTR", 0)),
        "position": float(row.get("Position", 0)),
    }
for row in GSC.get("gccPagesInExport", {}).get("pages", []):
    path = row["Top pages"].replace("https://getvendora.net", "").rstrip("/") or "/"
    gsc_norm.setdefault(
        path,
        {
            "clicks": float(row.get("Clicks", 0)),
            "impressions": float(row.get("Impressions", 0)),
            "ctr": float(row.get("CTR", 0)),
            "position": float(row.get("Position", 0)),
        },
    )

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
sitemap_urls = set()


def parse_sitemap(path: Path) -> None:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return
    tag = root.tag.split("}")[-1]
    if tag == "sitemapindex":
        for loc in root.findall(".//sm:loc", NS):
            if not loc.text:
                continue
            rel = loc.text.replace("https://getvendora.net/", "")
            child = ROOT / rel
            if child.exists():
                parse_sitemap(child)
    else:
        for loc in root.findall(".//sm:loc", NS):
            if loc.text:
                sitemap_urls.add(loc.text)


for sm in [
    ROOT / "sitemap.xml",
    ROOT / "sitemap-tools.xml",
    ROOT / "sitemap-gcc-transport-en.xml",
    ROOT / "bahrain-saudi-gcc-transport/sitemap-index.xml",
]:
    if sm.exists():
        parse_sitemap(sm)

SKIP = {"node_modules", ".git", "zip", "tests", "scripts", "demo", "backups"}
PRIVATE = ("admin", "care", "ai-chat-test", "nada menu", "pdf-converter-lab", "demo")
html_pages = set()
noindex = set()
for p in ROOT.rglob("index.html"):
    s = str(p).lower()
    if any(x in s for x in PRIVATE):
        continue
    if any(part in SKIP for part in p.parts):
        continue
    rel = "/" + p.parent.relative_to(ROOT).as_posix().strip(".") + "/"
    if rel == "//":
        rel = "/"
    html_pages.add(rel)
    try:
        head = p.read_text(encoding="utf-8", errors="ignore")[:12000]
        if re.search(r"noindex", head, re.I):
            noindex.add(rel)
    except OSError:
        pass

redirects = {}
for line in (ROOT / "_redirects").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    parts = line.split()
    if len(parts) >= 2:
        redirects[parts[0].rstrip("/") or "/"] = parts[1]

CALC_SLUGS = {
    "bmr-calculator",
    "roi-calculator",
    "break-even-point",
    "margin-markup-calculator",
    "sales-tax-calculator",
    "tip-calculator",
    "discount-calculator",
    "calorie-calculator",
    "tdee-calculator",
    "time-duration",
    "unit-converter",
    "percentage-calculator",
    "loan-calculator",
    "compound-interest-calculator",
    "payroll-calculator",
    "profit-margin-calculator",
    "markup-calculator",
    "vat-calculator",
    "hourly-to-salary-calculator",
    "break-even-calculator",
}


def parent_tool(path: str) -> str | None:
    slug = path.rstrip("/").split("/")[-1]
    if not slug.endswith("-guide"):
        return None
    base = slug[:-6]
    candidates = [
        f"/tools/{base}/",
        f"/tools/{base}-calculator/",
        f"/calculators/{base}/",
        f"/calculators/{base}-calculator/",
        f"/calculators/{base.replace('-calculator', '')}/",
    ]
    for cand in candidates:
        if (ROOT / cand.strip("/") / "index.html").exists():
            return cand
    return None


def classify(path, clicks, imp, pos, in_sitemap, is_noindex):
    if is_noindex:
        return "D", "Private/test/admin surface — already noindex"
    if path in redirects:
        return "F", "Legacy URL — active 301 in _redirects"
    slug = path.rstrip("/").split("/")[-1]
    if path.startswith("/tools/") and slug in CALC_SLUGS and (ROOT / "calculators" / slug / "index.html").exists():
        return "F", "Duplicate /tools/ calculator — canonical at /calculators/"
    if path.endswith((".json", ".txt", ".xml")):
        return "D", "Non-HTML asset in sitemap — not a landing page"
    if imp >= 150 and (clicks >= 3 or (pos <= 12 and imp >= 200)):
        return "A", "GSC-validated: strong impressions/clicks or page-1 position"
    parent = parent_tool(path)
    if parent and imp >= 300 and pos > 40:
        return "C", f"Guide at pos {pos:.1f} with {imp:.0f} imp — merge into {parent}"
    if imp >= 100 and pos <= 20:
        return "B", f"Page 1-2 visibility ({imp:.0f} imp, pos {pos:.1f})"
    if imp >= 50:
        return "B", f"Meaningful impressions ({imp:.0f}) — optimize before pruning"
    if in_sitemap and imp == 0 and ("/en/" in path or "planner" in path or "airport" in path):
        return "B", "Sitemap EN/airport/planner page with zero GSC — improve or consolidate"
    if in_sitemap and imp == 0 and path.count("/") >= 5:
        return "D", "Deep nested URL in sitemap, zero GSC — crawl budget waste"
    if imp == 0 and not in_sitemap and path not in html_pages:
        return "E", "Sitemap ghost — URL in sitemap without HTML on disk"
    if imp == 0 and in_sitemap and "transport" in path:
        return "B", "Transport cluster page in sitemap — keep, improve internal links"
    if imp > 0 and imp < 15 and clicks == 0:
        return "D", "Negligible GSC signal — candidate noindex"
    if clicks > 0:
        return "A", "Has confirmed GSC clicks"
    if in_sitemap:
        return "B", "In sitemap without GSC yet"
    return "D", "No GSC signal — candidate noindex"


all_paths = set()
for u in sitemap_urls:
    p = u.replace("https://getvendora.net", "").rstrip("/") or "/"
    all_paths.add(p)
all_paths |= html_pages

rows = []
for path in sorted(all_paths):
    st = gsc_norm.get(path, {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0})
    in_sm = path in {u.replace("https://getvendora.net", "").rstrip("/") or "/" for u in sitemap_urls}
    ni = path in noindex
    cat, reason = classify(path, st["clicks"], st["impressions"], st["position"], in_sm, ni)
    if path == "/":
        sec = "Homepage"
    elif "/bahrain-saudi-gcc-transport/" in path:
        if "airport" in path:
            sec = "Airport pages"
        elif any(x in path for x in ["karbala", "najaf", "baghdad", "basra", "iraq", "arbaeen", "ziyarat"]):
            sec = "Iraq/Ziyarat pages"
        else:
            sec = "Transport pages"
    elif path.startswith("/tools/pdf"):
        sec = "PDF tools"
    elif path.startswith("/tools/"):
        sec = "Tools"
    elif path.startswith("/calculators/") or path.startswith("/calculator/"):
        sec = "Calculators"
    elif path.startswith("/guides/"):
        sec = "Guides"
    elif path in ["/about/", "/contact/", "/pricing/", "/privacy-policy/", "/all-tools/"]:
        sec = "Restaurant/POS pages"
    else:
        sec = "Other"
    rows.append({"path": path, **st, "category": cat, "reason": reason, "section": sec})

keep = sorted([r for r in rows if r["category"] == "A"], key=lambda x: (-x["impressions"], -x["clicks"]))[:50]
improve = sorted([r for r in rows if r["category"] == "B"], key=lambda x: (-x["impressions"], x["position"]))[:50]
merge = sorted([r for r in rows if r["category"] == "C"], key=lambda x: -x["impressions"])
noindex_list = sorted([r for r in rows if r["category"] == "D"], key=lambda x: -x["impressions"])
redirect = sorted([r for r in rows if r["category"] == "F"], key=lambda x: -x["impressions"])
delete = [r for r in rows if r["category"] == "E"]

# least damage = lowest value indexable (noindex + zero imp + not in keep)
least_damage = sorted(
    [r for r in rows if r["category"] in ("D", "E") and r["impressions"] == 0],
    key=lambda x: (x["clicks"], -x["impressions"]),
)[:100]

# top 50 to keep if site shrunk
survivor50 = sorted(rows, key=lambda x: (-x["clicks"], -x["impressions"], x["position"]))[:50]

out = ROOT / "tests" / "phase4-pruning-analysis.json"
out.write_text(
    json.dumps(
        {
            "dateRange": GSC.get("dateRange"),
            "summary": {
                "total_paths": len(rows),
                "sitemap_urls": len(sitemap_urls),
                "html_pages": len(html_pages),
                "noindex_pages": len(noindex),
                "categories": dict(Counter(r["category"] for r in rows)),
            },
            "keep": keep,
            "improve": improve,
            "merge": merge,
            "noindex": noindex_list,
            "redirect": redirect,
            "delete": delete,
            "least_damage_100": least_damage,
            "survivor_50": survivor50,
            "all": rows,
        },
        indent=2,
    ),
    encoding="utf-8",
)
print(json.dumps({"total": len(rows), "categories": dict(Counter(r["category"] for r in rows))}))
