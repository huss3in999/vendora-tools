/**
 * Regenerate tools/small-business/index.html from smb-row-manifest.inc.html
 * (updated by generate_smb_manifest_calculators.py when calculator rows change).
 * Run: node tools/small-business/rebuild-small-business-hub.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname);
const INC = path.join(ROOT, "smb-row-manifest.inc.html");
const OUT = path.join(ROOT, "index.html");

function categoryFor(slug) {
  if (
    /^(california|florida|missouri|new-jersey|ohio)-sales-tax$/.test(slug) ||
    slug === "sales-tax" ||
    slug === "margin-sales-tax" ||
    slug === "margin-and-vat" ||
    slug === "real-estate-commission-vat"
  ) {
    return "taxes";
  }
  if (
    slug === "after-tax-cost-of-debt" ||
    slug === "amortization" ||
    slug === "business-loan" ||
    slug === "debt" ||
    slug.startsWith("debt-") ||
    slug.startsWith("loan") ||
    slug === "ltv" ||
    slug === "net-debt" ||
    slug === "partially-amortized-loan" ||
    slug === "deferred-payment-loan" ||
    slug === "economic-injury-disaster-loan" ||
    slug === "home-improvement-loan" ||
    slug === "cash-flow-to-debt"
  ) {
    return "loans";
  }
  if (
    slug === "churn-rate" ||
    slug === "marketing-conversion" ||
    slug === "online-marketing-roi" ||
    slug === "roas" ||
    slug === "website-ad-revenue" ||
    slug === "hr-software-roi" ||
    slug === "revenue-growth" ||
    slug === "revenue-per-employee" ||
    slug === "cpa" ||
    slug === "cpc-cpm" ||
    slug === "cpm"
  ) {
    return "marketing";
  }
  if (
    slug === "3d-printer-buy-vs-outsource" ||
    slug === "burndown-chart" ||
    slug === "cost-of-doing-business" ||
    slug === "days-inventory-outstanding" ||
    slug === "days-sales-outstanding" ||
    slug === "direct-material-price-variance" ||
    slug === "ending-inventory" ||
    slug === "fifo-for-inventories" ||
    slug === "inventory-turnover" ||
    slug === "labor-cost" ||
    slug === "operating-asset-turnover" ||
    slug === "fixed-asset-turnover" ||
    slug === "total-asset-turnover" ||
    slug === "receivables-turnover" ||
    slug === "working-capital-turnover-ratio" ||
    slug === "turnover-rate" ||
    slug === "average-fixed-cost" ||
    slug === "marginal-cost"
  ) {
    return "inventory";
  }
  if (
    slug === "business-valuation" ||
    slug === "dcf" ||
    slug === "pre-and-post-money-valuation" ||
    slug === "ev-to-sales" ||
    slug === "price-per-share" ||
    slug === "price-to-book-ratio" ||
    slug === "price-to-cash-flow-ratio" ||
    slug === "price-to-earnings" ||
    slug === "price-to-sales-ratio" ||
    slug === "payback-period" ||
    slug === "modified-irr" ||
    slug === "profitability-index" ||
    slug === "opportunity-cost" ||
    slug === "futures-contract" ||
    slug === "bond-price" ||
    slug === "accumulated-depreciation" ||
    slug === "actual-cash-value" ||
    slug === "car-depreciation" ||
    slug === "depreciation" ||
    slug === "residual-income" ||
    slug === "wacc" ||
    slug === "cost-of-capital" ||
    slug === "cost-of-equity" ||
    slug === "ebitda-multiple" ||
    slug === "divdend-discount-model" ||
    slug === "software-contract-value" ||
    slug === "saas-ltv" ||
    slug === "saas-metrics" ||
    slug === "build-or-buy" ||
    slug === "roi" ||
    slug === "roic"
  ) {
    return "valuation";
  }
  if (
    slug === "accounting-profit" ||
    slug === "contribution-margin" ||
    slug === "ebit" ||
    slug === "ebitda" ||
    slug === "ebitda-margin" ||
    slug === "economic-profit" ||
    slug === "gross-margin" ||
    slug === "gmroi" ||
    slug === "net-income" ||
    slug === "net-profit-margin" ||
    slug === "operating-margin" ||
    slug === "profit" ||
    slug === "margin" ||
    slug === "margin-2-sets" ||
    slug === "margin-discount" ||
    slug === "margin-interest" ||
    slug === "margin-of-safety" ||
    slug === "markup" ||
    slug === "markup-beta-feedback" ||
    slug === "cogs" ||
    slug === "expense-ratio" ||
    slug === "loss-ratio" ||
    slug === "degree-of-operating-leverage" ||
    slug === "net-operating-income" ||
    slug === "net-operating-assets" ||
    slug === "gross-to-net" ||
    slug === "net-to-gross" ||
    slug === "marginal-revenue"
  ) {
    return "profit";
  }
  if (
    slug === "commission" ||
    slug === "discount" ||
    slug === "double-discount" ||
    slug === "triple-discount" ||
    slug === "percentage-discount" ||
    slug === "optimal-price" ||
    slug === "price-elasticity-demand" ||
    slug === "price-elasticity-supply" ||
    slug === "cross-price-elasticity" ||
    slug === "income-elasticity-demand" ||
    slug === "deadweight-loss" ||
    slug === "sales" ||
    slug === "sales-commission" ||
    slug === "revenue" ||
    slug === "real-estate-commission" ||
    slug === "rental-commission" ||
    slug === "true-cost-of-real-estate-commission" ||
    slug === "price-per-sqft" ||
    slug === "price-per-square-meter" ||
    slug === "price-quantity" ||
    slug === "gross-rent-multiplier" ||
    slug === "break-even"
  ) {
    return "pricing";
  }
  return "finance";
}

function shortTitle(name, slug) {
  if (slug === "days-sales-outstanding") return "days sales outstanding (collection speed)";
  if (slug === "days-inventory-outstanding") return "days inventory on hand";
  let s = name
    .replace(/\s*\|\s*Loan Payoff Calculator.*$/i, "")
    .replace(/\s*Calculator(\s+for Small Business)?$/i, "")
    .replace(/\s*\|\s*Small Business$/i, "")
    .replace(/\s*—\s*Cost per Acquisition.*$/iu, "")
    .replace(/\s*—\s*.*$/u, "")
    .trim();
  s = s.replace(/\s+Calculator$/i, "").trim();
  return s;
}

function describe(name, slug) {
  const s = shortTitle(name, slug);
  return `Explore ${s} with a simple layout, quick inputs, and instant totals—built for owners, operators, and lean teams.`;
}

function he(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeBasicEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

const CAT_ORDER = [
  ["finance", "Finance & Cash Flow"],
  ["profit", "Profit & Margin"],
  ["pricing", "Pricing & Sales"],
  ["loans", "Loans & Debt"],
  ["inventory", "Inventory & Operations"],
  ["marketing", "Marketing & Growth"],
  ["taxes", "Taxes"],
  ["valuation", "Valuation & Business Planning"],
];

function parseRows(html) {
  const re = /<tr><td>([^<]+)<\/td><td><code>([^<]+)<\/code><\/td>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push({ name: decodeBasicEntities(m[1]), slug: m[2] });
  }
  return out;
}

function buildTools(rows) {
  return rows.map((t) => ({
    n: t.name,
    s: t.slug,
    u: `calculators/${t.slug}/index.html`,
    c: categoryFor(t.slug),
    d: describe(t.name, t.slug),
  }));
}

function cardHtml(t) {
  return `<article class="sb-card" data-cat="${he(t.c)}"><h3 class="sb-card-title">${he(t.n)}</h3><p class="sb-card-desc">${he(t.d)}</p><a class="btn btn-primary sb-card-cta" href="${he(t.u)}">Open calculator</a></article>`;
}

function emitIndex(tools) {
  const sections = CAT_ORDER.map(([id, label]) => {
    const items = tools.filter((t) => t.c === id);
    if (!items.length) return "";
    return `<section class="sb-cat-block" id="cat-${he(id)}" aria-labelledby="ttl-${he(id)}"><h2 class="sb-cat-heading section-title" id="ttl-${he(id)}">${he(label)}</h2><div class="sb-grid">${items.map(cardHtml).join("\n")}</div></section>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Small Business Calculators | Finance, Pricing &amp; Planning | Vendora</title>
  <meta name="description" content="Browse free small-business calculators for cash flow, margins, loans, inventory, marketing, taxes, and planning. Built for owners, restaurants, freelancers, and lean teams—runs in your browser.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://getvendora.net/tools/small-business/">
  <meta property="og:title" content="Small Business Calculators | Vendora">
  <meta property="og:description" content="Practical calculators for cash flow, pricing, profit, loans, inventory, marketing, and taxes—organized for quick browsing.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://getvendora.net/tools/small-business/">
  <meta property="og:image" content="https://getvendora.net/images/street-bites-featured-wrap.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="../tool-system.css">
  <style>
    .sb-hero-intro { max-width: 52rem; margin-top: 1rem; color: var(--muted); font-size: 1rem; line-height: 1.75; }
    .sb-toolbar-wrap { position: sticky; top: 0; z-index: 40; margin: 1.25rem 0 1.5rem; padding: 0.75rem 0 1rem; background: linear-gradient(180deg, rgba(8, 19, 36, 0.96) 70%, rgba(8, 19, 36, 0)); backdrop-filter: blur(10px); }
    .sb-toolbar { display: flex; flex-direction: column; gap: 0.85rem; padding: 1rem 1.1rem; border-radius: var(--radius-lg); border: 1px solid var(--line); background: var(--panel-strong); box-shadow: var(--shadow); }
    .sb-search-row { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center; }
    .sb-search-label { font-size: 0.82rem; font-weight: 700; color: var(--muted); letter-spacing: 0.04em; text-transform: uppercase; }
    .sb-search { flex: 1; min-width: 12rem; padding: 0.65rem 0.85rem; border-radius: 12px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text); font-size: 1rem; }
    .sb-search::placeholder { color: var(--muted); opacity: 0.85; }
    .sb-chips { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; }
    .sb-chip { border: 1px solid var(--line); background: var(--surface-chip); color: var(--text); padding: 0.45rem 0.85rem; border-radius: 999px; font-size: 0.86rem; font-weight: 600; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
    .sb-chip:hover { border-color: rgba(0, 208, 132, 0.35); }
    .sb-chip[aria-pressed="true"] { background: rgba(0, 208, 132, 0.16); border-color: rgba(0, 208, 132, 0.45); color: var(--brand); }
    .sb-related { margin-top: 2rem; padding: 1.25rem 1.35rem; border-radius: var(--radius-lg); border: 1px solid var(--line); background: var(--panel); }
    .sb-related h2 { margin: 0 0 0.5rem; font-size: 1.15rem; }
    .sb-related p { margin: 0; color: var(--muted); line-height: 1.65; }
    .sb-related a { color: var(--brand); font-weight: 600; text-decoration: none; }
    .sb-related a:hover { text-decoration: underline; }
    .sb-cat-block { margin-bottom: 2.25rem; scroll-margin-top: 7rem; }
    .sb-cat-block--hidden { display: none !important; }
    .sb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 1rem; }
    .sb-card { padding: 1.15rem 1.2rem; border-radius: var(--radius-md); border: 1px solid var(--line); background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)); display: flex; flex-direction: column; gap: 0.65rem; min-height: 9.5rem; }
    .sb-card-title { margin: 0; font-size: 1.05rem; line-height: 1.35; letter-spacing: -0.02em; }
    .sb-card-desc { margin: 0; flex: 1; color: var(--muted); font-size: 0.9rem; line-height: 1.55; }
    .sb-card-cta { align-self: flex-start; margin-top: auto; }
    .sb-card--hidden { display: none !important; }
    .sb-empty { text-align: center; padding: 2rem 1rem; color: var(--muted); border-radius: var(--radius-md); border: 1px dashed var(--line); margin-top: 0.5rem; }
    .sb-empty[hidden] { display: none !important; }
  </style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-DFY197R2MS"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-DFY197R2MS');
  </script>
  <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Small Business Calculators",
      url: "https://getvendora.net/tools/small-business/",
      description:
        "Directory of free calculators for small businesses: cash flow, profit, pricing, loans, inventory, marketing, taxes, and planning.",
      isPartOf: { "@type": "WebSite", name: "Vendora", url: "https://getvendora.net/" },
    }).replace(/</g, "\\u003c")}</script>
</head>
<body class="vendora-tool">
  <main class="page-shell sb-hub">
    <header class="card faq site-nav">
      <a class="site-nav-brand" href="/">Vendora</a>
      <nav aria-label="Primary">
        <p class="section-copy">
          <a href="/">Home</a> |
          <a href="/tools/">Tools</a> |
          <a href="/all-tools/">All tools</a> |
          <span aria-current="page">Small Business</span>
        </p>
      </nav>
    </header>

    <section class="hero">
      <p class="eyebrow">Free tools</p>
      <h1>Small Business Calculators</h1>
      <p class="hero-copy">Find practical calculators for finance, pricing, profit, operations, inventory, and growth—organized so you can move from question to answer in minutes.</p>
      <p class="sb-hero-intro">Whether you run a storefront, a restaurant, a freelance practice, or a growing team, these calculators help you sanity-check budgets, offers, loans, and performance. Everything runs locally in your browser; use results alongside advice from your accountant or advisor when decisions are material.</p>
    </section>

    <div class="sb-toolbar-wrap">
      <div class="sb-toolbar" role="region" aria-label="Browse calculators">
        <div class="sb-search-row">
          <span class="sb-search-label" id="sb-search-lbl">Search</span>
          <input class="sb-search" type="search" id="sb-search" autocomplete="off" placeholder="Search by name or topic…" aria-labelledby="sb-search-lbl">
        </div>
        <div class="sb-chips" id="sb-chips" role="toolbar" aria-label="Categories"></div>
      </div>
    </div>

    <div id="sb-browse">${sections}</div>
    <p class="sb-empty" id="sb-empty" hidden>No calculators match that search. Try another word or clear the category filter.</p>

    <section class="sb-related card faq" aria-labelledby="sb-related-h">
      <h2 id="sb-related-h" class="section-title">More on Vendora</h2>
      <p>Explore the full <a href="/tools/">tools directory</a> for restaurant apps and worksheets, open the searchable <a href="/all-tools/">all tools</a> page, or browse structured <a href="/calculator/finance/">finance worksheets</a> under Calculator.</p>
    </section>

    <footer class="card faq site-nav">
      <nav aria-label="Footer">
        <p class="section-copy">
          <a href="/">Home</a> |
          <a href="/tools/">Tools</a> |
          <a href="/privacy-policy/">Privacy</a>
        </p>
      </nav>
    </footer>
  </main>

  <script>
(function () {
  var CAT_ORDER = ${JSON.stringify(CAT_ORDER)};
  var chipsEl = document.getElementById("sb-chips");
  var searchEl = document.getElementById("sb-search");
  var emptyEl = document.getElementById("sb-empty");
  var active = "all";

  var frag = document.createDocumentFragment();
  var allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "sb-chip";
  allBtn.setAttribute("aria-pressed", "true");
  allBtn.dataset.cat = "all";
  allBtn.textContent = "All categories";
  frag.appendChild(allBtn);
  CAT_ORDER.forEach(function (pair) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "sb-chip";
    b.setAttribute("aria-pressed", "false");
    b.dataset.cat = pair[0];
    b.textContent = pair[1];
    frag.appendChild(b);
  });
  chipsEl.appendChild(frag);

  function norm(s) { return (s || "").toLowerCase(); }

  function apply() {
    var q = norm(searchEl.value).trim();
    var cards = document.querySelectorAll(".sb-card");
    var sections = document.querySelectorAll(".sb-cat-block");
    var nShown = 0;
    cards.forEach(function (card) {
      var cat = card.getAttribute("data-cat");
      var text = norm(card.innerText);
      var catOk = active === "all" || cat === active;
      var qOk = !q || text.indexOf(q) !== -1;
      var show = catOk && qOk;
      card.classList.toggle("sb-card--hidden", !show);
      if (show) nShown++;
    });
    sections.forEach(function (sec) {
      var any = false;
      sec.querySelectorAll(".sb-card").forEach(function (c) {
        if (!c.classList.contains("sb-card--hidden")) any = true;
      });
      sec.classList.toggle("sb-cat-block--hidden", !any);
    });
    emptyEl.hidden = nShown > 0;
  }

  chipsEl.addEventListener("click", function (e) {
    var t = e.target.closest(".sb-chip");
    if (!t || !chipsEl.contains(t)) return;
    active = t.getAttribute("data-cat") || "all";
    chipsEl.querySelectorAll(".sb-chip").forEach(function (b) {
      b.setAttribute("aria-pressed", b === t ? "true" : "false");
    });
    apply();
  });

  var tmr;
  searchEl.addEventListener("input", function () {
    clearTimeout(tmr);
    tmr = setTimeout(apply, 120);
  });

  apply();
})();
  </script>
</body>
</html>`;
}

if (!fs.existsSync(INC)) {
  console.error("Missing", INC);
  process.exit(1);
}
const rows = parseRows(fs.readFileSync(INC, "utf8"));
if (!rows.length) {
  console.error("No rows parsed from manifest fragment");
  process.exit(1);
}
const tools = buildTools(rows);
fs.writeFileSync(OUT, emitIndex(tools), "utf8");
console.log("Wrote", OUT, "(" + tools.length + " tools)");
