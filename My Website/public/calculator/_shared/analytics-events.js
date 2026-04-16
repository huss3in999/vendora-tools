/* Shared GA4 event helpers (requires gtag from page head). */
(function () {
  'use strict';
  function track(eventName, params) {
    if (typeof gtag !== 'function') return;
    gtag('event', eventName, params || {});
  }
  window.vendoraTrack = track;
})();
