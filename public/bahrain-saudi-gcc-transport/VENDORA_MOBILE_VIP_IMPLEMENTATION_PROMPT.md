# Vendora Mobile VIP Redesign — Codex Implementation Prompt

## Goal

Implement the production-ready mobile-first VIP redesign for GetVendora Transport inside:

`public/bahrain-saudi-gcc-transport/`

The mobile experience should feel as clear and polished as a premium transport application, while desktop must remain a conventional, complete, responsive website. Improve trust, comprehension, pricing discovery, trip planning, and WhatsApp conversion without sacrificing existing SEO, routes, content, database pricing, analytics, or passenger-care behavior.

Work autonomously through inspection, implementation, testing, visual QA, and final diff review. Do not deploy, push, publish, delete files, or change production data.

## Read first

1. Read every applicable `AGENTS.md` from the repository root down to the transport directory.
2. Read `VENDORA_MOBILE_VIP_DISCOVERY.md` if present. If it is supplied under another filename, locate the discovery report beginning with `VENDORA TRANSPORT - MOBILE VIP REDESIGN DISCOVERY REPORT`.
3. Inspect the actual repository. Treat the report as guidance, not a substitute for checking current files.
4. Run `git status` if Git is available. Preserve all pre-existing user changes and do not overwrite unrelated work. If Git is unavailable, continue safely and report that limitation.

## Non-negotiable SEO and behavior protections

Before editing, create a machine-readable temporary SEO baseline for every public HTML page in the transport section. Record at least:

- source path and public route;
- `<title>` text;
- meta description;
- H1 count and exact H1 text;
- canonical URL;
- all hreflang values and URLs;
- JSON-LD blocks and schema `@type` values;
- robots directives;
- important internal navigation URLs.

After implementation, run the same extraction and compare it with the baseline. The task is not complete unless any difference is either removed or explicitly justified as required and SEO-safe.

Do not:

- rename, move, remove, merge, or redirect any existing public page or directory;
- change existing URL paths, canonical URLs, hreflang relationships, sitemap entries, robots rules, titles, meta descriptions, H1 text, indexed body copy, or JSON-LD claims;
- convert important server-rendered content into JavaScript-only content;
- hide indexed text from mobile users or search engines;
- alter the D1 price source, route-price calculations, BHD/SAR conversion, pricing schema injection, or server-rendered `#priceList` behavior;
- break `prices-page.js`, the public-settings endpoint, Worker HTMLRewriter logic, passenger-care flow, booking references, or WhatsApp lead interception;
- remove or rename analytics events including `pageview`, `whatsapp_click`, `whatsapp_continue`, `whatsapp_cancel`, `prepared_dialog_view`, and `lead_created`;
- invent reviews, ratings, passenger counts, licenses, safety guarantees, office details, awards, partnerships, or other trust claims;
- add a service worker, offline cache, install prompt, or new PWA architecture in this phase;
- add heavy frameworks, a build system, external UI libraries, tracking scripts, or remote web fonts.

Preserve the direct WhatsApp fallback and configured database number. Do not hardcode a different booking number.

## Approved visual system

Use these tokens consistently:

- Executive navy: `#071A2E`
- Graphite: `#0B1118`
- Ivory: `#F7F2E8`
- Champagne gold: `#C8A96B`
- WhatsApp green: retain the existing accessible brand green

Use gold as a controlled accent, not large areas of gold text. Maintain WCAG AA contrast, especially outdoors on mobile. Use a refined system serif stack for major headings and a fast system sans-serif stack for controls and body copy. Do not add a Google Fonts dependency.

## Approved assets and exact locations

Confirm these files exist before implementation:

- `assets/brand/vendora-transport-logo-light.svg` — light/ivory wordmark for navy or dark backgrounds
- `assets/brand/vendora-transport-logo-dark.svg` — navy wordmark for ivory or light backgrounds
- `assets/brand/vendora-transport-app-icon.svg` — scalable square icon
- `assets/brand/vendora-transport-app-icon-512.png` — 512 px raster icon
- `assets/images/vendora-vip-gmc-airport-hero-draft-v1.png` — source hero artwork

Treat the draft hero PNG as an input, not the final served asset. Visually inspect it. Produce an optimized WebP named:

`assets/images/hero-vendora-vip-gmc-airport.webp`

Preserve the source PNG. Do not manufacture vehicle badges, number plates, flags, company offices, people, reviews, or documentary evidence. If the artwork has an obvious malformed detail that cannot be corrected safely, do not publish it; retain the current authentic hero and report the issue.

Reuse the existing authentic photographs where contextually appropriate, including:

- `business-vip-gcc-transfer.webp`
- `king-fahd-causeway-private-transfer.webp`
- `gcc-vehicle-size-comparison.webp`
- `gmc-xl-interior-comfort.webp`
- `gcc-airport-transfer-luggage.webp`

Do not repeat the AI hero on every route page. Authentic operational photographs should carry most of the trust burden. Every image must have correct intrinsic dimensions, useful alt text appropriate to its page, and lazy loading unless it is the above-the-fold hero. Avoid cumulative layout shift.

## Implementation scope

Prefer shared changes in:

- `site.css`
- `site.js`
- the approved asset directories

Do not assume CSS and JavaScript alone are automatically safer. If a limited HTML change is essential for accessible semantics or initial-render navigation, make the smallest mechanical shared change possible and prove through the SEO comparison that protected content and metadata remain identical. Do not hand-edit dozens of pages inconsistently.

Do not modify `worker.js`, D1 code, API handlers, sitemaps, redirects, pricing logic, tracking logic, or passenger-care logic unless a verified defect makes it unavoidable. Stop and report before expanding into those areas.

## Mobile application-style experience

At mobile widths, implement:

1. A compact sticky header approximately 56–64 px high containing the correct logo, a clear language control, and an accessible hamburger button.
2. An accessible drawer menu with a backdrop, visible close button, keyboard focus management, Escape-to-close, body scroll lock, correct `aria-expanded`/`aria-controls`, and RTL/LTR behavior.
3. Drawer access to Home, GCC Destinations, Prices, Trip Calculator, Airport Pickup Planner, Passenger Transport, Parcel Delivery, About, Contact, and the alternate language.
4. A four-action bottom navigation using safe-area spacing: Home, Trip Calculator, Prices, and WhatsApp. Use the existing planner URLs. Do not create a duplicate calculator.
5. Hide or consolidate the existing floating WhatsApp control when the bottom WhatsApp action is present. The interface must not look spammy or show adjacent duplicate WhatsApp CTAs.
6. Minimum 48 px touch targets, clear focus states, no clipped labels, no accidental horizontal page scrolling down to 320 px width, and support for mobile browser safe areas.
7. A concise above-the-fold homepage hero: retain the exact existing H1, shorten only visually through layout—not by deleting indexed text—show a brief lead, one primary planning/pricing action, one WhatsApp action, and the approved hero or authentic fallback.
8. Compact trust signals based only on verifiable existing facts: private vehicle, 24/7 availability if currently configured and truthful, transparent per-vehicle pricing, existing passenger-care/booking-reference flow, and authentic vehicle imagery.
9. Country/destination choices that are immediately recognizable in Arabic and English. Flags may be decorative support but must not replace readable country names.
10. Mobile pricing cards that are easy to scan and compare. Preserve the server-rendered prices and ItemList schema. Add lightweight client-side filtering or category controls only if they work as progressive enhancement and do not hide content when JavaScript is unavailable.
11. Restyle the existing GCC Transport Planner as “Trip Calculator” / “مخطط الرحلة” and keep its existing route data and WhatsApp message generation. Preserve the separate Airport Pickup Planner.
12. Reserve dimensions/min-height for dynamic ratings, settings, prices, and dialogs to reduce CLS. Do not show fake skeleton content as a factual value.

## Desktop experience

At desktop widths:

- keep a normal full website header and visible primary navigation;
- use restrained premium spacing and a readable maximum content width;
- keep important content, route cards, forms, FAQs, and footer discoverable;
- do not force the mobile bottom navigation or drawer interaction onto desktop;
- use the same approved palette and identity without making every page excessively dark;
- ensure Arabic RTL and English LTR layouts both look intentional.

## Progressive enhancement and resilience

- Core navigation, indexed content, pricing, and contact information must remain available without JavaScript.
- JavaScript enhancements must be idempotent and must not inject duplicate headers, drawers, bottom bars, IDs, or event listeners.
- Preserve file-protocol fallbacks where the existing project supports them.
- Keep browser history, back-button behavior, deep links, and hash links working.
- Respect `prefers-reduced-motion` and avoid long or distracting animations.
- Do not use deceptive urgency, autoplay audio/video, modal-on-load marketing, or dark patterns.

## Verification requirements

Run the repository’s available checks and add focused, non-invasive verification scripts if necessary. At minimum verify:

### Functional coverage

- Arabic and English homepages;
- Arabic and English pricing pages;
- Arabic and English GCC planners;
- airport pickup planner;
- at least one Bahrain–Saudi route in each language;
- one reverse route;
- one Iraq/ziyarat route;
- About, Contact, and Privacy pages;
- hamburger, drawer, language links, bottom navigation, all planner links, and representative WhatsApp flows;
- no JavaScript console errors.

### SEO coverage

- zero unexplained difference in protected SEO baseline fields;
- every sitemap URL still resolves to its expected local page and, where network access permits, HTTP 200;
- reciprocal hreflang remains valid;
- representative JSON-LD parses successfully;
- prices remain present in initial production HTML through the Worker path;
- critical mobile content is not JavaScript-only.

### Visual and accessibility coverage

Capture and inspect screenshots at least at:

- 390 × 844: Arabic home, English home, prices, planner, open drawer;
- 360 × 800 and 320 × 568: overflow and tap-target checks;
- 768 × 1024: tablet behavior;
- 1440 × 900: Arabic and English desktop home and prices.

Check keyboard navigation, visible focus, drawer focus containment, Escape behavior, RTL alignment, color contrast, image aspect ratios, and reduced-motion behavior.

Run Lighthouse or the closest locally available equivalent on representative mobile and desktop pages. Target performance above 90 where the environment permits, near-zero CLS, and no regression in accessibility or SEO. Report actual measured results; do not claim a score that was not run.

## Completion conditions

Before finishing:

1. Review the complete diff for regressions, accidental content changes, secrets, generated junk, and out-of-scope modifications.
2. Confirm that no production deployment, push, database write, or destructive operation occurred.
3. Provide a concise final report containing:
   - files changed and why;
   - screenshots produced;
   - tests and commands run with results;
   - SEO before/after comparison result;
   - performance/accessibility results actually measured;
   - any limitations or items needing human verification;
   - exact next safe deployment/rollback steps, without performing them.

Continue until the implementation and all locally possible verification are complete. If blocked, exhaust safe read-only diagnostics and report the exact blocker rather than guessing or weakening the protections.
