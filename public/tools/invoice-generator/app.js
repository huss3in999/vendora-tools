// invoice-generator runtime

    /* --- CONSTANTS & STATE --- */
    const DRAFT_KEY = 'v_inv_draft';
    const LIB_KEYS = { company: 'v_lib_comp', customer: 'v_lib_cust', item: 'v_lib_item', invoice: 'v_lib_invoice' };
    
    let state = {
      items: [{ id: genId(), name: '', desc: '', qty: 1, price: 0, tax: 0, disc: 0 }],
      logoDataUrl: '', stampDataUrl: '', currencySym: '$', billHeadingColor: '#00d084', exampleIndex: 0
    };

    const invoiceExamples = [
      {
        company: { name: 'Northline Creative Studio', details: 'Maya Hassan\naccounts@northline.studio\n+973 3900 1122\nBuilding 85, Road 3803, Manama, Bahrain', tax: 'VAT-449201' },
        invoice: { docType: 'INVOICE', ref: 'PO-7841', terms: 'Net 7', dueDays: 7 },
        customer: {
          name: 'Al Reef Trading',
          details: 'Faisal Ahmed\nfinance@alreeftrading.com\n+966 55 222 8899\nKing Fahd Road, Riyadh, Saudi Arabia',
          ship: 'Al Reef Trading Warehouse\nGate 4, Riyadh Industrial City',
          company: 'Al Reef Trading',
          person: 'Faisal Ahmed',
          email: 'finance@alreeftrading.com',
          phone: '+966 55 222 8899',
          address: 'King Fahd Road, Riyadh, Saudi Arabia',
          tax: 'TRN-552199'
        },
        payment: {
          notes: 'Thank you for your business. Please contact us if any line needs adjusting.',
          info: 'Bank: National Bank of Bahrain\nAccount Name: Northline Creative Studio\nIBAN: BH67BMAG00001299123456',
          terms: 'Payment is due within 7 days. Late payments may be subject to additional charges.',
          signature: 'Maya Hassan',
          bank: 'National Bank of Bahrain',
          account: 'Northline Creative Studio',
          iban: 'BH67BMAG00001299123456',
          accountNo: '001299123456',
          note: 'Please include the invoice number in the transfer reference.'
        },
        totals: { ship: '35', adj: '10', paid: '0' },
        items: [
          { name: 'Brand identity package', code: 'BND-01', desc: 'Logo refinement, color system, and social kit', qty: 1, price: 850, tax: 10, disc: 0 },
          { name: 'Landing page design', code: 'WEB-21', desc: 'Custom campaign landing page design', qty: 1, price: 620, tax: 10, disc: 5 },
          { name: 'Launch campaign graphics', code: 'SOC-14', desc: 'Instagram, story, and ad creative set', qty: 3, price: 120, tax: 10, disc: 0 }
        ]
      },
      {
        company: { name: 'Atlas Industrial Supply', details: 'Rashid Al Khatib\nsales@atlasindustrial.ae\n+971 4 555 1020\nWarehouse 12, Al Quoz, Dubai, UAE', tax: 'TRN-77822014' },
        invoice: { docType: 'INVOICE', ref: 'PO-5568', terms: 'Net 14', dueDays: 14 },
        customer: {
          name: 'Gulf Marine Services',
          details: 'Procurement Department\norders@gulfmarine.sa\n+966 13 887 4100\nJubail Port Area, Saudi Arabia',
          ship: 'Receiving Bay 3\nJubail Port Area, Saudi Arabia',
          company: 'Gulf Marine Services',
          person: 'Procurement Department',
          email: 'orders@gulfmarine.sa',
          phone: '+966 13 887 4100',
          address: 'Jubail Port Area, Saudi Arabia',
          tax: 'VAT-803301'
        },
        payment: {
          notes: 'Material supplied as requested. Inspect on delivery and report shortages within 48 hours.',
          info: 'Bank: Emirates NBD\nAccount Name: Atlas Industrial Supply\nIBAN: AE070331234567890123456',
          terms: 'Ownership remains with the seller until full payment is received.',
          signature: 'Rashid Al Khatib',
          bank: 'Emirates NBD',
          account: 'Atlas Industrial Supply',
          iban: 'AE070331234567890123456',
          accountNo: '033123456789',
          note: 'Use the PO number in your transfer note.'
        },
        totals: { ship: '120', adj: '0', paid: '650' },
        items: [
          { name: 'Marine-grade hose assembly', code: 'MHA-220', desc: '2-inch reinforced hose assembly with fittings', qty: 8, price: 145, tax: 15, disc: 0 },
          { name: 'Pressure gauge set', code: 'PGS-18', desc: 'Stainless steel gauge set for dock maintenance', qty: 4, price: 96, tax: 15, disc: 3 },
          { name: 'Safety valve kit', code: 'SVK-77', desc: 'Replacement safety valve kit with seals and guide sheet', qty: 6, price: 58, tax: 15, disc: 0 }
        ]
      },
      {
        company: { name: 'Blue Peak Advisory', details: 'Sara Mitchell\nbilling@bluepeakadvisory.co.uk\n+44 20 7946 0810\n12 Holborn Square, London, UK', tax: 'GB-22988114' },
        invoice: { docType: 'QUOTE', ref: 'Q-2026-114', terms: 'Valid for 14 days', dueDays: 14 },
        customer: {
          name: 'Evergreen Wellness Group',
          details: 'Nadia Khan\nops@evergreenwellness.com\n+971 52 001 4488\nJumeirah Lake Towers, Dubai, UAE',
          ship: '',
          company: 'Evergreen Wellness Group',
          person: 'Nadia Khan',
          email: 'ops@evergreenwellness.com',
          phone: '+971 52 001 4488',
          address: 'Jumeirah Lake Towers, Dubai, UAE',
          tax: 'TRN-909115'
        },
        payment: {
          notes: 'This quote covers strategy, planning, and launch support for the first campaign cycle.',
          info: 'Payment schedule available on approval.',
          terms: 'Pricing is valid for 14 days from the issue date.',
          signature: 'Sara Mitchell',
          bank: 'HSBC UK',
          account: 'Blue Peak Advisory',
          iban: 'GB29NWBK60161331926819',
          accountNo: '31926819',
          note: 'A deposit invoice will be issued once approved.'
        },
        totals: { ship: '0', adj: '0', paid: '0' },
        items: [
          { name: 'Market entry workshop', code: 'CONS-01', desc: 'Discovery workshop with stakeholder summary and action plan', qty: 1, price: 900, tax: 0, disc: 0 },
          { name: 'Campaign rollout roadmap', code: 'CONS-11', desc: 'Detailed 6-week launch roadmap with KPI framework', qty: 1, price: 1250, tax: 0, disc: 0 },
          { name: 'Launch support retainer', code: 'CONS-21', desc: 'Hands-on campaign support for the first month', qty: 1, price: 780, tax: 0, disc: 0 }
        ]
      },
      {
        company: { name: 'Luma Home Bakery', details: 'Luma Kareem\nhello@lumabakery.com\n+965 6001 8877\nSalmiya Block 7, Kuwait', tax: 'CR-188201' },
        invoice: { docType: 'INVOICE', ref: 'EV-2209', terms: 'Due on receipt', dueDays: 0 },
        customer: {
          name: 'Noor Events Co.',
          details: 'Event Team\nbookings@noorevents.com\n+965 5110 3300\nKuwait City, Kuwait',
          ship: 'Wedding venue loading dock\nMessilah Beach Road, Kuwait',
          company: 'Noor Events Co.',
          person: 'Event Team',
          email: 'bookings@noorevents.com',
          phone: '+965 5110 3300',
          address: 'Kuwait City, Kuwait',
          tax: 'CR-552991'
        },
        payment: {
          notes: 'Fresh items prepared for same-day event delivery. Final quantities confirmed 24 hours before dispatch.',
          info: 'Bank: Kuwait Finance House\nAccount Name: Luma Home Bakery\nIBAN: KW81CBKU0000000000001234560101',
          terms: 'Custom event orders are non-refundable once production begins.',
          signature: 'Luma Kareem',
          bank: 'Kuwait Finance House',
          account: 'Luma Home Bakery',
          iban: 'KW81CBKU0000000000001234560101',
          accountNo: '1234560101',
          note: 'Cash on delivery is available for local orders.'
        },
        totals: { ship: '18', adj: '-5', paid: '150' },
        items: [
          { name: 'Dessert table setup', code: 'EVT-01', desc: 'Mini cakes, macarons, and styling setup', qty: 1, price: 220, tax: 0, disc: 5 },
          { name: 'Custom cupcake tray', code: 'EVT-14', desc: '60 branded cupcakes with themed toppers', qty: 2, price: 48, tax: 0, disc: 0 },
          { name: 'Fresh juice corner', code: 'EVT-22', desc: 'Seasonal juice station for 40 guests', qty: 1, price: 95, tax: 0, disc: 0 }
        ]
      }
    ];

    const worldCurrencies = [
      { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' }, { code: 'INR', symbol: '₹' },
      { code: 'AED', symbol: 'AED' }, { code: 'SAR', symbol: 'SAR' }, { code: 'BHD', symbol: 'BD' }, { code: 'KWD', symbol: 'KD' },
      { code: 'QAR', symbol: 'QR' }, { code: 'OMR', symbol: 'OMR' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
      { code: 'SGD', symbol: 'S$' }, { code: 'JPY', symbol: '¥' }, { code: 'CNY', symbol: '¥' }, { code: 'ZAR', symbol: 'R' },
      { code: 'CUSTOM', symbol: '' }
    ];

    /* --- UTILS --- */
    function genId() { return Math.random().toString(36).substr(2, 9); }
    function el(id) { return document.getElementById(id); }
    /** Get/set control value; missing elements are skipped (no throw) so drafts/previews stay safe. */
    function val(id, v) {
      const node = el(id);
      if (!node) {
        if (v !== undefined) return;
        return '';
      }
      if (v !== undefined) node.value = v;
      return node.value;
    }
    function showToast(msg) {
      const t = el('toast'); t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    }
    function formatMoney(num) { return state.currencySym + ' ' + parseFloat(num || 0).toFixed(2); }
    /** Parse currency fields from inputs (commas, spaces, empty). */
    function parseMoneyInput(raw) {
      if (raw === null || raw === undefined) return 0;
      let s = String(raw).trim().replace(/\s/g, '');
      if (s === '') return 0;
      if (!s.includes('.') && /^\d+,\d+$/.test(s)) s = s.replace(',', '.');
      else s = s.replace(/,/g, '');
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    }
    /** Read money from invoice/control inputs (avoids type=number invalid/empty .value quirks). */
    function readMoneyInputEl(inp) {
      if (!inp) return 0;
      if (inp.type === 'number' && inp.value !== '') {
        const n = inp.valueAsNumber;
        if (!Number.isNaN(n)) return n;
      }
      return parseMoneyInput(inp.value);
    }
    function moneyToCents(n) { return Math.round((Number(n) + Number.EPSILON) * 100); }
    function nearlyEqualMoney(a, b) { return Math.abs(moneyToCents(a) - moneyToCents(b)) < 1; }
    function autoResize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
    function escapeHTML(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function hexToRgba(hex, alpha) {
      const safe = String(hex || '').replace('#', '').trim();
      if (safe.length !== 6) return `rgba(0, 208, 132, ${alpha})`;
      const int = parseInt(safe, 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /* --- UI TOGGLES --- */
    function toggleMenu(menuId) {
      const m = el(menuId);
      document.querySelectorAll('.mega-menu').forEach(x => { if(x.id !== menuId) x.classList.remove('active'); });
      m.classList.toggle('active');
      const anyOpen = Array.from(document.querySelectorAll('.mega-menu')).some(x => x.classList.contains('active'));
      document.querySelector('.editor-container').classList.toggle('drawer-open', anyOpen && window.innerWidth > 850);
    }
    function toggleVis(id, show) {
      const e = el(id); if(show) e.classList.remove('hide-section'); else e.classList.add('hide-section');
      schedulePageEstimate();
      autoSave();
    }
    function toggleCol(cls, show) {
      document.querySelectorAll('.'+cls).forEach(e => {
        if(show) e.classList.remove('hide-section'); else e.classList.add('hide-section');
      });
      schedulePageEstimate();
      autoSave();
    }
    function rebalanceLayout() {
      const header = document.querySelector('.inv-header');
      const logoVisible = !el('logo-media').classList.contains('hide-section');
      header.style.gridTemplateColumns = logoVisible ? '1fr max-content' : '1.1fr 0.9fr';
      
      const billingRow = el('billingRow');
      if (billingRow) {
        billingRow.style.gridTemplateColumns = !el('ship-box').classList.contains('hide-section')
          ? 'minmax(0, 1fr) minmax(0, 1fr)'
          : 'minmax(0, 1fr)';
      }

      const notesVisible = !el('notes-box').classList.contains('hide-section');
      const payVisible = !el('payment-box').classList.contains('hide-section');
      const termsVisible = !el('terms-box').classList.contains('hide-section');
      const visibleFooterCount = [notesVisible, payVisible, termsVisible].filter(Boolean).length;
      
      const footer = document.querySelector('.inv-footer');
      if (visibleFooterCount === 0) {
        footer.style.display = 'none';
      } else {
        footer.style.display = 'grid';
        footer.style.gridTemplateColumns = visibleFooterCount > 1 ? '1fr 1fr' : '1fr';
      }
    }
    function applyTheme() {
      const paper = el('invoicePaper');
      paper.className = 'invoice-paper ' + val('themeSelect');
    }
    function applyPageFit() {
      const mode = val('pageFitSelect') || 'auto';
      const paper = el('invoicePaper');
      const spacing = {
        auto: { pagePad:'55px', headerGap:'20px', headerMb:'25px', billingGap:'30px', billingMb:'25px', itemRowPy:'8px', totalsMt:'16px', footerMt:'40px', footerGap:'30px', signatureMt:'30px', pdfPadY:'40px', pdfPadX:'44px', pdfHeaderMb:'32px', pdfBillingGap:'26px', pdfBillingMb:'22px', pdfItemRowPy:'7px', pdfTotalsMt:'14px', pdfFooterMt:'30px', pdfFooterGap:'26px', pdfSignatureMt:'24px' },
        balanced: { pagePad:'52px', headerGap:'18px', headerMb:'22px', billingGap:'26px', billingMb:'22px', itemRowPy:'7px', totalsMt:'14px', footerMt:'32px', footerGap:'24px', signatureMt:'24px', pdfPadY:'36px', pdfPadX:'40px', pdfHeaderMb:'28px', pdfBillingGap:'24px', pdfBillingMb:'20px', pdfItemRowPy:'6px', pdfTotalsMt:'12px', pdfFooterMt:'24px', pdfFooterGap:'22px', pdfSignatureMt:'20px' },
        compact: { pagePad:'48px', headerGap:'16px', headerMb:'18px', billingGap:'22px', billingMb:'18px', itemRowPy:'6px', totalsMt:'10px', footerMt:'24px', footerGap:'20px', signatureMt:'18px', pdfPadY:'32px', pdfPadX:'36px', pdfHeaderMb:'22px', pdfBillingGap:'20px', pdfBillingMb:'16px', pdfItemRowPy:'5px', pdfTotalsMt:'10px', pdfFooterMt:'18px', pdfFooterGap:'18px', pdfSignatureMt:'16px' },
        onepage: { pagePad:'42px', headerGap:'14px', headerMb:'14px', billingGap:'18px', billingMb:'14px', itemRowPy:'4px', totalsMt:'8px', footerMt:'16px', footerGap:'14px', signatureMt:'12px', pdfPadY:'26px', pdfPadX:'30px', pdfHeaderMb:'18px', pdfBillingGap:'16px', pdfBillingMb:'12px', pdfItemRowPy:'4px', pdfTotalsMt:'8px', pdfFooterMt:'14px', pdfFooterGap:'14px', pdfSignatureMt:'12px' }
      }[mode] || {
        pagePad:'55px', headerGap:'20px', headerMb:'25px', billingGap:'30px', billingMb:'25px', itemRowPy:'8px', totalsMt:'16px', footerMt:'40px', footerGap:'30px', signatureMt:'30px', pdfPadY:'40px', pdfPadX:'44px', pdfHeaderMb:'32px', pdfBillingGap:'26px', pdfBillingMb:'22px', pdfItemRowPy:'7px', pdfTotalsMt:'14px', pdfFooterMt:'30px', pdfFooterGap:'26px', pdfSignatureMt:'24px'
      };
      paper.style.setProperty('--page-pad', spacing.pagePad);
      paper.style.setProperty('--header-gap', spacing.headerGap);
      paper.style.setProperty('--header-mb', spacing.headerMb);
      paper.style.setProperty('--billing-gap', spacing.billingGap);
      paper.style.setProperty('--billing-mb', spacing.billingMb);
      paper.style.setProperty('--item-row-py', spacing.itemRowPy);
      paper.style.setProperty('--totals-mt', spacing.totalsMt);
      paper.style.setProperty('--footer-mt', spacing.footerMt);
      paper.style.setProperty('--footer-gap', spacing.footerGap);
      paper.style.setProperty('--signature-mt', spacing.signatureMt);
      paper.style.setProperty('--pdf-pad-y', spacing.pdfPadY);
      paper.style.setProperty('--pdf-pad-x', spacing.pdfPadX);
      paper.style.setProperty('--pdf-header-mb', spacing.pdfHeaderMb);
      paper.style.setProperty('--pdf-billing-gap', spacing.pdfBillingGap);
      paper.style.setProperty('--pdf-billing-mb', spacing.pdfBillingMb);
      paper.style.setProperty('--pdf-item-row-py', spacing.pdfItemRowPy);
      paper.style.setProperty('--pdf-totals-mt', spacing.pdfTotalsMt);
      paper.style.setProperty('--pdf-footer-mt', spacing.pdfFooterMt);
      paper.style.setProperty('--pdf-footer-gap', spacing.pdfFooterGap);
      paper.style.setProperty('--pdf-signature-mt', spacing.pdfSignatureMt);
      requestAnimationFrame(() => { rebalanceLayout(); schedulePageEstimate(); });
    }
    function applyContentDensity() {
      const mode = val('contentDensitySelect') || 'normal';
      const paper = el('invoicePaper');
      const density = {
        normal: { body:'0.85rem', itemName:'0.95rem', itemDesc:'0.85rem', footer:'0.8rem' },
        tight: { body:'0.81rem', itemName:'0.9rem', itemDesc:'0.8rem', footer:'0.76rem' },
        tighter: { body:'0.78rem', itemName:'0.86rem', itemDesc:'0.76rem', footer:'0.73rem' }
      }[mode] || { body:'0.85rem', itemName:'0.95rem', itemDesc:'0.85rem', footer:'0.8rem' };
      paper.style.setProperty('--body-copy-size', density.body);
      paper.style.setProperty('--item-name-size', density.itemName);
      paper.style.setProperty('--item-desc-size', density.itemDesc);
      paper.style.setProperty('--footer-copy-size', density.footer);
      requestAnimationFrame(() => { renderItems(); syncControlPanel(); schedulePageEstimate(); });
    }
    function updatePageEstimate() {
      const estimateNode = el('pageEstimateText');
      const hintNode = el('pageEstimateHint');
      if (!estimateNode) return;
      const clone = buildPdfClone();
      const pageHeight = (clone.offsetWidth || 800) * 1.414;
      const ratio = clone.scrollHeight / pageHeight;
      const estimatedPages = Math.max(1, Math.ceil(ratio - 0.01));
      cleanupPrintClone();
      if (estimatedPages <= 1 || ratio <= 1.005) {
        estimateNode.textContent = 'Fits on 1 page';
        estimateNode.style.color = '#86efac';
        if (hintNode) hintNode.textContent = 'Looks good for email and print. PDF should stay on one clean page.';
      } else if (ratio <= 1.08) {
        estimateNode.textContent = 'Very close to 1 page';
        estimateNode.style.color = '#fde68a';
        const suggestions = [];
        if (val('pageFitSelect') !== 'onepage') suggestions.push('try Page Fit: One-Page First');
        if (val('contentDensitySelect') !== 'tighter') suggestions.push('set Content Density to Tighter');
        if (!el('signature-box').classList.contains('hide-section')) suggestions.push('hide Signature/Stamp if not needed');
        if (hintNode) hintNode.textContent = `Almost there - ${suggestions.slice(0, 2).join(' or ')}.`;
      } else {
        estimateNode.textContent = `Likely ${estimatedPages} pages`;
        estimateNode.style.color = '#fbbf24';
        const suggestions = [];
        if (val('pageFitSelect') !== 'onepage') suggestions.push('Page Fit: One-Page First');
        if (val('contentDensitySelect') !== 'tighter') suggestions.push('Content Density: Tighter');
        if (!el('notes-box').classList.contains('hide-section')) suggestions.push('hide Notes');
        if (!el('payment-box').classList.contains('hide-section')) suggestions.push('hide Payment Details');
        if (!el('terms-box').classList.contains('hide-section')) suggestions.push('hide Terms');
        if (!el('signature-box').classList.contains('hide-section')) suggestions.push('hide Signature/Stamp');
        if (hintNode) hintNode.textContent = `To reduce pages, try ${suggestions.slice(0, 3).join(', ')}.`;
      }
    }
    function schedulePageEstimate() {
      if (pageEstimateFrame) return;
      pageEstimateFrame = requestAnimationFrame(() => {
        pageEstimateFrame = null;
        updatePageEstimate();
      });
    }
    function updateSeparatePreviews() {
      const set = (previewId, ctrlId, fmt) => {
        const p = el(previewId);
        const c = el(ctrlId);
        if (!p) return;
        const raw = c ? c.value : '';
        p.textContent = fmt ? fmt(raw) : raw;
      };
      set('custCompanyPreview', 'ctrlCustCompanyField');
      set('custPersonPreview', 'ctrlCustPersonField');
      set('custEmailPreview', 'ctrlCustEmailField');
      set('custPhonePreview', 'ctrlCustPhoneField');
      set('custAddressPreview', 'ctrlCustAddressField');
      set('custTaxPreview', 'ctrlCustTaxField', (v) => (v ? 'Tax: ' + v : ''));
      set('bankNamePreview', 'ctrlBankName');
      set('accountNamePreview', 'ctrlAccountName');
      set('ibanPreview', 'ctrlIbanField', (v) => (v ? 'IBAN: ' + v : ''));
      set('accountNoPreview', 'ctrlAccountNoField', (v) => (v ? 'Account: ' + v : ''));
      set('paymentNotePreview', 'ctrlPaymentNoteField');
    }
    function applySectionModes() {
      const customerMode = val('customerMode');
      const paymentMode = val('paymentMode');
      toggleVis('custDetails', customerMode === 'combined');
      toggleVis('custSeparatePreview', customerMode === 'separate');
      toggleVis('paymentInfo', paymentMode === 'combined');
      toggleVis('paymentSeparatePreview', paymentMode === 'separate');
      toggleVis('payment-box', paymentMode !== 'hidden' && el('tglPayment').checked);
      updateSeparatePreviews();
      rebalanceLayout();
    }
    function updateAccent() { el('accentBar').style.background = val('accentColorPicker'); autoSave(); }
    function updateBillHeadingColor() {
      state.billHeadingColor = val('billHeadingColorPicker') || '#00d084';
      el('invoicePaper').style.setProperty('--bill-heading', state.billHeadingColor);
      el('invoicePaper').style.setProperty('--bill-heading-border', hexToRgba(state.billHeadingColor, 0.22));
      autoSave();
    }
    function applyDuePreset() {
      const preset = val('duePreset'); if (preset === 'manual') return;
      const issue = val('invDate') || new Date().toISOString().slice(0, 10);
      const base = new Date(issue + 'T00:00:00'); base.setDate(base.getDate() + parseInt(preset, 10));
      const due = base.toISOString().slice(0, 10);
      val('invDue', due); val('ctrlInvDue', due);
      if (preset === '7') val('paymentTermsPaper', 'Net 7');
      if (preset === '14') val('paymentTermsPaper', 'Net 14');
      if (preset === '30') val('paymentTermsPaper', 'Net 30');
      if (preset === '60') val('paymentTermsPaper', 'Net 60');
      syncControlPanel(); scheduleTotalsUpdate(); autoSave();
    }

    function syncControlPanel() {
      const pairs = [
        ['ctrlDocType', 'docType'], ['ctrlInvNum', 'invNum'], ['ctrlInvRef', 'invRef'],
        ['ctrlInvDate', 'invDate'], ['ctrlInvDue', 'invDue'], ['ctrlTerms', 'paymentTermsPaper'],
        ['ctrlCompName', 'compName'], ['ctrlCompDetails', 'compDetails'], ['ctrlCompTax', 'compTax'],
        ['ctrlCustName', 'custName'], ['ctrlCustDetails', 'custDetails'], ['ctrlShipDetails', 'shipDetails'],
        ['ctrlShip', 'valShip'], ['ctrlAdj', 'valAdj'], ['ctrlPaid', 'valPaid'],
        ['ctrlNotes', 'notes'], ['ctrlPayment', 'paymentInfo'], ['ctrlTermsInfo', 'termsInfo'], ['ctrlSig', 'sigName']
      ];
      pairs.forEach(([ctrl, target]) => { if (el(ctrl) && el(target)) el(ctrl).value = el(target).value; });
      val('paymentTermsInput', val('paymentTermsPaper'));
      ['compName', 'compDetails', 'custName', 'custDetails', 'shipDetails', 'notes', 'paymentInfo', 'termsInfo'].forEach(id => {
        if (el(id) && el(id).classList.contains('auto-expand')) autoResize(el(id));
      });
      requestAnimationFrame(rebalanceLayout);
    }

    function bindControlPanel() {
      document.querySelectorAll('[data-target]').forEach(ctrl => {
        const targetId = ctrl.getAttribute('data-target');
        if (!targetId) return;
        const syncIntoInvoice = () => {
          const target = el(targetId);
          if (!target) return;
          target.value = ctrl.value;
          if (target.classList.contains('auto-expand')) autoResize(target);
          if (['valShip', 'valAdj', 'valPaid', 'invDue', 'docType'].includes(targetId)) scheduleTotalsUpdate();
          autoSave();
        };
        ctrl.addEventListener('input', syncIntoInvoice);
        ctrl.addEventListener('change', syncIntoInvoice);
      });
      ['ctrlCustCompanyField','ctrlCustPersonField','ctrlCustEmailField','ctrlCustPhoneField','ctrlCustAddressField','ctrlCustTaxField','ctrlBankName','ctrlAccountName','ctrlIbanField','ctrlAccountNoField','ctrlPaymentNoteField'].forEach(id => {
        if (el(id)) el(id).addEventListener('input', () => { updateSeparatePreviews(); autoSave(); });
      });
    }

    function applyBulkValue(type) {
      const raw = type === 'tax' ? val('bulkTax') : val('bulkDisc');
      const parsed = parseFloat(raw);
      if (isNaN(parsed)) return showToast('Enter a valid number first');
      state.items = state.items.map(item => ({ ...item, [type]: parsed }));
      renderItems(); autoSave();
      showToast(type === 'tax' ? 'Tax applied to all items' : 'Discount applied to all items');
    }

    /* --- CURRENCY --- */
    function initCurrencies() {
      const sel = el('currencySelect');
      worldCurrencies.forEach(c => {
        const opt = document.createElement('option'); opt.value = c.code; opt.textContent = `${c.code} (${c.symbol})`; sel.appendChild(opt);
      });
    }
    function handleCurrencyChange() {
      const code = val('currencySelect');
      if(code === 'CUSTOM') { el('customCurrencyGroup').style.display = 'block'; state.currencySym = val('customCurrency') || ''; }
      else { el('customCurrencyGroup').style.display = 'none'; state.currencySym = worldCurrencies.find(c => c.code === code)?.symbol || '$'; }
      updateTotals(); autoSave();
    }

    /* --- DYNAMIC LINE ITEMS --- */
    let renderFrame = null; let panelSyncFrame = null; let pageEstimateFrame = null; let saveTimer = null;

    function lineAmount(item) {
      const base = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
      const tax = base * ((parseFloat(item.tax) || 0) / 100);
      const disc = base * ((parseFloat(item.disc) || 0) / 100);
      return base + tax - disc;
    }

    function renderItems() {
      const container = el('itemsContainer');
      const frag = document.createDocumentFragment();
      const taxVisible = el('tglColTax').checked;
      const discVisible = el('tglColDisc').checked;
      const codeVisible = el('tglItemCode') ? el('tglItemCode').checked : true;
      const descVisible = el('tglItemDesc') ? el('tglItemDesc').checked : true;

      state.items.forEach(itm => {
        const row = document.createElement('div');
        row.className = 'item-row'; row.dataset.id = itm.id;
        row.innerHTML = `
          <div>
            <input type="text" class="seamless-input item-name" placeholder="Item Name" value="${escapeHTML(itm.name)}" oninput="updItm('${itm.id}','name',this.value)" style="font-size: 0.95rem; color: var(--ink-dark);">
            <input type="text" class="seamless-input meta-note hide-on-pdf ${codeVisible ? '' : 'hide-section'}" placeholder="Optional SKU / Code" value="${escapeHTML(itm.code || '')}" oninput="updItm('${itm.id}','code',this.value)" style="font-size: 0.75rem; color: var(--ink-light);">
            <textarea class="seamless-input item-desc auto-expand ${descVisible ? '' : 'hide-section'}" placeholder="Description" rows="1" oninput="updItm('${itm.id}','desc',this.value); autoResize(this);" style="font-size: 0.8rem; color: var(--ink-muted); min-height: 1.4em;">${escapeHTML(itm.desc)}</textarea>
          </div>
          <div><input type="number" class="seamless-input" style="text-align:right" value="${itm.qty}" oninput="updItm('${itm.id}','qty',this.value)"></div>
          <div><input type="number" class="seamless-input" style="text-align:right" value="${itm.price}" oninput="updItm('${itm.id}','price',this.value)"></div>
          <div class="col-tax ${taxVisible ? '' : 'hide-section'}"><input type="number" class="seamless-input" style="text-align:right" value="${itm.tax}" oninput="updItm('${itm.id}','tax',this.value)"></div>
          <div class="col-disc ${discVisible ? '' : 'hide-section'}"><input type="number" class="seamless-input" style="text-align:right" value="${itm.disc}" oninput="updItm('${itm.id}','disc',this.value)"></div>
          <div class="amount-cell" data-role="amount">${formatMoney(lineAmount(itm))}</div>
          <div class="hide-on-pdf"><button class="row-del-btn" onclick="delItm('${itm.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button></div>
        `;
        frag.appendChild(row);
      });

      container.replaceChildren(frag);
      container.querySelectorAll('.auto-expand').forEach(autoResize);
      scheduleTotalsUpdate();
      schedulePageEstimate();
    }

    function updateItemAmountCell(id) {
      const row = document.querySelector(`.item-row[data-id="${id}"]`); const item = state.items.find(x => x.id === id);
      if(!row || !item) return; const cell = row.querySelector('[data-role="amount"]');
      if(cell) cell.textContent = formatMoney(lineAmount(item));
    }

    /** Totals update immediately on every edit (spreadsheet-like). */
    function scheduleTotalsUpdate() {
      updateTotals();
    }
    function schedulePanelSync() { if(panelSyncFrame) return; panelSyncFrame = requestAnimationFrame(() => { panelSyncFrame = null; syncControlPanel(); }); }
    function scheduleItemsRender() { if(renderFrame) return; renderFrame = requestAnimationFrame(() => { renderFrame = null; renderItems(); }); }

    function updItm(id, f, v) {
      const item = state.items.find(x => x.id === id); if(!item) return;
      item[f] = ['qty','price','tax','disc'].includes(f) ? (parseFloat(v) || 0) : v;
      if(['qty','price','tax','disc'].includes(f)) { updateItemAmountCell(id); scheduleTotalsUpdate(); }
      autoSave();
    }
    function addItemRow() { state.items.push({ id: genId(), name: '', desc: '', qty: 1, price: 0, tax: 0, disc: 0 }); scheduleItemsRender(); autoSave(); }
    function delItm(id) { 
      state.items = state.items.filter(x => x.id !== id); 
      if(!state.items.length) state.items.push({ id: genId(), name: '', desc: '', qty: 1, price: 0, tax: 0, disc: 0 });
      scheduleItemsRender(); autoSave(); 
    }

    /* --- MATH & TOTALS --- */
    function updateTotals() {
      let sub = 0; let taxTot = 0; let discTot = 0;
      for (let idx = 0; idx < state.items.length; idx += 1) {
        const item = state.items[idx];
        const base = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
        const tax = base * ((parseFloat(item.tax) || 0) / 100);
        const disc = base * ((parseFloat(item.disc) || 0) / 100);
        sub += base; taxTot += tax; discTot += disc;
      }
      const ship = readMoneyInputEl(el('valShip'));
      const adj = readMoneyInputEl(el('valAdj'));
      const paid = readMoneyInputEl(el('valPaid'));
      let grand = sub + taxTot + ship + adj - discTot;
      grand = moneyToCents(grand) / 100;

      const roundMode = val('roundSelect') || 'none';
      if (roundMode === 'up') grand = Math.ceil(grand * 100 - 1e-9) / 100;
      else if (roundMode === 'down') grand = Math.floor(grand * 100 + 1e-9) / 100;

      const bal = moneyToCents(grand - paid) / 100;

      function revealTotalRowIfNeeded(rowId, toggleId, hasValue) {
        if (!hasValue) return;
        const row = el(rowId);
        if (!row || !row.classList.contains('hide-section')) return;
        if (el(toggleId)) el(toggleId).checked = true;
        toggleVis(rowId, true);
      }
      revealTotalRowIfNeeded('ship-row', 'tglShipRow', Math.abs(ship) > 0.0005);
      revealTotalRowIfNeeded('adj-row', 'tglAdjRow', Math.abs(adj) > 0.0005);
      if (Math.abs(paid) > 0.0005) {
        if (el('paid-row') && el('paid-row').classList.contains('hide-section')) {
          if (el('tglPaidRow')) el('tglPaidRow').checked = true;
          toggleVis('paid-row', true);
          toggleVis('paid-row-bal', true);
        }
      }

      el('lblSubtotal').textContent = formatMoney(sub);
      el('lblTax').textContent = formatMoney(taxTot);
      el('lblDisc').textContent = formatMoney(discTot);
      el('lblShip').textContent = formatMoney(ship);
      el('lblAdj').textContent = formatMoney(adj);
      el('lblTotal').textContent = formatMoney(grand);
      el('lblPaid').textContent = formatMoney(paid);

      const balLabel = document.querySelector('#paid-row-bal label strong');
      if (balLabel) {
        if (bal < 0) {
          balLabel.textContent = 'Credit Balance';
          el('lblBalance').textContent = formatMoney(Math.abs(bal));
        } else {
          balLabel.textContent = 'Balance Due';
          el('lblBalance').textContent = formatMoney(bal);
        }
      }

      const badge = el('statusBadge');
      const manualStatus = val('statusSelect') || 'auto';
      let status = 'DRAFT'; let statusClass = 'status-draft';
      const docType = (val('docType') || '').toUpperCase();
      const isQuote = docType.includes('QUOTE') || docType.includes('ESTIMATE') || docType.includes('PROFORMA');

      if (manualStatus !== 'auto') {
        const manualMap = {
          draft: ['DRAFT', 'status-draft'],
          sent: ['SENT', 'status-sent'],
          unpaid: ['UNPAID', 'status-unpaid'],
          partial: ['PARTIALLY PAID', 'status-partial'],
          paid: ['PAID', 'status-paid'],
          overdue: ['OVERDUE', 'status-overdue'],
          credit: ['CREDIT', 'status-credit']
        };
        [status, statusClass] = manualMap[manualStatus] || ['DRAFT', 'status-draft'];
      } else if (!isQuote && grand > 0) {
        let isOverdue = false; const dueStr = val('invDue');
        if (dueStr) {
          const due = new Date(dueStr + 'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0);
          if (due < today) isOverdue = true;
        }
        if (Math.abs(paid) < 0.0005) { status = isOverdue ? 'OVERDUE' : 'UNPAID'; statusClass = isOverdue ? 'status-overdue' : 'status-unpaid'; }
        else if (paid > 0 && paid < grand && !nearlyEqualMoney(paid, grand)) { status = isOverdue ? 'OVERDUE' : 'PARTIALLY PAID'; statusClass = isOverdue ? 'status-overdue' : 'status-partial'; }
        else if (nearlyEqualMoney(paid, grand)) { status = 'PAID'; statusClass = 'status-paid'; }
        else if (paid > grand) { status = 'CREDIT'; statusClass = 'status-credit'; }
      } else if (isQuote) {
        status = docType || 'DRAFT'; statusClass = 'status-draft';
      }
      badge.textContent = status; badge.className = `status-badge ${statusClass}`;
      schedulePageEstimate();
    }

    /* --- IMAGE COMPRESSION --- */
    function handleImageUpload(e, type) {
      const file = e.target.files[0]; if(!file) return;
      const r = new FileReader();
      r.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const cvs = document.createElement('canvas');
          let w = img.width, h = img.height, max = 400;
          if(w > max) { h = Math.round(h * max / w); w = max; }
          cvs.width = w; cvs.height = h;
          cvs.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = cvs.toDataURL('image/jpeg', 0.85);
          if(type === 'logo') { state.logoDataUrl = dataUrl; renderImg('logoImage', 'logoUploadLabel', dataUrl); }
          else { state.stampDataUrl = dataUrl; renderImg('stampImage', 'stampUploadLabel', dataUrl); }
          autoSave();
        };
        img.src = ev.target.result;
      };
      r.readAsDataURL(file);
    }

    function renderImg(imgId, lblId, src) {
      if(src) { el(imgId).src = src; el(imgId).style.display = 'block'; el(lblId).style.display = 'none'; }
      else { el(imgId).src = ''; el(imgId).style.display = 'none'; el(lblId).style.display = 'block'; }
      requestAnimationFrame(() => {
        if (el('compName')) autoResize(el('compName'));
        if (el('compDetails')) autoResize(el('compDetails'));
        rebalanceLayout();
        schedulePageEstimate();
      });
    }

    /* --- DRAFT STATE --- */
    function buildDraft() {
      const getC = id => el(id).checked;
      return {
        logo: state.logoDataUrl, stamp: state.stampDataUrl, items: state.items,
        compName: val('compName'), compDetails: val('compDetails'), compTax: val('compTax'),
        docType: val('docType'), invNum: val('invNum'), invDate: val('invDate'), invDue: val('invDue'), invRef: val('invRef'),
        paymentTermsPaper: val('paymentTermsPaper'),
        custName: val('custName'), custDetails: val('custDetails'), shipDetails: val('shipDetails'),
        custCompanyField: val('ctrlCustCompanyField'), custPersonField: val('ctrlCustPersonField'), custEmailField: val('ctrlCustEmailField'), custPhoneField: val('ctrlCustPhoneField'), custAddressField: val('ctrlCustAddressField'), custTaxField: val('ctrlCustTaxField'),
        valShip: val('valShip'), valAdj: val('valAdj'), valPaid: val('valPaid'),
        notes: val('notes'), paymentInfo: val('paymentInfo'), termsInfo: val('termsInfo'), sigName: val('sigName'),
        bankName: val('ctrlBankName'), accountName: val('ctrlAccountName'), ibanField: val('ctrlIbanField'), accountNoField: val('ctrlAccountNoField'), paymentNoteField: val('ctrlPaymentNoteField'),
        currencySelect: val('currencySelect'), customCurrency: val('customCurrency'), accentColor: val('accentColorPicker'), billHeadingColor: val('billHeadingColorPicker'),
        docTypeSelect: val('docTypeSelect'), paymentTermsInput: val('paymentTermsInput'), roundSelect: val('roundSelect'), statusSelect: val('statusSelect'), customerMode: val('customerMode'), paymentMode: val('paymentMode'), themeSelect: val('themeSelect'), pageFitSelect: val('pageFitSelect'), contentDensitySelect: val('contentDensitySelect'),
        toggles: {
          logo: getC('tglLogo'), taxNum: getC('tglTaxNum'), ship: getC('tglShip'),
          iCode: el('tglItemCode') ? getC('tglItemCode') : true, iDesc: el('tglItemDesc') ? getC('tglItemDesc') : true,
          cTax: getC('tglColTax'), cDisc: getC('tglColDisc'), sig: getC('tglSig'),
          rShip: getC('tglShipRow'), rAdj: getC('tglAdjRow'), rPaid: getC('tglPaidRow'),
          notes: getC('tglNotes'), payment: getC('tglPayment'), terms: getC('tglTerms')
        }
      };
    }

    function autoSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraft())); }, 180); }

    function loadDraft() {
      const dStr = localStorage.getItem(DRAFT_KEY);
      if(dStr) {
        const d = JSON.parse(dStr);
        state.logoDataUrl = d.logo||''; state.stampDataUrl = d.stamp||'';
        state.items = d.items?.length ? d.items : [{ id: genId(), name: '', desc: '', qty: 1, price: 0, tax: 0, disc: 0 }];
        
        val('compName', d.compName); val('compDetails', d.compDetails); val('compTax', d.compTax);
        val('docType', d.docType || 'INVOICE'); val('invNum', d.invNum); val('invDate', d.invDate); val('invDue', d.invDue); val('invRef', d.invRef); val('paymentTermsPaper', d.paymentTermsPaper);
        val('custName', d.custName); val('custDetails', d.custDetails); val('shipDetails', d.shipDetails);
        val('ctrlCustCompanyField', d.custCompanyField); val('ctrlCustPersonField', d.custPersonField); val('ctrlCustEmailField', d.custEmailField); val('ctrlCustPhoneField', d.custPhoneField); val('ctrlCustAddressField', d.custAddressField); val('ctrlCustTaxField', d.custTaxField);
        val('valShip', d.valShip); val('valAdj', d.valAdj); val('valPaid', d.valPaid);
        val('notes', d.notes); val('paymentInfo', d.paymentInfo); val('termsInfo', d.termsInfo); val('sigName', d.sigName);
        val('ctrlBankName', d.bankName); val('ctrlAccountName', d.accountName); val('ctrlIbanField', d.ibanField); val('ctrlAccountNoField', d.accountNoField); val('ctrlPaymentNoteField', d.paymentNoteField);
        val('currencySelect', d.currencySelect || 'USD'); val('customCurrency', d.customCurrency); val('accentColorPicker', d.accentColor || '#00d084'); val('billHeadingColorPicker', d.billHeadingColor || '#00d084');
        state.billHeadingColor = d.billHeadingColor || '#00d084';
        val('docTypeSelect', d.docTypeSelect || d.docType || 'INVOICE'); val('paymentTermsInput', d.paymentTermsInput || d.paymentTermsPaper || ''); val('roundSelect', d.roundSelect || 'none'); val('statusSelect', d.statusSelect || 'auto'); val('customerMode', d.customerMode || 'combined'); val('paymentMode', d.paymentMode || 'combined'); val('themeSelect', d.themeSelect || 'theme-modern'); val('pageFitSelect', d.pageFitSelect || 'auto'); val('contentDensitySelect', d.contentDensitySelect || 'normal');
        
        if(d.toggles) {
          const setC = (id, v) => { el(id).checked = v; el(id).dispatchEvent(new Event('change')); };
          setC('tglLogo', d.toggles.logo); setC('tglTaxNum', d.toggles.taxNum); setC('tglShip', d.toggles.ship);
          if (el('tglItemCode')) setC('tglItemCode', d.toggles.iCode !== false);
          if (el('tglItemDesc')) setC('tglItemDesc', d.toggles.iDesc !== false);
          setC('tglColTax', d.toggles.cTax); setC('tglColDisc', d.toggles.cDisc); setC('tglSig', d.toggles.sig);
          setC('tglShipRow', d.toggles.rShip); setC('tglAdjRow', d.toggles.rAdj); setC('tglPaidRow', d.toggles.rPaid);
          setC('tglNotes', d.toggles.notes !== false); setC('tglPayment', d.toggles.payment !== false); setC('tglTerms', !!d.toggles.terms);
        }
      } else {
        val('invDate', new Date().toISOString().slice(0, 10)); val('invNum', "INV-" + Math.floor(1000+Math.random()*9000));
        val('currencySelect', 'USD'); val('accentColorPicker', '#00d084'); val('billHeadingColorPicker', '#00d084'); val('statusSelect', 'auto'); val('pageFitSelect', 'auto'); val('contentDensitySelect', 'normal');
        state.billHeadingColor = '#00d084';
      }
      
      renderImg('logoImage', 'logoUploadLabel', state.logoDataUrl);
      renderImg('stampImage', 'stampUploadLabel', state.stampDataUrl);
      handleCurrencyChange(); updateAccent(); updateBillHeadingColor(); applyTheme(); applyPageFit(); applyContentDensity(); renderItems(); updateSeparatePreviews(); applySectionModes(); schedulePanelSync();
      requestAnimationFrame(() => {
        ['compName', 'compDetails', 'custName', 'custDetails', 'shipDetails', 'notes', 'paymentInfo', 'termsInfo'].forEach(id => {
          if (el(id) && el(id).classList.contains('auto-expand')) autoResize(el(id));
        });
        rebalanceLayout();
      });
    }

    /* --- SAVED LIBRARIES --- */
    function libSave(type) {
      let data, name, key = LIB_KEYS[type];
      if(type === 'company') { name = val('compName'); data = { name, details: val('compDetails'), tax: val('compTax'), logo: state.logoDataUrl }; }
      else if(type === 'customer') { name = val('custName'); data = { name, details: val('custDetails'), ship: val('shipDetails') }; }
      else if(type === 'item') { const i = state.items[0]; name = i.name; data = {...i}; }
      else if(type === 'invoice') { name = val('invNum') || 'Invoice'; data = buildDraft(); }
      if(!name) return showToast('Name field cannot be empty to save.');
      const lib = JSON.parse(localStorage.getItem(key) || '[]'); lib.push({ id: genId(), data, name });
      localStorage.setItem(key, JSON.stringify(lib)); renderLibs(); showToast('Saved to Library');
    }

    function libLoad(type, id) {
      const lib = JSON.parse(localStorage.getItem(LIB_KEYS[type]) || '[]');
      const rec = lib.find(x => x.id === id); if(!rec) return; const d = rec.data;
      if(type === 'company') { val('compName', d.name); val('compDetails', d.details); val('compTax', d.tax); state.logoDataUrl = d.logo||''; renderImg('logoImage', 'logoUploadLabel', state.logoDataUrl); }
      else if(type === 'customer') { val('custName', d.name); val('custDetails', d.details); val('shipDetails', d.ship); }
      else if(type === 'item') { if(state.items.length===1 && !state.items[0].name) state.items[0] = {...d, id:genId()}; else state.items.push({...d, id:genId()}); renderItems(); }
      else if(type === 'invoice') { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); loadDraft(); }
      document.querySelectorAll('.auto-expand').forEach(autoResize); syncControlPanel(); autoSave(); toggleMenu('libraryMenu'); showToast('Loaded from Library');
    }

    function libEdit(type, id) {
      const key = LIB_KEYS[type]; const lib = JSON.parse(localStorage.getItem(key) || '[]');
      const rec = lib.find(x => x.id === id); if(!rec) return;
      if(type === 'item') {
        const current = rec.data || {};
        const name = prompt('Edit item name', current.name || ''); if (name === null) return;
        const desc = prompt('Edit description', current.desc || ''); if (desc === null) return;
        const code = prompt('Edit SKU / code', current.code || ''); if (code === null) return;
        const price = prompt('Edit price', current.price ?? 0); if (price === null) return;
        const tax = prompt('Edit tax %', current.tax ?? 0); if (tax === null) return;
        const disc = prompt('Edit discount %', current.disc ?? 0); if (disc === null) return;
        rec.name = name.trim() || rec.name;
        rec.data = { ...current, name: name.trim() || current.name || '', desc: desc, code: code, price: parseFloat(price) || 0, tax: parseFloat(tax) || 0, disc: parseFloat(disc) || 0 };
      } else {
        const name = prompt('Edit saved name', rec.name || ''); if (name === null) return;
        rec.name = name.trim() || rec.name;
      }
      localStorage.setItem(key, JSON.stringify(lib)); renderLibs(); showToast(type === 'item' ? 'Saved item updated' : 'Saved record updated');
    }

    function libDel(type, id) { let lib = JSON.parse(localStorage.getItem(LIB_KEYS[type]) || '[]'); lib = lib.filter(x => x.id !== id); localStorage.setItem(LIB_KEYS[type], JSON.stringify(lib)); renderLibs(); }
    function saveRecentInvoice() { libSave('invoice'); showToast('Invoice snapshot saved'); }
    function duplicateCurrentInvoice() { val('invNum', "INV-" + Math.floor(1000+Math.random()*9000)); val('invDate', new Date().toISOString().slice(0, 10)); syncControlPanel(); autoSave(); showToast('Invoice duplicated'); }
    function copyInvoiceSummary() { const summary = [ `Type: ${val('docType') || 'INVOICE'}`, `Number: ${val('invNum') || ''}`, `Issue Date: ${val('invDate') || ''}`, `Due Date: ${val('invDue') || ''}`, `Customer: ${val('custName') || ''}`, `Total: ${el('lblTotal').textContent || ''}` ].join('\n'); navigator.clipboard.writeText(summary).then(() => showToast('Invoice summary copied')); }
    function copyPaymentDetails() { const text = val('paymentInfo') || ''; if(!text.trim()) return showToast('Add payment details first'); navigator.clipboard.writeText(text).then(() => showToast('Payment details copied')); }
    function clearAllData() {
      if (!confirm('Clear the current invoice draft and reload?')) return;
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    }
    function clearAllBrowserData() { if(!confirm('Delete the draft, saved profiles, customers, items, and recent invoices from this browser?')) return; localStorage.removeItem(DRAFT_KEY); Object.values(LIB_KEYS).forEach(k => localStorage.removeItem(k)); window.location.reload(); }

    function fillExample() {
      const example = invoiceExamples[state.exampleIndex % invoiceExamples.length];
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + (example.invoice.dueDays || 0));

      val('compName', example.company.name);
      val('compDetails', example.company.details);
      val('compTax', example.company.tax);

      val('docType', example.invoice.docType);
      val('docTypeSelect', example.invoice.docType);
      val('invNum', `${example.invoice.docType.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`);
      val('invDate', issueDate.toISOString().slice(0, 10));
      val('invDue', dueDate.toISOString().slice(0, 10));
      val('invRef', example.invoice.ref);
      val('paymentTermsPaper', example.invoice.terms);
      val('paymentTermsInput', example.invoice.terms);

      val('custName', example.customer.name);
      val('custDetails', example.customer.details);
      val('shipDetails', example.customer.ship);

      val('notes', example.payment.notes);
      val('paymentInfo', example.payment.info);
      val('termsInfo', example.payment.terms);
      val('sigName', example.payment.signature);

      el('tglShip').checked = !!example.customer.ship;
      toggleVis('ship-box', !!example.customer.ship);
      el('tglShipRow').checked = parseFloat(example.totals.ship || 0) !== 0;
      toggleVis('ship-row', el('tglShipRow').checked);
      el('tglAdjRow').checked = parseFloat(example.totals.adj || 0) !== 0;
      toggleVis('adj-row', el('tglAdjRow').checked);
      el('tglPaidRow').checked = true;
      toggleVis('paid-row', true);
      toggleVis('paid-row-bal', true);
      el('tglTerms').checked = true;
      toggleVis('terms-box', true);

      val('valShip', example.totals.ship);
      val('valAdj', example.totals.adj);
      val('valPaid', example.totals.paid);

      state.items = example.items.map(item => ({ id: genId(), ...item }));

      val('customerMode', 'separate');
      val('paymentMode', 'separate');
      val('themeSelect', 'theme-modern');

      val('ctrlCustCompanyField', example.customer.company);
      val('ctrlCustPersonField', example.customer.person);
      val('ctrlCustEmailField', example.customer.email);
      val('ctrlCustPhoneField', example.customer.phone);
      val('ctrlCustAddressField', example.customer.address);
      val('ctrlCustTaxField', example.customer.tax);

      val('ctrlBankName', example.payment.bank);
      val('ctrlAccountName', example.payment.account);
      val('ctrlIbanField', example.payment.iban);
      val('ctrlAccountNoField', example.payment.accountNo);
      val('ctrlPaymentNoteField', example.payment.note);

      applyTheme();
      applySectionModes();
      renderItems();
      updateTotals();
      syncControlPanel();
      autoSave();

      state.exampleIndex = (state.exampleIndex + 1) % invoiceExamples.length;
      showToast(`Example ${state.exampleIndex || invoiceExamples.length} loaded`);
    }

    function renderLibs() {
      ['company','customer','item','invoice'].forEach(t => {
        const c = el(`lib-${t}-list`); c.innerHTML = ''; const lib = JSON.parse(localStorage.getItem(LIB_KEYS[t]) || '[]');
        if(!lib.length) c.innerHTML = '<div style="padding:10px; color:var(--muted); font-size:0.85rem;">No saved records.</div>';
        lib.forEach(r => {
          const div = document.createElement('div'); div.className = 'library-item';
          const editButton = t === 'item' ? `<button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; min-height:0;" onclick="libEdit('${t}','${r.id}')">Edit</button>` : '';
          div.innerHTML = `<div><div class="lib-text">${escapeHTML(r.name)}</div><div class="lib-sub">ID: ${r.id}</div></div><div style="display:flex; gap:5px;">${editButton}<button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem; min-height:0;" onclick="libLoad('${t}','${r.id}')">Load</button><button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem; min-height:0;" onclick="libDel('${t}','${r.id}')">✕</button></div>`;
          c.appendChild(div);
        });
      });
    }

    /* --- RESET & PDF --- */
    function buildPdfClone() {
      const source = el('invoicePaper'); const host = el('pdfExportHost'); host.innerHTML = '';
      const clone = source.cloneNode(true);
      clone.id = 'invoicePaperPrint'; clone.classList.add('pdf-export-clone');

      const liveTextareas = source.querySelectorAll('textarea');
      clone.querySelectorAll('textarea').forEach((node, index) => {
        const liveNode = liveTextareas[index]; const replacement = document.createElement('div');
        replacement.className = node.className.replace('seamless-input', '') + ' pdf-static-text';
        // TRIM user inputs and completely HIDE empty gaps
        const trimmedText = (liveNode ? liveNode.value : node.value).trim();
        replacement.textContent = trimmedText;
        if (!trimmedText) replacement.style.display = 'none';

        if (liveNode) { const style = window.getComputedStyle(liveNode); replacement.style.textAlign = style.textAlign; replacement.style.fontWeight = style.fontWeight; replacement.style.fontSize = style.fontSize; replacement.style.color = style.color; }
        node.replaceWith(replacement);
      });

      const liveInputs = source.querySelectorAll('input');
      clone.querySelectorAll('input').forEach((node, index) => {
        const liveNode = liveInputs[index]; const type = (node.getAttribute('type') || 'text').toLowerCase();
        if (type === 'file' || type === 'checkbox') { node.remove(); return; }
        const replacement = document.createElement('div');
        replacement.className = node.className.replace('seamless-input', '') + ' pdf-static-text';
        
        let trimmedText = '';
        if (type === 'date' && liveNode && liveNode.value) { trimmedText = new Intl.DateTimeFormat().format(new Date(liveNode.value + 'T00:00:00')); } 
        else { trimmedText = (liveNode ? liveNode.value : node.value).trim(); }
        
        replacement.textContent = trimmedText;
        // HIDE entirely if empty. If it's in the meta-grid, hide its label too to snap the gap completely shut!
        if (!trimmedText) {
          replacement.style.display = 'none';
          if (node.parentElement && node.parentElement.classList.contains('meta-grid') && node.previousElementSibling && node.previousElementSibling.tagName === 'LABEL') {
            node.previousElementSibling.style.display = 'none';
          }
        }

        if (liveNode) { const style = window.getComputedStyle(liveNode); replacement.style.textAlign = style.textAlign; replacement.style.fontWeight = style.fontWeight; replacement.style.fontSize = style.fontSize; replacement.style.color = style.color; }
        node.replaceWith(replacement);
      });

      clone.querySelectorAll('select').forEach(node => {
        const selected = node.options[node.selectedIndex]; const span = document.createElement('div');
        span.className = 'pdf-static-text'; span.textContent = selected ? selected.textContent.trim() : '';
        node.replaceWith(span);
      });

      clone.querySelectorAll('[id]').forEach(node => { node.removeAttribute('id'); });
      host.appendChild(clone); return clone;
    }

    function cleanupPrintClone() { el('pdfExportHost').innerHTML = ''; }

    function printInvoice() { window.scrollTo(0, 0); buildPdfClone(); window.addEventListener('afterprint', cleanupPrintClone, { once: true }); window.print(); }

    function loadHtml2Pdf() {
      if (window.html2pdf) return Promise.resolve(window.html2pdf);
      return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-html2pdf-loader="true"]');
        if (existing) {
          existing.addEventListener('load', () => resolve(window.html2pdf), { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.async = true;
        script.dataset.html2pdfLoader = 'true';
        script.onload = () => resolve(window.html2pdf);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    function downloadNativePDF() {
      const currentScrollY = window.scrollY; window.scrollTo(0, 0);
      const clone = buildPdfClone();
      const name = `${val('invNum') || 'Invoice'}-${val('compName') || 'Company'}.pdf`.replace(/[^a-zA-Z0-9-.]/g, '_');
      
      const opt = {
        margin: 0, filename: name, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      loadHtml2Pdf()
        .then(() => {
          if (!window.html2pdf) throw new Error('html2pdf unavailable');
          return html2pdf().set(opt).from(clone).save();
        })
        .then(() => { el('pdfExportHost').innerHTML = ''; window.scrollTo(0, currentScrollY); showToast("PDF Downloaded!"); })
        .catch(() => { el('pdfExportHost').innerHTML = ''; window.scrollTo(0, currentScrollY); showToast('PDF export failed'); });
    }

    /* --- CSV BULK LINE ITEMS --- */
    function parseCsvLine(line) {
      const out = [];
      let cur = '';
      let q = false;
      for (let i = 0; i < line.length; i += 1) {
        const c = line[i];
        const n = line[i + 1];
        if (q && c === '"' && n === '"') { cur += '"'; i += 1; continue; }
        if (c === '"') { q = !q; continue; }
        if (!q && c === ',') { out.push(cur); cur = ''; continue; }
        cur += c;
      }
      out.push(cur);
      return out.map(s => s.trim());
    }

    function normalizeCsvHeader(h) {
      return String(h || '').toLowerCase().trim().replace(/%/g, '').replace(/\s+/g, '_');
    }

    function findCsvColumnIndex(headers, ...names) {
      const norm = headers.map(h => normalizeCsvHeader(h));
      for (const raw of names) {
        const want = normalizeCsvHeader(raw);
        const i = norm.findIndex(h => h === want || h.replace(/_/g, '') === want.replace(/_/g, ''));
        if (i >= 0) return i;
      }
      return -1;
    }

    function downloadLineItemsTemplate() {
      const header = 'Item name,SKU,Description,Qty,Price,Tax %,Disc %,Image URL';
      const sample = 'Example dish,FD-001,Optional notes,2,15.50,10,0,https://example.com/images/dish.jpg';
      const bom = '\uFEFF';
      const blob = new Blob([bom + header + '\n' + sample + '\n'], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vendora-invoice-line-items-template.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
      showToast('CSV template downloaded');
    }

    function parseLineItemsCsvText(text) {
      const raw = String(text || '').replace(/^\uFEFF/, '');
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('Need a header row and at least one data row');
      const headers = parseCsvLine(lines[0]);
      const idxName = findCsvColumnIndex(headers, 'item_name', 'item name', 'name', 'product', 'item');
      const idxCode = findCsvColumnIndex(headers, 'sku', 'code', 'item_code');
      const idxDesc = findCsvColumnIndex(headers, 'description', 'desc', 'details');
      const idxImageUrl = findCsvColumnIndex(headers, 'image_url', 'image', 'img', 'photo_url', 'picture_url');
      const idxQty = findCsvColumnIndex(headers, 'qty', 'quantity', 'q');
      const idxPrice = findCsvColumnIndex(headers, 'price', 'unit_price', 'rate', 'amount');
      const idxTax = findCsvColumnIndex(headers, 'tax', 'tax_%', 'tax_percent');
      const idxDisc = findCsvColumnIndex(headers, 'disc', 'discount', 'discount_percent', 'disc_%');
      if (idxQty < 0 || idxPrice < 0) throw new Error('Required columns: Qty and Price');
      if (idxName < 0) throw new Error('Required column: Item name (or Name)');
      const items = [];
      for (let r = 1; r < lines.length; r += 1) {
        const cells = parseCsvLine(lines[r]);
        if (!cells.length) continue;
        const name = (cells[idxName] !== undefined ? cells[idxName] : '').trim();
        const qty = parseFloat(String(cells[idxQty] !== undefined ? cells[idxQty] : '').replace(/,/g, ''));
        const price = parseFloat(String(cells[idxPrice] !== undefined ? cells[idxPrice] : '').replace(/,/g, ''));
        if (!name && !Number.isFinite(qty) && !Number.isFinite(price)) continue;
        if (!Number.isFinite(qty) || !Number.isFinite(price)) continue;
        const code = idxCode >= 0 && cells[idxCode] !== undefined ? String(cells[idxCode]).trim() : '';
        const desc = idxDesc >= 0 && cells[idxDesc] !== undefined ? String(cells[idxDesc]).trim() : '';
        const imageUrl = idxImageUrl >= 0 && cells[idxImageUrl] !== undefined ? String(cells[idxImageUrl]).trim() : '';
        const tax = idxTax >= 0 ? parseFloat(String(cells[idxTax] !== undefined ? cells[idxTax] : '').replace(/,/g, '')) : 0;
        const disc = idxDisc >= 0 ? parseFloat(String(cells[idxDisc] !== undefined ? cells[idxDisc] : '').replace(/,/g, '')) : 0;
        items.push({
          id: genId(),
          name: name || 'Item',
          code,
          desc,
          imageUrl,
          qty: qty || 0,
          price: price || 0,
          tax: Number.isFinite(tax) ? tax : 0,
          disc: Number.isFinite(disc) ? disc : 0
        });
      }
      if (!items.length) throw new Error('No valid data rows');
      return items;
    }

    function importLineItemsFromCsv(ev) {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const newItems = parseLineItemsCsvText(reader.result);
          const replace = el('csvReplaceItems') && el('csvReplaceItems').checked;
          if (replace) state.items = newItems;
          else state.items = state.items.concat(newItems);
          if (!state.items.length) state.items = [{ id: genId(), name: '', desc: '', qty: 1, price: 0, tax: 0, disc: 0 }];
          renderItems();
          updateTotals();
          syncControlPanel();
          autoSave();
          showToast(`Imported ${newItems.length} line item${newItems.length === 1 ? '' : 's'}`);
        } catch (err) {
          showToast(err.message || 'Import failed');
        }
        ev.target.value = '';
      };
      reader.onerror = () => { showToast('Could not read file'); ev.target.value = ''; };
      reader.readAsText(file, 'UTF-8');
    }

    /* --- FIREBASE PRODUCTS CSV EXPORT (Firestore REST) --- */
    function saveFbExportSettings() {
      const key = 'v_fb_export_settings';
      const data = {
        apiKey: val('fbApiKey'),
        projectId: val('fbProjectId'),
        collection: val('fbCollection') || 'products',
        skuField: val('fbSkuField') || 'SKU_ID',
        imagesField: val('fbImagesField') || 'Images'
      };
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    }

    function loadFbExportSettings() {
      const key = 'v_fb_export_settings';
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.apiKey) val('fbApiKey', d.apiKey);
        if (d.projectId) val('fbProjectId', d.projectId);
        if (d.collection) val('fbCollection', d.collection);
        if (d.skuField) val('fbSkuField', d.skuField);
        if (d.imagesField) val('fbImagesField', d.imagesField);
      } catch (_) {}
    }

    function normalizeImagesCell(v) {
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) return v.map(x => String(x || '').trim()).filter(Boolean).join(' | ');
      return String(v).trim();
    }

    async function fetchAllFirestoreDocs({ projectId, apiKey, collection }) {
      // Firestore REST requires an API key; this assumes public read rules for this collection.
      // Endpoint: https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/{collection}
      const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}`;
      /** @type {any[]} */
      const out = [];
      let pageToken = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const url = pageToken ? `${base}?pageSize=1000&pageToken=${encodeURIComponent(pageToken)}&key=${encodeURIComponent(apiKey)}` : `${base}?pageSize=1000&key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Firestore request failed (${res.status}). ${txt.slice(0, 180)}`);
        }
        const json = await res.json();
        if (json && Array.isArray(json.documents)) out.push(...json.documents);
        pageToken = json && json.nextPageToken ? String(json.nextPageToken) : '';
        if (!pageToken) break;
      }
      return out;
    }

    function firestoreValueToJs(v) {
      // Firestore REST encodes values by type keys: stringValue, integerValue, doubleValue, arrayValue, mapValue, etc.
      if (!v || typeof v !== 'object') return v;
      if ('stringValue' in v) return v.stringValue;
      if ('integerValue' in v) return Number(v.integerValue);
      if ('doubleValue' in v) return Number(v.doubleValue);
      if ('booleanValue' in v) return !!v.booleanValue;
      if ('timestampValue' in v) return v.timestampValue;
      if ('nullValue' in v) return null;
      if ('arrayValue' in v) {
        const arr = (v.arrayValue && Array.isArray(v.arrayValue.values)) ? v.arrayValue.values : [];
        return arr.map(firestoreValueToJs);
      }
      if ('mapValue' in v) {
        const fields = (v.mapValue && v.mapValue.fields) ? v.mapValue.fields : {};
        const obj = {};
        Object.keys(fields).forEach(k => { obj[k] = firestoreValueToJs(fields[k]); });
        return obj;
      }
      return v;
    }

    function getFirestoreField(doc, fieldName) {
      const fields = doc && doc.fields ? doc.fields : null;
      if (!fields) return undefined;
      const v = fields[fieldName];
      return firestoreValueToJs(v);
    }

    function csvEscapeCell(s) {
      const raw = String(s ?? '');
      if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
      return raw;
    }

    async function downloadProductsCsvFromFirebase() {
      const apiKey = val('fbApiKey').trim();
      const projectId = val('fbProjectId').trim();
      const collection = (val('fbCollection') || 'products').trim();
      const skuField = (val('fbSkuField') || 'SKU_ID').trim();
      const imagesField = (val('fbImagesField') || 'Images').trim();
      if (!apiKey || !projectId) return showToast('Add Firebase API Key + Project ID first');
      if (!collection) return showToast('Enter a collection name');

      saveFbExportSettings();
      showToast('Fetching products from Firestore...');

      const docs = await fetchAllFirestoreDocs({ projectId, apiKey, collection });
      if (!docs.length) { showToast('No documents found'); return; }

      const rows = [];
      rows.push(['id', 'SKU_ID', 'Images']);
      for (const doc of docs) {
        const name = (doc && doc.name) ? String(doc.name) : '';
        const id = name ? name.split('/').pop() : '';
        const sku = getFirestoreField(doc, skuField);
        const imgs = getFirestoreField(doc, imagesField);
        rows.push([id, sku ?? '', normalizeImagesCell(imgs)]);
      }

      const bom = '\uFEFF';
      const csv = rows.map(r => r.map(csvEscapeCell).join(',')).join('\n') + '\n';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vendora-products-${collection}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
      showToast(`Downloaded ${docs.length} products`);
    }

    /* --- INIT --- */
    initCurrencies(); bindControlPanel(); loadDraft(); renderLibs(); syncControlPanel(); loadFbExportSettings();

    (function wireInvoicePaperMoneyFields() {
      const paper = el('invoicePaper');
      if (!paper) return;
      const bump = () => {
        updateTotals();
        syncControlPanel();
        schedulePageEstimate();
        autoSave();
      };
      ['input', 'change'].forEach(ev =>
        paper.addEventListener(
          ev,
          e => {
            const id = e.target && e.target.id;
            if (id === 'valShip' || id === 'valAdj' || id === 'valPaid') bump();
          },
          true
        )
      );
    })();

    function onInvoiceFieldEdit(e) {
      if (!e.target.classList.contains('seamless-input')) return;
      if (e.target.classList.contains('auto-expand')) autoResize(e.target);
      if (['valShip', 'valAdj', 'valPaid', 'invDue', 'docType'].includes(e.target.id)) scheduleTotalsUpdate();
      schedulePanelSync();
      schedulePageEstimate();
      autoSave();
    }
    document.body.addEventListener('input', onInvoiceFieldEdit);
    document.body.addEventListener('change', onInvoiceFieldEdit);
    document.body.addEventListener('blur', (e) => {
      if (!e.target.classList || !e.target.classList.contains('seamless-input')) return;
      if (['valShip', 'valAdj', 'valPaid', 'invDue', 'docType'].includes(e.target.id)) {
        scheduleTotalsUpdate();
        schedulePanelSync();
        autoSave();
      }
    }, true);
