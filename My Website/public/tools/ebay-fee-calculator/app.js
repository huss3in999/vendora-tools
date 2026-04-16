// ebay-fee-calculator UI

(function () {
  var platform = "ebay";

  var platEbay = document.getElementById("platEbay");
  var platEtsy = document.getElementById("platEtsy");
  var netProfitOutput = document.getElementById("netProfitOutput");
  var marginOutput = document.getElementById("marginOutput");
  var waterfallBody = document.getElementById("waterfallBody");
  var stackBar = document.getElementById("stackBar");

  function el(id) {
    return document.getElementById(id);
  }

  function sanitizeDecimal(raw) {
    var s = String(raw || "").replace(/[^\d.]/g, "");
    var parts = s.split(".");
    if (parts.length <= 1) return s;
    return parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
  }

  function readInputs() {
    return {
      platform: platform,
      itemPrice: parseFloat(sanitizeDecimal(el("itemPrice").value)) || 0,
      shippingCharge: parseFloat(sanitizeDecimal(el("shippingCharge").value)) || 0,
      taxPct: parseFloat(sanitizeDecimal(el("taxPct").value)) || 0,
      giftWrap: platform === "etsy" ? parseFloat(sanitizeDecimal(el("giftWrap").value)) || 0 : 0,
      quantity: platform === "etsy" ? parseInt(sanitizeDecimal(el("quantity").value), 10) || 1 : 1,
      cogs: parseFloat(sanitizeDecimal(el("cogs").value)) || 0,
      actualShippingCost: parseFloat(sanitizeDecimal(el("actualShippingCost").value)) || 0,
      packagingCost: parseFloat(sanitizeDecimal(el("packagingCost").value)) || 0,
      storeSubscription: el("storeSubscription").checked,
      promotedPct: parseFloat(sanitizeDecimal(el("promotedPct").value)) || 0,
      internationalBuyer: el("internationalBuyer").checked,
      ebayIntlShipping: el("ebayIntlShipping").checked,
      currencyConversion: el("currencyConversion").checked,
      belowStandard: el("belowStandard").checked,
      veryHighReturn: el("veryHighReturn").checked,
      etsyBankRegion: el("etsyBankRegion").value,
      offsiteAds: el("offsiteAds").value,
      regulatoryCountry: el("regulatoryCountry").value
    };
  }

  function formatMoney(value) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
    } catch (e) {
      return "$" + value.toFixed(2);
    }
  }

  function setPlatform(p) {
    platform = p;
    var isEtsy = p === "etsy";
    platEbay.classList.toggle("is-active", !isEtsy);
    platEtsy.classList.toggle("is-active", isEtsy);
    platEbay.setAttribute("aria-selected", !isEtsy ? "true" : "false");
    platEtsy.setAttribute("aria-selected", isEtsy ? "true" : "false");

    document.querySelectorAll(".ebay-only").forEach(function (node) {
      node.hidden = isEtsy;
      node.classList.toggle("is-hidden", isEtsy);
    });
    document.querySelectorAll(".etsy-only").forEach(function (node) {
      node.hidden = !isEtsy;
      node.classList.toggle("is-hidden", !isEtsy);
    });
    calculate();
  }

  function renderStackBar(result) {
    stackBar.innerHTML = "";
    var gross = result.grossRevenue;
    if (gross <= 0) return;
    result.chart.forEach(function (seg) {
      var pct = Math.min(100, Math.max(0, (seg.value / gross) * 100));
      if (pct <= 0) return;
      var div = document.createElement("div");
      div.className = "stack-seg";
      div.style.width = pct.toFixed(2) + "%";
      div.style.background = seg.color;
      div.title = seg.label + ": " + formatMoney(seg.value);
      stackBar.appendChild(div);
    });
  }

  function calculate() {
    if (typeof MarketplaceFeeEngine === "undefined") return;
    var result = MarketplaceFeeEngine.compute(readInputs());
    netProfitOutput.textContent = formatMoney(result.netProfit);
    marginOutput.textContent = result.marginPct.toFixed(1) + "%";

    waterfallBody.innerHTML = "";
    result.lines.forEach(function (line) {
      var tr = document.createElement("tr");
      if (line.emphasis) tr.className = "row-emphasis";
      if (line.total) tr.className = "row-total";
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = line.label;
      var td = document.createElement("td");
      if (line.isPercent) {
        td.textContent = line.amount.toFixed(2) + "%";
      } else {
        td.textContent = formatMoney(line.amount);
      }
      tr.appendChild(th);
      tr.appendChild(td);
      waterfallBody.appendChild(tr);
    });

    renderStackBar(result);
  }

  function wire() {
    platEbay.addEventListener("click", function () {
      setPlatform("ebay");
    });
    platEtsy.addEventListener("click", function () {
      setPlatform("etsy");
    });

    [
      "itemPrice",
      "shippingCharge",
      "taxPct",
      "giftWrap",
      "quantity",
      "cogs",
      "actualShippingCost",
      "packagingCost",
      "promotedPct"
    ].forEach(function (id) {
      el(id).addEventListener("input", function () {
        var v = sanitizeDecimal(el(id).value);
        if (v !== el(id).value) el(id).value = v;
        calculate();
      });
    });

    ["storeSubscription", "internationalBuyer", "ebayIntlShipping", "currencyConversion", "belowStandard", "veryHighReturn"].forEach(function (id) {
      el(id).addEventListener("change", calculate);
    });

    el("etsyBankRegion").addEventListener("change", calculate);
    el("offsiteAds").addEventListener("change", calculate);
    el("regulatoryCountry").addEventListener("change", calculate);

    el("resetButton").addEventListener("click", function () {
      el("itemPrice").value = "";
      el("shippingCharge").value = "";
      el("taxPct").value = "";
      el("giftWrap").value = "";
      el("quantity").value = "1";
      el("cogs").value = "";
      el("actualShippingCost").value = "";
      el("packagingCost").value = "";
      el("storeSubscription").checked = false;
      el("promotedPct").value = "";
      el("internationalBuyer").checked = false;
      el("ebayIntlShipping").checked = false;
      el("currencyConversion").checked = false;
      el("belowStandard").checked = false;
      el("veryHighReturn").checked = false;
      el("etsyBankRegion").value = "US";
      el("offsiteAds").value = "optout";
      el("regulatoryCountry").value = "";
      setPlatform("ebay");
    });
  }

  wire();
  setPlatform("ebay");
})();
