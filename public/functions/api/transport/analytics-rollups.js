const ROLLUP_EVENTS = new Set([
  'page_view', 'route_view', 'country_hub_view', 'whatsapp_intent', 'whatsapp_click',
  'whatsapp_cancel', 'phone_click', 'quote_request', 'booking_start', 'booking_submit',
  'gcc_guide_page_view', 'gcc_guide_whatsapp_click', 'gcc_guide_quote_generated',
]);

export function isRollupEvent(eventName) {
  return ROLLUP_EVENTS.has(String(eventName || '').trim());
}

function text(value, max = 300) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function updateDailyAnalyticsAggregate(env, payload = {}, eventName = '') {
  if (!env.TRANSPORT_DB || !isRollupEvent(eventName)) return;

  const sessionPageViews = Math.max(0, Math.round(number(payload.sessionPageViews ?? payload.session_page_views)));
  const visitCount = Math.max(0, Math.round(number(payload.visitCount ?? payload.visit_count)));
  const isPageView = eventName === 'page_view' || eventName === 'gcc_guide_page_view';
  const isWhatsApp = ['whatsapp_intent', 'whatsapp_click', 'whatsapp_cancel', 'gcc_guide_whatsapp_click'].includes(eventName);
  const isLead = ['whatsapp_intent', 'whatsapp_click', 'whatsapp_cancel', 'quote_request', 'booking_start', 'booking_submit'].includes(eventName);
  const isConfirmed = eventName === 'booking_submit'
    || (isWhatsApp && number(payload.confirmed_departure) === 1);

  // A session/visitor is counted only when the client explicitly identifies
  // the first page in that session. This avoids inventing unique counts from
  // repeated pageviews. Missing markers remain in raw analytics for later
  // controlled backfill.
  const firstSessionEvent = isPageView && (sessionPageViews === 0 || sessionPageViews === 1);
  const firstVisitorEvent = firstSessionEvent && (visitCount === 0 || visitCount === 1);
  const route = text(payload.route_name ?? payload.routeName);
  const page = text(payload.page_path ?? payload.pagePath);
  const country = text(payload.origin_country ?? payload.originCountry ?? payload.country, 8).toUpperCase();

  try {
    await env.TRANSPORT_DB.prepare(`
    INSERT INTO daily_analytics_aggregates (
      aggregate_date, route_name, page_path, country,
      unique_visitors, sessions, page_views, events, whatsapp_clicks, leads,
      confirmed_bookings, updated_at
    ) VALUES (date(?, '+3 hours'), ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(aggregate_date, route_name, page_path, country) DO UPDATE SET
      unique_visitors = unique_visitors + excluded.unique_visitors,
      sessions = sessions + excluded.sessions,
      page_views = page_views + excluded.page_views,
      events = events + excluded.events,
      whatsapp_clicks = whatsapp_clicks + excluded.whatsapp_clicks,
      leads = leads + excluded.leads,
      confirmed_bookings = confirmed_bookings + excluded.confirmed_bookings,
      updated_at = excluded.updated_at
    `).bind(
      new Date().toISOString(), route, page, country,
      firstVisitorEvent ? 1 : 0,
      firstSessionEvent ? 1 : 0,
      isPageView ? 1 : 0,
      isWhatsApp ? 1 : 0,
      isLead ? 1 : 0,
      isConfirmed ? 1 : 0,
    ).run();
  } catch (error) {
    if (!/no such table/i.test(String(error?.message || error))) throw error;
  }
}
