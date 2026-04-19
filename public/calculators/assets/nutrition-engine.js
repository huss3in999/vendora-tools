/**
 * Deterministic nutrition math for Vendora calculators (browser only).
 * References: Mifflin–St Jeor RMR; Katch–McArdle when body fat known;
 * common activity factors; macro kcal factors 4/4/9.
 */
(function (global) {
  var ACT = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extra: 1.9
  };

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function mifflinStJeor(age, male, weightKg, heightCm) {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + (male ? 5 : -161);
  }

  function katchMcArdle(leanKg) {
    return 370 + 21.6 * leanKg;
  }

  function leanMassKg(weightKg, bodyFatPct) {
    return weightKg * (1 - bodyFatPct / 100);
  }

  /**
   * Returns primary RMR (Mifflin) plus optional Katch line when body fat is usable.
   */
  function restingMetabolicRates(age, male, weightKg, heightCm, bodyFatPct) {
    var mif = mifflinStJeor(age, male, weightKg, heightCm);
    var out = {
      mifflin: mif,
      katch: null,
      leanKg: null
    };
    if (bodyFatPct != null && bodyFatPct > 2 && bodyFatPct < 60) {
      var lean = leanMassKg(weightKg, bodyFatPct);
      if (lean > 12) {
        out.leanKg = lean;
        out.katch = katchMcArdle(lean);
      }
    }
    return out;
  }

  function tdee(rmr, activityKey) {
    var m = ACT[activityKey] != null ? ACT[activityKey] : ACT.moderate;
    return rmr * m;
  }

  function goalTargetCalories(tdee, goal, kcalDelta) {
    var d = Math.abs(kcalDelta || 0);
    if (goal === 'maintain') return { target: tdee, delta: 0 };
    if (goal === 'lose') {
      var def = d > 0 ? d : 500;
      def = clamp(def, 200, 1500);
      return { target: tdee - def, delta: -def };
    }
    if (goal === 'gain') {
      var sur = d > 0 ? d : 300;
      sur = clamp(sur, 150, 1000);
      return { target: tdee + sur, delta: sur };
    }
    return { target: tdee, delta: 0 };
  }

  /**
   * Planning heuristic: total change (kg) * kcal per kg / days.
   * Not the NIH dynamic model — surfaced as an average starting deficit only.
   */
  function goalDateAverageDeficit(weightKg, targetKg, endDate) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    var ms = end - now;
    var days = Math.floor(ms / 86400000);
    var deltaKg = weightKg - targetKg;
    if (days < 14 || deltaKg <= 0.1) return null;
    var kcalPerKg = 7000;
    var daily = (deltaKg * kcalPerKg) / days;
    return {
      days: days,
      deltaKg: deltaKg,
      dailyDeficit: daily,
      dailyLow: (deltaKg * 5500) / days,
      dailyHigh: (deltaKg * 8500) / days
    };
  }

  function macroGramsFromPercent(targetKcal, pPct, cPct, fPct) {
    var s = pPct + cPct + fPct;
    if (s <= 0) return { proteinG: 0, carbG: 0, fatG: 0 };
    var kcalP = targetKcal * (pPct / s);
    var kcalC = targetKcal * (cPct / s);
    var kcalF = targetKcal * (fPct / s);
    return {
      proteinG: kcalP / 4,
      carbG: kcalC / 4,
      fatG: kcalF / 9
    };
  }

  /**
   * activityTier: sedentary | moderate | trained | athlete
   * goalKey: fat_loss | maintain | muscle
   */
  function proteinBands(weightKg, activityTier, goalKey) {
    var dri = 0.8 * weightKg;
    var low = dri;
    var high = dri;
    if (activityTier === 'moderate') high = Math.max(high, 1.4 * weightKg);
    if (activityTier === 'trained') high = Math.max(high, 1.7 * weightKg);
    if (activityTier === 'athlete') high = Math.max(high, 2 * weightKg);
    if (goalKey === 'muscle') high = Math.max(high, 1.6 * weightKg);
    if (goalKey === 'fat_loss') high = Math.max(high, 1.2 * weightKg);
    high = Math.min(high, 2.2 * weightKg);
    return { dri: dri, low: low, high: high };
  }

  global.NutritionEngine = {
    ACT: ACT,
    mifflinStJeor: mifflinStJeor,
    katchMcArdle: katchMcArdle,
    restingMetabolicRates: restingMetabolicRates,
    tdee: tdee,
    goalTargetCalories: goalTargetCalories,
    goalDateAverageDeficit: goalDateAverageDeficit,
    macroGramsFromPercent: macroGramsFromPercent,
    proteinBands: proteinBands,
    lbsToKg: function (lbs) { return lbs * 0.45359237; },
    ftInToCm: function (ft, inch) { return (ft * 12 + inch) * 2.54; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
