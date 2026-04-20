/**
 * Restaurant Profit Dashboard — vanilla JS, localStorage, zero-dependency.
 * Encapsulated in an IIFE to avoid leaking globals.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants & field configuration
  // ---------------------------------------------------------------------------

  var STORAGE_KEY = 'restaurant-profit-dashboard:v1';

  var REVENUE_IDS = [
    'foodSales',
    'beverageSales',
    'deliverySales',
    'otherSales',
    'discountsRefunds'
  ];

  var EXPENSE_IDS = [
    'foodCost',
    'packagingCost',
    'deliveryFees',
    'laborCost',
    'rent',
    'utilities',
    'marketing',
    'miscellaneousExpenses'
  ];

  var PERIOD_LABELS = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
  };

  var currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });

  var diffCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'exceptZero',
    maximumFractionDigits: 2
  });

  /** Separate from main dashboard autosave */
  var PREVIOUS_SNAPSHOT_KEY = 'restaurant-profit-dashboard:previous-period:v1';

  var COMPARE_EPS = 1e-6;

  /** @param {string} name @param {Record<string, unknown>} [params] */
  function gtagEvent(name, params) {
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', name, params || {});
      }
    } catch (e) {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------------------
  // normalizeNumber — parse user text to a finite number, flag invalid tokens
  // ---------------------------------------------------------------------------

  /**
   * @param {string|number|null|undefined} raw
   * @returns {{ ok: boolean, value: number }}
   */
  function normalizeNumber(raw) {
    if (raw === null || raw === undefined) {
      return { ok: true, value: 0 };
    }
    var s = String(raw).trim();
    if (s === '') {
      return { ok: true, value: 0 };
    }
    var cleaned = s.replace(/,/g, '');
    var n = Number(cleaned);
    if (!Number.isFinite(n)) {
      return { ok: false, value: 0 };
    }
    return { ok: true, value: n };
  }

  // ---------------------------------------------------------------------------
  // getInputs — read DOM values and validation state
  // ---------------------------------------------------------------------------

  /**
   * @returns {{
   *   period: string,
   *   numbers: Record<string, number>,
   *   validation: Record<string, boolean>
   * }}
   */
  function getInputs() {
    var periodEl = document.getElementById('period');
    var period = periodEl && periodEl.value ? periodEl.value : 'monthly';

    var numbers = {};
    var validation = {};

    function readId(id) {
      var el = document.getElementById(id);
      var raw = el ? el.value : '';
      var parsed = normalizeNumber(raw);
      numbers[id] = parsed.value;
      validation[id] = parsed.ok;
    }

    REVENUE_IDS.forEach(readId);
    EXPENSE_IDS.forEach(readId);

    return { period: period, numbers: numbers, validation: validation };
  }

  // ---------------------------------------------------------------------------
  // calculateMetrics — pure math from normalized numbers
  // ---------------------------------------------------------------------------

  /**
   * @param {Record<string, number>} n
   * @returns {object}
   */
  function calculateMetrics(n) {
    var foodSales = n.foodSales;
    var beverageSales = n.beverageSales;
    var deliverySales = n.deliverySales;
    var otherSales = n.otherSales;
    var discountsRefunds = n.discountsRefunds;

    var foodCost = n.foodCost;
    var packagingCost = n.packagingCost;
    var deliveryFees = n.deliveryFees;
    var laborCost = n.laborCost;
    var rent = n.rent;
    var utilities = n.utilities;
    var marketing = n.marketing;
    var miscellaneousExpenses = n.miscellaneousExpenses;

    var totalRevenue =
      foodSales + beverageSales + deliverySales + otherSales - discountsRefunds;

    if (!Number.isFinite(totalRevenue)) totalRevenue = 0;

    var totalVariableCosts = foodCost + packagingCost + deliveryFees;
    var totalFixedCosts = laborCost + rent + utilities + marketing + miscellaneousExpenses;

    if (!Number.isFinite(totalVariableCosts)) totalVariableCosts = 0;
    if (!Number.isFinite(totalFixedCosts)) totalFixedCosts = 0;

    var totalExpenses = totalVariableCosts + totalFixedCosts;
    if (!Number.isFinite(totalExpenses)) totalExpenses = 0;

    var grossProfit = totalRevenue - totalVariableCosts;
    var netProfit = totalRevenue - totalExpenses;

    if (!Number.isFinite(grossProfit)) grossProfit = 0;
    if (!Number.isFinite(netProfit)) netProfit = 0;

    var profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    var foodCostPct = totalRevenue > 0 ? (foodCost / totalRevenue) * 100 : 0;
    var laborCostPct = totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0;

    if (!Number.isFinite(profitMargin)) profitMargin = 0;
    if (!Number.isFinite(foodCostPct)) foodCostPct = 0;
    if (!Number.isFinite(laborCostPct)) laborCostPct = 0;

    var breakEvenRevenue = totalExpenses;

    var statusKey = 'even';
    var statusText = 'Break-even';
    if (netProfit > 0) {
      statusKey = 'profit';
      statusText = 'Profit';
    } else if (netProfit < 0) {
      statusKey = 'loss';
      statusText = 'Loss';
    }

    return {
      totalRevenue: totalRevenue,
      totalExpenses: totalExpenses,
      grossProfit: grossProfit,
      netProfit: netProfit,
      profitMargin: profitMargin,
      foodCostPct: foodCostPct,
      laborCostPct: laborCostPct,
      breakEvenRevenue: breakEvenRevenue,
      statusKey: statusKey,
      statusText: statusText
    };
  }

  // ---------------------------------------------------------------------------
  // renderMetrics — write KPI cards and period label
  // ---------------------------------------------------------------------------

  function formatPctOneDec(value) {
    var v = Number(value);
    if (!Number.isFinite(v)) return '0.0%';
    return v.toFixed(1) + '%';
  }

  function renderPeriodLabel(period) {
    var el = document.getElementById('periodLabel');
    if (!el) return;
    var label = PERIOD_LABELS[period] || PERIOD_LABELS.monthly;
    el.textContent = 'Period: ' + label;
  }

  /**
   * @param {ReturnType<typeof calculateMetrics>} metrics
   */
  function renderMetrics(metrics) {
    var region = document.getElementById('kpiRegion');
    if (!region) return;

    var safeRev = currencyFormatter.format(metrics.totalRevenue);
    var safeExp = currencyFormatter.format(metrics.totalExpenses);
    var safeGross = currencyFormatter.format(metrics.grossProfit);
    var safeNet = currencyFormatter.format(metrics.netProfit);
    var safeBe = currencyFormatter.format(metrics.breakEvenRevenue);

    var statusClass =
      metrics.statusKey === 'profit'
        ? 'status-pill status-pill--profit'
        : metrics.statusKey === 'loss'
          ? 'status-pill status-pill--loss'
          : 'status-pill status-pill--even';

    var netSub =
      metrics.netProfit > 0
        ? 'Revenue exceeds total expenses for this period.'
        : metrics.netProfit < 0
          ? 'Total expenses exceed revenue for this period.'
          : 'Revenue matches total expenses for this period.';

    var cards = [
      {
        label: 'Total revenue',
        value: safeRev,
        sub: 'After discounts & refunds'
      },
      {
        label: 'Total expenses',
        value: safeExp,
        sub: 'Variable + fixed costs'
      },
      {
        label: 'Gross profit',
        value: safeGross,
        sub: 'Revenue minus variable costs'
      },
      {
        label: 'Net profit',
        value: safeNet,
        sub: netSub
      },
      {
        label: 'Profit margin',
        value: formatPctOneDec(metrics.profitMargin),
        sub: 'Net profit ÷ revenue'
      },
      {
        label: 'Food cost %',
        value: formatPctOneDec(metrics.foodCostPct),
        sub: 'Food cost ÷ revenue'
      },
      {
        label: 'Labor cost %',
        value: formatPctOneDec(metrics.laborCostPct),
        sub: 'Labor ÷ revenue'
      },
      {
        label: 'Break-even status',
        html:
          '<span class="' +
          statusClass +
          '" role="status">' +
          escapeHtml(metrics.statusText) +
          '</span>',
        sub: 'Break-even target: ' + safeBe
      }
    ];

    var html = cards
      .map(function (c) {
        var valueBlock = c.html
          ? '<p class="kpi-value">' + c.html + '</p>'
          : '<p class="kpi-value">' + c.value + '</p>';
        return (
          '<div class="kpi">' +
          '<p class="kpi-label">' +
          escapeHtml(c.label) +
          '</p>' +
          valueBlock +
          (c.sub ? '<p class="kpi-sub">' + escapeHtml(c.sub) + '</p>' : '') +
          '</div>'
        );
      })
      .join('');

    region.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Visual summary bars (pure CSS widths, no external charts)
  // ---------------------------------------------------------------------------

  /**
   * Clamp a numeric percentage to 0–100 for safe bar widths.
   * @param {number} v
   * @returns {number}
   */
  function clampPercent(v) {
    var n = Number(v);
    if (!Number.isFinite(n) || n < 0) {
      return 0;
    }
    if (n > 100) {
      return 100;
    }
    return n;
  }

  /**
   * Human-readable caption for a bar row.
   * @param {'compare'|'net'|'ratio'} kind
   * @param {object} ctx
   * @returns {string}
   */
  function formatBarLabel(kind, ctx) {
    if (kind === 'compare') {
      return (
        currencyFormatter.format(ctx.amount) +
        ' · ' +
        clampPercent(ctx.barPct).toFixed(0) +
        '% of larger (revenue or expenses)'
      );
    }
    if (kind === 'net') {
      var pct = clampPercent(ctx.barPct);
      var tail = ctx.netNegative
        ? 'loss magnitude vs scale'
        : ctx.net > 0
          ? 'profit vs scale'
          : 'break-even on scale';
      return currencyFormatter.format(ctx.net) + ' · bar ' + pct.toFixed(0) + '% (' + tail + ')';
    }
    if (kind === 'ratio') {
      return formatPctOneDec(ctx.pctValue) + ' of revenue (max bar width at 100%)';
    }
    return '';
  }

  /**
   * @param {ReturnType<typeof calculateMetrics>} metrics
   */
  function renderVisualSummary(metrics) {
    var host = document.getElementById('visualSummary');
    if (!host) {
      return;
    }

    var rev = metrics.totalRevenue;
    var exp = metrics.totalExpenses;
    var net = metrics.netProfit;

    if (!Number.isFinite(rev)) rev = 0;
    if (!Number.isFinite(exp)) exp = 0;
    if (!Number.isFinite(net)) net = 0;

    var compareScale = Math.max(rev, exp, 1);
    var revBarPct = clampPercent((rev / compareScale) * 100);
    var expBarPct = clampPercent((exp / compareScale) * 100);

    var netScale = Math.max(rev, exp, Math.abs(net), 1);
    var netNegative = net < 0;
    var netBarPct = netNegative
      ? clampPercent((Math.abs(net) / netScale) * 100)
      : clampPercent((net / netScale) * 100);

    var foodW = clampPercent(metrics.foodCostPct);
    var laborW = clampPercent(metrics.laborCostPct);

    var revCaption = formatBarLabel('compare', { amount: rev, barPct: revBarPct });
    var expCaption = formatBarLabel('compare', { amount: exp, barPct: expBarPct });
    var netCaption = formatBarLabel('net', {
      net: net,
      barPct: netBarPct,
      netNegative: netNegative
    });
    var foodCaption = formatBarLabel('ratio', { pctValue: metrics.foodCostPct });
    var laborCaption = formatBarLabel('ratio', { pctValue: metrics.laborCostPct });

    var netTrackClass = 'visual-track visual-track--thick' + (netNegative ? ' visual-track--net-loss' : '');
    var netFillClass = netNegative
      ? 'visual-fill visual-fill--loss'
      : net > 0
        ? 'visual-fill visual-fill--profit'
        : 'visual-fill visual-fill--even';

    var html =
      '<div class="visual-block">' +
      '<p class="visual-block-title">Revenue vs expenses</p>' +
      '<p class="visual-block-desc">Bar length is relative to the larger of total revenue and total expenses.</p>' +
      '<div class="visual-rows">' +
      '<div class="visual-row">' +
      '<div class="visual-row-head">' +
      '<span class="visual-row-label">Revenue</span>' +
      '<span class="visual-row-value">' +
      escapeHtml(currencyFormatter.format(rev)) +
      '</span></div>' +
      '<div class="visual-track visual-track--thick" role="presentation">' +
      '<div class="visual-fill visual-fill--revenue" style="width:' +
      revBarPct.toFixed(2) +
      '%"></div></div>' +
      '<p class="visual-row-note">' +
      escapeHtml(revCaption) +
      '</p></div>' +
      '<div class="visual-row">' +
      '<div class="visual-row-head">' +
      '<span class="visual-row-label">Expenses</span>' +
      '<span class="visual-row-value">' +
      escapeHtml(currencyFormatter.format(exp)) +
      '</span></div>' +
      '<div class="visual-track visual-track--thick" role="presentation">' +
      '<div class="visual-fill visual-fill--expense" style="width:' +
      expBarPct.toFixed(2) +
      '%"></div></div>' +
      '<p class="visual-row-note">' +
      escapeHtml(expCaption) +
      '</p></div>' +
      '</div></div>' +
      '<div class="visual-block">' +
      '<p class="visual-block-title">Net profit</p>' +
      '<p class="visual-block-desc">' +
      (netNegative
        ? 'Red bar shows loss size relative to revenue, expenses, and net.'
        : 'Green bar shows profit size on the same scale.') +
      '</p>' +
      '<div class="visual-row-head">' +
      '<span class="visual-row-label">Net</span>' +
      '<span class="visual-row-value visual-row-value--' +
      (netNegative ? 'loss' : net > 0 ? 'profit' : 'even') +
      '">' +
      escapeHtml(currencyFormatter.format(net)) +
      '</span></div>' +
      '<div class="' +
      escapeHtml(netTrackClass) +
      '" role="presentation">' +
      '<div class="' +
      escapeHtml(netFillClass) +
      '" style="width:' +
      netBarPct.toFixed(2) +
      '%"></div></div>' +
      '<p class="visual-row-note">' +
      escapeHtml(netCaption) +
      '</p></div>' +
      '<div class="visual-block">' +
      '<p class="visual-block-title">Food cost % of revenue</p>' +
      '<div class="visual-row-head">' +
      '<span class="visual-row-label">Target: keep bar within your goals</span>' +
      '<span class="visual-row-value">' +
      escapeHtml(formatPctOneDec(metrics.foodCostPct)) +
      '</span></div>' +
      '<div class="visual-track visual-track--thick" role="presentation">' +
      '<div class="visual-fill visual-fill--food" style="width:' +
      foodW.toFixed(2) +
      '%"></div></div>' +
      '<p class="visual-row-note">' +
      escapeHtml(foodCaption) +
      '</p></div>' +
      '<div class="visual-block">' +
      '<p class="visual-block-title">Labor cost % of revenue</p>' +
      '<div class="visual-row-head">' +
      '<span class="visual-row-label">Share of revenue</span>' +
      '<span class="visual-row-value">' +
      escapeHtml(formatPctOneDec(metrics.laborCostPct)) +
      '</span></div>' +
      '<div class="visual-track visual-track--thick" role="presentation">' +
      '<div class="visual-fill visual-fill--labor" style="width:' +
      laborW.toFixed(2) +
      '%"></div></div>' +
      '<p class="visual-row-note">' +
      escapeHtml(laborCaption) +
      '</p></div>';

    host.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---------------------------------------------------------------------------
  // Summary export / print (plain text + print layout)
  // ---------------------------------------------------------------------------

  /**
   * @param {string} id
   * @returns {string}
   */
  function getInputLabel(id) {
    var lb = document.querySelector('label[for="' + id + '"]');
    return lb ? lb.textContent.replace(/\s+/g, ' ').trim() : id;
  }

  /**
   * @param {string[]} ids
   * @param {Record<string, number>} numbers
   * @param {boolean} filledOnly
   */
  function buildLineItems(ids, numbers, filledOnly) {
    var arr = [];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      var raw = el ? String(el.value).trim() : '';
      if (filledOnly && raw === '') {
        return;
      }
      var amt = numbers[id];
      if (!Number.isFinite(amt)) {
        amt = 0;
      }
      arr.push({
        id: id,
        label: getInputLabel(id),
        displayMoney: currencyFormatter.format(amt)
      });
    });
    return arr;
  }

  /**
   * @returns {{
   *   toolTitle: string,
   *   periodKey: string,
   *   periodLabel: string,
   *   generatedAtISO: string,
   *   generatedAtDisplay: string,
   *   revenueFilled: Array<{id:string,label:string,displayMoney:string}>,
   *   expenseFilled: Array<{id:string,label:string,displayMoney:string}>,
   *   revenueAll: Array<{id:string,label:string,displayMoney:string}>,
   *   expenseAll: Array<{id:string,label:string,displayMoney:string}>,
   *   metrics: ReturnType<typeof calculateMetrics>
   * }}
   */
  function buildSummaryData() {
    var data = getInputs();
    var metrics = calculateMetrics(data.numbers);
    return {
      toolTitle: 'Restaurant Profit Dashboard',
      periodKey: data.period,
      periodLabel: PERIOD_LABELS[data.period] || PERIOD_LABELS.monthly,
      generatedAtISO: new Date().toISOString(),
      generatedAtDisplay: new Date().toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'short'
      }),
      revenueFilled: buildLineItems(REVENUE_IDS, data.numbers, true),
      expenseFilled: buildLineItems(EXPENSE_IDS, data.numbers, true),
      revenueAll: buildLineItems(REVENUE_IDS, data.numbers, false),
      expenseAll: buildLineItems(EXPENSE_IDS, data.numbers, false),
      metrics: metrics
    };
  }

  /**
   * @param {ReturnType<typeof buildSummaryData>} d
   * @returns {string}
   */
  function buildSummaryText(d) {
    var m = d.metrics;
    var lines = [];
    lines.push(d.toolTitle);
    lines.push('Period: ' + d.periodLabel);
    lines.push('Generated: ' + d.generatedAtDisplay);
    lines.push('');
    lines.push('Revenue (entered amounts)');
    d.revenueAll.forEach(function (row) {
      lines.push('  ' + row.label + ': ' + row.displayMoney);
    });
    lines.push('');
    lines.push('Expenses (entered amounts)');
    d.expenseAll.forEach(function (row) {
      lines.push('  ' + row.label + ': ' + row.displayMoney);
    });
    lines.push('');
    lines.push('KPI summary');
    lines.push('  Total revenue: ' + currencyFormatter.format(m.totalRevenue));
    lines.push('  Total expenses: ' + currencyFormatter.format(m.totalExpenses));
    lines.push('  Gross profit: ' + currencyFormatter.format(m.grossProfit));
    lines.push('  Net profit: ' + currencyFormatter.format(m.netProfit));
    lines.push('  Profit margin: ' + formatPctOneDec(m.profitMargin));
    lines.push('  Food cost %: ' + formatPctOneDec(m.foodCostPct));
    lines.push('  Labor cost %: ' + formatPctOneDec(m.laborCostPct));
    lines.push('  Break-even revenue target: ' + currencyFormatter.format(m.breakEvenRevenue));
    lines.push('  Status: ' + m.statusText);
    lines.push('');
    lines.push('— End of summary —');
    return lines.join('\n');
  }

  /**
   * @param {ReturnType<typeof buildSummaryData>} d
   * @returns {string}
   */
  function buildPrintHtml(d) {
    var m = d.metrics;

    function listRows(rows) {
      if (!rows.length) {
        return '<p class="print-muted">(No values entered in this section.)</p>';
      }
      return (
        '<ul class="print-list">' +
        rows
          .map(function (r) {
            return (
              '<li><span class="print-line-label">' +
              escapeHtml(r.label) +
              '</span><span class="print-line-value">' +
              escapeHtml(r.displayMoney) +
              '</span></li>'
            );
          })
          .join('') +
        '</ul>'
      );
    }

    return (
      '<div class="print-summary-inner">' +
      '<h1 class="print-title">' +
      escapeHtml(d.toolTitle) +
      '</h1>' +
      '<p class="print-meta"><strong>Period:</strong> ' +
      escapeHtml(d.periodLabel) +
      '</p>' +
      '<p class="print-meta"><strong>Generated:</strong> ' +
      escapeHtml(d.generatedAtDisplay) +
      '</p>' +
      '<h2 class="print-section-title">Revenue (entered)</h2>' +
      listRows(d.revenueFilled) +
      '<h2 class="print-section-title">Expenses (entered)</h2>' +
      listRows(d.expenseFilled) +
      '<h2 class="print-section-title">KPI summary</h2>' +
      '<ul class="print-list print-kpi">' +
      '<li><span class="print-line-label">Total revenue</span><span class="print-line-value">' +
      escapeHtml(currencyFormatter.format(m.totalRevenue)) +
      '</span></li>' +
      '<li><span class="print-line-label">Total expenses</span><span class="print-line-value">' +
      escapeHtml(currencyFormatter.format(m.totalExpenses)) +
      '</span></li>' +
      '<li><span class="print-line-label">Gross profit</span><span class="print-line-value">' +
      escapeHtml(currencyFormatter.format(m.grossProfit)) +
      '</span></li>' +
      '<li><span class="print-line-label">Net profit</span><span class="print-line-value">' +
      escapeHtml(currencyFormatter.format(m.netProfit)) +
      '</span></li>' +
      '<li><span class="print-line-label">Profit margin</span><span class="print-line-value">' +
      escapeHtml(formatPctOneDec(m.profitMargin)) +
      '</span></li>' +
      '<li><span class="print-line-label">Food cost %</span><span class="print-line-value">' +
      escapeHtml(formatPctOneDec(m.foodCostPct)) +
      '</span></li>' +
      '<li><span class="print-line-label">Labor cost %</span><span class="print-line-value">' +
      escapeHtml(formatPctOneDec(m.laborCostPct)) +
      '</span></li>' +
      '<li><span class="print-line-label">Break-even revenue target</span><span class="print-line-value">' +
      escapeHtml(currencyFormatter.format(m.breakEvenRevenue)) +
      '</span></li>' +
      '<li><span class="print-line-label">Status</span><span class="print-line-value">' +
      escapeHtml(m.statusText) +
      '</span></li>' +
      '</ul>' +
      '</div>'
    );
  }

  function hideExportFallback() {
    var dlg = document.getElementById('exportFallback');
    if (dlg) {
      dlg.hidden = true;
    }
  }

  function showExportFallback(text) {
    var dlg = document.getElementById('exportFallback');
    var ta = document.getElementById('exportFallbackText');
    if (!dlg || !ta) return;
    ta.value = text;
    dlg.hidden = false;
    ta.focus();
    ta.select();
  }

  function handlePrintSummary() {
    gtagEvent('rpd_print', { event_category: 'restaurant_profit_dashboard' });
    var host = document.getElementById('printSummaryHost');
    if (!host) return;
    var data = buildSummaryData();
    host.innerHTML = buildPrintHtml(data);
    host.setAttribute('aria-hidden', 'false');
    window.print();
  }

  function handleExportSummaryText() {
    gtagEvent('rpd_export_summary', { event_category: 'restaurant_profit_dashboard' });
    var data = buildSummaryData();
    var text = buildSummaryText(data);
    var statusEl = document.getElementById('exportStatus');

    function showCopied() {
      if (statusEl) {
        statusEl.textContent = 'Summary copied to clipboard.';
        statusEl.hidden = false;
        window.setTimeout(function () {
          if (statusEl) statusEl.hidden = true;
        }, 4000);
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          hideExportFallback();
          showCopied();
        })
        .catch(function () {
          showExportFallback(text);
        });
    } else {
      showExportFallback(text);
    }
  }

  // ---------------------------------------------------------------------------
  // CSV export (current inputs + KPI snapshot)
  // ---------------------------------------------------------------------------

  /**
   * Escape a cell for RFC-style CSV (quotes, commas, CR/LF).
   * @param {string|number|null|undefined} value
   * @returns {string}
   */
  function escapeCsvValue(value) {
    var s = value == null || value === undefined ? '' : String(value);
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /**
   * @param {string[]} parts
   * @returns {string}
   */
  function pushCsvRow(parts) {
    return parts.map(escapeCsvValue).join(',');
  }

  function formatCsvNumber(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) {
      return '0';
    }
    return String(v);
  }

  function formatCsvPercentOneDec(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) {
      return '0.0';
    }
    return (Math.round(v * 10) / 10).toFixed(1);
  }

  /**
   * @returns {string}
   */
  function buildCsvRows() {
    var data = getInputs();
    var m = calculateMetrics(data.numbers);
    var periodLabel = PERIOD_LABELS[data.period] || data.period || 'Monthly';
    var iso = new Date().toISOString();
    var lines = [];

    lines.push(pushCsvRow(['Category', 'Field', 'Value']));
    lines.push(pushCsvRow(['Meta', 'Tool title', 'Restaurant Profit Dashboard']));
    lines.push(pushCsvRow(['Meta', 'Generated (ISO-8601)', iso]));
    lines.push(pushCsvRow(['Meta', 'Period', periodLabel]));

    REVENUE_IDS.forEach(function (id) {
      lines.push(pushCsvRow(['Revenue', getInputLabel(id), formatCsvNumber(data.numbers[id])]));
    });
    EXPENSE_IDS.forEach(function (id) {
      lines.push(pushCsvRow(['Expense', getInputLabel(id), formatCsvNumber(data.numbers[id])]));
    });

    lines.push(pushCsvRow(['KPI', 'Total revenue', formatCsvNumber(m.totalRevenue)]));
    lines.push(pushCsvRow(['KPI', 'Total expenses', formatCsvNumber(m.totalExpenses)]));
    lines.push(pushCsvRow(['KPI', 'Gross profit', formatCsvNumber(m.grossProfit)]));
    lines.push(pushCsvRow(['KPI', 'Net profit', formatCsvNumber(m.netProfit)]));
    lines.push(pushCsvRow(['KPI', 'Profit margin %', formatCsvPercentOneDec(m.profitMargin)]));
    lines.push(pushCsvRow(['KPI', 'Food cost %', formatCsvPercentOneDec(m.foodCostPct)]));
    lines.push(pushCsvRow(['KPI', 'Labor cost %', formatCsvPercentOneDec(m.laborCostPct)]));
    lines.push(pushCsvRow(['KPI', 'Status', String(m.statusText || 'Break-even')]));

    return lines.join('\r\n');
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /**
   * @param {Date} d
   * @returns {string} YYYY-MM-DD local
   */
  function formatDateForCsvFilename(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /**
   * @param {string} filename
   * @param {string} csvContent
   */
  function downloadCsvFile(filename, csvContent) {
    var body = '\uFEFF' + csvContent;
    var blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    var csv = buildCsvRows();
    var filename = 'restaurant-profit-dashboard-' + formatDateForCsvFilename(new Date()) + '.csv';
    downloadCsvFile(filename, csv);
    gtagEvent('rpd_export_csv', { event_category: 'restaurant_profit_dashboard' });
    var statusEl = document.getElementById('exportStatus');
    if (statusEl) {
      statusEl.textContent = 'CSV file download started.';
      statusEl.hidden = false;
      window.setTimeout(function () {
        if (statusEl) {
          statusEl.hidden = true;
        }
      }, 4000);
    }
  }

  // ---------------------------------------------------------------------------
  // Validation UI
  // ---------------------------------------------------------------------------

  function setFieldError(id, message) {
    var input = document.getElementById(id);
    var err = document.getElementById(id + '-error');
    if (!input || !err) return;
    if (message) {
      err.textContent = message;
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      err.textContent = '';
      err.hidden = true;
      input.removeAttribute('aria-invalid');
    }
  }

  function applyValidation(validation) {
    var allIds = REVENUE_IDS.concat(EXPENSE_IDS);
    allIds.forEach(function (id) {
      if (validation[id] === false) {
        setFieldError(id, 'Enter a valid number or leave blank for zero.');
      } else {
        setFieldError(id, '');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // saveState / loadState / clearState — localStorage
  // ---------------------------------------------------------------------------

  function buildStateSnapshot() {
    var data = getInputs();
    var raw = {};
    REVENUE_IDS.concat(EXPENSE_IDS).forEach(function (id) {
      var el = document.getElementById(id);
      raw[id] = el ? el.value : '';
    });
    return {
      period: data.period,
      fields: raw
    };
  }

  function saveState() {
    try {
      var snapshot = buildStateSnapshot();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      // Quota or privacy mode — fail silently, UI still works
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;

      if (parsed.period) {
        var periodEl = document.getElementById('period');
        if (periodEl) periodEl.value = parsed.period;
      }
      if (parsed.fields && typeof parsed.fields === 'object') {
        Object.keys(parsed.fields).forEach(function (key) {
          var el = document.getElementById(key);
          if (el) el.value = parsed.fields[key] == null ? '' : String(parsed.fields[key]);
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    var periodEl = document.getElementById('period');
    if (periodEl) periodEl.value = 'monthly';
    REVENUE_IDS.concat(EXPENSE_IDS).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
      setFieldError(id, '');
    });
  }

  // ---------------------------------------------------------------------------
  // Previous period comparison (separate localStorage snapshot)
  // ---------------------------------------------------------------------------

  function safeMetricNumber(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * @param {Record<string, number>} numbers
   * @param {ReturnType<typeof calculateMetrics>} metrics
   */
  function hasMeaningfulSnapshotData(numbers, metrics) {
    if (!metrics) {
      return false;
    }
    if (
      Math.abs(metrics.totalRevenue) > COMPARE_EPS ||
      Math.abs(metrics.totalExpenses) > COMPARE_EPS
    ) {
      return true;
    }
    var ids = REVENUE_IDS.concat(EXPENSE_IDS);
    for (var i = 0; i < ids.length; i++) {
      if (Math.abs(safeMetricNumber(numbers[ids[i]])) > COMPARE_EPS) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {object|null|undefined} m
   */
  function normalizePrevMetrics(m) {
    if (!m || typeof m !== 'object') {
      m = {};
    }
    return {
      totalRevenue: safeMetricNumber(m.totalRevenue),
      totalExpenses: safeMetricNumber(m.totalExpenses),
      netProfit: safeMetricNumber(m.netProfit),
      profitMargin: safeMetricNumber(m.profitMargin),
      foodCostPct: safeMetricNumber(m.foodCostPct),
      laborCostPct: safeMetricNumber(m.laborCostPct)
    };
  }

  function loadPreviousPeriodSnapshot() {
    try {
      var raw = localStorage.getItem(PREVIOUS_SNAPSHOT_KEY);
      if (!raw) {
        return null;
      }
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || !obj.metrics) {
        return null;
      }
      obj.metrics = normalizePrevMetrics(obj.metrics);
      return obj;
    } catch (e) {
      return null;
    }
  }

  function clearPreviousPeriodSnapshot() {
    try {
      localStorage.removeItem(PREVIOUS_SNAPSHOT_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function showCompareActionStatus(message) {
    var el = document.getElementById('compareActionStatus');
    if (!el) {
      return;
    }
    el.textContent = message;
    el.hidden = false;
    window.setTimeout(function () {
      if (el) {
        el.hidden = true;
      }
    }, 4500);
  }

  function savePreviousPeriodSnapshot() {
    var data = getInputs();
    var metrics = calculateMetrics(data.numbers);
    if (!hasMeaningfulSnapshotData(data.numbers, metrics)) {
      showCompareActionStatus('Nothing to save yet. Enter some revenue or expenses first.');
      return;
    }
    var snap = {
      version: 1,
      savedAt: new Date().toISOString(),
      periodKey: data.period,
      periodLabel: PERIOD_LABELS[data.period] || PERIOD_LABELS.monthly,
      fields: {},
      metrics: {
        totalRevenue: metrics.totalRevenue,
        totalExpenses: metrics.totalExpenses,
        netProfit: metrics.netProfit,
        profitMargin: metrics.profitMargin,
        foodCostPct: metrics.foodCostPct,
        laborCostPct: metrics.laborCostPct
      }
    };
    REVENUE_IDS.concat(EXPENSE_IDS).forEach(function (id) {
      var el = document.getElementById(id);
      snap.fields[id] = el ? el.value : '';
    });
    try {
      localStorage.setItem(PREVIOUS_SNAPSHOT_KEY, JSON.stringify(snap));
    } catch (e) {
      showCompareActionStatus('Could not save. Storage may be full or disabled.');
      return;
    }
    gtagEvent('rpd_save_previous_period', { event_category: 'restaurant_profit_dashboard' });
    showCompareActionStatus('Previous period baseline saved.');
    renderComparisonSummary(metrics);
  }

  function formatDiffPctPoints(delta) {
    if (!Number.isFinite(delta)) {
      return '\u2014';
    }
    var d = Math.round(delta * 10) / 10;
    if (Math.abs(d) < COMPARE_EPS) {
      return '0.0 pp';
    }
    var sign = d > 0 ? '+' : '';
    return sign + d.toFixed(1) + ' pp';
  }

  /**
   * @param {ReturnType<typeof calculateMetrics>} cur
   * @param {object} prevM
   */
  function calculateComparison(cur, prevM) {
    var c = normalizePrevMetrics(cur);
    var p = normalizePrevMetrics(prevM);
    function row(key, label, kind) {
      var cv = c[key];
      var pv = p[key];
      var diff = cv - pv;
      if (!Number.isFinite(diff)) {
        diff = 0;
      }
      var dir = 'same';
      if (diff > COMPARE_EPS) {
        dir = 'up';
      } else if (diff < -COMPARE_EPS) {
        dir = 'down';
      }
      var diffFmt =
        kind === 'currency' ? diffCurrencyFormatter.format(diff) : formatDiffPctPoints(diff);
      return {
        key: key,
        label: label,
        kind: kind,
        curFmt: kind === 'currency' ? currencyFormatter.format(cv) : formatPctOneDec(cv),
        prevFmt: kind === 'currency' ? currencyFormatter.format(pv) : formatPctOneDec(pv),
        diffFmt: diffFmt,
        direction: dir
      };
    }
    return [
      row('totalRevenue', 'Total revenue', 'currency'),
      row('totalExpenses', 'Total expenses', 'currency'),
      row('netProfit', 'Net profit', 'currency'),
      row('profitMargin', 'Profit margin', 'percent'),
      row('foodCostPct', 'Food cost %', 'percent'),
      row('laborCostPct', 'Labor cost %', 'percent')
    ];
  }

  function compareChipClass(direction) {
    if (direction === 'up') {
      return 'compare-chip compare-chip--up';
    }
    if (direction === 'down') {
      return 'compare-chip compare-chip--down';
    }
    return 'compare-chip compare-chip--same';
  }

  function compareChipText(direction) {
    if (direction === 'up') {
      return '\u25b2 Up';
    }
    if (direction === 'down') {
      return '\u25bc Down';
    }
    return '\u2014 Same';
  }

  /**
   * @param {ReturnType<typeof calculateMetrics>} currentMetrics
   */
  function renderComparisonSummary(currentMetrics) {
    var host = document.getElementById('compareSummary');
    if (!host) {
      return;
    }
    var prev = loadPreviousPeriodSnapshot();
    if (!prev) {
      host.innerHTML =
        '<p class="compare-empty">No previous period saved yet. Enter a full period, then tap <strong>Save current as previous period</strong> to set your comparison baseline.</p>';
      return;
    }
    var rows = calculateComparison(currentMetrics, prev.metrics);
    var savedLabel = '';
    try {
      var d = new Date(prev.savedAt);
      if (Number.isFinite(d.getTime())) {
        savedLabel = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      }
    } catch (e2) {
      savedLabel = '';
    }
    var parts = [];
    parts.push(
      '<p class="compare-meta">Baseline saved: ' +
        escapeHtml(savedLabel || '(date unknown)') +
        ' · Period when saved: ' +
        escapeHtml(String(prev.periodLabel || '')) +
        '</p>'
    );
    parts.push('<div class="compare-cards">');
    rows.forEach(function (r) {
      parts.push(
        '<div class="compare-card">' +
          '<h4 class="compare-card-title">' +
          escapeHtml(r.label) +
          '</h4>' +
          '<dl class="compare-dl">' +
          '<div class="compare-dl-row"><dt>Current</dt><dd>' +
          escapeHtml(r.curFmt) +
          '</dd></div>' +
          '<div class="compare-dl-row"><dt>Previous</dt><dd>' +
          escapeHtml(r.prevFmt) +
          '</dd></div>' +
          '<div class="compare-dl-row"><dt>Difference</dt><dd>' +
          escapeHtml(r.diffFmt) +
          '</dd></div>' +
          '</dl>' +
          '<p class="compare-trend"><span class="' +
          compareChipClass(r.direction) +
          '" role="status">' +
          escapeHtml(compareChipText(r.direction)) +
          '</span></p>' +
          '</div>'
      );
    });
    parts.push('</div>');
    host.innerHTML = parts.join('');
  }

  // ---------------------------------------------------------------------------
  // loadExampleData — fills form with a realistic demo month
  // ---------------------------------------------------------------------------

  function loadExampleData() {
    var example = {
      foodSales: '18500',
      beverageSales: '4200',
      deliverySales: '3100',
      otherSales: '650',
      discountsRefunds: '380',
      foodCost: '6200',
      packagingCost: '480',
      deliveryFees: '890',
      laborCost: '7800',
      rent: '3200',
      utilities: '410',
      marketing: '350',
      miscellaneousExpenses: '275'
    };
    Object.keys(example).forEach(function (key) {
      var el = document.getElementById(key);
      if (el) el.value = example[key];
      setFieldError(key, '');
    });
    var periodEl = document.getElementById('period');
    if (periodEl) periodEl.value = 'monthly';
    refreshAll();
    gtagEvent('rpd_load_example', { event_category: 'restaurant_profit_dashboard' });
  }

  // ---------------------------------------------------------------------------
  // refreshAll — validate, calculate, render, optional save
  // ---------------------------------------------------------------------------

  function refreshAll(options) {
    var opts = options || {};
    var data = getInputs();
    applyValidation(data.validation);
    var metrics = calculateMetrics(data.numbers);
    renderPeriodLabel(data.period);
    renderMetrics(metrics);
    renderVisualSummary(metrics);
    renderComparisonSummary(metrics);
    if (opts.persist !== false) {
      saveState();
    }
  }

  // ---------------------------------------------------------------------------
  // bindEvents
  // ---------------------------------------------------------------------------

  function bindEvents() {
    var inputs = REVENUE_IDS.concat(EXPENSE_IDS);
    inputs.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        refreshAll();
      });
      el.addEventListener('change', function () {
        refreshAll();
      });
    });

    var periodEl = document.getElementById('period');
    if (periodEl) {
      periodEl.addEventListener('change', function () {
        refreshAll();
      });
    }

    var btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        clearState();
        refreshAll({ persist: false });
        gtagEvent('rpd_clear_all', { event_category: 'restaurant_profit_dashboard' });
      });
    }

    var btnExample = document.getElementById('btn-example');
    if (btnExample) {
      btnExample.addEventListener('click', function () {
        loadExampleData();
      });
    }

    var btnPrint = document.getElementById('btn-print-summary');
    if (btnPrint) {
      btnPrint.addEventListener('click', function () {
        handlePrintSummary();
      });
    }

    var btnExport = document.getElementById('btn-export-summary');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        handleExportSummaryText();
      });
    }

    var btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', function () {
        handleExportCsv();
      });
    }

    var exportClose = document.getElementById('exportFallbackClose');
    if (exportClose) {
      exportClose.addEventListener('click', function () {
        hideExportFallback();
      });
    }

    var exportDlg = document.getElementById('exportFallback');
    if (exportDlg) {
      exportDlg.addEventListener('click', function (ev) {
        if (ev.target === exportDlg) {
          hideExportFallback();
        }
      });
    }

    window.addEventListener('afterprint', function () {
      var host = document.getElementById('printSummaryHost');
      if (host) {
        host.innerHTML = '';
        host.setAttribute('aria-hidden', 'true');
      }
    });

    var btnSavePrev = document.getElementById('btn-save-previous');
    if (btnSavePrev) {
      btnSavePrev.addEventListener('click', function () {
        savePreviousPeriodSnapshot();
      });
    }

    var btnClearPrev = document.getElementById('btn-clear-previous');
    if (btnClearPrev) {
      btnClearPrev.addEventListener('click', function () {
        clearPreviousPeriodSnapshot();
        gtagEvent('rpd_clear_previous_period', { event_category: 'restaurant_profit_dashboard' });
        showCompareActionStatus('Previous period baseline cleared.');
        var d = getInputs();
        renderComparisonSummary(calculateMetrics(d.numbers));
      });
    }
  }

  // ---------------------------------------------------------------------------
  // init
  // ---------------------------------------------------------------------------

  function init() {
    bindEvents();
    loadState();
    refreshAll({ persist: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
