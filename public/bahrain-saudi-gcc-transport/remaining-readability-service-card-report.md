# Vendora Transport follow-up readability and service-card report

Date: 2026-07-21

## 1. Exact remaining-text root cause

The original dark-theme component rules still assigned pale `--muted`, `#ddd4e5`, and `#eee8f3` colors to vehicle descriptions, route links, service descriptions, and lists. The earlier correction applied mainly inside `.section-shell`; the homepage service and vehicle components are not all descendants of that shell. Consequently, the old pale colors remained active on the new cream page surface. This was a CSS scope/cascade issue, not a reveal-animation failure. The stylesheet contains no content reveal state below full opacity; the only zero-opacity controls are intentionally hidden radio inputs.

## 2. Variables and selectors changed

The final component layer in `site.css` now defines explicit surface-aware tokens:

- `--text-primary: #0b2138`
- `--text-secondary: #34475a`
- `--text-muted-readable: #506071`
- `--link-on-light: #243b63`
- `--surface-light: #fffdf8`
- `--surface-light-soft: #f4efe5`
- `--text-on-dark: #f7f2e8`
- `--text-secondary-on-dark: #dce5ed`

Corrected selectors cover light section copy, headings, vehicle descriptions, service descriptions and lists, FAQ copy, form labels/help, price and route notes, route links, generated route-directory links, active controls, dark panels, planner panels, booking panels, featured cards, and footer copy. Important visible text is explicitly opaque. Dark-surface exceptions are declared after the light rules so they retain strong off-white copy.

## 3. Components corrected

- Vehicle-option descriptions and availability note
- Homepage service descriptions, benefit lists, titles, buttons, and WhatsApp text links
- Popular route groups and generated complete-route directory
- Related route cards and their controls through existing light-card rules
- FAQ paragraphs and summaries
- Pricing and booking supporting copy
- Form labels and help text
- Planner and calculator surfaces
- Company, featured, booking, price-callout, and planner dark panels
- Footer text and links
- Arabic and English typography, opacity, and direction remain intact

## 4. Service-card structure and presentation

No HTML, content, URL, or image file was changed. The existing semantic structure was restyled through shared CSS:

- The card is now a light cream unified surface with a subtle navy border and shadow.
- Existing images remain unchanged and render edge-to-edge at the top in their 16:9 frame.
- The former thick dark visual frame is gone.
- Content appears directly below the image with compact 17–20px padding.
- Titles use dark navy; descriptions and the existing maximum-three benefit lists use readable dark secondary text.
- Primary card links are clear 44px controls; WhatsApp links remain visibly green secondary actions.
- Icon-only services use a shorter 124px navy-and-gold media block instead of a tall empty visual area.
- Mobile gaps, padding, and line-height were reduced so cards are lighter and shorter while preserving all correct content.
- Existing sticky-navigation safe spacing remains unchanged and tested.

## 5. Route-link style

`.route-groups a` and `.complete-route-directory a` are now visible without hover: dark navy text, weight 650, opaque soft-cream background, subtle navy border, 12px radius, and a minimum 44px tap height. Hover and keyboard focus use a stronger cream background and gold-brown border. Route names, destinations, internal URLs, and SEO crawlability were not changed.

## 6. Pages and widths tested

- Full inventory: all 140 public pages, consisting of 70 Arabic and 70 English pages.
- Human visual comparison: full Arabic and English home pages at 390px, including service cards, vehicle options, forms, route links, FAQs, company panel, and footer.
- Automated component visual requirements: Arabic and English home pages at 320, 360, 375, 390, 430, 768, and 1440px.
- Representative category matrix at all seven widths: home, local transport, airports, hotels, full-day car, business chauffeur, family transport, Saudi and GCC routes, planners, calculator/price surfaces, and booking terms.
- All 140 pages were checked at mobile width for active-text opacity, light-panel contrast, duplicate media, and excessive portrait media.

Validation results:

- Follow-up full-site/component suite: 11 passed.
- Visual/mobile suites: 23 passed.
- Functional, SEO, analytics, WhatsApp, Passenger Care, planner, and calculator compatibility suite: 140 passed.
- Static content/SEO inventory: 140/140 pages passed; critical 0, high 0, medium 0, low 0; missing language pairs 0.

## 7. Exact files modified in this follow-up

1. `site.css`
2. `tests/full-site-readability-whatsapp.spec.js`
3. `remaining-readability-service-card-report.md`

No HTML or image files were modified. No images were generated or replaced. No remaining issue was detected within the requested scope.
