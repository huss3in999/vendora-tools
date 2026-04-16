// work-hours-overtime-tracker

(function () {
  var DAY_NAMES = OvertimeEngine.DAY_NAMES;
  var weekWrap = document.getElementById("weekWrap");
  var workState = document.getElementById("workState");
  var defaultRate = document.getElementById("defaultRate");
  var autoMeal = document.getElementById("autoMeal");
  var validationBanner = document.getElementById("validationBanner");
  var dashGrid = document.getElementById("dashGrid");
  var dailyBody = document.getElementById("dailyBody");
  var coNote = document.getElementById("coNote");
  var resetWeek = document.getElementById("resetWeek");

  function sanitizeDec(el) {
    var s = String(el.value || "").replace(/[^\d.]/g, "");
    var p = s.split(".");
    if (p.length <= 1) return s;
    return p[0] + "." + p.slice(1).join("").replace(/\./g, "");
  }

  function shiftRowHtml(dayIndex) {
    return (
      '<tr class="shift-row" data-day="' +
      dayIndex +
      '">' +
      '<td><label class="sr-only">Clock in</label><input type="time" class="cin" aria-label="Clock in"></td>' +
      '<td><label class="sr-only">Clock out</label><input type="time" class="cout" aria-label="Clock out"></td>' +
      '<td><label class="sr-only">Unpaid break minutes</label><input type="text" class="breakm" inputmode="numeric" placeholder="0" aria-label="Unpaid break minutes"></td>' +
      '<td><label class="sr-only">Hourly rate</label><input type="text" class="rate" inputmode="decimal" placeholder="optional" aria-label="Hourly rate optional"></td>' +
      '<td class="shift-actions"><button type="button" class="btn btn-ghost remove-shift">Remove</button></td>' +
      "</tr>"
    );
  }

  function buildWeek() {
    weekWrap.innerHTML = "";
    for (var d = 0; d < 7; d++) {
      var block = document.createElement("div");
      block.className = "day-block";
      block.innerHTML =
        '<h3 class="day-title">' +
        DAY_NAMES[d] +
        '</h3><table class="shift-table"><thead><tr>' +
        '<th scope="col"><abbr title="Clock in">In</abbr></th>' +
        '<th scope="col"><abbr title="Clock out">Out</abbr></th>' +
        '<th scope="col"><abbr title="Unpaid break minutes">Break<span class="th-unit">min</span></abbr></th>' +
        '<th scope="col"><abbr title="Hourly rate (USD)">Rate</abbr></th>' +
        '<th scope="col" class="shift-actions-head"><span class="sr-only">Actions</span></th>' +
        "</tr></thead><tbody data-day-tbody='" +
        d +
        "'>" +
        shiftRowHtml(d) +
        "</tbody></table>" +
        '<button type="button" class="btn btn-secondary btn-add-shift" data-day="' +
        d +
        '">Add shift</button>';
      weekWrap.appendChild(block);
    }

    weekWrap.querySelectorAll(".btn-add-shift").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var di = parseInt(btn.getAttribute("data-day"), 10);
        var tb = weekWrap.querySelector("tbody[data-day-tbody='" + di + "']");
        if (!tb) return;
        var temp = document.createElement("table");
        temp.innerHTML = shiftRowHtml(di);
        var newRow = temp.querySelector("tr");
        if (!newRow) return;
        tb.appendChild(newRow);
        wireRow(newRow);
        calculate();
      });
    });

    weekWrap.querySelectorAll(".shift-row").forEach(wireRow);
  }

  function wireRow(tr) {
    tr.querySelector(".remove-shift").addEventListener("click", function () {
      var tb = tr.parentElement;
      if (tb.querySelectorAll(".shift-row").length <= 1) {
        tr.querySelector(".cin").value = "";
        tr.querySelector(".cout").value = "";
        tr.querySelector(".breakm").value = "";
        tr.querySelector(".rate").value = "";
      } else {
        tr.remove();
      }
      calculate();
    });
    ["cin", "cout", "breakm", "rate"].forEach(function (cls) {
      tr.querySelector("." + cls).addEventListener("input", function () {
        if (cls === "breakm") {
          var ib = tr.querySelector(".breakm");
          ib.value = String(ib.value || "").replace(/[^\d]/g, "");
        }
        if (cls === "rate") {
          var ir = tr.querySelector(".rate");
          ir.value = sanitizeDec(ir);
        }
        calculate();
      });
    });
  }

  function collectShifts() {
    var out = [];
    weekWrap.querySelectorAll(".shift-row").forEach(function (tr) {
      var di = parseInt(tr.getAttribute("data-day"), 10);
      out.push({
        dayIndex: di,
        clockIn: tr.querySelector(".cin").value,
        clockOut: tr.querySelector(".cout").value,
        breakMin: tr.querySelector(".breakm").value,
        rate: tr.querySelector(".rate").value
      });
    });
    return out;
  }

  function formatMoney(n) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
    } catch (e) {
      return "$" + n.toFixed(2);
    }
  }

  function formatHrs(x) {
    return (Math.round(x * 100) / 100).toFixed(2);
  }

  function calculate() {
    if (typeof OvertimeEngine === "undefined") return;
    var dr = parseFloat(sanitizeDec(defaultRate)) || 0;
    var res = OvertimeEngine.computeWeek(
      collectShifts(),
      workState.value,
      autoMeal.checked,
      dr
    );

    if (res.errors.length) {
      validationBanner.hidden = false;
      validationBanner.classList.remove("is-hidden");
      validationBanner.textContent = res.errors.map(function (e) {
        return DAY_NAMES[e.dayIndex] + ": " + e.message;
      }).join(" ");
    } else {
      validationBanner.hidden = true;
      validationBanner.classList.add("is-hidden");
      validationBanner.textContent = "";
    }

    dashGrid.innerHTML =
      '<article class="metric-card"><span class="metric-label">Total hours worked</span><strong class="metric-value" id="summaryTotalHours">' +
      formatHrs(res.totalHoursWorked) +
      "</strong></article>" +
      '<article class="metric-card"><span class="metric-label">Regular hours (weekly cap)</span><strong class="metric-value" id="summaryRegular">' +
      formatHrs(res.totalRegularHours) +
      "</strong></article>" +
      '<article class="metric-card"><span class="metric-label">Daily OT @ 1.5x</span><strong class="metric-value">' +
      formatHrs(res.dailyOt15Hours) +
      "</strong></article>" +
      '<article class="metric-card"><span class="metric-label">Weekly OT @ 1.5x</span><strong class="metric-value">' +
      formatHrs(res.weeklyOt15Hours) +
      "</strong></article>" +
      '<article class="metric-card"><span class="metric-label">Double time @ 2x (CA)</span><strong class="metric-value">' +
      formatHrs(res.dailyOt20Hours) +
      "</strong></article>" +
      '<article class="metric-card metric-card-wide" id="dashWeightedRate"><span class="metric-label">Weighted regular rate</span><strong class="metric-value">' +
      formatMoney(res.weightedRegularRate) +
      "/hr</strong></article>" +
      '<article class="metric-card metric-card-wide" id="dashGrossPay"><span class="metric-label">Estimated gross pay</span><strong class="metric-value" id="summaryGrossPay">' +
      formatMoney(res.estimatedGrossPay) +
      "</strong></article>";

    dailyBody.innerHTML = "";
    res.dailyRows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<th scope=\"row\">" +
        row.dayName +
        "</th><td>" +
        formatHrs(row.totalHours) +
        "</td><td>" +
        formatHrs(row.dailyRegular) +
        "</td><td>" +
        formatHrs(row.dailyOt15) +
        "</td><td>" +
        formatHrs(row.dailyOt20) +
        "</td>";
      dailyBody.appendChild(tr);
    });

    if (res.disclaimer) {
      coNote.hidden = false;
      coNote.classList.remove("is-hidden");
      coNote.textContent = res.disclaimer;
    } else {
      coNote.hidden = true;
      coNote.classList.add("is-hidden");
    }
  }

  defaultRate.addEventListener("input", function () {
    defaultRate.value = sanitizeDec(defaultRate);
    calculate();
  });
  workState.addEventListener("change", calculate);
  autoMeal.addEventListener("change", calculate);

  resetWeek.addEventListener("click", function () {
    defaultRate.value = "";
    autoMeal.checked = false;
    workState.value = "FEDERAL";
    buildWeek();
    calculate();
  });

  buildWeek();
  calculate();
})();
