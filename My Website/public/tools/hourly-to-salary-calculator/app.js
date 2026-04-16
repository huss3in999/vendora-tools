// hourly-to-salary-calculator runtime

(function () {
  var currencyGroups = [
    { label: "Global and North America", options: [{ code: "USD", label: "USD - US Dollar ($)" }, { code: "CAD", label: "CAD - Canadian Dollar (CA$)" }, { code: "MXN", label: "MXN - Mexican Peso (MX$)" }] },
    { label: "Europe", options: [{ code: "EUR", label: "EUR - Euro (EUR)" }, { code: "GBP", label: "GBP - British Pound (GBP)" }, { code: "CHF", label: "CHF - Swiss Franc (CHF)" }, { code: "SEK", label: "SEK - Swedish Krona (SEK)" }, { code: "NOK", label: "NOK - Norwegian Krone (NOK)" }, { code: "DKK", label: "DKK - Danish Krone (DKK)" }, { code: "PLN", label: "PLN - Polish Zloty (PLN)" }, { code: "CZK", label: "CZK - Czech Koruna (CZK)" }, { code: "HUF", label: "HUF - Hungarian Forint (HUF)" }, { code: "RON", label: "RON - Romanian Leu (RON)" }, { code: "UAH", label: "UAH - Ukrainian Hryvnia (UAH)" }] },
    { label: "Middle East and North Africa", options: [{ code: "AED", label: "AED - UAE Dirham (AED)" }, { code: "SAR", label: "SAR - Saudi Riyal (SAR)" }, { code: "BHD", label: "BHD - Bahraini Dinar (BHD)" }, { code: "QAR", label: "QAR - Qatari Riyal (QAR)" }, { code: "KWD", label: "KWD - Kuwaiti Dinar (KWD)" }, { code: "OMR", label: "OMR - Omani Rial (OMR)" }, { code: "JOD", label: "JOD - Jordanian Dinar (JOD)" }, { code: "EGP", label: "EGP - Egyptian Pound (EGP)" }, { code: "TRY", label: "TRY - Turkish Lira (TRY)" }] },
    { label: "Asia Pacific", options: [{ code: "INR", label: "INR - Indian Rupee (INR)" }, { code: "PKR", label: "PKR - Pakistani Rupee (PKR)" }, { code: "BDT", label: "BDT - Bangladeshi Taka (BDT)" }, { code: "SGD", label: "SGD - Singapore Dollar (SGD)" }, { code: "HKD", label: "HKD - Hong Kong Dollar (HKD)" }, { code: "CNY", label: "CNY - Chinese Yuan (CNY)" }, { code: "JPY", label: "JPY - Japanese Yen (JPY)" }, { code: "KRW", label: "KRW - South Korean Won (KRW)" }, { code: "THB", label: "THB - Thai Baht (THB)" }, { code: "MYR", label: "MYR - Malaysian Ringgit (MYR)" }, { code: "IDR", label: "IDR - Indonesian Rupiah (IDR)" }, { code: "PHP", label: "PHP - Philippine Peso (PHP)" }, { code: "AUD", label: "AUD - Australian Dollar (AUD)" }, { code: "NZD", label: "NZD - New Zealand Dollar (NZD)" }] },
    { label: "Africa and Latin America", options: [{ code: "ZAR", label: "ZAR - South African Rand (ZAR)" }, { code: "NGN", label: "NGN - Nigerian Naira (NGN)" }, { code: "KES", label: "KES - Kenyan Shilling (KES)" }, { code: "BRL", label: "BRL - Brazilian Real (BRL)" }, { code: "ARS", label: "ARS - Argentine Peso (ARS)" }, { code: "CLP", label: "CLP - Chilean Peso (CLP)" }, { code: "PEN", label: "PEN - Peruvian Sol (PEN)" }, { code: "COP", label: "COP - Colombian Peso (COP)" }] }
  ];

  var currencyInput = document.getElementById("currency");
  var payHourly = document.getElementById("payHourly");
  var paySalary = document.getElementById("paySalary");
  var wrapHourlyRate = document.getElementById("wrapHourlyRate");
  var wrapAnnualSalary = document.getElementById("wrapAnnualSalary");
  var hourlyRateInput = document.getElementById("hourlyRate");
  var annualSalaryInput = document.getElementById("annualSalary");
  var hoursPerWeekInput = document.getElementById("hoursPerWeek");
  var daysPerWeekInput = document.getElementById("daysPerWeek");
  var annualHoursProfile = document.getElementById("annualHoursProfile");
  var unpaidVacationInput = document.getElementById("unpaidVacation");
  var unpaidHolidaysInput = document.getElementById("unpaidHolidays");
  var otWeeklyInput = document.getElementById("otWeekly");
  var otMultiplier = document.getElementById("otMultiplier");
  var resetButton = document.getElementById("resetButton");

  var statusText = document.getElementById("statusText");
  var outStandardHours = document.getElementById("outStandardHours");
  var outUncompHours = document.getElementById("outUncompHours");
  var outEffectiveHours = document.getElementById("outEffectiveHours");
  var outRegularHourly = document.getElementById("outRegularHourly");
  var outBlendedHourly = document.getElementById("outBlendedHourly");
  var outDaily = document.getElementById("outDaily");
  var outWeekly = document.getElementById("outWeekly");
  var outBiweekly = document.getElementById("outBiweekly");
  var outSemimonthly = document.getElementById("outSemimonthly");
  var outMonthly = document.getElementById("outMonthly");
  var outAnnualBase = document.getElementById("outAnnualBase");
  var outOtAnnual = document.getElementById("outOtAnnual");
  var outAnnualTotal = document.getElementById("outAnnualTotal");
  var rowBlended = document.getElementById("rowBlended");

  function populateCurrencyOptions() {
    currencyGroups.forEach(function (group) {
      var optgroup = document.createElement("optgroup");
      optgroup.label = group.label;
      group.options.forEach(function (option) {
        var opt = document.createElement("option");
        opt.value = option.code;
        opt.textContent = option.label;
        optgroup.appendChild(opt);
      });
      currencyInput.appendChild(optgroup);
    });
    currencyInput.value = "USD";
  }

  function sanitizeDecimalString(raw) {
    var s = String(raw || "").replace(/[^\d.]/g, "");
    var parts = s.split(".");
    if (parts.length <= 1) return s;
    return parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
  }

  function sanitizeIntString(raw) {
    return String(raw || "").replace(/[^\d]/g, "");
  }

  function onDecimalInput(el) {
    var next = sanitizeDecimalString(el.value);
    if (next !== el.value) el.value = next;
  }

  function onIntInput(el) {
    var next = sanitizeIntString(el.value);
    if (next !== el.value) el.value = next;
  }

  function parsePositiveFloat(el, fallback) {
    var v = parseFloat(sanitizeDecimalString(el.value));
    if (!isFinite(v) || v < 0) return fallback;
    return v;
  }

  function parsePositiveInt(el, fallback) {
    var v = parseInt(sanitizeIntString(el.value), 10);
    if (!isFinite(v) || v < 0) return fallback;
    return v;
  }

  function formatMoney(value) {
    var amount = isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyInput.value || "USD"
      }).format(amount);
    } catch (error) {
      return (currencyInput.value || "USD") + " " + amount.toFixed(2);
    }
  }

  function formatHours(value) {
    if (!isFinite(value)) return "--";
    var rounded = Math.round(value * 100) / 100;
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function setDashOutputs() {
    outRegularHourly.textContent = "--";
    outBlendedHourly.textContent = "--";
    outDaily.textContent = "--";
    outWeekly.textContent = "--";
    outBiweekly.textContent = "--";
    outSemimonthly.textContent = "--";
    outMonthly.textContent = "--";
    outAnnualBase.textContent = "--";
    outOtAnnual.textContent = "--";
    outAnnualTotal.textContent = "--";
  }

  function updatePayTypeUI() {
    var salary = paySalary.checked;
    wrapAnnualSalary.hidden = !salary;
    wrapHourlyRate.hidden = salary;
    hourlyRateInput.toggleAttribute("disabled", salary);
    annualSalaryInput.toggleAttribute("disabled", !salary);
  }

  function calculate() {
    var annualStandard = parseInt(annualHoursProfile.value, 10);
    if (!isFinite(annualStandard) || annualStandard <= 0) annualStandard = 2080;

    var hpw = parsePositiveFloat(hoursPerWeekInput, 40);
    if (hpw <= 0) hpw = 40;
    var dpw = parsePositiveInt(daysPerWeekInput, 5);
    if (dpw <= 0) {
      statusText.textContent = "Days worked per week must be greater than zero.";
      setDashOutputs();
      outStandardHours.textContent = annualStandard.toLocaleString();
      outUncompHours.textContent = "--";
      outEffectiveHours.textContent = "--";
      return;
    }

    var dailyHours = hpw / dpw;
    var unpaidVac = parsePositiveInt(unpaidVacationInput, 0);
    var unpaidHol = parsePositiveInt(unpaidHolidaysInput, 0);
    var uncompHours = (unpaidVac + unpaidHol) * dailyHours;
    var effectiveHours = Math.max(0, annualStandard - uncompHours);

    outStandardHours.textContent = annualStandard.toLocaleString();
    outUncompHours.textContent = formatHours(uncompHours);
    outEffectiveHours.textContent = formatHours(effectiveHours);

    if (effectiveHours <= 0) {
      statusText.textContent = "Effective paid hours reached zero. Reduce unpaid days or increase the annual hour profile.";
      setDashOutputs();
      return;
    }

    var isHourly = payHourly.checked;
    var baseHourly = 0;
    var baseAnnual = 0;

    if (isHourly) {
      baseHourly = parsePositiveFloat(hourlyRateInput, 0);
      baseAnnual = baseHourly * effectiveHours;
    } else {
      baseAnnual = parsePositiveFloat(annualSalaryInput, 0);
      baseHourly = baseAnnual / effectiveHours;
    }

    var hasPayInput = isHourly
      ? hourlyRateInput.value.trim() !== ""
      : annualSalaryInput.value.trim() !== "";

    if (!hasPayInput || (!isHourly && baseAnnual <= 0) || (isHourly && !isFinite(parseFloat(sanitizeDecimalString(hourlyRateInput.value))))) {
      statusText.textContent = isHourly
        ? "Enter an hourly pay rate to see the breakdown."
        : "Enter an annual gross salary to see the breakdown.";
      setDashOutputs();
      outStandardHours.textContent = annualStandard.toLocaleString();
      outUncompHours.textContent = formatHours(uncompHours);
      outEffectiveHours.textContent = formatHours(effectiveHours);
      return;
    }

    if (baseAnnual <= 0 || baseHourly <= 0) {
      statusText.textContent = "Enter a positive pay amount.";
      setDashOutputs();
      return;
    }

    var blendedHourly = baseAnnual / annualStandard;
    var daily = baseHourly * dailyHours;
    var weekly = baseHourly * hpw;
    var biweekly = baseAnnual / 26;
    var semimonthly = baseAnnual / 24;
    var monthly = baseAnnual / 12;

    var otW = parsePositiveFloat(otWeeklyInput, 0);
    var mult = parseFloat(otMultiplier.value);
    if (!isFinite(mult) || mult <= 0) mult = 1.5;
    var otAnnual = otW > 0 ? otW * 52 * baseHourly * mult : 0;
    var totalAnnual = baseAnnual + otAnnual;

    outRegularHourly.textContent = formatMoney(baseHourly) + " / hr";
    outBlendedHourly.textContent = formatMoney(blendedHourly) + " / hr";
    outDaily.textContent = formatMoney(daily);
    outWeekly.textContent = formatMoney(weekly);
    outBiweekly.textContent = formatMoney(biweekly);
    outSemimonthly.textContent = formatMoney(semimonthly);
    outMonthly.textContent = formatMoney(monthly);
    outAnnualBase.textContent = formatMoney(baseAnnual);
    outOtAnnual.textContent = otW > 0 ? formatMoney(otAnnual) : formatMoney(0);
    outAnnualTotal.textContent = formatMoney(totalAnnual);

    var blendedDiff = Math.abs(blendedHourly - baseHourly) > 0.0005;
    if (rowBlended) {
      rowBlended.style.display = blendedDiff ? "" : "none";
    }

    statusText.textContent =
      "Figures are gross estimates for planning. Overtime uses your regular rate times weekly OT hours times 52 weeks times the selected multiplier.";

    if (dpw > 7) {
      statusText.textContent += " Note: more than seven days per week is unusual; check your inputs.";
    }
  }

  function wireInputs() {
    var decimals = [hourlyRateInput, annualSalaryInput, hoursPerWeekInput, otWeeklyInput];
    decimals.forEach(function (el) {
      el.addEventListener("input", function () {
        onDecimalInput(el);
        calculate();
      });
      el.addEventListener("blur", function () {
        onDecimalInput(el);
        calculate();
      });
    });

    [daysPerWeekInput, unpaidVacationInput, unpaidHolidaysInput].forEach(function (el) {
      el.addEventListener("input", function () {
        onIntInput(el);
        calculate();
      });
    });

    payHourly.addEventListener("change", function () {
      updatePayTypeUI();
      calculate();
    });
    paySalary.addEventListener("change", function () {
      updatePayTypeUI();
      calculate();
    });

    annualHoursProfile.addEventListener("change", calculate);
    otMultiplier.addEventListener("change", calculate);
    currencyInput.addEventListener("change", calculate);

    resetButton.addEventListener("click", function () {
      payHourly.checked = true;
      hourlyRateInput.value = "";
      annualSalaryInput.value = "";
      hoursPerWeekInput.value = "40";
      daysPerWeekInput.value = "5";
      annualHoursProfile.value = "2080";
      unpaidVacationInput.value = "";
      unpaidHolidaysInput.value = "";
      otWeeklyInput.value = "";
      otMultiplier.value = "1.5";
      updatePayTypeUI();
      setDashOutputs();
      outStandardHours.textContent = "2,080";
      outUncompHours.textContent = "0";
      outEffectiveHours.textContent = "2,080";
      statusText.textContent = "Enter a pay rate and optional advanced settings to see the full breakdown.";
    });
  }

  populateCurrencyOptions();
  updatePayTypeUI();
  wireInputs();
  calculate();
})();
