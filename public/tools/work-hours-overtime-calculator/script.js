/**
 * Work Hours & Overtime Calculator — vanilla JS, localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'work-hours-overtime-calculator:v1';
  var saveTimer = null;

  function trackGa(eventName) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, { event_category: 'work_hours_overtime_calculator' });
      }
    } catch (e) {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------------------
  // Parse & safe numbers
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

  function safeMoney(raw) {
    if (raw == null) return 0;
    var s = String(raw).trim().replace(/,/g, '');
    if (s === '') return 0;
    var n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function safePositiveNum(raw, fallback) {
    var n = safeMoney(raw);
    if (n <= 0) return fallback;
    return n;
  }

  function safeIntBreak(raw) {
    var s = raw == null ? '' : String(raw).trim();
    if (s === '') return 0;
    var n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function clamp0(x) {
    var v = Number(x);
    if (!Number.isFinite(v) || v < 0) return 0;
    return v;
  }

  function formatHours(h) {
    var v = clamp0(h);
    return (Math.round(v * 100) / 100).toFixed(2);
  }

  function formatMoney(n) {
    var v = clamp0(n);
    return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------------------------------------------------------------------------
  // Core calculation
  // ---------------------------------------------------------------------------

  /**
   * @returns {{
   *   complete: boolean,
   *   invalidRange: boolean,
   *   breakTooLarge: boolean,
   *   workedMinutes: number,
   *   workedHours: number,
   *   regularHours: number,
   *   overtimeHours: number,
   *   regularPay: number,
   *   overtimePay: number,
   *   totalPay: number
   * }}
   */
  function computeFromFields() {
    var start = document.getElementById('startTime') && document.getElementById('startTime').value;
    var end = document.getElementById('endTime') && document.getElementById('endTime').value;
    var sm = parseTimeToMinutes(start);
    var em = parseTimeToMinutes(end);
    var br = safeIntBreak(document.getElementById('breakMinutes') && document.getElementById('breakMinutes').value);
    var rate = safeMoney(document.getElementById('hourlyRate') && document.getElementById('hourlyRate').value);
    var threshold = safePositiveNum(
      document.getElementById('otThreshold') && document.getElementById('otThreshold').value,
      8,
    );
    var mult = safePositiveNum(
      document.getElementById('otMultiplier') && document.getElementById('otMultiplier').value,
      1.5,
    );

    var out = {
      complete: false,
      invalidRange: false,
      breakTooLarge: false,
      workedMinutes: 0,
      workedHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      regularPay: 0,
      overtimePay: 0,
      totalPay: 0,
    };

    if (sm === null || em === null) {
      return out;
    }

    var grossMin = em - sm;
    if (grossMin < 0) {
      out.complete = true;
      out.invalidRange = true;
      return out;
    }

    var workedM = grossMin - br;
    if (workedM < 0) {
      out.complete = true;
      out.breakTooLarge = true;
      return out;
    }

    out.complete = true;
    out.workedMinutes = workedM;
    var workedH = workedM / 60;
    if (!Number.isFinite(workedH) || workedH < 0) workedH = 0;
    out.workedHours = workedH;

    var regH = Math.min(workedH, threshold);
    var otH = Math.max(workedH - threshold, 0);
    if (!Number.isFinite(regH)) regH = 0;
    if (!Number.isFinite(otH)) otH = 0;
    out.regularHours = regH;
    out.overtimeHours = otH;

    var regPay = regH * rate;
    var otPay = otH * rate * mult;
    if (!Number.isFinite(regPay)) regPay = 0;
    if (!Number.isFinite(otPay)) otPay = 0;
    out.regularPay = clamp0(regPay);
    out.overtimePay = clamp0(otPay);
    out.totalPay = clamp0(out.regularPay + out.overtimePay);

    return out;
  }

  function collectWarnings(r) {
    var list = [];
    if (!r.complete) {
      list.push('Enter both start and end times to calculate hours and pay.');
      return list;
    }
    if (r.invalidRange) {
      list.push('End time must be after start time (same day). Overnight shifts are not modeled in version 1.');
    }
    if (r.breakTooLarge) {
      list.push('Unpaid break is larger than the time between start and end.');
    }
    if (list.length === 0) {
      list.push('OK — inputs look consistent for version 1 rules.');
    }
    return list;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  function readStateFromDom() {
    return {
      version: 1,
      dayLabel: val('dayLabel'),
      startTime: val('startTime'),
      endTime: val('endTime'),
      breakMinutes: val('breakMinutes'),
      hourlyRate: val('hourlyRate'),
      otThreshold: val('otThreshold'),
      otMultiplier: val('otMultiplier'),
      notes: val('notes'),
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function writeStateToDom(s) {
    setv('dayLabel', s.dayLabel);
    setv('startTime', s.startTime);
    setv('endTime', s.endTime);
    setv('breakMinutes', s.breakMinutes != null ? String(s.breakMinutes) : '');
    setv('hourlyRate', s.hourlyRate);
    setv('otThreshold', s.otThreshold);
    setv('otMultiplier', s.otMultiplier);
    setv('notes', s.notes);
  }

  function setv(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v == null ? '' : String(v);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readStateFromDom()));
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
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return false;
      writeStateToDom({
        dayLabel: typeof o.dayLabel === 'string' ? o.dayLabel : '',
        startTime: typeof o.startTime === 'string' ? o.startTime : '',
        endTime: typeof o.endTime === 'string' ? o.endTime : '',
        breakMinutes: o.breakMinutes != null ? String(o.breakMinutes) : '0',
        hourlyRate: typeof o.hourlyRate === 'string' ? o.hourlyRate : '',
        otThreshold: typeof o.otThreshold === 'string' ? o.otThreshold : '8',
        otMultiplier: typeof o.otMultiplier === 'string' ? o.otMultiplier : '1.5',
        notes: typeof o.notes === 'string' ? o.notes : '',
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearAllData() {
    writeStateToDom({
      dayLabel: '',
      startTime: '',
      endTime: '',
      breakMinutes: '0',
      hourlyRate: '',
      otThreshold: '8',
      otMultiplier: '1.5',
      notes: '',
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function loadExample() {
    writeStateToDom({
      dayLabel: 'Example: Friday payroll check',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: '30',
      hourlyRate: '24.50',
      otThreshold: '8',
      otMultiplier: '1.5',
      notes: '9h gross window − 0.5h break = 8.5h worked; 0.5h OT at 1.5×.',
    });
    saveState();
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  function renderWarnings(r) {
    var el = document.getElementById('warningsPanel');
    if (!el) return;
    var list = collectWarnings(r);
    var okOnly = list.length === 1 && list[0].indexOf('OK') === 0;
    if (okOnly) {
      el.innerHTML = '<p class="warnings-ok">' + escapeHtml(list[0]) + '</p>';
    } else {
      el.innerHTML = '<ul>' + list.map(function (w) { return '<li>' + escapeHtml(w) + '</li>'; }).join('') + '</ul>';
    }
  }

  function renderResults(r) {
    var set = function (id, text) {
      var n = document.getElementById(id);
      if (n) n.textContent = text;
    };

    if (!r.complete || r.invalidRange || r.breakTooLarge) {
      set('outWorkedHours', '—');
      set('outRegularHours', '—');
      set('outOvertimeHours', '—');
      set('outRegularPay', '—');
      set('outOvertimePay', '—');
      set('outTotalPay', '—');
      document.getElementById('splitBarWrap').hidden = true;
      return;
    }

    set('outWorkedHours', formatHours(r.workedHours) + ' h');
    set('outRegularHours', formatHours(r.regularHours) + ' h');
    set('outOvertimeHours', formatHours(r.overtimeHours) + ' h');
    set('outRegularPay', formatMoney(r.regularPay));
    set('outOvertimePay', formatMoney(r.overtimePay));
    set('outTotalPay', formatMoney(r.totalPay));

    var wrap = document.getElementById('splitBarWrap');
    var regBar = document.getElementById('splitBarReg');
    var otBar = document.getElementById('splitBarOt');
    if (wrap && regBar && otBar) {
      if (r.workedHours > 0) {
        wrap.hidden = false;
        var pReg = (r.regularHours / r.workedHours) * 100;
        var pOt = (r.overtimeHours / r.workedHours) * 100;
        if (!Number.isFinite(pReg)) pReg = 0;
        if (!Number.isFinite(pOt)) pOt = 0;
        regBar.style.width = pReg + '%';
        otBar.style.width = pOt + '%';
      } else {
        wrap.hidden = true;
      }
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function refreshAll() {
    var r = computeFromFields();
    renderWarnings(r);
    renderResults(r);
  }

  function showActionStatus(msg) {
    var el = document.getElementById('actionStatus');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    window.setTimeout(function () {
      if (el) el.hidden = true;
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Print
  // ---------------------------------------------------------------------------

  function buildPrintHtml(r) {
    var day = val('dayLabel') || '—';
    var notes = val('notes');
    var lines =
      '<div class="print-inner">' +
      '<h1>Work hours &amp; overtime summary</h1>' +
      '<p><strong>Date / label:</strong> ' +
      escapeHtml(day) +
      '</p>' +
      '<p><strong>Start:</strong> ' +
      escapeHtml(val('startTime') || '—') +
      ' <strong>End:</strong> ' +
      escapeHtml(val('endTime') || '—') +
      ' <strong>Break (min):</strong> ' +
      escapeHtml(val('breakMinutes') || '0') +
      '</p>' +
      '<p><strong>Hourly rate:</strong> ' +
      escapeHtml(formatMoney(safeMoney(val('hourlyRate')))) +
      ' &nbsp; <strong>OT threshold (h):</strong> ' +
      escapeHtml(val('otThreshold') || '8') +
      ' &nbsp; <strong>OT multiplier:</strong> ' +
      escapeHtml(val('otMultiplier') || '1.5') +
      '</p>';

    if (notes) {
      lines += '<p><strong>Notes:</strong> ' + escapeHtml(notes) + '</p>';
    }

    if (r.complete && !r.invalidRange && !r.breakTooLarge) {
      lines +=
        '<ul>' +
        '<li>Worked hours: ' +
        escapeHtml(formatHours(r.workedHours)) +
        ' h</li>' +
        '<li>Regular hours: ' +
        escapeHtml(formatHours(r.regularHours)) +
        ' h</li>' +
        '<li>Overtime hours: ' +
        escapeHtml(formatHours(r.overtimeHours)) +
        ' h</li>' +
        '<li>Regular pay: ' +
        escapeHtml(formatMoney(r.regularPay)) +
        '</li>' +
        '<li>Overtime pay: ' +
        escapeHtml(formatMoney(r.overtimePay)) +
        '</li>' +
        '<li><strong>Total pay: ' +
        escapeHtml(formatMoney(r.totalPay)) +
        '</strong></li>' +
        '</ul>';
    } else {
      lines += '<p><em>Could not print totals — fix validation messages on screen.</em></p>';
    }

    lines += '</div>';
    return lines;
  }

  function handlePrint() {
    trackGa('whoc_print');
    var r = computeFromFields();
    var host = document.getElementById('printArea');
    if (!host) return;
    host.innerHTML = buildPrintHtml(r);
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

  function escapeCsv(v) {
    var s = v == null ? '' : String(v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function csvRow(parts) {
    return parts.map(escapeCsv).join(',');
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function filenameDate() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function buildCsv() {
    var r = computeFromFields();
    var lines = [];
    lines.push(csvRow(['Section', 'Field', 'Value']));
    lines.push(csvRow(['Input', 'Day label', val('dayLabel')]));
    lines.push(csvRow(['Input', 'Start time', val('startTime')]));
    lines.push(csvRow(['Input', 'End time', val('endTime')]));
    lines.push(csvRow(['Input', 'Break minutes', val('breakMinutes')]));
    lines.push(csvRow(['Input', 'Hourly rate', val('hourlyRate')]));
    lines.push(csvRow(['Input', 'OT threshold hours', val('otThreshold')]));
    lines.push(csvRow(['Input', 'OT multiplier', val('otMultiplier')]));
    lines.push(csvRow(['Input', 'Notes', val('notes')]));
    lines.push(csvRow(['Result', 'Worked hours', r.complete && !r.invalidRange && !r.breakTooLarge ? formatHours(r.workedHours) : '']));
    lines.push(csvRow(['Result', 'Regular hours', r.complete && !r.invalidRange && !r.breakTooLarge ? formatHours(r.regularHours) : '']));
    lines.push(csvRow(['Result', 'Overtime hours', r.complete && !r.invalidRange && !r.breakTooLarge ? formatHours(r.overtimeHours) : '']));
    lines.push(csvRow(['Result', 'Regular pay', r.complete && !r.invalidRange && !r.breakTooLarge ? String(r.regularPay) : '']));
    lines.push(csvRow(['Result', 'Overtime pay', r.complete && !r.invalidRange && !r.breakTooLarge ? String(r.overtimePay) : '']));
    lines.push(csvRow(['Result', 'Total pay', r.complete && !r.invalidRange && !r.breakTooLarge ? String(r.totalPay) : '']));
    return lines.join('\r\n');
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
    downloadCsv('work-hours-overtime-' + filenameDate() + '.csv', buildCsv());
    showActionStatus('CSV download started.');
    trackGa('whoc_export_csv');
  }

  // ---------------------------------------------------------------------------
  // Summary text
  // ---------------------------------------------------------------------------

  function buildSummaryText() {
    var r = computeFromFields();
    var lines = [];
    lines.push('Work Hours & Overtime Calculator — summary');
    lines.push('Day / label: ' + (val('dayLabel') || '—'));
    lines.push('Start: ' + (val('startTime') || '—') + '  End: ' + (val('endTime') || '—'));
    lines.push('Break (min): ' + (val('breakMinutes') || '0'));
    lines.push('Hourly rate: ' + (val('hourlyRate') || '0'));
    lines.push('OT threshold (h): ' + (val('otThreshold') || '8'));
    lines.push('OT multiplier: ' + (val('otMultiplier') || '1.5'));
    lines.push('');
    if (r.complete && !r.invalidRange && !r.breakTooLarge) {
      lines.push('Worked hours: ' + formatHours(r.workedHours));
      lines.push('Regular hours: ' + formatHours(r.regularHours));
      lines.push('Overtime hours: ' + formatHours(r.overtimeHours));
      lines.push('Regular pay: ' + formatMoney(r.regularPay));
      lines.push('Overtime pay: ' + formatMoney(r.overtimePay));
      lines.push('Total pay: ' + formatMoney(r.totalPay));
    } else {
      lines.push('Totals: (see on-page checks — inputs incomplete or invalid)');
    }
    if (val('notes')) {
      lines.push('');
      lines.push('Notes:');
      lines.push(val('notes'));
    }
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
    trackGa('whoc_export_summary');
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
        },
      );
      ok = true;
    }
    if (!ok) showExportFb(text);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  function bindInputs() {
    var ids = [
      'dayLabel',
      'startTime',
      'endTime',
      'breakMinutes',
      'hourlyRate',
      'otThreshold',
      'otMultiplier',
      'notes',
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        scheduleSave();
        refreshAll();
      });
      el.addEventListener('change', function () {
        scheduleSave();
        refreshAll();
      });
    });
  }

  function bindActions() {
    document.getElementById('btn-example').addEventListener('click', function () {
      loadExample();
      refreshAll();
      showActionStatus('Example loaded.');
      trackGa('whoc_load_example');
    });
    document.getElementById('btn-clear').addEventListener('click', function () {
      if (confirm('Clear all calculator data from this browser?')) {
        clearAllData();
        refreshAll();
        showActionStatus('All data cleared.');
        trackGa('whoc_clear_all');
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
    bindInputs();
    bindActions();
    refreshAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
