/**
 * Vendora marketing analytics (same stack as getvendora.net Arabic pages).
 * GA4 ID matches production: https://getvendora.net/assets/analytics-loader.js
 *
 * Optional overrides:
 *   <meta name="ga4-measurement-id" content="G-XXXX" />
 *   <script>window.__GA4_MEASUREMENT_ID__ = 'G-XXXX';</script>  (before this file)
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

  function loadAnalytics() {
    if (gaId && gaId.indexOf('G-') === 0) {
      appendScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId));
      window.gtag('js', new Date());
      window.gtag('config', gaId);
    }

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

  function scheduleLoad() {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadAnalytics, { timeout: 3000 });
      return;
    }
    window.setTimeout(loadAnalytics, 1500);
  }

  if (document.readyState === 'complete') {
    scheduleLoad();
  } else {
    window.addEventListener('load', scheduleLoad, { once: true });
  }

  window.vendoraToolEvent = function (name, params) {
    try {
      window.gtag('event', name, params || {});
    } catch (e) {
      /* ignore */
    }
  };
})();
