# Validation

- `public`: `npm run build` passed, including transport publisher, 218-page configuration validation and Wrangler deployment dry run.
- `public`: `npm test` passed: 61 tests.
- Transport Playwright: `tests/tripadvisor.spec.js` plus `tests/trust-upgrade.spec.js`: 98 passed. English checks reported no visible Arabic characters.
- Final targeted Tripadvisor checks: 6 passed after queue availability gating and official wordmark integration.
- QR card rendered to PNG and decoded using ZXing; payload exactly `https://www.tripadvisor.com/UserReviewEdit-d34715134`.
- Direct review URL opened in Chrome and visibly identified Vendora Transport, Seef, Bahrain. No review submitted.
- `git diff --check` passed.

The build exposed an existing Windows newline issue that duplicated generated translation blocks. The publisher now accepts CRLF and LF endings and regenerates one block; subsequent synchronization reported zero pending changes. Route-language regression checks passed after this cleanup.

Browser tests cover draft readiness after 40 minutes, duplicate completion events, browser reload persistence, language-specific review links and removal when a trip is reopened. They do not send any customer messages or modify real bookings.

The WhatsApp queue is local to the browser. Provider delivery, background sending and cross-device synchronization are unavailable because the business currently uses mobile WhatsApp without a messaging API. The bilingual email is a prepared template, not an active email workflow.

Tripadvisor representative verification remains pending, with the site stating an email response within 72 hours. Descriptions, contact changes, hours and photo uploads could not be applied while owner editing is unavailable.

## Production

Published to the existing Cloudflare Worker `vendora-tools`, getvendora.net and www.getvendora.net routes only. Initial deployment version: `bcd2fc0e-aec8-43d5-bf01-9bea16db44f2`. Live Chrome inspection confirmed both exact outgoing links, the loaded official wordmark, and Tripadvisor in the homepage JSON-LD. No Smart Page Platform or branded short-link project configuration changed.

Final production version: `013b984f-9c19-48b7-9174-cfe9891b9143`. Official wordmark contrast was verified in Chrome after adding `color-scheme: only light`; screenshot saved as `website-live.png`.

## GCC branding update — 23 October 2026

- Main English and Arabic homepages now lead with all six GCC countries, transfers in either direction, and private car-with-driver hire within each country.
- Logo ImageObject, localized Country areaServed entries and full GCC service descriptions are published through the shared business schema.
- Vendora logo added to QR card and email template; prepared profile preview saved as HTML and PNG. Marketing illustration is explicitly identified; authentic fleet photographs still required for Tripadvisor.
- Google Search Console inspected directly in Chrome (GSC Wizard subscription unavailable). Homepage is indexed. The indexed version from 22 October reports four review rich-result errors: multiple reviews without aggregateRating and nested itemReviewed directional conflict.
- Removed self-serving Review / AggregateRating markup from the shared LocalBusiness entity. Visible testimonials remain. Google explicitly excludes self-serving LocalBusiness reviews: https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- 61 application tests and 98 browser regressions passed. Additional mobile homepage check verifies no horizontal overflow, visible logo and both services. Latest targeted run contains 7 checks.
- Tripadvisor ownership verification remains pending; no logo, cover or business-description changes were falsely reported as uploaded.

Latest production version for GCC branding and removal of invalid review markup: `3c1e6539-3100-4e85-95d8-48a0ad1057bd`. Google recrawl was requested, but its final confirmation was not observed after browser access changed. Tripadvisor photo-management access remains explicitly blocked pending representative verification; the existing logo was confirmed publicly in its photo gallery. The 30% figure is a personal review draft, not business completeness.
