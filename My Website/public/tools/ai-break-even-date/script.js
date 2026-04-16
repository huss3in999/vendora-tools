(function () {
  'use strict';

  var AI_ENDPOINT = 'https://ai-core.huss3in999.workers.dev/text';
  var AI_FETCH_TIMEOUT_MS = 28000;

  var els = {
    currency: document.getElementById('currency'),
    startupCost: document.getElementById('startupCost'),
    monthlyRevenue: document.getElementById('monthlyRevenue'),
    monthlyExpenses: document.getElementById('monthlyExpenses'),
    validationMessage: document.getElementById('validationMessage'),
    calcBtn: document.getElementById('calcBtn'),
    resetBtn: document.getElementById('resetBtn'),
    copyBtn: document.getElementById('copyBtn'),

    resultsPanel: document.getElementById('resultsPanel'),
    metricsGrid: document.getElementById('metricsGrid'),
    statusLabel: document.getElementById('statusLabel'),
    headline: document.getElementById('headline'),
    summary: document.getElementById('summary'),

    outDate: document.getElementById('outDate'),
    outMonths: document.getElementById('outMonths'),
    outNet: document.getElementById('outNet'),
    outStartup: document.getElementById('outStartup'),

    aiLoading: document.getElementById('aiLoading'),
    aiError: document.getElementById('aiError'),
    aiErrorText: document.getElementById('aiErrorText'),
    aiContent: document.getElementById('aiContent'),
    aiText: document.getElementById('aiText'),
  };

  var lastCopyText = '';

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = !!hidden;
    el.style.display = hidden ? 'none' : '';
  }

  function safeTrim(s) {
    return String(s == null ? '' : s).trim();
  }

  function parseNonNegative(raw) {
    if (raw === '' || raw === null || raw === undefined) return NaN;
    var n = parseFloat(String(raw).replace(/,/g, ''));
    if (Number.isNaN(n) || n < 0) return NaN;
    return n;
  }

  function formatMoney(symbol, n) {
    var s = safeTrim(symbol) || '$';
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    return sign + s + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatMonths(n) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function setValidation(msg, isError) {
    els.validationMessage.textContent = msg || '';
    els.validationMessage.style.display = msg ? 'block' : 'none';
    els.validationMessage.style.color = isError ? '#fecaca' : '';
  }

  function extractAiText(data) {
    if (data == null) return '';
    if (typeof data === 'string') return data;
    if (typeof data.text === 'string') return data.text;
    if (typeof data.response === 'string') return data.response;
    if (typeof data.output === 'string') return data.output;
    if (typeof data.result === 'string') return data.result;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.reply === 'string') return data.reply;
    if (typeof data.answer === 'string') return data.answer;
    if (typeof data.content === 'string') return data.content;
    if (data.data != null && typeof data.data === 'string') return data.data;
    if (data.data != null && typeof data.data.text === 'string') return data.data.text;
    return '';
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () {
      ctrl.abort();
    }, timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: ctrl.signal })).finally(function () {
      clearTimeout(timer);
    });
  }

  function showAiState(state, text) {
    setHidden(els.aiLoading, state !== 'loading');
    setHidden(els.aiError, state !== 'error');
    setHidden(els.aiContent, state !== 'content');
    if (state === 'error') {
      els.aiErrorText.textContent = text || 'AI is unavailable right now. You can still use the local results above.';
    }
    if (state === 'content') {
      els.aiText.textContent = text || '';
    }
  }

  function addDays(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + Math.round(days));
    return d;
  }

  function formatDate(d) {
    // Local date, readable, stable enough for UI.
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function riskFromMonths(months) {
    if (!Number.isFinite(months)) return { label: 'No break-even', cls: 'danger' };
    if (months <= 6) return { label: 'Low risk', cls: 'ok' };
    if (months <= 18) return { label: 'Medium risk', cls: 'warning' };
    return { label: 'High risk', cls: 'danger' };
  }

  function buildPrompt(summary) {
    return (
      'You are a small business planning advisor. Do not calculate numbers. Use only the summary below.\n' +
      'Explain risk level in simple language with short next steps.\n\n' +
      'Summary:\n' +
      summary +
      '\n\n' +
      'Reply in plain text only. Use exactly this format (no JSON, no markdown):\n' +
      'SUMMARY: [one sentence]\n' +
      'RISK: [low/medium/high + one short reason]\n' +
      'NEXT1: [one action]\n' +
      'NEXT2: [one action]\n' +
      'NEXT3: [one action]\n\n' +
      'Keep total under 90 words.'
    );
  }

  function compute() {
    setValidation('', false);

    var currency = safeTrim(els.currency.value) || '$';
    var startupCost = parseNonNegative(els.startupCost.value);
    var monthlyRevenue = parseNonNegative(els.monthlyRevenue.value);
    var monthlyExpenses = parseNonNegative(els.monthlyExpenses.value);

    if (els.startupCost.value === '' || els.monthlyRevenue.value === '' || els.monthlyExpenses.value === '') {
      setValidation('Enter startup cost, monthly revenue, and monthly expenses.', true);
      return null;
    }
    if (Number.isNaN(startupCost) || Number.isNaN(monthlyRevenue) || Number.isNaN(monthlyExpenses)) {
      setValidation('All fields must be valid non-negative numbers.', true);
      return null;
    }

    var net = monthlyRevenue - monthlyExpenses;
    if (net <= 0) {
      return {
        currency: currency,
        startupCost: startupCost,
        monthlyRevenue: monthlyRevenue,
        monthlyExpenses: monthlyExpenses,
        net: net,
        months: Infinity,
        breakEvenDate: null,
        risk: riskFromMonths(Infinity),
      };
    }

    var months = startupCost / net;
    // Convert months to days using average month length.
    var days = months * 30.437;
    var date = addDays(new Date(), days);
    return {
      currency: currency,
      startupCost: startupCost,
      monthlyRevenue: monthlyRevenue,
      monthlyExpenses: monthlyExpenses,
      net: net,
      months: months,
      breakEvenDate: date,
      risk: riskFromMonths(months),
    };
  }

  function updateUi(r) {
    setHidden(els.resultsPanel, false);
    setHidden(els.metricsGrid, false);

    els.statusLabel.textContent = r.risk.label;
    els.statusLabel.classList.remove('warning', 'danger');
    if (r.risk.cls === 'warning') els.statusLabel.classList.add('warning');
    if (r.risk.cls === 'danger') els.statusLabel.classList.add('danger');

    if (!Number.isFinite(r.months)) {
      els.headline.textContent = 'No break-even on these inputs';
      els.summary.textContent = 'Monthly revenue does not exceed monthly expenses, so the investment is not recovered.';
      els.outDate.textContent = '—';
      els.outMonths.textContent = '—';
    } else {
      els.headline.textContent = formatDate(r.breakEvenDate);
      els.summary.textContent = 'Estimated break-even in about ' + formatMonths(r.months) + ' months (based on monthly net profit).';
      els.outDate.textContent = formatDate(r.breakEvenDate);
      els.outMonths.textContent = formatMonths(r.months);
    }

    els.outNet.textContent = formatMoney(r.currency, r.net);
    if (r.net < 0) {
      els.outNet.classList.add('negative');
    } else {
      els.outNet.classList.remove('negative');
    }
    els.outStartup.textContent = formatMoney(r.currency, r.startupCost);
  }

  function summaryForAi(r) {
    return [
      'Startup cost: ' + formatMoney(r.currency, r.startupCost),
      'Monthly revenue: ' + formatMoney(r.currency, r.monthlyRevenue),
      'Monthly expenses: ' + formatMoney(r.currency, r.monthlyExpenses),
      'Monthly net profit: ' + formatMoney(r.currency, r.net),
      Number.isFinite(r.months) ? 'Months to break-even: ' + formatMonths(r.months) : 'Months to break-even: Not reached',
      Number.isFinite(r.months) ? 'Break-even date: ' + formatDate(r.breakEvenDate) : 'Break-even date: Not reached',
      'Risk level: ' + r.risk.label,
    ].join('\n');
  }

  function buildCopyText(r, aiText) {
    return [
      'AI Break-Even Date Predictor',
      'Startup cost: ' + formatMoney(r.currency, r.startupCost),
      'Monthly revenue: ' + formatMoney(r.currency, r.monthlyRevenue),
      'Monthly expenses: ' + formatMoney(r.currency, r.monthlyExpenses),
      'Monthly net profit: ' + formatMoney(r.currency, r.net),
      Number.isFinite(r.months) ? 'Months to break-even: ' + formatMonths(r.months) : 'Months to break-even: (not reached)',
      Number.isFinite(r.months) ? 'Break-even date: ' + formatDate(r.breakEvenDate) : 'Break-even date: (not reached)',
      'Risk level: ' + r.risk.label,
      '',
      'AI Risk Explanation:',
      aiText || '(AI unavailable)',
    ].join('\n');
  }

  function runAi(summary) {
    showAiState('loading');
    var prompt = buildPrompt(summary);
    return fetchWithTimeout(
      AI_ENDPOINT,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt }),
      },
      AI_FETCH_TIMEOUT_MS
    )
      .then(function (res) {
        if (!res.ok) throw new Error('AI request failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var t = safeTrim(extractAiText(data));
        if (!t) throw new Error('AI returned empty response.');
        showAiState('content', t);
        return t;
      })
      .catch(function () {
        showAiState('error', 'AI is unavailable right now. You can still use the local results above.');
        return '';
      });
  }

  function onCalc() {
    var r = compute();
    if (!r) return;
    updateUi(r);
    var sum = summaryForAi(r);
    runAi(sum).finally(function () {
      var aiText = safeTrim(els.aiText.textContent);
      lastCopyText = buildCopyText(r, aiText);
    });
  }

  function copyResult() {
    if (!lastCopyText) {
      setValidation('Run Predict Break-Even first, then copy.', true);
      return;
    }
    navigator.clipboard
      .writeText(lastCopyText)
      .then(function () {
        setValidation('Copied to clipboard.', false);
        setTimeout(function () {
          setValidation('', false);
        }, 1400);
      })
      .catch(function () {
        setValidation('Copy failed in this browser. Select and copy manually.', true);
      });
  }

  function resetAll() {
    els.currency.value = '$';
    els.startupCost.value = '';
    els.monthlyRevenue.value = '';
    els.monthlyExpenses.value = '';
    setValidation('', false);
    setHidden(els.resultsPanel, true);
    setHidden(els.metricsGrid, true);
    setHidden(els.aiLoading, true);
    setHidden(els.aiError, true);
    setHidden(els.aiContent, true);
    els.aiText.textContent = '';
    lastCopyText = '';
  }

  els.calcBtn.addEventListener('click', onCalc);
  els.copyBtn.addEventListener('click', copyResult);
  els.resetBtn.addEventListener('click', resetAll);

  resetAll();
})();

