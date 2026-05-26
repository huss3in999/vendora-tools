# GA4 Tracking Plan

This plan keeps the current Vendora GA4 property (`G-DFY197R2MS`) and adds a lightweight categorization layer. It does not add a second GA script and does not change SEO, schemas, URLs, or page content.

## Current Implementation Audit

- Global loader: `assets/analytics-loader.js` loads GA4, Microsoft Clarity, and Cloudflare Web Analytics on pages that include it.
- Transport pages: most pages under `/bahrain-saudi-gcc-transport/` load `../../assets/analytics-loader.js` or `../../../assets/analytics-loader.js` plus `site.js`.
- Legacy pages: many older calculators, guides, and tools include the GA4 snippet inline in each page.
- PDF tools: `/tools/pdf-converter/` pages use inline GA4 plus `tools/pdf-converter/assets/pdf-analytics.js`.
- Existing custom events found:
  - `open_live_demo`
  - `transport_whatsapp_click`
  - `pdf_tool_view`
  - `pdf_tool_select`
  - `pdf_tool_upload_started`
  - `pdf_tool_conversion_success`
  - `pdf_tool_conversion_error`
  - several calculator/tool-specific events through `vendoraTrack`, `vendoraToolEvent`, or direct `gtag('event', ...)`.

## Content Groups

Use `content_group` and `page_category` with these values:

- `transport`: `/bahrain-saudi-gcc-transport/`
- `pdf_tools`: `/tools/pdf-converter/`, `/pdf/`, `/pdf-tools/`
- `calculators`: `/calculator/`, `/calculators/`
- `restaurant_tools`: restaurant calculators and restaurant operation tools
- `business_tools`: `/tools/small-business/`
- `articles`: `/article/`, `/articles/`, `/guide/`, `/guides/`, `/blog/`
- `other`: pages outside the above rules

The machine-readable map is stored in `analytics-category-map.json`.

## Recommended GA4 Custom Dimensions

Create these event-scoped custom dimensions in GA4 Admin:

- `content_group`
- `page_category`
- `route_name`
- `transport_cluster`
- `language`
- `button_location`
- `tool_id`
- `tool_category`
- `article_slug`

## Recommended Events

- `transport_page_view`: fired once on transport pages loaded through the global analytics loader.
- `route_interest`: fired once on specific transport route/article pages.
- `whatsapp_click`: fired on WhatsApp CTAs with page, route, language, and button location.
- `contact_click`: fired on contact, mail, or phone links.
- `pdf_tool_use`: fired by the PDF analytics helper on PDF tool selection, upload, success, or error.
- `calculator_use`: fired by shared calculator analytics helpers when calculator pages send calculation events.
- `article_read`: fired after meaningful article engagement, either 50% scroll or about 30 seconds on page.

## Transport Conversion Tracking

Transport reporting should segment by:

- `page_category = transport`
- `route_name`: route/page slug such as `bahrain-to-karbala`, `bahrain-to-najaf`, `arbaeen-transport`
- `transport_cluster`: `karbala`, `najaf`, `iraq`, `arbaeen`, `ziyarat`, or blank
- `language`: page language from the `<html>` tag
- `page_url`

Use `whatsapp_click` as the primary soft conversion and keep the existing `transport_whatsapp_click` event for backward compatibility.

## PDF Tool Usage

PDF tools keep the existing privacy-first events and also emit `pdf_tool_use` with safe fields only:

- `tool_id`
- `tool_category`
- `pdf_action`
- `status_code`
- approximate file count/size where already allowed

Do not send filenames, document text, passwords, or full file metadata.

## Calculator Usage

Shared calculator helpers emit `calculator_use` when calculators call `vendoraTrack`. Use:

- `calculator_event`
- `calculator_slug`
- `page_category`
- `content_group`

Legacy calculators with only inline GA continue to work; new calculator pages should prefer the shared helper.

## Article Engagement

Article/guide reporting should use:

- `article_read`
- `article_slug`
- `scroll_depth`
- `page_category`
- `language`

Transport SEO articles also keep `transport_page_view` and `route_interest` because they belong to the transport section.

## How To Read Reports In GA4

1. Open GA4 Reports or Explore.
2. Use Event name as the main dimension.
3. Filter by `page_category` to separate Transport, PDF tools, Calculators, Restaurant tools, Business tools, and Articles.
4. For transport, add `route_name` and `transport_cluster` to compare Karbala, Najaf, Iraq, Arbaeen, and Ziyarat demand.
5. Treat `whatsapp_click` as the main transport conversion signal.
6. For PDF tools, compare `pdf_tool_use` by `tool_id` and `pdf_action`.
7. For calculators, compare `calculator_use` by `calculator_slug`.
8. For guides, compare `article_read` by `article_slug`.

## Safety Rules

- Do not duplicate the GA script.
- Do not track admin, API, private, or test pages.
- Do not send personal data, document contents, filenames, phone numbers typed by users, or free-text notes.
- Keep analytics JavaScript lightweight and defensive.
- Preserve existing GA4, Clarity, Cloudflare Analytics, and transport lead tracking.
