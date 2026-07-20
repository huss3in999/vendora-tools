(function () {
  const root = document.documentElement;
  const lang = (root.getAttribute('lang') || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  const copy = lang === 'en' ? {
    loading: 'Loading your booking…',
    invalid: 'This booking reference is not valid. Please check the link from your WhatsApp message.',
    legacy: 'This older Passenger Care link has expired. For privacy, it cannot be used to submit feedback. Request a new secure link through WhatsApp.',
    requestLink: 'Request a new secure link',
    lockedTitle: 'Follow-up already submitted',
    lockedBody: 'A follow-up has already been submitted for this booking.',
    thanksTitle: 'Thank You',
    thanksBody: 'Your feedback has been received successfully.',
    thanksSub: 'Your input helps us improve service quality and passenger care.',
    thanksFooter: '',
    trustLead: 'We continuously improve our service quality and passenger experience. This follow-up takes less than 20 seconds.',
    question: 'How did your journey or booking end?',
    route: 'Route',
    submit: 'Confirm & Submit',
    submitting: 'Sending…',
    selectOutcome: 'Please choose how your journey or booking ended.',
    optional: 'Additional Information (Optional)',
    rating: 'Service rating',
    comment: 'Comment',
    quoted: 'Quoted price (optional)',
    paid: 'Paid price (optional)',
    footer: 'This follow-up is confidential and used only to improve service quality.',
    outcomes: {
      driver_contacted: 'Driver contacted me',
      driver_no_contact: 'Driver did not contact me',
      booking_confirmed: 'Booking confirmed',
      customer_declined: 'I declined the booking',
      driver_unavailable: 'Driver unavailable',
      trip_completed: 'Trip completed',
      trip_cancelled: 'Trip cancelled',
      other: 'Other',
      completed: 'Trip completed',
      cancelled: 'Booking cancelled',
      no_driver: 'No driver available',
      no_response: 'No response received',
      price_high: 'Price was too high',
      other_transport: 'Found another transport option',
    },
  } : {
    loading: 'جاري تحميل بيانات الحجز…',
    invalid: 'رقم الحجز غير صالح. يرجى التحقق من الرابط في رسالة الواتساب.',
    lockedTitle: 'تم إرسال المتابعة مسبقاً',
    lockedBody: 'تم إرسال المتابعة مسبقاً لهذا الحجز.',
    thanksTitle: 'شكراً لك',
    thanksBody: 'تم استلام ملاحظتك بنجاح.',
    thanksSub: 'مساهمتك تساعدنا على تحسين جودة الخدمة ورعاية المسافرين.',
    thanksFooter: '',
    trustLead: 'نحرص على تحسين جودة الخدمة والتأكد من رضا المسافرين. تستغرق هذه المتابعة أقل من 20 ثانية.',
    question: 'كيف انتهت رحلتك أو طلبك؟',
    route: 'المسار',
    submit: 'تأكيد وإرسال',
    submitting: 'جاري الإرسال…',
    selectOutcome: 'يرجى اختيار كيف انتهت رحلتك أو طلبك.',
    optional: 'معلومات إضافية (اختياري)',
    rating: 'تقييم الخدمة',
    comment: 'ملاحظة',
    quoted: 'السعر المعروض (اختياري)',
    paid: 'السعر المدفوع (اختياري)',
    footer: 'هذه المتابعة سرية وتستخدم فقط لتحسين جودة الخدمة.',
    outcomes: {
      driver_contacted: 'تواصل معي السائق',
      driver_no_contact: 'لم يتواصل معي السائق',
      booking_confirmed: 'تم تأكيد الحجز',
      customer_declined: 'اعتذرت عن الحجز',
      driver_unavailable: 'السائق غير متوفر',
      trip_completed: 'تمت الرحلة',
      trip_cancelled: 'ألغيت الرحلة',
      other: 'أخرى',
      completed: 'تمت الرحلة',
      cancelled: 'تم إلغاء الحجز',
      no_driver: 'لم يتوفر سائق',
      no_response: 'لم يتم الرد',
      price_high: 'السعر كان مرتفع',
      other_transport: 'تم اختيار وسيلة نقل أخرى',
    },
  };

  const arabicOutcomeLabels = {
    driver_contacted: '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u064a \u0627\u0644\u0633\u0627\u0626\u0642',
    driver_no_contact: '\u0644\u0645 \u064a\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u064a \u0627\u0644\u0633\u0627\u0626\u0642',
    booking_confirmed: '\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632',
    customer_declined: '\u0627\u0639\u062a\u0630\u0631\u062a \u0639\u0646 \u0627\u0644\u062d\u062c\u0632',
    driver_unavailable: '\u0627\u0644\u0633\u0627\u0626\u0642 \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631',
    trip_completed: '\u062a\u0645\u062a \u0627\u0644\u0631\u062d\u0644\u0629',
    trip_cancelled: '\u0623\u0644\u063a\u064a\u062a \u0627\u0644\u0631\u062d\u0644\u0629',
    other: '\u0623\u062e\u0631\u0649',
  };

  const params = new URLSearchParams(window.location.search);
  const token = (params.get('token') || '').trim().toLowerCase();
  const legacyRef = (params.get('ref') || '').trim();
  const apiBase = '/bahrain-saudi-gcc-transport/api/transport/passenger-care';
  const presenceEndpoints = [
    '/bahrain-saudi-gcc-transport/api/transport/event',
    '/api/transport/event',
  ];

  const els = {
    loading: document.getElementById('loadingView'),
    formView: document.getElementById('formView'),
    thanksView: document.getElementById('thanksView'),
    lockedView: document.getElementById('lockedView'),
    errorView: document.getElementById('errorView'),
    refLabel: document.getElementById('refLabel'),
    routeLabel: document.getElementById('routeLabel'),
    options: document.getElementById('outcomeOptions'),
    optionalSummary: document.getElementById('optionalSummary'),
    ratingRow: document.getElementById('ratingRow'),
    comment: document.getElementById('commentField'),
    quoted: document.getElementById('quotedField'),
    paid: document.getElementById('paidField'),
    submit: document.getElementById('submitBtn'),
    formError: document.getElementById('formError'),
    thanksBody: document.getElementById('thanksBody'),
    thanksSub: document.getElementById('thanksSub'),
    thanksFooter: document.getElementById('thanksFooter'),
    lockedBody: document.getElementById('lockedBody'),
    errorBody: document.getElementById('errorBody'),
    trustLead: document.getElementById('trustLead'),
    questionText: document.getElementById('questionText'),
    footerNote: document.getElementById('footerNote'),
  };

  let selectedOutcome = '';
  let selectedRating = null;

  const views = ['loadingView', 'formView', 'thanksView', 'lockedView', 'errorView'];

  function show(view) {
    views.forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.classList.toggle('hidden', id !== view);
    });
  }

  function getCareSessionId() {
    const key = 'vendora_care_session';
    try {
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(key, id);
      }
      return id;
    } catch {
      return crypto.randomUUID();
    }
  }

  function sendCarePresence() {
    const payload = {
      timestamp: new Date().toISOString(),
      serviceType: 'passenger-care-pageview',
      routeSlug: 'passenger-care',
      routeLabel: lang === 'en' ? 'Journey Follow-Up' : 'متابعة الرحلة',
      pagePath: window.location.pathname,
      pageUrl: window.location.href,
      pageTitle: document.title || '',
      language: lang,
      sessionId: getCareSessionId(),
      visitorId: getCareSessionId(),
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      browserLanguage: navigator.language || '',
      timeOnPageMs: 0,
      scrollDepthPercent: 0,
      interactionCount: 0,
    };
    const body = JSON.stringify(payload);
    presenceEndpoints.forEach((endpoint) => {
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          if (navigator.sendBeacon(endpoint, blob)) return;
        }
      } catch { /* fall through */ }
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'omit',
        body,
        keepalive: true,
      }).catch(() => {});
    });
  }

  function setupCarePresence() {
    sendCarePresence();
    setInterval(sendCarePresence, 120000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sendCarePresence();
    });
  }

  async function fetchBooking(tokenValue) {
    const endpoints = [
      `${apiBase}?token=${encodeURIComponent(tokenValue)}`,
      `/api/transport/passenger-care?token=${encodeURIComponent(tokenValue)}`,
    ];
    for (let i = 0; i < endpoints.length; i += 1) {
      try {
        const res = await fetch(endpoints[i], { credentials: 'omit' });
        let data;
        try {
          data = await res.json();
        } catch {
          continue;
        }
        if (res.ok && data.ok) return data;
      } catch {
        // try next endpoint
      }
    }
    return null;
  }

  function showFormForRef(refValue, routeLabel) {
    els.refLabel.textContent = refValue;
    if (routeLabel) {
      els.routeLabel.textContent = `${copy.route}: ${routeLabel}`;
      els.routeLabel.classList.remove('hidden');
    } else {
      els.routeLabel.classList.add('hidden');
    }
    show('formView');
  }

  function renderOptions() {
    els.options.innerHTML = Object.entries(copy.outcomes).map(([value, label]) => (
      `<button type="button" class="option-btn" data-outcome="${value}">${lang === 'ar' && arabicOutcomeLabels[value] ? arabicOutcomeLabels[value] : label}</button>`
    )).join('');

    els.options.querySelectorAll('[data-outcome]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedOutcome = btn.dataset.outcome;
        els.options.querySelectorAll('.option-btn').forEach((node) => node.classList.remove('selected'));
        btn.classList.add('selected');
        els.submit.disabled = false;
        els.formError.textContent = '';
      });
    });
  }

  function renderRating() {
    els.ratingRow.innerHTML = [1, 2, 3, 4, 5].map((n) => (
      `<button type="button" class="rating-btn" data-rating="${n}" aria-label="${n}">${n}</button>`
    )).join('');

    els.ratingRow.querySelectorAll('[data-rating]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedRating = Number(btn.dataset.rating);
        els.ratingRow.querySelectorAll('.rating-btn').forEach((node) => node.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  function applyStaticCopy() {
    if (els.trustLead) els.trustLead.textContent = copy.trustLead;
    if (els.questionText) els.questionText.textContent = copy.question;
    if (els.footerNote) els.footerNote.textContent = copy.footer;
    els.optionalSummary.textContent = copy.optional;
    document.getElementById('ratingLabel').textContent = copy.rating;
    document.getElementById('commentLabel').textContent = copy.comment;
    document.getElementById('quotedLabel').textContent = copy.quoted;
    document.getElementById('paidLabel').textContent = copy.paid;
    els.submit.textContent = copy.submit;
    els.thanksBody.textContent = copy.thanksBody;
    if (els.thanksSub) els.thanksSub.textContent = copy.thanksSub;
    els.thanksFooter.textContent = copy.thanksFooter;
    els.lockedBody.textContent = copy.lockedBody;
    document.getElementById('thanksTitle').textContent = copy.thanksTitle;
    document.getElementById('lockedTitle').textContent = copy.lockedTitle;
    document.getElementById('loadingText').textContent = copy.loading;
  }

  async function loadBooking() {
    if (legacyRef && !token) {
      els.errorBody.textContent = lang === 'en'
        ? copy.legacy
        : '\u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u0629 \u0631\u0627\u0628\u0637 \u0631\u0639\u0627\u064a\u0629 \u0627\u0644\u0645\u0633\u0627\u0641\u0631 \u0627\u0644\u0642\u062f\u064a\u0645. \u0644\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629\u060c \u0627\u0637\u0644\u0628 \u0631\u0627\u0628\u0637\u0627\u064b \u0622\u0645\u0646\u0627\u064b \u062c\u062f\u064a\u062f\u0627\u064b \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628.';
      const link = document.createElement('a');
      link.textContent = lang === 'en' ? copy.requestLink : '\u0627\u0637\u0644\u0628 \u0631\u0627\u0628\u0637\u0627\u064b \u0622\u0645\u0646\u0627\u064b \u062c\u062f\u064a\u062f\u0627\u064b';
      const website = lang === 'en'
        ? 'https://getvendora.net/bahrain-saudi-gcc-transport/en/'
        : 'https://getvendora.net/bahrain-saudi-gcc-transport/';
      const message = lang === 'en'
        ? `Hello, I contacted you through the Vendora Transport website:\n${website}\n\nI would like to enquire about:\nA new secure Passenger Care link`
        : `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645\u060c \u062a\u0648\u0627\u0635\u0644\u062a \u0645\u0639\u0643\u0645 \u0645\u0646 \u062e\u0644\u0627\u0644 \u0645\u0648\u0642\u0639 \u0641\u0646\u062f\u0648\u0631\u0627 \u0644\u0644\u0646\u0642\u0644:\n${website}\n\n\u0623\u0631\u063a\u0628 \u0641\u064a \u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0639\u0646:\n\u0631\u0627\u0628\u0637 \u0622\u0645\u0646 \u062c\u062f\u064a\u062f \u0644\u0631\u0639\u0627\u064a\u0629 \u0627\u0644\u0645\u0633\u0627\u0641\u0631`;
      link.href = `https://wa.me/97333225954?text=${encodeURIComponent(message)}`;
      link.className = 'care-support-link';
      els.errorBody.after(link);
      fetch('/bahrain-saudi-gcc-transport/api/transport/public-settings', { credentials: 'omit' }).then((response) => response.ok ? response.json() : null).then((data) => {
        const settings = data?.settings || {};
        const phone = settings.support_phone_enabled && settings.support_phone ? settings.support_phone : settings.booking_whatsapp;
        if (phone) link.href = link.href.replace(/wa\.me\/\d+/, `wa.me/${phone}`);
      }).catch(() => {});
      show('errorView');
      return;
    }
    if (!/^[a-f0-9]{48}$/.test(token)) {
      els.errorBody.textContent = copy.invalid;
      show('errorView');
      return;
    }

    try {
      const data = await fetchBooking(token);
      if (data && data.ok) {
        if (data.already_submitted) {
          show('lockedView');
          return;
        }
        showFormForRef(data.booking_ref || '', data.route_label || '');
        return;
      }
      els.errorBody.textContent = copy.invalid;
      show('errorView');
    } catch {
      els.errorBody.textContent = copy.invalid;
      show('errorView');
    }
  }

  async function submitFeedback() {
    if (!selectedOutcome) {
      els.formError.textContent = copy.selectOutcome;
      return;
    }

    els.submit.disabled = true;
    els.submit.textContent = copy.submitting;
    els.formError.textContent = '';

    const payload = {
      token,
      outcome: selectedOutcome,
      rating: selectedRating,
      comment: els.comment.value.trim(),
      quoted_price: els.quoted.value.trim(),
      paid_price: els.paid.value.trim(),
      language: lang,
    };

    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify(payload),
      });
      let data = await res.json();
      if (!res.ok || !data.ok) {
        const fallback = await fetch('/api/transport/passenger-care', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify(payload),
        });
        data = await fallback.json();
        if (!fallback.ok || !data.ok) throw new Error('submit failed');
      }
      if (data.already_submitted) {
        show('lockedView');
        return;
      }
      show('thanksView');
    } catch {
      els.formError.textContent = lang === 'en' ? 'Could not send feedback. Please try again.' : 'تعذر إرسال الملاحظة. يرجى المحاولة مرة أخرى.';
      els.submit.disabled = false;
      els.submit.textContent = copy.submit;
    }
  }

  applyStaticCopy();
  renderOptions();
  renderRating();
  setupCarePresence();
  els.submit.addEventListener('click', submitFeedback);
  loadBooking();
})();
