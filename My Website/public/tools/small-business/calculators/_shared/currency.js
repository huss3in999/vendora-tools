/* Shared currency helpers for Small Business calculators.
   Keeps currency selectors in sync and formats money with Intl. */
(function () {
  'use strict';

  var CURRENCIES = [
    ['USD', 'US Dollar (USD)'],
    ['EUR', 'Euro (EUR)'],
    ['GBP', 'UK Pound (GBP)'],
    ['RON', 'Romanian Leu (RON)'],
    ['AED', 'UAE Dirham (AED)'],
    ['SAR', 'Saudi Riyal (SAR)'],
    ['QAR', 'Qatari Riyal (QAR)'],
    ['KWD', 'Kuwaiti Dinar (KWD)'],
    ['BHD', 'Bahraini Dinar (BHD)'],
    ['OMR', 'Omani Rial (OMR)'],
    ['JOD', 'Jordanian Dinar (JOD)'],
    ['EGP', 'Egyptian Pound (EGP)'],
    ['TRY', 'Turkish Lira (TRY)'],
    ['INR', 'Indian Rupee (INR)'],
    ['PKR', 'Pakistani Rupee (PKR)'],
    ['BDT', 'Bangladeshi Taka (BDT)'],
    ['JPY', 'Japanese Yen (JPY)'],
    ['CNY', 'Chinese Yuan (CNY)'],
    ['KRW', 'Korean Won (KRW)'],
    ['SGD', 'Singapore Dollar (SGD)'],
    ['HKD', 'Hong Kong Dollar (HKD)'],
    ['AUD', 'Australian Dollar (AUD)'],
    ['NZD', 'New Zealand Dollar (NZD)'],
    ['CAD', 'Canadian Dollar (CAD)'],
    ['CHF', 'Swiss Franc (CHF)'],
    ['SEK', 'Swedish Krona (SEK)'],
    ['NOK', 'Norwegian Krone (NOK)'],
    ['DKK', 'Danish Krone (DKK)'],
    ['PLN', 'Polish Zloty (PLN)'],
    ['CZK', 'Czech Koruna (CZK)'],
    ['HUF', 'Hungarian Forint (HUF)'],
    ['ZAR', 'South African Rand (ZAR)'],
    ['BRL', 'Brazilian Real (BRL)'],
    ['MXN', 'Mexican Peso (MXN)'],
  ];

  function populateSelect(sel, defaultCode) {
    if (!sel) return;
    var existing = sel.querySelectorAll('option');
    if (existing && existing.length > 1) return; // already populated
    sel.innerHTML = '';
    for (var i = 0; i < CURRENCIES.length; i++) {
      var code = CURRENCIES[i][0];
      var label = CURRENCIES[i][1];
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = label;
      sel.appendChild(opt);
    }
    var toSet = defaultCode || sel.getAttribute('data-currency-default') || 'USD';
    sel.value = toSet;
  }

  function syncGroup(groupName, newValue) {
    var all = document.querySelectorAll('select[data-currency-sync="' + groupName + '"]');
    for (var i = 0; i < all.length; i++) all[i].value = newValue;
    // Optional: update any unit spans bound to this group.
    var spans = document.querySelectorAll('[data-currency-unit="' + groupName + '"]');
    for (var j = 0; j < spans.length; j++) {
      var template = spans[j].getAttribute('data-unit-template') || '{CUR}';
      spans[j].textContent = template.replace(/\{CUR\}/g, newValue);
    }
  }

  function initSyncedCurrencySelects(groupName, defaultCode) {
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
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch (e) {
      return code + ' ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  window.VendoraCurrency = {
    initSyncedCurrencySelects: initSyncedCurrencySelects,
    getCurrency: getCurrency,
    formatMoney: formatMoney,
  };
})();

