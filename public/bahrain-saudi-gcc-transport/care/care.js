(function () {
  const root = document.documentElement;
  const lang = (root.getAttribute('lang') || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  const copy = lang === 'en' ? {
    loading: 'Loading your booking…',
    invalid: 'This booking reference is not valid. Please check the link from your WhatsApp message.',
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
      completed: 'تمت الرحلة',
      cancelled: 'تم إلغاء الحجز',
      no_driver: 'لم يتوفر سائق',
      no_response: 'لم يتم الرد',
      price_high: 'السعر كان مرتفع',
      other_transport: 'تم اختيار وسيلة نقل أخرى',
    },
  };

  const params = new URLSearchParams(window.location.search);
  const ref = (params.get('ref') || '').trim().toUpperCase();
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

  async function fetchBooking(refValue) {
    const endpoints = [
      `${apiBase}?ref=${encodeURIComponent(refValue)}`,
      `/api/transport/passenger-care?ref=${encodeURIComponent(refValue)}`,
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
      `<button type="button" class="option-btn" data-outcome="${value}">${label}</button>`
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
    if (!/^GCC-[A-F0-9]{8}$/.test(ref)) {
      els.errorBody.textContent = copy.invalid;
      show('errorView');
      return;
    }

    try {
      const data = await fetchBooking(ref);
      if (data && data.ok) {
        if (data.already_submitted) {
          show('lockedView');
          return;
        }
        showFormForRef(data.booking_ref || ref, data.route_label || '');
        return;
      }

      showFormForRef(ref, '');
    } catch {
      showFormForRef(ref, '');
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
      ref,
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
