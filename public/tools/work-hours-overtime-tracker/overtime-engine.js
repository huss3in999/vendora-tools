/**
 * Work week overtime (FLSA baseline + selected state daily rules, anti-pyramiding).
 * Educational - not legal advice; confirm with counsel and state labor agencies.
 */
(function (global) {
  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function parseTimeToMinutes(timeStr) {
    if (timeStr == null || String(timeStr).trim() === "") return NaN;
    var s = String(timeStr).trim();
    var m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return NaN;
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    if (!isFinite(h) || !isFinite(min) || h > 47 || min > 59) return NaN;
    return h * 60 + min;
  }

  function n(v, d) {
    var x = parseFloat(v);
    return isFinite(x) ? x : d;
  }

  /**
   * Net compensable hours for one shift (after unpaid break and optional auto meal).
   * autoMeal: subtract 30 min if gross shift exceeds autoMealAfterHours (e.g. 5).
   */
  function netShiftHours(clockInMin, clockOutMin, unpaidBreakMin, autoMeal, autoMealAfterHours) {
    if (!isFinite(clockInMin) || !isFinite(clockOutMin)) return { hours: 0, error: "invalid_time" };
    if (clockOutMin <= clockInMin) return { hours: 0, error: "out_before_in" };
    var grossMin = clockOutMin - clockInMin;
    var breakM = Math.max(0, n(unpaidBreakMin, 0));
    var workMin = Math.max(0, grossMin - breakM);
    var grossH = grossMin / 60;
    if (autoMeal && grossH > autoMealAfterHours) {
      workMin = Math.max(0, workMin - 30);
    }
    return { hours: workMin / 60, error: null };
  }

  /**
   * Daily buckets from total hours for one day (anti-pyramiding building blocks).
   * Returns { reg, ot15, ot20 } summing to H.
   */
  function dailyBuckets(H, state) {
    H = Math.max(0, H);
    var reg = 0;
    var ot15 = 0;
    var ot20 = 0;
    var st = (state || "FEDERAL").toUpperCase();

    if (st === "CA") {
      reg = Math.min(H, 8);
      ot15 = Math.min(Math.max(H - 8, 0), 4);
      ot20 = Math.max(H - 12, 0);
    } else if (st === "AK" || st === "NV") {
      reg = Math.min(H, 8);
      ot15 = Math.max(H - 8, 0);
    } else if (st === "CO") {
      reg = Math.min(H, 12);
      ot15 = Math.max(H - 12, 0);
    } else {
      reg = H;
    }
    return { reg: reg, ot15: ot15, ot20: ot20 };
  }

  /**
   * @param {Array<{dayIndex:number, clockIn:string, clockOut:string, breakMin:number|string, rate:number|string}>} shifts
   * @param {string} state
   * @param {boolean} autoMeal5
   * @param {number} defaultRate
   */
  function computeWeek(shifts, state, autoMeal5, defaultRate) {
    var defR = n(defaultRate, 0);
    var autoAfter = 5;
    var errors = [];
    var segments = [];
    var hoursByDay = [0, 0, 0, 0, 0, 0, 0];
    var totalHours = 0;
    var totalStraightComp = 0;

    for (var i = 0; i < shifts.length; i++) {
      var sh = shifts[i];
      var di = parseInt(sh.dayIndex, 10);
      if (!isFinite(di) || di < 0 || di > 6) continue;
      var cin = parseTimeToMinutes(sh.clockIn);
      var cout = parseTimeToMinutes(sh.clockOut);
      if (!isFinite(cin) || !isFinite(cout)) {
        if (String(sh.clockIn || "").trim() !== "" || String(sh.clockOut || "").trim() !== "") {
          errors.push({ dayIndex: di, message: "Invalid clock time." });
        }
        continue;
      }
      var br = n(sh.breakMin, 0);
      var rate = n(sh.rate, defR);
      if (rate <= 0) rate = defR;
      var net = netShiftHours(cin, cout, br, autoMeal5, autoAfter);
      if (net.error === "out_before_in") {
        errors.push({ dayIndex: di, message: "Clock out must be after clock in." });
        continue;
      }
      var h = net.hours;
      if (h <= 0) continue;
      hoursByDay[di] += h;
      totalHours += h;
      totalStraightComp += h * rate;
      segments.push({ dayIndex: di, hours: h, rate: rate });
    }

    var st = (state || "FEDERAL").toUpperCase();
    var dailyRows = [];
    var sumReg = 0;
    var sumDailyOt15 = 0;
    var sumDailyOt20 = 0;

    for (var d = 0; d < 7; d++) {
      var H = hoursByDay[d];
      var b = dailyBuckets(H, st);
      sumReg += b.reg;
      sumDailyOt15 += b.ot15;
      sumDailyOt20 += b.ot20;
      dailyRows.push({
        dayIndex: d,
        dayName: DAY_NAMES[d],
        totalHours: H,
        dailyRegular: b.reg,
        dailyOt15: b.ot15,
        dailyOt20: b.ot20
      });
    }

    var weeklyOt15 = Math.max(0, sumReg - 40);
    var regularPayHours = Math.min(sumReg, 40);
    var weightedRate = totalHours > 0 ? totalStraightComp / totalHours : 0;

    var estGrossPay =
      weightedRate * regularPayHours +
      weightedRate * 1.5 * (sumDailyOt15 + weeklyOt15) +
      weightedRate * 2 * sumDailyOt20;

    return {
      dayNames: DAY_NAMES,
      hoursByDay: hoursByDay,
      dailyRows: dailyRows,
      totalHoursWorked: totalHours,
      totalRegularHours: regularPayHours,
      dailyOt15Hours: sumDailyOt15,
      weeklyOt15Hours: weeklyOt15,
      dailyOt20Hours: sumDailyOt20,
      sumDailyRegularCap: sumReg,
      weightedRegularRate: weightedRate,
      estimatedGrossPay: estGrossPay,
      stateUsed: st,
      errors: errors,
      disclaimer:
        st === "CO"
          ? "Colorado: this model uses the 12-hours-in-a-day threshold only (not 12 consecutive hours across shifts)."
          : null
    };
  }

  global.OvertimeEngine = {
    computeWeek: computeWeek,
    parseTimeToMinutes: parseTimeToMinutes,
    DAY_NAMES: DAY_NAMES
  };
})(typeof window !== "undefined" ? window : this);
