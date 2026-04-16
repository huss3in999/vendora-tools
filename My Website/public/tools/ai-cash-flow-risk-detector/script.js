(function () {
  'use strict';

  var AI_ENDPOINT = 'https://ai-core.huss3in999.workers.dev/text';
  var AI_FETCH_TIMEOUT_MS = 28000;

  var els = {
    currency: document.getElementById('currency'),
    currentCash: document.getElementById('currentCash'),
    monthlyIncome: document.getElementById('monthlyIncome'),
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

    outMonths: document.getElementById('outMonths'),
    outDate: document.getElementById('outDate'),
    outBurn: document.getElementById('outBurn'),
    outCash: document.getElementById('outCash'),

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
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function riskFromRunwayMonths(months) {
    if (!Number.isFinite(months)) return { label: 'Low risk', cls: 'ok' };
    if (months < 2) return { label: 'High risk', cls: 'danger' };
    if (months < 6) return { label: 'Medium risk', cls: 'warning' };
    return { label: 'Low risk', cls: 'ok' };
  }

  function buildPrompt(summary) {
    return (
      'You are a small business cash flow advisor. Do not calculate numbers. Use only the summary below.\n' +
      'Provide a short warning level and practical next steps.\n\n' +
      'Summary:\n' +
      summary +
      '\n\n' +
      'Reply in plain text only. Use exactly this format (no JSON, no markdown):\n' +
      'SUMMARY: [one sentence]\n' +
      'RISK: [low/medium/high + short reason]\n' +
      'NEXT1: [one action]\n' +
      'NEXT2: [one action]\n' +
      'NEXT3: [one action]\n\n' +
      'Keep total under 90 words.'
    );
  }

  function compute() {
    setValidation('', false);

    var currency = safeTrim(els.currency.value) || '$';
    var cash = parseNonNegative(els.currentCash.value);
    var income = parseNonNegative(els.monthlyIncome.value);
    var expenses = parseNonNegative(els.monthlyExpenses.value);

    if (els.currentCash.value === '' || els.monthlyIncome.value === '' || els.monthlyExpenses.value === '') {
      setValidation('Enter current cash, monthly income, and monthly expenses.', true);
      return null;
    }
    if (Number.isNaN(cash) || Number.isNaN(income) || Number.isNaN(expenses)) {
      setValidation('All fields must be valid non-negative numbers.', true);
      return null;
    }

    var burn = expenses - income;
    if (burn <= 0) {
      return {
        currency: currency,
        cash: cash,
        income: income,
        expenses: expenses,
        burn: burn,
        months: Infinity,
        runwayDate: null,
        risk: riskFromRunwayMonths(Infinity),
      };
    }

    var months = cash / burn;
    var days = months * 30.437;
    var date = addDays(new Date(), days);
    return {
      currency: currency,
      cash: cash,
      income: income,
      expenses: expenses,
      burn: burn,
      months: months,
      runwayDate: date,
      risk: riskFromRunwayMonths(months),
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
      els.headline.textContent = 'Not burning cash (on these inputs)';
      els.summary.textContent = 'Monthly income covers monthly expenses, so cash is not running out under this scenario.';
      els.outMonths.textContent = '—';
      els.outDate.textContent = '—';
    } else {
      els.headline.textContent = 'Runway: ' + formatMonths(r.months) + ' months';
      els.summary.textContent = 'Estimated runway end date is ' + formatDate(r.runwayDate) + ' (based on monthly burn).';
      els.outMonths.textContent = formatMonths(r.months);
      els.outDate.textContent = formatDate(r.runwayDate);
    }

    els.outBurn.textContent = formatMoney(r.currency, r.burn);
    if (r.burn > 0 && r.risk.cls !== 'ok') els.outBurn.classList.add('warning');
    else els.outBurn.classList.remove('warning');

    els.outCash.textContent = formatMoney(r.currency, r.cash);
  }

  function summaryForAi(r) {
    return [
      'Current cash: ' + formatMoney(r.currency, r.cash),
      'Monthly income: ' + formatMoney(r.currency, r.income),
      'Monthly expenses: ' + formatMoney(r.currency, r.expenses),
      'Monthly burn (expenses - income): ' + formatMoney(r.currency, r.burn),
      Number.isFinite(r.months) ? 'Months until cash runs out: ' + formatMonths(r.months) : 'Months until cash runs out: Not running out',
      Number.isFinite(r.months) ? 'Runway end date: ' + formatDate(r.runwayDate) : 'Runway end date: Not applicable',
      'Risk level: ' + r.risk.label,
    ].join('\n');
  }

  function buildCopyText(r, aiText) {
    return [
      'AI Cash Flow Risk Detector',
      'Current cash: ' + formatMoney(r.currency, r.cash),
      'Monthly income: ' + formatMoney(r.currency, r.income),
      'Monthly expenses: ' + formatMoney(r.currency, r.expenses),
      'Monthly burn: ' + formatMoney(r.currency, r.burn),
      Number.isFinite(r.months) ? 'Months until cash runs out: ' + formatMonths(r.months) : 'Months until cash runs out: (not running out)',
      Number.isFinite(r.months) ? 'Runway end date: ' + formatDate(r.runwayDate) : 'Runway end date: (not applicable)',
      'Risk level: ' + r.risk.label,
      '',
      'AI Risk Warning:',
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
      setValidation('Run Detect Risk first, then copy.', true);
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
    els.currentCash.value = '';
    els.monthlyIncome.value = '';
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

