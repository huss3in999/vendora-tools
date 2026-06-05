(function () {
  const root = document.documentElement;
  const lang = (root.getAttribute('lang') || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  const copy = lang === 'en' ? {
    loading: 'Loading your booking…',
    invalid: 'This booking reference is not valid. Please check the link from your WhatsApp message.',
    lockedTitle: 'Feedback already submitted',
    lockedBody: 'Thank you. Feedback for this booking reference has already been received.',
    thanksTitle: 'Thank you',
    thanksBody: 'Thank you for helping GCC Transport improve passenger care and service quality.',
    thanksFooter: 'For the best support and follow-up, we recommend making future bookings through the official GCC Transport website.',
    route: 'Route',
    submit: 'Submit feedback',
    submitting: 'Sending…',
    selectOutcome: 'Please choose what happened with your booking.',
    optional: 'Optional details',
    rating: 'Service rating',
    comment: 'Comment',
    quoted: 'Quoted price (optional)',
    paid: 'Paid price (optional)',
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
    lockedTitle: 'تم إرسال الملاحظة مسبقاً',
    lockedBody: 'شكراً لك. تم استلام ملاحظتك لهذا رقم الحجز مسبقاً.',
    thanksTitle: 'شكراً لك',
    thanksBody: 'شكراً لمساعدتك في تحسين رعاية المسافرين وجودة الخدمة في GCC Transport.',
    thanksFooter: 'للحصول على أفضل دعم ومتابعة، نوصي بأن تكون الحجوزات القادمة من خلال الموقع الرسمي لـ GCC Transport.',
    route: 'المسار',
    submit: 'إرسال الملاحظة',
    submitting: 'جاري الإرسال…',
    selectOutcome: 'يرجى اختيار ما حدث مع طلب الحجز.',
    optional: 'تفاصيل اختيارية',
    rating: 'تقييم الخدمة',
    comment: 'ملاحظة',
    quoted: 'السعر المعروض (اختياري)',
    paid: 'السعر المدفوع (اختياري)',
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
    thanksFooter: document.getElementById('thanksFooter'),
    lockedBody: document.getElementById('lockedBody'),
    errorBody: document.getElementById('errorBody'),
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

  async function fetchBooking(refValue) {
    const endpoints = [
      `${apiBase}?ref=${encodeURIComponent(refValue)}`,
      `/api/transport/passenger-care?ref=${encodeURIComponent(refValue)}`,
    ];
    for (let i = 0; i < endpoints.length; i += 1) {
      try {
        const res = await fetch(endpoints[i], { credentials: 'omit' });
        const data = await res.json();
        if (res.ok && data.ok) return data;
        if (res.status === 404) return { ok: false, notFound: true };
      } catch {
        // try next endpoint
      }
    }
    return null;
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
    els.optionalSummary.textContent = copy.optional;
    document.getElementById('ratingLabel').textContent = copy.rating;
    document.getElementById('commentLabel').textContent = copy.comment;
    document.getElementById('quotedLabel').textContent = copy.quoted;
    document.getElementById('paidLabel').textContent = copy.paid;
    els.submit.textContent = copy.submit;
    els.thanksBody.textContent = copy.thanksBody;
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
      if (!data || !data.ok) {
        els.errorBody.textContent = copy.invalid;
        show('errorView');
        return;
      }

      els.refLabel.textContent = data.booking_ref;
      if (data.route_label) {
        els.routeLabel.textContent = `${copy.route}: ${data.route_label}`;
        els.routeLabel.classList.remove('hidden');
      }

      if (data.already_submitted) {
        show('lockedView');
        return;
      }

      show('formView');
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

    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          ref,
          outcome: selectedOutcome,
          rating: selectedRating,
          comment: els.comment.value.trim(),
          quoted_price: els.quoted.value.trim(),
          paid_price: els.paid.value.trim(),
          language: lang,
        }),
      });
      let data = await res.json();
      if (!res.ok || !data.ok) {
        const fallback = await fetch('/api/transport/passenger-care', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify({
            ref,
            outcome: selectedOutcome,
            rating: selectedRating,
            comment: els.comment.value.trim(),
            quoted_price: els.quoted.value.trim(),
            paid_price: els.paid.value.trim(),
            language: lang,
          }),
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
  els.submit.addEventListener('click', submitFeedback);
  loadBooking();
})();
