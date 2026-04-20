/**
 * Staff Schedule Generator — vanilla JS, localStorage, no frameworks.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'staff-schedule-generator:v1';

  function trackGa(eventName) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, { event_category: 'staff_schedule_generator' });
      }
    } catch (e) {
      /* ignore */
    }
  }
  var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  var state = createEmptyState();
  var saveTimer = null;
  var uiTimer = null;

  // ---------------------------------------------------------------------------
  // State factory & IDs
  // ---------------------------------------------------------------------------

  function generateId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function createEmptyState() {
    return {
      version: 1,
      businessName: '',
      weekLabel: '',
      setupNotes: '',
      staff: [],
      shifts: []
    };
  }

  function cloneState(src) {
    return JSON.parse(JSON.stringify(src || createEmptyState()));
  }

  // ---------------------------------------------------------------------------
  // Time & shift math (zero-safe, no NaN)
  // ---------------------------------------------------------------------------

  function parseTimeToMinutes(t) {
    if (t == null || t === '') return null;
    var s = String(t).trim();
    var parts = s.split(':');
    if (parts.length < 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 47 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  /**
   * @returns {{ hours: number, complete: boolean, invalidRange: boolean, breakTooLarge: boolean }}
   */
  function calcShiftHours(startStr, endStr, breakMinutesRaw) {
    var br = Number(breakMinutesRaw);
    if (!Number.isFinite(br) || br < 0) br = 0;
    br = Math.round(br);

    var sm = parseTimeToMinutes(startStr);
    var em = parseTimeToMinutes(endStr);
    if (sm === null || em === null) {
      return { hours: 0, complete: false, invalidRange: false, breakTooLarge: false };
    }
    var dur = em - sm;
    if (dur < 0) {
      return { hours: 0, complete: true, invalidRange: true, breakTooLarge: false };
    }
    var netM = dur - br;
    if (netM < 0) {
      return { hours: 0, complete: true, invalidRange: false, breakTooLarge: true };
    }
    var h = netM / 60;
    if (!Number.isFinite(h) || h < 0) h = 0;
    return { hours: h, complete: true, invalidRange: false, breakTooLarge: false };
  }

  function formatHoursOneDec(h) {
    var v = Number(h);
    if (!Number.isFinite(v)) return '0.0';
    return (Math.round(v * 10) / 10).toFixed(1);
  }

  // ---------------------------------------------------------------------------
  // Staff & shift queries
  // ---------------------------------------------------------------------------

  function getStaff(id) {
    for (var i = 0; i < state.staff.length; i++) {
      if (state.staff[i].id === id) return state.staff[i];
    }
    return null;
  }

  function shiftsForDay(dayIndex) {
    return state.shifts.filter(function (s) {
      return s.dayIndex === dayIndex;
    });
  }

  function totalHoursForStaff(staffId) {
    if (!staffId) return 0;
    var sum = 0;
    state.shifts.forEach(function (sh) {
      if (sh.staffId !== staffId) return;
      var r = calcShiftHours(sh.start, sh.end, sh.breakMinutes);
      sum += r.hours;
    });
    return Number.isFinite(sum) ? sum : 0;
  }

  function totalHoursForDay(dayIndex) {
    var sum = 0;
    state.shifts.forEach(function (sh) {
      if (sh.dayIndex !== dayIndex) return;
      var r = calcShiftHours(sh.start, sh.end, sh.breakMinutes);
      sum += r.hours;
    });
    return Number.isFinite(sum) ? sum : 0;
  }

  function totalScheduledHours() {
    var sum = 0;
    state.shifts.forEach(function (sh) {
      sum += calcShiftHours(sh.start, sh.end, sh.breakMinutes).hours;
    });
    return Number.isFinite(sum) ? sum : 0;
  }

  function parseMaxHours(str) {
    if (str == null || String(str).trim() === '') return null;
    var n = Number(String(str).trim());
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }

  // ---------------------------------------------------------------------------
  // Warnings
  // ---------------------------------------------------------------------------

  function shiftHasAnyInput(sh) {
    return !!(
      (sh.staffId && String(sh.staffId).trim()) ||
      (sh.role && String(sh.role).trim()) ||
      (sh.start && String(sh.start).trim()) ||
      (sh.end && String(sh.end).trim()) ||
      (sh.breakMinutes !== '' && sh.breakMinutes != null && String(sh.breakMinutes).trim() !== '')
    );
  }

  function collectWarnings() {
    var warnings = [];
    var d;
    var i;
    var sh;
    var r;
    var staff;
    var maxH;
    var th;

    for (d = 0; d < 7; d++) {
      var dayShifts = shiftsForDay(d);
      if (dayShifts.length === 0) {
        warnings.push(DAY_NAMES[d] + ': no shifts scheduled.');
      }
    }

    for (i = 0; i < state.shifts.length; i++) {
      sh = state.shifts[i];
      if (!shiftHasAnyInput(sh)) continue;
      r = calcShiftHours(sh.start, sh.end, sh.breakMinutes);
      if (!r.complete) {
        warnings.push(
          DAY_NAMES[sh.dayIndex] + ': incomplete shift row (set start, end, and valid break).'
        );
      } else if (r.invalidRange) {
        warnings.push(DAY_NAMES[sh.dayIndex] + ': end time must be after start time (same day).');
      } else if (r.breakTooLarge) {
        warnings.push(DAY_NAMES[sh.dayIndex] + ': break minutes are larger than the shift length.');
      }
    }

    for (i = 0; i < state.staff.length; i++) {
      staff = state.staff[i];
      maxH = parseMaxHours(staff.maxHours);
      if (maxH === null) continue;
      th = totalHoursForStaff(staff.id);
      if (th > maxH + 1e-6) {
        warnings.push(
          (staff.name || 'Staff member') +
            ' exceeds max hours (' +
            formatHoursOneDec(th) +
            ' h scheduled vs ' +
            formatHoursOneDec(maxH) +
            ' h max).'
        );
      }
    }

    return warnings;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  function scheduleSave() {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      saveState();
      saveTimer = null;
    }, 200);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      state = normalizeLoadedState(parsed);
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalizeLoadedState(obj) {
    var s = createEmptyState();
    s.businessName = typeof obj.businessName === 'string' ? obj.businessName : '';
    s.weekLabel = typeof obj.weekLabel === 'string' ? obj.weekLabel : '';
    s.setupNotes = typeof obj.setupNotes === 'string' ? obj.setupNotes : '';
    s.staff = Array.isArray(obj.staff)
      ? obj.staff.map(function (st) {
          return {
            id: st.id || generateId(),
            name: typeof st.name === 'string' ? st.name : '',
            role: typeof st.role === 'string' ? st.role : '',
            maxHours: st.maxHours != null ? String(st.maxHours) : '',
            notes: typeof st.notes === 'string' ? st.notes : ''
          };
        })
      : [];
    s.shifts = Array.isArray(obj.shifts)
      ? obj.shifts.map(function (sh) {
          return {
            id: sh.id || generateId(),
            dayIndex: typeof sh.dayIndex === 'number' && sh.dayIndex >= 0 && sh.dayIndex < 7 ? sh.dayIndex : 0,
            staffId: typeof sh.staffId === 'string' ? sh.staffId : '',
            role: typeof sh.role === 'string' ? sh.role : '',
            start: typeof sh.start === 'string' ? sh.start : '',
            end: typeof sh.end === 'string' ? sh.end : '',
            breakMinutes: sh.breakMinutes != null ? String(sh.breakMinutes) : ''
          };
        })
      : [];
    return s;
  }

  function clearAllData() {
    state = createEmptyState();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function loadExampleSchedule() {
    var s1 = generateId();
    var s2 = generateId();
    state = createEmptyState();
    state.businessName = 'Riverfront Café';
    state.weekLabel = 'Example week';
    state.setupNotes = 'Open 7am–3pm. Two-person morning coverage.';
    state.staff = [
      { id: s1, name: 'Alex Morgan', role: 'Barista', maxHours: '32', notes: 'Opens Mon–Wed' },
      { id: s2, name: 'Jordan Lee', role: 'Cook', maxHours: '38', notes: '' }
    ];
    state.shifts = [
      { id: generateId(), dayIndex: 0, staffId: s1, role: 'Opening', start: '07:00', end: '14:00', breakMinutes: '30' },
      { id: generateId(), dayIndex: 0, staffId: s2, role: 'Prep', start: '06:30', end: '14:30', breakMinutes: '30' },
      { id: generateId(), dayIndex: 1, staffId: s1, role: 'Opening', start: '07:00', end: '15:00', breakMinutes: '30' },
      { id: generateId(), dayIndex: 2, staffId: s2, role: 'Line', start: '10:00', end: '18:00', breakMinutes: '45' },
      { id: generateId(), dayIndex: 3, staffId: s1, role: 'Mid', start: '09:00', end: '17:00', breakMinutes: '30' },
      { id: generateId(), dayIndex: 4, staffId: s1, role: 'Closing', start: '12:00', end: '20:00', breakMinutes: '30' },
      { id: generateId(), dayIndex: 5, staffId: s2, role: 'Weekend', start: '08:00', end: '16:00', breakMinutes: '30' },
      { id: generateId(), dayIndex: 6, staffId: s1, role: 'Brunch', start: '08:00', end: '14:00', breakMinutes: '15' }
    ];
    saveState();
  }

  // ---------------------------------------------------------------------------
  // Escape helpers
  // ---------------------------------------------------------------------------

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function renderSetupFields() {
    var bn = document.getElementById('businessName');
    var wl = document.getElementById('weekLabel');
    var sn = document.getElementById('setupNotes');
    if (bn) bn.value = state.businessName;
    if (wl) wl.value = state.weekLabel;
    if (sn) sn.value = state.setupNotes;
  }

  function staffOptionsHtml(selectedId) {
    var opts = '<option value="">— Select staff —</option>';
    state.staff.forEach(function (st) {
      var sel = st.id === selectedId ? ' selected' : '';
      opts +=
        '<option value="' +
        escapeHtml(st.id) +
        '"' +
        sel +
        '>' +
        escapeHtml(st.name || '(unnamed)') +
        '</option>';
    });
    return opts;
  }

  function renderStaffList() {
    var el = document.getElementById('staffList');
    if (!el) return;
    if (state.staff.length === 0) {
      el.innerHTML = '<p class="totals-empty">No staff yet. Use “Add staff member” to begin.</p>';
      return;
    }
    var html = '';
    state.staff.forEach(function (st) {
      html +=
        '<div class="staff-row" data-staff-id="' +
        escapeHtml(st.id) +
        '">' +
        '<div class="staff-row-grid">' +
        '<div class="field"><label for="sn-' +
        escapeHtml(st.id) +
        '">Name</label>' +
        '<input id="sn-' +
        escapeHtml(st.id) +
        '" class="input" type="text" data-field="name" value="' +
        escapeHtml(st.name) +
        '" maxlength="80" autocomplete="name"></div>' +
        '<div class="field"><label for="sr-' +
        escapeHtml(st.id) +
        '">Role</label>' +
        '<input id="sr-' +
        escapeHtml(st.id) +
        '" class="input" type="text" data-field="role" value="' +
        escapeHtml(st.role) +
        '" maxlength="80"></div>' +
        '<div class="field"><label for="sm-' +
        escapeHtml(st.id) +
        '">Max hours (week)</label>' +
        '<input id="sm-' +
        escapeHtml(st.id) +
        '" class="input" type="text" inputmode="decimal" data-field="maxHours" value="' +
        escapeHtml(st.maxHours) +
        '" placeholder="e.g. 40"></div>' +
        '<div class="field"><label for="sx-' +
        escapeHtml(st.id) +
        '">Notes</label>' +
        '<input id="sx-' +
        escapeHtml(st.id) +
        '" class="input" type="text" data-field="notes" value="' +
        escapeHtml(st.notes) +
        '" maxlength="200"></div>' +
        '</div>' +
        '<div class="staff-row-actions">' +
        '<button type="button" class="btn btn-danger btn-compact" data-action="delete-staff">Remove staff</button>' +
        '</div></div>';
    });
    el.innerHTML = html;
  }

  function renderShiftRow(sh) {
    var r = calcShiftHours(sh.start, sh.end, sh.breakMinutes);
    var invalidClass = r.invalidRange || r.breakTooLarge ? ' shift-row-invalid' : '';
    return (
      '<div class="shift-row' +
      invalidClass +
      '" data-shift-id="' +
      escapeHtml(sh.id) +
      '">' +
      '<div class="shift-grid">' +
      '<div class="shift-cell"><span class="cell-label">Staff</span><select class="input input-select" data-field="staffId" aria-label="Staff for shift">' +
      staffOptionsHtml(sh.staffId) +
      '</select></div>' +
      '<div class="shift-cell"><span class="cell-label">Role</span><input class="input" type="text" data-field="role" value="' +
      escapeHtml(sh.role) +
      '" maxlength="80" aria-label="Shift role"></div>' +
      '<div class="shift-cell"><span class="cell-label">Start</span><input class="input" type="time" data-field="start" value="' +
      escapeHtml(sh.start) +
      '"></div>' +
      '<div class="shift-cell"><span class="cell-label">End</span><input class="input" type="time" data-field="end" value="' +
      escapeHtml(sh.end) +
      '"></div>' +
      '<div class="shift-cell"><span class="cell-label">Break (min)</span><input class="input" type="number" min="0" step="5" data-field="breakMinutes" value="' +
      escapeHtml(sh.breakMinutes) +
      '"></div>' +
      '<div class="shift-cell"><span class="cell-label">Hours</span><span class="shift-hours" data-shift-hours="' +
      escapeHtml(sh.id) +
      '">' +
      escapeHtml(formatHoursOneDec(r.hours)) +
      ' h</span></div>' +
      '<div class="shift-cell"><span class="cell-label">&nbsp;</span><button type="button" class="btn-icon" data-action="delete-shift" aria-label="Remove shift">×</button></div>' +
      '</div></div>'
    );
  }

  function renderDaySections() {
    var el = document.getElementById('daySections');
    if (!el) return;
    var html = '';
    for (var d = 0; d < 7; d++) {
      html +=
        '<section class="day-card" data-day-index="' +
        d +
        '" aria-labelledby="day-h-' +
        d +
        '">' +
        '<div class="day-card-header">' +
        '<h3 class="day-name" id="day-h-' +
        d +
        '">' +
        escapeHtml(DAY_NAMES[d]) +
        '</h3>' +
        '<button type="button" class="btn btn-secondary btn-compact" data-action="add-shift" data-day="' +
        d +
        '">Add shift</button>' +
        '</div>' +
        '<div class="shift-rows" data-day-shifts="' +
        d +
        '">';
      shiftsForDay(d).forEach(function (sh) {
        html += renderShiftRow(sh);
      });
      html += '</div></section>';
    }
    el.innerHTML = html;
  }

  function renderTotalsStaff() {
    var el = document.getElementById('totalsStaff');
    if (!el) return;
    if (state.staff.length === 0) {
      el.innerHTML = '<p class="totals-empty">Add staff to see totals.</p>';
      return;
    }
    var rows = '';
    state.staff.forEach(function (st) {
      var h = totalHoursForStaff(st.id);
      rows +=
        '<tr><td>' +
        escapeHtml(st.name || '(unnamed)') +
        '</td><td>' +
        escapeHtml(formatHoursOneDec(h)) +
        ' h</td></tr>';
    });
    el.innerHTML =
      '<table class="totals-table"><thead><tr><th>Staff</th><th>Hours</th></tr></thead><tbody>' +
      rows +
      '</tbody></table>';
  }

  function renderTotalsDay() {
    var el = document.getElementById('totalsDay');
    if (!el) return;
    var rows = '';
    var d;
    for (d = 0; d < 7; d++) {
      var h = totalHoursForDay(d);
      rows +=
        '<tr><td>' +
        escapeHtml(DAY_NAMES[d]) +
        '</td><td>' +
        escapeHtml(formatHoursOneDec(h)) +
        ' h</td></tr>';
    }
    el.innerHTML =
      '<table class="totals-table"><thead><tr><th>Day</th><th>Hours</th></tr></thead><tbody>' +
      rows +
      '</tbody></table>' +
      '<p style="margin:10px 0 0;font-weight:700">All days: ' +
      escapeHtml(formatHoursOneDec(totalScheduledHours())) +
      ' h</p>';
  }

  function renderWarnings() {
    var el = document.getElementById('warningsPanel');
    if (!el) return;
    var list = collectWarnings();
    if (list.length === 0) {
      el.innerHTML =
        '<p class="warnings-ok">No warnings. All days have at least one shift and no rule issues were found.</p>';
      return;
    }
    el.innerHTML = '<ul>' + list.map(function (w) { return '<li>' + escapeHtml(w) + '</li>'; }).join('') + '</ul>';
  }

  function refreshUI() {
    renderSetupFields();
    renderStaffList();
    renderDaySections();
    renderTotalsStaff();
    renderTotalsDay();
    renderWarnings();
  }

  function scheduleRefresh() {
    if (uiTimer) window.clearTimeout(uiTimer);
    uiTimer = window.setTimeout(function () {
      refreshUI();
      uiTimer = null;
    }, 60);
  }

  function updateShiftHoursSpan(shiftId) {
    var sh = null;
    for (var i = 0; i < state.shifts.length; i++) {
      if (state.shifts[i].id === shiftId) {
        sh = state.shifts[i];
        break;
      }
    }
    var span = document.querySelector('[data-shift-hours="' + shiftId + '"]');
    if (!span || !sh) return;
    var r = calcShiftHours(sh.start, sh.end, sh.breakMinutes);
    span.textContent = formatHoursOneDec(r.hours) + ' h';
    var row = span.closest('.shift-row');
    if (row) {
      if (r.invalidRange || r.breakTooLarge) row.classList.add('shift-row-invalid');
      else row.classList.remove('shift-row-invalid');
    }
  }

  // ---------------------------------------------------------------------------
  // Mutations from UI
  // ---------------------------------------------------------------------------

  function findStaffIndex(id) {
    for (var i = 0; i < state.staff.length; i++) {
      if (state.staff[i].id === id) return i;
    }
    return -1;
  }

  function findShiftIndex(id) {
    for (var i = 0; i < state.shifts.length; i++) {
      if (state.shifts[i].id === id) return i;
    }
    return -1;
  }

  function addStaffMember() {
    state.staff.push({
      id: generateId(),
      name: '',
      role: '',
      maxHours: '',
      notes: ''
    });
    scheduleSave();
    refreshUI();
  }

  function deleteStaff(id) {
    var idx = findStaffIndex(id);
    if (idx < 0) return;
    state.staff.splice(idx, 1);
    state.shifts.forEach(function (sh) {
      if (sh.staffId === id) sh.staffId = '';
    });
    scheduleSave();
    refreshUI();
  }

  function addShift(dayIndex) {
    state.shifts.push({
      id: generateId(),
      dayIndex: dayIndex,
      staffId: '',
      role: '',
      start: '',
      end: '',
      breakMinutes: ''
    });
    scheduleSave();
    refreshUI();
  }

  function deleteShift(id) {
    var idx = findShiftIndex(id);
    if (idx < 0) return;
    state.shifts.splice(idx, 1);
    scheduleSave();
    refreshUI();
  }

  function onStaffField(staffId, field, value) {
    var st = getStaff(staffId);
    if (!st) return;
    if (field === 'name') st.name = value;
    else if (field === 'role') st.role = value;
    else if (field === 'maxHours') st.maxHours = value;
    else if (field === 'notes') st.notes = value;
    scheduleSave();
    renderTotalsStaff();
    renderTotalsDay();
    renderWarnings();
  }

  function onShiftField(shiftId, field, value) {
    var idx = findShiftIndex(shiftId);
    if (idx < 0) return;
    var sh = state.shifts[idx];
    if (field === 'staffId') sh.staffId = value;
    else if (field === 'role') sh.role = value;
    else if (field === 'start') sh.start = value;
    else if (field === 'end') sh.end = value;
    else if (field === 'breakMinutes') sh.breakMinutes = value;
    scheduleSave();
    updateShiftHoursSpan(shiftId);
    renderTotalsStaff();
    renderTotalsDay();
    renderWarnings();
  }

  function onSetupField(id, value) {
    if (id === 'businessName') state.businessName = value;
    else if (id === 'weekLabel') state.weekLabel = value;
    else if (id === 'setupNotes') state.setupNotes = value;
    scheduleSave();
  }

  function showActionStatus(msg) {
    var el = document.getElementById('actionStatus');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    window.setTimeout(function () {
      if (el) el.hidden = true;
    }, 3500);
  }

  // ---------------------------------------------------------------------------
  // Print
  // ---------------------------------------------------------------------------

  function buildPrintHtml() {
    var rows = '';
    for (var d = 0; d < 7; d++) {
      shiftsForDay(d).forEach(function (sh) {
        var st = sh.staffId ? getStaff(sh.staffId) : null;
        var name = st ? st.name || '(unnamed)' : '—';
        var r = calcShiftHours(sh.start, sh.end, sh.breakMinutes);
        rows +=
          '<tr><td>' +
          escapeHtml(DAY_NAMES[d]) +
          '</td><td>' +
          escapeHtml(name) +
          '</td><td>' +
          escapeHtml(sh.role) +
          '</td><td>' +
          escapeHtml(sh.start || '—') +
          '</td><td>' +
          escapeHtml(sh.end || '—') +
          '</td><td>' +
          escapeHtml(String(sh.breakMinutes || '0')) +
          '</td><td>' +
          escapeHtml(formatHoursOneDec(r.hours)) +
          '</td></tr>';
      });
    }
    return (
      '<div class="print-inner">' +
      '<h1>' +
      escapeHtml(state.businessName || 'Staff schedule') +
      '</h1>' +
      '<p><strong>Week:</strong> ' +
      escapeHtml(state.weekLabel || '—') +
      '</p>' +
      (state.setupNotes
        ? '<p><strong>Notes:</strong> ' + escapeHtml(state.setupNotes) + '</p>'
        : '') +
      '<table class="print-table"><thead><tr><th>Day</th><th>Staff</th><th>Role</th><th>Start</th><th>End</th><th>Break (min)</th><th>Hours</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7">No shifts</td></tr>') +
      '</tbody></table>' +
      '<p><strong>Total scheduled:</strong> ' +
      escapeHtml(formatHoursOneDec(totalScheduledHours())) +
      ' h</p>' +
      '</div>'
    );
  }

  function handlePrint() {
    trackGa('ssg_print');
    var host = document.getElementById('printArea');
    if (!host) return;
    host.innerHTML = buildPrintHtml();
    host.setAttribute('aria-hidden', 'false');
    window.print();
  }

  window.addEventListener('afterprint', function () {
    var host = document.getElementById('printArea');
    if (host) {
      host.innerHTML = '';
      host.setAttribute('aria-hidden', 'true');
    }
  });

  // ---------------------------------------------------------------------------
  // CSV
  // ---------------------------------------------------------------------------

  function escapeCsvValue(v) {
    var s = v == null || v === undefined ? '' : String(v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function csvRow(parts) {
    return parts.map(escapeCsvValue).join(',');
  }

  function buildCsvRows() {
    var lines = [];
    lines.push(csvRow(['Type', 'Field', 'Value']));
    lines.push(csvRow(['Meta', 'Business name', state.businessName]));
    lines.push(csvRow(['Meta', 'Week label', state.weekLabel]));
    lines.push(csvRow(['Meta', 'Notes', state.setupNotes]));
    lines.push(csvRow(['Meta', 'Total scheduled hours', formatHoursOneDec(totalScheduledHours())]));
    state.staff.forEach(function (st) {
      lines.push(csvRow(['Staff', 'Name', st.name]));
      lines.push(csvRow(['Staff', 'Role', st.role]));
      lines.push(csvRow(['Staff', 'Max hours', st.maxHours]));
      lines.push(csvRow(['Staff', 'Notes', st.notes]));
    });
    state.shifts.forEach(function (sh) {
      var st = sh.staffId ? getStaff(sh.staffId) : null;
      var r = calcShiftHours(sh.start, sh.end, sh.breakMinutes);
      lines.push(
        csvRow([
          'Shift',
          DAY_NAMES[sh.dayIndex],
          (st ? st.name : '') +
            ' | ' +
            sh.role +
            ' | ' +
            sh.start +
            '-' +
            sh.end +
            ' | break ' +
            (sh.breakMinutes || '0') +
            ' | h ' +
            formatHoursOneDec(r.hours)
        ])
      );
    });
    return lines.join('\r\n');
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function filenameDate() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function downloadCsv(filename, text) {
    var blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    downloadCsv('staff-schedule-' + filenameDate() + '.csv', buildCsvRows());
    showActionStatus('CSV download started.');
    trackGa('ssg_export_csv');
  }

  // ---------------------------------------------------------------------------
  // Summary text
  // ---------------------------------------------------------------------------

  function buildSummaryText() {
    var lines = [];
    lines.push('Staff Schedule Generator — summary');
    lines.push('Business: ' + (state.businessName || '—'));
    lines.push('Week: ' + (state.weekLabel || '—'));
    if (state.setupNotes) lines.push('Notes: ' + state.setupNotes);
    lines.push('');
    lines.push('Totals by staff:');
    state.staff.forEach(function (st) {
      lines.push('  ' + (st.name || '(unnamed)') + ': ' + formatHoursOneDec(totalHoursForStaff(st.id)) + ' h');
    });
    lines.push('');
    lines.push('Totals by day:');
    for (var d = 0; d < 7; d++) {
      lines.push('  ' + DAY_NAMES[d] + ': ' + formatHoursOneDec(totalHoursForDay(d)) + ' h');
    }
    lines.push('  All days: ' + formatHoursOneDec(totalScheduledHours()) + ' h');
    lines.push('');
    lines.push('Warnings:');
    collectWarnings().forEach(function (w) {
      lines.push('  - ' + w);
    });
    if (collectWarnings().length === 0) lines.push('  (none)');
    return lines.join('\n');
  }

  function hideExportFb() {
    var d = document.getElementById('exportFallback');
    if (d) d.hidden = true;
  }

  function showExportFb(text) {
    var d = document.getElementById('exportFallback');
    var ta = document.getElementById('exportFbText');
    if (!d || !ta) return;
    ta.value = text;
    d.hidden = false;
    ta.focus();
    ta.select();
  }

  function handleExportSummary() {
    trackGa('ssg_export_summary');
    var text = buildSummaryText();
    var ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showActionStatus('Summary copied to clipboard.');
          hideExportFb();
        },
        function () {
          showExportFb(text);
        }
      );
      ok = true;
    }
    if (!ok) showExportFb(text);
  }

  // ---------------------------------------------------------------------------
  // Event binding
  // ---------------------------------------------------------------------------

  function bindEvents() {
    document.getElementById('businessName').addEventListener('input', function (e) {
      onSetupField('businessName', e.target.value);
    });
    document.getElementById('weekLabel').addEventListener('input', function (e) {
      onSetupField('weekLabel', e.target.value);
    });
    document.getElementById('setupNotes').addEventListener('input', function (e) {
      onSetupField('setupNotes', e.target.value);
    });

    document.getElementById('btn-add-staff').addEventListener('click', function () {
      addStaffMember();
    });

    var staffList = document.getElementById('staffList');
    staffList.addEventListener('input', function (e) {
      var t = e.target;
      var row = t.closest('[data-staff-id]');
      if (!row || !t.dataset.field) return;
      onStaffField(row.dataset.staffId, t.dataset.field, t.value);
    });
    staffList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="delete-staff"]');
      if (!btn) return;
      var row = btn.closest('[data-staff-id]');
      if (row && confirm('Remove this staff member? Shifts will keep but lose staff assignment.')) {
        deleteStaff(row.dataset.staffId);
      }
    });

    var daySections = document.getElementById('daySections');
    daySections.addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-action="add-shift"]');
      if (addBtn) {
        addShift(parseInt(addBtn.getAttribute('data-day'), 10));
        return;
      }
      var del = e.target.closest('[data-action="delete-shift"]');
      if (del) {
        var row = del.closest('[data-shift-id]');
        if (row) deleteShift(row.dataset.shiftId);
      }
    });
    daySections.addEventListener('input', function (e) {
      var t = e.target;
      var row = t.closest('[data-shift-id]');
      if (!row || !t.dataset.field) return;
      onShiftField(row.dataset.shiftId, t.dataset.field, t.value);
    });
    daySections.addEventListener('change', function (e) {
      var t = e.target;
      var row = t.closest('[data-shift-id]');
      if (!row || !t.dataset.field) return;
      onShiftField(row.dataset.shiftId, t.dataset.field, t.value);
    });

    document.getElementById('btn-example').addEventListener('click', function () {
      loadExampleSchedule();
      refreshUI();
      showActionStatus('Example schedule loaded.');
      trackGa('ssg_load_example');
    });
    document.getElementById('btn-clear').addEventListener('click', function () {
      if (confirm('Clear all schedule data from this browser?')) {
        clearAllData();
        refreshUI();
        showActionStatus('All data cleared.');
        trackGa('ssg_clear_all');
      }
    });
    document.getElementById('btn-print').addEventListener('click', handlePrint);
    document.getElementById('btn-csv').addEventListener('click', handleExportCsv);
    document.getElementById('btn-summary').addEventListener('click', handleExportSummary);

    document.getElementById('exportFbClose').addEventListener('click', hideExportFb);
    document.getElementById('exportFallback').addEventListener('click', function (ev) {
      if (ev.target.id === 'exportFallback') hideExportFb();
    });
  }

  function init() {
    loadState();
    bindEvents();
    refreshUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
