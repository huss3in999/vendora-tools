(function () {
  const defaults = [
    ['king-fahd-causeway','جسر الملك فهد','King Fahd Causeway',25,'standard','one_way_vehicle'],
    ['bahrain-to-khobar','البحرين إلى الخبر','Bahrain to Khobar',30,'standard','one_way_vehicle'],
    ['first-stop-after-causeway','أول محطة بعد الجسر','First stop after the Causeway',30,'standard','one_way_vehicle'],
    ['bahrain-to-dammam-airport','البحرين إلى مطار الدمام','Bahrain to Dammam Airport',40,'standard','one_way_vehicle'],
    ['bahrain-to-al-ahsa','البحرين إلى الأحساء','Bahrain to Al Ahsa',70,'standard','one_way_vehicle'],
    ['bahrain-to-jubail','البحرين إلى الجبيل','Bahrain to Jubail',70,'standard','one_way_vehicle'],
    ['bahrain-to-riyadh','البحرين إلى الرياض','Bahrain to Riyadh',120,'standard','one_way_vehicle'],
    ['bahrain-to-madinah','البحرين إلى المدينة المنورة','Bahrain to Madinah',300,'standard','one_way_vehicle'],
    ['bahrain-to-makkah','البحرين إلى مكة','Bahrain to Makkah',300,'standard','one_way_vehicle'],
    ['bahrain-to-khafji','البحرين إلى الخفجي','Bahrain to Khafji',90,'standard','one_way_vehicle'],
    ['bahrain-to-kuwait','البحرين إلى الكويت','Bahrain to Kuwait',120,'standard','one_way_vehicle'],
    ['bahrain-to-abdali','البحرين إلى العبدلي','Bahrain to Abdali',120,'standard','one_way_vehicle'],
    ['bahrain-to-safwan','البحرين إلى صفوان','Bahrain to Safwan',220,'standard','one_way_vehicle'],
    ['bahrain-to-iraq','مسارات العراق','Iraq routes',300,'from','one_way_vehicle'],
    ['bahrain-to-qatar','البحرين إلى قطر','Bahrain to Qatar',120,'standard','one_way_vehicle'],
    ['bahrain-to-dubai','البحرين إلى دبي','Bahrain to Dubai',250,'standard','one_way_vehicle'],
    ['bahrain-to-abu-dhabi','البحرين إلى أبوظبي','Bahrain to Abu Dhabi',225,'standard','one_way_vehicle'],
    ['bahrain-to-oman','البحرين إلى عُمان','Bahrain to Oman',350,'standard','one_way_vehicle'],
    ['bahrain-sightseeing-full-day','جولة البحرين من الصباح إلى الليل','Bahrain sightseeing, morning to night',70,'standard','package'],
    ['bahrain-sightseeing-afternoon','جولة البحرين من العصر إلى الليل','Bahrain sightseeing, afternoon to night',60,'standard','package'],
    ['dammam-shopping-full-day','تسوق الدمام من الصباح إلى الليل','Dammam shopping, morning to night',70,'standard','package'],
    ['dammam-shopping-afternoon','تسوق الدمام من العصر إلى الليل','Dammam shopping, afternoon to night',60,'standard','package'],
    ['additional-gcc-vehicle-day','يوم مركبة إضافي لرحلات العودة الخليجية المؤهلة','Additional vehicle day for qualifying GCC return journeys',60,'standard','per_day']
  ];
  const sarRouteSlugs = new Set(['king-fahd-causeway','bahrain-to-khobar','first-stop-after-causeway','bahrain-to-dammam-airport','bahrain-to-al-ahsa','bahrain-to-jubail','bahrain-to-riyadh','bahrain-to-madinah','bahrain-to-makkah','bahrain-to-khafji']);
  const fallbackRoutes = defaults.map(([route_slug,route_name_ar,route_name_en,price_bhd,price_kind,unit_kind]) => ({route_slug,route_name_ar,route_name_en,price_bhd,price_kind,unit_kind,is_active:true,public_price_enabled:true,approximate_sar_enabled:sarRouteSlugs.has(route_slug)}));
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
    const phone = settings.booking_whatsapp_enabled === false ? '' : (settings.booking_whatsapp || '97333225954');
    const active = routes.filter((r) => r.is_active !== false && r.public_price_enabled !== false && r.price_kind !== 'request_quote' && Number(r.price_bhd) >= 0);
    list.innerHTML = active.map((r) => {
      const name = lang === 'en' ? r.route_name_en : r.route_name_ar;
      const prefix = r.price_kind === 'from' ? `${labels.from} ` : '';
      const message = identifiedMessage(name);
      const sarText = r.approximate_sar_enabled ? `<span>${labels.approx} ${Math.round(Number(r.price_bhd)*sar)} SAR</span>` : '';
      const included = lang === 'en' ? r.included_en : r.included_ar;
      return `<article class="price-card" data-route="${escapeHtml(r.route_slug)}"><h2>${escapeHtml(name)}</h2><p class="price"><strong>${prefix}${Number(r.price_bhd).toFixed(r.price_bhd % 1 ? 3 : 0)} BHD</strong>${sarText}</p><p>${escapeHtml(labels.unit[r.unit_kind] || labels.unit.one_way_vehicle)}</p>${included ? `<p>${escapeHtml(included)}</p>` : ''}${phone ? `<a href="https://wa.me/${phone}?text=${encodeURIComponent(message)}" data-wa-message="${escapeHtml(message)}" data-track-wa>${labels.book}</a>` : ''}</article>`;
    }).join('');
    const schema = { '@context':'https://schema.org', '@type':'ItemList', itemListElement:active.map((r,i) => ({ '@type':'ListItem', position:i+1, item:{ '@type':'Service', name:lang === 'en' ? r.route_name_en : r.route_name_ar, url:new URL(routeUrl(r), location.origin).href, offers:{ '@type':'Offer', price:Number(r.price_bhd), priceCurrency:'BHD', description:labels.unit[r.unit_kind] || labels.unit.one_way_vehicle } } })) };
    document.getElementById('pricesSchema').textContent = JSON.stringify(schema);
  }
  const injected = (() => { try { return JSON.parse(document.getElementById('transport-public-config')?.textContent || '{}'); } catch { return {}; } })();
  render(injected.routes?.length ? injected.routes : fallbackRoutes, injected.settings || {});
  if (!injected.routes?.length) fetch('/bahrain-saudi-gcc-transport/api/transport/public-settings', { credentials:'omit' }).then((r) => r.ok ? r.json() : null).then((data) => { if (data?.routes?.length) render(data.routes, data.settings || {}); }).catch(() => {});
})();
