/**
 * 2026 paycheck estimate engine (gross-to-net).
 * Educational model — not tax advice; verify against IRS/state guidance and your payroll provider.
 */
(function (global) {
  var SS_WAGE_BASE_2026 = 184500;
  var SS_RATE = 0.062;
  var MED_RATE = 0.0145;
  var MED_ADD_RATE = 0.009;
  var MED_ADD_THRESHOLD_ANNUAL = 200000;
  var SUPPLEMENTAL_WITHHOLDING = 0.22;

  var STD_DED = { single: 16100, mfj: 32200, hoh: 24150 };

  /** Federal ordinary brackets (Tax Foundation / IRS RP 2025-32 style thresholds) */
  var FED_THRESH = {
    single: [12400, 50400, 105700, 201775, 256225, 640600, Infinity],
    mfj: [24800, 100800, 211400, 403550, 512450, 768700, Infinity],
    hoh: [17700, 67450, 105700, 201775, 256200, 640600, Infinity]
  };
  var FED_RATES = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];

  function periodsPerYear(freq) {
    var m = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, annual: 1 };
    return m[freq] != null ? m[freq] : 26;
  }

  function marginalFederal(taxableIncome, filing) {
    var th = FED_THRESH[filing] || FED_THRESH.single;
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < th.length; i++) {
      if (taxableIncome <= prev) break;
      var top = th[i];
      var slice = Math.min(taxableIncome, top) - prev;
      if (slice > 0) tax += slice * FED_RATES[i];
      prev = top;
    }
    return Math.max(0, tax);
  }

  function computeFicaAnnual(grossAnnual) {
    var ssWage = Math.min(Math.max(0, grossAnnual), SS_WAGE_BASE_2026);
    var ss = ssWage * SS_RATE;
    var med = grossAnnual * MED_RATE;
    var addMed = Math.max(0, grossAnnual - MED_ADD_THRESHOLD_ANNUAL) * MED_ADD_RATE;
    return {
      socialSecurity: ss,
      medicare: med,
      additionalMedicare: addMed,
      medicareTotal: med + addMed
    };
  }

  /** Simplified CA: graduated on taxable after CA-ish standard offset (not full FTB). */
  function caStateTaxAnnual(caTaxable) {
    var t = Math.max(0, caTaxable);
    var th = [10412, 24684, 38959, 54081, 68350, 349137, Infinity];
    var r = [0.01, 0.02, 0.04, 0.06, 0.08, 0.093, 0.103];
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < th.length; i++) {
      if (t <= prev) break;
      var top = th[i];
      var slice = Math.min(t, top) - prev;
      if (slice > 0) tax += slice * r[i];
      prev = top;
    }
    if (t > 349137) tax += (t - 349137) * 0.123;
    return tax;
  }

  function nyStateTaxAnnual(nyTaxable) {
    var t = Math.max(0, nyTaxable);
    var th = [8500, 11700, 13900, 80650, 215400, 1077550, Infinity];
    var r = [0.04, 0.045, 0.0525, 0.059, 0.0633, 0.0685, 0.0963];
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < th.length; i++) {
      if (t <= prev) break;
      var top = th[i];
      var slice = Math.min(t, top) - prev;
      if (slice > 0) tax += slice * r[i];
      prev = top;
    }
    return tax;
  }

  function mdStateTaxAnnual(mdTaxable) {
    var t = Math.max(0, mdTaxable);
    var th = [1000, 2000, 3000, 100000, 125000, 150000, 250000, Infinity];
    var r = [0.02, 0.03, 0.04, 0.0475, 0.05, 0.0525, 0.055, 0.0575];
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < th.length; i++) {
      if (t <= prev) break;
      var top = th[i];
      var slice = Math.min(t, top) - prev;
      if (slice > 0) tax += slice * r[i];
      prev = top;
    }
    return tax;
  }

  function ohStateTaxAnnual(ohTaxable) {
    var t = Math.max(0, ohTaxable);
    var th = [26050, 92150, 115300, 230450, Infinity];
    var r = [0.0, 0.02765, 0.03226, 0.03688, 0.0399];
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < th.length; i++) {
      if (t <= prev) break;
      var top = th[i];
      var slice = Math.min(t, top) - prev;
      if (slice > 0) tax += slice * r[i];
      prev = top;
    }
    return tax;
  }

  function compute(inputs) {
    var freq = inputs.payFrequency || "biweekly";
    var pp = periodsPerYear(freq);
    var gross = Math.max(0, Number(inputs.grossPay) || 0);
    var bonus = Math.max(0, Number(inputs.bonusPay) || 0);
    var pretaxPct = Math.max(0, Number(inputs.pretax401kPercent) || 0);
    var pretaxFix = Math.max(0, Number(inputs.pretax401kFixed) || 0);
    var pretax401k = Math.min(gross, gross * (pretaxPct / 100) + pretaxFix);
    var overtimeAmt = Math.max(0, Number(inputs.overtimeAmount) || 0);
    var noFedOnOT = !!inputs.noTaxOnOvertime;
    var filing = inputs.filingStatus || "single";
    var step2 = !!inputs.w4Step2MultipleJobs;
    var step3 = Math.max(0, Number(inputs.w4Step3) || 0);
    var step4a = Number(inputs.w4Step4a) || 0;
    var step4b = Math.max(0, Number(inputs.w4Step4b) || 0);
    var postTax = Math.max(0, Number(inputs.postTaxDeduction) || 0);
    var state = (inputs.state || "CA").toUpperCase();

    var std = STD_DED[filing] || STD_DED.single;
    if (step2) std = std * 0.5;

    var compPeriod = gross + bonus;
    var grossAnnual = compPeriod * pp;

    var fedTaxableWagesPeriod = Math.max(0, gross - pretax401k);
    if (noFedOnOT) fedTaxableWagesPeriod = Math.max(0, fedTaxableWagesPeriod - Math.min(overtimeAmt, gross));
    var fedTaxableAnnual = Math.max(0, fedTaxableWagesPeriod * pp + step4a - step4b);
    var federalTaxableAfterDed = Math.max(0, fedTaxableAnnual - std);
    var federalIncomeAnnual = marginalFederal(federalTaxableAfterDed, filing);
    federalIncomeAnnual = Math.max(0, federalIncomeAnnual - step3);
    var federalIncomePeriod = federalIncomeAnnual / pp;
    if (bonus > 0) federalIncomePeriod += bonus * SUPPLEMENTAL_WITHHOLDING;

    var ficaAnnual = computeFicaAnnual(grossAnnual);
    var ssPeriod = ficaAnnual.socialSecurity / pp;
    var medPeriod = ficaAnnual.medicareTotal / pp;

    var wagesStateAnnual = (gross - pretax401k) * pp + bonus * pp;
    var stateIncomePeriod = 0;
    var localIncomePeriod = 0;
    var sdiPeriod = 0;
    var pfmlPeriod = 0;
    var nySdiPeriod = 0;

    var nycRate = inputs.nycResident ? 0.03876 : 0;
    var yonkersRate = Math.max(0, Number(inputs.yonkersRate) || 0) / 100;
    var mdCountyRate = Math.max(0, Number(inputs.mdCountyRate) || 0) / 100;
    var paLocalEit = Math.max(0, Number(inputs.paLocalEit) || 0) / 100;
    var ohCityRate = Math.max(0, Number(inputs.ohCityRate) || 0) / 100;

    var NO_INCOME = ["AK", "FL", "NV", "SD", "TN", "TX", "WA", "WY", "NH"];

    if (NO_INCOME.indexOf(state) >= 0) {
      stateIncomePeriod = 0;
    } else if (state === "CA") {
      var caStd = filing === "mfj" ? 10726 : filing === "hoh" ? 10726 : 5363;
      var caTaxable = Math.max(0, wagesStateAnnual - caStd);
      stateIncomePeriod = caStateTaxAnnual(caTaxable) / pp;
      sdiPeriod = compPeriod * 0.013;
    } else if (state === "NY") {
      var nyStd = filing === "mfj" ? 16050 : 8000;
      var nyTaxable = Math.max(0, wagesStateAnnual - nyStd);
      stateIncomePeriod = nyStateTaxAnnual(nyTaxable) / pp;
      localIncomePeriod += compPeriod * nycRate;
      localIncomePeriod += compPeriod * yonkersRate;
      var pflAnnual = Math.min(411.91, wagesStateAnnual * 0.00432);
      pfmlPeriod = pflAnnual / pp;
      nySdiPeriod = 0.6 * (52 / pp);
    } else if (state === "MD") {
      var mdStd = filing === "mfj" ? 5150 : 2500;
      var mdTaxable = Math.max(0, wagesStateAnnual - mdStd);
      stateIncomePeriod = mdStateTaxAnnual(mdTaxable) / pp;
      localIncomePeriod += compPeriod * mdCountyRate;
    } else if (state === "PA") {
      stateIncomePeriod = compPeriod * 0.0307;
      localIncomePeriod += compPeriod * paLocalEit;
    } else if (state === "OH") {
      var ohStd = filing === "mfj" ? 5050 : 2525;
      var ohTaxable = Math.max(0, wagesStateAnnual - ohStd);
      stateIncomePeriod = ohStateTaxAnnual(ohTaxable) / pp;
      localIncomePeriod += compPeriod * ohCityRate;
    } else if (state === "IL") {
      stateIncomePeriod = compPeriod * 0.0495;
    } else if (state === "CO") {
      stateIncomePeriod = compPeriod * 0.044;
    } else if (state === "OR") {
      var orTaxable = Math.max(0, wagesStateAnnual * 0.9);
      stateIncomePeriod = compPeriod * 0.07;
      if (orTaxable > 10000) stateIncomePeriod = compPeriod * 0.0875;
      pfmlPeriod = compPeriod * 0.01 * 0.6;
    } else if (state === "WA") {
      stateIncomePeriod = 0;
      pfmlPeriod = compPeriod * 0.0113 * 0.7143;
    } else if (state === "MA") {
      stateIncomePeriod = compPeriod * 0.05;
      pfmlPeriod = Math.min(compPeriod * 0.0052, 500 / pp);
    } else if (state === "NJ") {
      stateIncomePeriod = compPeriod * 0.055;
    } else if (state === "DC") {
      stateIncomePeriod = compPeriod * 0.065;
    } else {
      stateIncomePeriod = compPeriod * 0.045;
    }

    var totalTaxPeriod =
      federalIncomePeriod +
      ssPeriod +
      medPeriod +
      stateIncomePeriod +
      localIncomePeriod +
      sdiPeriod +
      pfmlPeriod +
      nySdiPeriod;

    var netPeriod = gross + bonus - pretax401k - totalTaxPeriod - postTax;

    var lines = [];
    lines.push({ key: "gross", label: "Gross pay (this period)", amount: gross + bonus });
    lines.push({ key: "pretax401k", label: "Traditional 401(k) / pre-tax (est.)", amount: -pretax401k });
    if (noFedOnOT && overtimeAmt > 0) {
      lines.push({ key: "otExcl", label: "Excluded from federal income (overtime, model)", amount: 0, note: "Overtime excluded from federal taxable wages: " + overtimeAmt.toFixed(2) });
    }
    lines.push({ key: "fed", label: "Federal income tax (incl. bonus supplemental if any)", amount: -federalIncomePeriod });
    lines.push({ key: "ss", label: "Social Security (6.2% up to wage base)", amount: -ssPeriod });
    lines.push({ key: "med", label: "Medicare + Additional Medicare (if applicable)", amount: -medPeriod });
    lines.push({ key: "state", label: "State income tax (estimate)", amount: -stateIncomePeriod });
    if (localIncomePeriod > 0) {
      lines.push({ key: "local", label: "Local / city / county (estimate)", amount: -localIncomePeriod });
    }
    if (sdiPeriod > 0) lines.push({ key: "sdi", label: "State disability (SDI)", amount: -sdiPeriod });
    if (pfmlPeriod > 0) lines.push({ key: "pfml", label: "Paid family / medical leave (employee share)", amount: -pfmlPeriod });
    if (nySdiPeriod > 0) lines.push({ key: "nysdi", label: "NY SDI (weekly cap model)", amount: -nySdiPeriod });
    lines.push({ key: "post", label: "Post-tax deductions", amount: -postTax });
    lines.push({ key: "net", label: "Net pay (take-home)", amount: netPeriod });

    var pie = [
      { label: "Federal income tax", value: Math.max(0, federalIncomePeriod), color: "#2563eb" },
      { label: "Social Security", value: Math.max(0, ssPeriod), color: "#7c3aed" },
      { label: "Medicare", value: Math.max(0, medPeriod), color: "#9333ea" },
      { label: "State + local", value: Math.max(0, stateIncomePeriod + localIncomePeriod), color: "#db2777" },
      { label: "SDI / PFL / PFML", value: Math.max(0, sdiPeriod + pfmlPeriod + nySdiPeriod), color: "#ea580c" },
      { label: "Pre-tax + other", value: Math.max(0, pretax401k + postTax), color: "#64748b" },
      { label: "Net pay", value: Math.max(0, netPeriod), color: "#00d084" }
    ];

    return {
      periodsPerYear: pp,
      federalIncomePeriod: federalIncomePeriod,
      netPeriod: netPeriod,
      lines: lines,
      pie: pie,
      meta: {
        grossAnnual: grossAnnual,
        federalTaxableAnnual: fedTaxableAnnual,
        standardDeductionUsed: std,
        ssWageBase: SS_WAGE_BASE_2026
      }
    };
  }

  global.PaycheckEngine = { compute: compute, periodsPerYear: periodsPerYear };
})(typeof window !== "undefined" ? window : this);
