(function () {
  'use strict';

  var AI_ENDPOINT = 'https://ai-core.huss3in999.workers.dev/text';
  var AI_FETCH_TIMEOUT_MS = 28000;

  var els = {
    seriesType: document.getElementById('seriesType'),
    currency: document.getElementById('currency'),
    salesValues: document.getElementById('salesValues'),
    validationMessage: document.getElementById('validationMessage'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    resetBtn: document.getElementById('resetBtn'),
    copyBtn: document.getElementById('copyBtn'),

    resultsPanel: document.getElementById('resultsPanel'),
    metricsGrid: document.getElementById('metricsGrid'),

    trendLabel: document.getElementById('trendLabel'),
    trendHeadline: document.getElementById('trendHeadline'),
    trendSummary: document.getElementById('trendSummary'),

    outDirection: document.getElementById('outDirection'),
    outGrowthRate: document.getElementById('outGrowthRate'),
    outAvg: document.getElementById('outAvg'),
    outVolatility: document.getElementById('outVolatility'),

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

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function safeTrim(s) {
    return String(s == null ? '' : s).trim();
  }

  function parseSeries(text) {
    var raw = safeTrim(text);
    if (!raw) return [];
    var lines = raw.split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = safeTrim(lines[i]);
      if (!line) continue;
      var n = parseFloat(line.replace(/,/g, ''));
      if (Number.isNaN(n)) return null;
      if (n < 0) return null;
      out.push(n);
    }
    return out;
  }

  function mean(xs) {
    if (!xs.length) return 0;
    var s = 0;
    for (var i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  function stdev(xs) {
    if (xs.length < 2) return 0;
    var m = mean(xs);
    var s2 = 0;
    for (var i = 0; i < xs.length; i++) {
      var d = xs[i] - m;
      s2 += d * d;
    }
    return Math.sqrt(s2 / (xs.length - 1));
  }

  function linearRegressionSlope(xs) {
    // x = 0..n-1, y = xs[i]
    var n = xs.length;
    if (n < 2) return 0;
    var sumX = 0;
    var sumY = 0;
    var sumXY = 0;
    var sumXX = 0;
    for (var i = 0; i < n; i++) {
      var x = i;
      var y = xs[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    var denom = n * sumXX - sumX * sumX;
    if (denom === 0) return 0;
    return (n * sumXY - sumX * sumY) / denom;
  }

  function formatMoney(symbol, n) {
    var s = safeTrim(symbol) || '$';
    return s + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function formatPct(n) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  function setValidation(msg, isError) {
    els.validationMessage.textContent = msg || '';
    els.validationMessage.style.display = msg ? 'block' : 'none';
    els.validationMessage.style.color = isError ? '#fecaca' : '';
  }

  function classifyDirection(slope, avg) {
    // Normalize slope by average to keep thresholds stable.
    var denom = avg > 0 ? avg : 1;
    var rel = slope / denom;
    if (rel > 0.01) return 'Upward';
    if (rel < -0.01) return 'Downward';
    return 'Flat';
  }

  function riskLevel(direction, growthPct, cv) {
    if (direction === 'Downward' && growthPct <= -5) return 'danger';
    if (direction === 'Downward' || cv >= 0.35) return 'warning';
    return 'ok';
  }

  function buildPrompt(summary) {
    return (
      'You are a small business sales analyst. Do not calculate numbers. Use only the summary below.\n' +
      'Write short, practical recommendations.\n\n' +
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

  function buildCopyText(result) {
    return [
      'AI Sales Trend Analyzer',
      'Series type: ' + result.seriesType,
      'Values count: ' + result.count,
      'Trend direction: ' + result.direction,
      'Growth rate: ' + result.growthRateLabel,
      'Average sales: ' + result.avgLabel,
      'Volatility (CV): ' + result.cvLabel,
      '',
      'AI Insight:',
      result.aiText || '(AI unavailable)',
    ].join('\n');
  }

  function updateUi(result) {
    setHidden(els.resultsPanel, false);
    setHidden(els.metricsGrid, false);

    var labelText = result.labelText;
    els.trendLabel.textContent = labelText;
    els.trendLabel.classList.remove('warning', 'danger');
    if (result.riskClass === 'warning') els.trendLabel.classList.add('warning');
    if (result.riskClass === 'danger') els.trendLabel.classList.add('danger');

    els.trendHeadline.textContent = result.headline;
    els.trendSummary.textContent = result.summary;

    els.outDirection.textContent = result.direction;
    els.outGrowthRate.textContent = result.growthRateLabel;
    els.outAvg.textContent = result.avgLabel;
    els.outVolatility.textContent = result.cvLabel;
  }

  function analyzeLocal() {
    setValidation('', false);

    var seriesType = els.seriesType.value === 'weekly' ? 'Weekly' : 'Daily';
    var currency = safeTrim(els.currency.value) || '$';

    var xs = parseSeries(els.salesValues.value);
    if (xs == null) {
      setValidation('Sales values must be valid non-negative numbers (one per line).', true);
      return null;
    }
    if (xs.length < 2) {
      setValidation('Enter at least 2 values (one per line).', true);
      return null;
    }

    var avg = mean(xs);
    var sd = stdev(xs);
    var cv = avg > 0 ? sd / avg : 0;
    var slope = linearRegressionSlope(xs);
    var direction = classifyDirection(slope, avg);

    var first = xs[0];
    var last = xs[xs.length - 1];
    var growthPct = first > 0 ? ((last - first) / first) * 100 : last > 0 ? 100 : 0;

    // Guard extreme percentages when first is tiny.
    growthPct = clamp(growthPct, -999, 999);

    var riskClass = riskLevel(direction, growthPct, cv);
    var labelText = riskClass === 'danger' ? 'High risk' : riskClass === 'warning' ? 'Watch' : 'Healthy';
    var headline = direction + ' trend';

    var summary =
      seriesType +
      ' series with ' +
      xs.length +
      ' points. Growth ' +
      formatPct(growthPct) +
      ', volatility ' +
      cv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      ' CV.';

    return {
      seriesType: seriesType,
      currency: currency,
      count: xs.length,
      direction: direction,
      growthPct: growthPct,
      cv: cv,
      avg: avg,
      slope: slope,
      riskClass: riskClass,
      labelText: labelText,
      headline: headline,
      summary: summary,
      growthRateLabel: formatPct(growthPct),
      avgLabel: formatMoney(currency, avg),
      cvLabel: cv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  }

  function buildSummaryForAi(local) {
    return [
      'Series type: ' + local.seriesType,
      'Points: ' + local.count,
      'Trend direction: ' + local.direction,
      'Growth rate (first to last): ' + local.growthRateLabel,
      'Average sales: ' + local.avgLabel,
      'Volatility (CV): ' + local.cvLabel,
    ].join('\n');
  }

  function copyResult() {
    if (!lastCopyText) {
      setValidation('Run Analyze first, then copy.', true);
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
    els.seriesType.value = 'daily';
    els.currency.value = '$';
    els.salesValues.value = '';
    setValidation('', false);
    setHidden(els.resultsPanel, true);
    setHidden(els.metricsGrid, true);
    showAiState('content', '');
    setHidden(els.aiContent, true);
    lastCopyText = '';
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

  function onAnalyze() {
    var local = analyzeLocal();
    if (!local) return;
    updateUi(local);

    var summary = buildSummaryForAi(local);
    runAi(summary).finally(function () {
      var aiText = safeTrim(els.aiText.textContent);
      lastCopyText = buildCopyText({ 
        seriesType: local.seriesType,
        count: local.count,
        direction: local.direction,
        growthRateLabel: local.growthRateLabel,
        avgLabel: local.avgLabel,
        cvLabel: local.cvLabel,
        aiText: aiText
      });
    });
  }

  els.analyzeBtn.addEventListener('click', onAnalyze);
  els.copyBtn.addEventListener('click', copyResult);
  els.resetBtn.addEventListener('click', resetAll);

  resetAll();
})();

