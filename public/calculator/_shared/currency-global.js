/**
 * Worldwide ISO 4217 currency support /public/data/currencies.json (active codes).
 * API mirrors legacy VendoraCurrency for drop-in: initSyncedCurrencySelects, getCurrency, formatMoney.
 */
(function () {
  'use strict';

  var CURRENCIES = null;
  var LOAD = null;
  var CODE_INDEX = null;

  function load() {
    if (LOAD) return LOAD;
    LOAD = fetch('/data/currencies.json', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('currencies load failed');
        return r.json();
      })
      .then(function (data) {
        CURRENCIES = Array.isArray(data) ? data : [];
        CODE_INDEX = {};
        for (var i = 0; i < CURRENCIES.length; i++) {
          var c = CURRENCIES[i];
          if (c && c.code) CODE_INDEX[c.code] = c;
        }
        return CURRENCIES;
      });
    return LOAD;
  }

  function symbolFor(code) {
    try {
      var parts = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
      }).formatToParts(0);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'currency') return parts[i].value || code;
      }
    } catch (e) {}
    return code;
  }

  function optionLabel(item) {
    var sym = symbolFor(item.code);
    var extra = sym && sym !== item.code ? ' (' + sym + ')' : '';
    return item.code + ' — ' + item.name + extra;
  }

  function populateSelect(sel, defaultCode) {
    if (!sel || !CURRENCIES) return;
    sel.innerHTML = '';
    for (var i = 0; i < CURRENCIES.length; i++) {
      var it = CURRENCIES[i];
      var opt = document.createElement('option');
      opt.value = it.code;
      opt.textContent = optionLabel(it);
      sel.appendChild(opt);
    }
    var d = defaultCode || sel.getAttribute('data-currency-default') || 'USD';
    if (CODE_INDEX && CODE_INDEX[d]) sel.value = d;
    else sel.value = CODE_INDEX && CODE_INDEX.USD ? 'USD' : CURRENCIES[0].code;
  }

  function syncGroup(groupName, newValue) {
    var all = document.querySelectorAll('select[data-currency-sync="' + groupName + '"]');
    for (var i = 0; i < all.length; i++) all[i].value = newValue;
    var spans = document.querySelectorAll('[data-currency-unit="' + groupName + '"]');
    for (var j = 0; j < spans.length; j++) {
      var template = spans[j].getAttribute('data-unit-template') || '{CUR}';
      spans[j].textContent = template.replace(/\{CUR\}/g, newValue);
    }
  }

  function initSyncedCurrencySelects(groupName, defaultCode) {
    if (!CURRENCIES) return;
    var group = groupName || 'global';
    var selects = document.querySelectorAll('select[data-currency-sync="' + group + '"]');
    if (!selects.length) return;
    for (var i = 0; i < selects.length; i++) populateSelect(selects[i], defaultCode);
    var initial = selects[0].value || defaultCode || 'USD';
    syncGroup(group, initial);
    for (var k = 0; k < selects.length; k++) {
      (function (sel) {
        sel.addEventListener('change', function () {
          syncGroup(group, sel.value || 'USD');
        });
      })(selects[k]);
    }
  }

  function getCurrency(groupName, fallback) {
    var group = groupName || 'global';
    var sel = document.querySelector('select[data-currency-sync="' + group + '"]');
    return (sel && sel.value) || fallback || 'USD';
  }

  function formatMoney(amount, currencyCode) {
    var code = currencyCode || 'USD';
    var n = Number(amount);
    if (!Number.isFinite(n)) return '—';
    var meta = CODE_INDEX && CODE_INDEX[code];
    var opts = {
      style: 'currency',
      currency: code,
    };
    if (meta && typeof meta.minorUnits === 'number') {
      opts.minimumFractionDigits = meta.minorUnits;
      opts.maximumFractionDigits = meta.minorUnits;
    } else {
      opts.minimumFractionDigits = 2;
      opts.maximumFractionDigits = 2;
    }
    try {
      return new Intl.NumberFormat(undefined, opts).format(n);
    } catch (e) {
      return (
        code +
        ' ' +
        n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      );
    }
  }

  window.VendoraCurrencyGlobal = {
    ready: load,
    initSyncedCurrencySelects: initSyncedCurrencySelects,
    getCurrency: getCurrency,
    formatMoney: formatMoney,
    /** @returns {Promise<void>} */
    bootstrap: function (groupName, defaultCode) {
      return load().then(function () {
        initSyncedCurrencySelects(groupName || 'global', defaultCode || 'USD');
      });
    },
  };
})();
