// menu-price-calculator runtime

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
      var totalCostInput = document.getElementById("totalCost");
      var profitMarginInput = document.getElementById("profitMargin");
      var vatPercentInput = document.getElementById("vatPercent");
      var discountPercentInput = document.getElementById("discountPercent");
      var currentSellingPriceInput = document.getElementById("currentSellingPrice");
      var profitToggleInput = document.getElementById("profitToggle");
      var targetProfitAmountInput = document.getElementById("targetProfitAmount");
      var targetProfitField = document.getElementById("targetProfitField");
      var exampleButton = document.getElementById("exampleButton");
      var resetButton = document.getElementById("resetButton");
      var copyButton = document.getElementById("copyButton");
      var printButton = document.getElementById("printButton");

      var suggestedPriceOutput = document.getElementById("suggestedPriceOutput");
      var profitPerItemOutput = document.getElementById("profitPerItemOutput");
      var profitMarginOutput = document.getElementById("profitMarginOutput");
      var finalVatPriceOutput = document.getElementById("finalVatPriceOutput");
      var finalDiscountPriceOutput = document.getElementById("finalDiscountPriceOutput");
      var profitDifferenceOutput = document.getElementById("profitDifferenceOutput");
      var profitComparisonText = document.getElementById("profitComparisonText");
      var statusBanner = document.getElementById("statusBanner");
      var statusLabel = document.getElementById("statusLabel");
      var statusScore = document.getElementById("statusScore");
      var impactText = document.getElementById("impactText");
      var statusText = document.getElementById("statusText");
      var recommendationShort = document.getElementById("recommendationShort");
      var recommendationText = document.getElementById("recommendationText");
      var validationMessage = document.getElementById("validationMessage");

      var inputs = [
        itemNameInput,
        currencyInput,
        totalCostInput,
        profitMarginInput,
        vatPercentInput,
        discountPercentInput,
        currentSellingPriceInput,
        profitToggleInput,
        targetProfitAmountInput
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

      function setValidation(message) {
        if (!validationMessage) {
          return;
        }

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

      function getRecommendation(margin) {
        if (margin < 40) {
          return {
            label: "Low price",
            color: "linear-gradient(135deg, rgba(255, 200, 87, 0.18), rgba(255, 200, 87, 0.08))",
            border: "rgba(255, 200, 87, 0.28)",
            text: "You are losing profit. Increase your price.",
            short: "Underpriced"
          };
        }

        if (margin <= 70) {
          return {
            label: "Balanced",
            color: "linear-gradient(135deg, rgba(0, 208, 132, 0.18), rgba(0, 208, 132, 0.08))",
            border: "rgba(0, 208, 132, 0.24)",
            text: "This is a healthy pricing strategy.",
            short: "Balanced"
          };
        }

        return {
          label: "High",
          color: "linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(59, 130, 246, 0.08))",
          border: "rgba(59, 130, 246, 0.24)",
          text: "High pricing. Ensure customer demand supports this.",
          short: "Premium"
        };
      }

      function updateProfitMode() {
        targetProfitField.style.display = profitToggleInput.checked ? "grid" : "none";
      }

      function calculate() {
        var totalCost = getNumber(totalCostInput);
        var desiredMargin = getNumber(profitMarginInput);
        var vatPercent = getNumber(vatPercentInput);
        var discountPercent = getNumber(discountPercentInput);
        var currentSellingPrice = getNumber(currentSellingPriceInput);
        var targetProfitAmount = getNumber(targetProfitAmountInput);
        var useProfitMode = profitToggleInput.checked;
        var validation = "";

        var suggestedPrice = 0;

        if (totalCost < 0 || desiredMargin < 0 || vatPercent < 0 || discountPercent < 0 || currentSellingPrice < 0 || targetProfitAmount < 0) {
          validation = "Use zero or positive values for costs, prices, VAT, discounts, and target profit.";
        } else if (discountPercent > 100) {
          validation = "Discount percentage must stay between 0 and 100.";
        } else if (!useProfitMode && desiredMargin >= 100) {
          validation = "Desired profit margin must be lower than 100% to calculate a selling price.";
        }

        if (useProfitMode && targetProfitAmount > 0 && !validation) {
          suggestedPrice = totalCost + targetProfitAmount;
        } else if (desiredMargin > 0 && desiredMargin < 100 && !validation) {
          suggestedPrice = totalCost / (1 - desiredMargin / 100);
        }

        var profitPerItem = suggestedPrice - totalCost;
        var actualMargin = suggestedPrice > 0 ? (profitPerItem / suggestedPrice) * 100 : 0;
        var finalVatPrice = suggestedPrice * (1 + vatPercent / 100);
        var finalDiscountPrice = finalVatPrice * (1 - discountPercent / 100);
        var currentProfit = currentSellingPrice - totalCost;
        var profitDifference = profitPerItem - currentProfit;
        var recommendation = getRecommendation(actualMargin);
        setValidation(validation);

        animateValue(suggestedPriceOutput, formatMoney(suggestedPrice));
        animateValue(profitPerItemOutput, formatMoney(profitPerItem));
        animateValue(profitMarginOutput, formatPercent(actualMargin));
        animateValue(finalVatPriceOutput, formatMoney(finalVatPrice));
        animateValue(finalDiscountPriceOutput, formatMoney(finalDiscountPrice));
        animateValue(profitDifferenceOutput, formatMoney(profitDifference));

        statusBanner.style.background = recommendation.color;
        statusBanner.style.borderColor = recommendation.border;
        animateValue(statusLabel, recommendation.label);
        animateValue(statusScore, formatPercent(actualMargin));
        impactText.textContent = "You should sell this item at " + formatMoney(suggestedPrice) + " to stay profitable";
        statusText.textContent = recommendation.text;
        animateValue(recommendationShort, recommendation.short);
        recommendationText.textContent = recommendation.text;

        if (currentSellingPrice > 0) {
          if (profitDifference > 0) {
            profitComparisonText.textContent = "You could gain " + formatMoney(profitDifference) + " more profit per item versus your current price.";
          } else if (profitDifference < 0) {
            profitComparisonText.textContent = "You could lose " + formatMoney(Math.abs(profitDifference)) + " profit per item versus your current price.";
          } else {
            profitComparisonText.textContent = "Your current selling price already matches this profit outcome.";
          }
        } else {
          profitComparisonText.textContent = "Add your current selling price to compare current vs suggested profit.";
        }

        if (!validation && !useProfitMode && profitMarginInput.value.trim() && desiredMargin === 0) {
          setValidation("Desired profit margin must be greater than zero to calculate a selling price.");
        } else if (!validation && useProfitMode && targetProfitAmountInput.value.trim() && targetProfitAmount === 0) {
          setValidation("Target profit mode needs a profit per item greater than zero.");
        }
      }

      function fillExample() {
        itemNameInput.value = "Chicken Burger";
        currencyInput.value = "USD";
        totalCostInput.value = "3";
        profitMarginInput.value = "60";
        vatPercentInput.value = "10";
        discountPercentInput.value = "0";
        currentSellingPriceInput.value = "";
        profitToggleInput.checked = false;
        targetProfitAmountInput.value = "";
        updateProfitMode();
        calculate();
      }

      function resetInputs() {
        inputs.forEach(function (input) {
          if (input.tagName === "SELECT") {
            input.value = "USD";
          } else if (input.type === "checkbox") {
            input.checked = false;
          } else {
            input.value = "";
          }
        });
        updateProfitMode();
        calculate();
      }

      function buildResultsText() {
        var itemName = itemNameInput.value.trim() || "Menu item";

        return [
          "Item: " + itemName,
          "Suggested Selling Price: " + suggestedPriceOutput.textContent,
          "Profit Per Item: " + profitPerItemOutput.textContent,
          "Profit Margin: " + profitMarginOutput.textContent,
          "Final Price After VAT: " + finalVatPriceOutput.textContent,
          "Final Price After Discount: " + finalDiscountPriceOutput.textContent,
          "Difference In Profit: " + profitDifferenceOutput.textContent
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

      profitToggleInput.addEventListener("change", function () {
        updateProfitMode();
        calculate();
      });
      exampleButton.addEventListener("click", fillExample);
      resetButton.addEventListener("click", resetInputs);
      copyButton.addEventListener("click", copyResults);
      printButton.addEventListener("click", printResults);

      updateProfitMode();
      calculate();
    })();
