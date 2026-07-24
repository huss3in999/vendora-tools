# AI, Search and Trust Audit

Reviewed: 2026-07-25

## Readiness outcome

- Google: ready for technical crawling and indexing. The 176 indexable bilingual URLs have unique titles and descriptions, self-canonicals, paired hreflang entries, structured data, social metadata and complete sitemap coverage. Search Console submission and live indexing remain operational follow-ups, not guarantees.
- Bing and Copilot: ready for technical crawling and discovery. Bingbot is explicitly allowed, the sitemap inventory is complete, and IndexNow is implemented with a safe dry-run default. Bing Webmaster Tools verification, sitemap submission and post-deployment IndexNow submission remain follow-ups.
- ChatGPT Search: public pages and assets are accessible to OAI-SearchBot, while private paths stay blocked. This enables discovery but does not guarantee inclusion or placement.

## Changes completed

- Standardized the public entity name as `Vendora Transport`.
- Removed identified template-language references to “same design” or “same visual style” and replaced them with route-specific guidance.
- Added missing Open Graph and Twitter metadata.
- Added Organization and WebPage structured data where a page had no JSON-LD.
- Generated complete Arabic and English sitemaps from the public-page inventory.
- Added explicit Googlebot, Bingbot and OAI-SearchBot rules without opening admin, care, test or API surfaces.
- Added bilingual trust-policy links to indexable pages.
- Added privacy-safe AI-referral classification for ChatGPT/OpenAI, Perplexity, Microsoft Copilot, Gemini, Claude and You.com. No prompt or query text is collected.
- Added security headers to public asset responses and noindex/noarchive protection to private asset paths.
- Added IndexNow key hosting, sitemap-bounded validation and an explicit `--submit` gate.

## Content and commercial-intent review

Existing pages already cover Bahrain, Khobar, Dammam, Dammam Airport, Riyadh, Bahrain Airport and major GCC directions in both languages. These are stronger than creating thin city variants. Future expansion should only proceed when the service is confirmed and enough original operational guidance is available. Candidate opportunities are recorded in `commercial-intent-opportunities.json`; no keyword volumes or ranking claims are included.

## Genuine-photo trust recommendations

1. Replace the homepage illustrative hero first with an original, consent-cleared photo showing a representative vehicle at a recognizable but privacy-safe Bahrain pickup setting.
2. Add original airport-pickup imagery to the Bahrain Airport and Dammam Airport pages, avoiding passenger faces, boarding passes, flight documents and live name boards.
3. Add original luggage-loading examples only after the assigned vehicle and accessory are confirmed. Blur or crop all plates and never expose chassis numbers.
4. Add a small original operations/process set to About and Passenger Safety: clean cabin, secured luggage, child-seat option when genuinely available, and a neutral meeting-point example.
5. Store the capture date, photographer/owner permission, alt text and pages authorized to use each image in an internal asset register.

## AI-generated image treatment

The current homepage hero is labeled in Arabic and English as an AI-assisted illustrative image. It is not presented as a specific assigned vehicle, driver, customer journey or documentary proof. Other images should be audited against their source records before being described as genuine. Generated imagery must not fabricate customers, reviews, licences, partners, vehicle ownership or exact capacity.

## Privacy and security

Public guidance does not publish vehicle plate numbers, chassis numbers, driver-private details or unverified capacities. Admin, passenger-care, API, scratch and test paths are excluded from search discovery, and private asset responses receive `X-Robots-Tag: noindex, nofollow, noarchive` plus no-store and baseline browser security headers.

## Evidence and limits

Technical readiness was checked locally. It cannot prove future indexing, ranking, AI citation, search volume or production configuration. Platform guidance used:

- Google crawling and indexing: https://developers.google.com/search/docs/crawling-indexing
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google multilingual guidance: https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites
- Bing robots guidance: https://www.bing.com/webmasters/help/how-to-create-a-robots-txt-file-cb7c31ec
- Bing IndexNow guidance: https://www.bing.com/webmasters/help/indexnow-0z209wby
- OpenAI ChatGPT Search crawler guidance: https://help.openai.com/en/articles/9237897-chatgpt-search
- IndexNow protocol: https://www.indexnow.org/documentation

## Operational follow-ups

- Deploy the committed files through the normal release process.
- Verify Google Search Console and Bing Webmaster Tools ownership, submit the sitemap index, and monitor coverage.
- After the IndexNow key file is live, run `npm run validate:indexnow`, then intentionally run the submission script with `--submit`.
- Capture and approve genuine operational photos, then replace illustrative imagery in priority order.
- Review the AI-referral dashboard after enough anonymous sessions have accumulated.
