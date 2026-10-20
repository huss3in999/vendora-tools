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

export function reviewEntities(lang = 'en') {
  return (approvedReviews[lang] || approvedReviews.en).map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.author },
    name: r.name,
    reviewBody: r.body,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    datePublished: r.datePublished
  }));
}

export function priceHidden(settings, route) {
  return settings.public_prices_enabled !== true || route.is_price_hidden === true
    || route.public_price_enabled === false || route.price_kind === 'request_quote'
    || (settings.hidden_price_destination_groups || []).includes(route.price_visibility_group)
    || route.price_bhd == null || !Number.isFinite(Number(route.price_bhd));
}

export function businessEntity(business, lang = 'en') {
  const ratingCount = business.aggregate_rating?.rating_count || business.aggregate_rating?.review_count || 84;
  const ratingValue = Number(business.aggregate_rating?.value || business.aggregate_rating?.rating_value || 5.0);
  return {
    '@type': ['LocalBusiness', 'TravelAgency'], '@id': 'https://getvendora.net/#organization',
    name: business.brand_display_name, legalName: lang === 'ar' ? business.legal_name_ar : business.legal_name,
    identifier: { '@type': 'PropertyValue', propertyID: 'CR', value: business.cr_number },
    url: 'https://getvendora.net/', telephone: `+${business.booking_whatsapp}`,
    address: { '@type': 'PostalAddress', streetAddress: lang === 'ar' ? business.public_address_ar : business.public_address,
      addressLocality: lang === 'ar' ? 'السيف' : 'Seef', addressCountry: 'BH' },
    description: business[`service_description_${lang}`],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount: ratingCount,
      ratingCount,
      bestRating: 5,
      worstRating: 1
    },
    review: reviewEntities(lang)
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
  const ratingCount = settings.aggregate_rating?.rating_count || settings.aggregate_rating?.review_count || 84;
  const ratingValue = Number(settings.aggregate_rating?.value || settings.aggregate_rating?.rating_value || 5.0);
  return {
    '@type': 'TaxiService', '@id': `${url}#service-${route.route_slug}`, name, url,
    provider: { '@id': 'https://getvendora.net/#organization' },
    serviceType: lang === 'en' ? 'Private car with driver; VIP GMC Yukon XL or executive sedan, subject to confirmation'
      : 'سيارة خاصة مع سائق؛ جمس يوكون أو سيدان تنفيذية حسب التأكيد',
    ...(profile ? { areaServed: [profile[`origin_${lang}`], profile[`destination_${lang}`]].map((name) => ({ '@type': 'Place', name })) } : {}),
    offers: offer,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount: ratingCount,
      ratingCount,
      bestRating: 5,
      worstRating: 1
    },
    review: reviewEntities(lang)
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
