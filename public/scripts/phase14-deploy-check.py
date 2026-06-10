#!/usr/bin/env python3
"""Phase 14 — Production deployment readiness check."""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "tests" / "phase14-deploy-check.json"

NEW_PAGES = [
    "bahrain-saudi-gcc-transport/king-fahd-causeway-guide/index.html",
    "guides/bmr-calculator-guide/index.html",
    "guides/reverse-commission-calculator-guide/index.html",
]

SCAN_FILES = [
    "index.html",
    "guides/index.html",
    "bahrain-saudi-gcc-transport/index.html",
    "tools/index.html",
    "calculators/bmr-calculator/index.html",
    "tools/commission-calculator/index.html",
    "guides/commission-calculator-guide/index.html",
    *NEW_PAGES,
    "bahrain-saudi-gcc-transport/bahrain-to-dammam/index.html",
    "bahrain-saudi-gcc-transport/bahrain-to-khobar/index.html",
    "bahrain-saudi-gcc-transport/dammam-to-bahrain/index.html",
    "bahrain-saudi-gcc-transport/khobar-to-bahrain/index.html",
]

SITEMAP_URLS = {
    "https://getvendora.net/guides/bmr-calculator-guide/",
    "https://getvendora.net/guides/reverse-commission-calculator-guide/",
    "https://getvendora.net/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/",
}

errors: list[str] = []
warnings: list[str] = []
attention: list[str] = []


def local_target(href: str, base: Path) -> Path | None:
    if not href or href.startswith(("http://", "https://", "mailto:", "tel:", "#", "javascript:")):
        return None
    if href.startswith("//"):
        return None
    href = href.split("#")[0].split("?")[0]
    if not href:
        return None
    if href.startswith("/"):
        target = ROOT / href.lstrip("/")
    else:
        target = (base.parent / href).resolve()
    if target.is_dir():
        target = target / "index.html"
    return target


def check_links() -> None:
    broken: list[tuple[str, str, str]] = []
    for rel in SCAN_FILES:
        fp = ROOT / rel
        if not fp.exists():
            warnings.append(f"Scan file missing: {rel}")
            continue
        text = fp.read_text(encoding="utf-8")
        for href in re.findall(r'href="([^"]+)"', text):
            target = local_target(href, fp)
            if target is None:
                continue
            if not target.exists():
                try:
                    disp = str(target.relative_to(ROOT))
                except ValueError:
                    disp = str(target)
                broken.append((rel, href, disp))
    for rel, href, disp in broken:
        errors.append(f"Broken internal link in {rel}: {href} -> {disp}")


def check_new_pages() -> None:
    for rel in NEW_PAGES:
        fp = ROOT / rel
        if not fp.exists():
            errors.append(f"Missing new page: {rel}")
            continue
        text = fp.read_text(encoding="utf-8")
        canon = re.search(r'rel="canonical"\s+href="([^"]+)"', text)
        if not canon:
            errors.append(f"Missing canonical on {rel}")
        expected = "https://getvendora.net/" + rel.replace("/index.html", "/")
        if canon and canon.group(1) != expected:
            warnings.append(f"Canonical value differs on {rel}: {canon.group(1)}")

        for block in re.findall(
            r'<script type="application/ld\+json"[^>]*>(.*?)</script>', text, re.S
        ):
            try:
                data = json.loads(block.strip())
            except json.JSONDecodeError as exc:
                errors.append(f"Malformed JSON-LD on {rel}: {exc}")
                continue
            nodes = data.get("@graph", [data])
            if not isinstance(nodes, list):
                nodes = [nodes]
            faq_schema = 0
            for node in nodes:
                if isinstance(node, dict) and node.get("@type") == "FAQPage":
                    faq_schema = len(node.get("mainEntity", []))
            vis = len(re.findall(r'<div class="vendora-faq-item">|<details class="faq-item"', text))
            if faq_schema and vis and faq_schema != vis:
                warnings.append(f"FAQ schema/visible count mismatch on {rel}: {faq_schema} vs {vis}")

        if "analytics-loader.js" not in text:
            errors.append(f"Missing analytics-loader.js reference on {rel}")


def check_sitemaps() -> None:
    pairs = [
        (ROOT / "sitemap.xml", SITEMAP_URLS),
        (ROOT / "_site/sitemap.xml", SITEMAP_URLS),
        (
            ROOT / "bahrain-saudi-gcc-transport/sitemap-gcc-transport.xml",
            {"https://getvendora.net/bahrain-saudi-gcc-transport/king-fahd-causeway-guide/"},
        ),
    ]
    for sm, urls in pairs:
        if not sm.exists():
            warnings.append(f"Sitemap missing: {sm.relative_to(ROOT)}")
            continue
        text = sm.read_text(encoding="utf-8")
        for url in urls:
            if url not in text:
                errors.append(f"Sitemap missing URL in {sm.name}: {url}")
        # validate XML parse
        try:
            ET.fromstring(text)
        except ET.ParseError as exc:
            errors.append(f"Malformed XML in {sm.name}: {exc}")


def check_html_structure() -> None:
    idx = ROOT / "index.html"
    text = idx.read_text(encoding="utf-8")
    if re.search(r'<section id="pricing"\s*\n<!-- phase10-content -->', text):
        errors.append("Homepage pricing section tag unclosed/malformed (phase10 insert broke opening tag)")
    if re.search(r'</section>\s*\n class="py-24 bg-card', text):
        errors.append("Homepage orphaned pricing section attributes after phase10 block")
    if text.count("<article") != text.count("</article>"):
        warnings.append("Homepage article tag count imbalance (may be sitewide pattern)")

    th = ROOT / "bahrain-saudi-gcc-transport/index.html"
    ttext = th.read_text(encoding="utf-8")
    if ttext.count('<article class="route-card">') != ttext.count("</article>"):
        errors.append("Transport hub route-card article tags unbalanced")
    if "king-fahd-causeway-guide" not in ttext:
        errors.append("Transport hub missing link to king-fahd-causeway-guide")

    guides = ROOT / "guides/index.html"
    gtext = guides.read_text(encoding="utf-8")
    if "bmr-calculator-guide" not in gtext or "reverse-commission-calculator-guide" not in gtext:
        errors.append("Guides hub missing links to new guides")


def check_assets() -> None:
    assets = [
        ROOT / "assets/analytics-loader.js",
        ROOT / "bahrain-saudi-gcc-transport/site.css",
        ROOT / "bahrain-saudi-gcc-transport/site.js",
    ]
    for a in assets:
        if not a.exists():
            errors.append(f"Missing asset: {a.relative_to(ROOT)}")

    causeway = ROOT / NEW_PAGES[0]
    if causeway.exists():
        t = causeway.read_text(encoding="utf-8")
        if "../site.css" not in t:
            errors.append("Causeway guide missing site.css reference")
        if "../site.js" not in t:
            errors.append("Causeway guide missing site.js reference")


def check_tonight_link_targets() -> None:
    required_incoming = {
        "guides/bmr-calculator-guide/index.html": [
            "guides/index.html",
            "index.html",
            "calculators/bmr-calculator/index.html",
            "tools/index.html",
        ],
        "guides/reverse-commission-calculator-guide/index.html": [
            "guides/index.html",
            "index.html",
            "tools/index.html",
            "tools/commission-calculator/index.html",
        ],
        "bahrain-saudi-gcc-transport/king-fahd-causeway-guide/index.html": [
            "index.html",
            "bahrain-saudi-gcc-transport/index.html",
        ],
    }
    for page, sources in required_incoming.items():
        slug = page.replace("/index.html", "/").split("/", 1)[-1]
        for src in sources:
            fp = ROOT / src
            if not fp.exists():
                warnings.append(f"Incoming link source missing: {src}")
                continue
            if slug not in fp.read_text(encoding="utf-8"):
                attention.append(f"Expected incoming link to {page} from {src} not found")


def main() -> None:
    check_new_pages()
    check_sitemaps()
    check_links()
    check_html_structure()
    check_assets()
    check_tonight_link_targets()

    score = 100
    score -= min(60, len(errors) * 15)
    score -= min(25, len(warnings) * 5)
    score -= min(10, len(attention) * 2)
    score = max(0, score)
    ready = len(errors) == 0

    out = {
        "ready": ready,
        "critical_errors": errors,
        "warnings": warnings,
        "files_requiring_attention": attention,
        "confidence_score": score,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
