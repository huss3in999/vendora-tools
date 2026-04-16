#!/usr/bin/env python3
"""Generate SMB manifest calculator pages + update index.html (Pending -> Done)."""
from __future__ import annotations

import html as html_lib
import json
import re
import shutil
from pathlib import Path

from smb_registry_data import CURRENCY_KINDS, RATIO_LABELS, SLUG_KIND

ROOT = Path(__file__).resolve().parent
# Row-level manifest for generator sync (public hub is tools/small-business/index.html).
ROW_MANIFEST = ROOT / "smb-row-manifest.inc.html"
CALC = ROOT / "calculators"
STYLE_SRC = CALC / "average-fixed-cost" / "style.css"
BASE_URL = "https://getvendora.net"
OG_IMAGE = f"{BASE_URL}/images/street-bites-featured-wrap.svg"
GA = "G-DFY197R2MS"

DONE_SLUGS = {
    "3d-printer-buy-vs-outsource",
    "accounting-profit",
    "accumulated-depreciation",
    "actual-cash-value",
    "after-tax-cost-of-debt",
    "amortization",
    "average-fixed-cost",
    "bond-price",
    "break-even",
    "cogs",
    "contribution-margin",
    "ebitda-margin",
    "gross-margin",
    "inventory-turnover",
    "labor-cost",
    "profit",
}


def parse_manifest_rows(text: str) -> list[tuple[str, str, str]]:
    """Return list of (title, slug, status) where status is 'pending' or 'done'."""
    pat = re.compile(
        r'<tr><td>(?P<title>[^<]+)</td><td><code>(?P<slug>[^<]+)</code></td>'
        r'<td><span class="status-pill (?P<st>[^"]+)">',
    )
    out = []
    for m in pat.finditer(text):
        st = "done" if m.group("st") == "status-done" else "pending"
        out.append((m.group("title"), m.group("slug"), st))
    return out


def meta_description(title: str, kind: str) -> str:
    t = title.replace("Calculator", "").strip()
    return (
        f"{title}: quick SMB estimate using the same inputs as typical {kind.replace('_', ' ')} models. "
        "Runs locally in your browser."
    )


def json_ld_safe(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)[1:-1]


def related_links(slug: str) -> str:
    pool = [
        ("break-even", "../break-even/index.html", "Break-even"),
        ("gross-margin", "../gross-margin/index.html", "Gross margin"),
        ("profit", "../profit/index.html", "Profit"),
        ("contribution-margin", "../contribution-margin/index.html", "Contribution margin"),
    ]
    links = [p for p in pool if p[0] != slug][:2]
    parts = [f'<a href="{href}">{label}</a>' for _, href, label in links]
    parts.append('<a href="../../index.html">back to the Small Business calculator list</a>')
    return ", ".join(parts)


def field_money(fid: str, label: str, hint: str) -> str:
    return f"""          <div class="field">
            <label for="{fid}">{label}</label>
            <div class="input-inline">
              <input id="{fid}" type="number" inputmode="decimal" step="any" placeholder="{hint}" autocomplete="off">
              <select class="currency-select" data-currency-sync="global" data-currency-default="USD" aria-label="{label} currency"></select>
            </div>
          </div>"""


def field_num(fid: str, label: str, hint: str, min_v: str | None = None) -> str:
    extra = f' min="{min_v}"' if min_v is not None else ""
    return f"""          <div class="field">
            <label for="{fid}">{label}</label>
            <input id="{fid}" type="number" inputmode="decimal" step="any"{extra} placeholder="{hint}" autocomplete="off">
          </div>"""


def field_pct(fid: str, label: str, hint: str) -> str:
    return f"""          <div class="field">
            <label for="{fid}">{label}</label>
            <input id="{fid}" type="number" inputmode="decimal" step="any" placeholder="{hint}" autocomplete="off">
            <span class="input-hint">Percent.</span>
          </div>"""


def collect_field_ids(kind: str, slug: str) -> list[str]:
    """Return input field ids for reset() — must match smb-generic-calc.js per kind."""
    k = kind
    if k == "ratio":
        return ["numerator", "denominator"]
    if k == "ratio_mixed":
        return ["revenue", "employees"]
    if k == "price_per_area":
        return ["price", "area"]
    mapping: dict[str, list[str]] = {
        "budget": ["income", "fixed", "variablePct"],
        "build_buy": ["buildCost", "buyCost", "years", "maintBuild", "maintBuy"],
        "burn": ["cash", "monthlyBurn"],
        "burndown": ["total", "done", "daysLeft"],
        "loan_pmt": ["principal", "annualRate", "years"],
        "loan_balance": ["principal", "annualRate", "years", "paidMonths"],
        "loan_compare": ["p1", "r1", "y1", "p2", "r2", "y2"],
        "simple_interest": ["principal", "annualRate", "years"],
        "churn": ["lost", "start"],
        "wacc": ["equity", "debt", "costEquity", "costDebt", "taxRate"],
        "working_capital": ["currentAssets", "currentLiab"],
        "ccc": ["dio", "dso", "dpo"],
        "dio": ["inventory", "cogs"],
        "dso": ["receivables", "revenue"],
        "margin_pct": ["revenue", "cost"],
        "markup_pct": ["cost", "price"],
        "roi_pct": ["gain", "investment"],
        "roas": ["revenue", "adSpend"],
        "roic": ["nopat", "invested"],
        "cpa": ["spend", "conv"],
        "cpm": ["cost", "impressions"],
        "cpc": ["cost", "clicks"],
        "cpc_cpm": ["cost", "impressions", "clicks"],
        "commission_pct": ["amount", "rate"],
        "discount_single": ["price", "disc"],
        "discount_double": ["price", "d1", "d2"],
        "discount_triple": ["price", "d1", "d2", "d3"],
        "sales_tax": ["price", "rate"],
        "depreciation_sl": ["cost", "salvage", "life"],
        "car_depreciation": ["cost", "rate", "years"],
        "material_variance": ["actualQty", "stdPrice", "actualPrice"],
        "ddm": ["dividend", "discount", "growth"],
        "dcf_gordon": ["fcf", "wacc", "g"],
        "ebit": ["revenue", "cogs", "opex"],
        "ebitda": ["ebit", "da"],
        "ebitda_multiple": ["ev", "ebitda"],
        "economic_profit": ["nopat", "capital", "wacc"],
        "residual_income": ["nopat", "equity", "costEquity"],
        "net_income": ["revenue", "expenses", "taxRate"],
        "noi": ["gross", "opex"],
        "nowc": ["oca", "ocl"],
        "noa": ["oa", "ol"],
        "net_debt": ["debt", "cash"],
        "ev_sales": ["ev", "sales"],
        "pe": ["price", "eps"],
        "pb": ["price", "bv"],
        "ps": ["price", "sps"],
        "pcf": ["price", "cfps"],
        "price_per_share": ["cap", "shares"],
        "revenue_mult": ["price", "qty"],
        "pre_post": ["investment", "pre"],
        "pi": ["pv", "cost"],
        "payback": ["cost", "annualCf"],
        "optimal_price": ["cost", "margin"],
        "opportunity_cost": ["returnA", "returnB"],
        "mos": ["intrinsic", "market"],
        "marginal": ["deltaY", "deltaX"],
        "margin_discount": ["list", "disc", "cost"],
        "margin_vat": ["cost", "priceExVat", "vat"],
        "margin_sales_tax": ["cost", "pricePreTax", "tax"],
        "margin_two_sets": ["rev1", "cost1", "rev2", "cost2"],
        "margin_interest": ["borrowed", "rate", "days"],
        "elasticity": ["pctQ", "pctP"],
        "income_elasticity": ["pctQ", "pctI"],
        "deadweight": ["supplyShift", "priceGap"],
        "debt_consolidation": ["d1", "r1", "d2", "r2"],
        "deferred_loan": ["principal", "annualRate", "deferMonths", "amortMonths"],
        "partial_loan": ["principal", "annualRate", "years", "balloon"],
        "dol": ["deltaOi", "deltaSales"],
        "financial_leverage": ["assets", "equity"],
        "cost_equity_capm": ["rf", "beta", "erp"],
        "ending_inventory": ["begin", "purchases", "cogs"],
        "fifo_simple": ["units", "costA", "costB", "layerA"],
        "ocf": ["ni", "da", "wcChange"],
        "ocf_ratio": ["ocf", "cl"],
        "fcf": ["cfo", "capex"],
        "fcfe": ["ni", "capex", "debtNet"],
        "fcff": ["nopat", "da", "capex", "wcChange"],
        "interest_coverage": ["ebit", "interest"],
        "loss_ratio": ["claims", "premiums"],
        "ltv": ["loan", "value"],
        "futures": ["contract", "price", "contracts"],
        "gmroi": ["gross", "avgInv"],
        "grm": ["price", "annualRent"],
        "gross_to_net": ["gross", "deduct"],
        "net_to_gross": ["net", "rate"],
        "revenue_growth": ["old", "new"],
        "saas_ltv": ["arpu", "margin", "churn"],
        "saas_metrics": ["arr", "growth"],
        "scv": ["annual", "years"],
        "ad_revenue": ["impressions", "ctr", "cpc"],
        "marketing_conversion": ["visitors", "conv"],
        "mirr_simple": ["initial", "fv", "years"],
        "valuation_multiple": ["revenue", "mult"],
        "cost_of_doing_business": ["rent", "payroll", "other"],
        "debt_payoff": ["balance", "annualRate", "payment"],
        "debt_total_interest": ["principal", "annualRate", "years"],
        "loan_repayment_total": ["principal", "annualRate", "years"],
        "turnover_rate": ["left", "avg"],
        "revenue": ["units", "price"],
        "sales": ["transactions", "avg"],
        "percentage_discount": ["list", "disc"],
        "discount_rate": ["fv", "pv", "years"],
        "cost_capital_simple": ["equityPct", "costEq", "debtPct", "costDebt"],
        "real_estate_commission": ["price", "rate"],
        "real_estate_commission_vat": ["price", "rate", "vat"],
        "rental_commission": ["rent", "rate"],
        "true_cost_re": ["price", "rate", "fees"],
        "expense_ratio": ["expenses", "assets"],
        "operating_margin": ["opInc", "revenue"],
        "net_profit_margin": ["net", "revenue"],
        "snowball": ["b1", "b2"],
        "avalanche": ["b1", "r1", "b2", "r2"],
        "ad_revenue": ["impressions", "ctr", "cpc"],
    }
    if k in mapping:
        return mapping[k]
    # fallback
    return []


def build_inputs_html(kind: str, slug: str) -> str:
    """Return inner HTML for calculator-fields."""
    use_cur = kind in CURRENCY_KINDS

    def m(fid: str, lab: str, h: str) -> str:
        return field_money(fid, lab, h) if use_cur or fid in {"numerator", "denominator"} and kind == "ratio" else field_num(fid, lab, h)

    if kind == "ratio":
        nl, dl, _ = RATIO_LABELS.get(
            slug,
            ("Numerator", "Denominator", "Ratio"),
        )
        return "\n".join(
            [
                m("numerator", nl, "e.g. 100000"),
                m("denominator", dl, "e.g. 50000"),
            ]
        )

    if kind == "ratio_mixed":
        return "\n".join(
            [
                field_money("revenue", "Revenue", "e.g. 2400000"),
                field_num("employees", "Average employees", "e.g. 12", "0"),
            ]
        )

    if kind == "price_per_area":
        area_lab = "Square feet" if slug == "price-per-sqft" else "Square meters"
        return "\n".join(
            [
                field_money("price", "Total price", "e.g. 450000"),
                field_money("area", area_lab, "e.g. 1800"),
            ]
        )

    builders = {
        "budget": lambda: "\n".join(
            [
                field_money("income", "Expected monthly income", "e.g. 20000"),
                field_money("fixed", "Fixed monthly costs", "e.g. 12000"),
                field_pct("variablePct", "Variable costs (% of income)", "e.g. 15"),
            ]
        ),
        "build_buy": lambda: "\n".join(
            [
                field_money("buildCost", "Total build cost", "e.g. 80000"),
                field_money("buyCost", "Purchase price", "e.g. 65000"),
                field_num("years", "Analysis horizon (years)", "e.g. 5", "0"),
                field_money("maintBuild", "Annual maintenance if you build", "e.g. 2000"),
                field_money("maintBuy", "Annual maintenance if you buy", "e.g. 3500"),
            ]
        ),
        "burn": lambda: "\n".join(
            [
                field_money("cash", "Cash on hand", "e.g. 120000"),
                field_money("monthlyBurn", "Monthly burn", "e.g. 15000"),
            ]
        ),
        "burndown": lambda: "\n".join(
            [
                field_num("total", "Total work units", "e.g. 120", "0"),
                field_num("done", "Units completed", "e.g. 45", "0"),
                field_num("daysLeft", "Days left in sprint", "e.g. 10", "0"),
            ]
        ),
        "loan_pmt": lambda: "\n".join(
            [
                field_money("principal", "Loan amount", "e.g. 250000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 6.5"),
                field_num("years", "Term (years)", "e.g. 30", "0"),
            ]
        ),
        "loan_balance": lambda: "\n".join(
            [
                field_money("principal", "Original loan amount", "e.g. 200000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 5.9"),
                field_num("years", "Original term (years)", "e.g. 30", "0"),
                field_num("paidMonths", "Months paid so far", "e.g. 36", "0"),
            ]
        ),
        "loan_compare": lambda: "\n".join(
            [
                field_money("p1", "Loan A principal", "e.g. 200000"),
                field_pct("r1", "Loan A annual rate", "e.g. 6"),
                field_num("y1", "Loan A term (years)", "e.g. 30", "0"),
                field_money("p2", "Loan B principal", "e.g. 200000"),
                field_pct("r2", "Loan B annual rate", "e.g. 5.5"),
                field_num("y2", "Loan B term (years)", "e.g. 25", "0"),
            ]
        ),
        "simple_interest": lambda: "\n".join(
            [
                field_money("principal", "Principal", "e.g. 10000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 7"),
                field_num("years", "Time (years)", "e.g. 3", "0"),
            ]
        ),
        "churn": lambda: "\n".join(
            [
                field_num("lost", "Customers lost in period", "e.g. 25", "0"),
                field_num("start", "Customers at start", "e.g. 500", "0"),
            ]
        ),
        "wacc": lambda: "\n".join(
            [
                field_money("equity", "Market value of equity", "e.g. 400000"),
                field_money("debt", "Market value of debt", "e.g. 150000"),
                field_pct("costEquity", "Cost of equity", "e.g. 12"),
                field_pct("costDebt", "Pre-tax cost of debt", "e.g. 6"),
                field_pct("taxRate", "Corporate tax rate", "e.g. 21"),
            ]
        ),
        "working_capital": lambda: "\n".join(
            [
                field_money("currentAssets", "Current assets", "e.g. 90000"),
                field_money("currentLiab", "Current liabilities", "e.g. 40000"),
            ]
        ),
        "ccc": lambda: "\n".join(
            [
                field_num("dio", "Days inventory outstanding (DIO)", "e.g. 45", "0"),
                field_num("dso", "Days sales outstanding (DSO)", "e.g. 38", "0"),
                field_num("dpo", "Days payables outstanding (DPO)", "e.g. 32", "0"),
            ]
        ),
        "dio": lambda: "\n".join(
            [
                field_money("inventory", "Average inventory", "e.g. 80000"),
                field_money("cogs", "Cost of goods sold (annual)", "e.g. 320000"),
            ]
        ),
        "dso": lambda: "\n".join(
            [
                field_money("receivables", "Accounts receivable", "e.g. 55000"),
                field_money("revenue", "Revenue (annual)", "e.g. 480000"),
            ]
        ),
        "margin_pct": lambda: "\n".join(
            [
                field_money("revenue", "Revenue", "e.g. 100000"),
                field_money("cost", "Cost", "e.g. 65000"),
            ]
        ),
        "markup_pct": lambda: "\n".join(
            [
                field_money("cost", "Cost", "e.g. 40"),
                field_money("price", "Selling price", "e.g. 79"),
            ]
        ),
        "roi_pct": lambda: "\n".join(
            [
                field_money("gain", "Final value (after project)", "e.g. 55000"),
                field_money("investment", "Initial investment", "e.g. 40000"),
            ]
        ),
        "roas": lambda: "\n".join(
            [
                field_money("revenue", "Attributed revenue", "e.g. 24000"),
                field_money("adSpend", "Ad spend", "e.g. 6000"),
            ]
        ),
        "roic": lambda: "\n".join(
            [
                field_money("nopat", "NOPAT", "e.g. 180000"),
                field_money("invested", "Invested capital", "e.g. 900000"),
            ]
        ),
        "cpa": lambda: "\n".join(
            [
                field_money("spend", "Marketing spend", "e.g. 12000"),
                field_num("conv", "Conversions", "e.g. 80", "0"),
            ]
        ),
        "cpm": lambda: "\n".join(
            [
                field_money("cost", "Campaign cost", "e.g. 5000"),
                field_num("impressions", "Impressions", "e.g. 500000", "0"),
            ]
        ),
        "cpc": lambda: "\n".join(
            [
                field_money("cost", "Campaign cost", "e.g. 5000"),
                field_num("clicks", "Clicks", "e.g. 2500", "0"),
            ]
        ),
        "cpc_cpm": lambda: "\n".join(
            [
                field_money("cost", "Campaign cost", "e.g. 5000"),
                field_num("impressions", "Impressions", "e.g. 500000", "0"),
                field_num("clicks", "Clicks", "e.g. 2500", "0"),
            ]
        ),
        "commission_pct": lambda: "\n".join(
            [
                field_money("amount", "Transaction amount", "e.g. 150000"),
                field_pct("rate", "Commission rate", "e.g. 3"),
            ]
        ),
        "discount_single": lambda: "\n".join(
            [
                field_money("price", "List price", "e.g. 199"),
                field_pct("disc", "Discount", "e.g. 15"),
            ]
        ),
        "discount_double": lambda: "\n".join(
            [
                field_money("price", "List price", "e.g. 199"),
                field_pct("d1", "First discount", "e.g. 10"),
                field_pct("d2", "Second discount", "e.g. 5"),
            ]
        ),
        "discount_triple": lambda: "\n".join(
            [
                field_money("price", "List price", "e.g. 199"),
                field_pct("d1", "First discount", "e.g. 10"),
                field_pct("d2", "Second discount", "e.g. 5"),
                field_pct("d3", "Third discount", "e.g. 2"),
            ]
        ),
        "sales_tax": lambda: "\n".join(
            [
                field_money("price", "Pre-tax price", "e.g. 100"),
                field_pct("rate", "Combined sales tax rate", "e.g. 8.25"),
            ]
        ),
        "depreciation_sl": lambda: "\n".join(
            [
                field_money("cost", "Asset cost", "e.g. 50000"),
                field_money("salvage", "Salvage value", "e.g. 5000"),
                field_num("life", "Useful life (years)", "e.g. 7", "0"),
            ]
        ),
        "car_depreciation": lambda: "\n".join(
            [
                field_money("cost", "Purchase price", "e.g. 28000"),
                field_pct("rate", "Annual depreciation rate", "e.g. 20"),
                field_num("years", "Years owned", "e.g. 3", "0"),
            ]
        ),
        "material_variance": lambda: "\n".join(
            [
                field_num("actualQty", "Actual quantity used", "e.g. 1200", "0"),
                field_money("stdPrice", "Standard price per unit", "e.g. 4.5"),
                field_money("actualPrice", "Actual price per unit", "e.g. 4.8"),
            ]
        ),
        "ddm": lambda: "\n".join(
            [
                field_money("dividend", "Expected dividend next period", "e.g. 2.5"),
                field_pct("discount", "Discount rate", "e.g. 9"),
                field_pct("growth", "Dividend growth rate", "e.g. 3"),
            ]
        ),
        "dcf_gordon": lambda: "\n".join(
            [
                field_money("fcf", "Free cash flow next period", "e.g. 100000"),
                field_pct("wacc", "Discount rate (WACC)", "e.g. 10"),
                field_pct("g", "Perpetual growth rate", "e.g. 2.5"),
            ]
        ),
        "ebit": lambda: "\n".join(
            [
                field_money("revenue", "Revenue", "e.g. 500000"),
                field_money("cogs", "Cost of goods sold", "e.g. 220000"),
                field_money("opex", "Operating expenses", "e.g. 180000"),
            ]
        ),
        "ebitda": lambda: "\n".join(
            [
                field_money("ebit", "EBIT", "e.g. 100000"),
                field_money("da", "Depreciation & amortization", "e.g. 25000"),
            ]
        ),
        "ebitda_multiple": lambda: "\n".join(
            [
                field_money("ev", "Enterprise value", "e.g. 2400000"),
                field_money("ebitda", "EBITDA", "e.g. 400000"),
            ]
        ),
        "economic_profit": lambda: "\n".join(
            [
                field_money("nopat", "NOPAT", "e.g. 120000"),
                field_money("capital", "Capital invested", "e.g. 800000"),
                field_pct("wacc", "WACC", "e.g. 9"),
            ]
        ),
        "residual_income": lambda: "\n".join(
            [
                field_money("nopat", "NOPAT", "e.g. 120000"),
                field_money("equity", "Equity", "e.g. 600000"),
                field_pct("costEquity", "Cost of equity", "e.g. 12"),
            ]
        ),
        "net_income": lambda: "\n".join(
            [
                field_money("revenue", "Revenue", "e.g. 600000"),
                field_money("expenses", "Total expenses", "e.g. 480000"),
                field_pct("taxRate", "Effective tax rate", "e.g. 22"),
            ]
        ),
        "noi": lambda: "\n".join(
            [
                field_money("gross", "Gross potential income", "e.g. 120000"),
                field_money("opex", "Operating expenses", "e.g. 35000"),
            ]
        ),
        "nowc": lambda: "\n".join(
            [
                field_money("oca", "Operating current assets", "e.g. 70000"),
                field_money("ocl", "Operating current liabilities", "e.g. 30000"),
            ]
        ),
        "noa": lambda: "\n".join(
            [
                field_money("oa", "Operating assets", "e.g. 500000"),
                field_money("ol", "Operating liabilities", "e.g. 120000"),
            ]
        ),
        "net_debt": lambda: "\n".join(
            [
                field_money("debt", "Total debt", "e.g. 300000"),
                field_money("cash", "Cash & equivalents", "e.g. 80000"),
            ]
        ),
        "ev_sales": lambda: "\n".join(
            [
                field_money("ev", "Enterprise value", "e.g. 5000000"),
                field_money("sales", "Revenue", "e.g. 2000000"),
            ]
        ),
        "pe": lambda: "\n".join(
            [
                field_money("price", "Share price", "e.g. 48"),
                field_money("eps", "Earnings per share", "e.g. 3.2"),
            ]
        ),
        "pb": lambda: "\n".join(
            [
                field_money("price", "Share price", "e.g. 24"),
                field_money("bv", "Book value per share", "e.g. 18"),
            ]
        ),
        "ps": lambda: "\n".join(
            [
                field_money("price", "Share price", "e.g. 36"),
                field_money("sps", "Sales per share", "e.g. 12"),
            ]
        ),
        "pcf": lambda: "\n".join(
            [
                field_money("price", "Share price", "e.g. 50"),
                field_money("cfps", "Cash flow per share", "e.g. 4"),
            ]
        ),
        "price_per_share": lambda: "\n".join(
            [
                field_money("cap", "Market capitalization", "e.g. 1200000000"),
                field_num("shares", "Shares outstanding", "e.g. 50000000", "0"),
            ]
        ),
        "revenue_mult": lambda: "\n".join(
            [
                field_money("price", "Unit price", "e.g. 49"),
                field_num("qty", "Quantity", "e.g. 1200", "0"),
            ]
        ),
        "pre_post": lambda: "\n".join(
            [
                field_money("investment", "New investment", "e.g. 2000000"),
                field_money("pre", "Pre-money valuation", "e.g. 8000000"),
            ]
        ),
        "pi": lambda: "\n".join(
            [
                field_money("pv", "PV of future cash flows", "e.g. 450000"),
                field_money("cost", "Initial investment", "e.g. 400000"),
            ]
        ),
        "payback": lambda: "\n".join(
            [
                field_money("cost", "Initial investment", "e.g. 150000"),
                field_money("annualCf", "Annual cash inflow", "e.g. 45000"),
            ]
        ),
        "optimal_price": lambda: "\n".join(
            [
                field_money("cost", "Unit cost", "e.g. 22"),
                field_pct("margin", "Target gross margin", "e.g. 45"),
            ]
        ),
        "opportunity_cost": lambda: "\n".join(
            [
                field_pct("returnA", "Return option A (annual %)", "e.g. 8"),
                field_pct("returnB", "Return option B (annual %)", "e.g. 5"),
            ]
        ),
        "mos": lambda: "\n".join(
            [
                field_money("intrinsic", "Intrinsic value estimate", "e.g. 120"),
                field_money("market", "Market price", "e.g. 95"),
            ]
        ),
        "marginal": lambda: "\n".join(
            [
                field_num(
                    "deltaY",
                    "Change in total cost" if slug == "marginal-cost" else "Change in total revenue",
                    "e.g. 5000",
                    None,
                ),
                field_num("deltaX", "Change in quantity", "e.g. 100", None),
            ]
        ),
        "margin_discount": lambda: "\n".join(
            [
                field_money("list", "List price", "e.g. 199"),
                field_pct("disc", "Discount", "e.g. 15"),
                field_money("cost", "Unit cost", "e.g. 90"),
            ]
        ),
        "margin_vat": lambda: "\n".join(
            [
                field_money("cost", "Cost excluding VAT", "e.g. 40"),
                field_money("priceExVat", "Selling price excluding VAT", "e.g. 79"),
                field_pct("vat", "VAT rate", "e.g. 20"),
            ]
        ),
        "margin_sales_tax": lambda: "\n".join(
            [
                field_money("cost", "Cost", "e.g. 40"),
                field_money("pricePreTax", "Selling price before sales tax", "e.g. 79"),
                field_pct("tax", "Sales tax rate", "e.g. 7"),
            ]
        ),
        "margin_two_sets": lambda: "\n".join(
            [
                field_money("rev1", "Revenue product A", "e.g. 80000"),
                field_money("cost1", "COGS product A", "e.g. 45000"),
                field_money("rev2", "Revenue product B", "e.g. 120000"),
                field_money("cost2", "COGS product B", "e.g. 70000"),
            ]
        ),
        "margin_interest": lambda: "\n".join(
            [
                field_money("borrowed", "Amount borrowed on margin", "e.g. 50000"),
                field_pct("rate", "Margin interest rate", "e.g. 8.5"),
                field_num("days", "Days held", "e.g. 45", "0"),
            ]
        ),
        "elasticity": lambda: "\n".join(
            [
                field_num("pctQ", "% change in quantity", "e.g. -4", None),
                field_num("pctP", "% change in price", "e.g. 10", None),
            ]
        ),
        "income_elasticity": lambda: "\n".join(
            [
                field_num("pctQ", "% change in quantity demanded", "e.g. 6", None),
                field_num("pctI", "% change in income", "e.g. 3", None),
            ]
        ),
        "deadweight": lambda: "\n".join(
            [
                field_num("supplyShift", "Quantity wedge (units)", "e.g. 2000", "0"),
                field_money("priceGap", "Price wedge per unit", "e.g. 3.5"),
            ]
        ),
        "debt_consolidation": lambda: "\n".join(
            [
                field_money("d1", "Debt 1 balance", "e.g. 15000"),
                field_pct("r1", "Debt 1 annual rate", "e.g. 18"),
                field_money("d2", "Debt 2 balance", "e.g. 8000"),
                field_pct("r2", "Debt 2 annual rate", "e.g. 12"),
            ]
        ),
        "deferred_loan": lambda: "\n".join(
            [
                field_money("principal", "Loan amount", "e.g. 200000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 6"),
                field_num("deferMonths", "Interest-only months", "e.g. 12", "0"),
                field_num("amortMonths", "Amortization months after", "e.g. 348", "0"),
            ]
        ),
        "partial_loan": lambda: "\n".join(
            [
                field_money("principal", "Loan amount", "e.g. 200000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 6"),
                field_num("years", "Amortization term (years)", "e.g. 30", "0"),
                field_money("balloon", "Balloon payment at end", "e.g. 50000"),
            ]
        ),
        "dol": lambda: "\n".join(
            [
                field_pct("deltaOi", "% change in operating income", "e.g. 12"),
                field_pct("deltaSales", "% change in sales", "e.g. 8"),
            ]
        ),
        "financial_leverage": lambda: "\n".join(
            [
                field_money("assets", "Total assets", "e.g. 900000"),
                field_money("equity", "Total equity", "e.g. 300000"),
            ]
        ),
        "cost_equity_capm": lambda: "\n".join(
            [
                field_pct("rf", "Risk-free rate", "e.g. 4.5"),
                field_num("beta", "Beta", "e.g. 1.1", None),
                field_pct("erp", "Equity risk premium", "e.g. 5"),
            ]
        ),
        "ending_inventory": lambda: "\n".join(
            [
                field_money("begin", "Beginning inventory", "e.g. 40000"),
                field_money("purchases", "Purchases", "e.g. 180000"),
                field_money("cogs", "Cost of goods sold", "e.g. 175000"),
            ]
        ),
        "fifo_simple": lambda: "\n".join(
            [
                field_num("units", "Units sold", "e.g. 500", "0"),
                field_money("costA", "Cost per unit (oldest layer)", "e.g. 12"),
                field_money("costB", "Cost per unit (newer layer)", "e.g. 14"),
                field_num("layerA", "Units in oldest layer", "e.g. 300", "0"),
            ]
        ),
        "ocf": lambda: "\n".join(
            [
                field_money("ni", "Net income", "e.g. 95000"),
                field_money("da", "Depreciation & amortization", "e.g. 22000"),
                field_money("wcChange", "Change in working capital", "e.g. 8000"),
            ]
        ),
        "ocf_ratio": lambda: "\n".join(
            [
                field_money("ocf", "Operating cash flow", "e.g. 110000"),
                field_money("cl", "Current liabilities", "e.g. 55000"),
            ]
        ),
        "fcf": lambda: "\n".join(
            [
                field_money("cfo", "Cash from operations", "e.g. 130000"),
                field_money("capex", "Capital expenditures", "e.g. 45000"),
            ]
        ),
        "fcfe": lambda: "\n".join(
            [
                field_money("ni", "Net income", "e.g. 90000"),
                field_money("capex", "Capital expenditures", "e.g. 40000"),
                field_money("debtNet", "Net new borrowing", "e.g. 15000"),
            ]
        ),
        "fcff": lambda: "\n".join(
            [
                field_money("nopat", "NOPAT", "e.g. 100000"),
                field_money("da", "Depreciation & amortization", "e.g. 25000"),
                field_money("capex", "Capital expenditures", "e.g. 50000"),
                field_money("wcChange", "Change in working capital", "e.g. 12000"),
            ]
        ),
        "interest_coverage": lambda: "\n".join(
            [
                field_money("ebit", "EBIT", "e.g. 85000"),
                field_money("interest", "Interest expense", "e.g. 15000"),
            ]
        ),
        "loss_ratio": lambda: "\n".join(
            [
                field_money("claims", "Claims paid", "e.g. 420000"),
                field_money("premiums", "Earned premiums", "e.g. 1800000"),
            ]
        ),
        "ltv": lambda: "\n".join(
            [
                field_money("loan", "Loan amount", "e.g. 320000"),
                field_money("value", "Property value", "e.g. 400000"),
            ]
        ),
        "futures": lambda: "\n".join(
            [
                field_num("contract", "Contract size", "e.g. 1000", "0"),
                field_money("price", "Futures price", "e.g. 85"),
                field_num("contracts", "Number of contracts", "e.g. 5", "0"),
            ]
        ),
        "gmroi": lambda: "\n".join(
            [
                field_money("gross", "Gross margin dollars", "e.g. 180000"),
                field_money("avgInv", "Average inventory cost", "e.g. 90000"),
            ]
        ),
        "grm": lambda: "\n".join(
            [
                field_money("price", "Property price", "e.g. 360000"),
                field_money("annualRent", "Annual gross rent", "e.g. 24000"),
            ]
        ),
        "gross_to_net": lambda: "\n".join(
            [
                field_money("gross", "Gross amount", "e.g. 100000"),
                field_money("deduct", "Deductions", "e.g. 22000"),
            ]
        ),
        "net_to_gross": lambda: "\n".join(
            [
                field_money("net", "Net amount", "e.g. 74000"),
                field_pct("rate", "Tax or withholding rate", "e.g. 22"),
            ]
        ),
        "revenue_growth": lambda: "\n".join(
            [
                field_money("old", "Prior period revenue", "e.g. 800000"),
                field_money("new", "Current period revenue", "e.g. 920000"),
            ]
        ),
        "saas_ltv": lambda: "\n".join(
            [
                field_money("arpu", "Average revenue per user (period)", "e.g. 120"),
                field_pct("margin", "Gross margin %", "e.g. 75"),
                field_pct("churn", "Churn rate per period", "e.g. 3"),
            ]
        ),
        "saas_metrics": lambda: "\n".join(
            [
                field_money("arr", "Annual recurring revenue", "e.g. 2400000"),
                field_pct("growth", "YoY growth %", "e.g. 35"),
            ]
        ),
        "scv": lambda: "\n".join(
            [
                field_money("annual", "Annual contract value", "e.g. 48000"),
                field_num("years", "Contract length (years)", "e.g. 3", "0"),
            ]
        ),
        "ad_revenue": lambda: "\n".join(
            [
                field_num("impressions", "Impressions", "e.g. 1000000", "0"),
                field_pct("ctr", "CTR %", "e.g. 1.2"),
                field_money("cpc", "CPC", "e.g. 0.85"),
            ]
        ),
        "marketing_conversion": lambda: "\n".join(
            [
                field_num("visitors", "Visitors", "e.g. 50000", "0"),
                field_num("conv", "Conversions", "e.g. 1200", "0"),
            ]
        ),
        "mirr_simple": lambda: "\n".join(
            [
                field_money("initial", "Initial investment", "e.g. 200000"),
                field_money("fv", "Terminal value", "e.g. 320000"),
                field_num("years", "Years", "e.g. 5", "0"),
            ]
        ),
        "valuation_multiple": lambda: "\n".join(
            [
                field_money("revenue", "Revenue or SDE", "e.g. 1500000"),
                field_num("mult", "Valuation multiple", "e.g. 4", "0"),
            ]
        ),
        "cost_of_doing_business": lambda: "\n".join(
            [
                field_money("rent", "Rent", "e.g. 4500"),
                field_money("payroll", "Payroll", "e.g. 28000"),
                field_money("other", "Other fixed costs", "e.g. 6000"),
            ]
        ),
        "debt_payoff": lambda: "\n".join(
            [
                field_money("balance", "Outstanding balance", "e.g. 18000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 16"),
                field_money("payment", "Monthly payment", "e.g. 600"),
            ]
        ),
        "debt_total_interest": lambda: "\n".join(
            [
                field_money("principal", "Loan amount", "e.g. 25000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 8"),
                field_num("years", "Term (years)", "e.g. 5", "0"),
            ]
        ),
        "loan_repayment_total": lambda: "\n".join(
            [
                field_money("principal", "Loan amount", "e.g. 25000"),
                field_pct("annualRate", "Annual interest rate", "e.g. 8"),
                field_num("years", "Term (years)", "e.g. 5", "0"),
            ]
        ),
        "turnover_rate": lambda: "\n".join(
            [
                field_num("left", "Employees who left", "e.g. 8", "0"),
                field_num("avg", "Average headcount", "e.g. 85", "0"),
            ]
        ),
        "revenue": lambda: "\n".join(
            [
                field_num("units", "Units sold", "e.g. 500", "0"),
                field_money("price", "Price per unit", "e.g. 79"),
            ]
        ),
        "sales": lambda: "\n".join(
            [
                field_num("transactions", "Number of transactions", "e.g. 1200", "0"),
                field_money("avg", "Average sale", "e.g. 42"),
            ]
        ),
        "percentage_discount": lambda: "\n".join(
            [
                field_money("list", "List price", "e.g. 199"),
                field_pct("disc", "Discount % of list", "e.g. 20"),
            ]
        ),
        "discount_rate": lambda: "\n".join(
            [
                field_money("fv", "Future value", "e.g. 150000"),
                field_money("pv", "Present value", "e.g. 100000"),
                field_num("years", "Years", "e.g. 4", "0"),
            ]
        ),
        "cost_capital_simple": lambda: "\n".join(
            [
                field_pct("equityPct", "Equity weight %", "e.g. 70"),
                field_pct("costEq", "Cost of equity %", "e.g. 12"),
                field_pct("debtPct", "Debt weight %", "e.g. 30"),
                field_pct("costDebt", "After-tax cost of debt %", "e.g. 5"),
            ]
        ),
        "real_estate_commission": lambda: "\n".join(
            [
                field_money("price", "Sale price", "e.g. 450000"),
                field_pct("rate", "Commission rate", "e.g. 5"),
            ]
        ),
        "real_estate_commission_vat": lambda: "\n".join(
            [
                field_money("price", "Sale price", "e.g. 450000"),
                field_pct("rate", "Commission rate", "e.g. 5"),
                field_pct("vat", "VAT rate", "e.g. 20"),
            ]
        ),
        "rental_commission": lambda: "\n".join(
            [
                field_money("rent", "Annual rent", "e.g. 24000"),
                field_pct("rate", "Commission rate", "e.g. 8"),
            ]
        ),
        "true_cost_re": lambda: "\n".join(
            [
                field_money("price", "Sale price", "e.g. 450000"),
                field_pct("rate", "Commission rate", "e.g. 5"),
                field_money("fees", "Additional closing fees", "e.g. 2500"),
            ]
        ),
        "expense_ratio": lambda: "\n".join(
            [
                field_money("expenses", "Fund expenses", "e.g. 12000"),
                field_money("assets", "Average net assets", "e.g. 800000"),
            ]
        ),
        "operating_margin": lambda: "\n".join(
            [
                field_money("opInc", "Operating income", "e.g. 95000"),
                field_money("revenue", "Revenue", "e.g. 600000"),
            ]
        ),
        "net_profit_margin": lambda: "\n".join(
            [
                field_money("net", "Net income", "e.g. 72000"),
                field_money("revenue", "Revenue", "e.g. 600000"),
            ]
        ),
        "snowball": lambda: "\n".join(
            [
                field_money("b1", "Balance 1", "e.g. 8000"),
                field_money("b2", "Balance 2", "e.g. 12000"),
            ]
        ),
        "avalanche": lambda: "\n".join(
            [
                field_money("b1", "Balance 1", "e.g. 8000"),
                field_pct("r1", "Annual rate 1", "e.g. 18"),
                field_money("b2", "Balance 2", "e.g. 12000"),
                field_pct("r2", "Annual rate 2", "e.g. 12"),
            ]
        ),
    }

    fn = builders.get(kind)
    if fn:
        return fn()
    return "<!-- missing builder -->"


def primary_metric_label(kind: str, slug: str) -> str:
    if kind == "ratio":
        return RATIO_LABELS.get(slug, ("", "", "Ratio"))[2]
    labels = {
        "budget": "Net after planned budget",
        "build_buy": "Total cost difference (buy − build + maintenance)",
        "burn": "Runway (months of cash)",
        "burndown": "Required velocity (units per day)",
        "loan_pmt": "Monthly payment",
        "loan_balance": "Remaining balance",
        "loan_compare": "Monthly payment difference (A − B)",
        "simple_interest": "Total interest",
        "churn": "Churn rate",
        "wacc": "WACC",
        "working_capital": "Working capital",
        "ccc": "Cash conversion cycle (days)",
        "dio": "Days inventory outstanding",
        "dso": "Days sales outstanding",
        "margin_pct": "Gross margin %",
        "markup_pct": "Markup %",
        "roi_pct": "ROI %",
        "roas": "ROAS",
        "roic": "ROIC %",
        "cpa": "Cost per acquisition",
        "cpm": "CPM",
        "cpc": "CPC",
        "cpc_cpm": "CPM (primary)",
        "commission_pct": "Commission amount",
        "discount_single": "Price after discount",
        "discount_double": "Price after both discounts",
        "discount_triple": "Price after three discounts",
        "sales_tax": "Total with tax",
        "depreciation_sl": "Annual depreciation",
        "car_depreciation": "Accumulated depreciation",
        "material_variance": "Price variance ($)",
        "ddm": "Intrinsic value (per share)",
        "dcf_gordon": "Enterprise value (terminal value)",
        "ebit": "EBIT",
        "ebitda": "EBITDA",
        "ebitda_multiple": "EV / EBITDA",
        "economic_profit": "Economic profit",
        "residual_income": "Residual income",
        "net_income": "Net income",
        "noi": "Net operating income",
        "nowc": "Net operating working capital",
        "noa": "Net operating assets",
        "net_debt": "Net debt",
        "ev_sales": "EV / Sales",
        "pe": "P/E ratio",
        "pb": "P/B ratio",
        "ps": "P/S ratio",
        "pcf": "Price / cash flow",
        "price_per_share": "Price per share",
        "price_per_area": "Price per unit area",
        "revenue_mult": "Total revenue",
        "pre_post": "Post-money valuation",
        "pi": "Profitability index",
        "payback": "Payback period (years)",
        "optimal_price": "Optimal price",
        "opportunity_cost": "Return difference (A − B)",
        "mos": "Margin of safety %",
        "marginal": "Marginal amount per unit",
        "margin_discount": "Gross margin % after discount",
        "margin_vat": "Gross margin % (VAT-inclusive selling price)",
        "margin_sales_tax": "Gross margin % (tax-inclusive)",
        "margin_two_sets": "Blended gross margin %",
        "margin_interest": "Margin interest cost",
        "elasticity": "Elasticity",
        "income_elasticity": "Income elasticity",
        "deadweight": "Deadweight loss (approx.)",
        "debt_consolidation": "Weighted average interest rate %",
        "deferred_loan": "Amortizing payment after deferral",
        "partial_loan": "Monthly payment (balloon)",
        "dol": "Degree of operating leverage",
        "financial_leverage": "Financial leverage ratio",
        "cost_equity_capm": "Cost of equity (CAPM)",
        "ending_inventory": "Ending inventory",
        "fifo_simple": "COGS (FIFO estimate)",
        "ocf": "Operating cash flow",
        "ocf_ratio": "Operating cash flow ratio",
        "fcf": "Free cash flow",
        "fcfe": "FCFE",
        "fcff": "FCFF",
        "interest_coverage": "Interest coverage",
        "loss_ratio": "Loss ratio %",
        "ltv": "LTV %",
        "futures": "Notional value",
        "gmroi": "GMROI",
        "grm": "Gross rent multiplier",
        "gross_to_net": "Net amount",
        "net_to_gross": "Grossed-up amount",
        "revenue_growth": "Revenue growth %",
        "saas_ltv": "LTV (simple)",
        "saas_metrics": "Projected ARR",
        "scv": "Total contract value",
        "ad_revenue": "Estimated ad revenue",
        "marketing_conversion": "Conversion rate %",
        "mirr_simple": "Implied CAGR %",
        "valuation_multiple": "Indicative valuation",
        "cost_of_doing_business": "Total fixed cost (period)",
        "debt_payoff": "Months to payoff",
        "debt_total_interest": "Total interest paid",
        "loan_repayment_total": "Total payments",
        "turnover_rate": "Turnover rate %",
        "revenue": "Total revenue",
        "sales": "Total sales",
        "percentage_discount": "Discount amount",
        "discount_rate": "Implied discount rate %",
        "cost_capital_simple": "Cost of capital %",
        "real_estate_commission": "Commission",
        "real_estate_commission_vat": "Commission incl. VAT",
        "rental_commission": "Commission",
        "true_cost_re": "Total commission & fees",
        "expense_ratio": "Expense ratio %",
        "operating_margin": "Operating margin %",
        "net_profit_margin": "Net profit margin %",
        "ratio_mixed": "Revenue per employee",
        "snowball": "Total debt (both balances)",
        "avalanche": "Balance on higher-rate debt",
    }
    return labels.get(kind, "Result")


def secondary_metric_html(kind: str) -> str:
    if kind == "cpc_cpm":
        return """          <div class="metric-card">
            <span class="metric-label">CPC</span>
            <span class="metric-value" id="outSecondary">—</span>
          </div>"""
    if kind == "pre_post":
        return """          <div class="metric-card">
            <span class="metric-label">Investor ownership</span>
            <span class="metric-value" id="outSecondary">—</span>
          </div>"""
    if kind == "budget":
        return """          <div class="metric-card">
            <span class="metric-label">Variable costs ($)</span>
            <span class="metric-value" id="outTertiary">—</span>
          </div>"""
    return ""


def emit_page(slug: str, title: str, kind: str) -> str:
    page_title = f"{title} | Small Business | Vendora"
    desc = meta_description(title, kind)
    canonical = f"{BASE_URL}/tools/small-business/calculators/{slug}/"
    h1 = title.replace(" | ", " — ").strip()
    if h1.endswith("Calculator") is False and "Calculator" not in h1:
        h1 = title

    inputs_html = build_inputs_html(kind, slug)
    field_ids = collect_field_ids(kind, slug)

    cfg_obj: dict = {"kind": kind, "useCurrency": kind in CURRENCY_KINDS, "fieldIds": field_ids}
    if kind == "ratio":
        nl, dl, _ = RATIO_LABELS.get(slug, ("Numerator", "Denominator", "Ratio"))
        cfg_obj.update(
            {"numId": "numerator", "denId": "denominator", "numLabel": nl, "denLabel": dl}
        )
    if kind == "price_per_area":
        cfg_obj["areaLabel"] = "Square feet" if slug == "price-per-sqft" else "Square meters"

    cfg_json = json.dumps(cfg_obj, ensure_ascii=False).replace("</", "<\\/")

    faq1 = "Where do calculations run?"
    faq1a = "This tool runs in your browser for quick estimates. Use consistent units and verify critical figures independently."
    faq2 = "What does this calculator estimate?"
    faq2a = f"Estimates for {title.lower()}: enter the fields above and click Calculate."
    faq3 = "How should I use the result?"
    faq3a = "Use results for directional planning; confirm material decisions with your accountant or advisor."

    ld = [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": page_title,
            "url": canonical,
            "description": desc,
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": faq1, "acceptedAnswer": {"@type": "Answer", "text": faq1a}},
                {"@type": "Question", "name": faq2, "acceptedAnswer": {"@type": "Answer", "text": faq2a}},
                {"@type": "Question", "name": faq3, "acceptedAnswer": {"@type": "Answer", "text": faq3a}},
            ],
        },
    ]
    ld_json = json.dumps(ld, ensure_ascii=False)

    primary_l = primary_metric_label(kind, slug)
    sec_html = secondary_metric_html(kind)

    currency_scripts = ""
    if kind in CURRENCY_KINDS:
        currency_scripts = '  <script src="../_shared/currency.js"></script>\n'

    extra_script = ""
    if kind == "build_buy":
        extra_script = """
  <script>
    if (window.__SMB_CALC__ && window.__SMB_CALC__.kind === 'build_buy') {
      window.__SMB_CALC__.interpret = function (out) {
        if (!out || out.primary == null) return '';
        return Number(out.primary) > 0
          ? 'Over the horizon, building is cheaper in total cost.'
          : 'Over the horizon, buying is cheaper in total cost.';
      };
    }
  </script>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html_lib.escape(page_title)}</title>
  <meta name="description" content="{html_lib.escape(desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{canonical}">
  <meta property="og:title" content="{html_lib.escape(page_title)}">
  <meta property="og:description" content="{html_lib.escape(desc)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{OG_IMAGE}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="../../../tool-system.css">
  <link rel="stylesheet" href="./style.css">
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', '{GA}');
  </script>
  <script type="application/ld+json">{ld_json}</script>
</head>
<body class="vendora-tool">
  <main class="page-shell">
    <header class="card faq site-nav">
      <a class="site-nav-brand" href="/">Vendora</a>
      <nav aria-label="Primary">
        <p class="section-copy">
          <a href="/">Home</a> |
          <a href="/tools/">Tools</a> |
          <a href="../../index.html">Small Business Calculators</a>
        </p>
      </nav>
    </header>

    <section class="hero">
      <p class="eyebrow">Small business calculator</p>
      <h1>{html_lib.escape(h1)}</h1>
      <p class="hero-copy">{html_lib.escape(desc)}</p>
    </section>

    <section class="tool-layout">
      <section class="card input-card" aria-labelledby="calc-heading">
        <h2 class="section-title" id="calc-heading">Inputs</h2>
        <p class="section-copy">Enter values in consistent units, then click Calculate.</p>

        <div class="field-grid calculator-fields">
{inputs_html}
        </div>

        <div class="validation" id="validationMessage" role="status" aria-live="polite" hidden></div>

        <div class="actions calculator-actions">
          <button type="button" class="btn btn-primary" id="calculateBtn">Calculate</button>
          <button type="button" class="btn btn-secondary" id="resetBtn">Reset</button>
        </div>
      </section>

      <section class="card results-card sb-results" aria-labelledby="results-heading">
        <h2 class="section-title" id="results-heading">Results</h2>
        <p class="section-copy">Primary output updates after you calculate.</p>
        <div class="result-grid calculator-results" id="resultSection">
          <div class="metric-card featured">
            <span class="metric-label">{html_lib.escape(primary_l)}</span>
            <span class="metric-value" id="outPrimary">—</span>
          </div>
{sec_html}
        </div>
        <p class="summary-note metric-value interpret" id="interpretation" hidden></p>
      </section>
    </section>

    <section class="card faq">
      <h2 class="section-title">Example</h2>
      <p class="section-copy">Use round numbers that match your business (for example revenue of 100,000 and costs of 65,000) to sanity-check the math before relying on live inputs.</p>
    </section>

    <section class="card faq">
      <h2 class="section-title">How it works</h2>
      <p class="section-copy">This page uses the standard definition for this metric. Confirm definitions match your reporting (GAAP/IFRS, cash vs accrual) before using outputs in filings.</p>
    </section>

    <aside class="card faq business-tip" aria-label="Business tip">
      <h2 class="section-title">Business tip</h2>
      <p class="section-copy">Re-run scenarios with conservative and optimistic inputs; small changes in growth, margin, or discount rates often move valuations more than a single expense line item.</p>
    </aside>

    <section class="card faq">
      <h2 class="section-title">FAQ</h2>
      <h3 class="section-title" style="font-size:1rem;margin-top:0.5rem;">{html_lib.escape(faq1)}</h3>
      <p class="section-copy">{html_lib.escape(faq1a)}</p>
      <h3 class="section-title" style="font-size:1rem;margin-top:0.75rem;">{html_lib.escape(faq2)}</h3>
      <p class="section-copy">{html_lib.escape(faq2a)}</p>
      <h3 class="section-title" style="font-size:1rem;margin-top:0.75rem;">{html_lib.escape(faq3)}</h3>
      <p class="section-copy">{html_lib.escape(faq3a)}</p>
    </section>

    <section class="card faq">
      <h2 class="section-title">Related tools</h2>
      <p class="section-copy">{related_links(slug)}</p>
    </section>

    <footer class="card faq site-nav">
      <nav aria-label="Footer">
        <p class="section-copy">
          <a href="/">Home</a> |
          <a href="/tools/">Tools</a> |
          <a href="/privacy-policy/">Privacy Policy</a>
        </p>
      </nav>
    </footer>
  </main>

  <script>
    window.__SMB_CALC__ = {cfg_json};
  </script>
{extra_script}
{currency_scripts}  <script src="../_shared/smb-generic-calc.js"></script>
</body>
</html>
"""


def main() -> None:
    text = ROW_MANIFEST.read_text(encoding="utf-8")
    rows = parse_manifest_rows(text)
    pending = [(t, s) for t, s, st in rows if st == "pending"]

    if len(SLUG_KIND) != 145:
        raise SystemExit(f"Expected 145 slugs in registry, got {len(SLUG_KIND)}")

    for title, slug in pending:
        if slug not in SLUG_KIND:
            raise SystemExit(f"No kind for pending slug: {slug}")
        if slug in DONE_SLUGS:
            continue

    out_count = 0
    for title, slug in pending:
        if slug in DONE_SLUGS:
            continue
        kind = SLUG_KIND[slug]
        target = CALC / slug
        target.mkdir(parents=True, exist_ok=True)
        html = emit_page(slug, title, kind)
        (target / "index.html").write_text(html, encoding="utf-8")
        shutil.copyfile(STYLE_SRC, target / "style.css")
        out_count += 1

    tbody_pat = re.compile(r"(<tbody>\s*)(.*?)(\s*</tbody>)", re.DOTALL)
    if not tbody_pat.search(text):
        raise SystemExit("Could not find tbody in manifest")

    rebuilt = []
    for title, slug, st in rows:
        if st == "pending" and slug in SLUG_KIND and slug not in DONE_SLUGS:
            omni_href = f"https://www.omnicalculator.com/finance/{slug}"
            for line in text.splitlines():
                if f"<code>{slug}</code>" in line and "<tr>" in line:
                    om = re.search(r'href="(https://www\.omnicalculator\.com/finance/[^"]+)"', line)
                    if om:
                        omni_href = om.group(1)
                    break
            rebuilt.append(
                f'<tr><td>{html_lib.escape(title)}</td><td><code>{slug}</code></td><td><span class="status-pill status-done">Done</span></td>'
                f'<td><a class="tool-link" href="calculators/{slug}/index.html">Open tool</a></td>'
                f'<td><a class="ref-link" href="{omni_href}" target="_blank" rel="noopener" title="Reference only">Omni</a></td></tr>'
            )
        else:
            line_match = None
            for line in text.splitlines():
                if f"<code>{slug}</code>" in line and "<tr>" in line:
                    line_match = line
                    break
            if line_match:
                rebuilt.append(line_match.strip())

    new_tbody = "\n" + "\n".join(rebuilt) + "\n          "
    new_text = tbody_pat.sub(r"\1" + new_tbody + r"\3", text, count=1)
    ROW_MANIFEST.write_text(new_text, encoding="utf-8")
    print(f"Wrote {out_count} calculator folders; row manifest updated ({ROW_MANIFEST.name}).")
    print("Run: node tools/small-business/rebuild-small-business-hub.mjs")


if __name__ == "__main__":
    main()
