(function () {
  const generatedConfig = window.VENDORA_PUBLIC_CONFIG || { settings: {}, routes: [] };
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
  const list = document.getElementById('priceList');
  const labels = lang === 'en'
    ? { from:'From', unit:{one_way_vehicle:'per vehicle, one way',package:'per package',per_day:'per additional day'}, approx:'approx.', book:'Check availability', quote:'Get Live Seasonal Quote' }
    : { from:'ابتداءً من', unit:{one_way_vehicle:'للمركبة، اتجاه واحد',package:'للباقة',per_day:'لليوم الإضافي'}, approx:'تقريباً', book:'تحقق من التوفر', quote:'احصل على عرض سعر موسمي فوري' };
  function routeUrl(route) {
    const root = '/bahrain-saudi-gcc-transport/';
    const known = route.route_slug.startsWith('bahrain-to-') ? route.route_slug + '/' : '';
    return known ? `${root}${lang === 'en' ? 'en/' : ''}${known}` : `${root}${lang === 'en' ? 'en/' : ''}`;
  }
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  function identifiedMessage(serviceName) {
    return lang === 'en'
      ? `Hello, I contacted you through the Vendora Transport website:\nhttps://getvendora.net/bahrain-saudi-gcc-transport/en/\n\nI would like to enquire about:\n${serviceName}`
      : `السلام عليكم، تواصلت معكم من خلال موقع فندورا للنقل:\nhttps://getvendora.net/bahrain-saudi-gcc-transport/\n\nأرغب في الاستفسار عن:\n${serviceName}`;
  }
  function render(routes, settings, phone) {
    const sar = Number(settings.sar_per_bhd || 10);
    const hiddenGroups = new Set(Array.isArray(settings.hidden_price_destination_groups) ? settings.hidden_price_destination_groups : []);
    const active = routes.filter((r) => r.is_active !== false && r.is_active !== 0);
    list.innerHTML = active.map((r) => {
      const name = lang === 'en' ? r.route_name_en : r.route_name_ar;
      const hidden = settings.public_prices_enabled === false || r.is_price_hidden === true || r.public_price_enabled === false || hiddenGroups.has(r.price_visibility_group) || r.price_kind === 'request_quote' || r.price_bhd == null;
      const message = identifiedMessage(name);
      const included = lang === 'en' ? r.included_en : r.included_ar;
      const unit = labels.unit[r.unit_kind] || labels.unit.one_way_vehicle;
      const currency = lang === 'en' ? 'BHD' : 'د.ب';
      const price = hidden
        ? `<p class="price price-quote"><strong>${escapeHtml(labels.quote)}</strong></p>`
        : `<p class="price"><strong>${r.price_kind === 'from' ? `${labels.from} ` : ''}${Number(r.price_bhd).toFixed(Number(r.price_bhd) % 1 ? 3 : 0)} ${currency}</strong>${r.approximate_sar_enabled ? `<span>${labels.approx} ${Math.round(Number(r.price_bhd)*sar)} SAR</span>` : ''}</p>`;
      const cta = phone ? `<a href="https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}" data-wa-message="${escapeHtml(message)}" data-track-wa>${escapeHtml(hidden ? labels.quote : labels.book)}</a>` : '';
      return `<article class="price-card" data-route="${escapeHtml(r.route_slug)}" data-price-hidden="${hidden}"><h2>${escapeHtml(name)}</h2>${price}<p>${escapeHtml(unit)}</p>${included ? `<p>${escapeHtml(included)}</p>` : ''}${cta}</article>`;
    }).join('');
    const visible = active.filter((r) => settings.public_prices_enabled !== false && r.public_price_enabled !== false && r.is_price_hidden !== true && !hiddenGroups.has(r.price_visibility_group) && r.price_kind !== 'request_quote' && r.price_bhd != null);
    const schema = { '@context':'https://schema.org', '@type':'ItemList', itemListElement:visible.map((r,i) => ({ '@type':'ListItem', position:i+1, item:{ '@type':'Service', name:lang === 'en' ? r.route_name_en : r.route_name_ar, url:new URL(routeUrl(r), location.origin).href, offers:{ '@type':'Offer', price:Number(r.price_bhd), priceCurrency:'BHD', description:labels.unit[r.unit_kind] || labels.unit.one_way_vehicle } } })) };
    document.getElementById('pricesSchema').textContent = JSON.stringify(schema);
    document.dispatchEvent(new CustomEvent('vendora-pricing-update', { detail: { routes, settings } }));
  }
  async function load() {
    const staticSettings = generatedConfig.settings || {};
    const staticRoutes = generatedConfig.routes || [];
    try {
      const response = await fetch('/bahrain-saudi-gcc-transport/api/transport/public-settings', { credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('Pricing settings unavailable');
      const data = await response.json();
      render(Array.isArray(data.routes) ? data.routes : staticRoutes, data.settings || staticSettings, (data.settings || staticSettings).booking_whatsapp_enabled === false ? '' : ((data.settings || staticSettings).booking_whatsapp || ''));
    } catch {
      render(staticRoutes.map((route) => ({ ...route, price_bhd: null, is_price_hidden: true })), { ...staticSettings, public_prices_enabled:false }, staticSettings.booking_whatsapp_enabled === false ? '' : (staticSettings.booking_whatsapp || ''));
    }
  }
  if (list) load();
})();
