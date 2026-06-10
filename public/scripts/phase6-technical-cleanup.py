#!/usr/bin/env python3
"""
Phase 6 — Final technical authority cleanup.
Applies safe SEO fixes that do not require site-owner action.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://getvendora.net"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
ET.register_namespace("", NS["sm"])

NON_HTML_SUFFIXES = (".json", ".txt", ".xml", ".md", ".csv", ".js", ".css")
NON_HTML_PATH_PARTS = (
    "/llms.txt",
    "/.well-known/",
    "/ai-index",
    "/tools-catalog",
    "/data/tools-catalog",
)

PRIVATE_PREFIXES = (
    "/demo/",
    "/nada menu/",
    "/nada%20menu/",
    "/bahrain-saudi-gcc-transport/admin/",
    "/bahrain-saudi-gcc-transport/care/",
    "/bahrain-saudi-gcc-transport/ai-chat-test/",
    "/_site/",
    "/zip/",
)

PRIVATE_NOINDEX_PAGES = (
    ROOT / "bahrain-saudi-gcc-transport" / "ai-chat-test" / "index.html",
    ROOT / "bahrain-saudi-gcc-transport" / "admin" / "tracking-dashboard" / "index.html",
)

SITEMAP_FILES = (
    ROOT / "sitemap.xml",
    ROOT / "sitemap-tools.xml",
    ROOT / "bahrain-saudi-gcc-transport" / "sitemap-gcc-transport.xml",
    ROOT / "bahrain-saudi-gcc-transport" / "sitemap-gcc-transport-en.xml",
)

ROBOTS_PATH = ROOT / "robots.txt"
REPORT_PATH = ROOT / "tests" / "phase6-technical-cleanup-report.json"

CANONICAL_RE = re.compile(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', re.I)
ROBOTS_META_RE = re.compile(
    r'<meta\s+name=["\']robots["\']\s+content=["\']([^"\']+)["\']', re.I
)
JSONLD_RE = re.compile(
    r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', re.I | re.S
)


@dataclass
class Report:
    fixes: list[str] = field(default_factory=list)
    files_modified: list[str] = field(default_factory=list)
    owner_action: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    sitemap_removed: dict[str, list[str]] = field(default_factory=dict)
    canonical_issues: list[str] = field(default_factory=list)
    noindex_gaps: list[str] = field(default_factory=list)
    jsonld_errors: list[str] = field(default_factory=list)


def path_from_loc(loc: str) -> str:
    p = urlparse(loc).path or "/"
    return p if p.endswith("/") or "." in p.split("/")[-1] else p + "/"


def is_non_html_url(loc: str) -> bool:
    path = urlparse(loc).path.lower()
    if any(path.endswith(s) for s in NON_HTML_SUFFIXES):
        return True
    return any(part in path for part in NON_HTML_PATH_PARTS)


def is_private_url(loc: str) -> bool:
    path = urlparse(loc).path.lower()
    if not path.endswith("/"):
        path = path + "/"
    return any(path.startswith(prefix) for prefix in PRIVATE_PREFIXES)


def should_remove_from_sitemap(loc: str) -> bool:
    return is_non_html_url(loc) or is_private_url(loc)


def read_urlset(path: Path) -> tuple[ET.Element | None, list[tuple[str, str | None]]]:
    if not path.exists():
        return None, []
    tree = ET.parse(path)
    root = tree.getroot()
    tag = root.tag.split("}")[-1]
    if tag == "sitemapindex":
        return root, []
    urls: list[tuple[str, str | None]] = []
    for url_el in root.findall("sm:url", NS):
        loc_el = url_el.find("sm:loc", NS)
        if loc_el is None or not loc_el.text:
            continue
        lastmod_el = url_el.find("sm:lastmod", NS)
        lastmod = lastmod_el.text if lastmod_el is not None else None
        urls.append((loc_el.text.strip(), lastmod))
    return root, urls


def write_urlset(path: Path, urls: list[tuple[str, str | None]]) -> None:
    urlset = ET.Element(f"{{{NS['sm']}}}urlset")
    today = date.today().isoformat()
    seen: set[str] = set()
    for loc, lastmod in urls:
        if loc in seen:
            continue
        seen.add(loc)
        url_el = ET.SubElement(urlset, f"{{{NS['sm']}}}url")
        ET.SubElement(url_el, f"{{{NS['sm']}}}loc").text = loc
        ET.SubElement(url_el, f"{{{NS['sm']}}}lastmod").text = lastmod or today
    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="utf-8", xml_declaration=True)


def clean_sitemaps(report: Report) -> None:
    for sm_path in SITEMAP_FILES:
        root, urls = read_urlset(sm_path)
        if root is None:
            continue
        if root.tag.split("}")[-1] == "sitemapindex":
            continue
        kept: list[tuple[str, str | None]] = []
        removed: list[str] = []
        for loc, lastmod in urls:
            if should_remove_from_sitemap(loc):
                removed.append(loc)
            else:
                kept.append((loc, lastmod))
        if removed:
            write_urlset(sm_path, kept)
            rel = sm_path.relative_to(ROOT).as_posix()
            report.sitemap_removed[rel] = removed
            report.fixes.append(
                f"Removed {len(removed)} non-HTML/private URL(s) from {rel}"
            )
            report.files_modified.append(rel)


def build_robots_txt() -> str:
    return """User-agent: *
Allow: /

# Private / internal paths (noindex pages and build mirrors)
Disallow: /_site/
Disallow: /demo/
Disallow: /nada Menu/
Disallow: /nada%20Menu/
Disallow: /bahrain-saudi-gcc-transport/admin/
Disallow: /bahrain-saudi-gcc-transport/care/
Disallow: /bahrain-saudi-gcc-transport/ai-chat-test/
Disallow: /tools/pdf-converter-lab/backups/
Disallow: /zip/

# Machine-readable discovery files (linked from HTML; not sitemap entries)
# https://getvendora.net/llms.txt
# https://getvendora.net/.well-known/llms.txt
# https://getvendora.net/data/tools-catalog.json
# https://getvendora.net/ai-index.json

Sitemap: https://getvendora.net/sitemap.xml
Sitemap: https://getvendora.net/sitemap-tools.xml
Sitemap: https://getvendora.net/bahrain-saudi-gcc-transport/sitemap-index.xml
Sitemap: https://getvendora.net/sitemap-gcc-transport-en.xml
"""


def update_robots(report: Report) -> None:
    content = build_robots_txt()
    if ROBOTS_PATH.read_text(encoding="utf-8") != content:
        ROBOTS_PATH.write_text(content, encoding="utf-8")
        report.fixes.append(
            "Expanded robots.txt with private-path disallows (_site, demo, nada Menu, admin, care, ai-chat-test, zip)"
        )
        report.files_modified.append("robots.txt")


def ensure_noindex(path: Path, report: Report) -> None:
    if not path.exists():
        report.warnings.append(f"Missing expected page: {path.relative_to(ROOT).as_posix()}")
        return
    text = path.read_text(encoding="utf-8", errors="replace")
    if ROBOTS_META_RE.search(text):
        m = ROBOTS_META_RE.search(text)
        if m and "noindex" in m.group(1).lower():
            return
    robots_tag = '  <meta name="robots" content="noindex, nofollow" />\n'
    if "<meta charset" in text:
        new_text = re.sub(
            r'(<meta\s+charset[^>]*>\s*)',
            r"\1" + robots_tag,
            text,
            count=1,
            flags=re.I,
        )
    elif "<head>" in text:
        new_text = text.replace("<head>", "<head>\n" + robots_tag, 1)
    else:
        report.warnings.append(f"Could not inject noindex into {path.relative_to(ROOT).as_posix()}")
        return
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        rel = path.relative_to(ROOT).as_posix()
        report.fixes.append(f"Added noindex,nofollow meta to {rel}")
        report.files_modified.append(rel)


def write_site_robots(report: Report) -> None:
    site_dir = ROOT / "_site"
    if not site_dir.is_dir():
        return
    robots = site_dir / "robots.txt"
    content = "User-agent: *\nDisallow: /\n"
    if not robots.exists() or robots.read_text(encoding="utf-8") != content:
        robots.write_text(content, encoding="utf-8")
        report.fixes.append("Created _site/robots.txt blocking all crawlers (build mirror defense)")
        report.files_modified.append("_site/robots.txt")


def audit_noindex_private(report: Report) -> None:
    checks = [
        ROOT / "nada Menu" / "index.html",
        ROOT / "nada Menu" / "admin.html",
        ROOT / "bahrain-saudi-gcc-transport" / "admin" / "index.html",
        ROOT / "bahrain-saudi-gcc-transport" / "care" / "index.html",
        ROOT / "bahrain-saudi-gcc-transport" / "care" / "en" / "index.html",
    ]
    for demo in (ROOT / "demo").glob("*/index.html"):
        checks.append(demo)
    for path in checks:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        m = ROBOTS_META_RE.search(text)
        if not m or "noindex" not in m.group(1).lower():
            rel = path.relative_to(ROOT).as_posix()
            report.noindex_gaps.append(rel)


def audit_canonicals(report: Report) -> None:
    _, urls = read_urlset(ROOT / "sitemap.xml")
    for loc, _ in urls[:120]:
        path_part = urlparse(loc).path
        if not path_part.endswith("/"):
            html_path = ROOT / path_part.lstrip("/") / "index.html"
        else:
            html_path = ROOT / path_part.lstrip("/") / "index.html"
        if path_part in ("/", ""):
            html_path = ROOT / "index.html"
        if not html_path.exists():
            continue
        text = html_path.read_text(encoding="utf-8", errors="replace")
        m = CANONICAL_RE.search(text)
        if not m:
            report.canonical_issues.append(f"Missing canonical: {html_path.relative_to(ROOT).as_posix()}")
            continue
        canonical = m.group(1).rstrip("/") + ("/" if loc.endswith("/") and not m.group(1).endswith(".html") else "")
        if canonical.rstrip("/") != loc.rstrip("/"):
            report.canonical_issues.append(
                f"Canonical mismatch {html_path.relative_to(ROOT).as_posix()}: {m.group(1)} vs sitemap {loc}"
            )


def audit_jsonld(report: Report) -> None:
    samples = [
        ROOT / "index.html",
        ROOT / "about" / "index.html",
        ROOT / "tools" / "commission-calculator" / "index.html",
        ROOT / "bahrain-saudi-gcc-transport" / "bahrain-to-qatar" / "index.html",
        ROOT / "bahrain-saudi-gcc-transport" / "en" / "bahrain-to-qatar" / "index.html",
    ]
    for path in samples:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for i, block in enumerate(JSONLD_RE.findall(text), 1):
            raw = block.strip()
            try:
                json.loads(raw)
            except json.JSONDecodeError as exc:
                rel = path.relative_to(ROOT).as_posix()
                report.jsonld_errors.append(f"{rel} block#{i}: {exc}")


def verify_sitemap_refs(report: Report) -> None:
    robots = ROBOTS_PATH.read_text(encoding="utf-8")
    required = [
        "sitemap.xml",
        "sitemap-tools.xml",
        "bahrain-saudi-gcc-transport/sitemap-index.xml",
        "sitemap-gcc-transport-en.xml",
    ]
    for req in required:
        if req not in robots:
            report.warnings.append(f"robots.txt missing Sitemap reference: {req}")


def owner_action_items(report: Report) -> None:
    if (ROOT / "_site").is_dir():
        count = len(list((ROOT / "_site").rglob("index.html")))
        if count > 0:
            report.owner_action.append(
                f"_site/ contains {count} HTML mirror pages (gitignored). Confirm Cloudflare Pages publish directory is repo root, not _site/, and request GSC removal if /_site/ URLs were ever indexed."
            )
    if report.sitemap_removed:
        report.owner_action.append(
            "In Google Search Console, inspect/removal-request any already-indexed URLs for llms.txt, ai-index.json, tools-catalog.json, and demo pages if they appear in Coverage."
        )
    report.owner_action.append(
        "Admin CRM (/bahrain-saudi-gcc-transport/admin/) relies on noindex + robots; add Cloudflare Access or HTTP auth for true access control."
    )
    report.owner_action.append(
        "Resubmit sitemap.xml in GSC after deploy so Google drops removed machine-file and demo URLs from crawl queue."
    )


def main() -> None:
    report = Report()
    clean_sitemaps(report)
    update_robots(report)
    for page in PRIVATE_NOINDEX_PAGES:
        ensure_noindex(page, report)
    write_site_robots(report)
    audit_noindex_private(report)
    audit_canonicals(report)
    audit_jsonld(report)
    verify_sitemap_refs(report)
    owner_action_items(report)

    removed_total = sum(len(v) for v in report.sitemap_removed.values())
    report.fixes.append(f"Sitemap health: {removed_total} polluting URL(s) removed across {len(report.sitemap_removed)} file(s)")
    if not report.noindex_gaps:
        report.fixes.append("Verified noindex on nada Menu, demo, admin, and care pages")
    if not report.jsonld_errors:
        report.fixes.append("Verified JSON-LD validity on sampled money/entity pages")
    if not report.canonical_issues:
        report.fixes.append("Verified canonical tags on sampled sitemap pages")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(
            {
                "fixes": report.fixes,
                "files_modified": sorted(set(report.files_modified)),
                "sitemap_removed": report.sitemap_removed,
                "noindex_gaps": report.noindex_gaps,
                "canonical_issues": report.canonical_issues,
                "jsonld_errors": report.jsonld_errors,
                "owner_action": report.owner_action,
                "warnings": report.warnings,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    print(f"Phase 6 complete. Report: {REPORT_PATH.relative_to(ROOT)}")
    print(f"Fixes applied: {len(report.fixes)}")
    print(f"Files modified: {len(set(report.files_modified))}")
    if report.noindex_gaps:
        print(f"Noindex gaps remaining: {len(report.noindex_gaps)}")
    if report.canonical_issues:
        print(f"Canonical issues: {len(report.canonical_issues)}")


if __name__ == "__main__":
    main()
