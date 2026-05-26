/* Shared GA4 event helpers (requires gtag from page head). */
(function () {
  'use strict';
  function track(eventName, params) {
    if (typeof gtag !== 'function') return;
    var safeParams = params || {};
    if (typeof window.vendoraAnalyticsContext === 'function') {
      safeParams = window.vendoraAnalyticsContext(safeParams);
    }
    gtag('event', eventName, safeParams);
    if (eventName !== 'calculator_use') {
      var slug = (window.location.pathname || '').split('/').filter(Boolean).pop() || 'calculator';
      var calculatorParams = {
        calculator_event: eventName,
        calculator_slug: slug,
      };
      if (typeof window.vendoraAnalyticsContext === 'function') {
        calculatorParams = window.vendoraAnalyticsContext(calculatorParams);
      }
      gtag('event', 'calculator_use', calculatorParams);
    }
  }
  window.vendoraTrack = track;
})();
