(function () {
  'use strict';

  var AI_ENDPOINT = 'https://ai-core.huss3in999.workers.dev/text';
  /** Abort slow/hung requests so loading cannot run forever (browser fetch has no built-in timeout). */
  var AI_FETCH_TIMEOUT_MS = 28000;

  var els = {
    revenue: document.getElementById('revenue'),
    cogs: document.getElementById('cogs'),
    staff: document.getElementById('staff'),
    rent: document.getElementById('rent'),
    utilities: document.getElementById('utilities'),
    marketing: document.getElementById('marketing'),
    other: document.getElementById('other'),
    businessType: document.getElementById('businessType'),
    validationMessage: document.getElementById('validationMessage'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    resetBtn: document.getElementById('resetBtn'),
    copyBtn: document.getElementById('copyBtn'),
    resultsPanel: document.getElementById('resultsPanel'),
    outRevenue: document.getElementById('outRevenue'),
    outExpenses: document.getElementById('outExpenses'),
    outProfit: document.getElementById('outProfit'),
    outMargin: document.getElementById('outMargin'),
    outExpenseRatio: document.getElementById('outExpenseRatio'),
    warningsList: document.getElementById('warningsList'),
    warningsEmpty: document.getElementById('warningsEmpty'),
    aiLoading: document.getElementById('aiLoading'),
    aiError: document.getElementById('aiError'),
    aiContent: document.getElementById('aiContent'),
    aiSummary: document.getElementById('aiSummary'),
    aiActions: document.getElementById('aiActions'),
    statusBanner: document.getElementById('plfStatusBanner'),
    statusLabel: document.getElementById('plfStatusLabel'),
    statusScore: document.getElementById('plfStatusScore'),
    statusText: document.getElementById('plfStatusText'),
  };

  var lastCopyText = '';

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = !!hidden;
    // Extra safety: some environments/styles can make [hidden] feel inconsistent.
    el.style.display = hidden ? 'none' : '';
  }

  function parseNonNegative(raw) {
    if (raw === '' || raw === null || raw === undefined) return 0;
    var n = parseFloat(String(raw).replace(/,/g, ''));
    if (Number.isNaN(n)) return NaN;
    if (n < 0) return NaN;
    return n;
  }

  function formatMoney(n) {
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPct(n) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  function setValidation(msg, isError) {
    els.validationMessage.textContent = msg || '';
    els.validationMessage.style.color = isError ? '#fecaca' : '';
  }

  function getInputs() {
    var revenue = parseNonNegative(els.revenue.value);
    return {
      revenue: revenue,
      cogs: parseNonNegative(els.cogs.value),
      staff: parseNonNegative(els.staff.value),
      rent: parseNonNegative(els.rent.value),
      utilities: parseNonNegative(els.utilities.value),
      marketing: parseNonNegative(els.marketing.value),
      other: parseNonNegative(els.other.value),
      businessType: els.businessType.value || 'Not specified',
    };
  }

  function validate() {
    var revenue = parseNonNegative(els.revenue.value);
    if (els.revenue.value === '' || els.revenue.value === null) {
      return { ok: false, message: 'Enter monthly revenue.' };
    }
    if (Number.isNaN(revenue)) {
      return { ok: false, message: 'Monthly revenue must be a valid non-negative number.' };
    }
    if (revenue <= 0) {
      return { ok: false, message: 'Monthly revenue must be greater than zero.' };
    }
    var fields = ['cogs', 'staff', 'rent', 'utilities', 'marketing', 'other'];
    for (var i = 0; i < fields.length; i++) {
      var v = parseNonNegative(els[fields[i]].value);
      if (Number.isNaN(v)) {
        return { ok: false, message: 'All expense fields must be valid non-negative numbers (leave blank for zero).' };
      }
    }
    return { ok: true, message: '' };
  }

  function computeSnapshot(inp) {
    var totalExpenses = inp.cogs + inp.staff + inp.rent + inp.utilities + inp.marketing + inp.other;
    var profit = inp.revenue - totalExpenses;
    var marginPct = inp.revenue > 0 ? (profit / inp.revenue) * 100 : 0;
    var expenseRatioPct = inp.revenue > 0 ? (totalExpenses / inp.revenue) * 100 : 0;
    return {
      totalExpenses: totalExpenses,
      profit: profit,
      marginPct: marginPct,
      expenseRatioPct: expenseRatioPct,
    };
  }

  function ratioLabel(amount, revenue) {
    if (!revenue || revenue <= 0) return '0.0%';
    return formatPct((amount / revenue) * 100);
  }

  function detectWarnings(inp, snap) {
    var r = inp.revenue;
    var flags = [];

    function add(level, text) {
      flags.push({ level: level, text: text });
    }

    if (snap.profit < 0) {
      add('high', 'Expenses exceed revenue — you are losing money this month on these numbers.');
    } else if (snap.expenseRatioPct >= 95) {
      add('high', 'Expenses are very close to revenue (95%+ of revenue) — little room for shocks or errors.');
    }

    if (snap.marginPct < 5 && snap.profit >= 0) {
      add('high', 'Profit margin is very low (under 5%) — small drops in sales or cost spikes can erase profit.');
    }

    if (inp.staff / r > 0.35) {
      add('high', 'Staff cost is high relative to revenue (over 35%) — review scheduling, roles, and productivity.');
    }

    if (inp.rent / r > 0.10) {
      add('med', 'Rent is a large share of revenue (over 10%) — common target is often lower; check if sales can support this.');
    }

    if (inp.cogs / r > 0.38) {
      add('med', 'Product or COGS cost is high compared to revenue (over 38%) — pricing, waste, or supplier terms may need attention.');
    }

    if (r > 0 && inp.marketing / r < 0.02 && snap.totalExpenses > 0) {
      add('med', 'Marketing spend is very low vs revenue (under 2%) — growth may be limited if you rely on new customers.');
    }

    if (inp.marketing / r > 0.20) {
      add('med', 'Marketing is a large share of revenue (over 20%) — confirm ROI and trim underperforming channels.');
    }

    if (snap.marginPct < 0) {
      add('high', 'Negative profit margin — revenue does not cover listed costs.');
    }

    return flags;
  }

  function flagSummaryForPrompt(flags) {
    if (!flags.length) return 'None';
    return flags
      .map(function (f) {
        return f.text;
      })
      .join(' | ');
  }

  function buildPrompt(inp, snap, flags) {
    var breakdown =
      'Expense breakdown (% of revenue): ' +
      'COGS ' +
      ratioLabel(inp.cogs, inp.revenue) +
      ', Staff ' +
      ratioLabel(inp.staff, inp.revenue) +
      ', Rent ' +
      ratioLabel(inp.rent, inp.revenue) +
      ', Utilities ' +
      ratioLabel(inp.utilities, inp.revenue) +
      ', Marketing ' +
      ratioLabel(inp.marketing, inp.revenue) +
      ', Other ' +
      ratioLabel(inp.other, inp.revenue);

    return (
      'You are an experienced small business profit advisor. Do not recalculate or change numbers. Use only the facts below.\n' +
      'You may suggest pricing, packaging, upsells, minimum order, cost control, or scheduling changes when the ratios imply it.\n\n' +
      'Business type: ' +
      inp.businessType +
      '\n' +
      'Monthly revenue: ' +
      snap.revenueLabel +
      '\n' +
      'Total expenses: ' +
      snap.expensesLabel +
      '\n' +
      'Estimated profit: ' +
      snap.profitLabel +
      '\n' +
      'Profit margin %: ' +
      snap.marginLabel +
      '\n' +
      'Expense ratio %: ' +
      snap.expenseRatioLabel +
      '\n' +
      breakdown +
      '\n' +
      'Detected warnings: ' +
      flagSummaryForPrompt(flags) +
      '\n\n' +
      'Reply in plain text only. Use exactly this format (no JSON, no markdown):\n' +
      'SUMMARY: [one sentence on main profit leak areas]\n' +
      'ACTION1: [short practical action]\n' +
      'ACTION2: [short practical action]\n' +
      'ACTION3: [short practical action]\n\n' +
      'Keep total under 90 words. Simple business language. No fluff.'
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

  function buildFallbackAdvice(inp, snap, flags) {
    var actions = [];
    if (snap.profit < 0 || snap.expenseRatioPct >= 95) {
      actions.push('Cut or delay non-essential spending first, then fix the biggest monthly cost line.');
    }
    if (inp.staff / inp.revenue > 0.35) {
      actions.push('Review labor schedule and roles—high payroll share usually needs staffing or sales changes.');
    }
    if (inp.cogs / inp.revenue > 0.38) {
      actions.push('Tighten COGS: check waste, portions, and supplier pricing before changing customer prices.');
    }
    if (inp.rent / inp.revenue > 0.1) {
      actions.push('Pressure-test rent vs sales—negotiate, sublease, or plan revenue lift if rent is heavy.');
    }
    if (inp.marketing / inp.revenue > 0.2) {
      actions.push('Audit marketing ROI: pause low performers and keep one measurable acquisition channel.');
    }
    if (inp.marketing / inp.revenue < 0.02 && snap.totalExpenses > 0) {
      actions.push('If growth matters, test one small, trackable marketing experiment with a clear target.');
    }
    if (snap.marginPct < 5 && snap.profit >= 0) {
      actions.push('Protect thin margin: pick one price or cost lever to improve this month.');
    }
    var pad = [
      'Pick the highest-severity warning above and plan one concrete change this week.',
      'Re-check your biggest three expense lines against bank statements.',
      'Re-run this tool next month with updated figures to see if ratios improve.',
    ];
    var i = 0;
    while (actions.length < 3 && i < pad.length) {
      actions.push(pad[i]);
      i += 1;
    }
    return {
      summary:
        'Here are practical next steps based on your snapshot and warnings (local tips while AI is unavailable).',
      actions: actions.slice(0, 3),
      usedFallback: true,
    };
  }

  function parseAiPlainText(raw) {
    var summary = '';
    var actions = [];
    var sumM = raw.match(/SUMMARY:\s*(.+)/i);
    if (sumM) summary = sumM[1].trim();
    var a1 = raw.match(/ACTION1:\s*(.+)/i);
    var a2 = raw.match(/ACTION2:\s*(.+)/i);
    var a3 = raw.match(/ACTION3:\s*(.+)/i);
    if (a1) actions.push(a1[1].trim());
    if (a2) actions.push(a2[1].trim());
    if (a3) actions.push(a3[1].trim());
    if (!summary && !actions.length) {
      summary = raw.trim();
    }
    return { summary: summary, actions: actions };
  }

  function renderSnapshot(inp, snap) {
    els.outRevenue.textContent = formatMoney(inp.revenue);
    els.outExpenses.textContent = formatMoney(snap.totalExpenses);
    els.outProfit.textContent = formatMoney(snap.profit);
    els.outMargin.textContent = formatPct(snap.marginPct);
    els.outExpenseRatio.textContent = formatPct(snap.expenseRatioPct);
  }

  function renderStatus(snap) {
    if (!els.statusLabel || !els.statusText || !els.statusScore) return;
    var margin = snap && typeof snap.marginPct === 'number' ? snap.marginPct : null;
    if (margin == null) {
      els.statusLabel.textContent = 'Waiting';
      els.statusScore.textContent = '—';
      els.statusText.textContent =
        'Enter your monthly numbers and click Analyze Business to see your snapshot, warnings, and AI Profit Tips.';
      return;
    }

    var label = 'Review';
    var text =
      'Check the warnings and AI Profit Tips for the fastest next steps based on your expense mix.';

    if (margin < 0) {
      label = 'Critical';
      text = 'Your expenses are above revenue on these numbers. Start with immediate cost control and pricing review.';
    } else if (margin < 5) {
      label = 'At risk';
      text = 'Your margin is thin. Small changes can erase profit—prioritize the biggest cost drivers first.';
    } else if (margin < 12) {
      label = 'Tight';
      text = 'Your margin is positive but tight. Focus on one strong improvement this month (pricing, labor, or COGS).';
    } else {
      label = 'Healthy';
      text = 'Your margin looks healthy. Look for easy wins to protect it and keep growing efficiently.';
    }

    els.statusLabel.textContent = label;
    els.statusScore.textContent = formatPct(margin);
    els.statusText.textContent = text;
  }

  function renderWarnings(flags) {
    els.warningsList.innerHTML = '';
    if (!flags.length) {
      els.warningsEmpty.hidden = false;
      return;
    }
    els.warningsEmpty.hidden = true;
    for (var i = 0; i < flags.length; i++) {
      var li = document.createElement('li');
      li.textContent = flags[i].text;
      li.className = flags[i].level === 'high' ? 'plf-warn-high' : 'plf-warn-med';
      els.warningsList.appendChild(li);
    }
  }

  function renderAi(parsed) {
    els.aiSummary.textContent = parsed.summary || '';
    els.aiActions.innerHTML = '';
    for (var i = 0; i < parsed.actions.length; i++) {
      var li = document.createElement('li');
      li.textContent = parsed.actions[i];
      els.aiActions.appendChild(li);
    }
    if (!parsed.summary && !parsed.actions.length) {
      els.aiSummary.textContent = 'No structured AI reply. Please try again.';
    }
  }

  function showAiFallback(inp, snap, flags, shortReason) {
    els.aiError.textContent =
      shortReason || 'AI suggestions could not be loaded. Showing local next steps below.';
    setHidden(els.aiError, false);
    var fb = buildFallbackAdvice(inp, snap, flags);
    renderAi(fb);
    setHidden(els.aiContent, false);
  }

  function buildCopyText(inp, snap, flags, aiRaw) {
    var lines = [
      'AI Profit Leak Finder — Summary',
      'Business type: ' + inp.businessType,
      '',
      'Revenue: ' + formatMoney(inp.revenue),
      'Total expenses: ' + formatMoney(snap.totalExpenses),
      'Estimated profit: ' + formatMoney(snap.profit),
      'Profit margin %: ' + formatPct(snap.marginPct),
      'Expense ratio %: ' + formatPct(snap.expenseRatioPct),
      '',
      'Warnings:',
    ];
    if (!flags.length) lines.push('— None flagged');
    else for (var i = 0; i < flags.length; i++) lines.push('- ' + flags[i].text);
    lines.push('');
    lines.push('AI Profit Tips:');
    lines.push(aiRaw || '—');
    return lines.join('\n');
  }

  var state = {
    inp: null,
    snap: null,
    flags: null,
    aiRaw: '',
  };

  function setHasResults(enabled) {
    document.body.classList.toggle('plf-has-results', !!enabled);
  }

  async function runAnalysis() {
    setValidation('', false);
    var v = validate();
    if (!v.ok) {
      setValidation(v.message, true);
      return;
    }

    var inp = getInputs();
    var snap = computeSnapshot(inp);
    var snapLabels = {
      revenueLabel: formatMoney(inp.revenue),
      expensesLabel: formatMoney(snap.totalExpenses),
      profitLabel: formatMoney(snap.profit),
      marginLabel: formatPct(snap.marginPct),
      expenseRatioLabel: formatPct(snap.expenseRatioPct),
    };
    snap.revenueLabel = snapLabels.revenueLabel;
    snap.expensesLabel = snapLabels.expensesLabel;
    snap.profitLabel = snapLabels.profitLabel;
    snap.marginLabel = snapLabels.marginLabel;
    snap.expenseRatioLabel = snapLabels.expenseRatioLabel;

    var flags = detectWarnings(inp, snap);

    state.inp = inp;
    state.snap = snap;
    state.flags = flags;
    state.aiRaw = '';

    renderSnapshot(inp, snap);
    renderStatus(snap);
    renderWarnings(flags);
    setHidden(els.resultsPanel, false);
    setHasResults(true);

    setHidden(els.aiContent, true);
    setHidden(els.aiError, true);
    els.aiError.textContent = '';
    setHidden(els.aiLoading, false);
    els.analyzeBtn.disabled = true;

    var prompt = buildPrompt(inp, snap, flags);

    try {
      var res = await fetchWithTimeout(
        AI_ENDPOINT,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt }),
          credentials: 'omit',
        },
        AI_FETCH_TIMEOUT_MS
      );

      var text = await res.text();
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }

      if (!res.ok) {
        var errDetail = extractAiText(data) || text || 'Request failed';
        var shortHttp = 'Could not load AI tips (HTTP ' + res.status + '). Showing local next steps instead.';
        if (errDetail && String(errDetail).length < 120) {
          shortHttp += ' ' + errDetail;
        }
        showAiFallback(inp, snap, flags, shortHttp);
        lastCopyText = buildCopyText(inp, snap, flags, '[AI unavailable]');
        return;
      }

      var aiText = extractAiText(data);
      if (!aiText && typeof data === 'object') {
        aiText = text;
      }
      if (!aiText || !String(aiText).trim()) {
        showAiFallback(
          inp,
          snap,
          flags,
          'The AI returned an empty response. Showing local next steps instead.'
        );
        lastCopyText = buildCopyText(inp, snap, flags, '[AI unavailable]');
        return;
      }

      state.aiRaw = String(aiText).trim();
      var parsed = parseAiPlainText(state.aiRaw);
      lastCopyText = buildCopyText(inp, snap, flags, state.aiRaw);
      renderAi(parsed);
      setHidden(els.aiError, true);
      els.aiError.textContent = '';
      setHidden(els.aiContent, false);
    } catch (err) {
      var msg = 'Something went wrong while contacting the AI service. Showing local next steps instead.';
      if (err && err.name === 'AbortError') {
        msg =
          'The AI request timed out after ' +
          Math.round(AI_FETCH_TIMEOUT_MS / 1000) +
          's. Check your connection and try again.';
        console.warn('[plf] AI fetch aborted (timeout ' + AI_FETCH_TIMEOUT_MS + 'ms)');
      } else if (err && err.message) {
        msg = err.message + ' Showing local next steps instead.';
      }
      showAiFallback(inp, snap, flags, msg);
      lastCopyText = buildCopyText(inp, snap, flags, '[AI unavailable]');
    } finally {
      setHidden(els.aiLoading, true);
      els.analyzeBtn.disabled = false;
    }
  }

  function resetAll() {
    els.revenue.value = '';
    els.cogs.value = '';
    els.staff.value = '';
    els.rent.value = '';
    els.utilities.value = '';
    els.marketing.value = '';
    els.other.value = '';
    els.businessType.value = '';
    setValidation('', false);
    setHidden(els.resultsPanel, false);
    setHasResults(false);
    els.outRevenue.textContent = '—';
    els.outExpenses.textContent = '—';
    els.outProfit.textContent = '—';
    els.outMargin.textContent = '—';
    els.outExpenseRatio.textContent = '—';
    renderStatus(null);
    els.warningsList.innerHTML = '';
    els.warningsEmpty.hidden = true;
    setHidden(els.aiLoading, true);
    setHidden(els.aiError, true);
    setHidden(els.aiContent, true);
    lastCopyText = '';
    state.inp = null;
    state.snap = null;
    state.flags = null;
    state.aiRaw = '';
  }

  function copySummary() {
    if (!lastCopyText) {
      setValidation('Run Analyze Business first to copy a summary.', true);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastCopyText).then(
        function () {
          setValidation('Copied to clipboard.', false);
        },
        function () {
          setValidation('Could not copy. Select or try another browser.', true);
        }
      );
    } else {
      setValidation('Clipboard not available in this browser.', true);
    }
  }

  els.analyzeBtn.addEventListener('click', runAnalysis);
  els.resetBtn.addEventListener('click', resetAll);
  els.copyBtn.addEventListener('click', copySummary);
  setHasResults(false);
})();
