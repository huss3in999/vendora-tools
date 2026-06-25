(function () {
  const DATA_KEY = "marocMarketData";
  const WHATSAPP_CLICKS = "marocMarketWhatsappClicks";
  const PASSWORD = "1234";
  let state = { settings: {}, products: [], categories: [] };
  let currentProductGallery = [];

  const DEFAULT_CATEGORIES = [
    { nameAr: "العروض", nameEn: "sale", image: "assets/images/demo-placeholders/offers-demo.svg", visible: true, sortOrder: 0 },
    { nameAr: "العطور والبخور", nameEn: "bukhoor", image: "assets/images/demo-placeholders/perfume-bakhoor-demo.svg", visible: true, sortOrder: 1 },
    { nameAr: "الحمام المغربي", nameEn: "hammam", image: "assets/images/demo-placeholders/moroccan-hammam-demo.svg", visible: true, sortOrder: 2 },
    { nameAr: "الأعشاب", nameEn: "herbs", image: "assets/images/demo-placeholders/herbs-demo.svg", visible: true, sortOrder: 3 },
    { nameAr: "زيوت طبيعية", nameEn: "oils", image: "assets/images/demo-placeholders/natural-oils-demo.svg", visible: true, sortOrder: 4 },
    { nameAr: "عناية البشرة", nameEn: "skin", image: "assets/images/demo-placeholders/skin-care-demo.svg", visible: true, sortOrder: 5 },
    { nameAr: "عناية الشعر", nameEn: "hair", image: "assets/images/demo-placeholders/hair-care-demo.svg", visible: true, sortOrder: 6 }
  ];

  function repairCategories(categories) {
    const defaults = DEFAULT_CATEGORIES;

    if (!Array.isArray(categories) || categories.length === 0) {
      return JSON.parse(JSON.stringify(defaults));
    }

    const repaired = categories.map((cat, idx) => {
      let img = cat.image || "";
      if (!img || img === "placeholder" || img.startsWith("placeholder:") || img.trim() === "") {
        const found = defaults.find(d => d.nameAr === cat.nameAr || d.nameEn === cat.nameEn);
        img = found ? found.image : "";
      }
      return {
        ...cat,
        image: img,
        visible: cat.visible !== false,
        sortOrder: cat.sortOrder !== undefined ? cat.sortOrder : idx
      };
    });

    defaults.forEach((def) => {
      const exists = repaired.some(cat => cat.nameAr === def.nameAr || cat.nameEn === def.nameEn);
      if (!exists) {
        repaired.push({ ...def, sortOrder: repaired.length });
      }
    });

    return repaired;
  }

  const TARGETS = {
    logo: { w: 500, h: 500, format: "image/png", ext: "png", maxKb: 500 },
    heroDesktop: { w: 1600, h: 520, format: "image/jpeg", ext: "jpg", maxKb: 350 },
    heroMobile: { w: 900, h: 650, format: "image/jpeg", ext: "jpg", maxKb: 300 },
    product: { w: 800, h: 800, format: "image/jpeg", ext: "jpg", maxKb: 200 },
    category: { w: 500, h: 500, format: "image/jpeg", ext: "jpg", maxKb: 120 },
    offerBanner: { w: 1200, h: 400, format: "image/jpeg", ext: "jpg", maxKb: 250 }
  };

  const API_UPLOAD = "/demo/maroc-market/api/upload-image";
  const API_DELETE = "/demo/maroc-market/api/delete-image";

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function loadData() {
    try {
      const response = await fetch("/demo/maroc-market/api/catalog", {
        headers: { 'cache-control': 'no-cache' }
      });
      if (response.ok) {
        state = await response.json();
        state.categories = repairCategories(state.categories);
        writeJson(DATA_KEY, state);
        return;
      }
    } catch (err) {
      console.warn("Failed to fetch catalog from API, trying localStorage...", err);
    }

    const saved = readJson(DATA_KEY, null);
    if (saved && Array.isArray(saved.products)) {
      state = saved;
      state.categories = repairCategories(state.categories);
      return;
    }

    try {
      const response = await fetch("assets/data/products.json");
      state = await response.json();
      state.categories = repairCategories(state.categories);
      writeJson(DATA_KEY, state);
    } catch (err) {
      console.error("Failed to load products.json fallback:", err);
    }
  }

  function formatPrice(value) {
    return `${Number(value || 0).toFixed(3)} BD`;
  }

  function placeholderSvg(label, tone = "oils") {
    const palettes = {
      oils: ["#f7ead8", "#b67524", "#0f3a22"],
      hammam: ["#f6eadc", "#7a5433", "#b22b2f"],
      herbs: ["#f4ead8", "#8c8b38", "#174a2d"],
      honey: ["#fff1c7", "#c98318", "#8a3f12"],
      skin: ["#faeadf", "#d49a7c", "#b22b2f"],
      hair: ["#efe0cc", "#7b4a29", "#0f3a22"],
      bukhoor: ["#f4e4d4", "#2f2a24", "#c99036"]
    };
    const [bg, accent, deep] = palettes[tone] || palettes.oils;
    const safe = String(label || "Maroc Market BH").replace(/[&<>"']/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" x2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#fffaf3"/></linearGradient></defs>
      <rect width="900" height="900" fill="url(#g)"/>
      <path d="M90 150h720M70 710h760" stroke="#dec8ac" stroke-width="2" opacity=".55"/>
      <ellipse cx="455" cy="672" rx="188" ry="42" fill="#d7b47b"/>
      <rect x="397" y="295" width="116" height="338" rx="34" fill="${accent}"/>
      <rect x="425" y="222" width="60" height="92" rx="22" fill="#3b1c0e"/>
      <rect x="350" y="548" width="210" height="95" rx="36" fill="#c99a54"/>
      <circle cx="610" cy="520" r="92" fill="#e5d1aa"/>
      <text x="450" y="792" text-anchor="middle" direction="rtl" font-family="Tahoma, Arial" font-size="54" font-weight="800" fill="${deep}">${safe}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function toneForProduct(product) {
    const text = `${product.id || ""} ${product.category || ""} ${product.nameAr || ""}`;
    if (text.includes("عسل") || text.includes("honey")) return "honey";
    if (text.includes("الشعر") || text.includes("hair")) return "hair";
    if (text.includes("البشرة") || text.includes("غاسول") || text.includes("skin")) return "skin";
    if (text.includes("الأعشاب") || text.includes("حناء") || text.includes("herb")) return "herbs";
    if (text.includes("بخور") || text.includes("bukhoor")) return "bukhoor";
    if (text.includes("الحمام") || text.includes("soap") || text.includes("hammam")) return "hammam";
    return "oils";
  }

  function resolveImage(product) {
    const image = String(product.image || "");
    return placeholderSvg(product.nameAr, toneForProduct(product));
  }

  function tryImage(url, onLoad) {
    if (!url || String(url).startsWith("placeholder:")) return;
    const probe = new Image();
    probe.onload = () => onLoad(probe.src);
    probe.onerror = () => {};
    probe.src = url;
  }

  function setImgWithFallback(img, localPath, fallback) {
    img.src = fallback;
    tryImage(localPath, (loadedUrl) => { img.src = loadedUrl; });
  }

  function renderStats() {
    const total = state.products.length;
    const visible = state.products.filter((item) => item.visible !== false).length;
    const hidden = state.products.filter((item) => item.visible === false).length;
    const soldOut = state.products.filter((item) => item.soldOut).length;
    const clicks = Number(localStorage.getItem(WHATSAPP_CLICKS) || 0);
    const stats = [
      ["إجمالي المنتجات", total],
      ["منتجات ظاهرة", visible],
      ["منتجات مخفية", hidden],
      ["نفد من المخزون", soldOut],
      ["ضغطات واتساب", clicks]
    ];
    document.getElementById("statsGrid").innerHTML = stats.map(([label, value]) => `
      <article class="stat-card"><strong>${value}</strong><span>${label}</span></article>
    `).join("");
  }

  function renderProducts() {
    const holder = document.getElementById("adminProducts");
    holder.innerHTML = state.products.map((product) => `
      <article class="admin-product" data-id="${product.id}">
        <img alt="">
        <div>
          <h3>${product.nameAr}</h3>
          <p>${product.category} · ${formatPrice(product.price)} · ${product.visible === false ? "مخفي" : "ظاهر"} · ${product.soldOut ? "نفد" : "متوفر"}</p>
        </div>
        <div class="admin-actions">
          <button type="button" data-action="visible">${product.visible === false ? "إظهار" : "إخفاء"}</button>
          <button type="button" data-action="sold">${product.soldOut ? "متوفر" : "نفد"}</button>
          <button type="button" data-action="edit">تعديل</button>
          <button type="button" data-action="delete">حذف</button>
        </div>
      </article>
    `).join("");
    holder.querySelectorAll(".admin-product").forEach((row) => {
      const product = state.products.find((item) => item.id === row.dataset.id);
      if (product) setImgWithFallback(row.querySelector("img"), product.image, resolveImage(product));
    });
    holder.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => handleProductAction(button.closest(".admin-product").dataset.id, button.dataset.action));
    });
  }

  async function publishCatalog() {
    try {
      const response = await fetch("/demo/maroc-market/api/catalog", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-admin-password": PASSWORD
        },
        body: JSON.stringify(state)
      });
      if (response.ok) {
        showToast("تم الحفظ ونشر التحديث بنجاح");
        return true;
      } else {
        showToast("تم الحفظ محلياً فقط، لم يتم النشر", true);
        return false;
      }
    } catch (err) {
      console.error(err);
      showToast("تم الحفظ محلياً فقط، لم يتم النشر", true);
      return false;
    }
  }

  function saveState() {
    writeJson(DATA_KEY, state);
    renderStats();
    renderProducts();
    renderCategories();
    publishCatalog();
  }

  function handleProductAction(id, action) {
    const product = state.products.find((item) => item.id === id);
    if (!product) return;
    if (action === "visible") product.visible = product.visible === false;
    if (action === "sold") product.soldOut = !product.soldOut;
    if (action === "edit") fillForm(product);
    if (action === "delete" && confirm("هل تريدين حذف المنتج؟")) {
      state.products = state.products.filter((item) => item.id !== id);
    }
    saveState();
  }

  function fillForm(product = null) {
    const form = document.getElementById("productForm");
    form.reset();
    document.getElementById("formTitle").textContent = product ? "تعديل منتج" : "إضافة منتج";
    document.getElementById("productId").value = product?.id || "";
    document.getElementById("nameAr").value = product?.nameAr || "";
    document.getElementById("nameEn").value = product?.nameEn || "";
    document.getElementById("price").value = product?.price || "";
    document.getElementById("category").value = product?.category || "";
    document.getElementById("shortDescription").value = product?.shortDescription || "";
    document.getElementById("benefits").value = product?.benefits || "";
    document.getElementById("howToUse").value = product?.howToUse || "";
    document.getElementById("suitableFor").value = product?.suitableFor || "";
    
    const mainImg = product?.image || "";
    document.getElementById("image").value = mainImg;
    document.getElementById("visible").checked = product?.visible !== false;
    document.getElementById("soldOut").checked = !!product?.soldOut;
    document.getElementById("featured").checked = product?.featured !== false;

    // Reset dropzone preview
    const previewContainer = document.getElementById("productImagePreviewContainer");
    const previewImg = document.getElementById("productImagePreview");
    const prompt = document.getElementById("productImagePrompt");
    const sizeInfo = document.getElementById("productImageSizeInfo");

    if (mainImg) {
      previewImg.src = mainImg;
      previewContainer.classList.remove("hidden");
      prompt.classList.add("hidden");
      sizeInfo.textContent = "";
    } else {
      previewContainer.classList.add("hidden");
      prompt.classList.remove("hidden");
    }

    // Set gallery
    if (product && Array.isArray(product.images)) {
      currentProductGallery = [...product.images];
    } else if (product && product.image) {
      currentProductGallery = [product.image];
    } else {
      currentProductGallery = [];
    }
    renderProductGallery();
  }

  function productFromForm() {
    const id = document.getElementById("productId").value || `product-${Date.now()}`;
    const mainImg = document.getElementById("image").value.trim();
    
    // Sync main image with gallery
    if (currentProductGallery.length > 0) {
      if (mainImg && currentProductGallery[0] !== mainImg) {
        const idx = currentProductGallery.indexOf(mainImg);
        if (idx >= 0) {
          currentProductGallery.splice(idx, 1);
        }
        currentProductGallery.unshift(mainImg);
      }
    } else if (mainImg) {
      currentProductGallery = [mainImg];
    }

    return {
      id,
      nameAr: document.getElementById("nameAr").value.trim(),
      nameEn: document.getElementById("nameEn").value.trim(),
      price: Number(document.getElementById("price").value),
      category: document.getElementById("category").value.trim(),
      shortDescription: document.getElementById("shortDescription").value.trim(),
      benefits: document.getElementById("benefits").value.trim(),
      howToUse: document.getElementById("howToUse").value.trim(),
      suitableFor: document.getElementById("suitableFor").value.trim(),
      image: mainImg || "placeholder:oils",
      images: currentProductGallery.length > 0 ? currentProductGallery : [mainImg || "placeholder:oils"],
      visible: document.getElementById("visible").checked,
      soldOut: document.getElementById("soldOut").checked,
      featured: document.getElementById("featured").checked
    };
  }

  function renderSettings() {
    document.getElementById("whatsappNumber").value = state.settings.whatsappNumber || "";
    document.getElementById("storeName").value = state.settings.storeName || "Maroc Market BH";
    document.getElementById("deliveryMessage").value = state.settings.deliveryMessage || "";
    document.getElementById("heroTitleSetting").value = state.settings.heroTitle || "";
    document.getElementById("heroSubtitleSetting").value = state.settings.heroSubtitle || "";
    document.getElementById("instagramLink").value = state.settings.instagramLink || "";
    document.getElementById("facebookLink").value = state.settings.facebookLink || "";
    document.getElementById("tiktokLink").value = state.settings.tiktokLink || "";
    document.getElementById("showOfferBanner").checked = !!state.settings.showOfferBanner;
    document.getElementById("offerBanner").value = state.settings.offerBanner || "";
    document.getElementById("footerText").value = state.settings.footerText || "";

    // Set hidden inputs for R2 Settings Images
    document.getElementById("logoInput").value = state.settings.logoImage || "";
    document.getElementById("heroDesktopInput").value = state.settings.heroDesktopImage || "";
    document.getElementById("heroMobileInput").value = state.settings.heroMobileImage || "";
    document.getElementById("offerBannerInput").value = state.settings.offerBannerImage || "";

    // Setup previews for settings images
    const updatePreview = (inputId, containerId, imgId, promptId) => {
      const val = document.getElementById(inputId).value;
      const previewContainer = document.getElementById(containerId);
      const previewImg = document.getElementById(imgId);
      const prompt = document.getElementById(promptId);
      if (val) {
        previewImg.src = val;
        previewContainer.classList.remove("hidden");
        prompt.classList.add("hidden");
      } else {
        previewContainer.classList.add("hidden");
        prompt.classList.remove("hidden");
      }
    };

    updatePreview("logoInput", "logoPreviewContainer", "logoPreview", "logoPrompt");
    updatePreview("heroDesktopInput", "heroDesktopPreviewContainer", "heroDesktopPreview", "heroDesktopPrompt");
    updatePreview("heroMobileInput", "heroMobilePreviewContainer", "heroMobilePreview", "heroMobilePrompt");
    updatePreview("offerBannerInput", "offerBannerPreviewContainer", "offerBannerPreview", "offerBannerPrompt");
  }

  // ---------------------------------------------------------------------------
  // Canvas Compression Engine
  // ---------------------------------------------------------------------------
  function compressImage(file, type) {
    return new Promise((resolve, reject) => {
      const config = TARGETS[type];
      if (!config) return reject(new Error("Invalid upload type"));

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = config.w;
          canvas.height = config.h;

          // Perform Center Crop & Draw
          const imgAspect = img.width / img.height;
          const targetAspect = config.w / config.h;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;

          if (imgAspect > targetAspect) {
            sw = img.height * targetAspect;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetAspect;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, config.w, config.h);

          // Iterate quality to try to hit target KB limit
          let quality = 0.85;
          const compressQuality = (q) => {
            canvas.toBlob((blob) => {
              if (!blob) return reject(new Error("Image generation failed"));
              if (blob.size > config.maxKb * 1024 && q > 0.4 && config.format === "image/jpeg") {
                compressQuality(q - 0.05);
              } else {
                resolve({
                  blob,
                  originalSize: file.size,
                  compressedSize: blob.size
                });
              }
            }, config.format, q);
          };

          compressQuality(quality);
        };
        img.onerror = () => reject(new Error("Could not load image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // R2 API Calls
  // ---------------------------------------------------------------------------
  function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${isError ? "error" : ""}`;
    setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  }

  async function apiUploadImage(blob, type, originalName) {
    const formData = new FormData();
    const ext = type === "logo" ? "png" : "jpg";
    const mime = type === "logo" ? "image/png" : "image/jpeg";
    const file = new File([blob], `${type}-${Date.now()}.${ext}`, { type: mime });
    formData.append("file", file);

    let backendType = "product";
    if (type === "logo") backendType = "logo";
    else if (type === "heroDesktop" || type === "heroMobile") backendType = "hero";
    else if (type === "category") backendType = "category";
    else if (type === "offerBanner") backendType = "banner";

    formData.append("type", backendType);

    const response = await fetch(API_UPLOAD, {
      method: "POST",
      headers: {
        "x-admin-password": PASSWORD
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Upload failed");
    }
    return data;
  }

  async function apiDeleteImage(key) {
    const response = await fetch(`${API_DELETE}?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: {
        "x-admin-password": PASSWORD
      }
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Delete failed");
    }
    return data;
  }

  // ---------------------------------------------------------------------------
  // Upload Dropzone Binding Helper
  // ---------------------------------------------------------------------------
  function setupUploadDropzone(elementId, fileInputId, previewContainerId, previewImgId, promptId, inputId, type, onUploadSuccess) {
    const dropzone = document.getElementById(elementId);
    const fileInput = document.getElementById(fileInputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImg = document.getElementById(previewImgId);
    const prompt = document.getElementById(promptId);
    const hiddenInput = document.getElementById(inputId);

    dropzone.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) processAndUpload(fileInput.files[0]);
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) processAndUpload(e.dataTransfer.files[0]);
    });

    async function processAndUpload(file) {
      try {
        showToast("جاري ضغط وتجهيز الصورة...");
        const result = await compressImage(file, type);
        
        showToast("جاري رفع الصورة إلى R2...");
        const uploadResult = await apiUploadImage(result.blob, type, file.name);
        
        previewImg.src = uploadResult.url;
        previewContainer.classList.remove("hidden");
        prompt.classList.add("hidden");
        
        hiddenInput.value = uploadResult.url;
        hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));

        const origSizeKb = (result.originalSize / 1024).toFixed(1);
        const compSizeKb = (result.compressedSize / 1024).toFixed(1);
        const savedPercent = Math.round((1 - result.compressedSize / result.originalSize) * 100);
        
        showToast(`تم الرفع بنجاح! الحجم: ${compSizeKb} KB (توفير ${savedPercent}%)`);
        
        if (onUploadSuccess) onUploadSuccess(uploadResult, result);
      } catch (err) {
        console.error(err);
        showToast(`خطأ أثناء الرفع: ${err.message}`, true);
      }
    }
  }

  function removeImageFromState(url) {
    if (!url) return;
    
    // Clean settings
    if (state.settings.logoImage === url) state.settings.logoImage = "";
    if (state.settings.heroDesktopImage === url) state.settings.heroDesktopImage = "";
    if (state.settings.heroMobileImage === url) state.settings.heroMobileImage = "";
    if (state.settings.offerBannerImage === url) state.settings.offerBannerImage = "";
    
    // Clean categories
    if (Array.isArray(state.categories)) {
      state.categories.forEach((cat) => {
        if (cat.image === url) cat.image = "";
      });
    }
    
    // Clean products
    if (Array.isArray(state.products)) {
      state.products.forEach((prod) => {
        if (prod.image === url) prod.image = "placeholder:oils";
        if (Array.isArray(prod.images)) {
          prod.images = prod.images.filter((img) => img !== url);
          if (prod.images.length === 0) {
            prod.images = [prod.image];
          }
        }
      });
    }

    // Clean current product gallery if editing the product currently
    if (Array.isArray(currentProductGallery)) {
      currentProductGallery = currentProductGallery.filter((img) => img !== url);
    }
    
    saveState();
  }

  function setupDeleteButton(btnId, hiddenInputId, previewContainerId, promptId) {
    const btn = document.getElementById(btnId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const previewContainer = document.getElementById(previewContainerId);
    const prompt = document.getElementById(promptId);

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const url = hiddenInput.value;
      if (!url) return;

      if (!confirm("هل أنت متأكد من حذف هذه الصورة؟")) return;

      let deletedFromR2 = false;
      if (url.startsWith("/demo/maroc-market/api/assets/")) {
        const key = url.replace("/demo/maroc-market/api/assets/", "");
        try {
          showToast("جاري حذف الصورة...");
          await apiDeleteImage(key);
          showToast("تم حذف الصورة بنجاح");
          deletedFromR2 = true;
        } catch (err) {
          console.error(err);
          showToast("لم يتم حذف الصورة", true);
          return;
        }
      }

      hiddenInput.value = "";
      hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
      previewContainer.classList.add("hidden");
      prompt.classList.remove("hidden");

      if (deletedFromR2) {
        removeImageFromState(url);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Gallery Previews
  // ---------------------------------------------------------------------------
  function renderProductGallery() {
    const container = document.getElementById("productGalleryPreviews");
    container.innerHTML = currentProductGallery.map((url, index) => {
      const isMain = index === 0;
      return `
        <div class="gallery-item" data-index="${index}">
          <img src="${url}" alt="Gallery Image">
          <button type="button" class="remove-btn" title="إزالة">×</button>
          ${isMain ? '<span class="main-badge">الرئيسية</span>' : ''}
        </div>
      `;
    }).join("");

    container.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = btn.closest(".gallery-item");
        const idx = parseInt(item.dataset.index);
        
        if (confirm("هل تريدين إزالة هذه الصورة من المعرض؟ (ملاحظة: الصورة ستظل على سيرفر R2)")) {
          currentProductGallery.splice(idx, 1);
          renderProductGallery();
          const mainInput = document.getElementById("image");
          mainInput.value = currentProductGallery[0] || "";
          mainInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Category Rendering and Action Handling
  // ---------------------------------------------------------------------------
  function renderCategories() {
    const container = document.getElementById("adminCategories");
    const sorted = [...state.categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    container.innerHTML = sorted.map((cat) => {
      const catImage = cat.image || "";
      const isVisible = cat.visible !== false;
      return `
        <article class="category-card" data-id="${cat.nameEn}">
          <img src="${catImage || placeholderSvg(cat.nameAr, 'oils')}" alt="${cat.nameAr}">
          <div class="category-card-info">
            <h4>${cat.nameAr}</h4>
            <p>${cat.nameEn} · الترتيب: ${cat.sortOrder || 0} · ${isVisible ? "ظاهر" : "مخفي"}</p>
          </div>
          <div class="category-card-actions">
            <button type="button" data-action="edit">تعديل</button>
            <button type="button" data-action="delete">حذف</button>
          </div>
        </article>
      `;
    }).join("");

    container.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".category-card");
        handleCategoryAction(card.dataset.id, btn.dataset.action);
      });
    });
  }

  function handleCategoryAction(id, action) {
    const cat = state.categories.find((c) => c.nameEn === id);
    if (!cat) return;
    if (action === "edit") {
      fillCategoryForm(cat);
    } else if (action === "delete") {
      if (confirm(`هل تريدين حذف التصنيف "${cat.nameAr}"؟`)) {
        const used = state.products.some((p) => p.category === cat.nameAr);
        if (used) {
          if (!confirm(`تحذير: هذا التصنيف مستخدم في بعض المنتجات. هل تريدين حذفه على أي حال؟`)) {
            return;
          }
        }
        state.categories = state.categories.filter((c) => c.nameEn !== id);
        saveState();
      }
    }
  }

  function fillCategoryForm(cat = null) {
    const form = document.getElementById("categoryForm");
    form.classList.remove("hidden");
    
    if (cat) {
      document.getElementById("catFormTitle").textContent = "تعديل تصنيف";
      document.getElementById("categoryId").value = cat.nameEn;
      document.getElementById("catNameAr").value = cat.nameAr;
      document.getElementById("catNameEn").value = cat.nameEn;
      document.getElementById("catNameEn").disabled = true;
      document.getElementById("catVisible").checked = cat.visible !== false;
      document.getElementById("catOrder").value = cat.sortOrder || 0;
      
      const imgPath = cat.image || "";
      document.getElementById("catImageInput").value = imgPath;
      
      const previewContainer = document.getElementById("catPreviewContainer");
      const previewImg = document.getElementById("catPreview");
      const prompt = document.getElementById("catPrompt");
      
      if (imgPath) {
        previewImg.src = imgPath;
        previewContainer.classList.remove("hidden");
        prompt.classList.add("hidden");
      } else {
        previewContainer.classList.add("hidden");
        prompt.classList.remove("hidden");
      }
    } else {
      document.getElementById("catFormTitle").textContent = "إضافة تصنيف جديد";
      document.getElementById("categoryId").value = "";
      document.getElementById("catNameAr").value = "";
      document.getElementById("catNameEn").value = "";
      document.getElementById("catNameEn").disabled = false;
      document.getElementById("catVisible").checked = true;
      document.getElementById("catOrder").value = state.categories.length;
      document.getElementById("catImageInput").value = "";
      
      document.getElementById("catPreviewContainer").classList.add("hidden");
      document.getElementById("catPrompt").classList.remove("hidden");
    }
    form.scrollIntoView({ behavior: "smooth" });
  }

  // ---------------------------------------------------------------------------
  // Bind Event Listeners
  // ---------------------------------------------------------------------------
  function bindEvents() {
    document.getElementById("loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      if (document.getElementById("passwordInput").value === PASSWORD) {
        document.getElementById("loginCard").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
      } else {
        document.getElementById("loginError").textContent = "كلمة المرور غير صحيحة.";
      }
    });

    document.getElementById("newProduct").addEventListener("click", () => fillForm());
    
    document.getElementById("productForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const product = productFromForm();
      const index = state.products.findIndex((item) => item.id === product.id);
      if (index >= 0) state.products[index] = product;
      else state.products.unshift(product);
      fillForm();
      saveState();
    });

    document.getElementById("settingsForm").addEventListener("submit", (event) => {
      event.preventDefault();
      state.settings = {
        ...state.settings,
        whatsappNumber: document.getElementById("whatsappNumber").value.trim(),
        storeName: document.getElementById("storeName").value.trim(),
        deliveryMessage: document.getElementById("deliveryMessage").value.trim(),
        heroTitle: document.getElementById("heroTitleSetting").value.trim(),
        heroSubtitle: document.getElementById("heroSubtitleSetting").value.trim(),
        instagramLink: document.getElementById("instagramLink").value.trim(),
        facebookLink: document.getElementById("facebookLink").value.trim(),
        tiktokLink: document.getElementById("tiktokLink").value.trim(),
        showOfferBanner: document.getElementById("showOfferBanner").checked,
        offerBanner: document.getElementById("offerBanner").value.trim(),
        footerText: document.getElementById("footerText").value.trim(),
        
        logoImage: document.getElementById("logoInput").value.trim(),
        heroDesktopImage: document.getElementById("heroDesktopInput").value.trim(),
        heroMobileImage: document.getElementById("heroMobileInput").value.trim(),
        offerBannerImage: document.getElementById("offerBannerInput").value.trim()
      };
      saveState();
    });

    // Category Form Submit
    const catForm = document.getElementById("categoryForm");
    catForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const catId = document.getElementById("categoryId").value;
      const nameAr = document.getElementById("catNameAr").value.trim();
      const nameEn = document.getElementById("catNameEn").value.trim();
      const image = document.getElementById("catImageInput").value.trim();
      const visible = document.getElementById("catVisible").checked;
      const sortOrder = parseInt(document.getElementById("catOrder").value) || 0;

      const newCat = { nameAr, nameEn, image, visible, sortOrder };

      if (catId) {
        const idx = state.categories.findIndex((c) => c.nameEn === catId);
        if (idx >= 0) state.categories[idx] = newCat;
      } else {
        if (state.categories.some((c) => c.nameEn === nameEn)) {
          alert("رمز التصنيف (بالإنجليزية) موجود بالفعل!");
          return;
        }
        state.categories.push(newCat);
      }

      catForm.classList.add("hidden");
      saveState();
    });

    document.getElementById("newCategoryBtn").addEventListener("click", () => fillCategoryForm(null));
    document.getElementById("btnCancelCategory").addEventListener("click", () => catForm.classList.add("hidden"));

    // Export products.json Anchor Click
    document.getElementById("btnExportData").addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "products.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("تم تصدير ملف products.json بنجاح");
    });

    // Setup drag & drop upload for all forms
    setupUploadDropzone("productImageDropzone", "productImageFile", "productImagePreviewContainer", "productImagePreview", "productImagePrompt", "image", "product");
    setupDeleteButton("btnDeleteProductImage", "image", "productImagePreviewContainer", "productImagePrompt");

    setupUploadDropzone("logoDropzone", "logoUploadFile", "logoPreviewContainer", "logoPreview", "logoPrompt", "logoInput", "logo");
    setupDeleteButton("btnDeleteLogo", "logoInput", "logoPreviewContainer", "logoPrompt");

    setupUploadDropzone("heroDesktopDropzone", "heroDesktopUploadFile", "heroDesktopPreviewContainer", "heroDesktopPreview", "heroDesktopPrompt", "heroDesktopInput", "heroDesktop");
    setupDeleteButton("btnDeleteHeroDesktop", "heroDesktopInput", "heroDesktopPreviewContainer", "heroDesktopPrompt");

    setupUploadDropzone("heroMobileDropzone", "heroMobileUploadFile", "heroMobilePreviewContainer", "heroMobilePreview", "heroMobilePrompt", "heroMobileInput", "heroMobile");
    setupDeleteButton("btnDeleteHeroMobile", "heroMobileInput", "heroMobilePreviewContainer", "heroMobilePrompt");

    setupUploadDropzone("offerBannerDropzone", "offerBannerUploadFile", "offerBannerPreviewContainer", "offerBannerPreview", "offerBannerPrompt", "offerBannerInput", "offerBanner");
    setupDeleteButton("btnDeleteOfferBanner", "offerBannerInput", "offerBannerPreviewContainer", "offerBannerPrompt");

    setupUploadDropzone("catDropzone", "catUploadFile", "catPreviewContainer", "catPreview", "catPrompt", "catImageInput", "category");
    setupDeleteButton("btnDeleteCatImage", "catImageInput", "catPreviewContainer", "catPrompt");

    // Product Gallery Upload Click Binding
    const galleryFileInput = document.getElementById("productGalleryFile");
    document.getElementById("btnUploadGallery").addEventListener("click", () => galleryFileInput.click());
    
    galleryFileInput.addEventListener("change", async () => {
      const files = Array.from(galleryFileInput.files);
      for (const file of files) {
        try {
          showToast(`جاري ضغط ${file.name}...`);
          const result = await compressImage(file, "product");
          
          showToast(`جاري رفع ${file.name}...`);
          const uploadResult = await apiUploadImage(result.blob, "product", file.name);
          
          currentProductGallery.push(uploadResult.url);
          renderProductGallery();

          const mainInput = document.getElementById("image");
          if (!mainInput.value) {
            mainInput.value = uploadResult.url;
            mainInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
          showToast(`تم رفع ${file.name} بنجاح!`);
        } catch (err) {
          console.error(err);
          showToast(`خطأ في رفع ${file.name}: ${err.message}`, true);
        }
      }
      galleryFileInput.value = "";
    });
  }

  async function init() {
    await loadData();
    renderStats();
    renderProducts();
    renderCategories();
    renderSettings();
    fillForm();
    bindEvents();
  }

  init();
})();
