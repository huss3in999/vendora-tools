/**
 * Vendora marketing analytics (same Measurement ID as getvendora.net).
 * GA4 sends hits as soon as this script runs — do not defer until window.load
 * or Realtime / debugging will look empty while images still load.
 *
 * Optional overrides:
 *   <meta name="ga4-measurement-id" content="G-XXXX" />
 *   <script>window.__GA4_MEASUREMENT_ID__ = 'G-XXXX';</script>
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var DEFAULT_GA4_ID = 'G-DFY197R2MS';

  var fromWin = typeof window.__GA4_MEASUREMENT_ID__ === 'string' ? window.__GA4_MEASUREMENT_ID__.trim() : '';
  var meta = document.querySelector('meta[name="ga4-measurement-id"]');
  var fromMeta = meta ? String(meta.getAttribute('content') || '').trim() : '';
  var gaId = fromWin || fromMeta || DEFAULT_GA4_ID;

  var head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };

  window.clarity =
    window.clarity ||
    function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

  function appendScript(src, attrs) {
    if (!src || document.querySelector('script[src="' + src + '"]')) return;
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        script.setAttribute(key, attrs[key]);
      });
    }
    head.appendChild(script);
  }

  var isLocalPreview =
    window.location.protocol === 'file:' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'localhost';

  /** GA4: fire immediately (recommended GA behaviour). */
  function loadGa4() {
    if (!gaId || gaId.indexOf('G-') !== 0) return;
    appendScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId));
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: true });
  }

  /** Clarity + CF Web Analytics: non-blocking, after GA. */
  function loadSecondaryTools() {
    appendScript('https://www.clarity.ms/tag/w28z01fb1p');

    if (isLocalPreview) return;

    appendScript(
      'https://static.cloudflareinsights.com/beacon.min.js/v8c78df7c7c0f484497ecbca7046644da1771523124516',
      {
        defer: 'defer',
        integrity: 'sha512-8DS7rgIrAmghBFwoOTujcf6D9rXvH8xm8JQ1Ja01h9QX8EzXldiszufYa4IFfKdLUKTTrnSFXLDkUEOTrZQ8Qg==',
        crossorigin: 'anonymous',
        'data-cf-beacon':
          '{"version":"2024.11.0","token":"1b5d66d169ce4d759bd3ead40f0fcc60","r":1,"server_timing":{"name":{"cfCacheStatus":true,"cfEdge":true,"cfExtPri":true,"cfL4":true,"cfOrigin":true,"cfSpeedBrain":true},"location_startswith":null}}',
      }
    );
  }

  loadGa4();

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadSecondaryTools, { timeout: 2500 });
  } else {
    window.setTimeout(loadSecondaryTools, 1);
  }

  window.vendoraToolEvent = function (name, params) {
    try {
      window.gtag('event', name, params || {});
    } catch (e) {
      /* ignore */
    }
  };
})();
