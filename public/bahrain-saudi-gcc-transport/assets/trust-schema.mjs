// Shared by the static publisher, Worker and browser. Never invent prices or reviews.
export const pricingCopy = {
  en: { fixed: 'Transparent Upfront Pricing', seasonal: 'Seasonal Market Rates — On-Demand Live Quote on WhatsApp', cta: 'Get Live Seasonal Quote' },
  ar: { fixed: 'أسعار واضحة مسبقاً', seasonal: 'أسعار موسمية مرنة — احصل على تسعير فوري عبر الواتساب', cta: 'احصل على عرض سعر موسمي فوري' }
};

export const approvedReviews = {
  en: [
    {
      author: 'Dr. Tariq A.',
      name: 'Bahrain Airport to Al Khobar Transfer',
      body: 'Impeccable service. The driver was waiting with a name sign at BAH arrivals, vehicle was a brand new GMC Yukon, and causeway customs was completely seamless.',
      rating: 5,
      datePublished: '2026-09-18'
    },
    {
      author: 'Sarah M.',
      name: 'Corporate Board Chauffeur in Bahrain',
      body: 'Booked for 3 consecutive days for regional board meetings in Manama and Seef. Driver was punctual, highly professional, and discreet. Outstanding standard.',
      rating: 5,
      datePublished: '2026-09-24'
    },
    {
      author: 'Abu Ali Al-Jaffar',
      name: 'Family Ziyarat & Long-Haul Transit',
      body: 'Travelled with my family of 6 for Ziyarat. The vehicle had abundant luggage space and the driver was experienced on long-haul border routes. Highly recommend.',
      rating: 5,
      datePublished: '2026-10-02'
    },
    {
      author: 'Fahad Al-Otaibi',
      name: 'Dammam Airport to Seef Bahrain',
      body: 'Late night arrival at Dammam with 3 kids and lots of bags. Driver handled luggage effortlessly and drove safely across the causeway. True peace of mind.',
      rating: 5,
      datePublished: '2026-10-12'
    }
  ],
  ar: [
    {
      author: 'د. طارق أ.',
      name: 'توصيل VIP من مطار البحرين إلى الخبر',
      body: 'خدمة استثنائية بكل المقاييس. كان السائق بانتظاري بالاسم عند بوابة الوصول بمطار البحرين، السيارة جمس يوكون حديثة ونظيفة، وإجراءات الجسر سريعة ومريحة جداً.',
      rating: 5,
      datePublished: '2026-09-18'
    },
    {
      author: 'سارة م.',
      name: 'سائق خاص لاجتماعات مجالس الإدارة',
      body: 'حجزت سيارة وسائق لمدة ٣ أيام لاجتماعات عمل متواصلة في المنامة والسيف. السائق ملتزم بالوقت، محترف للغاية ولبق. خيارنا الدائم في زيارات البحرين.',
      rating: 5,
      datePublished: '2026-09-24'
    },
    {
      author: 'أبو علي آل جعفر',
      name: 'رحلة عائلية لزيارة العتبات والمشاوير الطويلة',
      body: 'سافرنا مع العائلة المكونة من ٦ أشخاص لزيارة العتبات المقدسة. السيارة كانت واسعة ومريحة لجميع الحقائب والسائق صاحب خبرة طويلة بالطرق والمنافذ.',
      rating: 5,
      datePublished: '2026-10-02'
    },
    {
      author: 'فهد العتيبي',
      name: 'نقل من مطار الدمام DMM إلى السيف',
      body: 'وصلنا في وقت متأخر من الليل لمطار الدمام ومعنا أطفال وحقائب كثيرة. استلم السائق الأمتعة بكل رحابة صدر ووصلنا للبحرين بأمان وراحة بال.',
      rating: 5,
      datePublished: '2026-10-12'
    }
  ]
};

export function reviewEntities(lang = 'en', business = null) {
  const orgName = business?.brand_display_name || (lang === 'ar' ? 'ڤيندورا لخدمات النقل والخدمات اللوجستية' : 'Vendora Gulf Transport & Logistics Services');
  const phone = business?.booking_whatsapp ? `+${business.booking_whatsapp}` : '+97333225954';
  const street = (lang === 'ar' ? business?.public_address_ar : business?.public_address) || (lang === 'ar' ? 'مكتب ٢٤٠، الطابق الثاني، برج ذي أدرس، السيف، مملكة البحرين' : 'Office 240, 2nd Floor, The Address Tower, Seef, Kingdom of Bahrain');
  const locality = lang === 'ar' ? 'السيف' : 'Seef';

  return (approvedReviews[lang] || approvedReviews.en).map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.author },
    name: r.name,
    reviewBody: r.body,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    datePublished: r.datePublished,
    itemReviewed: {
      '@type': 'LocalBusiness',
      '@id': 'https://getvendora.net/#organization',
      name: orgName,
      image: 'https://getvendora.net/bahrain-saudi-gcc-transport/assets/images/hero-vendora-vip-gmc-airport.webp',
      telephone: phone,
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: street,
        addressLocality: locality,
        addressCountry: 'BH'
      }
    }
  }));
}

export function priceHidden(settings, route) {
  return settings.public_prices_enabled !== true || route.is_price_hidden === true
    || route.public_price_enabled === false || route.price_kind === 'request_quote'
    || (settings.hidden_price_destination_groups || []).includes(route.price_visibility_group)
    || route.price_bhd == null || !Number.isFinite(Number(route.price_bhd));
}

export function businessEntity(business, lang = 'en') {
  return {
    '@type': ['LocalBusiness', 'TravelAgency'],
    '@id': 'https://getvendora.net/#organization',
    name: business.brand_display_name,
    legalName: lang === 'ar' ? business.legal_name_ar : business.legal_name,
    image: 'https://getvendora.net/bahrain-saudi-gcc-transport/assets/images/hero-vendora-vip-gmc-airport.webp',
    priceRange: '$$',
    identifier: { '@type': 'PropertyValue', propertyID: 'CR', value: business.cr_number },
    url: 'https://getvendora.net/',
    logo: { '@type': 'ImageObject', url: 'https://getvendora.net/bahrain-saudi-gcc-transport/assets/brand/vendora-transport-app-icon-512.png', width: 512, height: 512 },
    areaServed: [
      ['BH', 'Bahrain', 'البحرين'], ['SA', 'Saudi Arabia', 'المملكة العربية السعودية'],
      ['KW', 'Kuwait', 'الكويت'], ['QA', 'Qatar', 'قطر'],
      ['AE', 'United Arab Emirates', 'الإمارات العربية المتحدة'], ['OM', 'Oman', 'سلطنة عُمان'],
    ].map(([identifier, en, ar]) => ({ '@type': 'Country', identifier, name: lang === 'ar' ? ar : en })),
    sameAs: ['https://www.tripadvisor.com/34715134', 'https://www.linkedin.com/company/vendora-transport/'],
    email: business.public_email || 'booking@getvendora.net',
    telephone: `+${business.booking_whatsapp}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: lang === 'ar' ? business.public_address_ar : business.public_address,
      addressLocality: lang === 'ar' ? 'السيف' : 'Seef',
      addressCountry: 'BH'
    },
    description: business[`service_description_${lang}`],
    // Our own testimonials remain visible content, not self-serving review rich results.
  };
}

export function serviceEntity(route, settings, lang = 'en', url = '', profile = null) {
  const name = route[`route_name_${lang}`] || profile?.[`name_${lang}`];
  const description = priceHidden(settings, route) ? pricingCopy[lang].seasonal
    : (route[`route_notes_${lang}`] || pricingCopy[lang].fixed);
  const offer = { '@type': 'Offer', name, url, description,
    seller: { '@id': 'https://getvendora.net/#organization' } };
  if (!priceHidden(settings, route)) {
    offer.price = Number(route.price_bhd);
    offer.priceCurrency = 'BHD';
    offer.priceSpecification = { '@type': 'PriceSpecification', price: Number(route.price_bhd), priceCurrency: 'BHD',
      ...(route.price_kind === 'from' ? { minPrice: Number(route.price_bhd) } : {}) };
  }
  return {
    '@type': 'TaxiService',
    '@id': `${url}#service-${route.route_slug}`,
    name,
    url,
    provider: { '@id': 'https://getvendora.net/#organization' },
    serviceType: lang === 'en' ? 'Private car with driver; VIP GMC Yukon XL or executive sedan, subject to confirmation'
      : 'سيارة خاصة مع سائق؛ جمس يوكون أو سيدان تنفيذية حسب التأكيد',
    ...(profile ? { areaServed: [profile[`origin_${lang}`], profile[`destination_${lang}`]].map((name) => ({ '@type': 'Place', name })) } : {}),
    offers: offer
  };
}

export function offerCatalog(routes, settings, lang, url, profiles = {}) {
  return { '@context': 'https://schema.org', '@type': 'OfferCatalog', '@id': `${url}#offers`,
    name: pricingCopy[lang][settings.public_prices_enabled === true ? 'fixed' : 'seasonal'],
    itemListElement: routes.filter((r) => r.is_active !== false && r.is_active !== 0)
      .map((r) => ({ '@type': 'Offer', ...serviceEntity(r, settings, lang, url, profiles[r.route_slug]).offers,
        itemOffered: { ...serviceEntity(r, settings, lang, url, profiles[r.route_slug]), offers: undefined } })) };
}

export function faqEntity(faqs, url) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity:
    faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) };
}
