/**
 * Shared UI for daily calorie / TDEE / maintenance / deficit landing pages.
 * Expects: <div id="nutrition-daily-root" data-mode="calorie|tdee|maintenance|deficit"></div>
 * and ../assets/nutrition-engine.js loaded first.
 */
(function () {
  var E = window.NutritionEngine;
  if (!E) return;

  function el(id) {
    return document.getElementById(id);
  }

  function readInputs() {
    var units = el('nut-units').value;
    var age = +el('nut-age').value;
    var male = el('nut-sex').value === 'm';
    var act = el('nut-activity').value;
    var goal = el('nut-goal').value;
    var kcalDelta = +el('nut-kcal-delta').value;
    var bf = el('nut-bf').value === '' ? null : +el('nut-bf').value;
    var wKg;
    var hCm;
    if (units === 'metric') {
      wKg = +el('nut-kg').value;
      hCm = +el('nut-cm').value;
    } else {
      wKg = E.lbsToKg(+el('nut-lbs').value);
      hCm = E.ftInToCm(+el('nut-ft').value, +el('nut-in').value);
    }
    return {
      units: units,
      age: age,
      male: male,
      weightKg: wKg,
      heightCm: hCm,
      activity: act,
      goal: goal,
      kcalDelta: kcalDelta,
      bodyFatPct: bf,
      targetKg: el('nut-target-kg').value === '' ? null : +el('nut-target-kg').value,
      goalDate: el('nut-goal-date').value || null
    };
  }

  function validate(inp) {
    if (!inp.age || inp.age < 15 || inp.age > 100) return 'Enter a realistic age (15–100).';
    if (!inp.weightKg || inp.weightKg < 30 || inp.weightKg > 300) return 'Check weight.';
    if (!inp.heightCm || inp.heightCm < 120 || inp.heightCm > 230) return 'Check height.';
    return null;
  }

  function render() {
    var errBox = el('nut-err');
    var out = el('nut-out');
    errBox.textContent = '';
    var inp = readInputs();
    var v = validate(inp);
    if (v) {
      errBox.textContent = v;
      out.innerHTML = '';
      return;
    }
    var rmrData = E.restingMetabolicRates(inp.age, inp.male, inp.weightKg, inp.heightCm, inp.bodyFatPct);
    var rmrPrimary = rmrData.mifflin;
    var tdeeM = E.tdee(rmrPrimary, inp.activity);
    var tdeeK = rmrData.katch != null ? E.tdee(rmrData.katch, inp.activity) : null;
    var goalUse = inp.goal;
    var mode = (document.getElementById('nutrition-daily-root') || {}).dataset.mode || 'calorie';
    if (mode === 'maintenance') goalUse = 'maintain';
    if (mode === 'deficit') goalUse = 'lose';
    var adj = E.goalTargetCalories(tdeeM, goalUse, inp.kcalDelta);
    var plan = null;
    if (inp.targetKg != null && inp.goalDate && inp.targetKg < inp.weightKg) {
      plan = E.goalDateAverageDeficit(inp.weightKg, inp.targetKg, inp.goalDate);
    }

    var html = '';
    html += '<div class="grid gap-3 sm:grid-cols-2">';
    html += '<div class="rounded-lg border border-white/10 bg-vendora-bg/50 p-3"><p class="text-xs text-vendora-muted">RMR (Mifflin–St Jeor)</p><p class="text-xl font-bold text-vendora-text">~' + Math.round(rmrPrimary) + ' <span class="text-sm font-medium text-vendora-muted">kcal/day</span></p></div>';
    if (tdeeK != null) {
      html += '<div class="rounded-lg border border-white/10 bg-vendora-bg/50 p-3"><p class="text-xs text-vendora-muted">TDEE using Katch–McArdle RMR</p><p class="text-xl font-bold text-vendora-text">~' + Math.round(tdeeK) + ' <span class="text-sm font-medium text-vendora-muted">kcal/day</span></p><p class="text-xs text-vendora-muted mt-1">Shown when body fat % is entered; compare to Mifflin-based TDEE.</p></div>';
    }
    html += '</div>';

    html += '<div class="mt-4 rounded-lg border border-white/10 bg-vendora-bg/50 p-4">';
    html += '<p class="text-xs text-vendora-muted mb-1">TDEE (Mifflin RMR × activity)</p>';
    html += '<p class="text-2xl font-bold text-vendora-brand">~' + Math.round(tdeeM) + ' <span class="text-base font-medium text-vendora-muted">kcal/day</span></p>';
    html += '<p class="text-xs text-vendora-muted mt-2">Activity factor ' + (E.ACT[inp.activity] || '') + ' — estimate only, not a lab measurement.</p>';
    html += '</div>';

    if (mode !== 'tdee') {
      html += '<div class="mt-4 rounded-lg border border-vendora-brand/30 bg-vendora-brand/10 p-4">';
      html += '<p class="text-xs text-vendora-muted mb-1">Suggested intake (this goal)</p>';
      html += '<p class="text-2xl font-bold text-vendora-text">~' + Math.round(adj.target) + ' <span class="text-base font-medium text-vendora-muted">kcal/day</span></p>';
      if (adj.delta !== 0) {
        html += '<p class="text-sm text-vendora-muted mt-1">Adjustment vs TDEE: ' + (adj.delta > 0 ? '+' : '') + Math.round(adj.delta) + ' kcal/day.</p>';
      }
      html += '</div>';
    }

    if (plan && plan.dailyDeficit > 0) {
      html += '<div class="mt-4 rounded-lg border border-white/10 p-4">';
      html += '<p class="text-sm font-semibold text-vendora-text">Goal-date planning (heuristic)</p>';
      html += '<p class="text-xs text-vendora-muted mt-1">Average daily deficit implied by your target weight and date: <strong class="text-vendora-text">~' + Math.round(plan.dailyDeficit) + ' kcal</strong> (rough range ' + Math.round(plan.dailyLow) + '–' + Math.round(plan.dailyHigh) + ').</p>';
      html += '<p class="text-xs text-vendora-muted mt-2">This smooth average is <strong>not</strong> the NIH Body Weight Planner dynamic model. Use it as a starting point and adjust using real-world weight trends.</p>';
      html += '</div>';
    }

    out.innerHTML = html;
  }

  function toggleGoalRows() {
    var mode = (document.getElementById('nutrition-daily-root') || {}).dataset.mode || 'calorie';
    var goalRow = el('nut-goal-row');
    var deltaRow = el('nut-delta-row');
    var planRow = el('nut-plan-row');
    if (mode === 'tdee') {
      goalRow.style.display = 'none';
      deltaRow.style.display = 'none';
      planRow.style.display = 'none';
      return;
    }
    if (mode === 'maintenance') {
      goalRow.style.display = 'none';
      deltaRow.style.display = 'none';
    } else {
      goalRow.style.display = '';
      var g = el('nut-goal').value;
      deltaRow.style.display = g === 'maintain' ? 'none' : '';
    }
    planRow.style.display = mode === 'deficit' || mode === 'calorie' ? '' : 'none';
  }

  function mount() {
    var root = document.getElementById('nutrition-daily-root');
    if (!root) return;
    var mode = root.dataset.mode || 'calorie';

    root.innerHTML =
      '<div class="grid gap-4">' +
      '<label class="block"><span class="text-sm font-medium">Units</span><select id="nut-units" class="mt-1 border rounded px-3 py-2 nut-select">' +
      '<option value="metric" selected>Metric (kg, cm)</option><option value="imperial">Imperial (lb, ft/in)</option></select></label>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="nut-body-metric">' +
      '<label class="block"><span class="text-sm font-medium">Weight (kg)</span><input type="number" id="nut-kg" class="mt-1 w-full border rounded px-3 py-2" step="0.1" value="78"></label>' +
      '<label class="block"><span class="text-sm font-medium">Height (cm)</span><input type="number" id="nut-cm" class="mt-1 w-full border rounded px-3 py-2" step="0.1" value="178"></label>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 hidden" id="nut-body-imperial">' +
      '<label class="block"><span class="text-sm font-medium">Weight (lb)</span><input type="number" id="nut-lbs" class="mt-1 w-full border rounded px-3 py-2" step="0.1" value="172"></label>' +
      '<div class="grid grid-cols-2 gap-2"><label class="block"><span class="text-sm font-medium">Height (ft)</span><input type="number" id="nut-ft" class="mt-1 w-full border rounded px-3 py-2" value="5"></label>' +
      '<label class="block"><span class="text-sm font-medium">Height (in)</span><input type="number" id="nut-in" class="mt-1 w-full border rounded px-3 py-2" value="10"></label></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<label class="block"><span class="text-sm font-medium">Age</span><input type="number" id="nut-age" class="mt-1 w-full border rounded px-3 py-2" min="15" max="100" value="32"></label>' +
      '<label class="block"><span class="text-sm font-medium">Sex (for equation)</span><select id="nut-sex" class="mt-1 border rounded px-3 py-2 nut-select"><option value="m" selected>Male</option><option value="f">Female</option></select></label>' +
      '</div>' +
      '<label class="block"><span class="text-sm font-medium">Activity</span><select id="nut-activity" class="mt-1 border rounded px-3 py-2 nut-select">' +
      '<option value="sedentary">Sedentary (1.2)</option><option value="light">Light (1.375)</option><option value="moderate" selected>Moderate (1.55)</option><option value="active">Active (1.725)</option><option value="extra">Very active (1.9)</option></select></label>' +
      '<label class="block"><span class="text-sm font-medium">Body fat % (optional)</span><input type="number" id="nut-bf" class="mt-1 w-full border rounded px-3 py-2" step="0.1" min="3" max="55" placeholder="e.g. 18"></label>' +
      '<div id="nut-goal-row">' +
      '<label class="block"><span class="text-sm font-medium">Goal</span><select id="nut-goal" class="mt-1 border rounded px-3 py-2 nut-select">' +
      '<option value="maintain">Maintain weight</option><option value="lose" selected>Lose fat</option><option value="gain">Gain muscle / slow bulk</option></select></label>' +
      '</div>' +
      '<div id="nut-delta-row"><label class="block"><span class="text-sm font-medium">Target deficit or surplus (kcal/day)</span><input type="number" id="nut-kcal-delta" class="mt-1 w-full border rounded px-3 py-2" min="0" max="1500" value="500"></label></div>' +
      '<div id="nut-plan-row" class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<label class="block"><span class="text-sm font-medium">Goal weight (kg, optional)</span><input type="number" id="nut-target-kg" class="mt-1 w-full border rounded px-3 py-2" step="0.1" placeholder="e.g. 72"></label>' +
      '<label class="block"><span class="text-sm font-medium">Goal date</span><input type="date" id="nut-goal-date" class="mt-1 w-full border rounded px-3 py-2"></label>' +
      '</div>' +
      '<p id="nut-err" class="text-sm text-red-300"></p>' +
      '<button type="button" id="nut-go" class="bg-vendora-brand text-vendora-ink px-4 py-2 rounded font-semibold shadow-sm hover:bg-vendora-brand-dark">Calculate</button>' +
      '<button type="button" id="nut-reset" class="border border-white/20 px-4 py-2 rounded font-semibold text-vendora-muted hover:bg-vendora-panel">Reset</button>' +
      '<div id="nut-out" class="mt-2" role="status" aria-live="polite"></div>' +
      '</div>';

    if (mode === 'maintenance') {
      el('nut-goal').value = 'maintain';
    }
    if (mode === 'deficit') {
      el('nut-goal').value = 'lose';
      el('nut-kcal-delta').value = '500';
    }

    el('nut-units').addEventListener('change', function () {
      var m = el('nut-body-metric');
      var i = el('nut-body-imperial');
      if (el('nut-units').value === 'metric') {
        m.classList.remove('hidden');
        i.classList.add('hidden');
      } else {
        m.classList.add('hidden');
        i.classList.remove('hidden');
      }
      render();
    });
    el('nut-goal').addEventListener('change', function () {
      toggleGoalRows();
      render();
    });
    ['nut-age', 'nut-sex', 'nut-activity', 'nut-bf', 'nut-kg', 'nut-cm', 'nut-lbs', 'nut-ft', 'nut-in', 'nut-kcal-delta', 'nut-target-kg', 'nut-goal-date'].forEach(function (id) {
      var node = el(id);
      if (node) node.addEventListener('input', render);
    });
    el('nut-go').addEventListener('click', render);
    el('nut-reset').addEventListener('click', function () {
      el('nut-units').value = 'metric';
      el('nut-kg').value = '78';
      el('nut-cm').value = '178';
      el('nut-age').value = '32';
      el('nut-sex').value = 'm';
      el('nut-activity').value = 'moderate';
      el('nut-bf').value = '';
      el('nut-goal').value = mode === 'maintenance' ? 'maintain' : mode === 'deficit' ? 'lose' : 'lose';
      el('nut-kcal-delta').value = mode === 'deficit' ? '500' : '500';
      el('nut-target-kg').value = '';
      el('nut-goal-date').value = '';
      el('nut-body-metric').classList.remove('hidden');
      el('nut-body-imperial').classList.add('hidden');
      toggleGoalRows();
      render();
    });

    toggleGoalRows();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
