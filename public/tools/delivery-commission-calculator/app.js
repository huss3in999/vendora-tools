// Delivery Commission Calculator runtime

(function () {
      var currencyConfig = {
        USD: { symbol: "$", locale: "en-US", decimals: 2 },
        EUR: { symbol: "EUR", locale: "en-IE", decimals: 2 },
        GBP: { symbol: "GBP", locale: "en-GB", decimals: 2 },
        BHD: { symbol: "BD", locale: "en-BH", decimals: 3 },
        AED: { symbol: "AED", locale: "en-AE", decimals: 2 },
        SAR: { symbol: "SAR", locale: "en-SA", decimals: 2 },
        INR: { symbol: "INR", locale: "en-IN", decimals: 2 },
        EGP: { symbol: "EGP", locale: "en-EG", decimals: 2 }
      };

      var businessNameInput = document.getElementById("businessName");
      var currencyInput = document.getElementById("currency");
      var averageOrderValueInput = document.getElementById("averageOrderValue");
      var ordersPerDayInput = document.getElementById("ordersPerDay");
      var commissionPercentInput = document.getElementById("commissionPercent");
      var daysPerMonthInput = document.getElementById("daysPerMonth");
      var directFeePercentInput = document.getElementById("directFeePercent");
      var exampleButton = document.getElementById("exampleButton");
      var resetButton = document.getElementById("resetButton");
      var copyButton = document.getElementById("copyButton");
      var shareButton = document.getElementById("shareButton");
      var printButton = document.getElementById("printButton");

      var lossPerOrderOutput = document.getElementById("lossPerOrderOutput");
      var dailyLossOutput = document.getElementById("dailyLossOutput");
      var monthlyLossOutput = document.getElementById("monthlyLossOutput");
      var yearlyLossOutput = document.getElementById("yearlyLossOutput");
      var revenueKeptOutput = document.getElementById("revenueKeptOutput");
      var savingsPercentOutput = document.getElementById("savingsPercentOutput");
      var statusBanner = document.getElementById("statusBanner");
      var statusLabel = document.getElementById("statusLabel");
      var statusScore = document.getElementById("statusScore");
      var bigLossText = document.getElementById("bigLossText");
      var statusText = document.getElementById("statusText");
      var recommendationText = document.getElementById("recommendationText");
      var appMonthlyFeesOutput = document.getElementById("appMonthlyFeesOutput");
      var appYearlyFeesOutput = document.getElementById("appYearlyFeesOutput");
      var appRateOutput = document.getElementById("appRateOutput");
      var directMonthlyFeesOutput = document.getElementById("directMonthlyFeesOutput");
      var directYearlyFeesOutput = document.getElementById("directYearlyFeesOutput");
      var differenceOutput = document.getElementById("differenceOutput");
      var validationMessage = document.getElementById("validationMessage");

      var inputs = [
        businessNameInput,
        currencyInput,
        averageOrderValueInput,
        ordersPerDayInput,
        commissionPercentInput,
        daysPerMonthInput,
        directFeePercentInput
      ];

      function getCurrency() {
        return currencyConfig[currencyInput.value] || currencyConfig.USD;
      }

      function getNumber(input) {
        return parseFloat(input.value) || 0;
      }

      function formatMoney(value) {
        var currency = getCurrency();
        var amount = isFinite(value) ? value : 0;
        return currency.symbol + " " + amount.toLocaleString(currency.locale, {
          minimumFractionDigits: currency.decimals,
          maximumFractionDigits: currency.decimals
        });
      }

      function formatPercent(value) {
        var amount = isFinite(value) ? value : 0;
        return amount.toFixed(2) + "%";
      }

      function animateValue(element, newText) {
        if (element.textContent === newText) {
          return;
        }

        element.textContent = newText;
        element.classList.remove("value-animate");
        void element.offsetWidth;
        element.classList.add("value-animate");
      }

      function getRecommendation(monthlyLoss, yearlySavings) {
        if (monthlyLoss >= 2500 || yearlySavings >= 30000) {
          return {
            label: "Critical loss",
            color: "linear-gradient(135deg, rgba(255, 107, 107, 0.18), rgba(255, 107, 107, 0.08))",
            border: "rgba(255, 107, 107, 0.26)",
            text: "Your business is losing a significant amount to delivery commissions. Direct ordering could save you thousands per year."
          };
        }

        if (monthlyLoss >= 1000 || yearlySavings >= 12000) {
          return {
            label: "High loss",
            color: "linear-gradient(135deg, rgba(255, 200, 87, 0.18), rgba(255, 200, 87, 0.08))",
            border: "rgba(255, 200, 87, 0.28)",
            text: "Your commission exposure is high. Direct ordering could meaningfully improve your retained profit."
          };
        }

        if (monthlyLoss >= 300 || yearlySavings >= 3000) {
          return {
            label: "Moderate loss",
            color: "linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(59, 130, 246, 0.08))",
            border: "rgba(59, 130, 246, 0.24)",
            text: "Your current commission exposure is manageable but still expensive."
          };
        }

        return {
          label: "Low loss",
          color: "linear-gradient(135deg, rgba(0, 208, 132, 0.18), rgba(0, 208, 132, 0.08))",
          border: "rgba(0, 208, 132, 0.24)",
          text: "Your delivery commission cost is relatively low, but direct ordering can still protect more profit over time."
        };
      }

      function setValidation(message) {
        if (!validationMessage) {
          return;
        }

        validationMessage.textContent = message || "";
        validationMessage.style.display = message ? "block" : "none";
      }

      function calculate() {
        var rawAverageOrderValue = getNumber(averageOrderValueInput);
        var rawOrdersPerDay = getNumber(ordersPerDayInput);
        var rawCommissionPercent = getNumber(commissionPercentInput);
        var rawDaysPerMonth = getNumber(daysPerMonthInput);
        var rawDirectFeePercent = getNumber(directFeePercentInput);

        var averageOrderValue = Math.max(rawAverageOrderValue, 0);
        var ordersPerDay = Math.max(rawOrdersPerDay, 0);
        var commissionPercent = Math.min(Math.max(rawCommissionPercent, 0), 100);
        var daysPerMonth = Math.max(rawDaysPerMonth, 0);
        var directFeePercent = Math.min(Math.max(rawDirectFeePercent, 0), 100);

        var grossDailyRevenue = averageOrderValue * ordersPerDay;
        var grossMonthlyRevenue = grossDailyRevenue * daysPerMonth;
        var appFeePerOrder = averageOrderValue * (commissionPercent / 100);
        var dailyLoss = appFeePerOrder * ordersPerDay;
        var monthlyLoss = dailyLoss * daysPerMonth;
        var yearlyLoss = monthlyLoss * 12;
        var directMonthlyFees = grossMonthlyRevenue * (directFeePercent / 100);
        var directYearlyFees = directMonthlyFees * 12;
        var revenueKept = monthlyLoss - directMonthlyFees;
        var yearlySavings = yearlyLoss - directYearlyFees;
        var savingsPercent = monthlyLoss > 0 ? (revenueKept / monthlyLoss) * 100 : 0;
        var recommendation = getRecommendation(monthlyLoss, Math.max(yearlySavings, 0));

        if (
          rawAverageOrderValue < 0 ||
          rawOrdersPerDay < 0 ||
          rawCommissionPercent < 0 ||
          rawCommissionPercent > 100 ||
          rawDaysPerMonth < 0 ||
          rawDirectFeePercent < 0 ||
          rawDirectFeePercent > 100
        ) {
          setValidation("Use zero or positive values, and keep percentages between 0 and 100.");
        } else if (rawDaysPerMonth > 31) {
          setValidation("Days open per month should usually stay between 0 and 31.");
        } else {
          setValidation("");
        }

        animateValue(lossPerOrderOutput, formatMoney(appFeePerOrder));
        animateValue(dailyLossOutput, formatMoney(dailyLoss));
        animateValue(monthlyLossOutput, formatMoney(monthlyLoss));
        animateValue(yearlyLossOutput, formatMoney(yearlyLoss));
        animateValue(revenueKeptOutput, formatMoney(revenueKept));
        animateValue(savingsPercentOutput, formatPercent(savingsPercent));
        animateValue(appMonthlyFeesOutput, formatMoney(monthlyLoss));
        animateValue(appYearlyFeesOutput, formatMoney(yearlyLoss));
        animateValue(appRateOutput, formatPercent(commissionPercent));
        animateValue(directMonthlyFeesOutput, formatMoney(directMonthlyFees));
        animateValue(directYearlyFeesOutput, formatMoney(directYearlyFees));
        animateValue(differenceOutput, formatMoney(yearlySavings));

        statusBanner.style.background = recommendation.color;
        statusBanner.style.borderColor = recommendation.border;
        animateValue(statusLabel, recommendation.label);
        animateValue(statusScore, formatMoney(yearlySavings));
        bigLossText.textContent = formatMoney(yearlyLoss);
        statusText.textContent = recommendation.text;
        recommendationText.textContent = recommendation.text;
      }

      function fillExample() {
        businessNameInput.value = "Downtown Burger House";
        currencyInput.value = "USD";
        averageOrderValueInput.value = "12";
        ordersPerDayInput.value = "35";
        commissionPercentInput.value = "25";
        daysPerMonthInput.value = "30";
        directFeePercentInput.value = "3";
        calculate();
      }

      function resetInputs() {
        inputs.forEach(function (input) {
          if (input.tagName === "SELECT") {
            input.value = "USD";
          } else {
            input.value = "";
          }
        });
        calculate();
      }

      function buildResultsText() {
        var businessName = businessNameInput.value.trim() || "Restaurant";

        return [
          "Business: " + businessName,
          "Average Order Value: " + formatMoney(getNumber(averageOrderValueInput)),
          "Orders Per Day: " + (ordersPerDayInput.value || "0"),
          "Commission: " + formatPercent(getNumber(commissionPercentInput)),
          "Monthly Commission Loss: " + monthlyLossOutput.textContent,
          "Yearly Commission Loss: " + yearlyLossOutput.textContent,
          "Revenue Kept With Direct Ordering: " + revenueKeptOutput.textContent,
          "Savings Percentage: " + savingsPercentOutput.textContent
        ].join("\n");
      }

      function copyResults() {
        var text = buildResultsText();

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyButton.textContent = "Copied";
            window.setTimeout(function () {
              copyButton.textContent = "Copy Results";
            }, 1600);
          });
          return;
        }

        copyButton.textContent = "Copy not supported";
        window.setTimeout(function () {
          copyButton.textContent = "Copy Results";
        }, 1600);
      }

      function printResults() {
        window.print();
      }

      function shareResults() {
        var yearly = yearlyLossOutput.textContent;
        var text = encodeURIComponent("I am losing " + yearly + " per year to delivery apps");
        window.open("https://wa.me/?text=" + text, "_blank");
      }

      inputs.forEach(function (input) {
        input.addEventListener("input", calculate);
        input.addEventListener("change", calculate);
      });

      exampleButton.addEventListener("click", fillExample);
      resetButton.addEventListener("click", resetInputs);
      copyButton.addEventListener("click", copyResults);
      shareButton.addEventListener("click", shareResults);
      printButton.addEventListener("click", printResults);

      calculate();
    })();
