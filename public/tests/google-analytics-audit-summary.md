# Google Analytics GA4 Audit Summary

Generated: 2026-06-05T17:13:51.120Z
Required GA4 ID: `G-DFY197R2MS`
Live base URL: https://getvendora.net
Local base URL: http://127.0.0.1:4173
Playwright console checks run: 80

## Totals

| Metric | Count |
|--------|------:|
| Total HTML pages checked | 927 |
| Real public pages | 516 |
| Pages with GA4 (correct ID) | 919 |
| Real public pages missing GA4 | 0 |
| Pages using analytics-loader.js | 516 |
| Real public pages using inline gtag only | 21 |
| Pages with noindex | 4 |
| Fragments/includes ignored | 2 |
| _site duplicate folder ignored | 406 |
| **Real public pages needing fix** | **0** |
| Pages with wrong GA4 ID | 0 |

## Real public pages missing Google Analytics

_None._

## Real public pages using inline gtag (not analytics-loader.js)

- `/about/` — https://getvendora.net/about/
- `/all-tools/` — https://getvendora.net/all-tools/
- `/contact/` — https://getvendora.net/contact/
- `/guides/break-even-calculator-guide/` — https://getvendora.net/guides/break-even-calculator-guide/
- `/guides/commission-calculator-guide/` — https://getvendora.net/guides/commission-calculator-guide/
- `/guides/daily-sales-summary-guide/` — https://getvendora.net/guides/daily-sales-summary-guide/
- `/guides/delivery-commission-calculator-guide/` — https://getvendora.net/guides/delivery-commission-calculator-guide/
- `/guides/discount-calculator-guide/` — https://getvendora.net/guides/discount-calculator-guide/
- `/guides/food-cost-calculator-guide/` — https://getvendora.net/guides/food-cost-calculator-guide/
- `/guides/invoice-generator-guide/` — https://getvendora.net/guides/invoice-generator-guide/
- `/guides/margin-calculator-guide/` — https://getvendora.net/guides/margin-calculator-guide/
- `/guides/markup-calculator-guide/` — https://getvendora.net/guides/markup-calculator-guide/
- `/guides/menu-price-calculator-guide/` — https://getvendora.net/guides/menu-price-calculator-guide/
- `/guides/profit-margin-calculator-guide/` — https://getvendora.net/guides/profit-margin-calculator-guide/
- `/guides/qr-menu-generator-guide/` — https://getvendora.net/guides/qr-menu-generator-guide/
- `/guides/receipt-generator-guide/` — https://getvendora.net/guides/receipt-generator-guide/
- `/guides/roi-calculator-guide/` — https://getvendora.net/guides/roi-calculator-guide/
- `/guides/tip-calculator-guide/` — https://getvendora.net/guides/tip-calculator-guide/
- `/guides/vat-calculator-guide/` — https://getvendora.net/guides/vat-calculator-guide/
- `/privacy-policy/` — https://getvendora.net/privacy-policy/
- `/restaurant-calculators/` — https://getvendora.net/restaurant-calculators/

## Real public pages that need fixing (urgent)

_None — all real indexable public pages have GA4._

## Pages with wrong GA4 measurement ID

_None._

## Ignored: fragments / includes

- `_site/tools/small-business/smb-row-manifest.inc.html`
- `tools/small-business/smb-row-manifest.inc.html`

## Ignored: _site duplicates (not urgent unless deployed separately)

_406 pages under `_site/` — see JSON report for full list._

## Ignored: noindex / private (not urgent)

- `/bahrain-saudi-gcc-transport/admin/` (noindex, admin) — GA: no
- `/bahrain-saudi-gcc-transport/admin/tracking-dashboard/` (admin) — GA: no
- `/bahrain-saudi-gcc-transport/care/` (noindex, care) — GA: no
- `/bahrain-saudi-gcc-transport/care/en/` (noindex, care) — GA: no

## Notes

- Pages using `analytics-loader.js` load GA4 (`G-DFY197R2MS`) at runtime even if inline gtag is absent.
- Care and admin pages are private/noindex and are not counted as urgent GA gaps.
- `_site/` mirrors are legacy build output; canonical live URLs are outside `_site/`.
