# Vendora Tripadvisor completion kit

Prepared 23 October 2026 (Bahrain time).

## Live ownership status

Claim submitted using booking@getvendora.net, Owner role, with explicit user authorization to accept Tripadvisor's terms. The user completed email verification. Tripadvisor now reports “You've claimed this business” and “Verification request in progress • You'll receive an email response to your submission within 72 hours.” Owner editing is blocked pending Tripadvisor's review. This is not confirmation of a fully verified public profile.

Listing: https://www.tripadvisor.com/34715134

Direct review URL: https://www.tripadvisor.com/UserReviewEdit-d34715134

Dashboard: https://tripadvisor.com/owners?detail=34715134

Listing request ID supplied by user: 9bec8c30-4732-4a1a-903c-739dead813b9

The dashboard showed 0 reviews. No current ranking was verified and no #2 or #1 claim was published.

## Latest verified profile status

The visible “Draft • 30% complete” belongs to an unfinished customer review of Vendora Transport in the personal account. It is not a business-profile completeness meter. Do not submit a review of the owner's own business to change this percentage.

The official Vendora V logo is already publicly visible as the listing's single gallery photo. Verified directly in the photo viewer; evidence saved as `logo-live.png`. This does not establish that a dedicated owner profile-icon or featured-cover setting has been configured.

Public listing also shows the official website, booking telephone +973 3322 5954, and all-day hours. The owner claim remains pending representative verification. The actual Photos & Videos management destination explicitly refuses access until ownership verification is approved. No business-description or cover-image edit is available in the present session. Approval was not bypassed, and 100% completion was not claimed.

All-six-GCC English and Arabic descriptions, logo files, service positioning and photo inventory remain ready. Country-to-country private transfers are described in both directions; in-country private car-with-driver hire is described for all six GCC countries. The website's hero is explicitly marked as illustrative, so it must not be represented as a photograph of the actual fleet.

## Fields ready for the owner dashboard

- Name: Vendora Transport
- Website: https://getvendora.net/
- Booking phone / WhatsApp: +973 3322 5954
- Support: +973 3340 4044
- Email: booking@getvendora.net
- Address: Office 240, 2nd Floor, The Address Tower, Seef, Bahrain
- Languages: English, Arabic
- Service categories to select where offered: private transfers, chauffeur service, airport transportation, cross-border transportation.
- Hours: enquiries and dispatch coordination available 24/7; rides confirmed subject to availability. Only set all-day service hours if they accurately represent operations.
- Features supported by published site: private transfers, luggage assistance, family travel, child seats on request, corporate arrangements. Verify bottled water and any other amenity with operations before enabling it.
- Fees and border entry: confirm toll inclusion in each quote; immigration decisions remain with border authorities. Do not promise pre-cleared entry.

## English description

Vendora Transport provides private car transfers and chauffeur services across all six GCC countries: Bahrain, Saudi Arabia, Kuwait, Qatar, the United Arab Emirates and Oman. We arrange country-to-country journeys in either direction, including one-way and return transfers, as well as private car-with-driver hire within each country by the hour, full day or multiple days. Services include airport and hotel transfers, business travel, family journeys and multi-stop itineraries. Choose spacious SUVs such as GMC Yukon XL / Chevrolet Suburban or executive sedans, subject to availability. Our team confirms the route, vehicle, driver, fare and border arrangements before travel. Booking enquiries are welcome 24/7. Bahrain-based, serving GCC journeys beyond a single city or corridor.

## Arabic description

تقدم ڤيندورا ترانسبورت خدمات النقل الخاص مع سائق في دول مجلس التعاون الخليجي الست: البحرين والمملكة العربية السعودية والكويت وقطر والإمارات العربية المتحدة وسلطنة عُمان. نرتب رحلات من دولة إلى دولة في الاتجاهين، ذهاباً وعودة، إضافة إلى تأجير سيارة خاصة مع سائق داخل كل دولة بالساعة أو ليوم كامل أو لعدة أيام. تشمل خدماتنا الاستقبال والتوديع في المطارات، والتوصيل إلى الفنادق، ورحلات الأعمال والعائلات، وخطوط السير متعددة التوقفات. نوفر سيارات عائلية مثل جمس يوكون إكس إل وشفروليه سوبربان وسيارات سيدان تنفيذية حسب التوفر. يؤكد فريقنا المسار والمركبة والسائق والأجرة وترتيبات الحدود قبل السفر. نستقبل استفسارات الحجز على مدار الساعة. مقرنا في البحرين وخدماتنا تشمل دول الخليج، ولا تقتصر على مدينة أو مسار واحد.

## GCC positioning

- Coverage: Bahrain; all of Saudi Arabia; Kuwait; Qatar; United Arab Emirates; Oman.
- Service 1: private country-to-country transfers in either direction, one-way or return.
- Service 2: private car with driver within each country, hourly / full-day / multi-day.
- This means chauffeur hire, not self-drive rental.
- The business address stays in Seef, Bahrain. Service-area coverage does not create fictional offices in the other countries.
- Tripadvisor's displayed currency is a viewer preference; it is not the business service area.

## Assets and printing

`website-assets/` contains 11 original files copied from the website checkout, including SVG logos, a 512px brand icon, SUV hero, cabin, luggage, corporate and transfer imagery. `asset-manifest.json` lists their website URLs. These are existing marketing assets; photographic authenticity and ownership of the depicted vehicles have not been established. Do not represent illustrations or synthetic scenes as photographs of the actual fleet. Upload 6–10 genuine owner-approved photos when dashboard verification clears. Use the brand icon as logo and an authentic exterior fleet photo as cover where the dashboard supports those controls.

`review-qr.svg` encodes the exact direct review URL with a four-module white quiet zone and M error correction. `seatback-card-4x6.svg` is 4 × 6 inches; print at 100% / actual size, with no cropping. Test a physical proof on a phone before production printing.

`post-trip-email.html` is a bilingual email template. Replace all placeholders before sending. Its stars and button open Tripadvisor; no rating is silently submitted. The template is prepared, not installed in a receipt sender or sent to customers.

## Mobile WhatsApp workflow

The user confirmed there is no WhatsApp messaging API. The booking desk creates a local follow-up draft only after a successful “Completed” save, due 40 minutes later. It does not enqueue demo bookings or filter on customer satisfaction. Opening the follow-ups panel after the due time offers an encoded WhatsApp draft, in the selected language. Dispatch must review and send it on WhatsApp, then remove it from the queue. Removing a draft does not assert that a message was delivered. Reopening a trip removes its queued draft.

The queue survives page reload in the same browser and expires after 30 days. It is not synchronized across staff devices, does not run background notifications while the app is closed, and does not send WhatsApp or email automatically. A reopened then re-completed trip starts a new 40-minute window. Dispatch should honor opt-outs and avoid repeated requests.

## Website implementation

The static publisher adds localized profile and direct-review links to public transport footers and the main homepage. Shared business JSON-LD adds the exact Tripadvisor profile to `sameAs`. No unverified rank, review count, Tripadvisor rating, generic Bing Places URL, or unofficial Tripadvisor logo was introduced. The footer uses the unmodified official Tripadvisor wordmark observed in its website header (https://static.tacdn.com/img2/brand_refresh_2025/logos/wordmark.svg), saved as /assets/tripadvisor-badge.svg; this is a profile link, not an award or rating badge. Any rating or award widget selection remains pending dashboard access. Smart Page Platform and branded short-link domains were not changed.

## Remaining work after Tripadvisor review

1. Confirm representative verification and public claimed status.
2. Enter the prepared contact fields, supported hours/features and both descriptions where supported.
3. Upload authentic fleet photos and choose cover/logo using available dashboard controls.
4. Confirm changes on the public listing; obtain the official badge/widget if available.
5. Direct review URL verified in Chrome: it resolves to the review form for Vendora Transport, Seef, Bahrain. No review was submitted.

No ranking outcome is guaranteed.
