/**
 * Vendora Transport event layer.
 * Uses the shared GA4/D1 loader and contains no credentials or personal data.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__VENDORA_TRANSPORT_ANALYTICS_READY__) return;
  window.__VENDORA_TRANSPORT_ANALYTICS_READY__ = true;

  var path = String(window.location.pathname || '/').replace(/\/index\.html$/i, '/');
  if (/(^|\/)(admin|care|api|ai-chat-test)(\/|$)/i.test(path)) return;
  var dnt = String(navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack || '').toLowerCase();
  if (dnt === '1' || dnt === 'yes') return;

  var startedAt = Date.now();
  var eventSeen = typeof WeakSet === 'function' ? new WeakSet() : null;
  var map = window.VENDORA_TRANSPORT_ANALYTICS_MAP || { routes: {}, hubs: {}, services: {} };

  function slugFromPath(value) {
    var parts = String(value || '').split('/').filter(Boolean);
    if (parts[0] === 'bahrain-saudi-gcc-transport') parts.shift();
    if (parts[0] === 'en') parts.shift();
    return parts[0] || 'home';
  }

  var slug = slugFromPath(path);
  var metadata = map.routes[slug] || map.hubs[slug] || map.services[slug] || {};
  var language = (document.documentElement.getAttribute('lang') || (path.indexOf('/en/') >= 0 ? 'en' : 'ar')).toLowerCase();

  function sourceName() {
    var params = new URLSearchParams(window.location.search || '');
    var key = '__vendora_session_traffic_source';
    var stored = '';
    try { stored = sessionStorage.getItem(key) || ''; } catch (_) { /* restricted storage */ }
    var source = '';
    if (params.get('utm_source')) source = String(params.get('utm_source')).slice(0, 80);
    else if (document.referrer) {
      try {
        var referrerHost = new URL(document.referrer).hostname.replace(/^www\./, '');
        var currentHost = String(window.location.hostname || '').replace(/^www\./, '');
        if (referrerHost && referrerHost !== currentHost) source = referrerHost.slice(0, 120);
      } catch (_) { source = 'referral'; }
    }
    source = source || stored || 'direct';
    try { if (!stored || stored === 'direct') sessionStorage.setItem(key, source); } catch (_) { /* restricted storage */ }
    return source;
  }

  function deviceCategory() {
    var ua = navigator.userAgent || '';
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function ctaLocation(node) {
    if (!node || !node.closest) return 'unknown';
    if (node.closest('header')) return 'header';
    if (node.closest('footer')) return 'footer';
    if (node.closest('.hero')) return 'hero';
    if (node.closest('[data-booking-form], .booking-card')) return 'booking';
    if (node.closest('.floating-wa, [data-vip-bottom-whatsapp]')) return 'floating';
    if (node.closest('[data-vendora-feedback-widget]')) return 'feedback_widget';
    return 'body';
  }

  function context(extra) {
    var result = {
      page_path: path,
      page_title: document.title || '',
      language: language,
      route_id: metadata.route_id || '',
      route_name: slug,
      origin_country: metadata.origin_country || '',
      destination_country: metadata.destination_country || '',
      service_type: metadata.service_type || 'transport_information',
      traffic_source: sourceName(),
      device_category: deviceCategory(),
      timestamp: new Date().toISOString()
    };
    Object.keys(extra || {}).forEach(function (key) {
      var value = extra[key];
      if (value !== undefined && value !== null && value !== '') result[key] = value;
    });
    return result;
  }

  function emit(name, extra) {
    if (!name || window.__VENDORA_TRACKING_DISABLED__) return;
    var params = context(extra || {});
    if (typeof window.vendoraTrackLocal === 'function') {
      window.vendoraTrackLocal(name, params);
      return;
    }
    window.__VENDORA_PENDING_TRANSPORT_EVENTS__ = window.__VENDORA_PENDING_TRANSPORT_EVENTS__ || [];
    window.__VENDORA_PENDING_TRANSPORT_EVENTS__.push([name, params]);
  }

  function safeLinkType(href) {
    var value = String(href || '').toLowerCase();
    if (value.indexOf('wa.me/') >= 0 || value.indexOf('api.whatsapp.com/') >= 0) return 'whatsapp';
    if (value.indexOf('tel:') === 0) return 'phone';
    if (value.indexOf('maps.') >= 0 || value.indexOf('goo.gl/maps') >= 0 || value.indexOf('maps.app.goo.gl') >= 0) return 'map';
    return '';
  }

  function navigationType(link, href) {
    if (link.hasAttribute('data-reverse-route')) return 'reverse_route';
    if (/\/transport-from-|\/gcc-destinations\//.test(href)) return 'country_hub';
    if (link.hasAttribute('data-language-toggle') || link.hasAttribute('data-language-nav')) return 'language';
    return 'internal';
  }

  function handleClick(event) {
    if (eventSeen && eventSeen.has(event)) return;
    if (eventSeen) eventSeen.add(event);
    var link = event.target && event.target.closest ? event.target.closest('a,button') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var location = ctaLocation(link);
    var type = safeLinkType(href);
    var buttonText = String(link.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);

    if (type === 'whatsapp' || link.hasAttribute('data-wa-message') || link.hasAttribute('data-booking-submit')) {
      emit('whatsapp_click', {
        cta_location: location,
        button_text: buttonText,
        target_url: href,
        method: 'whatsapp'
      });
      if (link.hasAttribute('data-booking-submit') || /quote|quotation|عرض سعر|السعر/.test(buttonText.toLowerCase())) {
        emit('booking_submit', { cta_location: location });
        emit('quote_request', { cta_location: location });
      }
      return;
    }
    if (type === 'phone') {
      emit('phone_click', { cta_location: location, method: 'phone' });
      return;
    }
    if (type === 'map') {
      emit('map_click', { cta_location: location, method: 'map' });
      return;
    }
    if (link.matches('[data-vendora-feedback-widget] *, #vendoraFeedbackBtn')) {
      emit('feedback_widget_open', { cta_location: 'feedback_widget' });
      return;
    }
    if (href && (href.charAt(0) === '/' || href.charAt(0) === '.' || href.charAt(0) === '#')) {
      var navType = navigationType(link, href);
      emit(navType === 'language' ? 'language_switch' : 'navigation_click', {
        cta_location: location,
        navigation_type: navType,
        target_path: href.split('?')[0].slice(0, 300)
      });
      if (/\/complaints\//.test(href)) emit('complaint_open', { cta_location: location });
      if (/\/customer-reviews\//.test(href)) emit('review_open', { cta_location: location });
      if (link.closest('[data-route-card], .route-card, .destination-card')) emit('route_card_click', { cta_location: location, target_path: href.split('?')[0].slice(0, 300) });
    }
  }

  function bindForms() {
    document.querySelectorAll('[data-booking-form]').forEach(function (form) {
      var started = false;
      form.addEventListener('input', function () {
        if (started) return;
        started = true;
        emit('booking_start', { cta_location: 'booking' });
      }, { passive: true });
      form.addEventListener('change', function (event) {
        var field = event.target && event.target.getAttribute ? event.target.getAttribute('data-booking') : '';
        var allowed = {
          'from-country': ['origin_selected', 'origin'], 'from-city': ['origin_selected', 'origin'],
          'to-country': ['destination_selected', 'destination'], 'to-city': ['destination_selected', 'destination'],
          route: ['route_selected', 'route_selected'], date: ['travel_date_selected', 'travel_date'],
          time: ['travel_time_selected', 'travel_time'], passengers: ['passengers_selected', 'passengers']
        };
        if (!allowed[field]) return;
        var detail = { cta_location: 'booking' };
        detail[allowed[field][1]] = String(event.target.value || '').slice(0, 120);
        emit(allowed[field][0], detail);
      });
    });
    var complaint = document.getElementById('complaintForm');
    if (complaint) complaint.addEventListener('submit', function () { emit('complaint_submit', { cta_location: 'form' }); });
    var review = document.querySelector('[data-review-form], #reviewForm');
    if (review) review.addEventListener('submit', function () { emit('review_submit', { cta_location: 'form' }); });

    if (/planner|calculator/.test(slug)) {
      emit('calculator_open', { service_type: 'route_planner' });
      var planner = document.querySelector('form, [data-planner], [data-gcc-planner]');
      var plannerStarted = false;
      if (planner) planner.addEventListener('input', function () {
        if (plannerStarted) return;
        plannerStarted = true;
        emit('planner_start', { service_type: 'route_planner' });
      }, { passive: true });
      document.addEventListener('click', function (event) {
        var complete = event.target && event.target.closest ? event.target.closest('[data-planner-submit], [data-calculate], [data-generate-quote], button[type="submit"]') : null;
        if (complete) emit('planner_complete', { service_type: 'route_planner', cta_location: ctaLocation(complete) });
      });
    }
  }

  function bindFaqs() {
    document.querySelectorAll('details').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        var summary = details.querySelector('summary');
        var text = String(summary ? summary.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (details.matches('[data-faq], .faq-item') || details.closest('[data-faq], .faq, #faq') || /\?|؟/.test(text)) {
          emit('faq_open', { event_label: text, cta_location: 'faq' });
        }
      });
    });
  }

  function initialEvents() {
    if (metadata.page_type === 'route') emit('route_view');
    if (metadata.page_type === 'country_hub') emit('country_hub_view');
    if (metadata.page_type === 'chauffeur_hub' || metadata.page_type === 'chauffeur_service') emit('chauffeur_service_view', { service_id: metadata.service_id || 'chauffeur-services' });
    if (slug === 'prices') emit('price_view');
    if (/policy|terms|privacy|passenger-safety/.test(slug)) emit('policy_view', { policy_type: slug });
    if (slug === 'complaints') emit('complaint_open', { cta_location: 'page' });
    if (slug === 'customer-reviews') emit('review_open', { cta_location: 'page' });
  }

  var maxScrollDepth = 0;
  var engagementSent = false;

  function updateScrollDepth() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop || 0;
    var scrollable = Math.max(1, (doc.scrollHeight || 0) - (window.innerHeight || doc.clientHeight || 0));
    maxScrollDepth = Math.max(maxScrollDepth, Math.min(100, Math.round((scrollTop / scrollable) * 100)));
  }

  function sendPageEngagement() {
    if (engagementSent) return;
    engagementSent = true;
    updateScrollDepth();
    emit('page_engagement', {
      timeOnPageMs: Math.max(0, Date.now() - startedAt),
      scrollDepthPercent: maxScrollDepth,
      session_duration_ms: Math.max(0, Date.now() - startedAt),
      last_action: document.activeElement && document.activeElement.tagName ? document.activeElement.tagName.toLowerCase() : 'viewing'
    });
  }

  function heartbeat() {
    if (document.visibilityState === 'hidden') return;
    emit('session_heartbeat', { session_duration_ms: Date.now() - startedAt, last_action: document.activeElement && document.activeElement.tagName ? document.activeElement.tagName.toLowerCase() : 'viewing' });
  }

  window.vendoraTransportAnalytics = { emit: emit, context: context, metadata: metadata };
  document.addEventListener('click', handleClick, { capture: true });
  window.addEventListener('scroll', updateScrollDepth, { passive: true });
  window.addEventListener('pagehide', sendPageEngagement, { capture: true });
  bindForms();
  bindFaqs();
  initialEvents();
  window.setInterval(heartbeat, 60 * 1000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') heartbeat();
    else sendPageEngagement();
  });
})();
