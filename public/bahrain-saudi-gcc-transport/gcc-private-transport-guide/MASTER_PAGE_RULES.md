# GCC Private Transport Guide Master Page Rules

These rules govern the new GCC Private Transport Guide page only.

The page must be built as a flagship authority guide for GetVendora Transport. It must not be treated as a simple sales landing page, a thin route page, or a generic taxi page.

## Core Purpose

1. The page must be an authority guide, not just a sales landing page.
2. The page must help customers understand GCC private transport across Bahrain, Saudi Arabia, Qatar, Kuwait, UAE, Oman, Iraq, and airport routes.
3. The central message must be clear: GetVendora coordinates the customer journey responsibly, not just sending a random driver.
4. The page must feel like a real professional transport company and a useful GCC travel guide.

## Content Rules

1. Every section must answer a real customer question.
2. Every section must support at least one of these goals: SEO, trust, conversion, navigation, AI understanding, or user experience.
3. Every keyword must be used naturally, not stuffed.
4. Route names, countries, cities, airports, Arabic terms, English terms, and local dialect terms must be included only where they help the reader.
5. Do not publish fixed prices until the verified pricing table is provided.
6. Use request-quote pricing placeholders only.
7. Do not add fake reviews.
8. Do not add fake license claims.
9. Do not make unsupported claims about company documents, permits, ratings, fleet size, or service coverage.
10. Do not guarantee border approval, visa approval, airport approval, customs approval, immigration approval, or travel approval.
11. Passenger documents are the passenger's responsibility.
12. Travel guidance must be written as preparation help, not as legal, immigration, or visa advice.

## Language Rules

1. Arabic and English must be separate pages.
2. The Arabic page must be fully Arabic, with `html lang="ar"` and `dir="rtl"`.
3. The English page must be fully English, with `html lang="en"` and `dir="ltr"`.
4. Arabic and English customer-facing copy must not be mixed on the same page.
5. Arabic content should use clear Arabic with natural GCC transport terminology where useful.
6. English content should use clear professional transport language without awkward keyword repetition.

## Image Rules

1. Every image must have a purpose: SEO, trust, explanation, or conversion.
2. Do not use generic stock photos that could belong to any taxi company.
3. Prefer real GetVendora vehicles, real route context, real airport pickup context, or carefully generated images that match the service.
4. Every planned image must include a filename, placement, ALT text, caption if needed, SEO purpose, and trust purpose.
5. Images must help customers understand the service, vehicle suitability, route, airport pickup, luggage, family travel, business travel, or booking process.

## Pricing Rules

1. No fixed prices may be published until the future pricing table is provided and approved.
2. Pricing sections must use request-quote placeholders only.
3. Pricing copy may explain quote factors such as route, pickup location, destination, date, time, passengers, luggage, vehicle type, waiting time, and return trip.
4. Do not imply a fixed fare, guaranteed lowest price, or guaranteed availability unless the business provides and approves that claim.

## Route Planner Rules

1. The route planner must be deterministic JavaScript only.
2. The route planner must not use AI.
3. The route planner may collect trip details and generate a WhatsApp quote request.
4. The route planner may show route guidance, preparation notes, and relevant internal links.
5. The route planner must not calculate or display fixed prices until approved pricing data exists.
6. The route planner must not guarantee travel approval, border approval, visa approval, flight timing, or driver availability.

## Trust Rules

1. Trust must come from clear process, responsible coordination, transparent expectations, and useful travel preparation.
2. Use only supportable facts.
3. Add verified company documents, licenses, reviews, real vehicle photos, and pricing only after they are provided and approved.
4. Do not invent testimonials, ratings, customers, partners, government approvals, or certifications.
5. Explain what GetVendora coordinates: pickup details, route details, passenger count, luggage, airport timing, WhatsApp communication, vehicle suitability, and journey expectations.

## Schema Rules

1. Schema must only include supportable facts.
2. Do not add fake review schema.
3. Do not add `AggregateRating` unless real review data is provided and approved.
4. Do not add fixed-price `Offer` schema until verified prices are provided.
5. Schema should support page understanding through appropriate types such as `WebPage`, `Service`, `BreadcrumbList`, `FAQPage`, `ItemList`, and quote-request service information.
6. Arabic and English schema must match the visible language and page content.

## Internal Linking Rules

1. Internal links must help the customer, not only SEO.
2. Link to existing live pages only when the destination is relevant and useful.
3. Do not modify existing live pages or existing transport routes while building this guide.
4. Anchor text should clearly describe the destination route, country, airport, or service.
5. Future pages may be documented as planned links, but they must not be linked as live destinations until they exist.

## Maintainability Rules

1. The page should be easy to update later with prices, routes, photos, reviews, and company documents.
2. Keep route data, FAQ data, pricing placeholders, schema notes, image plans, and content drafts organized in the project structure.
3. Do not hard-code future business facts that are expected to change often if they can be stored as project data.
4. Preserve a clean separation between planning files, source files, data files, image assets, and future live integration work.

## Live Site Safety

1. Existing live pages must not be modified during planning or isolated development unless explicitly approved.
2. Current transport routes must remain untouched.
3. No deployment, publishing, live URL changes, sitemap changes, or navigation changes may happen until the master page blueprint and build are approved.
