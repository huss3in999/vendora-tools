// receipt-generator runtime

(function () {
  var currencyGroups = [
    { label: "Global and North America", options: [{ code: "USD", label: "USD - US Dollar ($)" }, { code: "CAD", label: "CAD - Canadian Dollar (CA$)" }, { code: "MXN", label: "MXN - Mexican Peso (MX$)" }] },
    { label: "Europe", options: [{ code: "EUR", label: "EUR - Euro (EUR)" }, { code: "GBP", label: "GBP - British Pound (GBP)" }, { code: "CHF", label: "CHF - Swiss Franc (CHF)" }, { code: "SEK", label: "SEK - Swedish Krona (SEK)" }, { code: "NOK", label: "NOK - Norwegian Krone (NOK)" }, { code: "DKK", label: "DKK - Danish Krone (DKK)" }, { code: "PLN", label: "PLN - Polish Zloty (PLN)" }, { code: "CZK", label: "CZK - Czech Koruna (CZK)" }, { code: "HUF", label: "HUF - Hungarian Forint (HUF)" }, { code: "RON", label: "RON - Romanian Leu (RON)" }, { code: "UAH", label: "UAH - Ukrainian Hryvnia (UAH)" }] },
    { label: "Middle East and North Africa", options: [{ code: "AED", label: "AED - UAE Dirham (AED)" }, { code: "SAR", label: "SAR - Saudi Riyal (SAR)" }, { code: "BHD", label: "BHD - Bahraini Dinar (BHD)" }, { code: "QAR", label: "QAR - Qatari Riyal (QAR)" }, { code: "KWD", label: "KWD - Kuwaiti Dinar (KWD)" }, { code: "OMR", label: "OMR - Omani Rial (OMR)" }, { code: "JOD", label: "JOD - Jordanian Dinar (JOD)" }, { code: "EGP", label: "EGP - Egyptian Pound (EGP)" }, { code: "TRY", label: "TRY - Turkish Lira (TRY)" }] },
    { label: "Asia Pacific", options: [{ code: "INR", label: "INR - Indian Rupee (INR)" }, { code: "PKR", label: "PKR - Pakistani Rupee (PKR)" }, { code: "BDT", label: "BDT - Bangladeshi Taka (BDT)" }, { code: "SGD", label: "SGD - Singapore Dollar (SGD)" }, { code: "HKD", label: "HKD - Hong Kong Dollar (HKD)" }, { code: "CNY", label: "CNY - Chinese Yuan (CNY)" }, { code: "JPY", label: "JPY - Japanese Yen (JPY)" }, { code: "KRW", label: "KRW - South Korean Won (KRW)" }, { code: "THB", label: "THB - Thai Baht (THB)" }, { code: "MYR", label: "MYR - Malaysian Ringgit (MYR)" }, { code: "IDR", label: "IDR - Indonesian Rupiah (IDR)" }, { code: "PHP", label: "PHP - Philippine Peso (PHP)" }, { code: "AUD", label: "AUD - Australian Dollar (AUD)" }, { code: "NZD", label: "NZD - New Zealand Dollar (NZD)" }] },
    { label: "Africa and Latin America", options: [{ code: "ZAR", label: "ZAR - South African Rand (ZAR)" }, { code: "NGN", label: "NGN - Nigerian Naira (NGN)" }, { code: "KES", label: "KES - Kenyan Shilling (KES)" }, { code: "BRL", label: "BRL - Brazilian Real (BRL)" }, { code: "ARS", label: "ARS - Argentine Peso (ARS)" }, { code: "CLP", label: "CLP - Chilean Peso (CLP)" }, { code: "PEN", label: "PEN - Peruvian Sol (PEN)" }, { code: "COP", label: "COP - Colombian Peso (COP)" }] }
  ];

  var lineItemsContainer = document.getElementById("lineItems");
  var addItemButton = document.getElementById("addItemButton");
  var exampleButton = document.getElementById("exampleButton");
  var resetButton = document.getElementById("resetButton");
  var printButton = document.getElementById("printButton");

  var businessNameInput = document.getElementById("businessName");
  var businessAddressInput = document.getElementById("businessAddress");
  var businessPhoneInput = document.getElementById("businessPhone");
  var taxNumberInput = document.getElementById("taxNumber");
  var receiptNumberInput = document.getElementById("receiptNumber");
  var receiptDateInput = document.getElementById("receiptDate");
  var currencyInput = document.getElementById("currency");
  var paymentMethodInput = document.getElementById("paymentMethod");
  var cashierNameInput = document.getElementById("cashierName");
  var customerNameInput = document.getElementById("customerName");
  var taxPercentInput = document.getElementById("taxPercent");
  var discountTypeInput = document.getElementById("discountType");
  var discountValueInput = document.getElementById("discountValue");
  var receiptNoteInput = document.getElementById("receiptNote");

  var subtotalOutput = document.getElementById("subtotalOutput");
  var taxAmountOutput = document.getElementById("taxAmountOutput");
  var grandTotalOutput = document.getElementById("grandTotalOutput");

  var previewBusinessName = document.getElementById("previewBusinessName");
  var previewBusinessAddress = document.getElementById("previewBusinessAddress");
  var previewBusinessPhone = document.getElementById("previewBusinessPhone");
  var previewTaxNumber = document.getElementById("previewTaxNumber");
  var previewReceiptNumber = document.getElementById("previewReceiptNumber");
  var previewReceiptDate = document.getElementById("previewReceiptDate");
  var previewPaymentMethod = document.getElementById("previewPaymentMethod");
  var previewCashierName = document.getElementById("previewCashierName");
  var previewCustomerName = document.getElementById("previewCustomerName");
  var previewItems = document.getElementById("previewItems");
  var previewSubtotal = document.getElementById("previewSubtotal");
  var previewDiscount = document.getElementById("previewDiscount");
  var previewTaxAmount = document.getElementById("previewTaxAmount");
  var previewGrandTotal = document.getElementById("previewGrandTotal");
  var previewNote = document.getElementById("previewNote");
  var cashierPreviewBlock = document.getElementById("cashierPreviewBlock");
  var customerPreviewBlock = document.getElementById("customerPreviewBlock");

  var state = { items: [] };

  function populateCurrencyOptions() {
    currencyGroups.forEach(function (group) {
      var optgroup = document.createElement("optgroup");
      optgroup.label = group.label;
      group.options.forEach(function (option) {
        var opt = document.createElement("option");
        opt.value = option.code;
        opt.textContent = option.label;
        optgroup.appendChild(opt);
      });
      currencyInput.appendChild(optgroup);
    });
    currencyInput.value = "USD";
  }

  function createItem(item) {
    return {
      id: "item-" + Math.random().toString(36).slice(2, 9),
      name: item && item.name ? item.name : "",
      qty: item && item.qty ? item.qty : 1,
      price: item && item.price ? item.price : 0
    };
  }

  function getNumber(value) {
    return parseFloat(value) || 0;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMoney(value) {
    var amount = isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyInput.value || "USD"
      }).format(amount);
    } catch (error) {
      return (currencyInput.value || "USD") + " " + amount.toFixed(2);
    }
  }

  function formatDateForPreview(value) {
    if (!value) {
      return "-";
    }

    var date = new Date(value + "T00:00:00");
    if (isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function getLineTotal(item) {
    return getNumber(item.qty) * getNumber(item.price);
  }

  function renderItems() {
    lineItemsContainer.innerHTML = state.items.map(function (item) {
      return [
        '<div class="item-row" data-id="' + item.id + '">',
        '  <input type="text" class="item-name" data-field="name" placeholder="Item name" aria-label="Item name" value="' + escapeHtml(item.name) + '">',
        '  <input type="number" class="item-qty" data-field="qty" min="0" step="0.01" inputmode="decimal" aria-label="Item quantity" value="' + escapeHtml(item.qty) + '">',
        '  <input type="number" class="item-price" data-field="price" min="0" step="0.01" inputmode="decimal" aria-label="Unit price" value="' + escapeHtml(item.price) + '">',
        '  <div class="line-total-box">' + formatMoney(getLineTotal(item)) + "</div>",
        '  <button type="button" class="btn btn-danger remove-item-button" aria-label="Remove line item">Remove</button>',
        "</div>"
      ].join("");
    }).join("");
  }

  function calculateTotals() {
    var subtotal = state.items.reduce(function (sum, item) {
      return sum + getLineTotal(item);
    }, 0);
    var discountValue = getNumber(discountValueInput.value);
    var discountAmount = discountTypeInput.value === "percent" ? subtotal * (discountValue / 100) : discountValue;

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    var taxableBase = Math.max(subtotal - discountAmount, 0);
    var taxAmount = taxableBase * (getNumber(taxPercentInput.value) / 100);
    var grandTotal = taxableBase + taxAmount;

    return {
      subtotal: subtotal,
      discountAmount: discountAmount,
      taxAmount: taxAmount,
      grandTotal: grandTotal
    };
  }

  function renderPreview() {
    var totals = calculateTotals();
    var businessName = businessNameInput.value.trim();
    var businessAddress = businessAddressInput.value.trim();
    var businessPhone = businessPhoneInput.value.trim();
    var taxNumber = taxNumberInput.value.trim();
    var receiptNumber = receiptNumberInput.value.trim();
    var paymentMethod = paymentMethodInput.value.trim();
    var cashierName = cashierNameInput.value.trim();
    var customerName = customerNameInput.value.trim();
    var note = receiptNoteInput.value.trim();

    subtotalOutput.textContent = formatMoney(totals.subtotal);
    taxAmountOutput.textContent = formatMoney(totals.taxAmount);
    grandTotalOutput.textContent = formatMoney(totals.grandTotal);

    previewBusinessName.textContent = businessName || "Your Business Name";
    previewBusinessAddress.textContent = businessAddress || "Business address appears here.";
    previewBusinessPhone.textContent = "Phone: " + (businessPhone || "-");
    previewTaxNumber.textContent = "VAT / Tax No: " + (taxNumber || "-");
    previewTaxNumber.classList.toggle("is-hidden", !taxNumber);

    previewReceiptNumber.textContent = receiptNumber || "RCPT-0000";
    previewReceiptDate.textContent = formatDateForPreview(receiptDateInput.value);
    previewPaymentMethod.textContent = paymentMethod || "-";
    previewCashierName.textContent = cashierName || "-";
    previewCustomerName.textContent = customerName || "-";
    cashierPreviewBlock.classList.toggle("is-hidden", !cashierName);
    customerPreviewBlock.classList.toggle("is-hidden", !customerName);

    if (state.items.length) {
      previewItems.innerHTML = state.items.map(function (item) {
        return [
          '<div class="preview-item-row">',
          '  <span class="preview-item-name">' + escapeHtml(item.name || "Untitled item") + "</span>",
          "  <span>" + getNumber(item.qty).toFixed(2).replace(/\.00$/, "") + "</span>",
          "  <span>" + formatMoney(getNumber(item.price)) + "</span>",
          "  <span>" + formatMoney(getLineTotal(item)) + "</span>",
          "</div>"
        ].join("");
      }).join("");
    } else {
      previewItems.innerHTML = '<div class="empty-state">Add line items to generate your receipt preview.</div>';
    }

    previewSubtotal.textContent = formatMoney(totals.subtotal);
    previewDiscount.textContent = formatMoney(totals.discountAmount);
    previewTaxAmount.textContent = formatMoney(totals.taxAmount);
    previewGrandTotal.textContent = formatMoney(totals.grandTotal);
    previewNote.textContent = note || "Thank you for your business.";
  }

  function update() {
    renderItems();
    renderPreview();
  }

  function addItem(item) {
    state.items.push(createItem(item));
    update();
  }

  function removeItem(id) {
    if (state.items.length === 1) {
      state.items = [createItem()];
      update();
      return;
    }

    state.items = state.items.filter(function (item) {
      return item.id !== id;
    });
    update();
  }

  function loadExample() {
    businessNameInput.value = "Vendora Bistro";
    businessAddressInput.value = "15 King Fahd Road\nRiyadh, Saudi Arabia";
    businessPhoneInput.value = "+966 55 803 4421";
    taxNumberInput.value = "VAT-984220";
    receiptNumberInput.value = "RCPT-2048";
    receiptDateInput.value = new Date().toISOString().slice(0, 10);
    currencyInput.value = "SAR";
    paymentMethodInput.value = "Card";
    cashierNameInput.value = "Noura";
    customerNameInput.value = "Amina Salem";
    taxPercentInput.value = "15";
    discountTypeInput.value = "percent";
    discountValueInput.value = "10";
    receiptNoteInput.value = "Thank you for dining with us.";
    state.items = [
      createItem({ name: "Chicken shawarma platter", qty: 2, price: 8.5 }),
      createItem({ name: "Fresh juice", qty: 2, price: 3.25 }),
      createItem({ name: "Dessert box", qty: 1, price: 5.75 })
    ];
    update();
  }

  function resetForm() {
    businessNameInput.value = "";
    businessAddressInput.value = "";
    businessPhoneInput.value = "";
    taxNumberInput.value = "";
    receiptNumberInput.value = "";
    receiptDateInput.value = new Date().toISOString().slice(0, 10);
    currencyInput.value = "USD";
    paymentMethodInput.value = "";
    cashierNameInput.value = "";
    customerNameInput.value = "";
    taxPercentInput.value = "";
    discountTypeInput.value = "amount";
    discountValueInput.value = "";
    receiptNoteInput.value = "";
    state.items = [createItem()];
    update();
  }

  addItemButton.addEventListener("click", function () {
    addItem();
  });

  lineItemsContainer.addEventListener("input", function (event) {
    var row = event.target.closest(".item-row");
    if (!row) {
      return;
    }

    var item = state.items.find(function (entry) {
      return entry.id === row.getAttribute("data-id");
    });

    if (!item) {
      return;
    }

    var field = event.target.getAttribute("data-field");
    item[field] = event.target.value;
    renderPreview();
    row.querySelector(".line-total-box").textContent = formatMoney(getLineTotal(item));
  });

  lineItemsContainer.addEventListener("click", function (event) {
    if (!event.target.classList.contains("remove-item-button")) {
      return;
    }

    var row = event.target.closest(".item-row");
    if (!row) {
      return;
    }

    removeItem(row.getAttribute("data-id"));
  });

  [
    businessNameInput,
    businessAddressInput,
    businessPhoneInput,
    taxNumberInput,
    receiptNumberInput,
    receiptDateInput,
    currencyInput,
    paymentMethodInput,
    cashierNameInput,
    customerNameInput,
    taxPercentInput,
    discountTypeInput,
    discountValueInput,
    receiptNoteInput
  ].forEach(function (input) {
    input.addEventListener("input", renderPreview);
    input.addEventListener("change", renderPreview);
  });

  exampleButton.addEventListener("click", loadExample);
  resetButton.addEventListener("click", resetForm);
  printButton.addEventListener("click", function () {
    window.print();
  });

  populateCurrencyOptions();
  resetForm();
})();
