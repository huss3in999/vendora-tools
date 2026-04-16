(function () {
  'use strict';

  var AI_ENDPOINT = 'https://ai-core.huss3in999.workers.dev/text';
  var AI_FETCH_TIMEOUT_MS = 28000;

  var els = {
    currency: document.getElementById('currency'),
    revenue: document.getElementById('revenue'),
    serviceCost: document.getElementById('serviceCost'),
    deliveryCost: document.getElementById('deliveryCost'),
    timeHours: document.getElementById('timeHours'),
    hourlyValue: document.getElementById('hourlyValue'),
    validationMessage: document.getElementById('validationMessage'),
    calcBtn: document.getElementById('calcBtn'),
    resetBtn: document.getElementById('resetBtn'),
    copyBtn: document.getElementById('copyBtn'),

    resultsPanel: document.getElementById('resultsPanel'),
    metricsGrid: document.getElementById('metricsGrid'),
    statusLabel: document.getElementById('statusLabel'),
    profitHeadline: document.getElementById('profitHeadline'),
    profitSummary: document.getElementById('profitSummary'),

    outProfitNoTime: document.getElementById('outProfitNoTime'),
    outProfitWithTime: document.getElementById('outProfitWithTime'),
    outDirectCosts: document.getElementById('outDirectCosts'),
    outTimeCost: document.getElementById('outTimeCost'),

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

  function parseNonNegative(raw, allowBlank) {
    if (raw === '' || raw === null || raw === undefined) return allowBlank ? null : 0;
    var n = parseFloat(String(raw).replace(/,/g, ''));
    if (Number.isNaN(n)) return NaN;
    if (n < 0) return NaN;
    return n;
  }

  function formatMoney(symbol, n) {
    var s = safeTrim(symbol) || '$';
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    return sign + s + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  function buildPrompt(summary) {
    return (
      'You are a small business profitability advisor. Do not calculate numbers. Use only the summary below.\n' +
      'Give short actions to improve customer profitability.\n\n' +
      'Summary:\n' +
      summary +
      '\n\n' +
      'Reply in plain text only. Use exactly this format (no JSON, no markdown):\n' +
      'SUMMARY: [one sentence]\n' +
      'ACTION1: [one action]\n' +
      'ACTION2: [one action]\n' +
      'ACTION3: [one action]\n\n' +
      'Keep total under 90 words.'
    );
  }

  function compute() {
    setValidation('', false);

    var currency = safeTrim(els.currency.value) || '$';
    var revenue = parseNonNegative(els.revenue.value, false);
    var serviceCost = parseNonNegative(els.serviceCost.value, false);
    var deliveryCost = parseNonNegative(els.deliveryCost.value, false);
    var timeHours = parseNonNegative(els.timeHours.value, true);
    var hourlyValue = parseNonNegative(els.hourlyValue.value, true);

    if (els.revenue.value === '') {
      setValidation('Enter revenue.', true);
      return null;
    }
    if (Number.isNaN(revenue) || Number.isNaN(serviceCost) || Number.isNaN(deliveryCost) || Number.isNaN(timeHours) || Number.isNaN(hourlyValue)) {
      setValidation('All fields must be valid non-negative numbers (leave optional fields blank).', true);
      return null;
    }

    var directCosts = serviceCost + deliveryCost;
    var profitNoTime = revenue - directCosts;

    var timeCost = 0;
    var usedTimeCost = false;
    if (timeHours != null && hourlyValue != null) {
      timeCost = timeHours * hourlyValue;
      usedTimeCost = true;
    }
    var profitWithTime = usedTimeCost ? profitNoTime - timeCost : profitNoTime;

    var status = 'Healthy';
    var riskClass = 'ok';
    if (profitNoTime < 0 || profitWithTime < 0) {
      status = 'Unprofitable';
      riskClass = 'danger';
    } else if (usedTimeCost && profitWithTime < revenue * 0.1) {
      status = 'Tight';
      riskClass = 'warning';
    }

    return {
      currency: currency,
      revenue: revenue,
      directCosts: directCosts,
      profitNoTime: profitNoTime,
      profitWithTime: profitWithTime,
      timeCost: timeCost,
      usedTimeCost: usedTimeCost,
      status: status,
      riskClass: riskClass,
    };
  }

  function updateUi(r) {
    setHidden(els.resultsPanel, false);
    setHidden(els.metricsGrid, false);

    els.statusLabel.textContent = r.status;
    els.statusLabel.classList.remove('warning', 'danger');
    if (r.riskClass === 'warning') els.statusLabel.classList.add('warning');
    if (r.riskClass === 'danger') els.statusLabel.classList.add('danger');

    els.profitHeadline.textContent = formatMoney(r.currency, r.profitWithTime);
    els.profitSummary.textContent = r.usedTimeCost
      ? 'Profit includes time cost (time hours × hourly value).'
      : 'Profit is calculated without time cost (add time hours + hourly value to include it).';

    els.outProfitNoTime.textContent = formatMoney(r.currency, r.profitNoTime);
    els.outProfitWithTime.textContent = formatMoney(r.currency, r.profitWithTime);
    els.outDirectCosts.textContent = formatMoney(r.currency, r.directCosts);
    els.outTimeCost.textContent = r.usedTimeCost ? formatMoney(r.currency, r.timeCost) : '—';

    // Styling for negative values
    [els.outProfitNoTime, els.outProfitWithTime].forEach(function (el) {
      el.classList.remove('negative', 'warning');
    });
    if (r.profitNoTime < 0) els.outProfitNoTime.classList.add('negative');
    if (r.profitWithTime < 0) els.outProfitWithTime.classList.add('negative');
    if (r.profitWithTime >= 0 && r.riskClass === 'warning') els.outProfitWithTime.classList.add('warning');
  }

  function summaryForAi(r) {
    return [
      'Revenue: ' + formatMoney(r.currency, r.revenue),
      'Direct costs (service + delivery): ' + formatMoney(r.currency, r.directCosts),
      'Profit (no time cost): ' + formatMoney(r.currency, r.profitNoTime),
      r.usedTimeCost ? 'Time cost used: ' + formatMoney(r.currency, r.timeCost) : 'Time cost used: No',
      'Profit (with time cost if available): ' + formatMoney(r.currency, r.profitWithTime),
      'Status: ' + r.status,
    ].join('\n');
  }

  function buildCopyText(r, aiText) {
    return [
      'AI Customer Profitability Calculator',
      'Revenue: ' + formatMoney(r.currency, r.revenue),
      'Direct costs: ' + formatMoney(r.currency, r.directCosts),
      'Profit (no time cost): ' + formatMoney(r.currency, r.profitNoTime),
      r.usedTimeCost ? 'Time cost: ' + formatMoney(r.currency, r.timeCost) : 'Time cost: (not included)',
      'Profit (with time cost): ' + formatMoney(r.currency, r.profitWithTime),
      'Status: ' + r.status,
      '',
      'AI Suggestions:',
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
      setValidation('Run Calculate first, then copy.', true);
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
    els.revenue.value = '';
    els.serviceCost.value = '';
    els.deliveryCost.value = '';
    els.timeHours.value = '';
    els.hourlyValue.value = '';
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

