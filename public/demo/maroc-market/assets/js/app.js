(function () {
  const DATA_KEY = "marocMarketData";
  const CART_KEY = "marocMarketCart";
  const WHATSAPP_CLICKS = "marocMarketWhatsappClicks";

  const fallbackData = {
    settings: {
      whatsappNumber: "+973 3600 1234",
      storeName: "Maroc Market BH",
      deliveryMessage: "توصيل سريع لكافة مناطق البحرين",
      heroTitle: "منتجات مغربية طبيعية",
      heroSubtitle: "من قلب المغرب إلى البحرين",
      heroText: "نختار لكم أجود الزيوت، الأعشاب، وخلطات العناية لطلب جمالك الطبيعي كل يوم.",
      instagramLink: "",
      facebookLink: "",
      tiktokLink: "",
      showOfferBanner: false,
      offerBanner: "عروض طبيعية مختارة لفترة محدودة",
      footerText: "منتجات مغربية طبيعية من قلب المغرب إلى البحرين"
    },
    products: []
  };

  const fallbackCategories = [
    ["العروض", "sale", "assets/images/demo-placeholders/offers-demo.svg"],
    ["العطور والبخور", "bukhoor", "assets/images/demo-placeholders/perfume-bakhoor-demo.svg"],
    ["الحمام المغربي", "hammam", "assets/images/demo-placeholders/moroccan-hammam-demo.svg"],
    ["الأعشاب", "herbs", "assets/images/demo-placeholders/herbs-demo.svg"],
    ["زيوت طبيعية", "oils", "assets/images/demo-placeholders/natural-oils-demo.svg"],
    ["عناية البشرة", "skin", "assets/images/demo-placeholders/skin-care-demo.svg"],
    ["عناية الشعر", "hair", "assets/images/demo-placeholders/hair-care-demo.svg"],
  ];

  let state = { settings: fallbackData.settings, products: [], categories: [] };
  let cart = readJson(CART_KEY, []);

  function repairCategories(categories) {
    const defaults = fallbackCategories.map(([name, tone, localPath], idx) => ({
      nameAr: name,
      nameEn: tone,
      image: localPath,
      visible: true,
      sortOrder: idx
    }));

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
      bukhoor: ["#f4e4d4", "#2f2a24", "#c99036"],
      sale: ["#f8e4d9", "#b22b2f", "#c99036"]
    };
    const [bg, accent, deep] = palettes[tone] || palettes.oils;
    const safe = String(label || "Maroc Market BH").replace(/[&<>"']/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#fffaf3"/></linearGradient>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#6b4a24" flood-opacity=".18"/></filter>
      </defs>
      <rect width="900" height="900" fill="url(#g)"/>
      <path d="M85 150h730M70 710h760" stroke="#dec8ac" stroke-width="2" opacity=".55"/>
      <g opacity=".26" stroke="${accent}" stroke-width="8" fill="none"><path d="M116 102l52 52 52-52 52 52-52 52-52-52-52 52-52-52z"/><path d="M650 130l34 34 34-34 34 34-34 34-34-34-34 34-34-34z"/></g>
      <g filter="url(#s)">
        <ellipse cx="455" cy="672" rx="188" ry="42" fill="#d7b47b"/>
        <rect x="397" y="295" width="116" height="338" rx="34" fill="${accent}"/>
        <rect x="425" y="222" width="60" height="92" rx="22" fill="#3b1c0e"/>
        <rect x="350" y="548" width="210" height="95" rx="36" fill="#c99a54"/>
        <circle cx="610" cy="520" r="92" fill="#e5d1aa"/>
        <circle cx="295" cy="560" r="86" fill="#d8bd8e"/>
      </g>
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
    return placeholderSvg(product.nameAr, toneForProduct(product));
  }

  function tryImage(url, onLoad) {
    if (!url || String(url).startsWith("placeholder:")) return;
    const probe = new Image();
    probe.onload = () => onLoad(probe.src);
    probe.onerror = () => {};
    probe.src = url;
  }

  function setBackgroundWithFallback(element, url, fallback) {
    element.style.setProperty("--image", `url("${fallback}")`);
    tryImage(url, (loadedUrl) => element.style.setProperty("--image", `url("${loadedUrl}")`));
  }

  function setCategoryImage(element, localPath, fallback) {
    element.style.setProperty("--cat-image", `url("${fallback}")`);
    tryImage(localPath, (loadedUrl) => element.style.setProperty("--cat-image", `url("${loadedUrl}")`));
  }

  function setImgWithFallback(img, localPath, fallback) {
    img.src = fallback;
    tryImage(localPath, (loadedUrl) => { img.src = loadedUrl; });
  }

  const WHATSAPP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style="vertical-align: middle; margin-left: 6px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-14.734c-.16-.356-.33-.362-.484-.368-.125-.006-.269-.005-.413-.005-.144 0-.379.054-.577.269-.198.215-.756.737-.756 1.797 0 1.06.773 2.083.881 2.229.109.146 1.52 2.321 3.682 3.251 1.799.774 2.166.621 2.553.585.388-.036 1.253-.512 1.43-.996.179-.484.179-.9.125-.996-.053-.096-.197-.146-.413-.254-.216-.109-1.253-.618-1.43-.681-.179-.063-.309-.096-.44.096-.13.197-.506.635-.618.762-.113.127-.225.143-.44.036-.215-.109-.91-.336-1.734-1.07-.642-.572-1.074-1.278-1.2-1.493-.125-.215-.013-.332.095-.439.098-.097.216-.254.324-.381.109-.127.144-.217.216-.362.072-.145.036-.272-.018-.381-.054-.109-.484-1.168-.663-1.564z"/></svg>`;

  let activeCategory = "";
  let searchText = "";

  function applyBrandAndHeroAssets() {
    const logoPath = state.settings.logoImage || "assets/images/logo/maroc-market-logo.png";
    tryImage(logoPath, (loadedUrl) => {
      document.querySelectorAll(".brand-mark").forEach((mark) => {
        mark.classList.add("has-logo-image");
        mark.style.setProperty("--logo-image", `url("${loadedUrl}")`);
      });
    });

    const heroPath = window.matchMedia("(max-width: 900px)").matches
      ? (state.settings.heroMobileImage || "assets/images/hero/hero-mobile.jpg")
      : (state.settings.heroDesktopImage || "assets/images/hero/hero-desktop.jpg");
    tryImage(heroPath, (loadedUrl) => {
      const media = document.querySelector(".hero-media");
      if (media) {
        media.classList.add("has-hero-image");
        media.style.setProperty("--hero-image", `url("${loadedUrl}")`);
      }
      const hero = document.querySelector(".hero");
      if (hero) {
        hero.classList.add("has-hero-image");
        hero.style.setProperty("--hero-image", `url("${loadedUrl}")`);
      }
    });
  }

  function applySettings() {
    const settings = state.settings || {};
    if (settings.storeName) {
      document.querySelectorAll(".brand-type").forEach((brand) => {
        brand.textContent = settings.storeName;
      });
    }
    const heroTitle = document.getElementById("heroTitle");
    if (heroTitle && settings.heroTitle) heroTitle.textContent = settings.heroTitle;
    const heroSubtitle = document.querySelector(".hero-subtitle");
    if (heroSubtitle && settings.heroSubtitle) heroSubtitle.textContent = settings.heroSubtitle;
    const heroText = document.querySelector(".hero-text");
    if (heroText && settings.heroText) heroText.textContent = settings.heroText;
    const footerBrand = document.querySelector(".footer-brand p");
    if (footerBrand && settings.footerText) footerBrand.textContent = settings.footerText;
    const topInfo = document.querySelector(".top-info span");
    if (topInfo && settings.deliveryMessage) topInfo.textContent = settings.deliveryMessage;
    renderOfferBanner();
  }

  function renderOfferBanner() {
    const existing = document.querySelector(".offer-banner");
    if (existing) existing.remove();
    const settings = state.settings || {};
    if (!settings.showOfferBanner) return;
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const banner = document.createElement("section");
    banner.className = "offer-banner";
    banner.textContent = settings.offerBanner || "عروض طبيعية مختارة لفترة محدودة";
    const bannerImage = settings.offerBannerImage || "assets/images/banners/offer-banner.jpg";
    tryImage(bannerImage, (loadedUrl) => {
      banner.classList.add("has-offer-image");
      banner.style.setProperty("--offer-image", `url("${loadedUrl}")`);
    });
    hero.insertAdjacentElement("afterend", banner);
  }

  function normalizeWhatsapp(number) {
    return String(number || "").replace(/[^\d]/g, "");
  }

  function incrementWhatsappClicks() {
    const clicks = Number(localStorage.getItem(WHATSAPP_CLICKS) || 0) + 1;
    localStorage.setItem(WHATSAPP_CLICKS, String(clicks));
  }

  function whatsappUrl(message) {
    const phone = normalizeWhatsapp(state.settings.whatsappNumber);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  async function loadData() {
    try {
      const response = await fetch("/demo/maroc-market/api/catalog", {
        headers: { 'cache-control': 'no-cache' }
      });
      if (response.ok) {
        state = await response.json();
        state.categories = repairCategories(state.categories);
        return;
      }
    } catch (error) {
      console.warn("Failed to fetch API catalog, trying local fallback:", error);
    }

    try {
      const response = await fetch("assets/data/products.json");
      state = await response.json();
      state.categories = repairCategories(state.categories);
    } catch (error) {
      console.warn("Failed to fetch products.json, using fallbackData:", error);
      state = fallbackData;
      state.categories = repairCategories(state.categories);
    }
  }

  function renderCategories() {
    const track = document.getElementById("categoryTrack");
    track.innerHTML = "";
    
    const list = Array.isArray(state.categories) ? state.categories : [];
    const sorted = [...list].filter(c => c.visible !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    sorted.forEach((cat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-card${cat.nameEn === "sale" ? " sale" : ""}`;
      if (activeCategory === (cat.nameEn === "sale" ? "" : cat.nameAr)) {
        button.classList.add("active");
      }
      setCategoryImage(button, cat.image, placeholderSvg(cat.nameAr, cat.nameEn));
      button.innerHTML = `<span></span>${cat.nameAr}`;
      button.addEventListener("click", () => {
        const alreadyActive = button.classList.contains("active");
        track.querySelectorAll(".category-card").forEach(btn => btn.classList.remove("active"));
        
        if (alreadyActive) {
          activeCategory = "";
        } else {
          button.classList.add("active");
          activeCategory = cat.nameEn === "sale" ? "" : cat.nameAr;
          searchText = "";
          const searchInput = document.getElementById("searchInput");
          if (searchInput) searchInput.value = "";
        }
        applyFilter(true);
      });
      track.appendChild(button);
    });
  }

  function visibleProducts() {
    return state.products.filter((product) => product.visible !== false);
  }

  function renderProducts(products = visibleProducts().filter((product) => product.featured !== false)) {
    const grid = document.getElementById("productsGrid");
    const template = document.getElementById("productTemplate");
    grid.innerHTML = "";
    
    if (products.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-grid-message";
      emptyMessage.style.cssText = "grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--muted); font-weight: 800; font-size: 16px;";
      emptyMessage.textContent = "لا توجد منتجات مطابقة";
      grid.appendChild(emptyMessage);
      return;
    }

    products.forEach((product) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector(".product-card");
      
      const imageWrapper = node.querySelector(".product-image-wrapper");
      const img = node.querySelector(".product-card-img");
      if (img) {
        img.alt = product.nameAr;
        setImgWithFallback(img, product.image, resolveImage(product));
      }
      if (imageWrapper) {
        imageWrapper.addEventListener("click", () => openQuickView(product.id));
      }

      node.querySelector("h3").textContent = product.nameAr;
      node.querySelector("p").textContent = product.shortDescription;
      node.querySelector("strong").textContent = formatPrice(product.price);
      
      const detailsBtn = node.querySelector(".details-btn");
      if (detailsBtn) {
        detailsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openQuickView(product.id);
        });
      }
      
      const addButton = node.querySelector(".add-cart");
      addButton.textContent = product.soldOut ? "نفد من المخزون" : "أضف للسلة";
      addButton.disabled = !!product.soldOut;
      addButton.addEventListener("click", () => addToCart(product.id));
      card.addEventListener("dblclick", () => openQuickView(product.id));
      grid.appendChild(node);
    });
  }

  function applyFilter(shouldScroll = false) {
    let filtered = visibleProducts();
    
    if (activeCategory) {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    
    if (searchText) {
      filtered = filtered.filter(p => {
        return [p.nameAr, p.nameEn, p.shortDescription]
          .join(" ")
          .toLowerCase()
          .includes(searchText.toLowerCase());
      });
    }
    
    if (!activeCategory && !searchText) {
      renderProducts(visibleProducts().filter((p) => p.featured !== false));
    } else {
      renderProducts(filtered);
    }
    
    const heading = document.querySelector(".section-head h2");
    if (heading) {
      if (activeCategory || searchText) {
        let filterLabel = activeCategory ? `تصنيف: ${activeCategory}` : "نتائج البحث";
        if (activeCategory && searchText) filterLabel = `${activeCategory} + "${searchText}"`;
        heading.innerHTML = `${filterLabel} <span style="font-size: 14px; font-weight: normal; color: var(--muted);">(${filtered.length} منتج)</span>`;
      } else {
        heading.textContent = "منتجات مميزة";
      }
    }
    
    if (shouldScroll) {
      const productsSection = document.getElementById("products");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function filterProducts(categoryOrSearch) {
    searchText = String(categoryOrSearch || "").trim();
    applyFilter(true);
  }

  function addToCart(productId, quantity = 1) {
    const product = state.products.find((item) => item.id === productId);
    if (!product || product.soldOut) return;
    const existing = cart.find((item) => item.id === productId);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: productId, quantity });
    writeJson(CART_KEY, cart);
    updateCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter((item) => item.id !== productId);
    writeJson(CART_KEY, cart);
    updateCart();
  }

  function setQuantity(productId, quantity) {
    const item = cart.find((entry) => entry.id === productId);
    if (!item) return;
    item.quantity = Math.max(1, quantity);
    writeJson(CART_KEY, cart);
    updateCart();
  }

  function cartLines() {
    return cart.map((item) => {
      const product = state.products.find((entry) => entry.id === item.id);
      return product ? { ...product, quantity: item.quantity } : null;
    }).filter(Boolean);
  }

  function updateCart() {
    const lines = cartLines();
    const count = lines.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll(".cart-badge").forEach((badge) => { badge.textContent = count; });
    const items = document.getElementById("cartItems");
    items.innerHTML = lines.length ? "" : "<p class='empty-cart'>السلة فارغة حالياً.</p>";
    lines.forEach((item) => {
      const row = document.createElement("article");
      row.className = "cart-item";
      row.innerHTML = `
        <img alt="">
        <div>
          <h3>${item.nameAr}</h3>
          <p>${formatPrice(item.price)}</p>
          <div class="qty-control">
            <button type="button" data-qty="-1">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-qty="1">+</button>
          </div>
        </div>
        <button class="remove-item" type="button">حذف</button>
      `;
      setImgWithFallback(row.querySelector("img"), item.image, resolveImage(item));
      row.querySelector("[data-qty='-1']").addEventListener("click", () => setQuantity(item.id, item.quantity - 1));
      row.querySelector("[data-qty='1']").addEventListener("click", () => setQuantity(item.id, item.quantity + 1));
      row.querySelector(".remove-item").addEventListener("click", () => removeFromCart(item.id));
      items.appendChild(row);
    });
    const total = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById("cartTotal").textContent = formatPrice(total);
  }

  function buildOrderMessage(singleProduct, quantity = 1) {
    const lines = singleProduct ? [{ ...singleProduct, quantity }] : cartLines();
    const items = lines.map((item, index) => `${index + 1}. اسم المنتج: ${item.nameAr}
   الكمية: ${item.quantity}
   السعر: ${formatPrice(item.price * item.quantity)}`).join("\n\n");
    const total = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return `السلام عليكم Maroc Market BH
 
 أرغب بطلب المنتجات التالية:
 
 ${items || "لا توجد منتجات محددة"}
 
 الإجمالي: ${formatPrice(total)}
 
 الاسم:
 المنطقة:
 ملاحظة:`;
  }

  function openWhatsapp(message) {
    incrementWhatsappClicks();
    window.open(whatsappUrl(message), "_blank", "noopener");
  }

  function openQuickView(productId) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    const dialog = document.getElementById("quickView");
    const content = document.getElementById("quickViewContent");

    const gallery = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || "placeholder:oils"];

    content.innerHTML = `
      <div class="quick-content">
        <div class="quick-gallery" style="display:flex; flex-direction:column; gap:10px;">
          <img id="quickImage" alt="${product.nameAr}" style="width:100%; aspect-ratio:1; object-fit:cover; border-radius:12px;">
          ${gallery.length > 1 ? `
            <div class="quick-thumbnails" style="display:flex; gap:8px; overflow-x:auto; padding:4px 0;">
              ${gallery.map((url, i) => `
                <img class="quick-thumb ${i === 0 ? 'active' : ''}" src="${url}" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:2px solid ${i === 0 ? 'var(--gold)' : 'var(--line)'}; cursor:pointer;" data-index="${i}">
              `).join("")}
            </div>
          ` : ''}
        </div>
        <div class="quick-details">
          <h2>${product.nameAr}</h2>
          <div class="quick-price">${formatPrice(product.price)}</div>
          <p>${product.shortDescription}</p>
          <dl>
            <dt>الفوائد</dt><dd>${product.benefits || "-"}</dd>
            <dt>طريقة الاستخدام</dt><dd>${product.howToUse || "-"}</dd>
            <dt>مناسب لـ</dt><dd>${product.suitableFor || "-"}</dd>
          </dl>
          <label class="quantity-row">الكمية <input id="quickQty" type="number" value="1" min="1"></label>
          <button class="btn primary wide" id="quickAdd" type="button">أضف للسلة</button>
          <button class="btn ghost wide" id="quickWhatsapp" type="button">${WHATSAPP_SVG}اطلبي الآن عبر واتساب</button>
        </div>
      </div>
    `;

    const mainImg = content.querySelector("#quickImage");
    setImgWithFallback(mainImg, gallery[0], resolveImage(product));

    if (gallery.length > 1) {
      const thumbs = content.querySelectorAll(".quick-thumb");
      thumbs.forEach((thumb) => {
        thumb.addEventListener("click", () => {
          thumbs.forEach(t => {
            t.style.borderColor = "var(--line)";
            t.classList.remove("active");
          });
          thumb.style.borderColor = "var(--gold)";
          thumb.classList.add("active");
          setImgWithFallback(mainImg, thumb.src, resolveImage(product));
        });
      });
    }

    content.querySelector("#quickAdd").addEventListener("click", () => {
      addToCart(product.id, Number(content.querySelector("#quickQty").value || 1));
      dialog.close();
    });
    content.querySelector("#quickWhatsapp").addEventListener("click", () => {
      openWhatsapp(buildOrderMessage(product, Number(content.querySelector("#quickQty").value || 1)));
    });
    dialog.showModal();
  }

  function bindEvents() {
    const searchForm = document.querySelector(".search");
    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        searchText = document.getElementById("searchInput").value.trim();
        applyFilter(true);
      });
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchText = e.target.value.trim();
        applyFilter(false);
      });
    }

    const floatWhatsapp = document.getElementById("floatingWhatsapp");
    if (floatWhatsapp) {
      floatWhatsapp.innerHTML = WHATSAPP_SVG;
      floatWhatsapp.addEventListener("click", () => openWhatsapp(buildOrderMessage()));
    }

    const orderCart = document.getElementById("orderCart");
    if (orderCart) {
      orderCart.innerHTML = `${WHATSAPP_SVG}اطلبي عبر واتساب`;
      orderCart.addEventListener("click", () => openWhatsapp(buildOrderMessage()));
    }

    document.querySelectorAll(".cart-open").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById("cartPanel").classList.add("open");
        document.getElementById("cartPanel").setAttribute("aria-hidden", "false");
      });
    });

    document.querySelector(".close-panel").addEventListener("click", () => {
      document.getElementById("cartPanel").classList.remove("open");
      document.getElementById("cartPanel").setAttribute("aria-hidden", "true");
    });

    document.getElementById("clearCart").addEventListener("click", () => {
      cart = [];
      writeJson(CART_KEY, cart);
      updateCart();
    });

    document.querySelector(".modal-close").addEventListener("click", () => document.getElementById("quickView").close());

    ["heroWhatsapp", "navWhatsapp", "headerWhatsapp"].forEach((id) => {
      const link = document.getElementById(id);
      if (link) {
        link.href = whatsappUrl(buildOrderMessage());
        link.addEventListener("click", () => incrementWhatsappClicks());
      }
    });

    const bottomSearch = document.getElementById("bottomSearch");
    if (bottomSearch) {
      bottomSearch.addEventListener("click", (e) => {
        e.preventDefault();
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    const bottomWhatsapp = document.getElementById("bottomWhatsapp");
    if (bottomWhatsapp) {
      bottomWhatsapp.href = whatsappUrl(buildOrderMessage());
      bottomWhatsapp.addEventListener("click", () => incrementWhatsappClicks());
    }

    const showAllLink = document.querySelector(".section-head a");
    if (showAllLink) {
      showAllLink.addEventListener("click", (e) => {
        e.preventDefault();
        
        const track = document.getElementById("categoryTrack");
        if (track) {
          track.querySelectorAll(".category-card").forEach(btn => btn.classList.remove("active"));
        }
        
        const searchInput = document.getElementById("searchInput");
        if (searchInput) searchInput.value = "";
        
        activeCategory = "";
        searchText = "";
        applyFilter(true);
      });
    }
  }

  async function init() {
    await loadData();
    applySettings();
    applyBrandAndHeroAssets();
    renderCategories();
    renderProducts();
    bindEvents();
    updateCart();
  }

  init();
})();
