// no-tax-on-overtime-calculator UI

(function () {
  var US_STATES = [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "DC", name: "District of Columbia" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" }
  ];

  var currencyGroups = [
    { label: "North America", options: [{ code: "USD", label: "USD - US Dollar ($)" }, { code: "CAD", label: "CAD - Canadian Dollar (CA$)" }] },
    { label: "Other", options: [{ code: "EUR", label: "EUR - Euro" }, { code: "GBP", label: "GBP - British Pound" }] }
  ];

  var el = function (id) {
    return document.getElementById(id);
  };

  var currencyInput = el("currency");
  var grossPay = el("grossPay");
  var bonusPay = el("bonusPay");
  var payFrequency = el("payFrequency");
  var stateSelect = el("state");
  var filingStatus = el("filingStatus");
  var w4Step2 = el("w4Step2");
  var w4Step3 = el("w4Step3");
  var w4Step4a = el("w4Step4a");
  var w4Step4b = el("w4Step4b");
  var noTaxOnOvertime = el("noTaxOnOvertime");
  var overtimeAmount = el("overtimeAmount");
  var pretax401kPercent = el("pretax401kPercent");
  var pretax401kFixed = el("pretax401kFixed");
  var postTaxDeduction = el("postTaxDeduction");
  var nycResident = el("nycResident");
  var yonkersRate = el("yonkersRate");
  var mdCountyRate = el("mdCountyRate");
  var paLocalEit = el("paLocalEit");
  var ohCityRate = el("ohCityRate");
  var netPayOutput = el("netPayOutput");
  var metaLine = el("metaLine");
  var waterfallBody = el("waterfallBody");
  var pieChart = el("pieChart");
  var pieLegend = el("pieLegend");
  var resetButton = el("resetButton");

  var tabBtns = [el("tab1"), el("tab2"), el("tab3")];
  var panels = [el("panel1"), el("panel2"), el("panel3")];

  var localNY = el("localNY");
  var localMD = el("localMD");
  var localPA = el("localPA");
  var localOH = el("localOH");

  function populateCurrency() {
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

  function populateStates() {
    US_STATES.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.code;
      opt.textContent = s.name + " (" + s.code + ")";
      stateSelect.appendChild(opt);
    });
    stateSelect.value = "CA";
  }

  function sanitizeDecimalString(raw) {
    var s = String(raw || "").replace(/[^\d.-]/g, "");
    var neg = s[0] === "-";
    s = s.replace(/-/g, "");
    var parts = s.split(".");
    if (parts.length <= 1) return (neg ? "-" : "") + s;
    return (neg ? "-" : "") + parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
  }

  function sanitizeNonNeg(raw) {
    var s = sanitizeDecimalString(raw);
    if (s.indexOf("-") === 0) return s.substring(1);
    return s;
  }

  function formatMoney(value) {
    var amount = isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyInput.value || "USD"
      }).format(amount);
    } catch (e) {
      return "$" + amount.toFixed(2);
    }
  }

  function updateLocalPanels() {
    var st = stateSelect.value;
    function show(panel, on) {
      panel.hidden = !on;
      panel.classList.toggle("is-hidden", !on);
    }
    show(localNY, st === "NY");
    show(localMD, st === "MD");
    show(localPA, st === "PA");
    show(localOH, st === "OH");
  }

  function setTab(index) {
    for (var i = 0; i < tabBtns.length; i++) {
      var on = i === index;
      tabBtns[i].classList.toggle("is-active", on);
      tabBtns[i].setAttribute("aria-selected", on ? "true" : "false");
      panels[i].hidden = !on;
      panels[i].classList.toggle("is-hidden", !on);
    }
  }

  function arcSlice(cx, cy, r, a0, a1) {
    var x0 = cx + r * Math.cos(a0);
    var y0 = cy + r * Math.sin(a0);
    var x1 = cx + r * Math.cos(a1);
    var y1 = cy + r * Math.sin(a1);
    var large = a1 - a0 > Math.PI ? 1 : 0;
    return (
      "M " +
      cx +
      " " +
      cy +
      " L " +
      x0 +
      " " +
      y0 +
      " A " +
      r +
      " " +
      r +
      " 0 " +
      large +
      " 1 " +
      x1 +
      " " +
      y1 +
      " Z"
    );
  }

  function renderPie(slices) {
    pieChart.innerHTML = "";
    pieLegend.innerHTML = "";
    var total = 0;
    for (var j = 0; j < slices.length; j++) total += Math.max(0, slices[j].value);
    if (total <= 0) return;
    var start = -Math.PI / 2;
    for (var i = 0; i < slices.length; i++) {
      var v = Math.max(0, slices[i].value);
      if (v <= 0) continue;
      var frac = v / total;
      var end = start + frac * 2 * Math.PI;
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", arcSlice(0, 0, 0.95, start, end));
      path.setAttribute("fill", slices[i].color);
      pieChart.appendChild(path);
      start = end;

      var li = document.createElement("li");
      li.innerHTML =
        '<span class="pie-dot" style="background:' +
        slices[i].color +
        '"></span> ' +
        slices[i].label +
        ": <strong>" +
        formatMoney(v) +
        "</strong>";
      pieLegend.appendChild(li);
    }
  }

  function readInputs() {
    return {
      grossPay: parseFloat(sanitizeNonNeg(grossPay.value)) || 0,
      bonusPay: parseFloat(sanitizeNonNeg(bonusPay.value)) || 0,
      payFrequency: payFrequency.value,
      state: stateSelect.value,
      filingStatus: filingStatus.value,
      w4Step2MultipleJobs: w4Step2.checked,
      w4Step3: parseFloat(sanitizeNonNeg(w4Step3.value)) || 0,
      w4Step4a: parseFloat(sanitizeDecimalString(w4Step4a.value)) || 0,
      w4Step4b: parseFloat(sanitizeNonNeg(w4Step4b.value)) || 0,
      noTaxOnOvertime: noTaxOnOvertime.checked,
      overtimeAmount: parseFloat(sanitizeNonNeg(overtimeAmount.value)) || 0,
      pretax401kPercent: parseFloat(sanitizeNonNeg(pretax401kPercent.value)) || 0,
      pretax401kFixed: parseFloat(sanitizeNonNeg(pretax401kFixed.value)) || 0,
      postTaxDeduction: parseFloat(sanitizeNonNeg(postTaxDeduction.value)) || 0,
      nycResident: nycResident.checked,
      yonkersRate: parseFloat(sanitizeNonNeg(yonkersRate.value)) || 0,
      mdCountyRate: parseFloat(sanitizeNonNeg(mdCountyRate.value)) || 0,
      paLocalEit: parseFloat(sanitizeNonNeg(paLocalEit.value)) || 0,
      ohCityRate: parseFloat(sanitizeNonNeg(ohCityRate.value)) || 0
    };
  }

  function onDecimalInput(el) {
    var next = sanitizeNonNeg(el.value);
    if (next !== el.value) el.value = next;
  }

  function calculate() {
    if (typeof PaycheckEngine === "undefined") return;
    var result = PaycheckEngine.compute(readInputs());
    netPayOutput.textContent = formatMoney(result.netPeriod);
    metaLine.textContent =
      "Annualized gross ≈ " +
      formatMoney(result.meta.grossAnnual) +
      " · SS wage base 2026: " +
      formatMoney(result.meta.ssWageBase);

    waterfallBody.innerHTML = "";
    result.lines.forEach(function (line) {
      var tr = document.createElement("tr");
      if (line.key === "net") tr.className = "row-total";
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = line.label;
      var td = document.createElement("td");
      td.textContent = formatMoney(line.amount);
      tr.appendChild(th);
      tr.appendChild(td);
      waterfallBody.appendChild(tr);
      if (line.note) {
        var tr2 = document.createElement("tr");
        tr2.className = "note-row";
        var td2 = document.createElement("td");
        td2.colSpan = 2;
        td2.textContent = line.note;
        tr2.appendChild(td2);
        waterfallBody.appendChild(tr2);
      }
    });

    renderPie(result.pie);
  }

  function wire() {
    w4Step4a.addEventListener("input", function () {
      var next = sanitizeDecimalString(w4Step4a.value);
      if (next !== w4Step4a.value) w4Step4a.value = next;
      calculate();
    });

    [
      grossPay,
      bonusPay,
      pretax401kPercent,
      pretax401kFixed,
      postTaxDeduction,
      w4Step3,
      w4Step4b,
      overtimeAmount,
      yonkersRate,
      mdCountyRate,
      paLocalEit,
      ohCityRate
    ].forEach(function (input) {
      input.addEventListener("input", function () {
        onDecimalInput(input);
        calculate();
      });
    });

    [
      payFrequency,
      stateSelect,
      filingStatus,
      currencyInput
    ].forEach(function (input) {
      input.addEventListener("change", function () {
        updateLocalPanels();
        calculate();
      });
    });

    [w4Step2, noTaxOnOvertime, nycResident].forEach(function (input) {
      input.addEventListener("change", calculate);
    });

    for (var t = 0; t < tabBtns.length; t++) {
      (function (idx) {
        tabBtns[idx].addEventListener("click", function () {
          setTab(idx);
        });
      })(t);
    }

    resetButton.addEventListener("click", function () {
      grossPay.value = "";
      bonusPay.value = "";
      payFrequency.value = "biweekly";
      stateSelect.value = "CA";
      filingStatus.value = "single";
      w4Step2.checked = false;
      w4Step3.value = "";
      w4Step4a.value = "";
      w4Step4b.value = "";
      noTaxOnOvertime.checked = false;
      overtimeAmount.value = "";
      pretax401kPercent.value = "";
      pretax401kFixed.value = "";
      postTaxDeduction.value = "";
      nycResident.checked = false;
      yonkersRate.value = "";
      mdCountyRate.value = "";
      paLocalEit.value = "";
      ohCityRate.value = "";
      setTab(0);
      updateLocalPanels();
      calculate();
    });
  }

  populateCurrency();
  populateStates();
  updateLocalPanels();
  wire();
  setTab(0);
  calculate();
})();
