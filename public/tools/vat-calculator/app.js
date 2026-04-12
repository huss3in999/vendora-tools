// vat-calculator runtime

(function () {
  var currencyGroups = [
    { label: "Global and North America", options: [{ code: "USD", label: "USD - US Dollar ($)" }, { code: "CAD", label: "CAD - Canadian Dollar (CA$)" }, { code: "MXN", label: "MXN - Mexican Peso (MX$)" }] },
    { label: "Europe", options: [{ code: "EUR", label: "EUR - Euro (EUR)" }, { code: "GBP", label: "GBP - British Pound (GBP)" }, { code: "CHF", label: "CHF - Swiss Franc (CHF)" }, { code: "SEK", label: "SEK - Swedish Krona (SEK)" }, { code: "NOK", label: "NOK - Norwegian Krone (NOK)" }, { code: "DKK", label: "DKK - Danish Krone (DKK)" }, { code: "PLN", label: "PLN - Polish Zloty (PLN)" }, { code: "CZK", label: "CZK - Czech Koruna (CZK)" }, { code: "HUF", label: "HUF - Hungarian Forint (HUF)" }, { code: "RON", label: "RON - Romanian Leu (RON)" }, { code: "UAH", label: "UAH - Ukrainian Hryvnia (UAH)" }] },
    { label: "Middle East and North Africa", options: [{ code: "AED", label: "AED - UAE Dirham (AED)" }, { code: "SAR", label: "SAR - Saudi Riyal (SAR)" }, { code: "BHD", label: "BHD - Bahraini Dinar (BHD)" }, { code: "QAR", label: "QAR - Qatari Riyal (QAR)" }, { code: "KWD", label: "KWD - Kuwaiti Dinar (KWD)" }, { code: "OMR", label: "OMR - Omani Rial (OMR)" }, { code: "JOD", label: "JOD - Jordanian Dinar (JOD)" }, { code: "EGP", label: "EGP - Egyptian Pound (EGP)" }, { code: "TRY", label: "TRY - Turkish Lira (TRY)" }] },
    { label: "Asia Pacific", options: [{ code: "INR", label: "INR - Indian Rupee (INR)" }, { code: "PKR", label: "PKR - Pakistani Rupee (PKR)" }, { code: "BDT", label: "BDT - Bangladeshi Taka (BDT)" }, { code: "SGD", label: "SGD - Singapore Dollar (SGD)" }, { code: "HKD", label: "HKD - Hong Kong Dollar (HKD)" }, { code: "CNY", label: "CNY - Chinese Yuan (CNY)" }, { code: "JPY", label: "JPY - Japanese Yen (JPY)" }, { code: "KRW", label: "KRW - South Korean Won (KRW)" }, { code: "THB", label: "THB - Thai Baht (THB)" }, { code: "MYR", label: "MYR - Malaysian Ringgit (MYR)" }, { code: "IDR", label: "IDR - Indonesian Rupiah (IDR)" }, { code: "PHP", label: "PHP - Philippine Peso (PHP)" }, { code: "AUD", label: "AUD - Australian Dollar (AUD)" }, { code: "NZD", label: "NZD - New Zealand Dollar (NZD)" }] },
    { label: "Africa and Latin America", options: [{ code: "ZAR", label: "ZAR - South African Rand (ZAR)" }, { code: "NGN", label: "NGN - Nigerian Naira (NGN)" }, { code: "KES", label: "KES - Kenyan Shilling (KES)" }, { code: "BRL", label: "BRL - Brazilian Real (BRL)" }, { code: "ARS", label: "ARS - Argentine Peso (ARS)" }, { code: "CLP", label: "CLP - Chilean Peso (CLP)" }, { code: "PEN", label: "PEN - Peruvian Sol (PEN)" }, { code: "COP", label: "COP - Colombian Peso (COP)" }] }
  ];

  var currencyInput = document.getElementById("currency");
  var priceAmountInput = document.getElementById("priceAmount");
  var vatPercentInput = document.getElementById("vatPercent");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll(".mode-button"));
  var quickVatButtons = Array.prototype.slice.call(document.querySelectorAll(".quick-vat-button"));
  var resetButton = document.getElementById("resetButton");

  var vatAmountOutput = document.getElementById("vatAmountOutput");
  var priceIncludingVatOutput = document.getElementById("priceIncludingVatOutput");
  var includingVatCardOutput = document.getElementById("includingVatCardOutput");
  var excludingVatOutput = document.getElementById("excludingVatOutput");
  var modeOutput = document.getElementById("modeOutput");
  var statusText = document.getElementById("statusText");

  var mode = "add";

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

  function getNumber(input) {
    return parseFloat(input.value) || 0;
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

  function updateQuickButtons() {
    var currentVat = String(getNumber(vatPercentInput));
    quickVatButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-vat") === currentVat);
    });
  }

  function updateModeButtons() {
    modeButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-mode") === mode);
    });
    modeOutput.textContent = mode === "add" ? "Add VAT" : "Remove VAT";
  }

  function calculate() {
    var price = getNumber(priceAmountInput);
    var vatPercent = getNumber(vatPercentInput);
    var vatAmount = 0;
    var priceIncludingVat = 0;
    var priceExcludingVat = 0;

    if (mode === "add") {
      priceExcludingVat = price;
      vatAmount = price * (vatPercent / 100);
      priceIncludingVat = price + vatAmount;
    } else {
      priceIncludingVat = price;
      priceExcludingVat = vatPercent > 0 ? price / (1 + vatPercent / 100) : price;
      vatAmount = priceIncludingVat - priceExcludingVat;
    }

    vatAmountOutput.textContent = formatMoney(vatAmount);
    priceIncludingVatOutput.textContent = formatMoney(priceIncludingVat);
    includingVatCardOutput.textContent = formatMoney(priceIncludingVat);
    excludingVatOutput.textContent = formatMoney(priceExcludingVat);

    if (!priceAmountInput.value) {
      statusText.textContent = "Enter a price and VAT percentage to see the result instantly.";
    } else if (mode === "add") {
      statusText.textContent = "The result shows the original price plus VAT.";
    } else {
      statusText.textContent = "The result shows the original VAT-inclusive price broken down before VAT.";
    }

    updateQuickButtons();
    updateModeButtons();
  }

  function reset() {
    currencyInput.value = "USD";
    priceAmountInput.value = "";
    vatPercentInput.value = "15";
    mode = "add";
    calculate();
  }

  [currencyInput, priceAmountInput, vatPercentInput].forEach(function (input) {
    input.addEventListener("input", calculate);
    input.addEventListener("change", calculate);
  });

  quickVatButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      vatPercentInput.value = button.getAttribute("data-vat");
      calculate();
    });
  });

  modeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      mode = button.getAttribute("data-mode");
      calculate();
    });
  });

  resetButton.addEventListener("click", reset);

  populateCurrencyOptions();
  reset();
})();
