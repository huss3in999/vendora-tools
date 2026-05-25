# AI Discovery Repair Report

Date: 2026-05-26

## Files Changed

- `index.html`
  - Broadened homepage title, meta description, Open Graph, Twitter metadata, and JSON-LD descriptions from restaurant-only positioning to the full Vendora site identity.
  - Kept the canonical URL as `https://getvendora.net/`.
  - Kept existing FAQ and ItemList schemas.
  - Added a short visible homepage section titled `What you can do on Vendora`.

- `llms.txt`
  - Replaced the narrow opening with a full-site Vendora description.
  - Added main sections for all tools/calculators, PDF tools, business and restaurant tools, transport pages, Arabic search intents, and `ai-index.json`.
  - Preserved the existing complete 376-entry tool inventory below the new opening.

- `.well-known/llms.txt`
  - Updated to match `llms.txt` exactly.

- `ai-index.json`
  - Added a valid machine-readable AI discovery index for Vendora's main public sections.
  - Used only URLs that exist in the repository.

- `sitemap.xml`
  - Added `https://getvendora.net/ai-index.json`.
  - Kept existing `llms.txt` and `.well-known/llms.txt` entries.
  - Did not remove existing URLs.

- `robots.txt`
  - Kept `User-agent: *` and `Allow: /`.
  - Kept existing sitemap lines.
  - Added a comment reference for `https://getvendora.net/ai-index.json`.

- `bahrain-saudi-gcc-transport/index.html`
- `bahrain-saudi-gcc-transport/about/index.html`
- `bahrain-saudi-gcc-transport/contact/index.html`
- `bahrain-saudi-gcc-transport/gcc-destinations/index.html`
- `bahrain-saudi-gcc-transport/passenger-transport/index.html`
- `bahrain-saudi-gcc-transport/parcel-delivery/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-saudi/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-khobar/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-dammam/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-riyadh/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-kuwait/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-qatar/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-uae/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-dubai/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-oman/index.html`
- `bahrain-saudi-gcc-transport/bahrain-to-iraq/index.html`
- `bahrain-saudi-gcc-transport/saudi-to-bahrain/index.html`
- `bahrain-saudi-gcc-transport/site.js`
  - Replaced visible internal/SEO-style wording such as references to Google, search engines, and "why this page matters" with normal customer-facing explanations.
  - Updated matching Arabic/English phrase pairs in `site.js` where applicable.

## What Was Not Changed

- No URLs were moved, renamed, or deleted.
- No tool JavaScript behavior was changed.
- PDF converter functionality was not changed.
- No Cloudflare Worker secrets, API keys, admin pages, or private/API URLs were touched.
- No AggregateRating schema was added.
- No fake reviews were added.
- Restaurant/POS wording was not removed from the site; the identity was broadened.
- Existing FAQ and ItemList schemas were preserved.

## Tests and Checks Run

- Parsed `ai-index.json` as JSON successfully.
- Parsed `sitemap.xml` as XML successfully.
- Confirmed `robots.txt` still contains `User-agent: *` and `Allow: /`.
- Confirmed `llms.txt` exists.
- Confirmed `.well-known/llms.txt` exists.
- Confirmed `llms.txt` and `.well-known/llms.txt` match exactly.
- Confirmed homepage canonical remains `https://getvendora.net/`.
- Parsed homepage JSON-LD blocks successfully.
- Confirmed no `AggregateRating` appears in the repaired discovery files/homepage.
- Confirmed `ai-index.json`, `llms.txt`, and `.well-known/llms.txt` are included in `sitemap.xml`.
- Confirmed no admin/API/private/test URLs were added to `sitemap.xml`.
- Confirmed all `ai-index.json` important URLs map to existing local pages.
- Searched public HTML for the requested internal/SEO phrases and removed the matches found.
- Ran `npm run test:e2e`; it timed out after 120 seconds in this environment before completing.

## Missing Real Business Info Needed From Owner

- Official legal business name, if different from Vendora.
- Verified public phone number and WhatsApp number for site-wide schema, if desired.
- Physical address, service area details, license, or company registration, if the owner wants those displayed.
- Verified social profiles.
- Real review/testimonial source data, if the owner ever wants review markup. Do not add AggregateRating without real eligible review data.

## Recommended Next Phase

- Add dedicated crawlable English URLs for any transport pages that still rely heavily on JavaScript language toggles.
- Review existing homepage testimonials for source accuracy before any future schema work.
- Regenerate `sitemap.xml` and `sitemap-tools.xml` from a single script if the project has a canonical generator.
- Consider adding `ai-index.json` to any deployment/cache checklist so it stays current with new public sections.
