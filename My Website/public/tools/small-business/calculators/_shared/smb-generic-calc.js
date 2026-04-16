/**
 * Generic SMB calculator engine: each page sets window.__SMB_CALC__ before loading this script.
 * Config: { kind, useCurrency, inputs[], outputs[], faqEstimateText, ... kind-specific fields }
 */
(function () {
  'use strict';

  function getEl(id) {
    return document.getElementById(id);
  }

  function parseNum(id, label, opts) {
    opts = opts || {};
    var el = getEl(id);
    var v = el && el.value != null ? String(el.value).trim() : '';
    if (v === '') return { empty: true, message: 'Enter ' + label + '.' };
    var n = parseFloat(v.replace(/,/g, ''));
    if (Number.isNaN(n)) return { invalid: true, message: label + ' must be a valid number.' };
    if (opts.min != null && n < opts.min) return { invalid: true, message: label + ' must be at least ' + opts.min + '.' };
    if (opts.max != null && n > opts.max) return { invalid: true, message: label + ' must be at most ' + opts.max + '.' };
    if (!opts.allowNegative && n < 0) return { invalid: true, message: label + ' must not be negative.' };
    return { value: n };
  }

  function parsePercent(id, label) {
    return parseNum(id, label, { allowNegative: true });
  }

  function moneyFmt(n) {
    if (!window.VendoraCurrency) {
      return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return window.VendoraCurrency.formatMoney(n, window.VendoraCurrency.getCurrency('global', 'USD'));
  }

  function numFmt(n, digits) {
    digits = digits == null ? 2 : digits;
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function setValidation(msg, show) {
    var box = getEl('validationMessage');
    if (!box) return;
    box.textContent = msg || '';
    box.hidden = !show;
    box.style.display = show ? 'block' : 'none';
  }

  function loanPmtMonthly(principal, annualPct, periods, perYear) {
    var r = annualPct / 100 / perYear;
    if (r === 0) return principal / periods;
    var factor = Math.pow(1 + r, periods);
    return (principal * r * factor) / (factor - 1);
  }

  function compute(cfg) {
    var k = cfg.kind;
    var vals = {};
    var i;
    var a, b, c, d, e, f, g, h;

    function req(id, label, opt) {
      var p = parseNum(id, label, opt || {});
      if (p.empty || p.invalid) return { err: p.message };
      vals[id] = p.value;
      return null;
    }

    function reqPct(id, label) {
      var p = parsePercent(id, label);
      if (p.empty || p.invalid) return { err: p.message };
      vals[id] = p.value;
      return null;
    }

    var err;

    switch (k) {
      case 'ratio':
        err = req(cfg.numId || 'numerator', cfg.numLabel || 'Numerator', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req(cfg.denId || 'denominator', cfg.denLabel || 'Denominator', { min: 0 });
        if (err) return { ok: false, message: err.err };
        var numId = cfg.numId || 'numerator';
        var denId = cfg.denId || 'denominator';
        if (vals[denId] === 0) return { ok: false, message: 'Denominator must be greater than zero.' };
        return { ok: true, primary: vals[numId] / vals[denId], format: 'number' };

      case 'ratio_any':
        err = req(cfg.numId || 'numerator', cfg.numLabel || 'Numerator', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req(cfg.denId || 'denominator', cfg.denLabel || 'Denominator', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        var nId = cfg.numId || 'numerator';
        var dId = cfg.denId || 'denominator';
        if (vals[dId] === 0) return { ok: false, message: 'Denominator must not be zero.' };
        return { ok: true, primary: vals[nId] / vals[dId], format: 'number' };

      case 'ratio_mixed':
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('employees', 'Employees', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.employees === 0) return { ok: false, message: 'Employees must be greater than zero.' };
        if (!Number.isInteger(vals.employees)) return { ok: false, message: 'Employees should be a whole number.' };
        return { ok: true, primary: vals.revenue / vals.employees, format: 'money' };

      case 'margin_pct':
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cost', 'Cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.revenue === 0) return { ok: false, message: 'Revenue must be greater than zero.' };
        return { ok: true, primary: ((vals.revenue - vals.cost) / vals.revenue) * 100, format: 'percent' };

      case 'markup_pct':
        err = req('cost', 'Cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('price', 'Selling price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.cost === 0) return { ok: false, message: 'Cost must be greater than zero.' };
        return { ok: true, primary: ((vals.price - vals.cost) / vals.cost) * 100, format: 'percent' };

      case 'roi_pct':
        err = req('gain', 'Final value or gain amount', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('investment', 'Initial investment', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.investment === 0) return { ok: false, message: 'Investment must be greater than zero.' };
        return { ok: true, primary: ((vals.gain - vals.investment) / vals.investment) * 100, format: 'percent' };

      case 'roas':
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('adSpend', 'Ad spend', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.adSpend === 0) return { ok: false, message: 'Ad spend must be greater than zero.' };
        return { ok: true, primary: vals.revenue / vals.adSpend, format: 'number' };

      case 'roic':
        err = req('nopat', 'NOPAT', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('invested', 'Invested capital', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.invested === 0) return { ok: false, message: 'Invested capital must be greater than zero.' };
        return { ok: true, primary: (vals.nopat / vals.invested) * 100, format: 'percent' };

      case 'cpa':
        err = req('spend', 'Marketing spend', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('conv', 'Conversions', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.conv === 0) return { ok: false, message: 'Conversions must be greater than zero.' };
        return { ok: true, primary: vals.spend / vals.conv, format: 'money' };

      case 'cpm':
        err = req('cost', 'Campaign cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('impressions', 'Impressions', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.impressions === 0) return { ok: false, message: 'Impressions must be greater than zero.' };
        return { ok: true, primary: (vals.cost / vals.impressions) * 1000, format: 'money' };

      case 'cpc':
        err = req('cost', 'Campaign cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('clicks', 'Clicks', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.clicks === 0) return { ok: false, message: 'Clicks must be greater than zero.' };
        return { ok: true, primary: vals.cost / vals.clicks, format: 'money' };

      case 'churn':
        err = req('lost', 'Customers lost in period', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('start', 'Customers at start of period', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.start === 0) return { ok: false, message: 'Starting customers must be greater than zero.' };
        return { ok: true, primary: (vals.lost / vals.start) * 100, format: 'percent' };

      case 'burn':
        err = req('cash', 'Cash on hand', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('monthlyBurn', 'Monthly burn', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.monthlyBurn === 0) return { ok: false, message: 'Monthly burn must be greater than zero.' };
        return { ok: true, primary: vals.cash / vals.monthlyBurn, format: 'number' };

      case 'loan_pmt':
        err = req('principal', 'Loan amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Loan term (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.years === 0) return { ok: false, message: 'Term must be greater than zero.' };
        var n = Math.round(vals.years * 12);
        var pmt = loanPmtMonthly(vals.principal, vals.annualRate, n, 12);
        return { ok: true, primary: pmt, format: 'money' };

      case 'loan_balance':
        err = req('principal', 'Original loan amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Original term (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('paidMonths', 'Months paid', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.years === 0) return { ok: false, message: 'Term must be greater than zero.' };
        var ntot = Math.round(vals.years * 12);
        var r = vals.annualRate / 100 / 12;
        var pmt = loanPmtMonthly(vals.principal, vals.annualRate, ntot, 12);
        var bal = vals.principal;
        var m;
        for (m = 0; m < Math.min(vals.paidMonths, ntot); m++) {
          var interest = bal * r;
          bal = bal - (pmt - interest);
        }
        if (bal < 0) bal = 0;
        return { ok: true, primary: bal, format: 'money' };

      case 'simple_interest':
        err = req('principal', 'Principal', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Time (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.principal * (vals.annualRate / 100) * vals.years, format: 'money' };

      case 'wacc':
        err = req('equity', 'Market value of equity', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('debt', 'Market value of debt', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('costEquity', 'Cost of equity');
        if (err) return { ok: false, message: err.err };
        err = reqPct('costDebt', 'Pre-tax cost of debt');
        if (err) return { ok: false, message: err.err };
        err = reqPct('taxRate', 'Corporate tax rate');
        if (err) return { ok: false, message: err.err };
        var v = vals.equity + vals.debt;
        if (v === 0) return { ok: false, message: 'Equity plus debt must be greater than zero.' };
        var we = vals.equity / v;
        var wd = vals.debt / v;
        var wacc = we * (vals.costEquity / 100) + wd * (vals.costDebt / 100) * (1 - vals.taxRate / 100);
        return { ok: true, primary: wacc * 100, format: 'percent' };

      case 'working_capital':
        err = req('currentAssets', 'Current assets', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('currentLiab', 'Current liabilities', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.currentAssets - vals.currentLiab, format: 'money' };

      case 'ccc':
        err = req('dio', 'Days inventory outstanding (DIO)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('dso', 'Days sales outstanding (DSO)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('dpo', 'Days payables outstanding (DPO)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.dio + vals.dso - vals.dpo, format: 'number' };

      case 'dio':
        err = req('inventory', 'Average inventory', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cogs', 'Cost of goods sold', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.cogs === 0) return { ok: false, message: 'COGS must be greater than zero.' };
        return { ok: true, primary: (vals.inventory / vals.cogs) * 365, format: 'number' };

      case 'dso':
        err = req('receivables', 'Accounts receivable', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.revenue === 0) return { ok: false, message: 'Revenue must be greater than zero.' };
        return { ok: true, primary: (vals.receivables / vals.revenue) * 365, format: 'number' };

      case 'budget':
        err = req('income', 'Expected monthly income', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('fixed', 'Fixed monthly costs', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('variablePct', 'Variable costs (% of income)');
        if (err) return { ok: false, message: err.err };
        var varAmt = vals.income * (vals.variablePct / 100);
        return { ok: true, primary: vals.income - vals.fixed - varAmt, format: 'money', extra: varAmt };

      case 'build_buy':
        err = req('buildCost', 'Total build cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('buyCost', 'Purchase price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Analysis horizon (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('maintBuild', 'Annual maintenance if you build', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('maintBuy', 'Annual maintenance if you buy', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.years === 0) return { ok: false, message: 'Horizon must be greater than zero.' };
        var costBuild = vals.buildCost + vals.maintBuild * vals.years;
        var costBuy = vals.buyCost + vals.maintBuy * vals.years;
        var diff = costBuy - costBuild;
        return { ok: true, primary: diff, format: 'money', label: diff <= 0 ? 'Buy is cheaper by (total)' : 'Build is cheaper by (total)' };

      case 'burndown':
        err = req('total', 'Total work units', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('done', 'Units completed', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('daysLeft', 'Days left in sprint', { min: 0 });
        if (err) return { ok: false, message: err.err };
        var rem = vals.total - vals.done;
        if (rem < 0) return { ok: false, message: 'Completed cannot exceed total.' };
        if (vals.daysLeft === 0) return { ok: false, message: 'Days left must be greater than zero.' };
        return { ok: true, primary: rem / vals.daysLeft, format: 'number' };

      case 'deadweight':
        err = req('supplyShift', 'Demand/supply price shift (units)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('priceGap', 'Price wedge per unit', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: 0.5 * vals.supplyShift * vals.priceGap, format: 'money' };

      case 'elasticity':
        err = req('pctQ', '% change in quantity', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('pctP', '% change in price', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        if (vals.pctP === 0) return { ok: false, message: 'Price change must not be zero.' };
        return { ok: true, primary: vals.pctQ / vals.pctP, format: 'number' };

      case 'income_elasticity':
        err = req('pctQ', '% change in quantity demanded', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('pctI', '% change in income', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        if (vals.pctI === 0) return { ok: false, message: 'Income change must not be zero.' };
        return { ok: true, primary: vals.pctQ / vals.pctI, format: 'number' };

      case 'discount_single':
        err = req('price', 'List price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('disc', 'Discount');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.price * (1 - vals.disc / 100), format: 'money' };

      case 'discount_double':
        err = req('price', 'List price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('d1', 'First discount');
        if (err) return { ok: false, message: err.err };
        err = reqPct('d2', 'Second discount');
        if (err) return { ok: false, message: err.err };
        var p = vals.price * (1 - vals.d1 / 100) * (1 - vals.d2 / 100);
        return { ok: true, primary: p, format: 'money' };

      case 'discount_triple':
        err = req('price', 'List price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('d1', 'First discount');
        if (err) return { ok: false, message: err.err };
        err = reqPct('d2', 'Second discount');
        if (err) return { ok: false, message: err.err };
        err = reqPct('d3', 'Third discount');
        if (err) return { ok: false, message: err.err };
        var p = vals.price * (1 - vals.d1 / 100) * (1 - vals.d2 / 100) * (1 - vals.d3 / 100);
        return { ok: true, primary: p, format: 'money' };

      case 'sales_tax':
        err = req('price', 'Pre-tax price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Combined sales tax rate');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.price * (1 + vals.rate / 100), format: 'money' };

      case 'depreciation_sl':
        err = req('cost', 'Asset cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('salvage', 'Salvage value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('life', 'Useful life (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.life === 0) return { ok: false, message: 'Life must be greater than zero.' };
        if (vals.salvage > vals.cost) return { ok: false, message: 'Salvage cannot exceed cost.' };
        return { ok: true, primary: (vals.cost - vals.salvage) / vals.life, format: 'money' };

      case 'car_depreciation':
        err = req('cost', 'Purchase price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Annual depreciation rate');
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Years owned', { min: 0 });
        if (err) return { ok: false, message: err.err };
        var book = vals.cost;
        var yr;
        for (yr = 0; yr < Math.floor(vals.years); yr++) {
          book = book * (1 - vals.rate / 100);
        }
        return { ok: true, primary: vals.cost - book, format: 'money' };

      case 'material_variance':
        err = req('actualQty', 'Actual quantity used', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('stdPrice', 'Standard price per unit', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('actualPrice', 'Actual price per unit', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: (vals.actualPrice - vals.stdPrice) * vals.actualQty, format: 'money' };

      case 'ddm':
        err = req('dividend', 'Expected dividend next period', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('discount', 'Discount rate');
        if (err) return { ok: false, message: err.err };
        err = reqPct('growth', 'Dividend growth rate');
        if (err) return { ok: false, message: err.err };
        if (vals.discount <= vals.growth) return { ok: false, message: 'Discount rate must exceed growth rate.' };
        return { ok: true, primary: vals.dividend / ((vals.discount - vals.growth) / 100), format: 'money' };

      case 'dcf_gordon':
        err = req('fcf', 'Free cash flow next period', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('wacc', 'Discount rate (WACC)');
        if (err) return { ok: false, message: err.err };
        err = reqPct('g', 'Perpetual growth rate');
        if (err) return { ok: false, message: err.err };
        if (vals.wacc <= vals.g) return { ok: false, message: 'WACC must be greater than growth rate.' };
        return { ok: true, primary: vals.fcf / ((vals.wacc - vals.g) / 100), format: 'money' };

      case 'ebit':
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cogs', 'Cost of goods sold', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('opex', 'Operating expenses', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.revenue - vals.cogs - vals.opex, format: 'money' };

      case 'ebitda':
        err = req('ebit', 'EBIT', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('da', 'Depreciation & amortization', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.ebit + vals.da, format: 'money' };

      case 'ebitda_multiple':
        err = req('ev', 'Enterprise value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('ebitda', 'EBITDA', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.ebitda === 0) return { ok: false, message: 'EBITDA must be greater than zero.' };
        return { ok: true, primary: vals.ev / vals.ebitda, format: 'number' };

      case 'economic_profit':
        err = req('nopat', 'NOPAT', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('capital', 'Capital invested', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('wacc', 'WACC');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.nopat - vals.capital * (vals.wacc / 100), format: 'money' };

      case 'residual_income':
        err = req('nopat', 'NOPAT', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('equity', 'Equity', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('costEquity', 'Cost of equity');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.nopat - vals.equity * (vals.costEquity / 100), format: 'money' };

      case 'net_income':
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('expenses', 'Total expenses', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('taxRate', 'Effective tax rate');
        if (err) return { ok: false, message: err.err };
        var pretax = vals.revenue - vals.expenses;
        if (pretax <= 0) return { ok: true, primary: pretax, format: 'money' };
        return { ok: true, primary: pretax * (1 - vals.taxRate / 100), format: 'money' };

      case 'noi':
        err = req('gross', 'Gross potential income', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('opex', 'Operating expenses', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.gross - vals.opex, format: 'money' };

      case 'nowc':
        err = req('oca', 'Operating current assets', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('ocl', 'Operating current liabilities', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.oca - vals.ocl, format: 'money' };

      case 'noa':
        err = req('oa', 'Operating assets', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('ol', 'Operating liabilities', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.oa - vals.ol, format: 'money' };

      case 'net_debt':
        err = req('debt', 'Total debt', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cash', 'Cash & equivalents', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.debt - vals.cash, format: 'money' };

      case 'ev_sales':
        err = req('ev', 'Enterprise value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('sales', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.sales === 0) return { ok: false, message: 'Revenue must be greater than zero.' };
        return { ok: true, primary: vals.ev / vals.sales, format: 'number' };

      case 'pe':
        err = req('price', 'Share price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('eps', 'Earnings per share', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.eps === 0) return { ok: false, message: 'EPS must be greater than zero.' };
        return { ok: true, primary: vals.price / vals.eps, format: 'number' };

      case 'pb':
        err = req('price', 'Share price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('bv', 'Book value per share', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.bv === 0) return { ok: false, message: 'Book value must be greater than zero.' };
        return { ok: true, primary: vals.price / vals.bv, format: 'number' };

      case 'ps':
        err = req('price', 'Share price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('sps', 'Sales per share', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.sps === 0) return { ok: false, message: 'Sales per share must be greater than zero.' };
        return { ok: true, primary: vals.price / vals.sps, format: 'number' };

      case 'pcf':
        err = req('price', 'Share price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cfps', 'Cash flow per share', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.cfps === 0) return { ok: false, message: 'Cash flow per share must be greater than zero.' };
        return { ok: true, primary: vals.price / vals.cfps, format: 'number' };

      case 'price_per_share':
        err = req('cap', 'Market capitalization', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('shares', 'Shares outstanding', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.shares === 0) return { ok: false, message: 'Shares must be greater than zero.' };
        return { ok: true, primary: vals.cap / vals.shares, format: 'money' };

      case 'price_per_area':
        err = req('price', 'Total price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('area', cfg.areaLabel || 'Area', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.area === 0) return { ok: false, message: 'Area must be greater than zero.' };
        return { ok: true, primary: vals.price / vals.area, format: 'money' };

      case 'revenue_mult':
        err = req('price', 'Unit price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('qty', 'Quantity', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.price * vals.qty, format: 'money' };

      case 'pre_post':
        err = req('investment', 'New investment', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('pre', 'Pre-money valuation', { min: 0 });
        if (err) return { ok: false, message: err.err };
        var post = vals.pre + vals.investment;
        var share = vals.investment / post;
        return { ok: true, primary: post, format: 'money', secondary: share * 100, format2: 'percent' };

      case 'pi':
        err = req('pv', 'Present value of future cash flows', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cost', 'Initial investment', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.cost === 0) return { ok: false, message: 'Initial investment must be greater than zero.' };
        return { ok: true, primary: vals.pv / vals.cost, format: 'number' };

      case 'payback':
        err = req('cost', 'Initial investment', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('annualCf', 'Annual cash inflow', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.annualCf === 0) return { ok: false, message: 'Annual cash inflow must be greater than zero.' };
        return { ok: true, primary: vals.cost / vals.annualCf, format: 'number' };

      case 'optimal_price':
        err = req('cost', 'Unit cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('margin', 'Target gross margin');
        if (err) return { ok: false, message: err.err };
        if (vals.margin >= 100) return { ok: false, message: 'Margin must be below 100%.' };
        return { ok: true, primary: vals.cost / (1 - vals.margin / 100), format: 'money' };

      case 'opportunity_cost':
        err = reqPct('returnA', 'Return option A (annual %)');
        if (err) return { ok: false, message: err.err };
        err = reqPct('returnB', 'Return option B (annual %)');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.returnA - vals.returnB, format: 'percent' };

      case 'mos':
        err = req('intrinsic', 'Intrinsic value estimate', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('market', 'Market price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.intrinsic === 0) return { ok: false, message: 'Intrinsic value must be greater than zero.' };
        return { ok: true, primary: ((vals.intrinsic - vals.market) / vals.intrinsic) * 100, format: 'percent' };

      case 'marginal':
        err = req('deltaY', 'Change in revenue or cost', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('deltaX', 'Change in quantity', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        if (vals.deltaX === 0) return { ok: false, message: 'Quantity change must not be zero.' };
        return { ok: true, primary: vals.deltaY / vals.deltaX, format: 'money' };

      case 'margin_discount':
        err = req('list', 'List price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('disc', 'Discount');
        if (err) return { ok: false, message: err.err };
        err = req('cost', 'Unit cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        var net = vals.list * (1 - vals.disc / 100);
        if (net === 0) return { ok: false, message: 'Net price after discount must be greater than zero.' };
        return { ok: true, primary: ((net - vals.cost) / net) * 100, format: 'percent' };

      case 'margin_vat':
        err = req('cost', 'Cost excluding VAT', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('priceExVat', 'Selling price excluding VAT', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('vat', 'VAT rate');
        if (err) return { ok: false, message: err.err };
        var sellInc = vals.priceExVat * (1 + vals.vat / 100);
        if (sellInc === 0) return { ok: false, message: 'Selling price must be greater than zero.' };
        return { ok: true, primary: ((sellInc - vals.cost) / sellInc) * 100, format: 'percent' };

      case 'margin_sales_tax':
        err = req('cost', 'Cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('pricePreTax', 'Selling price before sales tax', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('tax', 'Sales tax rate');
        if (err) return { ok: false, message: err.err };
        var tot = vals.pricePreTax * (1 + vals.tax / 100);
        if (tot === 0) return { ok: false, message: 'Total must be greater than zero.' };
        return { ok: true, primary: ((tot - vals.cost) / tot) * 100, format: 'percent' };

      case 'margin_two_sets':
        err = req('rev1', 'Revenue product A', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cost1', 'COGS product A', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('rev2', 'Revenue product B', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cost2', 'COGS product B', { min: 0 });
        if (err) return { ok: false, message: err.err };
        var r = vals.rev1 + vals.rev2;
        if (r === 0) return { ok: false, message: 'Total revenue must be greater than zero.' };
        return { ok: true, primary: ((r - vals.cost1 - vals.cost2) / r) * 100, format: 'percent' };

      case 'margin_interest':
        err = req('borrowed', 'Amount borrowed on margin', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Margin interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('days', 'Days held', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.borrowed * (vals.rate / 100) * (vals.days / 360), format: 'money' };

      case 'commission_pct':
        err = req('amount', 'Transaction amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Commission rate');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.amount * (vals.rate / 100), format: 'money' };

      case 'loan_compare':
        err = req('p1', 'Loan A principal', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('r1', 'Loan A annual rate');
        if (err) return { ok: false, message: err.err };
        err = req('y1', 'Loan A term (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('p2', 'Loan B principal', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('r2', 'Loan B annual rate');
        if (err) return { ok: false, message: err.err };
        err = req('y2', 'Loan B term (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.y1 === 0 || vals.y2 === 0) return { ok: false, message: 'Terms must be greater than zero.' };
        var n1 = Math.round(vals.y1 * 12);
        var n2 = Math.round(vals.y2 * 12);
        var pmt1 = loanPmtMonthly(vals.p1, vals.r1, n1, 12);
        var pmt2 = loanPmtMonthly(vals.p2, vals.r2, n2, 12);
        return { ok: true, primary: pmt1 - pmt2, format: 'money' };

      case 'debt_consolidation':
        err = req('d1', 'Debt 1 balance', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('r1', 'Debt 1 rate');
        if (err) return { ok: false, message: err.err };
        err = req('d2', 'Debt 2 balance', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('r2', 'Debt 2 rate');
        if (err) return { ok: false, message: err.err };
        var total = vals.d1 + vals.d2;
        if (total === 0) return { ok: false, message: 'Total debt must be greater than zero.' };
        return { ok: true, primary: (vals.d1 * (vals.r1 / 100) + vals.d2 * (vals.r2 / 100)) / total * 100, format: 'percent' };

      case 'deferred_loan':
        err = req('principal', 'Loan amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('deferMonths', 'Interest-only months', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('amortMonths', 'Amortization months after', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.amortMonths === 0) return { ok: false, message: 'Amortization months must be greater than zero.' };
        var r = vals.annualRate / 100 / 12;
        var bal = vals.principal;
        var m;
        for (m = 0; m < vals.deferMonths; m++) {
          bal = bal * (1 + r);
        }
        var pmt = loanPmtMonthly(bal, vals.annualRate, vals.amortMonths, 12);
        return { ok: true, primary: pmt, format: 'money' };

      case 'partial_loan':
        err = req('principal', 'Loan amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Amortization term (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('balloon', 'Balloon payment at end', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.years === 0) return { ok: false, message: 'Term must be greater than zero.' };
        var n = Math.round(vals.years * 12);
        var r = vals.annualRate / 100 / 12;
        var pv = vals.principal - vals.balloon / Math.pow(1 + r, n);
        if (pv <= 0) return { ok: false, message: 'Balloon is too large for this principal and rate.' };
        var pmt = loanPmtMonthly(pv, vals.annualRate, n, 12);
        return { ok: true, primary: pmt, format: 'money' };

      case 'dol':
        err = reqPct('deltaOi', '% change in operating income');
        if (err) return { ok: false, message: err.err };
        err = reqPct('deltaSales', '% change in sales');
        if (err) return { ok: false, message: err.err };
        if (vals.deltaSales === 0) return { ok: false, message: 'Sales change must not be zero.' };
        return { ok: true, primary: vals.deltaOi / vals.deltaSales, format: 'number' };

      case 'financial_leverage':
        err = req('assets', 'Total assets', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('equity', 'Total equity', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.equity === 0) return { ok: false, message: 'Equity must be greater than zero.' };
        return { ok: true, primary: vals.assets / vals.equity, format: 'number' };

      case 'cost_equity_capm':
        err = reqPct('rf', 'Risk-free rate');
        if (err) return { ok: false, message: err.err };
        err = req('beta', 'Beta', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('erp', 'Equity risk premium');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.rf + vals.beta * vals.erp, format: 'percent' };

      case 'ending_inventory':
        err = req('begin', 'Beginning inventory', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('purchases', 'Purchases', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('cogs', 'Cost of goods sold', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.begin + vals.purchases - vals.cogs, format: 'money' };

      case 'fifo_simple':
        err = req('units', 'Units sold', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('costA', 'Cost per unit (oldest layer)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('costB', 'Cost per unit (newer layer)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('layerA', 'Units in oldest layer', { min: 0 });
        if (err) return { ok: false, message: err.err };
        var fromA = Math.min(vals.units, vals.layerA);
        var fromB = Math.max(0, vals.units - vals.layerA);
        return { ok: true, primary: fromA * vals.costA + fromB * vals.costB, format: 'money' };

      case 'ocf':
        err = req('ni', 'Net income', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('da', 'Depreciation & amortization', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('wcChange', 'Change in working capital', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.ni + vals.da - vals.wcChange, format: 'money' };

      case 'ocf_ratio':
        err = req('ocf', 'Operating cash flow', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('cl', 'Current liabilities', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.cl === 0) return { ok: false, message: 'Current liabilities must be greater than zero.' };
        return { ok: true, primary: vals.ocf / vals.cl, format: 'number' };

      case 'fcf':
        err = req('cfo', 'Cash from operations', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('capex', 'Capital expenditures', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.cfo - vals.capex, format: 'money' };

      case 'fcfe':
        err = req('ni', 'Net income', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('capex', 'Capital expenditures', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('debtNet', 'Net new borrowing', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.ni - vals.capex + vals.debtNet, format: 'money' };

      case 'fcff':
        err = req('nopat', 'NOPAT', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('da', 'Depreciation & amortization', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('capex', 'Capital expenditures', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('wcChange', 'Change in working capital', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.nopat + vals.da - vals.capex - vals.wcChange, format: 'money' };

      case 'interest_coverage':
        err = req('ebit', 'EBIT', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('interest', 'Interest expense', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.interest === 0) return { ok: false, message: 'Interest expense must be greater than zero.' };
        return { ok: true, primary: vals.ebit / vals.interest, format: 'number' };

      case 'loss_ratio':
        err = req('claims', 'Claims paid', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('premiums', 'Earned premiums', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.premiums === 0) return { ok: false, message: 'Premiums must be greater than zero.' };
        return { ok: true, primary: (vals.claims / vals.premiums) * 100, format: 'percent' };

      case 'ltv':
        err = req('loan', 'Loan amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('value', 'Property value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.value === 0) return { ok: false, message: 'Property value must be greater than zero.' };
        return { ok: true, primary: (vals.loan / vals.value) * 100, format: 'percent' };

      case 'futures':
        err = req('contract', 'Contract size', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('price', 'Futures price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('contracts', 'Number of contracts', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.contract * vals.price * vals.contracts, format: 'money' };

      case 'gmroi':
        err = req('gross', 'Gross margin dollars', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('avgInv', 'Average inventory cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.avgInv === 0) return { ok: false, message: 'Average inventory must be greater than zero.' };
        return { ok: true, primary: vals.gross / vals.avgInv, format: 'number' };

      case 'grm':
        err = req('price', 'Property price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('annualRent', 'Annual gross rent', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.annualRent === 0) return { ok: false, message: 'Annual rent must be greater than zero.' };
        return { ok: true, primary: vals.price / vals.annualRent, format: 'number' };

      case 'gross_to_net':
        err = req('gross', 'Gross amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('deduct', 'Deductions', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.gross - vals.deduct, format: 'money' };

      case 'net_to_gross':
        err = req('net', 'Net amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Tax or withholding rate');
        if (err) return { ok: false, message: err.err };
        if (vals.rate >= 100) return { ok: false, message: 'Rate must be below 100%.' };
        return { ok: true, primary: vals.net / (1 - vals.rate / 100), format: 'money' };

      case 'revenue_growth':
        err = req('old', 'Prior period revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('new', 'Current period revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.old === 0) return { ok: false, message: 'Prior revenue must be greater than zero.' };
        return { ok: true, primary: ((vals.new - vals.old) / vals.old) * 100, format: 'percent' };

      case 'saas_ltv':
        err = req('arpu', 'Average revenue per user (period)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('margin', 'Gross margin %');
        if (err) return { ok: false, message: err.err };
        err = reqPct('churn', 'Churn rate per period');
        if (err) return { ok: false, message: err.err };
        if (vals.churn === 0) return { ok: false, message: 'Churn must be greater than zero.' };
        return { ok: true, primary: (vals.arpu * (vals.margin / 100)) / (vals.churn / 100), format: 'money' };

      case 'saas_metrics':
        err = req('arr', 'Annual recurring revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('growth', 'YoY growth %');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.arr * (1 + vals.growth / 100), format: 'money' };

      case 'scv':
        err = req('annual', 'Annual contract value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Contract length (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.annual * vals.years, format: 'money' };

      case 'ad_revenue':
        err = req('impressions', 'Impressions', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('ctr', 'CTR %');
        if (err) return { ok: false, message: err.err };
        err = req('cpc', 'CPC', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.impressions * (vals.ctr / 100) * vals.cpc, format: 'money' };

      case 'marketing_conversion':
        err = req('visitors', 'Visitors', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('conv', 'Conversions', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.visitors === 0) return { ok: false, message: 'Visitors must be greater than zero.' };
        return { ok: true, primary: (vals.conv / vals.visitors) * 100, format: 'percent' };

      case 'mirr_simple':
        err = req('initial', 'Initial investment', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('fv', 'Terminal value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Years', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.initial === 0 || vals.years === 0) return { ok: false, message: 'Check inputs.' };
        return { ok: true, primary: (Math.pow(vals.fv / vals.initial, 1 / vals.years) - 1) * 100, format: 'percent' };

      case 'valuation_multiple':
        err = req('revenue', 'Revenue or SDE', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('mult', 'Valuation multiple', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.revenue * vals.mult, format: 'money' };

      case 'cpc_cpm':
        err = req('cost', 'Campaign cost', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('impressions', 'Impressions', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('clicks', 'Clicks', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.impressions === 0 || vals.clicks === 0) return { ok: false, message: 'Impressions and clicks must be greater than zero.' };
        return { ok: true, primary: (vals.cost / vals.impressions) * 1000, format: 'money', secondary: vals.cost / vals.clicks, format2: 'money' };

      case 'cost_of_doing_business':
        err = req('rent', 'Rent', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('payroll', 'Payroll', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('other', 'Other fixed costs', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.rent + vals.payroll + vals.other, format: 'money' };

      case 'debt_payoff':
        err = req('balance', 'Outstanding balance', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('payment', 'Monthly payment', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.payment <= 0) return { ok: false, message: 'Payment must be greater than zero.' };
        var r = vals.annualRate / 100 / 12;
        var bal = vals.balance;
        var months = 0;
        while (bal > 0.01 && months < 1200) {
          var interest = bal * r;
          bal = bal + interest - vals.payment;
          months++;
        }
        return { ok: true, primary: months, format: 'number' };

      case 'snowball':
        err = req('b1', 'Balance 1', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('b2', 'Balance 2', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.b1 + vals.b2, format: 'money' };

      case 'avalanche':
        err = req('b1', 'Balance 1', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('r1', 'Annual rate 1');
        if (err) return { ok: false, message: err.err };
        err = req('b2', 'Balance 2', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('r2', 'Annual rate 2');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.r1 >= vals.r2 ? vals.b1 : vals.b2, format: 'money' };

      case 'debt_total_interest':
        err = req('principal', 'Loan amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Term (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.years === 0) return { ok: false, message: 'Term must be greater than zero.' };
        var n = Math.round(vals.years * 12);
        var pmt = loanPmtMonthly(vals.principal, vals.annualRate, n, 12);
        return { ok: true, primary: pmt * n - vals.principal, format: 'money' };

      case 'loan_repayment_total':
        err = req('principal', 'Loan amount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('annualRate', 'Annual interest rate');
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Term (years)', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.years === 0) return { ok: false, message: 'Term must be greater than zero.' };
        var n = Math.round(vals.years * 12);
        var pmt = loanPmtMonthly(vals.principal, vals.annualRate, n, 12);
        return { ok: true, primary: pmt * n, format: 'money' };

      case 'turnover_rate':
        err = req('left', 'Employees who left', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('avg', 'Average headcount', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.avg === 0) return { ok: false, message: 'Average headcount must be greater than zero.' };
        return { ok: true, primary: (vals.left / vals.avg) * 100, format: 'percent' };

      case 'revenue':
        err = req('units', 'Units sold', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('price', 'Price per unit', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.units * vals.price, format: 'money' };

      case 'sales':
        err = req('transactions', 'Number of transactions', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('avg', 'Average sale', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.transactions * vals.avg, format: 'money' };

      case 'percentage_discount':
        err = req('list', 'List price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('disc', 'Discount %');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.list * (vals.disc / 100), format: 'money' };

      case 'discount_rate':
        err = req('fv', 'Future value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('pv', 'Present value', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('years', 'Years', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.pv === 0 || vals.years === 0) return { ok: false, message: 'Check inputs.' };
        return { ok: true, primary: (Math.pow(vals.fv / vals.pv, 1 / vals.years) - 1) * 100, format: 'percent' };

      case 'cost_capital_simple':
        err = reqPct('equityPct', 'Equity weight %');
        if (err) return { ok: false, message: err.err };
        err = reqPct('costEq', 'Cost of equity %');
        if (err) return { ok: false, message: err.err };
        err = reqPct('debtPct', 'Debt weight %');
        if (err) return { ok: false, message: err.err };
        err = reqPct('costDebt', 'After-tax cost of debt %');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: (vals.equityPct / 100) * vals.costEq + (vals.debtPct / 100) * vals.costDebt, format: 'percent' };

      case 'real_estate_commission':
        err = req('price', 'Sale price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Commission rate');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.price * (vals.rate / 100), format: 'money' };

      case 'real_estate_commission_vat':
        err = req('price', 'Sale price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Commission rate');
        if (err) return { ok: false, message: err.err };
        err = reqPct('vat', 'VAT rate');
        if (err) return { ok: false, message: err.err };
        var comm = vals.price * (vals.rate / 100);
        return { ok: true, primary: comm * (1 + vals.vat / 100), format: 'money' };

      case 'rental_commission':
        err = req('rent', 'Annual rent', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Commission rate');
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.rent * (vals.rate / 100), format: 'money' };

      case 'true_cost_re':
        err = req('price', 'Sale price', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = reqPct('rate', 'Commission rate');
        if (err) return { ok: false, message: err.err };
        err = req('fees', 'Additional closing fees', { min: 0 });
        if (err) return { ok: false, message: err.err };
        return { ok: true, primary: vals.price * (vals.rate / 100) + vals.fees, format: 'money' };

      case 'expense_ratio':
        err = req('expenses', 'Fund expenses', { min: 0 });
        if (err) return { ok: false, message: err.err };
        err = req('assets', 'Average net assets', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.assets === 0) return { ok: false, message: 'Assets must be greater than zero.' };
        return { ok: true, primary: (vals.expenses / vals.assets) * 100, format: 'percent' };

      case 'operating_margin':
        err = req('opInc', 'Operating income', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.revenue === 0) return { ok: false, message: 'Revenue must be greater than zero.' };
        return { ok: true, primary: (vals.opInc / vals.revenue) * 100, format: 'percent' };

      case 'net_profit_margin':
        err = req('net', 'Net income', { allowNegative: true });
        if (err) return { ok: false, message: err.err };
        err = req('revenue', 'Revenue', { min: 0 });
        if (err) return { ok: false, message: err.err };
        if (vals.revenue === 0) return { ok: false, message: 'Revenue must be greater than zero.' };
        return { ok: true, primary: (vals.net / vals.revenue) * 100, format: 'percent' };

      default:
        return { ok: false, message: 'Unknown calculator kind.' };
    }
  }

  function render(out) {
    var el = getEl('outPrimary');
    if (!el) return;
    var txt;
    if (out.format === 'money') txt = moneyFmt(out.primary);
    else if (out.format === 'percent') txt = numFmt(out.primary, 2) + '%';
    else txt = numFmt(out.primary, 4);
    el.textContent = txt;

    var el2 = getEl('outSecondary');
    if (el2 && out.secondary != null) {
      if (out.format2 === 'money') el2.textContent = moneyFmt(out.secondary);
      else if (out.format2 === 'percent') el2.textContent = numFmt(out.secondary, 2) + '%';
      else el2.textContent = numFmt(out.secondary, 4);
    }

    var el3 = getEl('outTertiary');
    if (el3 && out.extra != null) {
      el3.textContent = moneyFmt(out.extra);
    }

    var interp = getEl('interpretation');
    if (interp) {
      if (window.__SMB_CALC__ && typeof window.__SMB_CALC__.interpret === 'function') {
        interp.textContent = window.__SMB_CALC__.interpret(out);
        interp.hidden = false;
      } else {
        interp.textContent = '';
        interp.hidden = true;
      }
    }
  }

  function run() {
    var cfg = window.__SMB_CALC__;
    if (!cfg || !cfg.kind) return;
    var out = compute(cfg);
    if (!out.ok) {
      setValidation(out.message, true);
      return;
    }
    setValidation('', false);
    render(out);
  }

  function reset() {
    var cfg = window.__SMB_CALC__;
    if (!cfg || !cfg.fieldIds) return;
    for (var i = 0; i < cfg.fieldIds.length; i++) {
      var el = getEl(cfg.fieldIds[i]);
      if (el) el.value = '';
    }
    var o = getEl('outPrimary');
    if (o) o.textContent = '—';
    var o2 = getEl('outSecondary');
    if (o2) o2.textContent = '—';
    var o3 = getEl('outTertiary');
    if (o3) o3.textContent = '—';
    var interp = getEl('interpretation');
    if (interp) {
      interp.textContent = '';
      interp.hidden = true;
    }
    setValidation('', false);
  }

  function init() {
    var cfg = window.__SMB_CALC__;
    if (!cfg) return;
    if (cfg.useCurrency && window.VendoraCurrency) {
      window.VendoraCurrency.initSyncedCurrencySelects('global', 'USD');
    }
    var calc = getEl('calculateBtn');
    var rst = getEl('resetBtn');
    if (calc) calc.addEventListener('click', run);
    if (rst) rst.addEventListener('click', reset);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
