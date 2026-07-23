(function () {
  const generatedConfig = window.VENDORA_PUBLIC_CONFIG || { settings: {}, routes: [] };
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
  const list = document.getElementById('priceList');
  const labels = lang === 'en'
    ? { from:'From', unit:{one_way_vehicle:'per vehicle, one way',package:'per package',per_day:'per additional day'}, approx:'approx.', book:'Check availability' }
    : { from:'ابتداءً من', unit:{one_way_vehicle:'للمركبة، اتجاه واحد',package:'للباقة',per_day:'لليوم الإضافي'}, approx:'تقريباً', book:'تحقق من التوفر' };
  function routeUrl(route) {
    const root = '/bahrain-saudi-gcc-transport/';
    const known = route.route_slug.startsWith('bahrain-to-') ? route.route_slug.slice(11) + '/' : '';
    return known ? `${root}${lang === 'en' ? 'en/' : ''}${known}` : `${root}${lang === 'en' ? 'en/' : ''}`;
  }
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  function identifiedMessage(serviceName) {
    return lang === 'en'
      ? `Hello, I contacted you through the Vendora Transport website:\nhttps://getvendora.net/bahrain-saudi-gcc-transport/en/\n\nI would like to enquire about:\n${serviceName}`
      : `السلام عليكم، تواصلت معكم من خلال موقع فندورا للنقل:\nhttps://getvendora.net/bahrain-saudi-gcc-transport/\n\nأرغب في الاستفسار عن:\n${serviceName}`;
  }
  function render(routes, settings) {
    const sar = Number(settings.sar_per_bhd || 10);
    const phone = settings.booking_whatsapp_enabled === false ? '' : (settings.booking_whatsapp || generatedConfig.settings.booking_whatsapp || '');
    const active = routes.filter((r) => r.is_active !== false && r.public_price_enabled !== false && r.price_kind !== 'request_quote' && Number(r.price_bhd) >= 0);
    list.innerHTML = active.map((r) => {
      const name = lang === 'en' ? r.route_name_en : r.route_name_ar;
      const prefix = r.price_kind === 'from' ? `${labels.from} ` : '';
      const message = identifiedMessage(name);
      const sarText = r.approximate_sar_enabled ? `<span>${labels.approx} ${Math.round(Number(r.price_bhd)*sar)} SAR</span>` : '';
      const included = lang === 'en' ? r.included_en : r.included_ar;
      const currency = lang === 'en' ? 'BHD' : 'د.ب';
      return `<article class="price-card" data-route="${escapeHtml(r.route_slug)}"><h2>${escapeHtml(name)}</h2><p class="price"><strong>${prefix}${Number(r.price_bhd).toFixed(r.price_bhd % 1 ? 3 : 0)} ${currency}</strong>${sarText}</p><p>${escapeHtml(labels.unit[r.unit_kind] || labels.unit.one_way_vehicle)}</p>${included ? `<p>${escapeHtml(included)}</p>` : ''}${phone ? `<a href="https://wa.me/${phone}?text=${encodeURIComponent(message)}" data-wa-message="${escapeHtml(message)}" data-track-wa>${labels.book}</a>` : ''}</article>`;
    }).join('');
    const schema = { '@context':'https://schema.org', '@type':'ItemList', itemListElement:active.map((r,i) => ({ '@type':'ListItem', position:i+1, item:{ '@type':'Service', name:lang === 'en' ? r.route_name_en : r.route_name_ar, url:new URL(routeUrl(r), location.origin).href, offers:{ '@type':'Offer', price:Number(r.price_bhd), priceCurrency:'BHD', description:labels.unit[r.unit_kind] || labels.unit.one_way_vehicle } } })) };
    document.getElementById('pricesSchema').textContent = JSON.stringify(schema);
  }
  const injected = (() => { try { return JSON.parse(document.getElementById('transport-public-config')?.textContent || '{}'); } catch { return {}; } })();
  render(injected.routes?.length ? injected.routes : generatedConfig.routes, injected.routes?.length ? (injected.settings || {}) : generatedConfig.settings);
})();
