#!/usr/bin/env python3
"""Audit and auto-fix GA4/Clarity tracking across public HTML pages."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {
    "node_modules",
    ".git",
    ".wrangler",
    "test-results",
    "playwright-report",
    "zip",
    "_site",
    ".codex-remote-attachments",
    "demo",
}
PRIVATE_PATTERNS = [
    re.compile(r"/admin(/|$)", re.I),
    re.compile(r"/care(/|$)", re.I),
    re.compile(r"ai-chat-test", re.I),
    re.compile(r"pdf-converter-lab", re.I),
    re.compile(r"nada menu", re.I),
    re.compile(r"/demo/", re.I),
    re.compile(r"/tests/", re.I),
    re.compile(r"test-results", re.I),
]
INLINE_CLARITY_RE = re.compile(
    r"<script>\s*\(function\(c,l,a,r,i,t,y\)\{[\s\S]*?clarity\.ms/tag/[\s\S]*?</script>\s*",
    re.I,
)
CF_BEACON_RE = re.compile(
    r"\s*<script defer src=\"https://static\.cloudflareinsights\.com/beacon\.min\.js[^\"]*\"[^>]*></script>\s*",
    re.I,
)

LOADER_RE = re.compile(r"<script[^>]*analytics-loader\.js[^>]*>\s*</script>", re.I)
INLINE_GA_BLOCK_RE = re.compile(
    r"<script[^>]*googletagmanager\.com/gtag/js[^>]*>\s*</script>\s*"
    r"<script>\s*window\.dataLayer[\s\S]*?gtag\s*\(\s*['\"]config['\"][\s\S]*?</script>",
    re.I,
)
INLINE_GA_SCRIPT_ONLY_RE = re.compile(
    r"<script>\s*window\.dataLayer[\s\S]*?gtag\s*\(\s*['\"]config['\"][\s\S]*?</script>",
    re.I,
)
CLARITY_HELPER_RE = re.compile(r"<script[^>]*clarity-helper\.js[^>]*>\s*</script>", re.I)


def is_private(rel: str) -> bool:
    for pat in PRIVATE_PATTERNS:
        if pat.search(rel):
            return True
    return False


def should_skip(path: Path) -> bool:
    if set(path.parts) & SKIP_DIRS:
        return True
    if "backups" in path.parts:
        return True
    return False


def loader_src(rel: str) -> str:
    if rel == "index.html":
        depth = 0
    elif rel.endswith("/index.html"):
        depth = rel[: -len("index.html")].count("/")
    else:
        depth = rel.count("/")
    prefix = "../" * depth
    return f"{prefix}assets/analytics-loader.js"


def clarity_src(rel: str) -> str:
    if rel == "index.html":
        depth = 0
    elif rel.endswith("/index.html"):
        depth = rel[: -len("index.html")].count("/")
    else:
        depth = rel.count("/")
    prefix = "../" * depth
    return f"{prefix}assets/clarity-helper.js"


def inject_before_body_end(html: str, snippet: str) -> str:
    if snippet.strip() in html:
        return html
    lower = html.lower()
    idx = lower.rfind("</body>")
    if idx == -1:
        return html + "\n" + snippet + "\n"
    return html[:idx] + snippet + "\n" + html[idx:]


def remove_duplicate_ga(html: str) -> tuple[str, bool]:
    changed = False
    new_html, n = INLINE_GA_BLOCK_RE.subn("", html)
    if n:
        html = new_html
        changed = True
    new_html, n = INLINE_GA_SCRIPT_ONLY_RE.subn("", html)
    if n:
        html = new_html
        changed = True
    return html, changed


def normalize_loader_path(html: str, rel: str) -> tuple[str, bool]:
    expected = loader_src(rel)
    changed = False

    def repl(match: re.Match[str]) -> str:
        nonlocal changed
        tag = match.group(0)
        if expected in tag:
            return tag
        changed = True
        return f'<script defer src="{expected}"></script>'

    html = LOADER_RE.sub(repl, html)
    return html, changed


def fix_file(path: Path) -> dict:
    rel = path.relative_to(ROOT).as_posix()
    original = path.read_text(encoding="utf-8", errors="ignore")
    html = original
    fixes: list[str] = []

    html, removed_dup = remove_duplicate_ga(html)
    if removed_dup:
        fixes.append("removed_duplicate_inline_ga4")

    html, cf_removed = CF_BEACON_RE.subn("", html)
    if cf_removed:
        fixes.append("removed_duplicate_cloudflare_beacon")

    has_loader = bool(LOADER_RE.search(html))
    if not has_loader:
        snippet = f'  <script defer src="{loader_src(rel)}"></script>'
        html = inject_before_body_end(html, snippet)
        fixes.append("added_analytics_loader")

    html, normalized = normalize_loader_path(html, rel)
    if normalized:
        fixes.append("normalized_analytics_loader_path")

    # clarity-helper on marketing/homepage only (loader already loads Clarity tag)
    if rel == "index.html" and not CLARITY_HELPER_RE.search(html):
        snippet = f'  <script defer src="{clarity_src(rel)}"></script>'
        html = inject_before_body_end(html, snippet)
        fixes.append("added_clarity_helper")

    changed = html != original
    if changed:
        path.write_text(html, encoding="utf-8", newline="\n")

    has_loader_after = bool(LOADER_RE.search(html))
    has_ga = has_loader_after or "googletagmanager.com/gtag/js" in html or "gtag(" in html
    has_clarity = has_loader_after or "clarity.ms/tag/" in html or CLARITY_HELPER_RE.search(html)

    return {
        "file": rel,
        "changed": changed,
        "fixes": fixes,
        "has_ga": has_ga,
        "has_loader": has_loader_after,
        "has_clarity": bool(has_clarity),
        "duplicate_ga": has_loader_after and "googletagmanager.com/gtag/js" in html,
    }


def analyze(html: str) -> dict:
    has_loader = bool(LOADER_RE.search(html))
    has_inline_ga = "googletagmanager.com/gtag/js" in html
    has_ga = has_loader or has_inline_ga or "gtag(" in html
    has_clarity = has_loader or "clarity.ms/tag/" in html or bool(CLARITY_HELPER_RE.search(html))
    return {
        "has_ga": has_ga,
        "has_loader": has_loader,
        "has_clarity": bool(has_clarity),
        "duplicate_ga": has_loader and has_inline_ga,
    }


def main() -> None:
    public_files: list[Path] = []
    private_count = 0

    for path in ROOT.rglob("*.html"):
        if should_skip(path):
            continue
        rel = path.relative_to(ROOT).as_posix()
        if is_private(rel):
            private_count += 1
            continue
        public_files.append(path)

    modified_files: list[str] = []
    fixes_applied: list[str] = []
    post_missing_ga: list[str] = []
    post_missing_clarity: list[str] = []
    post_dup_ga: list[str] = []
    with_ga = 0
    with_clarity = 0

    for path in sorted(public_files):
        result = fix_file(path)
        if result["changed"]:
            modified_files.append(result["file"])
            for fix in result["fixes"]:
                label = f"{fix} ({result['file']})"
                if label not in fixes_applied:
                    fixes_applied.append(label)
        if result["has_ga"]:
            with_ga += 1
        else:
            post_missing_ga.append(result["file"])
        if result["has_clarity"]:
            with_clarity += 1
        else:
            post_missing_clarity.append(result["file"])
        if result["duplicate_ga"]:
            post_dup_ga.append(result["file"])

    # Improve private-path detection in shared loader (ai-chat-test, care)
    loader_path = ROOT / "assets" / "analytics-loader.js"
    loader_text = loader_path.read_text(encoding="utf-8")
    old_private = "return /(^|\\/)(admin|api|private|test|tests|test-results|care|ai-chat-test)(\\/|$)/.test(path);"
    new_private = (
        "return /(^|\\/)(admin|api|private|test|tests|test-results|care|ai-chat-test|demo|nada menu|pdf-converter-lab)(\\/|$)/.test(path);"
    )
    if old_private in loader_text and new_private not in loader_text:
        loader_path.write_text(loader_text.replace(old_private, new_private), encoding="utf-8", newline="\n")
        modified_files.append("assets/analytics-loader.js")
        fixes_applied.append("expanded_private_path_detection_in_analytics_loader")

    router_path = ROOT / "js" / "analytics-router.js"
    router_text = router_path.read_text(encoding="utf-8")
    old_router_private = "if (/(^|\\/)(admin|api|private|test|tests|test-results|care|ai-chat-test)(\\/|$)/.test(path)) return;"
    new_router_private = (
        "if (/(^|\\/)(admin|api|private|test|tests|test-results|care|ai-chat-test|demo|nada menu|pdf-converter-lab)(\\/|$)/.test(path)) return;"
    )
    if old_router_private in router_text and new_router_private not in router_text:
        router_path.write_text(router_text.replace(old_router_private, new_router_private), encoding="utf-8", newline="\n")
        modified_files.append("js/analytics-router.js")
        fixes_applied.append("expanded_private_path_detection_in_analytics_router")

    # Strip tracking from excluded/private HTML that should not pollute GA4.
    cleanup_targets: list[Path] = []
    for path in ROOT.rglob("*.html"):
        if "test-results" in path.parts:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if is_private(rel) or rel.startswith("demo/"):
            cleanup_targets.append(path)

    for path in cleanup_targets:
        rel = path.relative_to(ROOT).as_posix()
        original = path.read_text(encoding="utf-8", errors="ignore")
        html = original
        html, ga_removed = remove_duplicate_ga(html)
        html, cf_removed = CF_BEACON_RE.subn("", html)
        html = INLINE_CLARITY_RE.sub("", html)
        html = LOADER_RE.sub("", html)
        html = CLARITY_HELPER_RE.sub("", html)
        if html != original:
            path.write_text(html, encoding="utf-8", newline="\n")
            modified_files.append(rel)
            fixes_applied.append(f"removed_tracking_from_private_page ({rel})")

    # Prevent double page_view: GA4 auto page_view + custom page_view event
    loader_text = loader_path.read_text(encoding="utf-8")
    old_cfg = "window.gtag('config', gaId, analyticsContext({ send_page_view: true }));"
    new_cfg = "window.gtag('config', gaId, analyticsContext({ send_page_view: false }));"
    if old_cfg in loader_text:
        loader_path.write_text(loader_text.replace(old_cfg, new_cfg), encoding="utf-8", newline="\n")
        if "assets/analytics-loader.js" not in modified_files:
            modified_files.append("assets/analytics-loader.js")
        fixes_applied.append("disabled_duplicate_ga4_auto_page_view_send_page_view_false")

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalPublicPages": len(public_files),
        "privatePagesExcluded": private_count,
        "pagesWithGa4": with_ga,
        "pagesMissingGa4": len(post_missing_ga),
        "pagesWithClarity": with_clarity,
        "pagesMissingClarity": len(post_missing_clarity),
        "duplicateGaRemaining": len(post_dup_ga),
        "modifiedFiles": sorted(set(modified_files)),
        "fixesApplied": fixes_applied,
        "missingGaFiles": post_missing_ga,
        "missingClarityFiles": post_missing_clarity,
        "duplicateGaFiles": post_dup_ga,
    }

    out = ROOT / "tests" / "tracking-fix-report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in report if k not in ("missingGaFiles", "missingClarityFiles", "duplicateGaFiles", "fixesApplied", "modifiedFiles")}, indent=2))
    print("modified", len(report["modifiedFiles"]))
    print("fixes", len(report["fixesApplied"]))


if __name__ == "__main__":
    main()
