/**
 * Quotation Generator — vanilla JS, localStorage, no frameworks.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'quotation-generator:v1';
  var saveTimer = null;

  function trackQg(eventName) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, { event_category: 'quotation_generator' });
      }
    } catch (e) {
      /* ignore */
    }
  }

  var CURRENCY_SYMBOL = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR ',
    AED: 'AED ',
    BHD: 'BD ',
    INR: '₹',
    CAD: 'CA$',
    AUD: 'A$',
    OTHER: '',
  };

  var state = createEmptyState();

  function generateId() {
    return 'ln-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function createEmptyState() {
    return {
      version: 1,
      business: { name: '', phone: '', email: '', address: '' },
      customer: { name: '', phone: '', email: '', address: '' },
      meta: {
        quoteNumber: '',
        quoteDate: '',
        validUntil: '',
        currency: 'USD',
        statusLabel: '',
      },
      lines: [],
      discountAmount: '',
      taxAmount: '',
      notes: '',
      terms: '',
    };
  }

  function cloneState(src) {
    return JSON.parse(JSON.stringify(src || createEmptyState()));
  }

  // ---------------------------------------------------------------------------
  // Safe numbers
  // ---------------------------------------------------------------------------

  function safeMoney(raw) {
    if (raw == null) return 0;
    var s = String(raw).trim().replace(/,/g, '');
    if (s === '') return 0;
    var n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function safeQty(raw) {
    if (raw == null) return 0;
    var s = String(raw).trim();
    if (s === '') return 0;
    var n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function lineRowTotal(qtyStr, priceStr) {
    var q = safeQty(qtyStr);
    var p = safeMoney(priceStr);
    var t = q * p;
    return Number.isFinite(t) && t >= 0 ? t : 0;
  }

  function computeTotals() {
    var sub = 0;
    for (var i = 0; i < state.lines.length; i++) {
      sub += lineRowTotal(state.lines[i].quantity, state.lines[i].unitPrice);
    }
    if (!Number.isFinite(sub) || sub < 0) sub = 0;
    var disc = safeMoney(state.discountAmount);
    var tax = safeMoney(state.taxAmount);
    var grand = sub - disc + tax;
    if (!Number.isFinite(grand)) grand = 0;
    if (grand < 0) grand = 0;
    return { subtotal: sub, discount: disc, tax: tax, grand: grand };
  }

  function formatMoney(amount) {
    var v = Number(amount);
    if (!Number.isFinite(v)) v = 0;
    var rounded = Math.round(v * 100) / 100;
    return rounded.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function currencyPrefix() {
    var c = state.meta.currency || 'USD';
    if (c === 'OTHER') return '';
    var sym = CURRENCY_SYMBOL[c];
    if (sym) return sym;
    return c + ' ';
  }

  function formatWithCurrency(amount) {
    return currencyPrefix() + formatMoney(amount);
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
    }, 220);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      state = normalizeState(parsed);
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalizeState(obj) {
    var s = createEmptyState();
    if (obj.business && typeof obj.business === 'object') {
      s.business.name = str(obj.business.name);
      s.business.phone = str(obj.business.phone);
      s.business.email = str(obj.business.email);
      s.business.address = str(obj.business.address);
    }
    if (obj.customer && typeof obj.customer === 'object') {
      s.customer.name = str(obj.customer.name);
      s.customer.phone = str(obj.customer.phone);
      s.customer.email = str(obj.customer.email);
      s.customer.address = str(obj.customer.address);
    }
    if (obj.meta && typeof obj.meta === 'object') {
      s.meta.quoteNumber = str(obj.meta.quoteNumber);
      s.meta.quoteDate = str(obj.meta.quoteDate);
      s.meta.validUntil = str(obj.meta.validUntil);
      s.meta.currency = validCurrency(obj.meta.currency);
      s.meta.statusLabel = str(obj.meta.statusLabel);
    }
    s.lines = Array.isArray(obj.lines)
      ? obj.lines.map(function (row) {
          return {
            id: row.id || generateId(),
            description: str(row.description),
            quantity: row.quantity != null ? String(row.quantity) : '',
            unitPrice: row.unitPrice != null ? String(row.unitPrice) : '',
          };
        })
      : [];
    if (s.lines.length === 0) {
      s.lines.push({ id: generateId(), description: '', quantity: '', unitPrice: '' });
    }
    s.discountAmount = obj.discountAmount != null ? String(obj.discountAmount) : '';
    s.taxAmount = obj.taxAmount != null ? String(obj.taxAmount) : '';
    s.notes = str(obj.notes);
    s.terms = str(obj.terms);
    return s;
  }

  function str(v) {
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  }

  function validCurrency(c) {
    var allowed = [
      'USD',
      'EUR',
      'GBP',
      'SAR',
      'AED',
      'BHD',
      'INR',
      'CAD',
      'AUD',
      'OTHER',
    ];
    if (allowed.indexOf(c) >= 0) return c;
    return 'USD';
  }

  function clearAllData() {
    state = createEmptyState();
    state.lines = [{ id: generateId(), description: '', quantity: '', unitPrice: '' }];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function loadExampleQuotation() {
    var today = new Date();
    var pad = function (n) {
      return n < 10 ? '0' + n : String(n);
    };
    var iso =
      today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    var next = new Date(today);
    next.setDate(next.getDate() + 30);
    var validIso =
      next.getFullYear() + '-' + pad(next.getMonth() + 1) + '-' + pad(next.getDate());

    state = createEmptyState();
    state.business = {
      name: 'Harborline Creative Co.',
      phone: '+1 (555) 010-4420',
      email: 'quotes@harborline.example',
      address: '1200 Bay Street, Suite 400\nSan Francisco, CA 94133',
    };
    state.customer = {
      name: 'Northwind Traders LLC',
      phone: '+1 (555) 019-7781',
      email: 'procurement@northwind.example',
      address: '48 Market Street\nSeattle, WA 98101',
    };
    state.meta = {
      quoteNumber: 'Q-2026-0142',
      quoteDate: iso,
      validUntil: validIso,
      currency: 'USD',
      statusLabel: 'Draft',
    };
    state.lines = [
      {
        id: generateId(),
        description: 'Brand identity refresh — discovery & mood boards',
        quantity: '1',
        unitPrice: '2400.00',
      },
      {
        id: generateId(),
        description: 'Website landing page design (3 concepts, 2 rounds)',
        quantity: '1',
        unitPrice: '3200.00',
      },
      {
        id: generateId(),
        description: 'Monthly retainer — content updates (10 hours)',
        quantity: '10',
        unitPrice: '95.00',
      },
    ];
    state.discountAmount = '250.00';
    state.taxAmount = '0';
    state.notes =
      'Thank you for considering Harborline. This quotation assumes kickoff within two weeks of acceptance.';
    state.terms =
      'Payment: 40% deposit, 60% on delivery. Valid for 30 days unless otherwise agreed. Late payments may incur a 1.5% monthly service charge. Cancellation: written notice; deposit non-refundable after work has started.';
    saveState();
  }

  // ---------------------------------------------------------------------------
  // Escape
  // ---------------------------------------------------------------------------

  function escapeHtml(t) {
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  function renderSetupFields() {
    document.getElementById('bizName').value = state.business.name;
    document.getElementById('bizPhone').value = state.business.phone;
    document.getElementById('bizEmail').value = state.business.email;
    document.getElementById('bizAddress').value = state.business.address;
    document.getElementById('custName').value = state.customer.name;
    document.getElementById('custPhone').value = state.customer.phone;
    document.getElementById('custEmail').value = state.customer.email;
    document.getElementById('custAddress').value = state.customer.address;
    document.getElementById('quoteNumber').value = state.meta.quoteNumber;
    document.getElementById('quoteDate').value = state.meta.quoteDate;
    document.getElementById('validUntil').value = state.meta.validUntil;
    document.getElementById('currency').value = state.meta.currency;
    document.getElementById('statusLabel').value = state.meta.statusLabel;
    document.getElementById('discountAmount').value = state.discountAmount;
    document.getElementById('taxAmount').value = state.taxAmount;
    document.getElementById('notes').value = state.notes;
    document.getElementById('terms').value = state.terms;
  }

  function renderLineRows() {
    var tb = document.getElementById('linesBody');
    if (!tb) return;
    var html = '';
    state.lines.forEach(function (row) {
      var lt = lineRowTotal(row.quantity, row.unitPrice);
      html +=
        '<tr data-line-id="' +
        escapeHtml(row.id) +
        '">' +
        '<td class="line-desc"><input class="input" type="text" data-field="description" maxlength="300" aria-label="Line description" value="' +
        escapeHtml(row.description) +
        '"></td>' +
        '<td><input class="input" type="text" inputmode="decimal" data-field="quantity" aria-label="Quantity" value="' +
        escapeHtml(row.quantity) +
        '"></td>' +
        '<td><input class="input" type="text" inputmode="decimal" data-field="unitPrice" aria-label="Unit price" value="' +
        escapeHtml(row.unitPrice) +
        '"></td>' +
        '<td class="num"><span data-line-total="' +
        escapeHtml(row.id) +
        '">' +
        escapeHtml(formatWithCurrency(lt)) +
        '</span></td>' +
        '<td class="col-action"><button type="button" class="btn-icon" data-action="remove-line" aria-label="Remove line">×</button></td>' +
        '</tr>';
    });
    tb.innerHTML = html;
  }

  function updateLineTotalCell(id) {
    var row = findLine(id);
    if (!row) return;
    var span = document.querySelector('[data-line-total="' + id + '"]');
    if (!span) return;
    var lt = lineRowTotal(row.quantity, row.unitPrice);
    span.textContent = formatWithCurrency(lt);
  }

  function findLine(id) {
    for (var i = 0; i < state.lines.length; i++) {
      if (state.lines[i].id === id) return state.lines[i];
    }
    return null;
  }

  function findLineIndex(id) {
    for (var i = 0; i < state.lines.length; i++) {
      if (state.lines[i].id === id) return i;
    }
    return -1;
  }

  function renderTotalsSidebar() {
    var t = computeTotals();
    document.getElementById('dispSubtotal').textContent = formatWithCurrency(t.subtotal);
    document.getElementById('dispDiscount').textContent = formatWithCurrency(t.discount);
    document.getElementById('dispTax').textContent = formatWithCurrency(t.tax);
    document.getElementById('dispGrand').textContent = formatWithCurrency(t.grand);
  }

  function buildPreviewHtml() {
    var t = computeTotals();
    var biz = state.business;
    var cust = state.customer;
    var m = state.meta;
    var status = (m.statusLabel || '').trim();

    var rowsHtml = '';
    state.lines.forEach(function (row) {
      var lt = lineRowTotal(row.quantity, row.unitPrice);
      rowsHtml +=
        '<tr><td>' +
        escapeHtml(row.description || '—') +
        '</td><td class="num">' +
        escapeHtml(row.quantity || '0') +
        '</td><td class="num">' +
        escapeHtml(formatWithCurrency(safeMoney(row.unitPrice))) +
        '</td><td class="num">' +
        escapeHtml(formatWithCurrency(lt)) +
        '</td></tr>';
    });

    var statusHtml = status
      ? '<span class="q-badge">' + escapeHtml(status) + '</span>'
      : '';

    return (
      '<div class="q-head">' +
      '<div><p class="q-brand-name">' +
      escapeHtml(biz.name || 'Your business name') +
      '</p>' +
      '<p class="q-block" style="margin-top:8px;font-size:0.9rem;color:#5c6478">' +
      escapeHtml(biz.phone || '') +
      (biz.phone && biz.email ? ' · ' : '') +
      escapeHtml(biz.email || '') +
      '</p>' +
      (biz.address
        ? '<p class="q-block" style="margin-top:6px;font-size:0.9rem;white-space:pre-wrap">' +
          escapeHtml(biz.address) +
          '</p>'
        : '') +
      '</div>' +
      '<div class="q-meta-block">' +
      '<p><strong>Quotation</strong></p>' +
      '<p>#' +
      escapeHtml(m.quoteNumber || '—') +
      '</p>' +
      '<p>Date: ' +
      escapeHtml(fmtDateLabel(m.quoteDate)) +
      '</p>' +
      '<p>Valid until: ' +
      escapeHtml(fmtDateLabel(m.validUntil)) +
      '</p>' +
      statusHtml +
      '</div></div>' +
      '<div class="q-columns">' +
      '<div class="q-block"><h3>Bill to</h3>' +
      '<p><strong>' +
      escapeHtml(cust.name || 'Customer name') +
      '</strong></p>' +
      (cust.phone ? '<p>' + escapeHtml(cust.phone) + '</p>' : '') +
      (cust.email ? '<p>' + escapeHtml(cust.email) + '</p>' : '') +
      (cust.address ? '<p>' + nlToBr(cust.address) + '</p>' : '<p>—</p>') +
      '</div><div class="q-block"><h3>Summary</h3>' +
      '<p>Currency: <strong>' +
      escapeHtml(m.currency || 'USD') +
      '</strong></p>' +
      '<p>Line items: <strong>' +
      state.lines.length +
      '</strong></p></div></div>' +
      '<table class="q-items"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead><tbody>' +
      (rowsHtml || '<tr><td colspan="4">No line items</td></tr>') +
      '</tbody></table>' +
      '<div class="q-totals-box"><table><tbody>' +
      '<tr><td>Subtotal</td><td>' +
      escapeHtml(formatWithCurrency(t.subtotal)) +
      '</td></tr>' +
      '<tr><td>Discount</td><td>' +
      escapeHtml(formatWithCurrency(t.discount)) +
      '</td></tr>' +
      '<tr><td>Tax</td><td>' +
      escapeHtml(formatWithCurrency(t.tax)) +
      '</td></tr>' +
      '<tr class="grand"><td>Grand total</td><td>' +
      escapeHtml(formatWithCurrency(t.grand)) +
      '</td></tr>' +
      '</tbody></table></div>' +
      (state.notes.trim()
        ? '<div class="q-notes"><h3>Notes</h3><p>' + nlToBr(state.notes) + '</p></div>'
        : '') +
      (state.terms.trim()
        ? '<div class="q-notes"><h3>Terms and conditions</h3><p>' + nlToBr(state.terms) + '</p></div>'
        : '')
    );
  }

  function nlToBr(s) {
    return escapeHtml(s).replace(/\r\n|\r|\n/g, '<br>');
  }

  function fmtDateLabel(iso) {
    if (!iso || String(iso).trim() === '') return '—';
    var parts = String(iso).split('-');
    if (parts.length !== 3) return String(iso);
    var y = parseInt(parts[0], 10);
    var mo = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return String(iso);
    try {
      var dt = new Date(y, mo - 1, d);
      return dt.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return String(iso);
    }
  }

  function renderPreview() {
    var el = document.getElementById('quotationPreview');
    if (!el) return;
    el.innerHTML = buildPreviewHtml();
  }

  function refreshAll() {
    renderTotalsSidebar();
    renderPreview();
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  function addLine() {
    state.lines.push({ id: generateId(), description: '', quantity: '', unitPrice: '' });
    scheduleSave();
    renderLineRows();
    refreshAll();
  }

  function removeLine(id) {
    if (state.lines.length <= 1) return;
    var idx = findLineIndex(id);
    if (idx < 0) return;
    state.lines.splice(idx, 1);
    scheduleSave();
    renderLineRows();
    refreshAll();
  }

  function onLineInput(tr, field, value) {
    var id = tr.getAttribute('data-line-id');
    var row = findLine(id);
    if (!row) return;
    if (field === 'description') row.description = value;
    else if (field === 'quantity') row.quantity = value;
    else if (field === 'unitPrice') row.unitPrice = value;
    scheduleSave();
    updateLineTotalCell(id);
    refreshAll();
  }

  function showActionStatus(msg) {
    var el = document.getElementById('actionStatus');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    window.setTimeout(function () {
      if (el) el.hidden = true;
    }, 3200);
  }

  // ---------------------------------------------------------------------------
  // Print
  // ---------------------------------------------------------------------------

  function handlePrint() {
    trackQg('qg_print');
    window.print();
  }

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
    var lines = [];
    lines.push(csvRow(['Section', 'Field', 'Value']));
    lines.push(csvRow(['Business', 'Name', state.business.name]));
    lines.push(csvRow(['Business', 'Phone', state.business.phone]));
    lines.push(csvRow(['Business', 'Email', state.business.email]));
    lines.push(csvRow(['Business', 'Address', state.business.address]));
    lines.push(csvRow(['Customer', 'Name', state.customer.name]));
    lines.push(csvRow(['Customer', 'Phone', state.customer.phone]));
    lines.push(csvRow(['Customer', 'Email', state.customer.email]));
    lines.push(csvRow(['Customer', 'Address', state.customer.address]));
    lines.push(csvRow(['Meta', 'Quotation number', state.meta.quoteNumber]));
    lines.push(csvRow(['Meta', 'Date', state.meta.quoteDate]));
    lines.push(csvRow(['Meta', 'Valid until', state.meta.validUntil]));
    lines.push(csvRow(['Meta', 'Currency', state.meta.currency]));
    lines.push(csvRow(['Meta', 'Status', state.meta.statusLabel]));
    var t = computeTotals();
    lines.push(csvRow(['Totals', 'Subtotal', formatMoney(t.subtotal)]));
    lines.push(csvRow(['Totals', 'Discount', formatMoney(t.discount)]));
    lines.push(csvRow(['Totals', 'Tax', formatMoney(t.tax)]));
    lines.push(csvRow(['Totals', 'Grand total', formatMoney(t.grand)]));
    lines.push(csvRow(['Extra', 'Notes', state.notes]));
    lines.push(csvRow(['Extra', 'Terms', state.terms]));
    state.lines.forEach(function (row, i) {
      var lt = lineRowTotal(row.quantity, row.unitPrice);
      lines.push(
        csvRow([
          'Line',
          String(i + 1),
          row.description +
            ' | qty ' +
            row.quantity +
            ' | unit ' +
            row.unitPrice +
            ' | line ' +
            formatMoney(lt),
        ]),
      );
    });
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
    downloadCsv('quotation-' + filenameDate() + '.csv', buildCsv());
    showActionStatus('CSV download started.');
    trackQg('qg_export_csv');
  }

  // ---------------------------------------------------------------------------
  // Summary text
  // ---------------------------------------------------------------------------

  function buildSummaryText() {
    var t = computeTotals();
    var lines = [];
    lines.push('Quotation Generator — summary');
    lines.push('Business: ' + (state.business.name || '—'));
    lines.push('Customer: ' + (state.customer.name || '—'));
    lines.push('Quote #: ' + (state.meta.quoteNumber || '—'));
    lines.push('Date: ' + (state.meta.quoteDate || '—'));
    lines.push('Valid until: ' + (state.meta.validUntil || '—'));
    lines.push('Currency: ' + (state.meta.currency || 'USD'));
    if (state.meta.statusLabel.trim()) lines.push('Status: ' + state.meta.statusLabel);
    lines.push('');
    lines.push('Line items:');
    state.lines.forEach(function (row, i) {
      var lt = lineRowTotal(row.quantity, row.unitPrice);
      lines.push(
        '  ' +
          (i + 1) +
          '. ' +
          (row.description || '(no description)') +
          ' | qty ' +
          (row.quantity || '0') +
          ' × ' +
          formatWithCurrency(safeMoney(row.unitPrice)) +
          ' = ' +
          formatWithCurrency(lt),
      );
    });
    lines.push('');
    lines.push('Subtotal: ' + formatWithCurrency(t.subtotal));
    lines.push('Discount: ' + formatWithCurrency(t.discount));
    lines.push('Tax: ' + formatWithCurrency(t.tax));
    lines.push('Grand total: ' + formatWithCurrency(t.grand));
    if (state.notes.trim()) {
      lines.push('');
      lines.push('Notes:');
      lines.push(state.notes);
    }
    if (state.terms.trim()) {
      lines.push('');
      lines.push('Terms:');
      lines.push(state.terms);
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
    trackQg('qg_export_summary');
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

  function bindField(id, path, key) {
    var el = document.getElementById(id);
    if (!el) return;
    function apply() {
      if (path === 'business') state.business[key] = el.value;
      else if (path === 'customer') state.customer[key] = el.value;
      else if (path === 'meta') state.meta[key] = el.value;
      else if (path === 'root') state[key] = el.value;
      scheduleSave();
      refreshAll();
    }
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', apply);
    } else {
      el.addEventListener('input', apply);
    }
  }

  function bindEvents() {
    bindField('bizName', 'business', 'name');
    bindField('bizPhone', 'business', 'phone');
    bindField('bizEmail', 'business', 'email');
    bindField('bizAddress', 'business', 'address');
    bindField('custName', 'customer', 'name');
    bindField('custPhone', 'customer', 'phone');
    bindField('custEmail', 'customer', 'email');
    bindField('custAddress', 'customer', 'address');
    bindField('quoteNumber', 'meta', 'quoteNumber');
    bindField('quoteDate', 'meta', 'quoteDate');
    bindField('validUntil', 'meta', 'validUntil');
    bindField('currency', 'meta', 'currency');
    bindField('statusLabel', 'meta', 'statusLabel');
    bindField('discountAmount', 'root', 'discountAmount');
    bindField('taxAmount', 'root', 'taxAmount');
    bindField('notes', 'root', 'notes');
    bindField('terms', 'root', 'terms');

    document.getElementById('btn-add-line').addEventListener('click', addLine);

    var tbody = document.getElementById('linesBody');
    tbody.addEventListener('input', function (e) {
      var t = e.target;
      var tr = t.closest('tr[data-line-id]');
      if (!tr || !t.dataset.field) return;
      onLineInput(tr, t.dataset.field, t.value);
    });
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="remove-line"]');
      if (!btn) return;
      var tr = btn.closest('tr[data-line-id]');
      if (tr) removeLine(tr.getAttribute('data-line-id'));
    });

    document.getElementById('btn-example').addEventListener('click', function () {
      loadExampleQuotation();
      renderSetupFields();
      renderLineRows();
      refreshAll();
      showActionStatus('Example quotation loaded.');
      trackQg('qg_load_example');
    });
    document.getElementById('btn-clear').addEventListener('click', function () {
      if (confirm('Clear all quotation data from this browser?')) {
        clearAllData();
        renderSetupFields();
        renderLineRows();
        refreshAll();
        showActionStatus('All data cleared.');
        trackQg('qg_clear_all');
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
    var had = loadState();
    if (!had || state.lines.length === 0) {
      state.lines = [{ id: generateId(), description: '', quantity: '', unitPrice: '' }];
    }
    renderSetupFields();
    renderLineRows();
    bindEvents();
    refreshAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
