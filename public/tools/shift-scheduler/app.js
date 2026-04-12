(function () {
  var tbody = document.getElementById("shiftBody");
  var addShiftBtn = document.getElementById("addShiftBtn");
  var conflictBox = document.getElementById("conflictBox");
  var weekGrid = document.getElementById("weekGrid");

  function parseTime(t) {
    if (!t || typeof t !== "string") return null;
    var p = t.split(":");
    if (p.length < 2) return null;
    var h = parseInt(p[0], 10);
    var m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function fmtHours(mins) {
    if (mins <= 0 || !isFinite(mins)) return "0h 0m";
    var h = Math.floor(mins / 60);
    var m = Math.round(mins % 60);
    return h + "h " + m + "m";
  }

  function dayNameFromDateStr(ds) {
    if (!ds) return "—";
    var d = new Date(ds + "T12:00:00");
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function createShift(data) {
    return {
      id: data && data.id ? data.id : "sh-" + Math.random().toString(36).slice(2, 10),
      employee: data && data.employee != null ? data.employee : "",
      role: data && data.role != null ? data.role : "",
      date: data && data.date ? data.date : new Date().toISOString().slice(0, 10),
      start: data && data.start ? data.start : "09:00",
      end: data && data.end ? data.end : "17:00",
      breakMin: data && data.breakMin != null ? data.breakMin : 30
    };
  }

  var state = { shifts: [] };

  function shiftMinutes(s) {
    var a = parseTime(s.start);
    var b = parseTime(s.end);
    if (a == null || b == null) return 0;
    var span = b - a;
    if (span <= 0) span += 24 * 60;
    var br = parseFloat(s.breakMin) || 0;
    return Math.max(0, span - br);
  }

  function overlaps(a, b) {
    if (a.date !== b.date) return false;
    if ((a.employee || "").trim().toLowerCase() !== (b.employee || "").trim().toLowerCase()) return false;
    if (!(a.employee || "").trim()) return false;
    var a1 = parseTime(a.start);
    var a2 = parseTime(a.end);
    var b1 = parseTime(b.start);
    var b2 = parseTime(b.end);
    if (a1 == null || a2 == null || b1 == null || b2 == null) return false;
    if (a2 <= a1) a2 += 24 * 60;
    if (b2 <= b1) b2 += 24 * 60;
    return a1 < b2 && b1 < a2;
  }

  function findConflicts() {
    var list = [];
    for (var i = 0; i < state.shifts.length; i++) {
      for (var j = i + 1; j < state.shifts.length; j++) {
        if (overlaps(state.shifts[i], state.shifts[j])) {
          list.push(
            state.shifts[i].employee +
              " on " +
              state.shifts[i].date +
              ": overlap between " +
              state.shifts[i].start +
              "–" +
              state.shifts[i].end +
              " and " +
              state.shifts[j].start +
              "–" +
              state.shifts[j].end
          );
        }
      }
    }
    return list;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderPanels() {
    var conflicts = findConflicts();
    if (conflicts.length) {
      conflictBox.hidden = false;
      conflictBox.innerHTML = "<strong>Schedule conflicts detected:</strong><ul style=\"margin:8px 0 0 18px;\">" + conflicts.map(function (c) {
        return "<li>" + escapeHtml(c) + "</li>";
      }).join("") + "</ul>";
    } else {
      conflictBox.hidden = true;
      conflictBox.innerHTML = "";
    }

    var byDay = {};
    state.shifts.forEach(function (s) {
      var key = s.date;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(s);
    });
    var days = Object.keys(byDay).sort();
    if (!days.length) {
      weekGrid.innerHTML = "<p class=\"section-copy\">Add shifts to see them grouped by date.</p>";
      return;
    }
    weekGrid.innerHTML = days
      .map(function (d) {
        var shifts = byDay[d];
        return (
          '<div class="week-day"><h4>' +
          escapeHtml(dayNameFromDateStr(d)) +
          "</h4>" +
          shifts
            .map(function (s) {
              return (
                '<div class="week-shift"><strong>' +
                escapeHtml(s.employee || "Employee") +
                "</strong> · " +
                escapeHtml(s.role || "Role") +
                "<br>" +
                escapeHtml(s.start) +
                " – " +
                escapeHtml(s.end) +
                " · " +
                fmtHours(shiftMinutes(s)) +
                "</div>"
              );
            })
            .join("") +
          "</div>"
        );
      })
      .join("");
  }

  function renderTable() {
    tbody.innerHTML = state.shifts
      .map(function (s) {
        var mins = shiftMinutes(s);
        return (
          "<tr data-id=\"" +
          s.id +
          "\">" +
          "<td><input type=\"text\" class=\"sh-in\" data-f=\"employee\" value=\"" +
          escapeHtml(s.employee) +
          "\" aria-label=\"Employee name\"></td>" +
          "<td><input type=\"text\" class=\"sh-in\" data-f=\"role\" value=\"" +
          escapeHtml(s.role) +
          "\" aria-label=\"Role\"></td>" +
          "<td><input type=\"date\" class=\"sh-in\" data-f=\"date\" value=\"" +
          escapeHtml(s.date) +
          "\" aria-label=\"Shift date\"></td>" +
          "<td><input type=\"time\" class=\"sh-in\" data-f=\"start\" value=\"" +
          escapeHtml(s.start) +
          "\" aria-label=\"Start time\"></td>" +
          "<td><input type=\"time\" class=\"sh-in\" data-f=\"end\" value=\"" +
          escapeHtml(s.end) +
          "\" aria-label=\"End time\"></td>" +
          "<td><input type=\"number\" class=\"sh-in numeric-input-xs\" data-f=\"breakMin\" min=\"0\" step=\"5\" value=\"" +
          escapeHtml(s.breakMin) +
          "\" aria-label=\"Break minutes\"></td>" +
          "<td class=\"hours-cell\">" +
          fmtHours(mins) +
          "</td>" +
          "<td><button type=\"button\" class=\"btn btn-danger btn-inline sh-del\">Remove</button></td>" +
          "</tr>"
        );
      })
      .join("");
    renderPanels();
  }

  function findShift(id) {
    return state.shifts.find(function (s) {
      return s.id === id;
    });
  }

  tbody.addEventListener("input", function (e) {
    var inp = e.target.closest(".sh-in");
    if (!inp) return;
    var tr = inp.closest("tr");
    if (!tr) return;
    var sh = findShift(tr.getAttribute("data-id"));
    if (!sh) return;
    sh[inp.getAttribute("data-f")] = inp.type === "number" ? inp.value : inp.value;
    var hc = tr.querySelector(".hours-cell");
    if (hc) hc.textContent = fmtHours(shiftMinutes(sh));
    renderPanels();
  });

  tbody.addEventListener("click", function (e) {
    if (!e.target.closest(".sh-del")) return;
    var tr = e.target.closest("tr");
    if (!tr) return;
    if (state.shifts.length <= 1) return;
    state.shifts = state.shifts.filter(function (s) {
      return s.id !== tr.getAttribute("data-id");
    });
    renderTable();
  });

  addShiftBtn.addEventListener("click", function () {
    state.shifts.push(createShift({}));
    renderTable();
  });

  state.shifts = [
    createShift({ employee: "Sara", role: "Server", date: new Date().toISOString().slice(0, 10), start: "10:00", end: "18:00", breakMin: 30 }),
    createShift({ employee: "Omar", role: "Cook", date: new Date().toISOString().slice(0, 10), start: "09:00", end: "17:00", breakMin: 30 })
  ];
  renderTable();
})();
