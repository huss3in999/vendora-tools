# Vendora Transport readability, mobile media, and WhatsApp audit

Date: 2026-07-21

## Scope and result

- Audited all 140 public transport HTML pages in `full-site-audit.json`: 70 Arabic and 70 English.
- Inventory includes 138 indexable pages and the 2 intentionally `noindex` Passenger Care pages.
- Readability audit result: 140 pages passed, 0 pages with detected faded active text, and 0 pages with detected low-contrast copy on the light executive panels.
- Mobile service-media result: 140 pages passed at 390px with no duplicate visible content-hero image, portrait service frame, or excessive service-image height.
- Representative coverage included every requested category, plus Arabic and English price/calculator surfaces, at 320, 360, 375, 390, 430, 768, and 1440px.
- Physical HTML files modified: 0. The corrections are shared and affect the full 140-page runtime safely.

## 1. Unreadable-text root cause and correction

The current light `#fffdf8` executive panels inherited pale text tokens and component colors from the earlier dark-card design. Examples included legacy muted copy, checklist text, helper text, booking labels, route links, and outlined-button text intended for navy surfaces. The issue was a foreground/background context mismatch, not a failed reveal animation: the only intentionally transparent elements found were hidden form controls, and no customer copy depended on JavaScript animation completing.

Shared corrections in `site.css`:

- Scoped strong `#34475a` body/muted copy to light `.section-shell` surfaces and restored opacity to 1.
- Corrected checklist, steps, vehicle, route-directory, availability, price-note, trust, helper, booking-summary, and footer-copy selectors.
- Corrected booking labels and supporting copy outside the intentionally dark home booking block.
- Restored outlined buttons to dark readable text, visible gold borders, an opaque cream background, and clear hover/focus states.
- Set readable opaque placeholders (`#5c6d7e`).
- Strengthened Arabic rendering with the existing Tahoma/Segoe UI/Arial stack, 1.75 line-height, and weight 500 for customer copy and controls.
- Preserved the navy, cream, gold, and green brand system; no global redesign or blanket `!important` treatment was added.

Page-specific exception: `.planner-panel` remains an intentionally opaque navy surface. Its body text, headings, metrics, and outlined controls received scoped light-on-dark colors so the shared light-panel correction does not invert it.

## 2. Tall/cropped mobile image root cause and correction

Two shared causes combined:

1. The mobile content-hero rule forced a fixed 220px image height with a centered cover crop.
2. `setupVipPageOpening()` looked only for the dynamically assigned `.vip-page-hero-image` class. Existing semantic hero images did not yet have that class, so JavaScript prepended a second fallback image. The two stacked images made some media regions extremely tall and amplified unhelpful crops.

Corrections:

- `setupVipPageOpening()` now reuses the existing hero image and assigns the shared class; it creates a fallback only when the container genuinely has no image.
- `.service-card > img`, `.service-media img`, `.route-card > img`, and `.split-feature > img` now use a stable 16:9 landscape frame, `width: 100%`, `height: auto`, and `object-fit: cover` without distortion.
- Non-planner mobile content heroes now use an automatic 16:9 frame instead of a tall fixed crop.
- Desktop content heroes are capped at a sensible maximum height.
- Fleet artwork uses `object-fit: contain` on navy so all vehicle options remain visible.
- Focal positions were tuned for airport (52% 48%), hotel (48% 44–46%), family (52% 48%), business (57–58% 47–48%), and Bahrain–Saudi (58–60% 48%) imagery.
- The real content-page hero remains eager/high-priority; the existing homepage hero and its responsive sources were not replaced.

## 3. WhatsApp source identification

The site had several independent message builders. The shared handler, price cards, GCC planner, GCC guide, and Passenger Care fallback therefore did not consistently identify the source.

Updated templates now use the required language-specific opening and URL exactly once, followed by the selected service/route or the complete generated request. The central configured number and override behavior remain intact.

Updated paths:

- Shared and generic CTAs, floating control, sticky/mobile controls, service/route CTAs, booking requests, calculator results, and hardcoded legacy WhatsApp URLs: `site.js`.
- Price cards: `assets/prices-page.js`.
- GCC transport planner: `assets/gcc-transport-planner.js`.
- GCC private transport guide, including dynamic and static links: `gcc-private-transport-guide/src/shared/gcc-guide.js`.
- Passenger Care legacy/fallback messages: `care/care.js`.

The wrapper removes obsolete duplicate page-URL lines, keeps the website URL once, preserves language, retains all trip detail lines supplied by each builder, and preserves the appended booking reference and Passenger Care link.

CTA types tested: generic/shared links, floating WhatsApp, mobile/sticky WhatsApp, route and service requests, price cards, planner output, calculator/current-result output, guide links, hardcoded legacy `wa.me` links, configured number override behavior, and Passenger Care append/failure paths.

## 4. Validation evidence

- `tests/full-site-readability-whatsapp.spec.js`: 10 passed. It inventories all 140 public pages, checks opacity and light-panel contrast, validates every page's mobile hero/media frame, verifies representative categories at all 7 widths, and checks Arabic/English source templates and specialized message builders.
- Compatibility suite (`audit`, GCC planner, guide tracking, manual planner QA, Passenger Care, new-page tracking, professional trip calculator): 140 passed.
- Visual/mobile suites (`visual-regressions`, `vip-mobile-redesign`): 23 passed.
- Focused Passenger Care and planner integration run: 24 passed.
- JavaScript syntax checks: all 5 changed production JavaScript files passed.
- Static content/SEO audit: 140/140 pages passed; critical 0, high 0, medium 0, low 0; Arabic/English pair gaps 0.

## 5. Exact files changed

Production files (6):

1. `site.css`
2. `site.js`
3. `assets/prices-page.js`
4. `assets/gcc-transport-planner.js`
5. `gcc-private-transport-guide/src/shared/gcc-guide.js`
6. `care/care.js`

Validation/report files (3):

7. `tests/full-site-readability-whatsapp.spec.js`
8. `tests/manual_qa_planner.spec.js`
9. `readability-mobile-whatsapp-audit-report.md`

## 6. Remaining issues

None found within the requested scope. No URL, SEO, price, analytics, Passenger Care, configured WhatsApp-number override, booking, bilingual-direction, or existing mobile-shell regression was detected.
