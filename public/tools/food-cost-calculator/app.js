// food-cost-calculator runtime

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

      var itemNameInput = document.getElementById("itemName");
      var currencyInput = document.getElementById("currency");
      var ingredientCostInput = document.getElementById("ingredientCost");
      var packagingCostInput = document.getElementById("packagingCost");
      var additionalCostInput = document.getElementById("additionalCost");
      var sellingPriceInput = document.getElementById("sellingPrice");
      var vatPercentInput = document.getElementById("vatPercent");
      var targetFoodCostInput = document.getElementById("targetFoodCost");
      var targetProfitMarginInput = document.getElementById("targetProfitMargin");
      var validationMessage = document.getElementById("validationMessage");
      var exampleButton = document.getElementById("exampleButton");
      var resetButton = document.getElementById("resetButton");
      var copyButton = document.getElementById("copyButton");
      var printButton = document.getElementById("printButton");

      var totalCostOutput = document.getElementById("totalCostOutput");
      var foodCostOutput = document.getElementById("foodCostOutput");
      var profitOutput = document.getElementById("profitOutput");
      var profitMarginOutput = document.getElementById("profitMarginOutput");
      var suggestedPriceOutput = document.getElementById("suggestedPriceOutput");
      var requiredPriceOutput = document.getElementById("requiredPriceOutput");
      var statusBanner = document.getElementById("statusBanner");
      var statusLabel = document.getElementById("statusLabel");
      var statusScore = document.getElementById("statusScore");
      var statusText = document.getElementById("statusText");
      var recommendationShort = document.getElementById("recommendationShort");
      var recommendationText = document.getElementById("recommendationText");

      var inputs = [
        itemNameInput,
        currencyInput,
        ingredientCostInput,
        packagingCostInput,
        additionalCostInput,
        sellingPriceInput,
        vatPercentInput,
        targetFoodCostInput,
        targetProfitMarginInput
      ];

      function getNumber(input) {
        return parseFloat(input.value) || 0;
      }

      function getCurrency() {
        return currencyConfig[currencyInput.value] || currencyConfig.USD;
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

      function setValidation(message) {
        validationMessage.textContent = message || "";
        validationMessage.style.display = message ? "block" : "none";
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

      function getStatusData(profitMargin) {
        if (profitMargin < 0) {
          return {
            label: "Negative",
            color: "linear-gradient(135deg, rgba(255, 107, 107, 0.18), rgba(255, 107, 107, 0.08))",
            border: "rgba(255, 107, 107, 0.26)",
            text: "Loss detected. Adjust immediately.",
            short: "Negative"
          };
        }

        if (profitMargin >= 60) {
          return {
            label: "Excellent",
            color: "linear-gradient(135deg, rgba(0, 208, 132, 0.22), rgba(0, 208, 132, 0.08))",
            border: "rgba(0, 208, 132, 0.24)",
            text: "Excellent margin. Strong pricing.",
            short: "Excellent"
          };
        }

        if (profitMargin >= 30) {
          return {
            label: "Medium",
            color: "linear-gradient(135deg, rgba(0, 208, 132, 0.16), rgba(59, 130, 246, 0.08))",
            border: "rgba(59, 130, 246, 0.24)",
            text: "Good margin. Acceptable pricing.",
            short: "Good"
          };
        }

        if (profitMargin >= 0) {
          return {
            label: "Low",
            color: "linear-gradient(135deg, rgba(255, 200, 87, 0.18), rgba(255, 200, 87, 0.08))",
            border: "rgba(255, 200, 87, 0.28)",
            text: "Low margin. Consider increasing price.",
            short: "Low"
          };
        }

        return {
          label: "Negative",
          color: "linear-gradient(135deg, rgba(255, 107, 107, 0.18), rgba(255, 107, 107, 0.08))",
          border: "rgba(255, 107, 107, 0.26)",
          text: "Loss detected. Adjust immediately.",
          short: "Negative"
        };
      }

      function calculate() {
        var ingredientCost = getNumber(ingredientCostInput);
        var packagingCost = getNumber(packagingCostInput);
        var additionalCost = getNumber(additionalCostInput);
        var sellingPrice = getNumber(sellingPriceInput);
        var vatPercent = getNumber(vatPercentInput);
        var targetFoodCost = getNumber(targetFoodCostInput);
        var targetProfitMargin = getNumber(targetProfitMarginInput);
        var validation = "";

        var totalCost = ingredientCost + packagingCost + additionalCost;
        var priceBeforeVat = vatPercent > 0 ? sellingPrice / (1 + vatPercent / 100) : sellingPrice;
        var foodCost = priceBeforeVat > 0 ? (totalCost / priceBeforeVat) * 100 : 0;
        var profit = priceBeforeVat - totalCost;
        var profitMargin = priceBeforeVat > 0 ? (profit / priceBeforeVat) * 100 : 0;
        var suggestedPrice = targetFoodCost > 0 ? totalCost / (targetFoodCost / 100) : 0;
        var requiredPrice = targetProfitMargin > 0 && targetProfitMargin < 100
          ? totalCost / (1 - targetProfitMargin / 100)
          : 0;
        var status = getStatusData(profitMargin);

        if (ingredientCost < 0 || packagingCost < 0 || additionalCost < 0 || sellingPrice < 0 || vatPercent < 0 || targetFoodCost < 0 || targetProfitMargin < 0) {
          validation = "Use zero or positive values for costs, selling price, VAT, and targets.";
        } else if (targetFoodCost >= 100) {
          validation = "Target food cost percentage must be lower than 100.";
        } else if (targetProfitMargin >= 100) {
          validation = "Target profit margin must be lower than 100.";
        } else if (!sellingPriceInput.value) {
          validation = "Add a selling price to unlock profit and margin analysis.";
        } else if (sellingPrice > 0 && priceBeforeVat <= totalCost) {
          validation = "Your selling price is too low to create healthy profit after costs" + (vatPercent > 0 ? " and VAT" : "") + ".";
        }
        setValidation(validation);

        animateValue(totalCostOutput, formatMoney(totalCost));
        animateValue(foodCostOutput, formatPercent(Math.max(foodCost, 0)));
        animateValue(profitOutput, formatMoney(profit));
        animateValue(profitMarginOutput, formatPercent(profitMargin));
        animateValue(suggestedPriceOutput, formatMoney(suggestedPrice));
        animateValue(requiredPriceOutput, formatMoney(requiredPrice));

        statusBanner.style.background = status.color;
        statusBanner.style.borderColor = status.border;
        animateValue(statusLabel, status.label);
        animateValue(statusScore, formatPercent(profitMargin));
        statusText.textContent = status.text;
        animateValue(recommendationShort, status.short);
        recommendationText.textContent = status.text;
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

      function fillExample() {
        itemNameInput.value = "Classic Burger";
        currencyInput.value = "USD";
        ingredientCostInput.value = "2.5";
        packagingCostInput.value = "0.5";
        additionalCostInput.value = "0.5";
        sellingPriceInput.value = "8";
        vatPercentInput.value = "0";
        targetFoodCostInput.value = "30";
        targetProfitMarginInput.value = "60";
        calculate();
      }

      function buildResultsText() {
        var itemName = itemNameInput.value.trim() || "Untitled item";

        return [
          "Item: " + itemName,
          "Cost: " + totalCostOutput.textContent,
          "Selling Price: " + formatMoney(getNumber(sellingPriceInput)),
          "Food Cost: " + foodCostOutput.textContent,
          "Profit: " + profitOutput.textContent
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

      inputs.forEach(function (input) {
        input.addEventListener("input", calculate);
        input.addEventListener("change", calculate);
      });

      exampleButton.addEventListener("click", fillExample);
      resetButton.addEventListener("click", resetInputs);
      copyButton.addEventListener("click", copyResults);
      printButton.addEventListener("click", printResults);

      calculate();
    })();
