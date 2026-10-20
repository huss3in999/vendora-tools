// Shared by the static publisher, Worker and browser. Never invent prices or reviews.
export const pricingCopy = {
  en: { fixed: 'Transparent Upfront Pricing', seasonal: 'Seasonal Market Rates — On-Demand Live Quote on WhatsApp', cta: 'Get Live Seasonal Quote' },
  ar: { fixed: 'أسعار واضحة مسبقاً', seasonal: 'أسعار موسمية مرنة — احصل على تسعير فوري عبر الواتساب', cta: 'احصل على عرض سعر موسمي فوري' }
};

export function priceHidden(settings, route) {
  return settings.public_prices_enabled !== true || route.is_price_hidden === true
    || route.public_price_enabled === false || route.price_kind === 'request_quote'
    || (settings.hidden_price_destination_groups || []).includes(route.price_visibility_group)
    || route.price_bhd == null || !Number.isFinite(Number(route.price_bhd));
}

export function businessEntity(business, lang = 'en') {
  return {
    '@type': ['LocalBusiness', 'TravelAgency'], '@id': 'https://getvendora.net/#organization',
    name: business.brand_display_name, legalName: lang === 'ar' ? business.legal_name_ar : business.legal_name,
    identifier: { '@type': 'PropertyValue', propertyID: 'CR', value: business.cr_number },
    url: 'https://getvendora.net/', telephone: `+${business.booking_whatsapp}`,
    address: { '@type': 'PostalAddress', streetAddress: lang === 'ar' ? business.public_address_ar : business.public_address,
      addressLocality: lang === 'ar' ? 'السيف' : 'Seef', addressCountry: 'BH' },
    description: business[`service_description_${lang}`],
    // AggregateRating is added only from real approved reviews, never a made-up score.
    ...(business.aggregate_rating?.review_count > 0 ? { aggregateRating: {
      '@type': 'AggregateRating', ratingValue: business.aggregate_rating.value,
      reviewCount: business.aggregate_rating.review_count, bestRating: 5, worstRating: 1
    } } : {})
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
    '@type': 'TaxiService', '@id': `${url}#service-${route.route_slug}`, name, url,
    provider: { '@id': 'https://getvendora.net/#organization' },
    serviceType: lang === 'en' ? 'Private car with driver; VIP GMC Yukon XL or executive sedan, subject to confirmation'
      : 'سيارة خاصة مع سائق؛ جمس يوكون أو سيدان تنفيذية حسب التأكيد',
    ...(profile ? { areaServed: [profile[`origin_${lang}`], profile[`destination_${lang}`]].map((name) => ({ '@type': 'Place', name })) } : {}), offers: offer
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
