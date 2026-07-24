/**
 * GetVendora Unified Analytics & Tracking Loader
 * Handles dynamic GA4 configuration, Clarity loading, server-side /api/track telemetry,
 * and a real-time floating Debug Overlay if ?debug_tracking=1 is active.
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__VENDORA_UNIFIED_ANALYTICS_READY__) return;
  window.__VENDORA_UNIFIED_ANALYTICS_READY__ = true;

  var initialPath = String(window.location.pathname || '/').toLowerCase();
  var dnt = String(navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack || '').toLowerCase();
  if (/(^|\/)(admin|api|private|test|tests|test-results|care|ai-chat-test)(\/|$)/.test(initialPath) || dnt === '1' || dnt === 'yes') {
    window.__VENDORA_TRACKING_DISABLED__ = true;
    return;
  }

  var DEFAULT_GA4_ID = 'G-DFY197R2MS';

  var fromWin = typeof window.__GA4_MEASUREMENT_ID__ === 'string' ? window.__GA4_MEASUREMENT_ID__.trim() : '';
  var meta = document.querySelector('meta[name="ga4-measurement-id"]');
  var fromMeta = meta ? String(meta.getAttribute('content') || '').trim() : '';
  var gaId = fromWin || fromMeta || DEFAULT_GA4_ID;

  var head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };

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
    return /(^|\/)(admin|api|private|test|tests|test-results|care|ai-chat-test|demo|nada menu|pdf-converter-lab)(\/|$)/.test(path);
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

  function getTransportMetadata() {
    var slug = getTransportRoute();
    var map = window.VENDORA_TRANSPORT_ANALYTICS_MAP || {};
    return (map.routes && map.routes[slug])
      || (map.hubs && map.hubs[slug])
      || (map.services && map.services[slug])
      || {};
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

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Identity & Session Handlers
  function getVisitorId() {
    var key = '__vendora_visitor_id';
    var vid = localStorage.getItem(key);
    if (!vid) {
      vid = generateUUID();
      localStorage.setItem(key, vid);
    }
    return vid;
  }

  function getSessionId() {
    var key = '__vendora_session_id';
    var sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = generateUUID();
      sessionStorage.setItem(key, sid);
    }
    return sid;
  }

  function getUtmParam(name) {
    var search = window.location.search || '';
    var match = new RegExp('[?&]' + name + '=([^&]*)', 'i').exec(search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
  }

  function getTrafficSource() {
    var utm = getUtmParam('utm_source');
    if (utm) return utm.slice(0, 80);
    if (!document.referrer) return 'direct';
    try { return new URL(document.referrer).hostname.replace(/^www\./, '').slice(0, 120); } catch (e) { return 'referral'; }
  }

  function getDeviceType() {
    var ua = navigator.userAgent || '';
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getVisitCount() {
    var key = '__vendora_visit_count';
    var count = parseInt(localStorage.getItem(key) || '1', 10);
    return count;
  }

  function getSessionPageViews() {
    var key = '__vendora_session_page_views';
    var count = parseInt(sessionStorage.getItem(key) || '0', 10) + 1;
    sessionStorage.setItem(key, count);
    return count;
  }

  // Local Events Queue for Debugger Widget
  window.__vendora_debug_events = window.__vendora_debug_events || [];

  function logDebugEvent(event) {
    window.__vendora_debug_events.unshift(event);
    if (window.__vendora_debug_events.length > 10) {
      window.__vendora_debug_events.pop();
    }
    if (typeof window.__vendora_update_debug_widget === 'function') {
      window.__vendora_update_debug_widget();
    }
  }

  // Unified Local Tracking Function
  window.vendoraTrackLocal = function (eventName, params) {
    var safeParams = params || {};
    var allowedExtraKeys = {
      event_category: true, category: true, event_label: true, label: true,
      calculator_slug: true, tool_id: true, route_name: true, button_text: true,
      click_text: true, target_url: true, link_url: true, lead_status: true,
      timeOnPageMs: true, scrollDepthPercent: true, transport_cluster: true,
      content_group: true, page_category: true, method: true,
      page: true, airport: true, is_airport_route: true, click_location: true,
      custom_location_used: true, pickup_country: true, destination_country: true,
      page_path: true, page_title: true, language: true, route_id: true,
      origin_country: true, destination_country: true, service_type: true,
      service_id: true, cta_location: true, traffic_source: true,
      device_category: true, timestamp: true, booking_reference: true,
      navigation_type: true, target_path: true, policy_type: true,
      session_duration_ms: true, last_action: true
    };
    var category = getPageCategory();
    var transportMetadata = category === 'transport' ? getTransportMetadata() : {};
    
    // Core payload
    var payload = {
      event_id: generateUUID(),
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      created_at: new Date().toISOString(),
      page_url: window.location.href.split('#')[0],
      page_path: (window.location.pathname || '/').replace(/\/index\.html$/, '/'),
      referrer: document.referrer || '',
      utm_source: getUtmParam('utm_source'),
      utm_medium: getUtmParam('utm_medium'),
      utm_campaign: getUtmParam('utm_campaign'),
      event_name: eventName,
      event_category: safeParams.event_category || safeParams.category || category,
      event_label: safeParams.event_label || safeParams.label || safeParams.calculator_slug || safeParams.tool_id || '',
      route_name: getTransportRoute() || safeParams.route_name || '',
      button_text: safeParams.button_text || safeParams.click_text || '',
      target_url: safeParams.target_url || safeParams.link_url || '',
      language: (document.documentElement.getAttribute('lang') || 'en').toLowerCase(),
      page_title: document.title || '',
      route_id: safeParams.route_id || transportMetadata.route_id || '',
      origin_country: safeParams.origin_country || transportMetadata.origin_country || '',
      destination_country: safeParams.destination_country || transportMetadata.destination_country || '',
      service_type: safeParams.service_type || transportMetadata.service_type || '',
      cta_location: safeParams.cta_location || '',
      traffic_source: safeParams.traffic_source || getTrafficSource(),
      device_category: safeParams.device_category || getDeviceType(),
      timestamp: safeParams.timestamp || new Date().toISOString(),
      screen_width: window.innerWidth || document.documentElement.clientWidth || 0,
      screen_height: window.innerHeight || document.documentElement.clientHeight || 0,
      device_type: getDeviceType(),
      lead_status: safeParams.lead_status || 'new',
      // Attach visitor statistics matching transport CRM payloads
      visitCount: getVisitCount(),
      sessionPageViews: sessionStorage.getItem('__vendora_session_page_views') || '1',
      timeOnPageMs: safeParams.timeOnPageMs || 0,
      scrollDepthPercent: safeParams.scrollDepthPercent || 0
    };

    // Only aggregate, non-personal interaction context may enter general analytics.
    for (var key in safeParams) {
      if (safeParams.hasOwnProperty(key) && allowedExtraKeys[key] && !payload.hasOwnProperty(key)) {
        payload[key] = safeParams[key];
      }
    }

    // Forward to GA4 (Gtag mapping)
    if (typeof window.gtag === 'function') {
      try {
        var gaParams = Object.assign({}, Object.keys(safeParams).reduce(function (clean, key) {
          if (allowedExtraKeys[key]) clean[key] = safeParams[key];
          return clean;
        }, {}), {
          content_group: category,
          page_category: category,
          page_path: payload.page_path,
          page_title: payload.page_title,
          page_location: payload.page_url,
          language: payload.language,
          route_id: payload.route_id,
          origin_country: payload.origin_country,
          destination_country: payload.destination_country,
          service_type: payload.service_type,
          cta_location: payload.cta_location,
          traffic_source: payload.traffic_source,
          device_category: payload.device_category,
          timestamp: payload.timestamp
        });

        // 1. Recommended GA4 events mappings
        if (eventName === 'ai_chat_confirmed' || eventName === 'whatsapp_handover_created' || eventName === 'lead_created') {
          window.gtag('event', 'generate_lead', Object.assign(gaParams, { value: 0, currency: 'BHD' }));
        } else if (eventName === 'whatsapp_click' || eventName === 'phone_click') {
          window.gtag('event', 'contact', Object.assign(gaParams, { method: eventName === 'whatsapp_click' ? 'whatsapp' : 'phone' }));
        } else if (eventName === 'route_page_view' || eventName === 'route_view') {
          window.gtag('event', 'select_content', Object.assign(gaParams, { content_type: 'route', item_id: payload.route_name }));
        } else if (eventName === 'calculator_view') {
          window.gtag('event', 'select_content', Object.assign(gaParams, { content_type: 'calculator', item_id: payload.event_label }));
        } else if (eventName === 'ai_chat_message_sent') {
          window.gtag('event', 'search', Object.assign(gaParams, { search_term: '[chat message]' }));
        }

        // 2. Fire original custom GA4 events
        window.gtag('event', eventName, gaParams);
      } catch (err) {
        console.error('[Tracking] GA4 dispatch failure:', err);
      }
    }

    // POST Telemetry Server-Side
    var url = '/api/track';
    var payloadStr = JSON.stringify(payload);
    var debugLog = { name: eventName, timestamp: new Date().toLocaleTimeString(), status: 'sending', error: null };
    logDebugEvent(debugLog);

    try {
      if (typeof navigator.sendBeacon === 'function' && (eventName.indexOf('click') !== -1 || eventName.indexOf('handover') !== -1)) {
        var success = navigator.sendBeacon(url, payloadStr);
        if (success) {
          debugLog.status = 'sent (beacon)';
          logDebugEvent(debugLog);
          return;
        }
      }
      
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payloadStr,
        keepalive: true
      })
      .then(function (r) {
        if (r.ok) {
          debugLog.status = 'success (202)';
        } else {
          debugLog.status = 'error';
          debugLog.error = 'HTTP ' + r.status;
        }
        logDebugEvent(debugLog);
      })
      .catch(function (err) {
        debugLog.status = 'failed';
        debugLog.error = err.message || String(err);
        logDebugEvent(debugLog);
      });
    } catch (err) {
      debugLog.status = 'exception';
      debugLog.error = err.message || String(err);
      logDebugEvent(debugLog);
    }
  };

  // Standard context builder (GA4 compatible)
  function analyticsContext(extra) {
    var category = getPageCategory();
    var transportMetadata = category === 'transport' ? getTransportMetadata() : {};
    var params = {
      content_group: category,
      page_category: category,
      page_path: (window.location.pathname || '/').replace(/\/index\.html$/, '/'),
      page_url: window.location.href.split('#')[0],
      language: (document.documentElement.getAttribute('lang') || 'en').toLowerCase(),
      page_title: document.title || '',
      traffic_source: getTrafficSource(),
      device_category: getDeviceType(),
      timestamp: new Date().toISOString()
    };
    if (category === 'transport') {
      params.route_name = getTransportRoute();
      params.transport_cluster = getTransportCluster();
      params.route_id = transportMetadata.route_id || '';
      params.origin_country = transportMetadata.origin_country || '';
      params.destination_country = transportMetadata.destination_country || '';
      params.service_type = transportMetadata.service_type || '';
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

  function loadGa4() {
    if (!gaId || gaId.indexOf('G-') !== 0) return;
    appendScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId));
    window.gtag('js', new Date());
    window.gtag('config', gaId, analyticsContext({ send_page_view: false }));
  }

  function loadAnalyticsRouter() {
    if (getPageCategory() === 'private' || getPageCategory() === 'transport') return;
    appendScript('/js/analytics-router.js', { defer: 'defer' });
  }

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

  // Update Visitor History on Entry
  function updateSessionCounters() {
    var pvs = getSessionPageViews();
    var lastVisitKey = '__vendora_last_visit_time';
    var now = Date.now();
    var lastVisit = parseInt(localStorage.getItem(lastVisitKey) || '0', 10);
    
    // Visit count increases if returning after 30 minutes of inactivity
    if (now - lastVisit > 30 * 60 * 1000) {
      var visits = parseInt(localStorage.getItem('__vendora_visit_count') || '0', 10) + 1;
      localStorage.setItem('__vendora_visit_count', visits);
    }
    localStorage.setItem(lastVisitKey, now);
  }

  updateSessionCounters();
  loadGa4();
  loadAnalyticsRouter();

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadSecondaryTools, { timeout: 2500 });
  } else {
    window.setTimeout(loadSecondaryTools, 1);
  }

  window.vendoraToolEvent = function (name, params) {
    try {
      window.vendoraTrackLocal(name, params);
    } catch (e) {
      /* ignore */
    }
  };

  // Re-route legacy vendoraAnalytics / vendoraTrack if routers bind to them
  window.vendoraAnalytics = {
    getCategory: getPageCategory,
    getTransportRoute: getTransportRoute,
    getTransportCluster: getTransportCluster,
    event: window.vendoraTrackLocal,
    track: window.vendoraTrackLocal
  };
  window.vendoraTrack = window.vendoraTrackLocal;
  window.vendoraAnalyticsContext = analyticsContext;

  (window.__VENDORA_PENDING_TRANSPORT_EVENTS__ || []).splice(0).forEach(function (event) {
    window.vendoraTrackLocal(event[0], event[1]);
  });

  // Track initial page_view to custom DB
  function trackInitialPage() {
    if (window.__VENDORA_INITIAL_ANALYTICS_TRACKED__) return;
    window.__VENDORA_INITIAL_ANALYTICS_TRACKED__ = true;
    window.vendoraTrackLocal('page_view', analyticsContext());
    if (getPageCategory() === 'transport') {
      window.vendoraTrackLocal('landing_page_view', { event_category: 'transport_funnel' });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trackInitialPage, { once: true });
  else trackInitialPage();

  // Render Real-time Debug Widget
  if (window.location.search.indexOf('debug_tracking=1') !== -1) {
    var container = document.createElement('div');
    container.id = 'vendora-tracking-debug-widget';
    container.style.position = 'fixed';
    container.style.bottom = '15px';
    container.style.right = '15px';
    container.style.width = '320px';
    container.style.maxHeight = '400px';
    container.style.backgroundColor = '#160d29';
    container.style.color = '#fff';
    container.style.border = '1px solid #7952b3';
    container.style.borderRadius = '8px';
    container.style.padding = '12px';
    container.style.fontSize = '12px';
    container.style.fontFamily = 'monospace';
    container.style.zIndex = '999999';
    container.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)';
    container.style.overflowY = 'auto';
    document.body.appendChild(container);

    window.__vendora_update_debug_widget = function () {
      var widget = document.getElementById('vendora-tracking-debug-widget');
      if (!widget) return;
      
      var isGaLoaded = typeof window.gtag === 'function';
      var eventsList = window.__vendora_debug_events.map(function(ev) {
        var statusColor = ev.status.indexOf('error') !== -1 || ev.status.indexOf('failed') !== -1 ? '#ff5252' : '#4caf50';
        return '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #332152;">' +
               '[' + ev.timestamp + '] <strong>' + ev.name + '</strong><br/>' +
               'Status: <span style="color:' + statusColor + '">' + ev.status + '</span>' +
               (ev.error ? ' (' + ev.error + ')' : '') +
               '</div>';
      }).join('');

      widget.innerHTML = '<div style="display:flex;justify-content:space-between;border-bottom:1px solid #7952b3;padding-bottom:6px;">' +
                         '<strong>GetVendora Tracker</strong>' +
                         '<span style="color:#ff5252;cursor:pointer;" onclick="this.parentNode.parentNode.remove();">✕</span>' +
                         '</div>' +
                         '<div style="margin-top:8px;">' +
                         'GA4 Loaded: ' + (isGaLoaded ? '<span style="color:#4caf50;">YES</span>' : '<span style="color:#ff5252;">NO</span>') + '<br/>' +
                         'GA ID: ' + gaId + '<br/>' +
                         'Visitor ID: ' + getVisitorId().slice(0, 8) + '...<br/>' +
                         'Session ID: ' + getSessionId().slice(0, 8) + '...<br/>' +
                         'Tracking Endpoint: <span style="color:#4caf50;">OK (/api/track)</span>' +
                         '</div>' +
                         '<div style="margin-top:12px;">' +
                         '<strong>Event History (Last 10):</strong>' +
                         (eventsList || '<div style="color:#888;margin-top:6px;">No events fired yet.</div>') +
                         '</div>';
    };

    window.__vendora_update_debug_widget();
    // Fire test event to confirm tracking working status
    window.vendoraTrackLocal('debug_ping', { category: 'debug' });
  }
})();
