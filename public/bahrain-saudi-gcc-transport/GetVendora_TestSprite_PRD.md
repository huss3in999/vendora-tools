# Product Specification and Website Map: GetVendora Transport

## Document Purpose

This document describes the current public GetVendora Transport website for TestSprite frontend and end-to-end test generation. It is based on the live site at `https://getvendora.net/`, the live transport planner, the public sitemap, and the current project source. It intentionally excludes legacy Vendora POS/tools content and private administration surfaces.

**Product name:** Vendora Transport / GetVendora Transport  
**Primary production URL:** `https://getvendora.net/`  
**Arabic transport hub:** `https://getvendora.net/bahrain-saudi-gcc-transport/`  
**English transport hub:** `https://getvendora.net/bahrain-saudi-gcc-transport/en/`  
**Primary conversion channel:** WhatsApp to `97333225954` (`+973 3322 5954`)  
**Customer support telephone:** `+973 3340 4044`

## 1. Product Overview

### 1.1 Description

GetVendora Transport is a Bahrain-based private transport website for arranging private cars with drivers, airport and hotel transfers, full-day chauffeur services, family/group travel, permitted parcel transport, and cross-border journeys between Bahrain, Saudi Arabia and other GCC destinations. Iraq journeys and Ziyarat-related transport are also represented in the current public route and guide content.

The website does not complete payment or create a final confirmed booking in the browser. It helps a customer understand services, choose a route or vehicle class, prepare trip details, obtain a configured price estimate when one exists, and hand the request to the operations team through WhatsApp. Availability, assigned vehicle/driver and final price are confirmed through WhatsApp.

### 1.2 Goals and Objectives

- Explain the current private transport services and service area.
- Help customers discover route-specific and airport-specific information.
- Collect enough trip information for the operations team to quote and coordinate a journey.
- Display configured public prices only when an eligible current route value exists.
- Recommend a vehicle category based on passenger and luggage counts.
- Move high-intent customers to WhatsApp with a relevant pre-filled message.
- Serve English and Arabic customers with separate crawlable URLs and correct text direction.

### 1.3 Target Users

- Bahrain residents and visitors needing airport, hotel or local private transport.
- Families and groups travelling with luggage.
- Business travellers needing an executive sedan or chauffeur.
- Customers travelling from Bahrain to Saudi Arabia, Kuwait, Qatar, UAE, Oman or Iraq.
- Customers requesting reverse or other GCC-to-GCC journeys, subject to confirmation.
- Pilgrims and families planning Bahrain–Iraq Ziyarat travel.
- Customers sending permitted documents, gifts or parcels, subject to regulations and availability.

### 1.4 Main Customer Journey

1. The customer lands on the English root homepage, Arabic hub, English hub, or a route/service page.
2. The customer reviews services, routes, fleet capacity, pricing guidance or travel information.
3. The customer either completes the homepage booking request, uses the GCC Trip Calculator, or clicks a contextual WhatsApp CTA.
4. The website validates required fields and generates a language-appropriate WhatsApp message.
5. Where lead registration is available, the website creates a request reference and Passenger Care link before showing a confirmation modal.
6. The customer chooses **Continue to WhatsApp**; WhatsApp opens for booking confirmation with the operations team.

### 1.5 Supported Services

- Private passenger transport.
- Bahrain International Airport and GCC airport pickup/drop-off.
- Hotel and residential transfers.
- Cross-border GCC private transport.
- King Fahd Causeway journeys.
- Full-day, multi-day and flexible chauffeur arrangements.
- Business/executive transport.
- Family and group transport, including child seats by prior request.
- Iraq and Ziyarat private transport.
- Permitted parcel/document transport, subject to item, route, regulation and availability checks.

## 2. Current Website Map

### 2.1 Global English Homepage: `/`

The live root homepage is English (`lang=en`, `dir=ltr`) and contains:

- Header brand, desktop navigation, Arabic language link and WhatsApp Booking CTA.
- Hero with Plan Your Trip, WhatsApp Enquiries and Explore Fleet & Luggage CTAs.
- Licensing/safety cards and trust strip.
- Four service cards: airport/hotel, Saudi/GCC, full-day chauffeur, family/group.
- Three fleet cards: VIP Luxury SUV, Executive Business Sedan, Family & Group Van.
- Interactive passenger/luggage vehicle matcher.
- Customer review cards.
- Structured booking request form.
- Popular route link groups.
- Booking protection, office/contact and FAQ sections.
- Footer service/company links and WhatsApp CTA.
- Desktop AI Concierge modal launcher.
- Mobile bottom dock: WhatsApp, Call Dispatch, AI Planner.
- Floating WhatsApp button.
- Analytics consent banner and feedback/support widget when injected by shared scripts.

### 2.2 Language Hubs

| Page | Purpose |
|---|---|
| `/bahrain-saudi-gcc-transport/` | Arabic public transport landing page and Arabic navigation hub. |
| `/bahrain-saudi-gcc-transport/en/` | English transport landing page and English navigation hub. |
| `/bahrain-saudi-gcc-transport/gcc-destinations/` and `/en/gcc-destinations/` | Route discovery hub. |

### 2.3 Service, Company and Policy Pages

Current public service/information families include:

- `airport-transfer`, `bahrain-airport-transfer`, `airport-pickup-planner`
- `bahrain-private-transport`, `passenger-transport`, `parcel-delivery`
- `hotel-transfer-bahrain`, `business-chauffeur-bahrain`, `full-day-vip-driver`
- `prices`, `about`, `contact`, `customer-reviews`
- `booking-policy`, `booking-terms`, `cancellation-policy`, `payment-policy`, `support-policy`
- `privacy`, `passenger-safety`, `complaints`
- `gcc-transport-planner`, `gcc-private-transport-guide`, `king-fahd-causeway-guide`

English counterparts live under `/bahrain-saudi-gcc-transport/en/<slug>/` where present. The root-level `/about/`, `/contact/` and `/privacy-policy/` are also linked from the live English homepage.

### 2.4 Public Route and Destination Pages

The current public route families found in code/sitemaps are:

| Region | Current route pages |
|---|---|
| Bahrain → Saudi Arabia | `bahrain-to-saudi`, `bahrain-to-khobar`, `bahrain-to-dammam`, `bahrain-to-riyadh`, `bahrain-to-dammam-airport` |
| Saudi Arabia → Bahrain | `saudi-to-bahrain`, `khobar-to-bahrain`, `dammam-to-bahrain`, `riyadh-to-bahrain`, `dammam-airport-to-bahrain` |
| Bahrain ↔ Kuwait | `bahrain-to-kuwait`, `bahrain-to-kuwait-airport`, `kuwait-to-bahrain`, `kuwait-airport-to-bahrain` |
| Bahrain ↔ Qatar | `bahrain-to-qatar`, `bahrain-to-hamad-airport`, `qatar-to-bahrain`, `hamad-airport-to-bahrain` |
| Bahrain ↔ UAE | `bahrain-to-uae`, `bahrain-to-dubai`, `dubai-to-bahrain`, `uae-to-bahrain` |
| Bahrain ↔ Oman | `bahrain-to-oman`, `oman-to-bahrain` |
| Other GCC-to-GCC | `saudi-to-qatar`, `saudi-to-uae`, `qatar-to-saudi`, `qatar-to-uae`, `uae-to-saudi`, `uae-to-qatar` |
| Bahrain → Iraq | `bahrain-to-iraq`, `bahrain-to-karbala`, `bahrain-to-najaf`, `bahrain-to-baghdad`, `bahrain-to-basra` |

Country-origin hubs include `transport-from-saudi`, `transport-from-qatar`, `transport-from-kuwait`, `transport-from-uae` and `transport-from-oman`.

### 2.5 Current Iraq/Ziyarat Guide Pages

The public sitemap also contains current customer-facing guide/landing pages such as `arbaeen-transport`, `ziyarat-iraq-transport`, `arbaeen-season-bahrain-to-karbala`, `best-way-bahrain-to-karbala`, `best-time-bahrain-to-iraq`, `bahrain-to-najaf-driving-time`, `private-car-bahrain-to-iraq`, `family-transport-bahrain-najaf-karbala`, `iraq-ziyarat-private-car-bahrain`, `arbaeen-karbala-travel-tips`, `arbaeen-packing-list`, `book-private-car-bahrain-to-karbala`, `book-private-car-bahrain-to-najaf`, `best-car-for-iraq-family-travel`, `private-car-vs-other-iraq-travel`, `family-travel-bahrain-to-iraq`, `bahrain-to-karbala-route-plan`, `overland-travel-bahrain-to-iraq`, `pilgrims-transport-bahrain-to-iraq`, `karbala-trip-from-bahrain`, `najaf-trip-from-bahrain` and `direct-transport-bahrain-to-karbala`.

### 2.6 Navigation and Interactive Components

- Desktop header navigation is visible on larger screens.
- Language links navigate to dedicated Arabic or English URLs; they are not merely client-side translations.
- Route/service cards navigate to public detail pages.
- FAQ items use expandable `<details>` elements.
- Homepage fleet matcher uses plus/minus buttons and updates its recommendation and WhatsApp URL immediately.
- Homepage booking form uses selects, required inputs, optional text inputs/textarea, submit and reset controls.
- Trip Calculator uses tabs, origin/destination selects, direction radios, passenger/luggage numeric fields, type/date/time/notes fields, result cards, Copy, Reset and WhatsApp actions.
- Booking-ready confirmation modal supports Continue, Back/edit, backdrop close and Escape.
- AI Concierge modal supports quick prompts, free-text input, close button, loading state, response bubbles and optional WhatsApp handoff.
- The mobile bottom dock is the main small-screen action navigation.

## 3. Homepage Booking Request

The live root homepage contains a booking request rather than a numeric price calculator.

### 3.1 Fields

| Field | Required | Current options/behavior |
|---|---:|---|
| Service Type | Yes | Airport Transfer; Cross-Border GCC Transport; Full-Day Car with Driver; Private Trip inside Bahrain; Permitted Parcel Transport. |
| Pickup Location / City | Yes | Free text. |
| Destination Location / City | Yes | Free text. |
| Pickup Date | Yes | Native date input. |
| Pickup Time | Yes | Native time input. |
| Trip Type | No | One Way; Round Trip / Return; Full Day Chauffeur. |
| Number of Passengers | Yes | Number, minimum 1, maximum 30, default 1. |
| Luggage Pieces & Sizes | No | Free text. |
| Preferred Vehicle Category | No | No Preference; Executive Sedan; Comfort Sedan; Large Family Vehicle; Multi-Vehicle Arrangement. |
| Special Requests or Flight Numbers | No | Free-text textarea. |

### 3.2 Validation and Submission

- Missing required values must prevent handoff, focus the first missing field, and show: “Please complete the required service, route, date, time and passenger fields.”
- Reset restores native/form defaults and clears entered details.
- Valid submission produces a WhatsApp request containing journey type, service, pickup/destination, date/time, passenger count and any optional luggage, vehicle or notes plus the page URL.
- The page does not calculate or show a numeric price in this form.

## 4. GCC Trip Calculator

**English URL:** `/bahrain-saudi-gcc-transport/en/gcc-transport-planner/`  
**Arabic URL:** `/bahrain-saudi-gcc-transport/gcc-transport-planner/`

### 4.1 Modes

1. **Price Estimate** — default.
2. **Journey Time & Process** — same route controls, emphasizing distance, time and stages.
3. **Airport & Hourly Service** — reveals service selector, package selector, flight number and waiting fields.

Tabs expose correct `role=tab`, selected state, keyboard navigation and a shared tab panel. Left/right keyboard behavior reverses appropriately for Arabic RTL.

### 4.2 Origin and Destination Options

Both lists contain: Bahrain, Manama, Bahrain International Airport (BAH), Saudi Arabia, Khobar, Dammam, Dammam Airport (DMM), Riyadh, Kuwait, Qatar, Doha, United Arab Emirates, Dubai, Abu Dhabi, Oman and Muscat.

Defaults are Manama → Khobar. Origin and destination can be changed independently. Same-origin/destination is unsupported and must show “Choose different pickup and destination points,” dash values for distance/time, and quotation-only pricing.

### 4.3 Other Controls

- Journey direction: One Way (default) or Return.
- Passengers: numeric, default 2.
- Luggage count: numeric, default 2.
- Trip type: Passenger transport, Airport transfer, Parcel or documents, Family with luggage, Business trip.
- Date and time inputs.
- Notes textarea.
- Airport mode adds Airport Transfer, Hourly, Full Day service choices; flight number; waiting; and four package choices.

The calculator updates result content whenever a field changes and again when **Calculate Trip** is selected. Calculate focuses and scrolls the result into view.

### 4.4 Price Behavior

- Prices come from current public route configuration and are not inferred from distance.
- Currency is BHD. Approximate SAR is shown when enabled, using 10 SAR per BHD.
- Public values are per complete vehicle, not per passenger, unless the configured unit is a package/day.
- “From” is shown only for a `from` price.
- A price remains provisional until route details and availability are confirmed on WhatsApp.
- Return selection searches for a configured `return_quote`. The current configuration contains no return prices, so Return must show quotation required rather than doubling the one-way value.
- Reverse, GCC-to-GCC, local, hourly and unconfigured combinations show **Request a quotation / Price confirmed on WhatsApp**.
- Airport mode with Hourly always requires a quote.
- Full Day shows a configured package only for the chosen configured package.
- A public configuration API failure must not break the calculator; it falls back to quotation mode.

### 4.5 Current Configured Public Prices

All values below are current code values. A null return price means return is request-only, not unavailable as a service.

| Display name | Origin → destination | One way | Return | Unit | Toll/special rule |
|---|---|---:|---|---|---|
| King Fahd Causeway | Bahrain → King Fahd Causeway | 25 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Khobar | Bahrain → Khobar | 30 BHD | Quote | Vehicle | Causeway toll included. |
| First stop after the Causeway | Bahrain → first stop after Causeway | 30 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Dammam Airport | Bahrain → King Fahd International Airport | 40 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Al Ahsa | Bahrain → Al Ahsa | 70 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Jubail | Bahrain → Jubail | 70 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Riyadh | Bahrain → Riyadh | 120 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Madinah | Bahrain → Madinah | 300 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Makkah | Bahrain → Makkah | 300 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Khafji | Bahrain → Khafji | 90 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Kuwait | Bahrain → Kuwait | 120 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Abdali | Bahrain → Abdali | 120 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Safwan | Bahrain → Safwan | 220 BHD | Quote | Vehicle | Causeway toll included. |
| Iraq routes | Bahrain → Iraq | From 300 BHD | Quote | Vehicle | Final price depends on city; causeway toll included. |
| Bahrain to Qatar | Bahrain → Qatar | 120 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Dubai | Bahrain → Dubai | 250 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Abu Dhabi | Bahrain → Abu Dhabi | 225 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain to Oman | Bahrain → Oman | 350 BHD | Quote | Vehicle | Causeway toll included. |
| Bahrain sightseeing, morning to night | Bahrain → Bahrain | 70 BHD | N/A | Package | Full vehicle package; no causeway toll. |
| Bahrain sightseeing, afternoon to night | Bahrain → Bahrain | 60 BHD | N/A | Package | Full vehicle package; no causeway toll. |
| Dammam shopping, morning to night | Bahrain → Dammam | 70 BHD | N/A | Package | Full vehicle package; causeway toll included. |
| Dammam shopping, afternoon to night | Bahrain → Dammam | 60 BHD | N/A | Package | Full vehicle package; causeway toll included. |
| Additional GCC vehicle day | qualifying GCC route → same route | 60 BHD | N/A | Day | Per qualifying additional vehicle day; no toll included by this item. |

The current calculator directly maps Bahrain/Manama origins to Causeway, Khobar, Dammam Airport, Riyadh, Kuwait, Qatar/Doha, Dubai, Abu Dhabi and Oman/Muscat slugs. Other configured prices may be shown on the Prices page or route-specific surfaces but must not be invented for an unmapped calculator combination.

### 4.6 Expected Results

The result card must show route title, summary, configured price or quote status, unit, approximate distance, approximate time, journey direction, data status, journey stages and contextual notes for borders, airports, family/luggage and parcels.

The default live English result is Manama → Khobar, One Way, 30 BHD (approximately 300 SAR), 55–100 km and 45 minutes–1.5 hours.

Copy Details writes the generated WhatsApp text to the clipboard and temporarily changes its label to **Copied**. Reset restores Manama → Khobar, 2 passengers, 2 luggage, One Way, Price Estimate mode and recalculated default results.

## 5. Vehicle Matcher

- Default: 4 passengers and 4 large suitcases → VIP Luxury SUV.
- Passenger range controlled by UI: 1–15.
- Luggage range controlled by UI: 0–15.
- Executive Sedan when passengers ≤3 and luggage ≤2.
- VIP Luxury SUV when passengers ≤7 and luggage ≤6 and sedan rule did not match.
- Family & Group Van for all larger combinations.
- Recommendation text and WhatsApp message update immediately.
- Repeated clicks at limits must not exceed bounds.

## 6. WhatsApp Functionality

### 6.1 Destination

All public booking WhatsApp actions are expected to target `https://wa.me/97333225954`. The visible booking number is `+973 3322 5954`.

### 6.2 CTA Locations

- Header booking CTA.
- Hero enquiry/book CTA.
- Service and route cards.
- Fleet matcher booking CTA.
- Homepage booking form submit.
- Trip Calculator result and route/country cards.
- Footer booking CTA.
- Floating WhatsApp button.
- Mobile bottom-dock WhatsApp action.
- Office booking-number action.
- AI Concierge handoff when returned by the API.

### 6.3 Message Rules

- Generic CTAs carry a short contextual English or Arabic request.
- Booking form messages include service, route/location, journey type, date/time, passengers and supplied optional details.
- Calculator messages include calculator mode, origin, destination, one-way/return, service, date/time, passengers, luggage, flight, waiting, notes and configured price/quote status.
- Calculator messages identify the Vendora website and include the correct Arabic or English page URL.
- Vehicle matcher messages include recommended class, passengers and suitcases.
- If lead registration succeeds, the final message also includes the Booking Ref and Passenger Care URL.

### 6.4 Handoff and Failure Behavior

- Rapid duplicate WhatsApp navigation is suppressed for 2.5 seconds; passenger-care click handling also has a 1.2-second lock.
- Only one navigation is initiated to avoid duplicated WhatsApp Desktop text.
- If lead registration endpoints fail or time out, the request-ready modal still appears without a reference and the user can continue to WhatsApp.
- If WhatsApp/app opening fails, the browser remains responsible for the external-link failure; the customer must still have the visible booking number available as a fallback.
- Back/edit or Escape closes the prepared-request modal and keeps form state for editing.

## 7. Language and Content

- Root `/` is English LTR.
- Arabic transport URLs use `lang=ar` and `dir=rtl`.
- English transport URLs use `lang=en` and `dir=ltr`.
- Language navigation uses dedicated crawlable URLs and corresponding `hreflang` metadata where implemented.
- Visible Arabic and English must not be mixed, except proper names, internationally recognized airport/currency codes, phone numbers and a language-switch label.
- Titles, descriptions, Open Graph, Twitter metadata and structured data must match the active page language.
- Route/service meaning, contact numbers, pricing, policy facts and WhatsApp intent must remain consistent across language counterparts.
- English pages must contain zero unintended visible Arabic characters; Arabic layout must correctly mirror directional UI and text alignment.

## 8. Mobile and Responsive Behavior

- Desktop navigation is replaced or condensed appropriately on small screens without hiding required customer actions.
- The mobile bottom dock remains fixed, usable and non-overlapping, with WhatsApp, Call Dispatch and AI Planner actions.
- Floating actions, cookie banner and feedback widget must not cover form controls, calculator actions or modal buttons.
- Forms and calculator fields stack into readable single-column/small-screen layouts.
- Buttons maintain touch-friendly targets; labels and long route names wrap rather than clip.
- Cards stack cleanly; images keep aspect ratio and do not cause horizontal overflow.
- Arabic RTL ordering remains coherent on phone and tablet.
- Resizing/orientation changes preserve entered values, selected calculator mode and usable modal positioning.
- Very small widths must not produce horizontal page scrolling.

## 9. Validation and Error Handling

- Empty required homepage form values block submission and focus the first invalid field.
- Passenger count must respect native minimum/maximum constraints (1–30 on homepage; calculator should reject or safely handle invalid numeric values).
- Same calculator origin/destination returns a clear unsupported-combination message and no numeric price.
- Unsupported/unconfigured routes fall back to quotation mode; no fabricated or stale price is displayed.
- Return must not automatically double a one-way price.
- Long text and unexpected characters must remain text, not execute HTML/script, break layout or corrupt the WhatsApp URL.
- AI Concierge ignores empty submission, shows a planning/loading bubble for valid input, and provides a direct WhatsApp fallback if its API fails.
- Public-price API failure leaves the calculator functional in quotation mode.
- Lead-registration API failure must not block WhatsApp handoff.
- Clipboard denial must not crash the page; Copy Details returns to its default label.
- Broken external map/WhatsApp links must not break the current page or cause a JavaScript exception.
- No uncaught JavaScript error may disable navigation, forms, calculator or contact actions.

## 10. Required User Flows

### 10.1 Landing → Route → Calculator → WhatsApp

1. Open `/`.
2. Use GCC Destinations or a popular corridor link.
3. Navigate to the Trip Calculator.
4. Select origin, destination and One Way/Return.
5. Add trip details and calculate.
6. Verify configured price or quote-only result.
7. Continue to WhatsApp and verify the pre-filled details and phone.

### 10.2 Browse Routes

Open the GCC Destinations hub, choose a country/route card, verify the destination page, follow related/reverse links, and return using browser navigation without dead ends.

### 10.3 Change Route Selection

Start at Manama → Khobar, switch destination rapidly across configured and unconfigured destinations, switch origin, and verify that title, distance/time, route stages, price status and WhatsApp message always reflect the latest selection.

### 10.4 One-Way Booking

Select a priced Bahrain-origin route, One Way, calculate, verify the configured BHD and approximate SAR value, and verify the message says One Way.

### 10.5 Return Booking

Select Return for the same route. Verify the result changes to Return and price becomes quotation required. Verify the WhatsApp message says Return.

### 10.6 Mobile Journey

At a narrow viewport, land on `/`, browse a service, complete a request or calculator, and use the bottom WhatsApp action without overlap or horizontal scrolling.

### 10.7 English and Arabic Journeys

Follow the language link in each direction, verify the dedicated URL, `lang`, `dir`, metadata, navigation wording, form/calculator labels, result and WhatsApp message language.

### 10.8 Major Navigation

Verify Home, Airports, Bahrain/Chauffeur services, GCC Destinations, Prices, About, Contact, footer policies, complaints/reviews and language navigation reach working current pages.

## 11. Edge Cases for TestSprite

- Double-click and repeated-click every WhatsApp CTA; only one handoff should occur within the duplicate lock window.
- Rapidly change origin, destination, mode and direction; stale price/message content must never win.
- Use browser Back/Forward after route navigation and language switching.
- Refresh during partially completed homepage and calculator use; the page may reset unless persistence is explicitly implemented, but it must load valid defaults and remain usable.
- Test widths around 320 px, common phones, tablets and desktop.
- Enter maximum-length or very long pickup, destination, luggage and notes text.
- Enter Unicode, Arabic, emoji, punctuation and URL-reserved characters; generated WhatsApp URLs must remain valid and correctly encoded.
- Clear every required field and use invalid passenger values.
- Select identical origin/destination and every unconfigured combination.
- Block the public-settings, lead-registration, analytics and AI-chat requests separately.
- Deny clipboard permission.
- Simulate unavailable WhatsApp protocol/app and verify the visible number remains accessible.
- Open and close modals repeatedly, by button, backdrop and Escape; focus must return sensibly.
- Exercise fleet matcher boundaries and repeated plus/minus clicks.

## 12. Non-Functional Requirements

- Public pages load over HTTPS with meaningful HTML even before optional interactions.
- No required local CSS, JavaScript, font/icon or image asset returns 4xx/5xx.
- No uncaught console error affects a customer flow.
- No overlapping header, dock, floating CTA, banner, widget or modal.
- No horizontal overflow at supported mobile widths.
- Interactive controls have accessible names, keyboard focus, visible focus indication and appropriate semantic roles.
- Internal links resolve to current transport pages; external links use safe behavior.
- Images have useful alternative text unless decorative.
- Page interaction remains reasonably responsive under normal mobile conditions.
- Root, language hubs, route pages, service pages, prices, policies and planner remain crawlable and return successful status codes.
- Canonical/hreflang and language-specific metadata must not point to legacy tool pages.

## 13. Analytics and Tracking

Current tracking is consent-aware and skips private paths including `admin`, `care`, `api` and `ai-chat-test`. Do Not Track disables the transport analytics module.

Expected event families include:

- `whatsapp_intent` on any WhatsApp/data-message/booking-submit action.
- `booking_submit` and `quote_request` for booking/quotation submissions.
- `booking_start` on first form interaction.
- Origin, destination, route, date, time and passenger selection events where matching data attributes exist.
- `whatsapp_click`, `whatsapp_cancel`, `prepared_dialog_view`, `lead_created` and confirmed handoff events in the lead funnel.
- `phone_click`, `map_click`, `navigation_click`, `language_switch`, `route_card_click`.
- `route_view`, `country_hub_view`, `chauffeur_service_view`, `price_view`, `policy_view`.
- `faq_open`, complaint/review events, calculator/planner open-start-complete events.
- Page engagement, scroll depth and 60-second session heartbeat events.

Tests must assert trigger conditions and payload category/route context without requiring third-party analytics delivery. Tracking/API failures must never block customer navigation or WhatsApp.

## 14. Test Acceptance Criteria

| Feature | PASS | FAIL |
|---|---|---|
| Public navigation | Current transport, service, route and policy links return the intended page with correct language. | 404, legacy tool page, wrong language or unrelated destination. |
| Homepage booking | Required validation works and a complete request produces the correct WhatsApp message. | Empty required fields hand off; supplied details are lost or wrong. |
| Trip Calculator defaults | Manama → Khobar, One Way, 2 passengers, 2 luggage and current default result appear. | Missing/incorrect defaults or unusable result. |
| Configured pricing | Exact current BHD value, SAR approximation, unit and provisional disclaimer appear. | Invented, stale, doubled, per-passenger or wrong-currency price. |
| Return/unconfigured route | Clear quotation-required result and correct journey direction. | One-way price reused/doubled or unsupported combination shown as confirmed. |
| Same origin/destination | Clear choose-different-points response and no numeric price. | Valid-looking journey/price is shown. |
| Calculator WhatsApp | Latest selections and price/quote status reach `97333225954`. | Stale fields, wrong phone, malformed encoding or missing route/direction. |
| Reset/copy | Reset restores documented defaults; copy writes current message or fails safely. | Partial reset, stale message or uncaught clipboard error. |
| Vehicle matcher | Exact sedan/SUV/van thresholds and 1–15/0–15 boundaries work. | Recommendation contradicts thresholds or counters escape limits. |
| Language | Dedicated URL, correct `lang`/`dir`, consistent facts and same-language UI/message. | Mixed customer copy, wrong direction or materially inconsistent route/price/contact data. |
| Responsive UI | No overlap/overflow; actions and forms remain usable at phone/tablet/desktop widths. | Hidden CTA, clipped text, horizontal overflow or dock/modal obstruction. |
| WhatsApp resilience | Duplicate suppression, lead fallback and visible phone fallback work. | Multiple windows/messages, lead API blocks handoff, or no recovery path. |
| AI Concierge | Opens/closes, ignores empty input, displays response or WhatsApp fallback. | Frozen loading state, unsafe rendered input, or API failure breaks page. |
| Analytics | Events fire once under documented conditions and never block UX. | Missing/duplicate critical conversion event or tracking exception blocks flow. |
| SEO/accessibility | Public critical pages are crawlable; key controls are named and keyboard usable. | Critical noindex/404, unlabeled controls or keyboard trap. |

## 15. Out of Scope

- Any old Vendora POS, restaurant calculator, menu, invoice or general tools pages.
- `/admin/`, tracking dashboards, admin APIs, deployment scripts, repair scripts and secrets.
- `/ai-chat-test/` and other test-only pages.
- Passenger Care token pages as a general public discovery surface; they may be tested only as part of a generated handoff reference.
- Scratch files, templates, internal previews, planning/research files and non-indexed personal tools.
- Cloudflare deployment, Worker configuration changes, code changes or bug fixes.
- Payment collection, account creation, authentication and final booking confirmation; these are not current public-site capabilities.
- Any route, price, surcharge or service not present in current public code/configuration.

## TestSprite High-Risk Areas

### Critical

- WhatsApp handoff targets the wrong number, loses customer selections, duplicates navigation, or is blocked by lead-registration failure.
- Incorrect route price, especially accidental doubling/reuse for Return or a stale price after rapid route changes.
- Required booking fields can be bypassed or valid customers cannot submit.
- Language switch produces mixed Arabic/English content or wrong-direction UI that prevents booking.

### High

- Mobile bottom dock, floating widgets, cookie banner or modal overlaps calculator/form actions.
- Unsupported or same-point routes appear bookable with a numeric confirmed price.
- Public configuration/API outage breaks the calculator instead of falling back to quotation mode.
- Booking-ready modal cannot be closed, loses focus control, or fails to continue.
- Current route/service links lead to 404s, legacy tools or incorrect language pages.

### Medium

- Vehicle matcher boundary errors or WhatsApp message not matching the displayed recommendation.
- Back/Forward, refresh or rapid mode changes leave stale results.
- AI Concierge remains stuck after API failure or fails to expose WhatsApp fallback.
- Long/Unicode input breaks layout or WhatsApp encoding.
- Duplicate or missing analytics conversion events.

### Low

- Copy label does not return after the success timeout.
- FAQ, icon, image, metadata or non-critical tracking defects that do not block discovery or booking.
- Minor responsive spacing or wrapping defects without overlap or loss of content.
