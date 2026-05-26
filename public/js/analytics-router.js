/**
 * Vendora GA4 analytics router.
 * Adds lightweight category and conversion events without loading GA twice.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__VENDORA_ANALYTICS_ROUTER_READY__) return;
  window.__VENDORA_ANALYTICS_ROUTER_READY__ = true;

  var path = normalizePath(window.location.pathname || '/');
  if (/(^|\/)(admin|api|private|test|tests|test-results)(\/|$)/.test(path)) return;
  var pageUrl = window.location.href.split('#')[0];
  var pageTitle = document.title || '';
  var language = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
  var articleReadSent = false;

  function normalizePath(value) {
    var next = String(value || '/').replace(/\\/g, '/').toLowerCase();
    return next.charAt(0) === '/' ? next : '/' + next;
  }

  function slugFromPath() {
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    return last === 'index.html' ? parts[parts.length - 2] || '' : last;
  }

  function getCategory() {
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
    if (path.indexOf('/bahrain-saudi-gcc-transport/') === -1) return '';
    var slug = slugFromPath();
    if (slug === 'bahrain-saudi-gcc-transport' || slug === 'en') return 'transport_hub';
    return slug || 'transport';
  }

  function getTransportCluster() {
    if (path.indexOf('arbaeen') !== -1) return 'arbaeen';
    if (path.indexOf('ziyarat') !== -1) return 'ziyarat';
    if (path.indexOf('karbala') !== -1) return 'karbala';
    if (path.indexOf('najaf') !== -1) return 'najaf';
    if (path.indexOf('iraq') !== -1 || path.indexOf('baghdad') !== -1 || path.indexOf('basra') !== -1) return 'iraq';
    return '';
  }

  function getButtonLocation(link) {
    if (!link) return 'unknown';
    if (link.closest('header')) return 'header';
    if (link.closest('footer')) return 'footer';
    if (link.closest('.hero')) return 'hero';
    if (link.closest('.booking-card') || link.closest('[data-booking-form]')) return 'booking';
    if (link.classList && link.classList.contains('floating-wa')) return 'floating';
    return 'body';
  }

  function baseParams(extra) {
    var category = getCategory();
    var params = {
      content_group: category,
      page_category: category,
      page_path: window.location.pathname || '/',
      page_url: pageUrl,
      page_title: pageTitle,
      language: language
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

  function emit(eventName, params) {
    if (!eventName || typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, baseParams(params || {}));
    } catch (e) {
      /* keep analytics failures silent */
    }
  }

  function setupWhatsappTracking() {
    document.addEventListener(
      'click',
      function (event) {
        var link = event.target && event.target.closest ? event.target.closest('a[href], a[data-wa-message], a[data-booking-submit]') : null;
        if (!link) return;
        var href = link.getAttribute('href') || '';
        var isWhatsapp = href.indexOf('wa.me/') !== -1 || href.indexOf('api.whatsapp.com/') !== -1 || link.hasAttribute('data-wa-message') || link.hasAttribute('data-booking-submit');
        if (!isWhatsapp) return;
        emit('whatsapp_click', {
          route_name: getTransportRoute(),
          button_location: getButtonLocation(link),
          button_text: (link.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
          link_url: href
        });
      },
      { capture: true }
    );
  }

  function setupContactTracking() {
    document.addEventListener(
      'click',
      function (event) {
        var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (!link) return;
        var href = link.getAttribute('href') || '';
        if (href.indexOf('/contact') === -1 && href.indexOf('mailto:') !== 0 && href.indexOf('tel:') !== 0) return;
        emit('contact_click', {
          route_name: getTransportRoute(),
          button_location: getButtonLocation(link),
          link_url: href
        });
      },
      { capture: true }
    );
  }

  function setupArticleReadTracking() {
    if (getCategory() !== 'articles' && path.indexOf('/bahrain-saudi-gcc-transport/') === -1) return;
    function maybeSend() {
      if (articleReadSent) return;
      var doc = document.documentElement;
      var body = document.body;
      var scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
      var height = Math.max(body.scrollHeight || 0, doc.scrollHeight || 0);
      var viewport = window.innerHeight || doc.clientHeight || 1;
      var depth = height > viewport ? Math.round((scrollTop / Math.max(1, height - viewport)) * 100) : 100;
      if (depth >= 50 || Date.now() - window.__VENDORA_ANALYTICS_STARTED_AT__ >= 30000) {
        articleReadSent = true;
        emit('article_read', {
          article_slug: slugFromPath(),
          scroll_depth: Math.max(0, Math.min(100, depth))
        });
      }
    }
    window.setTimeout(maybeSend, 30000);
    window.addEventListener('scroll', maybeSend, { passive: true });
  }

  function init() {
    window.__VENDORA_ANALYTICS_STARTED_AT__ = window.__VENDORA_ANALYTICS_STARTED_AT__ || Date.now();
    var category = getCategory();
    window.vendoraAnalytics = {
      getCategory: getCategory,
      getTransportRoute: getTransportRoute,
      getTransportCluster: getTransportCluster,
      event: emit,
      track: emit
    };

    if (category === 'transport') {
      emit('transport_page_view', {
        route_name: getTransportRoute(),
        transport_cluster: getTransportCluster()
      });
      if (getTransportRoute() !== 'transport_hub') {
        emit('route_interest', {
          route_name: getTransportRoute(),
          transport_cluster: getTransportCluster()
        });
      }
    }

    setupWhatsappTracking();
    setupContactTracking();
    setupArticleReadTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
