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

  function normalizePath(value) {
    var next = String(value || '/').replace(/\\/g, '/').toLowerCase();
    return next.charAt(0) === '/' ? next : '/' + next;
  }

  function isPrivatePath(path) {
    return /(^|\/)(admin|api|private|test|tests|test-results)(\/|$)/.test(path);
  }

  function getPageCategory() {
    var path = normalizePath(window.location.pathname || '/');
    if (isPrivatePath(path)) return 'private';
    if (path.indexOf('/bahrain-saudi-gcc-transport/') !== -1) return 'transport';
    if (path.indexOf('/tools/pdf-converter/') !== -1 || path.indexOf('/pdf/') !== -1 || path.indexOf('/pdf-tools/') !== -1) return 'pdf_tools';
    if (path.indexOf('/tools/small-business/') !== -1) return 'business_tools';
    if (
      path.indexOf('/tools/food-cost-calculator/') !== -1 ||
      path.indexOf('/tools/menu-price-calculator/') !== -1 ||
      path.indexOf('/tools/daily-sales-summary/') !== -1 ||
      path.indexOf('/tools/restaurant-profit-dashboard/') !== -1 ||
      path.indexOf('/tools/qr-menu-generator/') !== -1 ||
      path.indexOf('/restaurant-calculators/') !== -1 ||
      path.indexOf('/calculator/restaurant/') !== -1
    ) {
      return 'restaurant_tools';
    }
    if (path.indexOf('/calculator/') !== -1 || path.indexOf('/calculators/') !== -1) return 'calculators';
    if (
      path.indexOf('/article/') !== -1 ||
      path.indexOf('/articles/') !== -1 ||
      path.indexOf('/guide/') !== -1 ||
      path.indexOf('/guides/') !== -1 ||
      path.indexOf('/blog/') !== -1
    ) {
      return 'articles';
    }
    return 'other';
  }

  function getTransportRoute() {
    var path = normalizePath(window.location.pathname || '/');
    if (path.indexOf('/bahrain-saudi-gcc-transport/') === -1) return '';
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    if (last === 'index.html') last = parts[parts.length - 2] || '';
    if (!last || last === 'bahrain-saudi-gcc-transport' || last === 'en') return 'transport_hub';
    return last;
  }

  function getTransportCluster() {
    var path = normalizePath(window.location.pathname || '/');
    if (path.indexOf('arbaeen') !== -1) return 'arbaeen';
    if (path.indexOf('ziyarat') !== -1) return 'ziyarat';
    if (path.indexOf('karbala') !== -1) return 'karbala';
    if (path.indexOf('najaf') !== -1) return 'najaf';
    if (path.indexOf('iraq') !== -1 || path.indexOf('baghdad') !== -1 || path.indexOf('basra') !== -1) return 'iraq';
    return '';
  }

  function analyticsContext(extra) {
    var category = getPageCategory();
    var params = {
      content_group: category,
      page_category: category,
      page_path: window.location.pathname || '/',
      page_url: window.location.href.split('#')[0],
      language: (document.documentElement.getAttribute('lang') || 'en').toLowerCase(),
    };
    if (category === 'transport') {
      params.route_name = getTransportRoute();
      params.transport_cluster = getTransportCluster();
    }
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        if (extra[key] !== undefined && extra[key] !== null && extra[key] !== '') {
          params[key] = extra[key];
        }
      });
    }
    return params;
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
    window.gtag('config', gaId, analyticsContext({ send_page_view: true }));
  }

  function loadAnalyticsRouter() {
    if (getPageCategory() === 'private') return;
    appendScript('/js/analytics-router.js', { defer: 'defer' });
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
  loadAnalyticsRouter();

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadSecondaryTools, { timeout: 2500 });
  } else {
    window.setTimeout(loadSecondaryTools, 1);
  }

  window.vendoraToolEvent = function (name, params) {
    try {
      window.gtag('event', name, analyticsContext(params || {}));
    } catch (e) {
      /* ignore */
    }
  };

  window.vendoraAnalyticsContext = analyticsContext;
})();
