# Vendora Transport sitewide analytics audit

## Outcome

The public transport site now uses one shared loader and one transport event layer. The loader sends a single explicit GA4 `page_view` (`send_page_view: false`) and the same privacy-safe events to the internal `/api/track` endpoint. The masked GA4 property is `G-DFY1****`.

Coverage changed from 162 to 176 intended public pages. The two Passenger Care token pages, Admin, API/test paths, repository-only previews and Worker 410 responses are excluded.

## Event model

The transport event layer supports route, country-hub, chauffeur, WhatsApp, phone, map, booking, quote, price, planner, complaint, review, policy, language, navigation and feedback-widget events. Common metadata is page path/title, language, route ID, origin/destination country, service type, CTA location, traffic source, device category and timestamp.

No complaint/review text, passport details, customer notes, Admin tokens, full phone numbers or sensitive form contents are sent. WhatsApp target URLs are reduced to their origin, browser data is reduced to a coarse browser category, and location is limited to Cloudflare's approximate country/city fields. Do Not Track disables the loader and event layer.

## Internal reporting

Authenticated Admin now has a Unified Site Analytics tab backed by D1. It shows anonymous visitors/sessions, online sessions, page and conversion totals, route/language performance, country/city/device/language/source dimensions, and pages viewed without conversion. Auto-refresh is opt-in at 30 or 60 seconds. The existing bearer-token authentication and no-store responses remain in place.

## GA4 verification after deployment

1. Open GA4 Realtime or DebugView for measurement ID `G-DFY1****`.
2. Visit one public route page in a clean browser session with Do Not Track off.
3. Confirm exactly one `page_view` and one `route_view`.
4. Click a non-production test WhatsApp CTA only in an approved testing context and confirm one `whatsapp_click`.
5. Confirm `route_id`, `origin_country`, `destination_country`, `language`, `service_type`, `cta_location`, `traffic_source` and `device_category` are present where applicable.
6. Confirm Admin, care-token pages and 410 URLs emit no GA or `/api/track` request.

## Targeted validation

- `npm run validate:analytics`
- `npm run test:analytics-api`
- `npm run test:analytics`
- `npm run validate:central-config`
- `npm run validate:gcc-batch-1`

The API test uses an in-memory SQLite database and synthetic requests. It proves anonymous event insertion, sanitized WhatsApp URLs, coarse browser storage, unauthorized Admin rejection, authorized tracking summary access, route conversion data and the five-minute online list without contacting real WhatsApp.
