import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://getvendora.net/bahrain-saudi-gcc-transport/';

const pages = [
  {
    slug: 'bahrain-airport-transfer', ar: 'bahrain-airport-transfer',
    title: 'Bahrain Airport Transfer | Private Pickup and Drop-Off | Vendora',
    description: 'Book a private Bahrain Airport transfer for home, hotel or business pickup and drop-off, with flight, passenger and luggage details confirmed on WhatsApp.',
    h1: 'Private Bahrain Airport Pickup and Drop-Off', eyebrow: 'Bahrain International Airport (BAH)',
    intro: 'Arrange a pre-booked private transfer between Bahrain International Airport and a home, hotel, office or other Bahrain destination. Flight, meeting point, passengers, children and luggage are reviewed before confirmation.',
    image: 'transport/service-airport-transfer-bahrain.webp', width: 1672, height: 941, alt: 'Private pickup at Bahrain International Airport',
    pickup: 'Pickup can be arranged at the confirmed Bahrain Airport terminal meeting point, or from homes and hotels across Manama, Muharraq, Juffair, Seef, Amwaj and other Bahrain areas.',
    destination: 'Choose an airport arrival transfer, an airport departure transfer, or a hotel-to-airport journey. The exact address and terminal must be shared before travel.',
    considerations: ['Send the airline, flight number and scheduled arrival or departure time.', 'Confirm the terminal and meeting point through WhatsApp.', 'State every passenger, child and bag so vehicle capacity can be checked.', 'Send flight-delay updates; monitoring and waiting apply only when expressly confirmed.'],
    message: 'Hello, I need a private Bahrain Airport transfer. I will send the flight, date, time, pickup, destination, passengers and luggage.',
    related: [['airport-transfer','GCC airport transfer hub'],['hotel-transfer-bahrain','Bahrain hotel transfers'],['bahrain-private-transport','Transport inside Bahrain'],['full-day-vip-driver','Full-day car with driver']],
  },
  {
    slug: 'bahrain-to-hamad-airport', ar: 'bahrain-to-hamad-airport',
    title: 'Bahrain to Hamad Airport Private Transfer | DOH | Vendora',
    description: 'Request private transport from Bahrain to Hamad International Airport in Doha, with border, flight timing, passenger and luggage details confirmed on WhatsApp.',
    h1: 'Private Transfer from Bahrain to Hamad International Airport', eyebrow: 'Bahrain to Doha Airport (DOH)',
    intro: 'Plan an overland private journey from Bahrain to Hamad International Airport in Qatar. The route crosses international borders, so departure time must allow for road conditions, border processing and airline check-in.',
    image: 'gcc-airport-transfer.webp', width: 1672, height: 941, alt: 'Private GCC airport transfer vehicle prepared for luggage',
    pickup: 'Pickup may be requested from a Bahrain home, hotel, office or agreed meeting point. Send the full address and desired pickup time.',
    destination: 'The destination is the confirmed Hamad International Airport terminal. Share the airline, flight number and required airport arrival time—not only the flight departure time.',
    considerations: ['Every traveller is responsible for valid passports, visas, residency and transit eligibility.', 'Border and road times vary and cannot be guaranteed.', 'Book early enough to review flight timing and vehicle availability.', 'Confirm luggage dimensions, child-seat requests, stops and return travel in advance.'],
    message: 'Hello, I need a private transfer from Bahrain to Hamad International Airport. I will send my flight, required airport arrival time, passengers and luggage.',
    related: [['bahrain-to-qatar','Bahrain to Qatar'],['airport-transfer','Airport transfer hub'],['king-fahd-causeway-guide','King Fahd Causeway guide'],['gcc-transport-planner','Plan a GCC journey']],
  },
  {
    slug: 'bahrain-to-kuwait-airport', ar: 'bahrain-to-kuwait-airport',
    title: 'Bahrain to Kuwait Airport Private Transfer | KWI | Vendora',
    description: 'Request a private road transfer from Bahrain to Kuwait International Airport, with border, flight, timing, passenger and luggage details confirmed on WhatsApp.',
    h1: 'Private Transfer from Bahrain to Kuwait International Airport', eyebrow: 'Bahrain to Kuwait Airport (KWI)',
    intro: 'Arrange an overland airport journey from Bahrain to Kuwait International Airport. Departure planning must include the drive through Saudi Arabia, border processing and sufficient airline check-in time.',
    image: 'gcc-airport-transfer.webp', width: 1672, height: 941, alt: 'Private airport transfer vehicle for a Bahrain to Kuwait journey',
    pickup: 'Pickup can be requested from a Bahrain home, hotel, office or other confirmed address.',
    destination: 'Provide the Kuwait Airport terminal, airline, flight number and the time you need to reach the airport.',
    considerations: ['Passengers must verify passports, visas and transit permission for every country on the route.', 'Road, border and rest-stop time varies by date and conditions.', 'Large luggage loads may reduce passenger capacity.', 'Return travel or a Kuwait pickup requires separate timing and confirmation.'],
    message: 'Hello, I need private transport from Bahrain to Kuwait International Airport. I will send my flight, date, required arrival time, passengers and luggage.',
    related: [['bahrain-to-kuwait','Bahrain to Kuwait'],['kuwait-airport-to-bahrain','Kuwait Airport to Bahrain'],['airport-transfer','Airport transfer hub'],['gcc-transport-planner','Plan a GCC journey']],
  },
  {
    slug: 'dubai-to-bahrain', ar: 'dubai-to-bahrain',
    title: 'Dubai to Bahrain Private Transport | Overland Transfer | Vendora',
    description: 'Request private overland transport from Dubai or another UAE pickup point to Bahrain, with border, passenger, luggage and return details confirmed on WhatsApp.',
    h1: 'Private Transport from Dubai to Bahrain', eyebrow: 'UAE to Bahrain overland journey',
    intro: 'Request a private road journey from Dubai to Bahrain through Saudi Arabia. This is a long cross-border trip that requires early coordination of pickup, documents, rest stops, passenger comfort and luggage capacity.',
    image: 'gcc-country-uae-transport.webp', width: 1448, height: 1086, alt: 'Private overland transport between the UAE and Bahrain',
    pickup: 'Pickup may be arranged from a Dubai home, hotel, airport area or another UAE location after the full address is reviewed.',
    destination: 'Drop-off can be requested at a confirmed Bahrain home, hotel, office or airport address.',
    considerations: ['All passengers must hold documents valid for the UAE, Saudi Arabia and Bahrain route.', 'Journey duration changes with pickup area, borders, traffic and agreed stops.', 'Children, luggage and mobility needs must be stated before vehicle selection.', 'A return journey, overnight requirement or extra stop is priced only after confirmation.'],
    message: 'Hello, I need private overland transport from Dubai to Bahrain. I will send the pickup, destination, date, passengers, documents and luggage details.',
    related: [['bahrain-to-dubai','Bahrain to Dubai'],['bahrain-to-uae','Bahrain to the UAE'],['gcc-transport-planner','Plan a GCC journey'],['booking-terms','Cross-border booking terms']],
  },
  {
    slug: 'hamad-airport-to-bahrain', ar: 'hamad-airport-to-bahrain',
    title: 'Hamad Airport to Bahrain Private Transfer | DOH Pickup | Vendora',
    description: 'Request private pickup from Hamad International Airport to Bahrain, with flight arrival, meeting point, border, passenger and luggage details confirmed on WhatsApp.',
    h1: 'Private Transfer from Hamad Airport to Bahrain', eyebrow: 'Doha Airport (DOH) arrival pickup',
    intro: 'Coordinate an arrival pickup at Hamad International Airport followed by a private overland journey to Bahrain. The flight arrival, airport meeting point and border eligibility must all be confirmed in advance.',
    image: 'gcc-airport-transfer.webp', width: 1672, height: 941, alt: 'Private pickup vehicle for Hamad Airport to Bahrain travel',
    pickup: 'Send the airline, flight number, scheduled arrival time, terminal and an active passenger contact number. The meeting point is agreed during confirmation.',
    destination: 'Provide the final Bahrain home, hotel, office or airport address rather than only the city name.',
    considerations: ['Send delay updates through WhatsApp as soon as possible.', 'Flight monitoring and included waiting are not assumed unless confirmed.', 'Every traveller must verify border, visa and transit eligibility.', 'Passenger and bag totals determine the suitable vehicle option.'],
    message: 'Hello, I need private pickup from Hamad International Airport to Bahrain. I will send the flight, meeting details, passengers, luggage and Bahrain destination.',
    related: [['bahrain-to-hamad-airport','Bahrain to Hamad Airport'],['qatar-to-bahrain','Qatar to Bahrain'],['airport-transfer','Airport transfer hub'],['booking-terms','Airport and waiting terms']],
  },
  {
    slug: 'kuwait-airport-to-bahrain', ar: 'kuwait-airport-to-bahrain',
    title: 'Kuwait Airport to Bahrain Private Transfer | KWI Pickup | Vendora',
    description: 'Request private pickup from Kuwait International Airport to Bahrain, with flight, meeting point, border, passenger and luggage details confirmed on WhatsApp.',
    h1: 'Private Transfer from Kuwait Airport to Bahrain', eyebrow: 'Kuwait Airport (KWI) arrival pickup',
    intro: 'Arrange pickup from Kuwait International Airport followed by an overland private journey through Saudi Arabia to Bahrain. Flight timing, the meeting point and cross-border documents are reviewed before confirmation.',
    image: 'gcc-airport-transfer.webp', width: 1672, height: 941, alt: 'Private airport pickup vehicle for Kuwait to Bahrain travel',
    pickup: 'Provide the airline, flight number, terminal, scheduled arrival and passenger contact details for the agreed airport meeting point.',
    destination: 'Send the complete Bahrain destination, including the hotel, home, office or airport address.',
    considerations: ['Passengers are responsible for passports, visas and Saudi transit eligibility.', 'Notify operations of flight delays before landing where possible.', 'Waiting arrangements and extra charges vary by confirmed booking.', 'Share bag sizes and child-seat needs before the vehicle is assigned.'],
    message: 'Hello, I need private pickup from Kuwait International Airport to Bahrain. I will send the flight, passengers, luggage and Bahrain destination.',
    related: [['bahrain-to-kuwait-airport','Bahrain to Kuwait Airport'],['kuwait-to-bahrain','Kuwait to Bahrain'],['airport-transfer','Airport transfer hub'],['booking-terms','Airport and waiting terms']],
  },
  {
    slug: 'kuwait-to-bahrain', ar: 'kuwait-to-bahrain',
    title: 'Kuwait to Bahrain Private Transport | Door-to-Door Transfer | Vendora',
    description: 'Request private transport from Kuwait City or another Kuwait pickup point to Bahrain, with border, passenger, luggage and return details confirmed on WhatsApp.',
    h1: 'Private Transport from Kuwait to Bahrain', eyebrow: 'Kuwait to Bahrain via Saudi Arabia',
    intro: 'Coordinate a private door-to-door road journey from Kuwait to Bahrain through Saudi Arabia. Pickup address, border eligibility, passengers, luggage and desired Bahrain arrival point are reviewed first.',
    image: 'gcc-country-kuwait-transport.webp', width: 1448, height: 1086, alt: 'Private transport vehicle for Kuwait to Bahrain journeys',
    pickup: 'Pickup may be requested from Kuwait City, a home, hotel, office or another agreed Kuwait location.',
    destination: 'Drop-off can be arranged at a confirmed address in Manama, Muharraq, Juffair, Seef, Amwaj or another Bahrain area.',
    considerations: ['Valid documents and Saudi transit eligibility are the passenger’s responsibility.', 'Border and road times vary, so exact arrival cannot be promised.', 'State children, bags and any rest-stop needs in advance.', 'One-way and return journeys are confirmed and priced separately.'],
    message: 'Hello, I need private transport from Kuwait to Bahrain. I will send the pickup, destination, date, passengers and luggage.',
    related: [['bahrain-to-kuwait','Bahrain to Kuwait'],['kuwait-airport-to-bahrain','Kuwait Airport to Bahrain'],['gcc-transport-planner','Plan a GCC journey'],['booking-terms','Cross-border booking terms']],
  },
  {
    slug: 'oman-to-bahrain', ar: 'oman-to-bahrain',
    title: 'Oman to Bahrain Private Transport | Long-Distance GCC Transfer | Vendora',
    description: 'Request long-distance private transport from Oman to Bahrain, with pickup city, borders, rest stops, passengers and luggage confirmed through WhatsApp.',
    h1: 'Private Transport from Oman to Bahrain', eyebrow: 'Long-distance GCC road journey',
    intro: 'Request a private overland journey from Oman to Bahrain. Because this is a long multi-border route, it requires early planning for the pickup city, documents, rest breaks, passenger comfort and driver availability.',
    image: 'gcc-country-oman-transport.webp', width: 1448, height: 1086, alt: 'Long-distance private transport between Oman and Bahrain',
    pickup: 'Provide the exact Oman city and address. Muscat, Sohar, Salalah and other origins differ significantly in distance and route planning.',
    destination: 'Send the full Bahrain hotel, home, office or airport destination and desired arrival window.',
    considerations: ['Passengers must confirm entry and transit eligibility for every country crossed.', 'The route, journey duration and driver plan depend on the Oman pickup city.', 'Rest stops and possible overnight arrangements must be agreed before travel.', 'Vehicle and luggage capacity are confirmed only after all passenger details are received.'],
    message: 'Hello, I need long-distance private transport from Oman to Bahrain. I will send the exact pickup city, destination, date, passengers and luggage.',
    related: [['bahrain-to-oman','Bahrain to Oman'],['gcc-transport-planner','Plan a GCC journey'],['gcc-private-transport-guide','GCC transport guide'],['booking-terms','Cross-border booking terms']],
  },
  {
    slug: 'qatar-to-bahrain', ar: 'qatar-to-bahrain',
    title: 'Qatar to Bahrain Private Transport | Doha Door-to-Door Transfer | Vendora',
    description: 'Request private transport from Doha or another Qatar pickup point to Bahrain, with Saudi transit, passenger, luggage and return details confirmed on WhatsApp.',
    h1: 'Private Transport from Qatar to Bahrain', eyebrow: 'Doha and Qatar to Bahrain',
    intro: 'Arrange private road transport from Qatar to Bahrain through Saudi Arabia. The service is pre-booked and requires the exact Qatar pickup, Bahrain destination, passenger documents and luggage details.',
    image: 'gcc-country-qatar-transport.webp', width: 1448, height: 1086, alt: 'Private transport vehicle for Qatar to Bahrain journeys',
    pickup: 'Pickup may be requested from Doha, Al Rayyan, Al Wakrah, a hotel, home, office or Hamad Airport area after confirmation.',
    destination: 'Drop-off can be arranged at a confirmed Bahrain home, hotel, office or airport address.',
    considerations: ['All travellers must verify Qatar exit, Saudi transit and Bahrain entry eligibility.', 'Border processing and road conditions affect the arrival time.', 'Airport pickup requires a flight number and confirmed meeting point.', 'Return travel, child seats, large luggage and additional stops must be requested in advance.'],
    message: 'Hello, I need private transport from Qatar to Bahrain. I will send the pickup, Bahrain destination, date, passengers and luggage.',
    related: [['bahrain-to-qatar','Bahrain to Qatar'],['hamad-airport-to-bahrain','Hamad Airport to Bahrain'],['gcc-transport-planner','Plan a GCC journey'],['booking-terms','Cross-border booking terms']],
  },
];

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function render(page) {
  const canonical = `${base}en/${page.slug}/`;
  const arabic = `${base}${page.ar}/`;
  const related = page.related.map(([slug, label]) => `<a class="route-card" href="../${slug}/"><h3>${escapeHtml(label)}</h3><p>Open the focused service or route page.</p></a>`).join('');
  const considerations = page.considerations.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const schema = JSON.stringify({
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Service', name: page.h1, serviceType: 'Pre-booked private transport', areaServed: ['Bahrain', 'GCC'], provider: { '@type': 'Organization', name: 'Vendora Transport', telephone: '+97333225954' } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}en/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: canonical },
      ] },
    ],
  });
  return `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page.title)}</title><meta name="description" content="${escapeHtml(page.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="en" href="${canonical}"><link rel="alternate" hreflang="ar-BH" href="${arabic}"><link rel="alternate" hreflang="x-default" href="${arabic}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(page.title.replace(/ \| Vendora$/, ''))}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${base}assets/images/${page.image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(page.title.replace(/ \| Vendora$/, ''))}"><meta name="twitter:description" content="${escapeHtml(page.description)}"><link rel="stylesheet" href="../../site.css"><script defer src="../../assets/lucide.min.js"></script><script type="application/ld+json" data-vendora-schema>${schema}</script></head>
<body class="home-premium lang-en vip-transport"><header class="topbar"><div class="container nav"><a class="brand" href="../"><span class="logo">V</span><span class="brand-copy"><span class="brand-title">Vendora Transport</span><span class="brand-sub">Private Bahrain and GCC transport</span></span></a><nav class="nav-menu" aria-label="Primary navigation"><a href="../">Home</a><a href="../airport-transfer/">Airports</a><a href="../bahrain-private-transport/">Bahrain services</a><a href="../gcc-destinations/">GCC routes</a><a href="../prices/">Prices</a></nav><div class="quick-links"><a class="lang-toggle" href="../../${page.ar}/" lang="ar" dir="rtl">Arabic</a><a class="wa-inline" data-wa-message="${escapeHtml(page.message)}">WhatsApp</a></div></div></header>
<main><nav class="container breadcrumbs" aria-label="Breadcrumb"><a href="../">Home</a><span>${escapeHtml(page.h1)}</span></nav><section class="hero"><div class="container hero-grid"><div class="hero-copy glass"><span class="eyebrow"><strong>${escapeHtml(page.eyebrow)}</strong></span><h1>${escapeHtml(page.h1)}</h1><p class="lead">${escapeHtml(page.intro)}</p><div class="hero-actions"><a class="primary-btn" href="#booking">Prepare your request</a><a class="wa-inline" data-wa-message="${escapeHtml(page.message)}">Book on WhatsApp</a></div></div><aside class="hero-side glass"><img src="../../assets/images/${page.image}" alt="${escapeHtml(page.alt)}" width="${page.width}" height="${page.height}" loading="eager" decoding="async"><h2>Vehicle confirmed for the journey</h2><p>The exact vehicle type and model depend on passenger count, luggage, route and availability at booking confirmation.</p></aside></div></section>
<section class="section"><div class="container section-shell"><div class="section-head"><h2>Pickup and destination coverage</h2><p>Share complete locations so the route and meeting details can be checked accurately.</p></div><div class="route-grid"><article class="route-card"><h3>Pickup</h3><p>${escapeHtml(page.pickup)}</p></article><article class="route-card"><h3>Destination</h3><p>${escapeHtml(page.destination)}</p></article></div></div></section>
<section class="section"><div class="container section-shell"><h2>Important journey considerations</h2><ul class="check-list">${considerations}</ul><p class="availability-note">Travel time is an estimate only. Traffic, borders, airport processing, weather and rest stops can change the journey.</p></div></section>
<section class="section"><div class="container section-shell"><h2>Suitable passengers and vehicle options</h2><div class="route-grid"><article class="route-card"><h3>Individuals and couples</h3><p>A sedan may suit light luggage after capacity is checked.</p></article><article class="route-card"><h3>Families</h3><p>Share children’s ages, child-seat requests and every bag before confirmation.</p></article><article class="route-card"><h3>Groups and large luggage</h3><p>A large vehicle or multiple cars may be arranged subject to availability.</p></article></div></div></section>
<section class="section" id="booking"><div class="container"><div class="booking-card glass"><h2>Send the details required for booking</h2><p>Date, pickup time, full pickup and destination, one-way or return, passengers, children, luggage, preferred vehicle, flight number where relevant, and any planned stops.</p><a class="wa-inline" data-wa-message="${escapeHtml(page.message)}">Continue on WhatsApp</a></div></div></section>
<section class="section"><div class="container section-shell"><h2>Related routes and services</h2><div class="route-grid">${related}</div></div></section></main>
<footer class="footer transport-footer"><div class="container footer-grid"><div class="footer-card"><h3>Vendora Transport</h3><p>Private transport coordinated from Bahrain through WhatsApp, subject to availability and booking confirmation.</p></div><div class="footer-card"><div class="footer-links"><a href="../about/">About</a><a href="../contact/">Contact</a><a href="../privacy/">Privacy</a><a href="../booking-terms/">Booking terms</a></div></div></div></footer><a class="floating-wa" data-wa-message="${escapeHtml(page.message)}" aria-label="Book on WhatsApp"><i data-lucide="message-circle"></i></a><script>window.pageConfig={phoneNumber:'97333225954'};</script><script defer src="../../site.js?v=20260721-audit"></script><script defer src="../../../assets/analytics-loader.js"></script></body></html>
`;
}

for (const page of pages) {
  const directory = join(root, 'en', page.slug);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'index.html'), render(page), 'utf8');
  console.log(`en/${page.slug}/index.html`);
}
