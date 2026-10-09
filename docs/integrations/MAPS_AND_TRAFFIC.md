# Vendora Maps and Traffic integration inventory

Checked 9 October 2026, Asia/Bahrain. Private local inventory: outside the site's static assets. No credentials are stored here. Repository visibility could not be confirmed because GitHub CLI is not authenticated; do not push this inventory until the repository's private visibility is confirmed. No production deployment, billing activation, subscription, API enabling or credential creation occurred.

## Delivered preview and verified status

Run `npm start` inside `internal-preview/smart-journey`.

| Item | Evidence and current status |
|---|---|
| Arabic Dammam preview | `http://127.0.0.1:8791/bahrain-saudi-gcc-transport/bahrain-to-dammam/` |
| English Dammam preview | `http://127.0.0.1:8791/bahrain-saudi-gcc-transport/en/bahrain-to-dammam/` |
| TomTom access | Official developer portal redirects to current TomTom Docs, then TomTom CIAM registration/sign-in. No signed-in TomTom account or usable key was found in inspected resources. Account email/authentication remains required. No authenticated traffic request was made. |
| Cloudflare secrets | Read-only `wrangler secret list --name vendora-tools` lists `GA4_SERVICE_ACCOUNT_JSON` and `TRANSPORT_ADMIN_TOKEN`; no TomTom or Maps secret. Secret values were not retrieved. |
| Local credentials | No TomTom/Google Maps credential names in inspected shell environment or relevant local env files. Repository scan found map links/configuration, not a usable Maps/TomTom integration. This does not establish that no account exists elsewhere. |
| Google Cloud | Signed-in Cloud console accessible. Selected project `my-swala-store` Maps overview redirects to billing creation. Recent projects listed; none is identified as Vendora Maps. Project-creation clicks failed in browser control, so enabled services/credential restrictions/billing of other projects remain unverified. No dedicated project created. |
| Traffic verification | Eight candidate probe/direction entries are **not tested**, not failed coverage. Reusing identical probe coordinates for the reverse direction does not select the reverse carriageway. |
| Google route verification | Bahrain–Dammam, Bahrain–Khobar, Dammam–Bahrain, Khobar–Bahrain are **not tested**. TrafficLayer rendering and Causeway overlay coverage unverified. |
| Real weather | MET Norway Locationforecast/2.0 request for Dammam `26.4207,50.0888` succeeded. Forecast: 34.3°C valid 9 October 2026 18:00 Bahrain time; model updated 16:18:33; fetched 18:09:17. Forecast, not an observed measurement. UI rounds temperature to 34°. |
| QA | Eight preview unit tests; seven existing passenger-care privacy/moderation tests; four UI combinations (Arabic/English × 1440/390px); provider failure test; preview build and Wrangler dry run pass. No live authenticated Google/TomTom claim. |

Evidence lives in ignored `internal-preview/smart-journey/artifacts/`: `provider-verification.json`, `ui-audit.json`, and language/width screenshots. Forecast response is cached privately in ignored `.cache/`. No Google route geometry is saved by verification tooling.

## Providers and service selection

**TomTom:** Current documentation recommends Orbis APIs for new integrations. Orbis v2 Traffic offers flow tiles and incidents; its current introduction does not document the numeric Flow Segment Data endpoint. The existing TomTom Maps v1 documentation describes service version 4 Flow Segment Data, providing current/free-flow speeds, travel times, confidence, coordinates and OpenLR. Use this documented endpoint as a gated numeric adapter only after confirming account entitlement, support horizon and commercial presentation terms. Never infer congestion from incident absence or tile color scraping. No deprecated Incident Details endpoint is used.

Country coverage lists Bahrain and Saudi Arabia for TomTom Maps flow. This is not proof of bridge/carriageway coverage. Determine actual coverage from authenticated measurements and inspect geometry/OpenLR against the correct road and direction. Prefer a supported Orbis numeric alternative if TomTom makes one available under the account agreement.

**Google:** Prepare Maps JavaScript API for destination, independently supplied TrafficLayer and validated route display. Prepare Routes API `computeRoutes` for distance, polyline and optional traffic-aware road duration. Avoid starting a new integration with legacy Directions API. TrafficLayer is visual data; it does not supply a numeric Causeway customs queue or guarantee direction-specific bridge coverage. Set `autoRefresh:false`. A single page snapshot calls Routes once; there is no polling.

**MET Norway:** Locationforecast/2.0 compact supplies a destination forecast. Requests identify Vendora through a server User-Agent, use four-decimal coordinates, cache until provider expiry, and expose model/valid/retrieval times. UI credits MET Norway and links CC BY 4.0; extracting and rounding temperature is identified. No API key/subscription is required. No visitor IP or pickup address is forwarded.

## Environment inventory

Variable names with empty values are in `internal-preview/smart-journey/.env.example`. Actual values belong only in an ignored local `.env`, a secure credential store, or Cloudflare staging Worker secrets.

| Variable | Role |
|---|---|
| `TOMTOM_API_KEY` | Server-only Traffic credential; never returned to browser |
| `TOMTOM_FLOW_APPROVED` | Explicit enable gate for authorized numeric requests; default disabled |
| `TOMTOM_PRESENTATION_APPROVED` | Account agreement and mixed-provider presentation reviewed; default disabled |
| `TOMTOM_VERIFIED_SEGMENTS_JSON` | Server-only road/direction manifest indexed by `westbound`/`eastbound`, each with `point`, exact reviewed `openlr`, and `lengthMeters` |
| `GOOGLE_MAPS_BROWSER_KEY` | Separate public browser credential restricted by API and referrer; never a server secret |
| `GOOGLE_MAPS_SERVER_KEY` | Server-only Routes credential |
| `GOOGLE_MAPS_BILLING_APPROVED` | Gate after billing account and budget authorization |
| `GOOGLE_TRAFFIC_AWARE_APPROVED` | Separate gate for Pro traffic-aware route calculations |
| `GOOGLE_ROUTE_COVERAGE_APPROVED` | Gate after inspecting the returned route across the Causeway in both directions |
| `WEATHER_ENABLED` | Forecast feature switch; `false` disables |
| `PREVIEW_PORT` | Local loopback port; defaults to 8791 |

JavaScript Maps API browser keys are inherently visible to clients and cannot be treated as confidential server secrets. Source HTML/docs/screenshots/logs contain no key values; authorized runtime configuration must deliver the restricted browser credential to the client. If user policy forbids every browser-visible key, keep the keyless Google Maps route link and do not enable the JavaScript map.

## Setup and restrictions

1. Complete official TomTom sign-in or registration, including owner-controlled verification/CAPTCHA and terms acceptance. Inspect dashboard product entitlements, quota, billing and applicable contract. Do not assume the advertised free plan applies to an older developer account.
2. In Google Cloud, create/select a dedicated Vendora Maps project; record its ID privately. Obtain billing authorization with a currency and monthly ceiling before linking new billing. A general “do it” does not define a ceiling. Confirm the account's permitted regions and terms.
3. Enable Maps JavaScript API and Routes API only. Do not enable Places, Roads, Street View, Navigation or unrelated paid products without a concrete need.
4. Use separate staging and production credentials. Browser credential: restrict APIs to Maps JavaScript API; exact approved HTTPS referrers, and a separate localhost-only credential for local QA. Do not permit all `*.getvendora.net` domains. Production belongs to `getvendora.net`/`www.getvendora.net`, not Smart Pages or branded short links.
5. Server credential: restrict API to Routes. Use stable outbound IP restrictions if available; Cloudflare Workers do not inherently have one static outbound IP. For production use an approved stable egress gateway or supported short-lived OAuth approach rather than claiming a nonexistent IP restriction. The current key adapter is prepared for local/staging use; production credential design remains pending.
6. Add quota limits for map loads and Routes calls, billing alerts and an operational kill switch. Budget alerts do not stop charges. The preview has no production abuse limiter or distributed global spending counter, so do not expose the billable endpoint publicly until those controls are implemented. Keep preview behind Cloudflare Access when hosted.
7. Put server credentials in staging Worker secrets using protected input. `wrangler secret put` deploys a version: target the isolated preview Worker explicitly; never write secrets to the production Worker during preview setup. Use versioned secret workflow if staging a production change later.
8. Enable the gates only after authorization and coverage verification. A Google request is not shown merely because HTTP status is 200. All traffic requests time out; failures return unavailable without raw provider exception text or credential-bearing URLs.

## Real route/road verification method

Use `npm run verify:providers` after secure configuration. It never claims an uninspected road or direction is verified. Candidate approach/bridge probes are starting points only; manually identify each carriageway through geometry/OpenLR and provider documentation. Collect at least three distinct valid segments spanning the relevant approaches and bridge; reject nearby parallel roads, duplicate segments, incomplete coverage and wrong-direction data. Inspect the Google route's Causeway crossing, endpoints, waypoint and road sequence in the map before enabling route display.

For each direction record returned geometry/OpenLR, current/free-flow speed, confidence, closures, retrieval UTC/Bahrain time, provider Date and actual response validity. Flow Segment Data does not provide an observation timestamp in its documented fields: label retrieval time honestly, never describe the HTTP Date as the underlying traffic observation time. Compare simultaneous provider outputs only where account terms permit; Google's road ETA and TomTom segment speed are different metrics.

### Conservative Vendora classification

The implementation requires >=3 distinct reviewed road/direction segments, confidence >=0.8, positive free-flow speeds/lengths, finite nonnegative current speeds and retrieval age <=5 minutes. A reviewed manifest must cover the intended corridor, not only an easy approach road. Exact returned OpenLR must match the reviewed manifest.

Length-weighted speed ratio = sum(length × min(currentSpeed/freeFlowSpeed,1)) / sum(length). Light >=0.80; Moderate >=0.50 and <0.80; Heavy <0.50. Any valid reported closure overrides the congestion category. This is a documented Vendora heuristic, not a provider or government classification. Missing/stale/low-confidence/incomplete/wrong-direction data = unavailable, with no selected pill. A manifest review is still essential: these numerical tests cannot prove adequate geographical coverage by themselves.

The API does not equate traffic congestion or road duration with official immigration/customs waiting time. No arrival guarantee is made. Coordinates use central Manama/Dammam/Khobar, not a visitor's actual pickup address. Existing approximate route information/prices are preserved separately from measured fields.

## Attribution, usage and privacy

- Keep TomTom's textual status in a separately attributed card. Never overlay TomTom geometry/tiles/speed colors on the Google map. This layout does not by itself establish legal compliance: review the actual account agreement for displaying TomTom-derived text beside Google before enabling `TOMTOM_PRESENTATION_APPROVED`.
- Display Google route geometry only on a Google map, preserve Google's built-in attribution and distinguish Google-provided distance/ETA. Review and update public terms/privacy for Google's requirements before launch. Do not persist/cache Google Routes content except where the agreement expressly permits it; current responses use `no-store`, with no D1 writes.
- Weather credits and licence remain visible. The backend cache follows expiry; forecasts are never labeled observed weather.
- Existing analytics interfaces are reused for `smart_journey_view`, `smart_journey_booking_click`, `smart_journey_share_whatsapp`, `smart_journey_copy_link`, `smart_journey_map_open` and `smart_journey_map_interaction`. Parameters are route/language/CTA only. Preview disables production tracking. Registration of these event names in any analytics allowlist and live reporting validation remain rollout tasks; no conversion improvement is asserted.
- Source SEO metadata, canonical/hreflang, structured data and prices are untouched. Preview is noindex. No review aggregate schema is added without genuine approved records.

## Cost and safeguards

Actual incremental paid provider cost for this work: **$0**; no authenticated billable Maps/TomTom calls, paid activation or deployment. Local Node preview is free. Weather's open-data API has no subscription fee; Cloudflare hosting would use the existing account's plan and must be budgeted separately.

Public pricing checked on 9 October 2026: Google Dynamic Maps free 10,000 monthly then $7/1,000 in the first paid tier; Routes Essentials free 10,000 then $5/1,000; Routes Pro free 5,000 then $10/1,000. Traffic-aware calculations use the applicable Pro tier; confirm actual billed SKU. TomTom advertises 20,000 monthly Flow Segment Data requests; overage rates/account entitlement must be confirmed in its pricing calculator/dashboard, and no paid overage is approved.

For V monthly route visits at one map load and one route call: Maps estimate `max(V-10000,0)/1000×$7`; traffic-aware route estimate `max(V-5000,0)/1000×$10` in the first tier. At 10,000 visits that is about **$50/month** for Google (before taxes), at 20,000 about **$220/month**. Add TomTom, Cloudflare and any account-specific conditions. Three TomTom segment calls per snapshot consume 20,000 requests after about 6,666 visits, before verification calls/reloads/other projects. Four segments reduce that to 5,000 visits. Map interaction/tile operations can have their own usage characteristics; count actual SKU events in the dashboard. Estimates are not an authorized budget or promise of free production operation.

## Genuine reviews: separate rollout

The current site already reads `/api/transport/route-reviews`, backed by Cloudflare D1 and the passenger-care moderation pipeline. The private local preview can read genuine published records but blocks submissions. No fake review, star average or seeded customer was added.

`review-draft.mjs` prepares an optional display name (anonymous localized fallback), integer 1–5 ratings, Arabic/English, recognized route IDs, bounded UTF-8 bodies, same-origin writes and honeypot around the existing submission handler. All submissions remain unapproved until moderation. Existing seven tests cover privacy masking and public approved-only access. Negative ratings are accepted without a positivity filter.

Before deploying this draft: wire it into the existing Worker separately, add a distributed edge rate limit and a properly configured server-verified bot challenge (or equivalent), provide the bilingual form/privacy consent, test real staging submissions and approval/rejection with an authorized moderator, and verify GET query caching/invalidation. The existing in-memory rate limit alone is not global abuse prevention. Do not claim public submissions are verified trips merely because a customer supplies a reference: existing display text uses that label and must be corrected or restricted to proven linked bookings. Moderate for privacy/spam/abuse, never for negative sentiment; retain legitimate positive and negative reviews. Do not auto-translate or alter customer feedback without consent. Real review writes were not exercised against production.

## Reuse and rollout

Use `routes.mjs` as the shared route registry, `providers.mjs` as the Worker/local adapter and `component.js` as the URL/language-aware frontend. Copy no server key between projects. Each future project needs its own restricted browser referrers, secret binding, provider permissions/quota allocation and terms/privacy review. Add reviewed per-direction manifests before enabling new routes. No changes belong in `smart-page-platform` or `vendora-branded-smart-links`.

1. Finish owner account access, exact cost authorization and dedicated credentials.
2. Validate numeric Causeway flow and Google route/TrafficLayer coverage in both directions; if insufficient, keep unavailable and evaluate only an authorized alternative.
3. Review the Arabic/English mobile/desktop preview with real authorized responses.
4. Protect and load-test staging, including quotas, timeouts, provider failures, key restrictions, analytics and accessibility.
5. Release only Bahrain–Dammam after layout review; keep a feature kill switch and monitor errors/cost/booking metrics.
6. Extend to Bahrain–Khobar and reverse routes after independent coverage checks; then other GCC pages through the same registry. Road status remains limited to the measured corridor, not all GCC roads.
7. Deploy genuine reviews separately after moderation, privacy and distributed spam prevention pass.

## Primary documentation

- [TomTom Flow Segment Data](https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/traffic-flow/flow-segment-data)
- [TomTom Orbis Traffic introduction](https://docs.tomtom.com/traffic-api/documentation/tomtom-orbis-maps/v2/product-information/introduction)
- [TomTom traffic market coverage](https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/product-information/market-coverage)
- [TomTom pricing](https://docs.tomtom.com/pricing) and [legal overview](https://docs.tomtom.com/legal/terms-and-conditions)
- [Google Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing), [security guidance](https://developers.google.com/maps/api-security-best-practices), [Routes policies](https://developers.google.com/maps/documentation/routes/policies), [TrafficLayer](https://developers.google.com/maps/documentation/javascript/trafficlayer)
- [MET Norway terms](https://api.met.no/doc/TermsOfService) and [Locationforecast instructions](https://api.met.no/doc/locationforecast/HowTO)
- [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
