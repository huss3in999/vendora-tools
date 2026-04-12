/**
 * eBay & Etsy marketplace fee estimates (2026-style parameters).
 * Educational model — platform fees change; confirm against eBay/Etsy seller hubs.
 */
(function (global) {
  function n(v) {
    var x = parseFloat(v);
    return isFinite(x) ? x : 0;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  /**
   * Tax on item + shipping; total sale = item + shipping + tax.
   * All percentage fees use totalSale as base per spec.
   */
  function ebayTotalSale(itemPrice, shippingCharge, taxPct) {
    var item = Math.max(0, n(itemPrice));
    var ship = Math.max(0, n(shippingCharge));
    var tax = (item + ship) * (n(taxPct) / 100);
    return {
      item: item,
      shipping: ship,
      tax: tax,
      totalSale: item + ship + tax
    };
  }

  function ebayFvfAmount(totalSale, store, belowStandard, veryHighReturn) {
    var cap = store ? 2500 : 7500;
    var r1 = store ? 0.127 : 0.136;
    var r2 = 0.0235;
    if (belowStandard) {
      r1 += 0.06;
      r2 += 0.06;
    }
    if (veryHighReturn) {
      r1 += 0.05;
      r2 += 0.05;
    }
    var p1 = Math.min(totalSale, cap);
    var p2 = Math.max(0, totalSale - cap);
    return p1 * r1 + p2 * r2;
  }

  function computeEbay(inputs) {
    var base = ebayTotalSale(inputs.itemPrice, inputs.shippingCharge, inputs.taxPct);
    var totalSale = base.totalSale;
    var fixed = totalSale <= 10 ? 0.3 : 0.4;
    var fvf = ebayFvfAmount(
      totalSale,
      !!inputs.storeSubscription,
      !!inputs.belowStandard,
      !!inputs.veryHighReturn
    );
    var promoPct = n(inputs.promotedPct);
    var promoted = 0;
    if (promoPct > 0) {
      promoted = totalSale * (clamp(promoPct, 2, 100) / 100);
    }
    var intlFee = 0;
    if (inputs.internationalBuyer && !inputs.ebayIntlShipping) {
      intlFee = totalSale * 0.0165;
    }
    var convFee = inputs.currencyConversion ? totalSale * 0.03 : 0;
    var totalFees = fixed + fvf + promoted + intlFee + convFee;
    var cogs = Math.max(0, n(inputs.cogs));
    var shipCost = Math.max(0, n(inputs.actualShippingCost));
    var pack = Math.max(0, n(inputs.packagingCost));
    var costs = cogs + shipCost + pack;
    var gross = totalSale;
    var taxRemit = base.tax;
    var net = gross - totalFees - costs - taxRemit;
    var margin = gross > 0 ? (net / gross) * 100 : 0;

    var lines = [];
    lines.push({ key: "gross", label: "Gross revenue (buyer paid)", amount: gross });
    lines.push({ key: "fixed", label: "Fixed per-order fee", amount: -fixed });
    lines.push({ key: "fvf", label: "Final value fee (tiered)", amount: -fvf });
    if (promoted > 0) {
      lines.push({ key: "promo", label: "Promoted Listings Standard (" + clamp(promoPct, 2, 100).toFixed(1) + "%)", amount: -promoted });
    }
    if (intlFee > 0) lines.push({ key: "intl", label: "International fee (1.65%)", amount: -intlFee });
    if (convFee > 0) lines.push({ key: "conv", label: "Currency conversion (3%)", amount: -convFee });
    lines.push({ key: "feesSub", label: "Total platform fees", amount: -totalFees, emphasis: true });
    if (taxRemit > 0) {
      lines.push({ key: "taxRemit", label: "Sales tax remitted (est.)", amount: -taxRemit });
    }
    lines.push({ key: "cogs", label: "Cost of goods sold", amount: -cogs });
    lines.push({ key: "shipCost", label: "Actual shipping cost", amount: -shipCost });
    lines.push({ key: "pack", label: "Packaging", amount: -pack });
    lines.push({ key: "net", label: "Net profit", amount: net, total: true });
    lines.push({ key: "margin", label: "Profit margin", amount: margin, isPercent: true });

    var chartEbay = [{ label: "Platform fees", value: totalFees, color: "#2563eb" }];
    if (taxRemit > 0) chartEbay.push({ label: "Tax remitted", value: taxRemit, color: "#94a3b8" });
    chartEbay.push({ label: "Your costs", value: costs, color: "#ea580c" });
    chartEbay.push({ label: "Net profit", value: Math.max(0, net), color: "#00d084" });

    return {
      platform: "ebay",
      grossRevenue: gross,
      totalFees: totalFees,
      costs: costs,
      netProfit: net,
      marginPct: margin,
      lines: lines,
      meta: base,
      chart: chartEbay
    };
  }

  function etsyOrderTotals(inputs) {
    var item = Math.max(0, n(inputs.itemPrice));
    var ship = Math.max(0, n(inputs.shippingCharge));
    var gift = Math.max(0, n(inputs.giftWrap));
    var taxPct = n(inputs.taxPct);
    var preTax = item + ship + gift;
    var tax = preTax * (taxPct / 100);
    var totalOrder = preTax + tax;
    return { item: item, shipping: ship, gift: gift, tax: tax, totalOrder: totalOrder, preTax: preTax };
  }

  function etsyPaymentFee(totalOrder, region) {
    var r = region || "US";
    if (r === "UK") return totalOrder * 0.04 + 0.2;
    if (r === "EU") return totalOrder * 0.04 + 0.3;
    return totalOrder * 0.03 + 0.25;
  }

  function etsyOffsiteRate(status) {
    if (status === "under10k") return 0.15;
    if (status === "over10k") return 0.12;
    return 0;
  }

  function etsyRegulatoryRate(country) {
    var m = { UK: 0.0032, FR: 0.0047, ES: 0.0072, CA: 0.0115 };
    return m[country] || 0;
  }

  function computeEtsy(inputs) {
    var o = etsyOrderTotals(inputs);
    var qty = Math.max(1, Math.floor(n(inputs.quantity) || 1));
    var listing = 0.2 * qty;
    var transaction = o.totalOrder * 0.065;
    var payment = etsyPaymentFee(o.totalOrder, inputs.etsyBankRegion);
    var offsiteBase = o.item + o.shipping;
    var offsite = offsiteBase * etsyOffsiteRate(inputs.offsiteAds || "optout");
    var regRate = etsyRegulatoryRate(inputs.regulatoryCountry || "");
    var regulatory = regRate > 0 ? o.totalOrder * regRate : 0;
    var totalFees = listing + transaction + payment + offsite + regulatory;
    var cogs = Math.max(0, n(inputs.cogs));
    var shipCost = Math.max(0, n(inputs.actualShippingCost));
    var pack = Math.max(0, n(inputs.packagingCost));
    var costs = cogs + shipCost + pack;
    var gross = o.totalOrder;
    var taxRemit = o.tax;
    var net = gross - totalFees - costs - taxRemit;
    var margin = gross > 0 ? (net / gross) * 100 : 0;

    var lines = [];
    lines.push({ key: "gross", label: "Gross revenue (buyer paid)", amount: gross });
    lines.push({ key: "listing", label: "Listing fee ($0.20 x quantity)", amount: -listing });
    lines.push({ key: "trans", label: "Transaction fee (6.5%)", amount: -transaction });
    lines.push({
      key: "pay",
      label:
        "Payment processing (" +
        (inputs.etsyBankRegion === "UK"
          ? "4% + £0.20"
          : inputs.etsyBankRegion === "EU"
            ? "4% + €0.30"
            : "3% + $0.25") +
        ")",
      amount: -payment
    });
    if (offsite > 0) {
      lines.push({
        key: "offsite",
        label: "Offsite Ads (on item + shipping)",
        amount: -offsite
      });
    }
    if (regulatory > 0) {
      lines.push({ key: "reg", label: "Regulatory operating fee", amount: -regulatory });
    }
    lines.push({ key: "feesSub", label: "Total platform fees", amount: -totalFees, emphasis: true });
    if (taxRemit > 0) {
      lines.push({
        key: "taxRemit",
        label: "Sales tax remitted (est.)",
        amount: -taxRemit
      });
    }
    lines.push({ key: "cogs", label: "Cost of goods sold", amount: -cogs });
    lines.push({ key: "shipCost", label: "Actual shipping cost", amount: -shipCost });
    lines.push({ key: "pack", label: "Packaging", amount: -pack });
    lines.push({ key: "net", label: "Net profit", amount: net, total: true });
    lines.push({ key: "margin", label: "Profit margin", amount: margin, isPercent: true });

    var chartEtsy = [{ label: "Platform fees", value: totalFees, color: "#2563eb" }];
    if (taxRemit > 0) chartEtsy.push({ label: "Tax remitted", value: taxRemit, color: "#94a3b8" });
    chartEtsy.push({ label: "Your costs", value: costs, color: "#ea580c" });
    chartEtsy.push({ label: "Net profit", value: Math.max(0, net), color: "#00d084" });

    return {
      platform: "etsy",
      grossRevenue: gross,
      totalFees: totalFees,
      costs: costs,
      netProfit: net,
      marginPct: margin,
      lines: lines,
      meta: o,
      chart: chartEtsy
    };
  }

  function compute(inputs) {
    var platform = (inputs.platform || "ebay").toLowerCase();
    if (platform === "etsy") return computeEtsy(inputs);
    return computeEbay(inputs);
  }

  global.MarketplaceFeeEngine = { compute: compute, computeEbay: computeEbay, computeEtsy: computeEtsy };
})(typeof window !== "undefined" ? window : this);
