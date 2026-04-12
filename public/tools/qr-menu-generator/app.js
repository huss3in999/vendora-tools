// qr-menu-generator runtime

    (function () {
      var qrTypeInput = document.getElementById("qrType");
      var businessNameInput = document.getElementById("businessName");
      var urlInput = document.getElementById("urlInput");
      var countryCodeInput = document.getElementById("countryCode");
      var whatsAppPhoneInput = document.getElementById("whatsAppPhone");
      var whatsAppMessageInput = document.getElementById("whatsAppMessage");
      var ibanInput = document.getElementById("ibanInput");
      var bankNameInput = document.getElementById("bankNameInput");
      var accountNameInput = document.getElementById("accountNameInput");
      var amountInput = document.getElementById("amountInput");
      var phoneInput = document.getElementById("phoneInput");
      var emailAddressInput = document.getElementById("emailAddress");
      var emailSubjectInput = document.getElementById("emailSubject");
      var emailBodyInput = document.getElementById("emailBody");
      var smsNumberInput = document.getElementById("smsNumber");
      var smsMessageInput = document.getElementById("smsMessage");
      var wifiSsidInput = document.getElementById("wifiSsid");
      var wifiPasswordInput = document.getElementById("wifiPassword");
      var wifiEncryptionInput = document.getElementById("wifiEncryption");
      var customTextInput = document.getElementById("customText");
      var qrNoteInput = document.getElementById("qrNote");
      var qrSizeInput = document.getElementById("qrSize");
      var cornerStyleInput = document.getElementById("cornerStyle");
      var foregroundColorInput = document.getElementById("foregroundColor");
      var backgroundColorInput = document.getElementById("backgroundColor");
      var logoUploadInput = document.getElementById("logoUpload");
      var errorCorrectionInput = document.getElementById("errorCorrection");
      var bulkInput = document.getElementById("bulkInput");
      var urlField = document.getElementById("urlField");
      var countryCodeField = document.getElementById("countryCodeField");
      var whatsAppPhoneField = document.getElementById("whatsAppPhoneField");
      var whatsAppMessageField = document.getElementById("whatsAppMessageField");
      var paymentFields = document.getElementById("paymentFields");
      var phoneField = document.getElementById("phoneField");
      var textField = document.getElementById("textField");
      var generateButton = document.getElementById("generateButton");
      var exampleButton = document.getElementById("exampleButton");
      var resetButton = document.getElementById("resetButton");
      var removeLogoButton = document.getElementById("removeLogoButton");
      var copyLinkButton = document.getElementById("copyLinkButton");
      var testQrButton = document.getElementById("testQrButton");
      var downloadPngButton = document.getElementById("downloadPngButton");
      var downloadSvgButton = document.getElementById("downloadSvgButton");
      var downloadPosterButton = document.getElementById("downloadPosterButton");
      var printButton = document.getElementById("printButton");
      var bulkGenerateButton = document.getElementById("bulkGenerateButton");
      var errorBox = document.getElementById("errorBox");
      var qrFrame = document.getElementById("qrFrame");
      var qrImage = document.getElementById("qrImage");
      var logoPreview = document.getElementById("logoPreview");
      var previewName = document.getElementById("previewName");
      var previewNote = document.getElementById("previewNote");
      var destinationOutput = document.getElementById("destinationOutput");
      var contentOutput = document.getElementById("contentOutput");
      var sizeOutput = document.getElementById("sizeOutput");
      var modeOutput = document.getElementById("modeOutput");
      var bulkList = document.getElementById("bulkList");
      var logoDataUrl = "";

      function sanitizeHex(value, fallback) {
        return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
      }

      function getQrLabel() {
        var labels = {
          menu: "Menu URL",
          website: "Website / ordering",
          whatsapp: "WhatsApp",
          payment: "Bank / IBAN",
          phone: "Phone (tel)",
          sms: "SMS",
          email: "Email (mailto)",
          wifi: "Guest Wi‑Fi",
          text: "Custom text"
        };
        return labels[qrTypeInput.value] || "QR Code";
      }

      function escapeWifiField(value) {
        return String(value || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/:/g, "\\:");
      }

      function getQrPayload() {
        var type = qrTypeInput.value;
        if (type === "menu" || type === "website") {
          var url = urlInput.value.trim();
          if (!/^https?:\/\/.+/i.test(url)) throw new Error("Please enter a valid URL starting with http:// or https://");
          return url;
        }
        if (type === "whatsapp") {
          var countryCode = countryCodeInput.value.replace(/\D/g, "");
          var phone = whatsAppPhoneInput.value.replace(/\D/g, "");
          if (!countryCode || !phone) throw new Error("Please enter a valid country code and WhatsApp phone number.");
          var message = whatsAppMessageInput.value.trim() || ("Hello " + (businessNameInput.value.trim() || "restaurant") + ", I want to place an order");
          var waUrl = "https://wa.me/" + countryCode + phone;
          if (message) waUrl += "?text=" + encodeURIComponent(message);
          return waUrl;
        }
        if (type === "payment") {
          var iban = ibanInput.value.trim();
          var bankName = bankNameInput.value.trim();
          var accountName = accountNameInput.value.trim();
          var amount = amountInput.value.trim();
          if (!iban || !bankName || !accountName) throw new Error("Please enter IBAN, bank name, and account name for the payment QR.");
          return [
            "PAYMENT QR",
            "Business: " + (businessNameInput.value.trim() || "Restaurant"),
            "Bank: " + bankName,
            "Account: " + accountName,
            "IBAN: " + iban,
            amount ? "Amount: " + amount : "Amount: Open"
          ].join("\n");
        }
        if (type === "phone") {
          var phoneValue = phoneInput.value.trim();
          if (!phoneValue) throw new Error("Please enter a phone number.");
          return "tel:" + phoneValue.replace(/\s+/g, "");
        }
        if (type === "email") {
          var em = emailAddressInput.value.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error("Please enter a valid email address.");
          var subj = emailSubjectInput.value.trim();
          var bod = emailBodyInput.value.trim();
          var mailto = "mailto:" + em;
          var q = [];
          if (subj) q.push("subject=" + encodeURIComponent(subj));
          if (bod) q.push("body=" + encodeURIComponent(bod));
          if (q.length) mailto += "?" + q.join("&");
          return mailto;
        }
        if (type === "sms") {
          var smsNum = smsNumberInput.value.replace(/[^\d+]/g, "");
          if (!smsNum || smsNum.length < 6) throw new Error("Please enter a mobile number with country code (e.g. +97333123456).");
          var smsBody = smsMessageInput.value.trim();
          var smsUri = "sms:" + smsNum + (smsBody ? "?body=" + encodeURIComponent(smsBody) : "");
          return smsUri;
        }
        if (type === "wifi") {
          var ssidRaw = wifiSsidInput.value.trim();
          if (!ssidRaw) throw new Error("Please enter the Wi‑Fi network name (SSID).");
          var encType = wifiEncryptionInput.value;
          var passRaw = wifiPasswordInput.value;
          if (encType !== "nopass" && !String(passRaw).trim()) {
            throw new Error("Enter the Wi‑Fi password, or choose “Open network” in Security.");
          }
          var ssid = escapeWifiField(ssidRaw);
          var pwd = encType === "nopass" ? "" : escapeWifiField(passRaw);
          return "WIFI:T:" + encType + ";S:" + ssid + ";P:" + pwd + ";;";
        }
        var text = customTextInput.value.trim();
        if (!text) throw new Error("Please enter custom text for the QR code.");
        return text;
      }

      function getQrUrl(format, content) {
        var size = parseInt(qrSizeInput.value, 10) || 320;
        var color = sanitizeHex(foregroundColorInput.value, "#111111").replace("#", "");
        var bg = sanitizeHex(backgroundColorInput.value, "#ffffff").replace("#", "");
        var ecc = errorCorrectionInput.checked ? "H" : "M";
        return "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&format=" + format + "&color=" + color + "&bgcolor=" + bg + "&ecc=" + ecc + "&margin=12&data=" + encodeURIComponent(content);
      }

      function setError(message) {
        errorBox.textContent = message || "";
        errorBox.style.display = message ? "block" : "none";
      }

      function updateVisibleFields() {
        var type = qrTypeInput.value;
        urlField.classList.toggle("hidden", !(type === "menu" || type === "website"));
        countryCodeField.classList.toggle("hidden", type !== "whatsapp");
        whatsAppPhoneField.classList.toggle("hidden", type !== "whatsapp");
        whatsAppMessageField.classList.toggle("hidden", type !== "whatsapp");
        paymentFields.classList.toggle("hidden", type !== "payment");
        phoneField.classList.toggle("hidden", type !== "phone");
        emailFields.classList.toggle("hidden", type !== "email");
        smsFields.classList.toggle("hidden", type !== "sms");
        wifiFields.classList.toggle("hidden", type !== "wifi");
        textField.classList.toggle("hidden", type !== "text");
      }

      function applyPreviewFrameStyle() {
        var style = cornerStyleInput.value;
        qrFrame.style.borderRadius = style === "rounded" ? "40px" : "28px";
        qrFrame.style.padding = style === "poster" ? "28px" : "18px";
        qrFrame.style.transform = style === "table-tent" ? "perspective(900px) rotateX(8deg)" : "none";
        qrFrame.style.boxShadow = style === "poster"
          ? "0 30px 60px rgba(0, 0, 0, 0.28)"
          : "0 24px 50px rgba(0, 0, 0, 0.22)";
      }

      function renderQr() {
        try {
          var payload = getQrPayload();
          var size = parseInt(qrSizeInput.value, 10) || 320;
          var pngUrl = getQrUrl("png", payload);
          setError("");
          applyPreviewFrameStyle();
          qrImage.src = pngUrl;
          qrImage.style.width = size + "px";
          qrImage.style.height = size + "px";
          qrImage.style.background = sanitizeHex(backgroundColorInput.value, "#ffffff");
          previewName.textContent = businessNameInput.value.trim() || "Your restaurant name";
          previewNote.textContent = qrNoteInput.value.trim() || "Scan to view your menu";
          destinationOutput.textContent = getQrLabel();
          contentOutput.textContent = payload;
          sizeOutput.textContent = size + " x " + size;
          modeOutput.textContent = "PNG / SVG ready";
        } catch (error) {
          setError(error.message);
        }
      }

      function removeLogo() {
        logoDataUrl = "";
        logoPreview.src = "";
        logoPreview.classList.add("hidden");
        logoUploadInput.value = "";
      }

      function fillExample() {
        qrTypeInput.value = "menu";
        businessNameInput.value = "Sample Restaurant";
        urlInput.value = "https://getvendora.net/menu/sample-restaurant";
        qrNoteInput.value = "Scan to view our menu";
        qrSizeInput.value = "320";
        foregroundColorInput.value = "#111111";
        backgroundColorInput.value = "#ffffff";
        cornerStyleInput.value = "simple";
        errorCorrectionInput.checked = true;
        whatsAppMessageInput.value = "";
        countryCodeInput.value = "";
        whatsAppPhoneInput.value = "";
        ibanInput.value = "";
        bankNameInput.value = "";
        accountNameInput.value = "";
        amountInput.value = "";
        phoneInput.value = "";
        emailAddressInput.value = "";
        emailSubjectInput.value = "";
        emailBodyInput.value = "";
        smsNumberInput.value = "";
        smsMessageInput.value = "";
        wifiSsidInput.value = "";
        wifiPasswordInput.value = "";
        wifiEncryptionInput.value = "WPA";
        customTextInput.value = "";
        removeLogo();
        updateVisibleFields();
        renderQr();
      }

      function resetForm() {
        qrTypeInput.value = "menu";
        businessNameInput.value = "";
        urlInput.value = "";
        countryCodeInput.value = "";
        whatsAppPhoneInput.value = "";
        whatsAppMessageInput.value = "";
        ibanInput.value = "";
        bankNameInput.value = "";
        accountNameInput.value = "";
        amountInput.value = "";
        phoneInput.value = "";
        emailAddressInput.value = "";
        emailSubjectInput.value = "";
        emailBodyInput.value = "";
        smsNumberInput.value = "";
        smsMessageInput.value = "";
        wifiSsidInput.value = "";
        wifiPasswordInput.value = "";
        wifiEncryptionInput.value = "WPA";
        customTextInput.value = "";
        qrNoteInput.value = "";
        qrSizeInput.value = "320";
        foregroundColorInput.value = "#111111";
        backgroundColorInput.value = "#ffffff";
        cornerStyleInput.value = "simple";
        errorCorrectionInput.checked = true;
        bulkInput.value = "";
        bulkList.innerHTML = "";
        removeLogo();
        updateVisibleFields();
        renderQr();
      }

      function downloadFile(url, fileName) {
        var link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      function getFileBaseName() {
        var name = (businessNameInput.value.trim() || "restaurant-qr").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return name.replace(/^-+|-+$/g, "") || "restaurant-qr";
      }

      function downloadPng() {
        try {
          downloadFile(getQrUrl("png", getQrPayload()), getFileBaseName() + ".png");
        } catch (error) {
          setError(error.message);
        }
      }

      function downloadSvg() {
        try {
          downloadFile(getQrUrl("svg", getQrPayload()), getFileBaseName() + ".svg");
        } catch (error) {
          setError(error.message);
        }
      }

      function downloadPoster() {
        try {
          var payload = getQrPayload();
          var pngUrl = getQrUrl("png", payload);
          var posterWindow = window.open("", "_blank", "width=900,height=1200");
          if (!posterWindow) return;
          posterWindow.document.write("<!DOCTYPE html><html><head><title>A4 Poster</title><style>@page{size:A4;margin:18mm;}body{font-family:Arial,sans-serif;color:#111;margin:0;text-align:center;} .poster{border:2px solid #111827;border-radius:24px;padding:36px;min-height:250mm;display:flex;flex-direction:column;justify-content:center;align-items:center;} h1{font-size:32px;margin:0 0 18px;} p{font-size:20px;color:#4b5563;margin:8px 0 0;} img{width:380px;height:380px;object-fit:contain;background:#fff;padding:16px;border-radius:24px;box-shadow:0 12px 30px rgba(0,0,0,.12);} .brand{margin-top:26px;font-size:14px;color:#6b7280;}</style></head><body><div class='poster'><h1>" + (businessNameInput.value.trim() || "Restaurant Menu") + "</h1><img src='" + pngUrl + "' alt='QR Code'><p>Scan to view menu</p><div class='brand'>Powered by Vendora</div></div></body></html>");
          posterWindow.document.close();
          posterWindow.focus();
          posterWindow.print();
        } catch (error) {
          setError(error.message);
        }
      }

      function copyLink() {
        try {
          var payload = getQrPayload();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(payload).then(function () {
              copyLinkButton.textContent = "Copied Link";
              window.setTimeout(function () { copyLinkButton.textContent = "Copy Link"; }, 1600);
            });
            return;
          }
        } catch (error) {
          setError(error.message);
        }
      }

      function testQr() {
        try {
          var payload = getQrPayload();
          if (/^WIFI:/i.test(payload)) {
            setError("Wi‑Fi QR: scan with a phone camera (browser cannot “open” this). Download PNG and print or display on screen.");
            return;
          }
          if (/^(https?:\/\/|tel:|mailto:|sms:)/i.test(payload)) {
            window.open(payload, "_blank");
            return;
          }
          setError("This type is text or payment info—use a phone camera to scan the QR, or use “Copy link” for the raw content.");
        } catch (error) {
          setError(error.message);
        }
      }

      function printQr() {
        try {
          var pngUrl = getQrUrl("png", getQrPayload());
          var printWindow = window.open("", "_blank", "width=900,height=900");
          if (!printWindow) return;
          printWindow.document.write("<!DOCTYPE html><html><head><title>Print QR</title><style>body{font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:40px;text-align:center;}img{width:320px;height:320px;object-fit:contain;}h1{margin:0 0 10px;}p{color:#555;}.frame{display:inline-block;padding:18px;border-radius:24px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.12);position:relative;}.logo{position:absolute;inset:0;margin:auto;width:72px;height:72px;object-fit:cover;border-radius:16px;background:#fff;padding:8px;}</style></head><body><h1>" + (businessNameInput.value.trim() || "Restaurant QR") + "</h1><p>" + (qrNoteInput.value.trim() || "Scan to view") + "</p><div class='frame'><img src='" + pngUrl + "' alt='QR Code'>" + (logoDataUrl ? "<img class='logo' src='" + logoDataUrl + "' alt='Logo'>" : "") + "</div></body></html>");
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          setError(error.message);
        }
      }

      function generateBulkPreview() {
        var lines = bulkInput.value.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        bulkList.innerHTML = "";
        if (!lines.length) return;
        lines.forEach(function (line, index) {
          var item = document.createElement("article");
          item.className = "bulk-item";
          var image = document.createElement("img");
          image.className = "bulk-thumb";
          image.alt = "Bulk QR " + (index + 1);
          image.src = getQrUrl("png", line);
          var text = document.createElement("div");
          text.className = "bulk-text";
          text.innerHTML = "<strong>QR " + (index + 1) + "</strong><br>" + line;
          item.appendChild(image);
          item.appendChild(text);
          bulkList.appendChild(item);
        });
      }

      qrTypeInput.addEventListener("change", updateVisibleFields);
      generateButton.addEventListener("click", renderQr);
      exampleButton.addEventListener("click", fillExample);
      resetButton.addEventListener("click", resetForm);
      removeLogoButton.addEventListener("click", removeLogo);
      copyLinkButton.addEventListener("click", copyLink);
      testQrButton.addEventListener("click", testQr);
      downloadPngButton.addEventListener("click", downloadPng);
      downloadSvgButton.addEventListener("click", downloadSvg);
      downloadPosterButton.addEventListener("click", downloadPoster);
      printButton.addEventListener("click", printQr);
      bulkGenerateButton.addEventListener("click", generateBulkPreview);
      logoUploadInput.addEventListener("change", function () {
        var file = logoUploadInput.files && logoUploadInput.files[0];
        if (!file) { removeLogo(); return; }
        var reader = new FileReader();
        reader.onload = function (event) {
          logoDataUrl = event.target.result;
          logoPreview.src = logoDataUrl;
          logoPreview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
      });
      [businessNameInput, urlInput, countryCodeInput, whatsAppPhoneInput, whatsAppMessageInput, ibanInput, bankNameInput, accountNameInput, amountInput, phoneInput, emailAddressInput, emailSubjectInput, emailBodyInput, smsNumberInput, smsMessageInput, wifiSsidInput, wifiPasswordInput, wifiEncryptionInput, customTextInput, qrNoteInput, qrSizeInput, cornerStyleInput, foregroundColorInput, backgroundColorInput, errorCorrectionInput].forEach(function (input) {
        input.addEventListener("input", function () { if (qrImage.src) renderQr(); });
        input.addEventListener("change", function () { if (qrImage.src) renderQr(); });
      });
      updateVisibleFields();
      fillExample();
    })();
