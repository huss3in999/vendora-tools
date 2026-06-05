/* Shared GA4 event helpers (requires gtag from page head). */
(function () {
  'use strict';
  function track(eventName, params) {
    if (typeof window.vendoraTrackLocal === 'function') {
      try {
        window.vendoraTrackLocal(eventName, params || {});
        if (eventName !== 'calculator_used' && eventName !== 'calculator_use') {
          var slug = (window.location.pathname || '').split('/').filter(Boolean).pop() || 'calculator';
          window.vendoraTrackLocal('calculator_used', {
            calculator_event: eventName,
            calculator_slug: slug
          });
        }
        return;
      } catch (e) {}
    }

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

  if (typeof window.vendoraTrack !== 'function' || !window.vendoraTrackLocal) {
    window.vendoraTrack = track;
  }
})();
