VENDORA TRANSPORT - MOBILE VIP REDESIGN DISCOVERY REPORT
This discovery report document serves as a complete technical reference and safe implementation map for the mobile-first VIP redesign of the GetVendora Transport website (/bahrain-saudi-gcc-transport/).

IMPORTANT

READ-ONLY DISCOVERY RECORD This task was executed in strict read-only mode. No source code has been modified, renamed, deleted, moved, or deployed.

1. PROJECT STRUCTURE
The GetVendora Transport website is built as a static multi-page website deployed on the Cloudflare platform. It runs on a flat HTML-first structure with a dynamic database-backed Cloudflare Worker intercepting all routes to perform server-side content injection, schema updates, and client tracking.

Repository Root (Local Workspace): e:\Users\Hussain Alyaqoob\Documents\GitHub\public\bahrain-saudi-gcc-transport
Parent directory (Cloudflare Zone root): e:\Users\Hussain Alyaqoob\Documents\GitHub\public
Active Git Branch: Not resolvable (Git command unavailable on active PATH).
Framework & Build System: Pure Vanilla HTML5, CSS3, and JavaScript. There is no bundler, build system, or static site generator.
Public/Static Asset Folder: Mapped directly to the repository root directory. The parent folder (public/) is deployed as static assets by Wrangler ("assets": { "directory": "." } in wrangler.jsonc).
Transport Section Location: Located entirely within the /bahrain-saudi-gcc-transport/ directory. English mirrors are located under the /bahrain-saudi-gcc-transport/en/ subdirectory.
Shared Templates, CSS, and JavaScript:
Shared Stylesheet: 
site.css
Shared Script: 
site.js
Third-party Icons: 
lucide.min.js
Shared Helper JS: 
file-protocol-links.js
Global Platform Analytics Loader: /assets/analytics-loader.js (relative to public root).
Worker & Server-side API Files (Cloudflare Worker):
Main Worker script: public/worker.js
Zone and Bindings Configuration: public/wrangler.jsonc
Serverless API functions (under public/functions/api/transport/):
admin.js (Admin console backend API, token authentication, configuration and reviews manager)
ai-chat.js (Chat interface with Cloudflare AI bindings)
error-log.js (Log error tracking captures)
passenger-care.js (Customer journey follow-up & feedback loop database manager)
public-settings.js (Public configuration provider, serving routes and settings tables)
rate-limit.js (API request rate-limiter helper)
route-reviews.js (Public verified passenger reviews fetcher)
tracking.js (Visitor journey event processor)
whatsapp-lead.js (Captured WhatsApp booking clicks, daily digests, and ntfy alerts notifier)
2. TRANSPORT PAGE INVENTORY
Below is the complete inventory of Arabic and English transport pages. For all public-facing pages, the canonical URL, local file source path, page titles, descriptions, H1 headings, canonicals, hreflang, structured data models, and sitemap inclusions are fully analyzed.

Main Hubs & Core Pages
URL Path	Source File	Lang	Title	Meta Description	H1	Canonical URL	Hreflang Tags	Schema Markup Types	Sitemap
/bahrain-saudi-gcc-transport/	index.html	AR	نقل البحرين والسعودية والخليج 24 ساعة | حجز واتساب فوري | Vendora	خدمة نقل خاصة 24 ساعة يومياً من البحرين إلى السعودية ودول الخليج: توصيل من المنزل أو الفندق أو المطار...	خدمة نقل خاصة 24 ساعة من البحرين إلى السعودية ودول الخليج	https://getvendora.net/bahrain-saudi-gcc-transport/	en, ar-BH, x-default	LocalBusiness, WebSite	sitemap-gcc-transport.xml
/bahrain-saudi-gcc-transport/en/	en/index.html	EN	Bahrain to Saudi Arabia and GCC Private Transport | Vendora	Private transport from Bahrain to Saudi Arabia and GCC destinations for passengers, families, airport transfers...	Bahrain to Saudi Arabia and GCC private transport	https://getvendora.net/bahrain-saudi-gcc-transport/en/	en, ar-BH, x-default	Organization, WebPage, TaxiService, FAQPage	sitemap-gcc-transport-en.xml
/bahrain-saudi-gcc-transport/gcc-destinations/	gcc-destinations/index.html	AR	وجهات الخليج من البحرين | السعودية، قطر، الكويت، الإمارات، عمان | Vendora	خدمة توصيل خاص ونقل ركاب يومي بين البحرين ودول مجلس التعاون الخليجي مع سائق خاص...	وجهات الخليج من البحرين	https://getvendora.net/bahrain-saudi-gcc-transport/gcc-destinations/	en, ar-BH	Service, BreadcrumbList, FAQPage	sitemap-gcc-transport.xml
/bahrain-saudi-gcc-transport/en/gcc-destinations/	en/gcc-destinations/index.html	EN	GCC Destinations from Bahrain | Private Transport | Vendora	Private passenger transport and parcel delivery from Bahrain to Saudi Arabia, Kuwait, UAE, Qatar, Oman, and Iraq...	GCC destinations from Bahrain	https://getvendora.net/bahrain-saudi-gcc-transport/en/gcc-destinations/	en, ar-BH	Service, BreadcrumbList, FAQPage	sitemap-gcc-transport-en.xml
/bahrain-saudi-gcc-transport/prices/	prices/index.html	AR	أسعار النقل من البحرين إلى السعودية والخليج | GetVendora	أسعار النقل الخاص من البحرين إلى السعودية ودول الخليج للمركبة كاملة، مع الحجز والتأكيد عبر واتساب.	أسعار النقل الخاص من البحرين	https://getvendora.net/bahrain-saudi-gcc-transport/prices/	ar, en	ItemList (Dynamic via Worker)	sitemap-gcc-transport.xml
/bahrain-saudi-gcc-transport/en/prices/	en/prices/index.html	EN	Bahrain to Saudi Arabia and GCC transport prices	Standard public per-vehicle pricing in BHD for GCC transport routes.	Private transport prices	https://getvendora.net/bahrain-saudi-gcc-transport/en/prices/	ar, en	ItemList (Dynamic via Worker)	sitemap-gcc-transport-en.xml
Passenger Transport & Parcel Delivery
AR Passenger Transport: /bahrain-saudi-gcc-transport/passenger-transport/ | Title: خدمة نقل الركاب البحرين السعودية الخليج | 24 ساعة بسيارات GMC/XL | Vendora | H1: نقل الركاب من البحرين إلى السعودية والخليج
EN Passenger Transport: /bahrain-saudi-gcc-transport/en/passenger-transport/ | Title: Passenger Transport Bahrain Saudi Arabia GCC | Vendora | H1: Passenger transport from Bahrain
AR Parcel Delivery: /bahrain-saudi-gcc-transport/parcel-delivery/ | Title: توصيل طرود من البحرين إلى السعودية والخليج | خدمة يومية 24 ساعة | Vendora | H1: توصيل طرود من البحرين إلى السعودية والخليج
EN Parcel Delivery: /bahrain-saudi-gcc-transport/en/parcel-delivery/ | Title: Parcel Delivery from Bahrain to Saudi Arabia and GCC | Vendora | H1: Parcel delivery from Bahrain
Airport Transfers
AR Airport Hub: /bahrain-saudi-gcc-transport/airport-transfer/ | H1: توصيل واستقبال المطار
EN Airport Hub: /bahrain-saudi-gcc-transport/en/airport-transfer/ | H1: Airport transfer and pickup
AR Bahrain Airport Transfer: /bahrain-saudi-gcc-transport/bahrain-airport-transfer/ | H1: توصيل مطار البحرين الدولي BAH
AR Dammam Airport Outbound: /bahrain-saudi-gcc-transport/bahrain-to-dammam-airport/ | H1: توصيل إلى مطار الدمام من البحرين
EN Dammam Airport Outbound: /bahrain-saudi-gcc-transport/en/bahrain-to-dammam-airport/ | H1: Private transfer from Bahrain to Dammam Airport (DMM)
AR Dammam Airport Inbound: /bahrain-saudi-gcc-transport/dammam-airport-to-bahrain/ | H1: استقبال من مطار الدمام إلى البحرين
EN Dammam Airport Inbound: /bahrain-saudi-gcc-transport/en/dammam-airport-to-bahrain/ | H1: Private transfer from Dammam Airport (DMM) to Bahrain
AR Hamad Airport Outbound (Doha): /bahrain-saudi-gcc-transport/bahrain-to-hamad-airport/
AR Hamad Airport Inbound (Doha): /bahrain-saudi-gcc-transport/hamad-airport-to-bahrain/
AR Kuwait Airport Outbound: /bahrain-saudi-gcc-transport/bahrain-to-kuwait-airport/
AR Kuwait Airport Inbound: /bahrain-saudi-gcc-transport/kuwait-airport-to-bahrain/
Route-Specific Pages (Bahrain Outbound & Return GCC)
Bahrain to Saudi Arabia:
AR: /bahrain-saudi-gcc-transport/bahrain-to-saudi/ (H1: توصيل خاص من البحرين إلى السعودية)
EN: /bahrain-saudi-gcc-transport/en/bahrain-to-saudi/ (H1: Private transport from Bahrain to Saudi Arabia)
Bahrain to Khobar:
AR: /bahrain-saudi-gcc-transport/bahrain-to-khobar/ (H1: توصيل من البحرين إلى الخبر بسيارة خاصة)
EN: /bahrain-saudi-gcc-transport/en/bahrain-to-khobar/ (H1: Private taxi from Bahrain to Khobar)
Bahrain to Dammam:
AR: /bahrain-saudi-gcc-transport/bahrain-to-dammam/ (H1: توصيل خاص من البحرين إلى الدمام)
EN: /bahrain-saudi-gcc-transport/en/bahrain-to-dammam/ (H1: Private taxi from Bahrain to Dammam)
Bahrain to Riyadh:
AR: /bahrain-saudi-gcc-transport/bahrain-to-riyadh/ (H1: توصيل خاص من البحرين إلى الرياض)
EN: /bahrain-saudi-gcc-transport/en/bahrain-to-riyadh/ (H1: Private taxi from Bahrain to Riyadh)
Saudi Arabia to Bahrain (Reverse):
AR: /bahrain-saudi-gcc-transport/saudi-to-bahrain/ (H1: توصيل خاص من السعودية إلى البحرين)
EN: /bahrain-saudi-gcc-transport/en/saudi-to-bahrain/ (H1: Private transport from Saudi Arabia to Bahrain)
Khobar to Bahrain (Reverse):
AR: /bahrain-saudi-gcc-transport/khobar-to-bahrain/ (H1: توصيل خاص من الخبر إلى البحرين)
EN: /bahrain-saudi-gcc-transport/en/khobar-to-bahrain/ (H1: Private taxi from Khobar to Bahrain)
Dammam to Bahrain (Reverse):
AR: /bahrain-saudi-gcc-transport/dammam-to-bahrain/ (H1: توصيل خاص من الدمام إلى البحرين)
EN: /bahrain-saudi-gcc-transport/en/dammam-to-bahrain/ (H1: Private taxi from Dammam to Bahrain)
Riyadh to Bahrain (Reverse):
AR: /bahrain-saudi-gcc-transport/riyadh-to-bahrain/ (H1: توصيل خاص من الرياض إلى البحرين)
EN: /bahrain-saudi-gcc-transport/en/riyadh-to-bahrain/ (H1: Private taxi from Riyadh to Bahrain)
Bahrain to Kuwait:
AR: /bahrain-saudi-gcc-transport/bahrain-to-kuwait/ | EN: en/bahrain-to-kuwait/
Bahrain to UAE / Dubai:
AR: /bahrain-saudi-gcc-transport/bahrain-to-uae/ | /bahrain-saudi-gcc-transport/bahrain-to-dubai/
EN: en/bahrain-to-uae/ | en/bahrain-to-dubai/
Bahrain to Qatar:
AR: /bahrain-saudi-gcc-transport/bahrain-to-qatar/ | EN: en/bahrain-to-qatar/
Bahrain to Oman:
AR: /bahrain-saudi-gcc-transport/bahrain-to-oman/ | EN: en/bahrain-to-oman/
GCC to Bahrain (Reverse):
AR: /bahrain-saudi-gcc-transport/kuwait-to-bahrain/ | /bahrain-saudi-gcc-transport/qatar-to-bahrain/ | /bahrain-saudi-gcc-transport/dubai-to-bahrain/ | /bahrain-saudi-gcc-transport/oman-to-bahrain/
Iraq & Seasonal Ziyarat Routes (Arabic & English mirrors)
Corridor Hubs: /bahrain-saudi-gcc-transport/bahrain-to-iraq/, /bahrain-saudi-gcc-transport/arbaeen-transport/, /bahrain-saudi-gcc-transport/ziyarat-iraq-transport/
Iraq Cities: /bahrain-saudi-gcc-transport/bahrain-to-karbala/, /bahrain-saudi-gcc-transport/bahrain-to-najaf/, /bahrain-saudi-gcc-transport/bahrain-to-baghdad/, /bahrain-saudi-gcc-transport/bahrain-to-basra/
20+ SEO Content / Advice Guides (located under directory root):
arbaeen-season-bahrain-to-karbala/ (موسم الأربعين من البحرين إلى كربلاء)
best-way-bahrain-to-karbala/ (أفضل طريقة للسفر من البحرين إلى كربلاء)
best-time-bahrain-to-iraq/ (أفضل وقت للسفر من البحرين إلى العراق)
bahrain-to-najaf-driving-time/ (كم ساعة من البحرين إلى النجف بالسيارة)
private-car-bahrain-to-iraq/ (السفر من البحرين إلى العراق بالسيارة خاصة)
family-transport-bahrain-najaf-karbala/ (نقل عائلي من البحرين إلى النجف و كربلاء)
iraq-ziyarat-private-car-bahrain/ (زيارة العراق من البحرين بالسيارة خاصة)
arbaeen-karbala-travel-tips/ (نصائح السفر إلى كربلاء في موسم الأربعين)
arbaeen-packing-list/ (ماذا تأخذ معك في زيارة الأربعين)
book-private-car-bahrain-to-karbala/ (حجز سيارة خاصة من البحرين إلى كربلاء)
book-private-car-bahrain-to-najaf/ (حجز سيارة خاصة من البحرين إلى النجف)
best-car-for-iraq-family-travel/ (أفضل سيارة للسفر إلى العراق للعائلات)
private-car-vs-other-iraq-travel/ (هل سيارة خاصة أفضل للسفر إلى العراق)
family-travel-bahrain-to-iraq/ (السفر إلى العراق مع العائلة من البحرين)
bahrain-to-karbala-route-plan/ (خط سير السفر من البحرين إلى كربلاء)
overland-travel-bahrain-to-iraq/ (السفر البري من البحرين إلى العراق)
pilgrims-transport-bahrain-to-iraq/ (توصيل زوار من البحرين إلى العراق)
karbala-trip-from-bahrain/ (رحلة كربلاء من البحرين)
najaf-trip-from-bahrain/ (رحلة النجف من البحرين)
direct-transport-bahrain-to-karbala/ (توصيل مباشر من البحرين إلى كربلاء)
Contact, About, and Privacy
About Us: /bahrain-saudi-gcc-transport/about/ | H1: من نحن: نقل خاص موثوق بين البحرين ودول الخليج
Contact: /bahrain-saudi-gcc-transport/contact/ | H1: تواصل معنا لحجز النقل الخاص في أي وقت
Privacy: /bahrain-saudi-gcc-transport/privacy/ | H1: سياسة الخصوصية
3. SHARED DESIGN SYSTEM
The styling and interface of the transport system are centrally controlled by shared stylesheets, scripts, and Worker rewriting rules.

CSS Style Injection: Managed entirely by 
site.css
.
Global Variables & Colors (CSS :root and body.home-premium):
Light Theme Default: Background --bg (#f4f6f9), surfaces (rgba(255, 255, 255, 0.94)), text --text (#192536), accents --accent (#1f3650), and brand WhatsApp (#25d366).
Premium Dark Theme (body.home-premium): Background --bg (#090d12), soft background --bg-soft (#101821), surface --surface (rgba(17, 24, 32, 0.78)), text --text (#eef3f7), accents --accent (#e1bd73), and accent-strong (#f6d999).
Fonts: Segoe UI, Tahoma, Arial, sans-serif.
Breakpoints and Media Queries:
Desktop & Large Screens: Grids default to standard column layouts (--max: 1160px).
Tablet/Standard Breakpoint (max-width: 1100px and max-width: 820px): Collapses columns into single-column lists.
Mobile/Responsive Layouts (max-width: 820px & max-width: 520px):
RTL Header behaves as grid area: Brand is aligned, sub-title hidden, and menu items collapse into a horizontally scrolling horizontal pill navigation bar (overflow-x: auto; flex-wrap: nowrap;).
Tighter pills applied to English navigation (max-width: 900px).
Common Elements Layout:
Header (.topbar): Sticky, backdrop-filter blur (12px).
Buttons: .primary-btn (navy gradient), .wa-inline (WhatsApp green gradient), .ghost-btn (white glass with gold borders).
Cards: .glass (semi-transparent container, fine borders, radial background grids).
Forms (.booking-form): Flexbox select layout with native dropdown components.
Floating WhatsApp Button: .floating-wa positioned at bottom corner, green round icon.
Redesigning all pages safely without manual edits: Since all route templates are statically built but share 
site.css
 and 
site.js
, any visual layout, colors, grids, header shapes, hamburger styling, bottom navs, or typography updates can be performed strictly within site.css and site.js without touching individual HTML page contents.
4. HOMEPAGE
The landing hubs are structured as follows:

Arabic Source: bahrain-saudi-gcc-transport/index.html
English Source: bahrain-saudi-gcc-transport/en/index.html
Hero Layout:
Arabic: 2-column .hero-grid. Left: .hero-copy.glass containing eyebrow, <h1>, lead text, primary CTA, WhatsApp CTA, and flag badges. Right: .hero-side.glass (text features card).
English: 2-column .premium-hero-grid. Left: copy card with trust statements and buttons. Right: .hero-media-card carrying a hero image (../assets/images/hero-gcc-private-transport.webp).
Section Ordering (Arabic):
Header (topbar)
Hero (hero)
Most Popular Destinations (6 route cards: Dammam, causeway guide, Riyadh, Dubai, airport transfer, Saudi return)
WhatsApp Booking Form (#booking)
FAQ accordion (.faq-wrap - dynamically rewritten by Worker with settings-based FAQs)
Footer
Booking Form Inputs: Service type, From Country, From City, To Country, To City, Additional notes, and a WhatsApp action button.
Trust Content: Standard SUV vehicle sizes, 24/7 service availability, cash/BenefitPay, private driver network.
Mobile vs. Desktop Behavior:
Desktop: Header menu fully visible. Left-to-right aligned layouts.
Mobile: Sticky header shrinks, hiding the subtitle. Navigation links scroll horizontally. Hero components stack vertically.
5. PRICING SYSTEM
The pricing system is fully database-driven, managed by the Cloudflare Worker and locally cached.

Route-Price Data Source: Stored in the transport_public_routes table in D1 database TRANSPORT_DB.
Price URLs & Sources:
Arabic prices: /bahrain-saudi-gcc-transport/prices/ (prices/index.html)
English prices: /bahrain-saudi-gcc-transport/en/prices/ (en/prices/index.html)
Pre-rendering vs. JavaScript visibility:
Live Production: Fully pre-rendered on the server-side! The Cloudflare Worker uses HTMLRewriter to fetch active routes, generate the price cards using the pricingCards function, and write the cards into #priceList before serving the HTML. This ensures prices are visible without client-side JS (essential for SEO).
Local/Disk Fallback (file://): 
prices-page.js
 handles client-side rendering using default static values in the script as a fallback, then attempts to fetch settings from /api/transport/public-settings to update.
Pricing Logic & Variables:
SAR Conversion: Injected dynamic rate sar_per_bhd (default 10). Riyal prices are calculated as Math.round(BHD * sar_per_bhd) and shown with a "≈ SAR (approx.)" label if approximate_sar_enabled is true.
Trip Types:
one_way_vehicle -> "per vehicle, one way" / "للمركبة، اتجاه واحد"
package -> "per package" / "للباقة" (e.g. sightseeing packages)
per_day -> "per additional day" / "لليوم الإضافي"
Causeway Toll Wording: Appends included descriptions if causeway_toll_included is active.
WhatsApp price CTA generation: Generates a direct message: "Hello, I would like to check availability for [Route Name]." (or Arabic equivalent) pointing to the configured booking number.
Files that must remain working:
public/worker.js (Server-side parser)
public/functions/api/transport/public-settings.js (Route repository provider)
public/bahrain-saudi-gcc-transport/assets/prices-page.js (Client renderer fallback)
6. PLANNER / CALCULATOR
The transport section features two interactive planning tools: the GCC Transport Planner and the Airport Pickup Planner.

GCC Planner:
URL: /bahrain-saudi-gcc-transport/gcc-transport-planner/ (Arabic) | /en/gcc-transport-planner/ (English)
Source File: bahrain-saudi-gcc-transport/gcc-transport-planner/index.html (English mirror inside en/ folder)
Inputs: From, To, Number of passengers, Number of bags, Trip Type, Date, Time, Additional notes.
Corridor Data: Fixed client-side map (routeData) containing:
bahrain|khobar (45–95 km, 45m–1.5h)
bahrain|dammam (90–130 km, 1h–2h)
bahrain|dmm (105–145 km, 1h–1.75h)
bahrain|riyadh (460–520 km, 4.5h–6h)
bahrain|kuwait (430–520 km, 5.5h–7h)
bahrain|qatar (420–520 km, 4.5h–6h)
bahrain|uae (760–900 km, 8h–11h)
bahrain|dubai (850–980 km, 9h–11h)
bahrain|oman (1050–1250 km, 12h–15h)
(Plus reciprocal reverse mappings).
Airport Planner:
URL: /bahrain-saudi-gcc-transport/airport-pickup-planner/ | /en/airport-pickup-planner/
Source File: bahrain-saudi-gcc-transport/airport-pickup-planner/index.html
Inputs: Service Type (pickup/dropoff), Airport (BAH, DMM, RUH, KWI, DOH, DXB, AUH, MCT), Destination City, Flight Number, Date, Time, Passengers, Luggage, Notes.
Output & Actions:
Formulates a structured message with all values and updates the WhatsApp button link: https://wa.me/97333225954?text=[Encoded Message].
Includes a "Copy Details" clipboard function and form "Reset".
Design Proposal: The existing GCC Transport Planner is mobile-responsive and self-contained. Rather than creating a duplicate page, it can be styled and integrated directly into the new mobile hamburger menu under the label "Trip Calculator" or "مخطط الرحلة", directing users to gcc-transport-planner/.
7. WHATSAPP AND BOOKING FLOW
The booking flow is managed as an asynchronous lead capturing event before routing users to WhatsApp.

Mermaid diagram
WhatsApp Endpoint: Resolves settings booking_whatsapp from the D1 DB, fallback is 97333225954.
Lead Interceptor (site.js): Intercepts all clicks on links matching wa.me or api.whatsapp.com.
If passengerCareEnabled is active, it blocks navigation, prompts for name/phone (if configured), sends the lead payload asynchronously to the Worker API, gets a booking_ref (e.g. GCC-A1B2C3D4) and care_token.
It appends the follow-up feedback block containing the care url: /bahrain-saudi-gcc-transport/care/?token=[careToken].
It opens the "Booking Ready" confirmation dialog before redirecting the customer to WhatsApp.
Smart Link System: The shorteners go.getvendora.net and links.getvendora.net are owned by the separate smart-links application (in accordance with AGENTS.md). The transport site uses direct relative paths for reviews and care.
8. ANALYTICS AND RANKING PROTECTION
SEO protection and tracking events must remain fully operational.

Tracking IDs & Analytics:
Google Analytics 4 Measurement ID: G-DFY197R2MS (loaded via /assets/analytics-loader.js).
Captured Events:
pageview (captured via site.js on load and pinged to Worker event route).
whatsapp_click (triggered when a customer clicks a WhatsApp CTA).
whatsapp_continue / whatsapp_cancel (interaction with the prepared booking modal).
prepared_dialog_view (view of the booking reference confirmation dialog).
lead_created (successful registration of the lead inside D1).
Search Console Data: Search Console data unavailable. (No local export files or safe integration configs are present in the repository).
SEO Files:
Robots file: /bahrain-saudi-gcc-transport/robots.txt (allows all routes, links sitemaps).
Sitemap index: /bahrain-saudi-gcc-transport/sitemap-index.xml (contains Arabic sitemap /sitemap-gcc-transport.xml and English sitemap /sitemap-gcc-transport-en.xml).
Redirect Rules: public/_redirects controls trailing slash canonicalization (e.g., redirecting /en/bahrain-to-saudi to /en/bahrain-to-saudi/ with HTTP 301).
9. IMAGE AND LOGO INVENTORY
All transport images are in WebP format and stored in the /bahrain-saudi-gcc-transport/assets/images/ directory.

Filename	Dimensions	File Size	Eager/Lazy	Alt Text	Usage / Pages	Type
airport-pickup-bahrain.webp	1448 x 1086	83.9 KB	Lazy	Airport pickup service	Airport Transfers pages	Photography
bahrain-airport-private-transfer.webp	1672 x 941	74.7 KB	Lazy	Private airport transfer	Airport Transfers pages	Photography
business-vip-gcc-transfer.webp	1672 x 941	113.8 KB	Lazy	Business VIP transfer	Sightseeing, Passenger transfer	Photography
family-gcc-private-transport.webp	1672 x 941	96.5 KB	Lazy	Family GCC private transport	Passenger transport pages	Photography
gcc-airport-transfer-luggage.webp	1672 x 941	69.7 KB	Lazy	Luggage capacity transport	Airport Planners, routes	Photography
gcc-airport-transfer.webp	1672 x 941	147.0 KB	Lazy	Airport transport vehicles	Airport Transfer Hubs	Photography
gcc-country-bahrain-transport.webp	1448 x 1086	189.1 KB	Lazy	Bahrain GCC transport	GCC destinations, planners	Artwork
gcc-country-saudi-transport.webp	1448 x 1086	71.4 KB	Lazy	Saudi transport	GCC destinations, planners	Artwork
gcc-country-kuwait-transport.webp	1448 x 1086	98.2 KB	Lazy	Kuwait transport	GCC destinations, planners	Artwork
gcc-country-qatar-transport.webp	1448 x 1086	176.7 KB	Lazy	Qatar transport	GCC destinations, planners	Artwork
gcc-country-uae-transport.webp	1448 x 1086	87.3 KB	Lazy	UAE transport	GCC destinations, planners	Artwork
gcc-country-oman-transport.webp	1448 x 1086	126.5 KB	Lazy	Oman transport	GCC destinations, planners	Artwork
gcc-family-luggage-transport.webp	1672 x 941	107.3 KB	Lazy	Family luggage transport	Planners, route details	Photography
gcc-parcel-delivery.webp	1672 x 941	91.4 KB	Lazy	GCC parcel delivery	Parcel delivery page	Photography
gcc-private-transport-hero.webp	1672 x 941	213.4 KB	Lazy	Private transport hero vehicle	GCC Destinations	Photography
gcc-road-travel.webp	1672 x 941	47.9 KB	Lazy	Private road travel	Reverse routes, Dammam	Photography
gcc-route-map-bahrain-saudi-kuwait-qatar-uae-oman.webp	1672 x 941	116.6 KB	Lazy	GCC route map	GCC Planners	Map Illustration
gcc-transport-planner-hero.webp	1672 x 941	92.5 KB	Eager	GCC transport planner	Planners, Main Hubs	Photography
gcc-vehicle-size-comparison.webp	1672 x 941	184.6 KB	Lazy	SUV and GMC size comparison	Passenger transport	Photography
getvendora-journey-coordination.webp	1672 x 941	194.4 KB	Lazy	Chauffeur and coordinate	Passenger care, About	Photography
gmc-xl-interior-comfort.webp	1672 x 941	45.4 KB	Lazy	GMC XL interior comfort	Route pages	Photography
hero-gcc-private-transport.webp	1672 x 941	87.5 KB	Eager	GCC private transport	English home page	Photography
king-fahd-causeway-private-transfer.webp	1672 x 941	112.9 KB	Lazy	King Fahd causeway transfer	Causeway Guide	Photography
Favicons & Apple Touch Icons:
Logo Icon: https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png (Used as <link rel="icon"> and <link rel="apple-touch-icon"> on all pages).
10. MOBILE UX RISKS
The current website layout presents several design and usability challenges on mobile devices:

Missing Hamburger Menu: There is no drawer-style hamburger menu. Site links are laid out in a long horizontal scroll list.
Excessive Header Height: The sticky header (.topbar) plus the navigation row takes up too much vertical space on mobile screens, leaving a tiny viewport height for reading contents.
Horizontal Scroll Navigation: The horizontal scrolling navigation bar (.nav-menu) is prone to clipping; users do not notice hidden links unless they swipe, which looks unprofessional.
CTA Pushed Below the Fold: The main booking action buttons (e.g., "ابدأ الحجز الآن") are positioned too far down due to long hero paragraphs, forcing users to scroll immediately to act.
Small Touch Targets: Navigation buttons, flag badges, and quick-link pills have touch target heights under 40px, failing standard mobile tap target requirements (minimum 48px).
Duplicate WhatsApp Elements: The interface presents multiple adjacent WhatsApp links (floating button, header pill, in-card actions), which looks spammy and repetitive.
Form Input Difficulty: Select dropdown blocks stretch full-screen or can be hard to tap. Native <select> options render poorly on certain mobile OS skins.
Layout Overflow: Grid cards occasionally trigger minor horizontal window scrolling on narrow viewports (width < 360px).
Dense Wording Before Actions: Route pages contain lengthy introductory texts before the primary booking forms are reached.
Pricing Page Usability: The prices table is a long, stacked list of massive text blocks on mobile, requiring extensive scrolling to compare options.
Accessibility Contrasts: Light gold text against soft transparent backgrounds presents visibility challenges under sunlight.
Cumulative Layout Shift (CLS): Dynamic elements loaded via JS (like ratings, local settings) do not have skeleton loaders or min-height placeholders, causing layout shifts during page loading.
11. SAFE IMPLEMENTATION MAP
To deliver a premium mobile-first VIP redesign without violating the read-only bounds of the static HTML files, we propose the following file-by-file implementation strategy.

Mermaid diagram
Step 1: Stylesheet Overhaul
File: 
site.css
Controls: Theme colors, typography, header heights, bottom nav, pricing grids, buttons, overlays.
Proposed VIP Changes:
Transition variables to "Executive Navy" palette: Backgrounds (#0a111a), soft backgrounds (#101a26), gold accents (#d4af37), and premium dark navy surfaces.
Reduce mobile header (.topbar) height from ~90px to a compact 56px.
Create classes for a drawer-style Hamburger Menu overlay.
Create classes for a floating mobile Bottom Navigation Bar (anchoring Home, Trip Calculator, Prices, Contact).
Re-style booking form inputs to have spacious touch heights (48px) and clean focus states.
SEO Risk: Zero. Only affects CSS visual layout.
Required Test: Audit across iPhone/Android viewports; check that no content clips.
Step 2: Client Logic Modifications
File: 
site.js
Controls: Language changes, form configurations, click interceptors, dynamic HTML templates.
Proposed VIP Changes:
Inject hamburger menu element and toggle click listener on mobile headers.
Inject the bottom tab navigation bar dynamically on mobile viewports.
Hook the "Trip Calculator" bottom nav button to route to /bahrain-saudi-gcc-transport/gcc-transport-planner/ (which acts as the calculator page, preventing duplicate code).
SEO Risk: Low. Must ensure that dynamically injected links do not block Googlebot from crawling the site structure.
Required Test: Verify hamburger toggle, test bottom tab links, check console logs for errors.
Step 3: Page Layout Adjustments (Optional/Verification Only)
Files: HTML files (e.g. index.html, /en/index.html, /bahrain-to-dammam/index.html)
Proposed Changes: The redesign will be fully executed through the shared site.css and site.js files. Individual HTML files will remain untouched to eliminate sitemap, canonical, title, and heading index risks.
12. FINAL SAFETY CHECKLIST
Before any deployment, the following verification checklist must be run:

[ ] Sitemap Verification: Request all URLs inside /sitemap-index.xml, /sitemap-gcc-transport.xml and /sitemap-gcc-transport-en.xml and verify they return HTTP 200.
[ ] No URL Changes: Confirm that no folders or files have been renamed or moved, preserving all rankings.
[ ] Canonical Audit: Verify that <link rel="canonical"> on every page matches the exact page URL.
[ ] Hreflang Reciprocal Check: Verify that every Arabic page has <link rel="alternate" hreflang="en" href="..."> pointing to the English mirror, and the English mirror reciprocates back.
[ ] Metadata Preservation: Verify that titles, descriptions, and H1 tags on all pages remain unmodified.
[ ] Valid Schema: Pass representative pages through the Google Rich Results Test to ensure JSON-LD schemas (TaxiService, FAQPage, BreadcrumbList) remain valid.
[ ] Mobile HTML Availability: Verify that critical text descriptions are present in the initial mobile HTML source (not hidden or deleted).
[ ] Pricing Accuracy: Verify that the prices page accurately pulls pricing from the D1 database, and conversion to SAR is rounded correctly.
[ ] WhatsApp Booking Validation: Click every WhatsApp CTA on representative route pages and planners, verifying that the text is formatted cleanly and points to the correct number.
[ ] Passenger Care Feedback Loop: Complete a simulated booking, click through the prepared dialog, submit care feedback at /care/?token=..., and verify that the feedback is written to the D1 database.
[ ] Lighthouse Audit: Run Google Lighthouse audits on mobile and desktop viewports, validating that the Performance score is above 90 and CLS (Cumulative Layout Shift) is close to 0.
[ ] No Console Errors: Open the browser developer console on representative pages and ensure there are no JavaScript errors.
[ ] Git Diff Verification: Run git diff to guarantee that only site.css, site.js, and associated asset files are in the change list.
DISCOVERY COMPLETE — NO FILES MODIFIED