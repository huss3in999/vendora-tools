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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
      });
    }

    var btnExample = document.getElementById('btn-example');
    if (btnExample) {
      btnExample.addEventListener('click', function () {
        loadExampleData();
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
