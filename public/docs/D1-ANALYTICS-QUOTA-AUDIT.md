# Transport D1 analytics quota audit

## Before this branch

`admin/index.html` loaded nine GET resources on every dashboard refresh:

| Resource | Purpose | Raw D1 cost before this branch |
| --- | --- | --- |
| `leads` | WhatsApp/lead rows | 1 query, up to 800 rows |
| `pageviews` | pageview rows | 1 query, up to 800 rows |
| `routes` | route configuration | 1 query |
| `summary` | funnel, route/source/country/device/day/hour/campaign/status/page reports | about 25 D1 queries, including repeated scans of `whatsapp_leads` and `analytics_events` |
| `notification-settings` | admin notification preferences | 1 query |
| `errors` | error log | 1 query |
| `passenger-care` | care feedback | 1 query |
| `public-settings` | public configuration | 1 query/cache lookup |
| `tracking` | Site Analytics | about 22 D1 queries against `analytics_events` |

The approximate initial load was therefore 9 API calls and about 54 D1 statements, before schema checks, GA4 requests, or later tab refreshes. Today, 7-day, and 30-day ranges still executed the same query fan-out, with smaller date windows. All Time removed the date predicates from the raw summary path and could scan the full shared tables.

Online Now is intentionally independent of the selected range and remains a last-five-minute operational query.

## Changes in this branch

- Bounded lead/pageview detail requests now use a 200-row display cap. All Time does not request either raw detail list.
- Site Analytics now receives the selected admin period instead of a hardcoded `7_days` value.
- Repeated `summary` and `tracking` responses are cached in the Worker isolate for two minutes and keyed by the full query string. Admin writes and deletes invalidate these entries.
- All Time summary and Site Analytics use `daily_analytics_aggregates` only. The response identifies its coverage as incremental since migration; no historical numbers are invented.
- Tracking suppresses verified/clearly named crawlers, admin/care paths, explicit synthetic/internal tests, and low-value heartbeat/noise events before normal analytics writes.
- Duplicate event IDs no longer trigger a second analytics-session update.
- Pageview-only session updates after the first page in a session are skipped; conversion and first-page context remain recorded.
- A controlled, incremental daily rollup records event/pageview/WhatsApp/lead/confirmed-booking counters. The migration does not backfill historical data.

## Estimated effect

For All Time, the dashboard falls from roughly 9 calls / 54 raw statements to 7 calls / about 10 small statements, with no raw-table scan from summary or Site Analytics. Repeated summary/tracking loads within two minutes use zero D1 reads for those resources.

Runtime analytics writes are reduced by removing heartbeat/noise events, avoiding duplicate session updates, and avoiding repeated pageview session upserts. Accepted meaningful events add one incremental aggregate upsert; this is a deliberate tradeoff for cheap future reporting and is only enabled after the migration exists.

## Backfill and separation recommendation

Do not backfill automatically. If historical All Time reporting is required, run a separately reviewed, bounded batch process by date window, record its coverage, and stop between batches if the D1 row-read budget is near its limit.

Long term, move high-volume event telemetry to a dedicated analytics store or separate D1 database. Keep leads, booking state, and operational route data in the transactional transport database. The current shared `vendora-db` should not be split in this branch because that would require an approved migration and production cutover plan.
