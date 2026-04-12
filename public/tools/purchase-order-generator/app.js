(function () {
  var currencyGroups = [
    { label: "Global and North America", options: [{ code: "USD", label: "USD - US Dollar ($)" }, { code: "CAD", label: "CAD - Canadian Dollar (CA$)" }, { code: "SAR", label: "SAR - Saudi Riyal (SAR)" }] },
    { label: "Europe", options: [{ code: "EUR", label: "EUR - Euro (EUR)" }, { code: "GBP", label: "GBP - British Pound (GBP)" }] },
    { label: "Middle East and North Africa", options: [{ code: "AED", label: "AED - UAE Dirham (AED)" }, { code: "BHD", label: "BHD - Bahraini Dinar (BHD)" }] },
    { label: "Asia Pacific", options: [{ code: "INR", label: "INR - Indian Rupee (INR)" }, { code: "SGD", label: "SGD - Singapore Dollar (SGD)" }] }
  ];

  function genPoNumber() {
    var d = new Date();
    var y = d.getFullYear();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return "PO-" + y + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  var lineItemsContainer = document.getElementById("lineItems");
  var addItemButton = document.getElementById("addItemButton");
  var exampleButton = document.getElementById("exampleButton");
  var resetButton = document.getElementById("resetButton");
  var printButton = document.getElementById("printButton");
  var downloadButton = document.getElementById("downloadButton");
  var regenPoButton = document.getElementById("regenPoButton");

  var buyerNameInput = document.getElementById("buyerName");
  var buyerAddressInput = document.getElementById("buyerAddress");
  var supplierNameInput = document.getElementById("supplierName");
  var poNumberInput = document.getElementById("poNumber");
  var orderDateInput = document.getElementById("orderDate");
  var deliveryDateInput = document.getElementById("deliveryDate");
  var currencyInput = document.getElementById("currency");
  var taxPercentInput = document.getElementById("taxPercent");
  var paymentTermsInput = document.getElementById("paymentTerms");
  var statusSelect = document.getElementById("statusSelect");
  var poNotesInput = document.getElementById("poNotes");

  var subtotalOutput = document.getElementById("subtotalOutput");
  var taxAmountOutput = document.getElementById("taxAmountOutput");
  var grandTotalOutput = document.getElementById("grandTotalOutput");

  var previewBuyer = document.getElementById("previewBuyer");
  var previewBuyerAddr = document.getElementById("previewBuyerAddr");
  var previewSupplier = document.getElementById("previewSupplier");
  var previewPoNum = document.getElementById("previewPoNum");
  var previewOrderDate = document.getElementById("previewOrderDate");
  var previewDeliveryDate = document.getElementById("previewDeliveryDate");
  var previewStatus = document.getElementById("previewStatus");
  var previewTerms = document.getElementById("previewTerms");
  var previewItems = document.getElementById("previewItems");
  var previewSubtotal = document.getElementById("previewSubtotal");
  var previewTax = document.getElementById("previewTax");
  var previewGrand = document.getElementById("previewGrand");
  var previewNotes = document.getElementById("previewNotes");

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
    } catch (e) {
      return (currencyInput.value || "USD") + " " + amount.toFixed(2);
    }
  }

  function formatDate(value) {
    if (!value) return "-";
    var date = new Date(value + "T00:00:00");
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function getLineTotal(item) {
    return getNumber(item.qty) * getNumber(item.price);
  }

  function calculateTotals() {
    var subtotal = state.items.reduce(function (s, item) {
      return s + getLineTotal(item);
    }, 0);
    var taxAmount = subtotal * (getNumber(taxPercentInput.value) / 100);
    return { subtotal: subtotal, taxAmount: taxAmount, grandTotal: subtotal + taxAmount };
  }

  function renderItems() {
    lineItemsContainer.innerHTML = state.items.map(function (item) {
      return [
        '<div class="item-row" data-id="' + item.id + '">',
        '  <input type="text" class="item-name" data-field="name" placeholder="Item / description" aria-label="Item name" value="' + escapeHtml(item.name) + '">',
        '  <input type="number" class="item-qty" data-field="qty" min="0" step="0.01" inputmode="decimal" aria-label="Quantity" value="' + escapeHtml(item.qty) + '">',
        '  <input type="number" class="item-price" data-field="price" min="0" step="0.01" inputmode="decimal" aria-label="Unit price" value="' + escapeHtml(item.price) + '">',
        '  <div class="line-total-box">' + formatMoney(getLineTotal(item)) + "</div>",
        '  <button type="button" class="btn btn-danger remove-item-button" aria-label="Remove line">Remove</button>',
        "</div>"
      ].join("");
    }).join("");
  }

  function renderPreview() {
    var t = calculateTotals();
    subtotalOutput.textContent = formatMoney(t.subtotal);
    taxAmountOutput.textContent = formatMoney(t.taxAmount);
    grandTotalOutput.textContent = formatMoney(t.grandTotal);

    previewBuyer.textContent = buyerNameInput.value.trim() || "Your company";
    previewBuyerAddr.textContent = buyerAddressInput.value.trim() || "—";
    previewSupplier.textContent = supplierNameInput.value.trim() || "Supplier name";
    previewPoNum.textContent = poNumberInput.value.trim() || "PO-XXXX";
    previewOrderDate.textContent = formatDate(orderDateInput.value);
    previewDeliveryDate.textContent = formatDate(deliveryDateInput.value);
    previewStatus.textContent = statusSelect.value || "Draft";
    previewTerms.textContent = paymentTermsInput.value.trim() || "—";

    if (state.items.length) {
      previewItems.innerHTML = state.items.map(function (item) {
        return [
          '<div class="preview-item-row">',
          '  <span class="preview-item-name">' + escapeHtml(item.name || "Item") + "</span>",
          "  <span>" + getNumber(item.qty).toFixed(2).replace(/\.00$/, "") + "</span>",
          "  <span>" + formatMoney(getNumber(item.price)) + "</span>",
          "  <span>" + formatMoney(getLineTotal(item)) + "</span>",
          "</div>"
        ].join("");
      }).join("");
    } else {
      previewItems.innerHTML = '<div class="empty-state">Add line items for the purchase order.</div>';
    }

    previewSubtotal.textContent = formatMoney(t.subtotal);
    previewTax.textContent = formatMoney(t.taxAmount);
    previewGrand.textContent = formatMoney(t.grandTotal);
    previewNotes.textContent = poNotesInput.value.trim() || "—";
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
    state.items = state.items.filter(function (i) {
      return i.id !== id;
    });
    update();
  }

  function loadExample() {
    buyerNameInput.value = "Vendora Kitchen LLC";
    buyerAddressInput.value = "Building 4, Diplomatic Area\nManama, Bahrain";
    supplierNameInput.value = "Fresh Foods Wholesale";
    poNumberInput.value = genPoNumber();
    orderDateInput.value = new Date().toISOString().slice(0, 10);
    var d2 = new Date();
    d2.setDate(d2.getDate() + 7);
    deliveryDateInput.value = d2.toISOString().slice(0, 10);
    currencyInput.value = "USD";
    taxPercentInput.value = "10";
    paymentTermsInput.value = "Net 30";
    statusSelect.value = "Sent";
    poNotesInput.value = "Deliver to receiving dock B. Reference cold chain.";
    state.items = [
      createItem({ name: "Olive oil (20L)", qty: 4, price: 89 }),
      createItem({ name: "Tomato paste (case)", qty: 12, price: 24.5 })
    ];
    update();
  }

  function resetForm() {
    buyerNameInput.value = "";
    buyerAddressInput.value = "";
    supplierNameInput.value = "";
    poNumberInput.value = genPoNumber();
    orderDateInput.value = new Date().toISOString().slice(0, 10);
    deliveryDateInput.value = "";
    currencyInput.value = "USD";
    taxPercentInput.value = "";
    paymentTermsInput.value = "";
    statusSelect.value = "Draft";
    poNotesInput.value = "";
    state.items = [createItem()];
    update();
  }

  function downloadHtml() {
    var host = document.getElementById("poPaper");
    if (!host) return;
    var clone = host.cloneNode(true);
    var html =
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" +
      escapeHtml(poNumberInput.value || "Purchase Order") +
      "</title></head><body style=\"font-family:system-ui,sans-serif;padding:24px;\">" +
      clone.outerHTML +
      "</body></html>";
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (poNumberInput.value || "purchase-order").replace(/[^\w\-]+/g, "_") + ".html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  addItemButton.addEventListener("click", function () {
    addItem();
  });
  regenPoButton.addEventListener("click", function () {
    poNumberInput.value = genPoNumber();
    renderPreview();
  });
  lineItemsContainer.addEventListener("input", function (event) {
    var row = event.target.closest(".item-row");
    if (!row) return;
    var item = state.items.find(function (e) {
      return e.id === row.getAttribute("data-id");
    });
    if (!item) return;
    var field = event.target.getAttribute("data-field");
    item[field] = event.target.value;
    renderPreview();
    var lt = row.querySelector(".line-total-box");
    if (lt) lt.textContent = formatMoney(getLineTotal(item));
  });
  lineItemsContainer.addEventListener("click", function (event) {
    if (!event.target.classList.contains("remove-item-button")) return;
    var row = event.target.closest(".item-row");
    if (row) removeItem(row.getAttribute("data-id"));
  });

  [
    buyerNameInput,
    buyerAddressInput,
    supplierNameInput,
    poNumberInput,
    orderDateInput,
    deliveryDateInput,
    currencyInput,
    taxPercentInput,
    paymentTermsInput,
    statusSelect,
    poNotesInput
  ].forEach(function (el) {
    el.addEventListener("input", renderPreview);
    el.addEventListener("change", renderPreview);
  });

  exampleButton.addEventListener("click", loadExample);
  resetButton.addEventListener("click", resetForm);
  printButton.addEventListener("click", function () {
    window.print();
  });
  downloadButton.addEventListener("click", downloadHtml);

  populateCurrencyOptions();
  resetForm();
})();
