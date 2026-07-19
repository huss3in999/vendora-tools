(() => {
  'use strict';

  const form = document.querySelector('[data-planner-form]');
  if (!form) return;

  const isArabic = document.documentElement.lang.toLowerCase().startsWith('ar');
  const rootPath = '/bahrain-saudi-gcc-transport/';
  const routeRanges = {
    'bahrain|khobar': ['45 إلى 95 كم', '45 دقيقة إلى ساعة ونصف', '45 to 95 km', '45 minutes to 1.5 hours'],
    'manama|khobar': ['55 إلى 100 كم', '45 دقيقة إلى ساعة ونصف', '55 to 100 km', '45 minutes to 1.5 hours'],
    'bah|khobar': ['65 إلى 115 كم', 'ساعة إلى ساعة و45 دقيقة', '65 to 115 km', '1 hour to 1 hour 45 minutes'],
    'bahrain|dammam': ['90 إلى 130 كم', 'ساعة إلى ساعتين', '90 to 130 km', '1 to 2 hours'],
    'manama|dammam': ['95 إلى 135 كم', 'ساعة إلى ساعتين', '95 to 135 km', '1 to 2 hours'],
    'bah|dammam': ['105 إلى 150 كم', 'ساعة و15 دقيقة إلى ساعتين', '105 to 150 km', '1 hour 15 minutes to 2 hours'],
    'bahrain|dmm': ['105 إلى 145 كم', 'ساعة إلى ساعة و45 دقيقة', '105 to 145 km', '1 hour to 1 hour 45 minutes'],
    'manama|dmm': ['110 إلى 150 كم', 'ساعة إلى ساعة و45 دقيقة', '110 to 150 km', '1 hour to 1 hour 45 minutes'],
    'bah|dmm': ['120 إلى 165 كم', 'ساعة و15 دقيقة إلى ساعتين', '120 to 165 km', '1 hour 15 minutes to 2 hours'],
    'bahrain|riyadh': ['460 إلى 520 كم', '4.5 إلى 6 ساعات', '460 to 520 km', '4.5 to 6 hours'],
    'manama|riyadh': ['470 إلى 530 كم', '4.5 إلى 6 ساعات', '470 to 530 km', '4.5 to 6 hours'],
    'bah|riyadh': ['480 إلى 545 كم', '4.75 إلى 6.25 ساعات', '480 to 545 km', '4.75 to 6.25 hours'],
    'bahrain|kuwait': ['430 إلى 520 كم', '5.5 إلى 7 ساعات', '430 to 520 km', '5.5 to 7 hours'],
    'manama|kuwait': ['440 إلى 530 كم', '5.5 إلى 7 ساعات', '440 to 530 km', '5.5 to 7 hours'],
    'bahrain|qatar': ['420 إلى 520 كم', '4.5 إلى 6 ساعات', '420 to 520 km', '4.5 to 6 hours'],
    'bahrain|doha': ['440 إلى 540 كم', '4.5 إلى 6 ساعات', '440 to 540 km', '4.5 to 6 hours'],
    'manama|doha': ['450 إلى 550 كم', '4.5 إلى 6 ساعات', '450 to 550 km', '4.5 to 6 hours'],
    'bahrain|uae': ['760 إلى 900 كم', '8 إلى 11 ساعة', '760 to 900 km', '8 to 11 hours'],
    'bahrain|dubai': ['850 إلى 980 كم', '9 إلى 11 ساعة', '850 to 980 km', '9 to 11 hours'],
    'manama|dubai': ['860 إلى 990 كم', '9 إلى 11 ساعة', '860 to 990 km', '9 to 11 hours'],
    'bahrain|abu-dhabi': ['760 إلى 900 كم', '8 إلى 10 ساعات', '760 to 900 km', '8 to 10 hours'],
    'bahrain|oman': ['1050 إلى 1250 كم', '12 إلى 15 ساعة', '1050 to 1250 km', '12 to 15 hours'],
    'bahrain|muscat': ['1100 إلى 1300 كم', '12 إلى 15 ساعة', '1100 to 1300 km', '12 to 15 hours'],
    'khobar|bahrain': ['45 إلى 95 كم', '45 دقيقة إلى ساعة ونصف', '45 to 95 km', '45 minutes to 1.5 hours'],
    'khobar|manama': ['55 إلى 100 كم', '45 دقيقة إلى ساعة ونصف', '55 to 100 km', '45 minutes to 1.5 hours'],
    'dammam|bahrain': ['90 إلى 130 كم', 'ساعة إلى ساعتين', '90 to 130 km', '1 to 2 hours'],
    'dmm|bahrain': ['105 إلى 145 كم', 'ساعة إلى ساعة و45 دقيقة', '105 to 145 km', '1 hour to 1 hour 45 minutes'],
    'riyadh|bahrain': ['460 إلى 520 كم', '4.5 إلى 6 ساعات', '460 to 520 km', '4.5 to 6 hours'],
    'saudi|bahrain': ['حسب المدينة', 'تقريباً من ساعة إلى 6 ساعات', 'Depends on city', 'Approx. 1 to 6 hours']
  };

  const copy = { locations: {
    bahrain: ['🇧🇭', 'البحرين', 'Bahrain', 'bahrain'],
    manama: ['🇧🇭', 'المنامة', 'Manama', 'bahrain'],
    bah: ['🇧🇭', 'مطار البحرين الدولي (رمز المطار BAH)', 'Bahrain International Airport (BAH)', 'bahrain', true],
    saudi: ['🇸🇦', 'المملكة العربية السعودية', 'Saudi Arabia', 'saudi'],
    khobar: ['🇸🇦', 'الخبر', 'Khobar', 'saudi'],
    dammam: ['🇸🇦', 'الدمام', 'Dammam', 'saudi'],
    dmm: ['🇸🇦', 'مطار الملك فهد الدولي (رمز المطار DMM)', 'Dammam Airport DMM', 'saudi', true],
    riyadh: ['🇸🇦', 'الرياض', 'Riyadh', 'saudi'],
    kuwait: ['🇰🇼', 'الكويت', 'Kuwait', 'kuwait'],
    qatar: ['🇶🇦', 'قطر', 'Qatar', 'qatar'],
    doha: ['🇶🇦', 'الدوحة', 'Doha', 'qatar'],
    uae: ['🇦🇪', 'الإمارات العربية المتحدة', 'United Arab Emirates', 'uae'],
    dubai: ['🇦🇪', 'دبي', 'Dubai', 'uae'],
    'abu-dhabi': ['🇦🇪', 'أبوظبي', 'Abu Dhabi', 'uae'],
    oman: ['🇴🇲', 'عُمان', 'Oman', 'oman'],
    muscat: ['🇴🇲', 'مسقط', 'Muscat', 'oman']
  } };
  const locations = Object.entries(copy.locations).map(([id, [flag, ar, en, group, airport = false]]) => ({ id, flag, ar, en, group, airport }));

  const t = isArabic ? {
    modes: [['price', 'تقدير السعر'], ['process', 'مدة الرحلة ومراحلها'], ['airport', 'المطار والخدمة بالساعة']],
    journey: 'اتجاه الرحلة', oneWay: 'اتجاه واحد', return: 'ذهاب وعودة', calculate: 'احسب الرحلة',
    service: 'نوع الخدمة', airportService: 'خدمة المطار أو السائق', airportTransfer: 'استقبال أو توصيل المطار',
    hourly: 'طلب سائق بالساعة', fullDay: 'طلب سائق ليوم كامل', package: 'الباقة المطلوبة',
    flight: 'رقم الرحلة', waiting: 'متطلبات الانتظار', waitingPlaceholder: 'مثال: انتظار بعد الوصول أو توقف إضافي',
    airportName: 'المطار', routeSummary: 'ملخص المسار', price: 'السعر أو حالة التسعير', quote: 'اطلب عرض سعر مؤكداً',
    unavailable: 'هذا الخيار غير مسعّر في الإعدادات العامة الحالية.', perVehicle: 'للمركبة كاملة، اتجاه واحد',
    perPackage: 'لباقة المركبة الكاملة', perDay: 'لكل يوم مركبة مؤهل', from: 'ابتداءً من', approx: 'تقريباً',
    distance: 'المسافة التقريبية', time: 'المدة التقريبية', status: 'حالة المسار', configured: 'سعر عام مُعدّ',
    estimate: 'تقدير مسار', needsConfirmation: 'يحتاج تأكيد', same: 'اختر نقطتي انطلاق ووصول مختلفتين.', disclaimer: 'المدة والمسافة تقديريتان؛ قد تتأثر الرحلة بحركة المرور وإجراءات الحدود والطقس والتوقفات. لا يُعد السعر نهائياً حتى تأكيد التفاصيل والتوفر عبر واتساب.',
    airportHelp: 'أضف رقم الرحلة ووقت الوصول أو المغادرة وعدد الركاب والحقائب ونقطة اللقاء.',
    familyHelp: 'تُراجع المركبة المناسبة وفق عدد الركاب وحجم الأمتعة والتوفر.', parcelHelp: 'تخضع الطرود لنوع الغرض والحجم والوجهة والأنظمة والتوفر.',
    timeline: 'مراحل الرحلة', received: 'استلام طلب الحجز', confirmed: 'تأكيد تفاصيل الرحلة', coordinated: 'تنسيق السائق والمركبة', pickup: 'استلام الراكب', exit: 'إجراءات المغادرة من البحرين', causeway: 'عبور جسر الملك فهد', entry: 'إجراءات الدخول إلى السعودية', continue: 'متابعة الطريق إلى الوجهة', arrival: 'الوصول وإتمام الرحلة',
    airportStage: 'تنسيق الرحلة ونقطة اللقاء في المطار', borderStage: 'إجراءات الحدود حسب الدول الواقعة على المسار', restStage: 'التوقفات والراحة حسب طول الرحلة', localStage: 'متابعة المسار المحلي والتوقفات المطلوبة',
    messageIntro: 'مرحباً فندورا، أحتاج طلب رحلة خاصة.', copied: 'تم النسخ', copyDefault: 'نسخ التفاصيل', reset: 'إعادة الضبط', whatsapp: 'المتابعة عبر واتساب'
  } : {
    modes: [['price', 'Price Estimate'], ['process', 'Journey Time & Process'], ['airport', 'Airport & Hourly Service']],
    journey: 'Journey direction', oneWay: 'One Way', return: 'Return', calculate: 'Calculate Trip',
    service: 'Service type', airportService: 'Airport or driver service', airportTransfer: 'Airport pickup or drop-off',
    hourly: 'Hourly driver request', fullDay: 'Full-day driver request', package: 'Requested package',
    flight: 'Flight number', waiting: 'Waiting requirement', waitingPlaceholder: 'Example: wait after arrival or an additional stop',
    airportName: 'Airport', routeSummary: 'Route summary', price: 'Price or quotation status', quote: 'Request a confirmed quotation',
    unavailable: 'This option has no public configured price.', perVehicle: 'per complete vehicle, one way',
    perPackage: 'per complete vehicle package', perDay: 'per qualifying vehicle day', from: 'From', approx: 'approx.',
    distance: 'Approx. distance', time: 'Approx. journey time', status: 'Route status', configured: 'Configured public price',
    estimate: 'Route estimate', needsConfirmation: 'Needs confirmation', same: 'Choose different pickup and destination points.', disclaimer: 'Time and distance are estimates. Traffic, border processing, weather and rest stops can affect the journey. A price is not final until trip details and availability are confirmed on WhatsApp.',
    airportHelp: 'Add the flight number, arrival or departure time, passenger and luggage counts, and meeting point.',
    familyHelp: 'A suitable vehicle is reviewed against passenger count, luggage size and availability.', parcelHelp: 'Prohibited or restricted items cannot be accepted. Other parcels depend on item type, size, destination, regulations and availability.',
    timeline: 'Journey stages', received: 'Booking request received', confirmed: 'Journey details confirmed', coordinated: 'Driver and vehicle coordinated', pickup: 'Passenger pickup', exit: 'Bahrain exit procedures', causeway: 'King Fahd Causeway crossing', entry: 'Saudi entry procedures', continue: 'Continue to destination', arrival: 'Arrival and journey completion',
    airportStage: 'Flight and airport meeting point coordinated', borderStage: 'Border procedures for the countries on the route', restStage: 'Rest stops appropriate to the journey length', localStage: 'Continue on the local route and requested stops',
    messageIntro: 'Hello Vendora, I need a private transport request.', copied: 'Copied', copyDefault: 'Copy Details', reset: 'Reset', whatsapp: 'Continue on WhatsApp'
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const fromSelect = $('[data-planner-from]');
  const toSelect = $('[data-planner-to]');
  const typeSelect = $('[data-planner-type]');
  const passengersInput = $('[data-planner-passengers]');
  const luggageInput = $('[data-planner-luggage]');
  const dateInput = $('[data-planner-date]');
  const timeInput = $('[data-planner-time]');
  const notesInput = $('[data-planner-notes]');
  const result = $('.planner-result');
  const waLink = $('[data-planner-whatsapp]');
  const copyButton = $('[data-planner-copy]');
  const resetButton = $('[data-planner-reset]');
  let mode = 'price';
  let publicConfig = { settings: {}, routes: [] };

  function label(location) { return isArabic ? location.ar : location.en; }
  function byId(id) { return locations.find((item) => item.id === id) || locations[0]; }
  function fillLocations(select) {
    select.innerHTML = locations.map((item) => `<option value="${item.id}">${isArabic ? '' : `${item.flag} `}${label(item)}</option>`).join('');
  }

  function augmentInterface() {
    const toolGrid = $('.planner-tool-grid');
    const tabs = document.createElement('div');
    tabs.className = 'calculator-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', isArabic ? 'أوضاع حاسبة الرحلة' : 'Trip Calculator modes');
    tabs.innerHTML = t.modes.map(([value, text], index) => `<button type="button" role="tab" id="calculator-tab-${value}" aria-controls="calculator-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}" data-calculator-mode="${value}">${text}</button>`).join('');
    toolGrid.before(tabs);
    toolGrid.id = 'calculator-panel';
    toolGrid.setAttribute('role', 'tabpanel');
    toolGrid.setAttribute('aria-labelledby', 'calculator-tab-price');

    const direction = document.createElement('fieldset');
    direction.className = 'calculator-direction';
    direction.innerHTML = `<legend>${t.journey}</legend><label><input type="radio" name="calculator-direction" value="one_way" checked><span>${t.oneWay}</span></label><label><input type="radio" name="calculator-direction" value="return"><span>${t.return}</span></label>`;
    form.children[0]?.insertAdjacentElement('afterend', direction);

    const airport = document.createElement('div');
    airport.className = 'calculator-airport-fields';
    airport.dataset.modeOnly = 'airport';
    airport.hidden = true;
    airport.innerHTML = `<div class="planner-field-row"><div class="planner-field"><label for="calculator-airport-service">${t.airportService}</label><select id="calculator-airport-service" data-calculator-airport-service><option value="airport">${t.airportTransfer}</option><option value="hourly">${t.hourly}</option><option value="full-day">${t.fullDay}</option></select></div><div class="planner-field"><label for="calculator-package">${t.package}</label><select id="calculator-package" data-calculator-package><option value="bahrain-sightseeing-full-day">${isArabic ? 'جولة البحرين — يوم كامل' : 'Bahrain sightseeing — full day'}</option><option value="bahrain-sightseeing-afternoon">${isArabic ? 'جولة البحرين — من العصر إلى الليل' : 'Bahrain sightseeing — afternoon to night'}</option><option value="dammam-shopping-full-day">${isArabic ? 'تسوق الدمام — يوم كامل' : 'Dammam shopping — full day'}</option><option value="dammam-shopping-afternoon">${isArabic ? 'تسوق الدمام — من العصر إلى الليل' : 'Dammam shopping — afternoon to night'}</option></select></div></div><div class="planner-field-row"><div class="planner-field"><label for="calculator-flight">${t.flight}</label><input id="calculator-flight" data-calculator-flight autocomplete="off"></div><div class="planner-field"><label for="calculator-waiting">${t.waiting}</label><input id="calculator-waiting" data-calculator-waiting placeholder="${t.waitingPlaceholder}"></div></div>`;
    notesInput.closest('.planner-field').before(airport);

    const calculate = document.createElement('button');
    calculate.type = 'button';
    calculate.className = 'calculator-submit';
    calculate.setAttribute('data-calculator-submit', '');
    calculate.innerHTML = `<i data-lucide="calculator" aria-hidden="true"></i><span>${t.calculate}</span>`;
    form.appendChild(calculate);

    const metrics = $('.result-metric-grid');
    metrics.insertAdjacentHTML('afterbegin', `<div class="result-metric calculator-price-metric"><span>${t.price}</span><strong data-result-price>${t.quote}</strong><small data-result-price-unit></small></div>`);
    const noteList = $('.planner-note-list');
    noteList.insertAdjacentHTML('beforebegin', `<section class="calculator-timeline" aria-labelledby="calculator-timeline-title"><h4 id="calculator-timeline-title">${t.timeline}</h4><ol data-result-timeline></ol></section>`);
    result.setAttribute('tabindex', '-1');

    tabs.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = [...tabs.querySelectorAll('[role="tab"]')];
      const current = buttons.indexOf(document.activeElement);
      const rtlFlip = isArabic ? -1 : 1;
      let next = current;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'ArrowRight') next = (current + rtlFlip + buttons.length) % buttons.length;
      else next = (current - rtlFlip + buttons.length) % buttons.length;
      buttons[next].focus();
      buttons[next].click();
    });
    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-calculator-mode]');
      if (!button) return;
      mode = button.dataset.calculatorMode;
      tabs.querySelectorAll('[role="tab"]').forEach((tab) => {
        const selected = tab === button;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      toolGrid.setAttribute('aria-labelledby', button.id);
      document.querySelectorAll('[data-mode-only="airport"]').forEach((node) => { node.hidden = mode !== 'airport'; });
      document.body.dataset.calculatorMode = mode;
      update();
    });
  }

  function currentRoute() {
    const from = byId(fromSelect.value);
    const to = byId(toSelect.value);
    const direct = routeRanges[`${from.id}|${to.id}`];
    const reverse = routeRanges[`${to.id}|${from.id}`];
    const range = direct || reverse || null;
    return { from, to, range: range ? (isArabic ? range.slice(0, 2) : range.slice(2, 4)) : null, same: from.id === to.id };
  }

  function routeSlug(route) {
    if (!['bahrain', 'manama', 'bah'].includes(route.from.id)) return '';
    const destination = {
      saudi: 'king-fahd-causeway', khobar: 'bahrain-to-khobar', dammam: 'bahrain-to-dammam-airport', dmm: 'bahrain-to-dammam-airport',
      riyadh: 'bahrain-to-riyadh', kuwait: 'bahrain-to-kuwait', qatar: 'bahrain-to-qatar', doha: 'bahrain-to-qatar',
      uae: 'bahrain-to-abu-dhabi', 'abu-dhabi': 'bahrain-to-abu-dhabi', dubai: 'bahrain-to-dubai', oman: 'bahrain-to-oman', muscat: 'bahrain-to-oman'
    };
    return destination[route.to.id] || '';
  }

  function configuredPrice(route) {
    const direction = form.querySelector('input[name="calculator-direction"]:checked')?.value || 'one_way';
    let slug = routeSlug(route);
    if (mode === 'airport') {
      const service = $('[data-calculator-airport-service]')?.value;
      if (service === 'hourly') return null;
      if (service === 'full-day') slug = $('[data-calculator-package]')?.value || '';
    }
    if (!slug) return null;
    const candidate = publicConfig.routes.find((item) => {
      if (item.route_slug !== slug || item.is_active === false || item.is_active === 0 || item.public_price_enabled === false || item.public_price_enabled === 0) return false;
      if (direction === 'return') return item.trip_type === 'return_quote';
      return item.trip_type !== 'return_quote';
    });
    if (!candidate || candidate.currency !== 'BHD' || candidate.price_kind === 'request_quote' || candidate.price_bhd == null || !Number.isFinite(Number(candidate.price_bhd))) return null;
    return candidate;
  }

  function priceDisplay(route) {
    const price = configuredPrice(route);
    if (!price) return { text: t.quote, unit: t.unavailable, configured: false };
    const amount = Number(price.price_bhd).toFixed(Number(price.price_bhd) % 1 ? 3 : 0);
    const prefix = price.price_kind === 'from' ? `${t.from} ` : '';
    const sarRate = Number(publicConfig.settings?.sar_per_bhd || 0);
    const sar = price.approximate_sar_enabled && sarRate > 0 ? ` · ${t.approx} ${Math.round(Number(price.price_bhd) * sarRate)} ${isArabic ? 'ر.س' : 'SAR'}` : '';
    const unit = price.unit_kind === 'package' ? t.perPackage : price.unit_kind === 'per_day' ? t.perDay : t.perVehicle;
    return { text: `${prefix}${amount} ${isArabic ? 'د.ب' : 'BHD'}${sar}`, unit, configured: true };
  }

  function stages(route) {
    const base = [t.received, t.confirmed, t.coordinated, route.from.airport || route.to.airport || mode === 'airport' ? t.airportStage : t.pickup];
    if (route.from.group === 'bahrain' && route.to.group === 'saudi') base.push(t.exit, t.causeway, t.entry, t.continue);
    else if (route.from.group !== route.to.group) base.push(t.borderStage, t.restStage, t.continue);
    else base.push(t.localStage);
    base.push(t.arrival);
    return base;
  }

  function buildMessage(route, price) {
    const direction = form.querySelector('input[name="calculator-direction"]:checked')?.value || 'one_way';
    const fields = isArabic ? {
      mode: 'وضع الحاسبة', from: 'من', to: 'إلى', direction: 'اتجاه الرحلة', service: 'نوع الخدمة', date: 'التاريخ', time: 'الوقت', passengers: 'الركاب', luggage: 'الحقائب', flight: 'رقم الرحلة', waiting: 'الانتظار', notes: 'ملاحظات', price: 'التسعير'
    } : { mode: 'Calculator mode', from: 'From', to: 'To', direction: 'Journey', service: 'Service', date: 'Date', time: 'Time', passengers: 'Passengers', luggage: 'Luggage', flight: 'Flight number', waiting: 'Waiting', notes: 'Notes', price: 'Pricing' };
    const modeLabel = t.modes.find(([value]) => value === mode)?.[1] || '';
    const service = mode === 'airport' ? $('[data-calculator-airport-service]')?.selectedOptions[0]?.textContent : typeSelect.selectedOptions[0]?.textContent;
    return [t.messageIntro,
      `${fields.mode}: ${modeLabel}`,
      `${fields.from}: ${route.from.flag} ${label(route.from)}`,
      `${fields.to}: ${route.to.flag} ${label(route.to)}`,
      `${fields.direction}: ${direction === 'return' ? t.return : t.oneWay}`,
      `${fields.service}: ${service || ''}`,
      `${fields.date}: ${dateInput.value || '-'}`,
      `${fields.time}: ${timeInput.value || '-'}`,
      `${fields.passengers}: ${passengersInput.value || '-'}`,
      `${fields.luggage}: ${luggageInput.value || '-'}`,
      `${fields.flight}: ${$('[data-calculator-flight]')?.value || '-'}`,
      `${fields.waiting}: ${$('[data-calculator-waiting]')?.value || '-'}`,
      `${fields.notes}: ${notesInput.value || '-'}`,
      `${fields.price}: ${price.configured ? `${price.text} — ${price.unit}` : t.quote}`].join('\n');
  }

  function refreshWhatsApp(message) {
    waLink.setAttribute('data-wa-message', message);
    window.vendoraRefreshWhatsAppLink?.(waLink);
    const bottom = $('[data-vip-bottom-whatsapp]');
    if (bottom) {
      bottom.setAttribute('data-wa-message', message);
      window.vendoraRefreshWhatsAppLink?.(bottom);
    }
  }

  function update() {
    const route = currentRoute();
    const routeLabel = isArabic ? `${label(route.from)} إلى ${label(route.to)}` : `${label(route.from)} to ${label(route.to)}`;
    const price = priceDisplay(route);
    $('[data-result-title]').textContent = routeLabel;
    $('[data-result-summary]').textContent = route.same ? t.same : routeLabel;
    $('[data-result-distance]').textContent = route.same ? '—' : (route.range?.[0] || (isArabic ? 'حسب المسار' : 'Depends on route'));
    $('[data-result-time]').textContent = route.same ? '—' : (route.range?.[1] || (isArabic ? 'يؤكد حسب المسار' : 'Confirmed by route'));
    $('[data-result-type]').textContent = form.querySelector('input[name="calculator-direction"]:checked')?.value === 'return' ? t.return : t.oneWay;
    $('[data-result-support]').textContent = route.range ? t.estimate : t.needsConfirmation;
    $('[data-result-price]').textContent = route.same ? t.quote : price.text;
    $('[data-result-price-unit]').textContent = route.same ? t.unavailable : price.unit;
    $('[data-result-border]').textContent = t.disclaimer;
    $('[data-result-airport]').textContent = route.from.airport || route.to.airport || mode === 'airport' || typeSelect.value === 'airport' ? t.airportHelp : t.disclaimer;
    $('[data-result-family]').textContent = t.familyHelp;
    $('[data-result-parcel]').textContent = typeSelect.value === 'parcel' ? t.parcelHelp : t.familyHelp;
    $('[data-result-timeline]').innerHTML = stages(route).map((stage) => `<li><span aria-hidden="true"></span><strong>${stage}</strong></li>`).join('');
    refreshWhatsApp(buildMessage(route, price));
  }

  async function loadPublicConfig() {
    try {
      const injected = JSON.parse(document.getElementById('transport-public-config')?.textContent || '{}');
      if (Array.isArray(injected.routes) && injected.routes.length) publicConfig = injected;
    } catch { /* request the public endpoint below */ }
    if (!publicConfig.routes.length && location.protocol !== 'file:') {
      try {
        const response = await fetch(`${rootPath}api/transport/public-settings`, { credentials: 'omit' });
        const data = response.ok ? await response.json() : null;
        if (Array.isArray(data?.routes)) publicConfig = data;
      } catch { /* quotation mode remains available */ }
    }
    update();
  }

  fillLocations(fromSelect);
  fillLocations(toSelect);
  fromSelect.value = 'manama';
  toSelect.value = 'khobar';
  augmentInterface();
  [...form.querySelectorAll('select, input, textarea')].forEach((control) => {
    control.addEventListener('input', update);
    control.addEventListener('change', update);
  });
  $('[data-calculator-submit]').addEventListener('click', () => { update(); result.focus({ preventScroll: true }); result.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(waLink.getAttribute('data-wa-message') || '');
      copyButton.querySelector('span').textContent = t.copied;
      setTimeout(() => { copyButton.querySelector('span').textContent = t.copyDefault; }, 1800);
    } catch { copyButton.querySelector('span').textContent = t.copyDefault; }
  });
  resetButton.addEventListener('click', () => {
    form.reset(); fromSelect.value = 'manama'; toSelect.value = 'khobar'; passengersInput.value = '2'; luggageInput.value = '2';
    document.querySelector('[data-calculator-mode="price"]')?.click(); update();
  });
  if (copyButton.querySelector('span')) copyButton.querySelector('span').textContent = t.copyDefault;
  if (resetButton.querySelector('span')) resetButton.querySelector('span').textContent = t.reset;
  if (waLink.querySelector('span')) waLink.querySelector('span').textContent = t.whatsapp;
  update();
  loadPublicConfig();
  window.vendoraTripCalculator = { update, routeRanges, get mode() { return mode; } };
  window.lucide?.createIcons();
})();
