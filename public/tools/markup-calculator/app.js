// markup-calculator runtime

(function () {
  var currencyGroups = [
    { label: "Global and North America", options: [{ code: "USD", label: "USD - US Dollar ($)" }, { code: "CAD", label: "CAD - Canadian Dollar (CA$)" }, { code: "MXN", label: "MXN - Mexican Peso (MX$)" }] },
    { label: "Europe", options: [{ code: "EUR", label: "EUR - Euro (EUR)" }, { code: "GBP", label: "GBP - British Pound (GBP)" }, { code: "CHF", label: "CHF - Swiss Franc (CHF)" }, { code: "SEK", label: "SEK - Swedish Krona (SEK)" }, { code: "NOK", label: "NOK - Norwegian Krone (NOK)" }, { code: "DKK", label: "DKK - Danish Krone (DKK)" }, { code: "PLN", label: "PLN - Polish Zloty (PLN)" }, { code: "CZK", label: "CZK - Czech Koruna (CZK)" }, { code: "HUF", label: "HUF - Hungarian Forint (HUF)" }, { code: "RON", label: "RON - Romanian Leu (RON)" }, { code: "UAH", label: "UAH - Ukrainian Hryvnia (UAH)" }] },
    { label: "Middle East and North Africa", options: [{ code: "AED", label: "AED - UAE Dirham (AED)" }, { code: "SAR", label: "SAR - Saudi Riyal (SAR)" }, { code: "BHD", label: "BHD - Bahraini Dinar (BHD)" }, { code: "QAR", label: "QAR - Qatari Riyal (QAR)" }, { code: "KWD", label: "KWD - Kuwaiti Dinar (KWD)" }, { code: "OMR", label: "OMR - Omani Rial (OMR)" }, { code: "JOD", label: "JOD - Jordanian Dinar (JOD)" }, { code: "EGP", label: "EGP - Egyptian Pound (EGP)" }, { code: "TRY", label: "TRY - Turkish Lira (TRY)" }] },
    { label: "Asia Pacific", options: [{ code: "INR", label: "INR - Indian Rupee (INR)" }, { code: "PKR", label: "PKR - Pakistani Rupee (PKR)" }, { code: "BDT", label: "BDT - Bangladeshi Taka (BDT)" }, { code: "SGD", label: "SGD - Singapore Dollar (SGD)" }, { code: "HKD", label: "HKD - Hong Kong Dollar (HKD)" }, { code: "CNY", label: "CNY - Chinese Yuan (CNY)" }, { code: "JPY", label: "JPY - Japanese Yen (JPY)" }, { code: "KRW", label: "KRW - South Korean Won (KRW)" }, { code: "THB", label: "THB - Thai Baht (THB)" }, { code: "MYR", label: "MYR - Malaysian Ringgit (MYR)" }, { code: "IDR", label: "IDR - Indonesian Rupiah (IDR)" }, { code: "PHP", label: "PHP - Philippine Peso (PHP)" }, { code: "AUD", label: "AUD - Australian Dollar (AUD)" }, { code: "NZD", label: "NZD - New Zealand Dollar (NZD)" }] },
    { label: "Africa and Latin America", options: [{ code: "ZAR", label: "ZAR - South African Rand (ZAR)" }, { code: "NGN", label: "NGN - Nigerian Naira (NGN)" }, { code: "KES", label: "KES - Kenyan Shilling (KES)" }, { code: "BRL", label: "BRL - Brazilian Real (BRL)" }, { code: "ARS", label: "ARS - Argentine Peso (ARS)" }, { code: "CLP", label: "CLP - Chilean Peso (CLP)" }, { code: "PEN", label: "PEN - Peruvian Sol (PEN)" }, { code: "COP", label: "COP - Colombian Peso (COP)" }] }
  ];

  var currencyInput = document.getElementById("currency");
  var costAmountInput = document.getElementById("costAmount");
  var sellingPriceInput = document.getElementById("sellingPrice");
  var resetButton = document.getElementById("resetButton");

  var profitAmountOutput = document.getElementById("profitAmountOutput");
  var profitCardOutput = document.getElementById("profitCardOutput");
  var markupPercentOutput = document.getElementById("markupPercentOutput");
  var marginPercentOutput = document.getElementById("marginPercentOutput");
  var pricingStatusOutput = document.getElementById("pricingStatusOutput");
  var statusText = document.getElementById("statusText");

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

  function formatPercent(value) {
    var amount = isFinite(value) ? value : 0;
    return amount.toFixed(2) + "%";
  }

  function calculate() {
    var cost = getNumber(costAmountInput);
    var sellingPrice = getNumber(sellingPriceInput);
    var profit = sellingPrice - cost;
    var markup = cost > 0 ? (profit / cost) * 100 : 0;
    var margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

    profitAmountOutput.textContent = formatMoney(profit);
    profitCardOutput.textContent = formatMoney(profit);
    markupPercentOutput.textContent = formatPercent(markup);
    marginPercentOutput.textContent = formatPercent(margin);

    if (!costAmountInput.value || !sellingPriceInput.value) {
      pricingStatusOutput.textContent = "Waiting";
      statusText.textContent = "Enter cost and selling price to calculate markup instantly.";
      return;
    }

    if (profit < 0) {
      pricingStatusOutput.textContent = "Loss";
      statusText.textContent = "The selling price is below cost, so the markup is negative.";
    } else if (markup >= 100) {
      pricingStatusOutput.textContent = "Strong";
      statusText.textContent = "This pricing shows a strong markup and healthy margin.";
    } else if (markup >= 40) {
      pricingStatusOutput.textContent = "Balanced";
      statusText.textContent = "This pricing shows a workable markup for many business cases.";
    } else {
      pricingStatusOutput.textContent = "Low";
      statusText.textContent = "This pricing has a low markup, so it may need review.";
    }
  }

  function reset() {
    currencyInput.value = "USD";
    costAmountInput.value = "";
    sellingPriceInput.value = "";
    calculate();
  }

  [currencyInput, costAmountInput, sellingPriceInput].forEach(function (input) {
    input.addEventListener("input", calculate);
    input.addEventListener("change", calculate);
  });

  resetButton.addEventListener("click", reset);

  populateCurrencyOptions();
  reset();
})();
