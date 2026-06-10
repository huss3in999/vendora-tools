/**
 * Gourmet Pre-Order Client Logic & Behavior Tracker (app.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE VARIABLES ---
  let menuItems = [];
  let cart = []; // Array of { id, title, price, quantity, image }
  let requestBasket = []; // Array of { itemId, itemName, price, quantity, image }
  let activeCategory = "all";
  let searchTimeout = null;
  let cookingDecisions = {};
  let settings = {};
  let categories = [];
  let lastLiveMenuSignature = "";
  let lastSettingsSignature = "";
  let submittedRequests = [];
  let requestStatusPollTimer = null;

  // --- DOM ELEMENT REFERENCES ---
  const todayFoodList = document.getElementById("today-food-list");
  const requestFoodList = document.getElementById("request-food-list");
  const tomorrowFoodList = document.getElementById("tomorrow-food-list");
  const searchInput = document.getElementById("menu-search-input");
  const categoryTabs = document.getElementById("category-tabs");
  
  // Cart DOM elements
  const cartBadge = document.getElementById("cart-badge");
  const cartBtn = document.getElementById("cart-btn");
  const cartCloseBtn = document.getElementById("cart-close-btn");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartDrawer = document.getElementById("cart-drawer");
  const cartItemsList = document.getElementById("cart-items-list");
  const cartTotalVal = document.getElementById("cart-total-val");
  const cartCheckoutBtn = document.getElementById("cart-checkout-btn");

  // Requests DOM elements
  const requestBasketBtn = document.getElementById("request-basket-btn");
  const requestDrawer = document.getElementById("request-drawer");
  const requestOverlay = document.getElementById("request-overlay");
  const requestCloseBtn = document.getElementById("request-close-btn");
  const requestItemsList = document.getElementById("request-items-list");
  const requestTotalCount = document.getElementById("request-total-count");
  const requestCheckoutBtn = document.getElementById("request-checkout-btn");
  const requestItemsSummary = document.getElementById("request-items-summary");
  const confReqItemsList = document.getElementById("conf-req-items-list");
  const requestBadge = document.getElementById("request-badge");
  const requestBadgeDot = document.getElementById("request-badge-dot");
  const requestStatusPanel = document.getElementById("request-status-panel");
  const requestStatusList = document.getElementById("request-status-list");

  // Modals
  const detailModal = document.getElementById("detail-modal");
  const detailModalClose = document.getElementById("detail-modal-close");
  const detailModalBody = document.getElementById("detail-modal-body");
  let imageViewerState = { zoom: 1 };

  const checkoutModal = document.getElementById("checkout-modal");
  const checkoutModalClose = document.getElementById("checkout-modal-close");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutItemsSummary = document.getElementById("checkout-items-summary");
  const checkoutTotalVal = document.getElementById("checkout-total-val");
  const timeSlotsContainer = document.getElementById("time-slots-container");

  const successModal = document.getElementById("success-modal");
  const successCloseBtn = document.getElementById("success-close-btn");
  const whatsappBtn = document.getElementById("whatsapp-btn");
  const confOrderId = document.getElementById("conf-order-id");
  const confCustomerName = document.getElementById("conf-customer-name");
  const confFulfillmentType = document.getElementById("conf-fulfillment-type");
  const confTimeSlot = document.getElementById("conf-time-slot");
  const confTotalPrice = document.getElementById("conf-total-price");

  // Hero action
  const heroActionBtn = document.getElementById("hero-action-btn");

  // --- PRICE FORMATTING UTILITY ---
  const formatPrice = (amount) => {
    const symbol = settings.currencySymbol || "BD";
    const code = settings.currencyCode || "BHD";
    const format = settings.currencyFormat || "prefix";
    
    let decimals = 2;
    const upperCode = code.toUpperCase();
    if (upperCode === "BHD" || upperCode === "KWD" || upperCode === "OMR" || upperCode === "JOD" || symbol === "BD") {
      decimals = 3;
    }
    
    const formattedAmount = Number(amount).toFixed(decimals);
    return format === "prefix" ? `${symbol} ${formattedAmount}` : `${formattedAmount} ${symbol}`;
  };

  const resolveMediaUrl = (url) => {
    if (window.dbEngine && typeof window.dbEngine.resolveMediaUrl === "function") {
      return window.dbEngine.resolveMediaUrl(url);
    }
    return url || "";
  };

  const settingBool = (key, fallback = false) => {
    return settings[key] === undefined ? fallback : !!settings[key];
  };

  const getFulfillmentAvailability = () => {
    const legacy = settings.deliveryOptions || "both";
    const delivery = settings.deliveryEnabled === undefined
      ? legacy === "both" || legacy === "delivery"
      : !!settings.deliveryEnabled;
    const pickup = settings.pickupEnabled === undefined
      ? legacy === "both" || legacy === "pickup"
      : !!settings.pickupEnabled;
    return { delivery, pickup, any: delivery || pickup };
  };

  const canAcceptPreorders = () => {
    return settingBool("enablePreorders", true) && getFulfillmentAvailability().any;
  };

  const cleanWhatsAppNumber = (value) => String(value || "").replace(/\D/g, "");

  const requestStatusLabels = {
    pending: "Pending - owner is reviewing",
    approved: "Approved for tomorrow",
    not_available: "Not available this time",
    closed: "Closed for this cycle"
  };

  const requestStatusIcons = {
    pending: "bx-time-five",
    approved: "bx-check-circle",
    not_available: "bx-calendar-x",
    closed: "bx-archive"
  };

  const normalizeRequestStatus = (status) => requestStatusLabels[status] ? status : "pending";

  const getRequestStatusLabel = (status) => requestStatusLabels[normalizeRequestStatus(status)];

  const getRequestStatusIcon = (status) => requestStatusIcons[normalizeRequestStatus(status)] || requestStatusIcons.pending;

  const setRequiredState = (inputId, labelId, required, labelText) => {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (input) input.required = !!required;
    if (label) label.innerText = `${labelText}${required ? " *" : " (Optional)"}`;
  };

  const applyHeroImage = () => {
    const heroImg = document.getElementById("hero-rotating-img");
    if (!heroImg) return;

    const firstFoodImage = menuItems.find((item) => item && item.image && item.visible !== false)?.image || "";
    const heroSrc = (settings.heroImage && settings.heroImage.trim())
      || firstFoodImage
      || (settings.businessLogo && settings.businessLogo.trim())
      || "";

    if (heroSrc) {
      heroImg.src = resolveMediaUrl(heroSrc);
      heroImg.alt = settings.businessName ? `${settings.businessName} featured image` : "Featured food image";
      heroImg.style.display = "block";
      heroImg.classList.toggle("hero-logo-img", heroSrc === settings.businessLogo && !settings.heroImage && !firstFoodImage);
    } else {
      heroImg.removeAttribute("src");
      heroImg.alt = "";
      heroImg.style.display = "none";
    }
  };

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const getBrandLogoSize = () => Math.max(40, Math.min(140, Number(settings.brandLogoSize) || 72));

  const getBrandLogoPlacement = () => {
    const placement = String(settings.brandLogoPlacement || "header").toLowerCase();
    return placement === "hero" || placement === "both" ? placement : "header";
  };

  const getLogoMarkup = (options = {}) => {
    const {
      showName = true,
      sizeScale = 1
    } = options;
    const businessName = settings.businessName || "Gourmet Tomorrow";
    const logoSrc = settings.businessLogo && settings.businessLogo.trim();
    const safeName = escapeHtml(businessName);
    const frameStyle = sizeScale !== 1
      ? ` style="--brand-logo-scale:${sizeScale};"`
      : "";

    if (logoSrc) {
      return `
        <span class="brand-logo-frame"${frameStyle}>
          <img class="brand-logo-img" src="${resolveMediaUrl(logoSrc)}" alt="${safeName} logo" loading="eager" decoding="async">
          <i class="bx bxs-hot brand-logo-fallback" aria-hidden="true"></i>
        </span>
        ${showName ? `<span class="brand-name">${safeName}</span>` : ""}
      `;
    }

    return `
      <span class="brand-logo-frame brand-logo-frame-fallback"${frameStyle}>
        <i class="bx bxs-hot brand-logo-fallback" aria-hidden="true"></i>
      </span>
      ${showName ? `<span class="brand-name">${safeName}</span>` : ""}
    `;
  };

  const bindLogoImageFallback = (root) => {
    if (!root) return;
    const img = root.querySelector(".brand-logo-img");
    if (img) {
      img.addEventListener("error", () => root.classList.add("logo-image-failed"), { once: true });
    }
  };

  const applyLogoBranding = () => {
    const logoSize = getBrandLogoSize();
    const placement = getBrandLogoPlacement();
    document.documentElement.style.setProperty("--brand-logo-size", `${logoSize}px`);
    document.body.classList.remove("logo-placement-header", "logo-placement-hero", "logo-placement-both");
    document.body.classList.add(`logo-placement-${placement}`);

    const heroBrandLogo = document.getElementById("hero-brand-logo");
    if (heroBrandLogo) {
      if (placement === "hero" || placement === "both") {
        heroBrandLogo.hidden = false;
        heroBrandLogo.innerHTML = getLogoMarkup({ showName: true, sizeScale: placement === "hero" ? 1.35 : 1.2 });
        bindLogoImageFallback(heroBrandLogo);
      } else {
        heroBrandLogo.hidden = true;
        heroBrandLogo.innerHTML = "";
      }
    }
  };

  const applyBrandingAndSettings = () => {
    const businessName = settings.businessName || "Gourmet Tomorrow";
    const hasLogo = Boolean(settings.businessLogo && settings.businessLogo.trim());
    const placement = getBrandLogoPlacement();
    const showNavLogoImage = hasLogo && placement !== "hero";
    const logoMarkup = getLogoMarkup({ showName: true });

    applyLogoBranding();
    document.title = `${businessName} | Premium Food Pre-Order & Next-Day Dining`;

    const logoEl = document.getElementById("nav-logo");
    if (logoEl) {
      logoEl.classList.toggle("has-brand-image", showNavLogoImage);
      logoEl.classList.toggle("nav-logo-name-only", placement === "hero" && hasLogo);
      logoEl.innerHTML = placement === "hero" && hasLogo
        ? `<span class="brand-name">${escapeHtml(businessName)}</span>`
        : logoMarkup;
      bindLogoImageFallback(logoEl);
    }

    const footerLogo = document.querySelector("footer .footer-logo");
    if (footerLogo) {
      footerLogo.classList.toggle("has-brand-image", hasLogo);
      footerLogo.innerHTML = logoMarkup;
      bindLogoImageFallback(footerLogo);
    }

    const heroTagline = document.getElementById("hero-brand-tagline");
    if (heroTagline && settings.businessTagline && settings.businessTagline.trim()) {
      heroTagline.textContent = settings.businessTagline.trim();
    }

    const deadlineTextEl = document.querySelector(".info-item:first-child p");
    if (deadlineTextEl) {
      deadlineTextEl.textContent = `Secure your order before ${settings.votingDeadline || "11:00 PM"} tonight.`;
    }

    const footerTextEl = document.querySelector("footer p");
    if (footerTextEl) {
      footerTextEl.textContent = `Fresh Next-Day Dining. Pre-orders close at ${settings.votingDeadline || "11:00 PM"} daily.`;
    }

    const isClosed = settings.restaurantStatus === "closed";
    const allowRequests = settings.allowRequestsWhileClosed !== false;
    const closedBanner = document.getElementById("closed-banner");

    if (closedBanner) {
      if (isClosed) {
        closedBanner.innerHTML = allowRequests && settingBool("enableRequests", true)
          ? `<i class="bx bx-info-circle"></i> Orders are currently closed. You can still submit requests for tomorrow.`
          : `<i class="bx bx-error-circle"></i> Orders and requests are currently closed.`;
        closedBanner.style.display = "block";
      } else {
        closedBanner.style.display = "none";
      }
    }

    const cartToggle = document.getElementById("cart-btn");
    const cartNav = document.getElementById("btn-nav-cart");
    const preordersEnabled = canAcceptPreorders();
    if (cartToggle) cartToggle.style.display = preordersEnabled ? "" : "none";
    if (cartNav) cartNav.style.display = preordersEnabled ? "" : "none";

    const requestToggle = document.getElementById("request-basket-btn");
    const requestNav = document.getElementById("btn-nav-request");
    const requestsEnabled = settingBool("enableRequests", true) && (!isClosed || allowRequests);
    const suggestionsEnabled = settingBool("enableSuggestDish", true);
    if (requestToggle) requestToggle.style.display = requestsEnabled ? "" : "none";
    if (requestNav) requestNav.style.display = (requestsEnabled || suggestionsEnabled) ? "" : "none";

    const requestSection = document.getElementById("section-request-tomorrow");
    const suggestSection = document.getElementById("section-suggest-dish");
    const requestTab = document.querySelector('#menu-sections-tabs .section-tab[data-section="request"]');
    const suggestTab = document.querySelector('#menu-sections-tabs .section-tab[data-section="suggest"]');
    const requestLink = document.getElementById("link-voting");
    const suggestLink = document.getElementById("link-suggest");
    const requestSuggestCta = document.getElementById("request-suggest-cta");
    if (requestSection) requestSection.style.display = requestsEnabled ? "" : "none";
    if (suggestSection) suggestSection.style.display = suggestionsEnabled ? "" : "none";
    if (requestTab) requestTab.style.display = requestsEnabled ? "" : "none";
    if (suggestTab) suggestTab.style.display = suggestionsEnabled ? "" : "none";
    if (requestLink) requestLink.style.display = requestsEnabled ? "" : "none";
    if (suggestLink) suggestLink.style.display = suggestionsEnabled ? "" : "none";
    if (requestSuggestCta) requestSuggestCta.style.display = suggestionsEnabled ? "" : "none";

    setRequiredState("sug-cust-name", "sug-cust-name-label", settingBool("suggestionNameRequired", false), "Your Full Name");
    setRequiredState("sug-cust-phone", "sug-cust-phone-label", settingBool("suggestionPhoneRequired", false), "Phone Number");
    setRequiredState("sug-notes", "sug-notes-label", settingBool("suggestionNotesRequired", false), "Additional Notes / Preferences");

    const activeBlock = document.querySelector(".menu-section-block.active");
    if (activeBlock && activeBlock.style.display === "none") {
      switchSection(requestsEnabled ? "request" : suggestionsEnabled ? "suggest" : "today");
    }

    lastSettingsSignature = JSON.stringify(settings);
  };

  // --- TIMEZONE & AVAILABILITY UTILITY ---
  const getRestaurantTime = () => {
    const tz = settings.restaurantTimezone || "Asia/Bahrain";
    try {
      return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    } catch (e) {
      return new Date(); // fallback
    }
  };

  const checkTimeAvailability = (item) => {
    if (!item.availableFrom || !item.availableTo) {
      return { available: true };
    }

    const now = getRestaurantTime();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeVal = currentHour * 60 + currentMin;

    // Parse availableFrom (format HH:MM)
    const [fromH, fromM] = item.availableFrom.split(":").map(Number);
    const fromVal = fromH * 60 + fromM;

    // Parse availableTo (format HH:MM)
    const [toH, toM] = item.availableTo.split(":").map(Number);
    const toVal = toH * 60 + toM;

    let available = false;
    if (fromVal <= toVal) {
      // Normal range (e.g. 06:00 to 11:00)
      available = currentTimeVal >= fromVal && currentTimeVal <= toVal;
    } else {
      // Over-midnight range (e.g. 22:00 to 02:00)
      available = currentTimeVal >= fromVal || currentTimeVal <= toVal;
    }

    return {
      available: available,
      from: item.availableFrom,
      to: item.availableTo
    };
  };

  const normalizeBool = (value) => (
    value === true || value === 1 || value === "1" || value === "true"
  );

  const normalizeMenuItem = (item) => {
    if (!item || typeof item !== "object") return item;
    return {
      ...item,
      availableToday: normalizeBool(item.availableToday),
      confirmedTomorrow: normalizeBool(item.confirmedTomorrow),
      availableTomorrow: normalizeBool(item.availableTomorrow),
      popular: normalizeBool(item.popular),
      soldOut: normalizeBool(item.soldOut),
      visible: !(item.visible === false || item.visible === 0 || item.visible === "0" || item.visible === "false")
    };
  };

  const normalizeMenuItems = (items) => (items || []).map(normalizeMenuItem);

  const compareTitles = (a, b) => {
    const titleA = String(a.title || "").toLowerCase();
    const titleB = String(b.title || "").toLowerCase();
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    const idA = String(a.id || "");
    const idB = String(b.id || "");
    if (idA < idB) return -1;
    if (idA > idB) return 1;
    return 0;
  };

  const getMenuItemSortRank = (item) => {
    const normalized = normalizeMenuItem(item);
    if (normalized.soldOut) return 4;
    if (normalized.availableToday) return 1;
    if (normalized.confirmedTomorrow || normalized.availableTomorrow) return 2;
    return 3;
  };

  const sortMenuItems = (items) => {
    const sorted = [...normalizeMenuItems(items)].sort((a, b) => {
      const rankA = getMenuItemSortRank(a);
      const rankB = getMenuItemSortRank(b);
      if (rankA !== rankB) return rankA - rankB;

      if (rankA === 1) {
        const aReady = checkTimeAvailability(a).available ? 0 : 1;
        const bReady = checkTimeAvailability(b).available ? 0 : 1;
        if (aReady !== bReady) return aReady - bReady;
      }

      return compareTitles(a, b);
    });
    return sorted;
  };

  // --- INITIALIZE APPLICATION ---
  const init = async () => {
    // 1. Load system settings & categories
    try {
      settings = await window.dbEngine.getSettings();
      categories = await window.dbEngine.getCategories();
    } catch (err) {
      console.error("Error loading system settings:", err);
    }

    // Load request basket from local storage
    try {
      requestBasket = JSON.parse(localStorage.getItem("requestBasket") || "[]");
    } catch (e) {
      requestBasket = [];
    }
    try {
      submittedRequests = JSON.parse(localStorage.getItem("submittedRequests") || "[]");
    } catch (e) {
      submittedRequests = [];
    }

    // 2. Log Initial Page View
    logAction("page_view", {
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer || "direct"
    });

    // Update branding/details dynamically from settings
    applyBrandingAndSettings();
    applyHeroImage();

    // 3. Generate Delivery/Pickup Time Slots for Tomorrow
    generateTimeSlots();

    // 4. Fetch Menu Items from Storage Engine
    await loadMenu();

    // 5. Setup Event Listeners
    setupListeners();

    // 6. Update Request UI status
    updateRequestUI();
    await refreshMyRequestStatuses();
    startCustomerPolling();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshLiveMenu();
        refreshMyRequestStatuses();
      }
    });
    window.addEventListener("focus", () => {
      refreshLiveMenu();
      refreshMyRequestStatuses();
    });
  };

  const MENU_POLL_MS = 12000;
  const REQUEST_POLL_MS = 30000;

  const startCustomerPolling = () => {
    if (requestStatusPollTimer) clearInterval(requestStatusPollTimer);
    requestStatusPollTimer = setInterval(() => {
      if (!document.hidden) refreshMyRequestStatuses();
    }, REQUEST_POLL_MS);

    setInterval(() => {
      if (!document.hidden) refreshLiveMenu();
    }, MENU_POLL_MS);
  };

  // --- MENU DATA LOADING & RENDERING ---
  const loadMenu = async () => {
    try {
      menuItems = normalizeMenuItems(await window.dbEngine.getFoodItems());
      cookingDecisions = await window.dbEngine.getCookingDecisions();
      lastLiveMenuSignature = JSON.stringify({
        menuItems: menuItems.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          image: item.image,
          category: item.category,
          availableToday: item.availableToday,
          availableTomorrow: item.availableTomorrow,
          confirmedTomorrow: item.confirmedTomorrow,
          visible: item.visible,
          soldOut: item.soldOut,
          requestCount: item.requestCount,
          description: item.description || ""
        })),
        cookingDecisions
      });
      applyHeroImage();
      renderCategories();
      renderMenu();
      renderConfirmedMenu();
    } catch (error) {
      console.error("Error loading menu:", error);
      if (todayFoodList) {
        todayFoodList.innerHTML = `
          <div class="no-results">
            <i class="bx bx-error-circle" style="color:var(--color-danger);"></i>
            <p>Failed to load the menu. Please reload the page.</p>
          </div>
        `;
      }
    }
  };

  const refreshLiveMenu = async () => {
    try {
      const nextSettings = await window.dbEngine.getSettings();
      const nextCategories = await window.dbEngine.getCategories();
      const nextItems = normalizeMenuItems(await window.dbEngine.getFoodItems());
      const nextDecisions = await window.dbEngine.getCookingDecisions();
      const nextSignature = JSON.stringify({
        menuItems: nextItems.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          image: item.image,
          category: item.category,
          availableToday: item.availableToday,
          availableTomorrow: item.availableTomorrow,
          confirmedTomorrow: item.confirmedTomorrow,
          visible: item.visible,
          soldOut: item.soldOut,
          requestCount: item.requestCount,
          description: item.description || ""
        })),
        cookingDecisions: nextDecisions
      });

      const nextSettingsSignature = JSON.stringify(nextSettings);
      const settingsChanged = nextSettingsSignature !== lastSettingsSignature;

      settings = nextSettings;
      categories = nextCategories;

      if (settingsChanged) {
        applyBrandingAndSettings();
        applyHeroImage();
        renderMenu();
        renderConfirmedMenu();
        updateRequestUI();
      }

      if (nextSignature !== lastLiveMenuSignature) {
        menuItems = nextItems;
        cookingDecisions = nextDecisions;
        lastLiveMenuSignature = nextSignature;
        applyBrandingAndSettings();
        applyHeroImage();
        renderCategories();
        renderMenu();
        renderConfirmedMenu();
        updateRequestUI();
      }
    } catch (error) {
      console.warn("Live menu refresh skipped:", error);
    }
  };

  const renderCategories = () => {
    if (!categoryTabs) return;

    // Filter visible categories
    const visibleCategories = categories.filter(c => !c.hidden);
    if (activeCategory !== "all" && !visibleCategories.some(cat => cat.name === activeCategory)) {
      activeCategory = "all";
    }
    
    let html = `<button class="category-btn ${activeCategory === "all" ? 'active' : ''}" data-category="all">All Items</button>`;
    html += visibleCategories.map(cat => {
      return `<button class="category-btn ${activeCategory === cat.name ? 'active' : ''}" data-category="${cat.name}">${cat.name}</button>`;
    }).join("");
    
    categoryTabs.innerHTML = html;
    
    // Bind click events
    categoryTabs.querySelectorAll(".category-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        categoryTabs.querySelector(".category-btn.active").classList.remove("active");
        e.currentTarget.classList.add("active");
        
        activeCategory = e.currentTarget.dataset.category;
        logAction("category_filter_click", { category: activeCategory });
        renderMenu();
      });
    });
  };

  const renderMenu = () => {
    const searchQuery = searchInput.value.trim().toLowerCase();
    
    const filtered = menuItems.filter(item => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const title = item.title || "";
      const description = item.description || "";
      const matchesSearch = title.toLowerCase().includes(searchQuery) || 
                            description.toLowerCase().includes(searchQuery);
      return item.visible !== false && matchesCategory && matchesSearch;
    });

    const fullMenuItems = sortMenuItems(filtered);

    // Render the full menu: available today first, then tomorrow plan, then request-only, sold out last.
    if (todayFoodList) {
      if (fullMenuItems.length === 0) {
        todayFoodList.innerHTML = `
          <div class="no-results" style="grid-column: 1/-1;">
            <i class="bx bx-search-alt"></i>
            <p>No menu items match your selection.</p>
          </div>
        `;
      } else {
        todayFoodList.innerHTML = fullMenuItems.map(item => renderFoodCardHtml(item)).join("");
      }
    }

    if (requestFoodList) {
      renderSelectedRequestsPanel();
    }

    bindCardActions();
  };

  const renderSelectedRequestsPanel = () => {
    if (!requestFoodList) return;

    if (!settingBool("enableRequests", true)) {
      requestFoodList.innerHTML = `
        <div class="no-results">
          <i class="bx bx-lock-alt"></i>
          <p>Tomorrow requests are currently closed.</p>
        </div>
      `;
      return;
    }

    if (requestBasket.length === 0) {
      const canSuggest = settingBool("enableSuggestDish", true);
      requestFoodList.innerHTML = `
        <div class="no-results request-empty-state">
          <i class="bx bx-calendar-plus"></i>
          <h3>No requests selected yet</h3>
          <p>Go to Full Menu and tap Request on the dishes you want for tomorrow.</p>
          <div class="request-empty-actions">
            <button type="button" class="request-tomorrow-btn-secondary request-go-menu-btn">
              Open Full Menu
            </button>
            ${canSuggest ? `<button type="button" class="request-tomorrow-btn-secondary suggest-empty-btn">Suggest New Dish</button>` : ""}
          </div>
        </div>
      `;
      return;
    }

    requestFoodList.innerHTML = requestBasket.map(item => `
      <div class="request-selected-item" data-id="${item.itemId}">
        <img src="${resolveMediaUrl(item.image)}" alt="${item.itemName}" loading="lazy" decoding="async">
        <div class="request-selected-info">
          <span class="badge badge-secondary">Selected</span>
          <strong>${item.itemName}</strong>
          <span>${formatPrice(item.price)}</span>
        </div>
        <div class="request-selected-controls">
          <label>
            Qty
            <select class="request-qty-select" data-id="${item.itemId}">
              ${[1, 2, 3, 4, 5].map(q => `<option value="${q}" ${item.quantity === q ? "selected" : ""}>${q}</option>`).join("")}
            </select>
          </label>
          <button type="button" class="remove-request-btn" data-id="${item.itemId}">
            <i class="bx bx-trash"></i> Remove
          </button>
        </div>
      </div>
    `).join("");
  };

  const getRequestRetentionMs = () => {
    if (settings.requestAutoClearEnabled === false) return Infinity;
    const hours = Math.max(1, Math.min(168, Number(settings.requestAutoClearHours || 36)));
    return hours * 60 * 60 * 1000;
  };

  const saveSubmittedRequests = () => {
    localStorage.setItem("submittedRequests", JSON.stringify(submittedRequests.slice(0, 50)));
  };

  const pruneSubmittedRequests = () => {
    const retentionMs = getRequestRetentionMs();
    if (!Number.isFinite(retentionMs)) return;
    const cutoff = Date.now() - retentionMs;
    submittedRequests = submittedRequests.filter(req => {
      const createdAt = new Date(req.createdAt || 0).getTime();
      return !Number.isFinite(createdAt) || createdAt >= cutoff || normalizeRequestStatus(req.status) !== "closed";
    }).slice(0, 50);
  };

  const rememberSubmittedRequests = (savedRequests) => {
    const byId = new Map(submittedRequests.map(req => [req.id, req]));
    savedRequests.forEach(req => {
      if (!req || !req.id) return;
      const status = normalizeRequestStatus(req.status);
      byId.set(req.id, {
        id: req.id,
        itemId: req.itemId || req.foodItemId || "",
        foodItemId: req.foodItemId || req.itemId || "",
        foodTitle: req.foodTitle || req.itemName || req.title || "Requested dish",
        quantity: Number(req.quantity || 1),
        preferredTime: req.preferredTime || "",
        status,
        statusLabel: req.statusLabel || getRequestStatusLabel(status),
        statusNote: req.statusNote || getRequestStatusLabel(status),
        createdAt: req.createdAt || new Date().toISOString()
      });
    });
    submittedRequests = Array.from(byId.values())
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 50);
    saveSubmittedRequests();
    renderSubmittedRequestStatuses();
  };

  const renderSubmittedRequestStatuses = () => {
    if (!requestStatusPanel || !requestStatusList) return;
    pruneSubmittedRequests();
    saveSubmittedRequests();

    if (submittedRequests.length === 0) {
      requestStatusPanel.style.display = "none";
      requestStatusList.innerHTML = "";
      return;
    }

    requestStatusPanel.style.display = "block";
    requestStatusList.innerHTML = submittedRequests.slice(0, 12).map(req => {
      const status = normalizeRequestStatus(req.status);
      const createdAt = req.createdAt ? new Date(req.createdAt) : null;
      const timeText = createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Submitted";
      const note = req.statusNote || getRequestStatusLabel(status);
      return `
        <div class="request-status-item">
          <div>
            <strong>${req.quantity || 1}x ${req.foodTitle || "Requested dish"}</strong>
            <small>${timeText}${req.preferredTime ? ` - Preferred time: ${req.preferredTime}` : ""}</small>
            <small>${note}</small>
          </div>
          <span class="request-status-pill ${status}">
            <i class="bx ${getRequestStatusIcon(status)}"></i>
            ${getRequestStatusLabel(status)}
          </span>
        </div>
      `;
    }).join("");
  };

  const refreshMyRequestStatuses = async () => {
    if (!submittedRequests.length || !window.dbEngine || typeof window.dbEngine.getMyRequestStatuses !== "function") {
      renderSubmittedRequestStatuses();
      return;
    }

    const ids = submittedRequests.map(req => req.id).filter(Boolean);
    try {
      const liveRequests = await window.dbEngine.getMyRequestStatuses(ids);
      const liveById = new Map((liveRequests || []).map(req => [req.id, req]));
      const retentionMs = getRequestRetentionMs();
      submittedRequests = submittedRequests.map(req => {
        const live = liveById.get(req.id);
        if (live) {
          const status = normalizeRequestStatus(live.status);
          return {
            ...req,
            status,
            statusLabel: live.statusLabel || getRequestStatusLabel(status),
            statusNote: live.statusNote || getRequestStatusLabel(status),
            decidedAt: live.decidedAt || req.decidedAt || ""
          };
        }

        const createdAt = new Date(req.createdAt || 0).getTime();
        if (Number.isFinite(retentionMs) && Number.isFinite(createdAt) && Date.now() - createdAt > retentionMs) {
          return {
            ...req,
            status: "closed",
            statusLabel: getRequestStatusLabel("closed"),
            statusNote: getRequestStatusLabel("closed")
          };
        }
        return req;
      });
      saveSubmittedRequests();
    } catch (error) {
      console.warn("Request status refresh skipped:", error);
    }
    renderSubmittedRequestStatuses();
  };

  const renderFoodCardHtml = (item) => {
    const cartItem = cart.find(c => c.id === item.id);
    const quantity = cartItem ? cartItem.quantity : 0;
    
    const popularBadge = item.popular ? `<span class="badge badge-secondary">Popular</span>` : "";
    
    let requestBadge = "";
    const requestCount = Number(item.requestCount || 0);
    if (settingBool("showRequestCounts", true) && settingBool("enableRequests", true) && requestCount > 0) {
      requestBadge = `
        <span class="badge request-count-badge">
          <i class="bx bxs-heart"></i>
          <span class="request-count-number">${requestCount}</span>
          <span class="request-count-label">requested</span>
        </span>
      `;
    }

    // Check request basket status
    const basketReq = requestBasket.find(r => r.itemId === item.id);
    const inRequestBasket = !!basketReq;
    const reqQty = basketReq ? basketReq.quantity : 1;

    // Check availability states
    const isClosed = settings.restaurantStatus === "closed";
    const allowRequests = settings.allowRequestsWhileClosed !== false;
    const normalizedItem = normalizeMenuItem(item);
    const isSoldOut = normalizedItem.soldOut;
    const isPlannedTomorrow = normalizedItem.confirmedTomorrow || normalizedItem.availableTomorrow;
    
    let timeAvail = { available: true };
    if (normalizedItem.availableToday) {
      timeAvail = checkTimeAvailability(item);
    }
    const isTimeRestricted = !timeAvail.available;

    let cardClass = "food-card";
    const hasDesc = Boolean((item.description || "").trim());
    if (!hasDesc) cardClass += " no-desc";
    let statusBadge = "";
    let statusLine = "";
    let statusLineClass = "status-muted";
    
    if (isSoldOut) {
      cardClass += " sold-out-card";
      statusBadge = `<span class="badge badge-danger-soft"><i class="bx bx-x-circle"></i> Sold Out</span>`;
      statusLine = "Sold out today.";
      statusLineClass = "status-danger";
    } else {
      const badges = [];
      if (isPlannedTomorrow) {
        cardClass += " planned-tomorrow-card";
        badges.push(`<span class="badge badge-success-soft"><i class="bx bx-calendar-check"></i> Tomorrow Plan</span>`);
      }
      if (normalizedItem.availableToday) {
        if (isTimeRestricted) {
          cardClass += " time-restricted-card";
          badges.push(`<span class="badge badge-warning-soft"><i class="bx bx-time"></i> Today at ${item.availableFrom}</span>`);
        } else {
          badges.push(`<span class="badge badge-today"><i class="bx bx-check-circle"></i> Today</span>`);
        }
      }
      if (!isPlannedTomorrow && !normalizedItem.availableToday) {
        cardClass += " unavailable-card requestable-card";
        badges.push(`<span class="badge badge-request-soft"><i class="bx bx-message-square-add"></i> Request</span>`);
      }
      statusBadge = badges.join("");

      if (isPlannedTomorrow && normalizedItem.availableToday) {
        statusLine = "Available today and planned for tomorrow.";
        statusLineClass = "status-success";
      } else if (isPlannedTomorrow) {
        statusLine = "Owner plans to cook this tomorrow.";
        statusLineClass = "status-success";
      } else if (normalizedItem.availableToday && isTimeRestricted) {
        statusLine = `Available today from ${item.availableFrom}.`;
        statusLineClass = "status-warning";
      } else if (normalizedItem.availableToday) {
        statusLine = "Available today. Order now or request it for tomorrow.";
        statusLineClass = "status-today";
      } else {
        statusLine = "Order via cart and WhatsApp, or request it for tomorrow.";
        statusLineClass = "status-request";
      }
    }

    if (isTimeRestricted && normalizedItem.availableToday && !isSoldOut) {
      cardClass += " unavailable-card time-restricted-card";
    }

    let orderHtml = "";
    if (canAcceptPreorders()) {
      if (isSoldOut) {
        orderHtml = `
          <button class="add-order-btn" disabled style="opacity: 0.5; cursor: not-allowed; background: var(--bg-surface-elevated); color: var(--text-muted);">
            Sold Out <i class="bx bx-x-circle"></i>
          </button>
        `;
      } else if (isClosed) {
        orderHtml = `
          <button class="add-order-btn" disabled style="opacity: 0.5; cursor: not-allowed; background: var(--bg-surface-elevated); color: var(--text-muted);">
            Closed <i class="bx bx-lock-alt"></i>
          </button>
        `;
      } else if (normalizedItem.availableToday && isTimeRestricted) {
        orderHtml = `
          <button class="add-order-btn" disabled style="opacity: 0.5; cursor: not-allowed; background: var(--bg-surface-elevated); color: var(--color-primary);">
            ${item.availableFrom} <i class="bx bx-time"></i>
          </button>
        `;
      } else if (isPlannedTomorrow && !normalizedItem.availableToday) {
        orderHtml = `
          <button class="add-order-btn confirmed-preorder-btn" data-id="${item.id}">
            Pre-Order Tomorrow <i class="bx bx-shopping-bag"></i>
          </button>
        `;
      } else {
        orderHtml = `
          <div class="qty-selector" style="${quantity > 0 ? 'display:flex;' : 'display:none;'}">
            <button class="qty-btn minus" data-id="${item.id}" aria-label="Remove one ${item.title}">-</button>
            <span class="qty-val">${quantity}</span>
            <button class="qty-btn plus" data-id="${item.id}" aria-label="Add one ${item.title}">+</button>
          </div>
          <button class="add-order-btn" data-id="${item.id}" style="${quantity > 0 ? 'display:none;' : 'display:flex;'}">
            Order <i class="bx bx-cart-add"></i>
          </button>
        `;
      }
    }

    let requestHtml = "";
    if (!isSoldOut && !isPlannedTomorrow && settingBool("enableRequests", true) && (!isClosed || allowRequests)) {
      if (inRequestBasket) {
        requestHtml = `
          <div class="request-controls-wrapper">
            <span class="badge requested-state-badge"><i class="bx bx-check-double"></i> Requested</span>
            <div class="request-controls-row">
              <select class="request-qty-select" data-id="${item.id}" aria-label="Requested quantity for ${item.title}">
                ${[1, 2, 3, 4, 5].map(q => `<option value="${q}" ${reqQty === q ? 'selected' : ''}>${q}</option>`).join("")}
              </select>
              <button class="remove-request-btn" data-id="${item.id}">
                <i class="bx bx-trash"></i> Remove
              </button>
            </div>
          </div>
        `;
      } else if (normalizedItem.availableToday) {
        requestHtml = `<button class="request-tomorrow-btn-secondary" data-id="${item.id}"><i class="bx bx-calendar-plus"></i> Request Tomorrow</button>`;
      } else {
        requestHtml = `<button class="add-order-btn request-tomorrow-btn-primary" data-id="${item.id}" style="background: var(--gradient-gold); color: black;"><i class="bx bx-calendar-plus"></i> Request</button>`;
      }
    } else if (!isSoldOut && isPlannedTomorrow && !orderHtml && settingBool("enableRequests", true) && (!isClosed || allowRequests)) {
      requestHtml = `<button class="add-order-btn confirmed-reserve-btn" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); color: var(--text-secondary);" data-id="${item.id}">
        Reserve Tomorrow <i class="bx bx-bell"></i>
      </button>`;
    } else if (!normalizedItem.availableToday && !isSoldOut && !isPlannedTomorrow) {
      requestHtml = `<span class="food-card-unavailable-note">Not available today</span>`;
    }

    const actionHtml = `
      <div class="card-actions-wrapper">
        ${orderHtml}
        ${requestHtml}
      </div>
    `;

    return `
      <div class="${cardClass}" data-id="${item.id}">
        <button class="food-card-img-wrapper food-card-image-button" type="button" data-action="view-image" aria-label="Open ${item.title} photo">
          <img src="${resolveMediaUrl(item.image)}" alt="${item.title}" class="food-card-img" loading="lazy" decoding="async">
          <div class="food-card-badges">
            ${popularBadge}
            ${statusBadge}
            ${requestBadge}
          </div>
        </button>
        <div class="food-card-content">
          <h3 class="food-card-title" data-action="view-details" tabindex="0">${item.title}</h3>
          <p class="food-card-status ${statusLineClass}">${statusLine}</p>
          ${(item.description || "").trim() ? `<p class="food-card-desc">${item.description}</p>` : ""}
          <div class="food-card-footer">
            <span class="food-card-price">${formatPrice(item.price)}</span>
            ${actionHtml}
          </div>
        </div>
      </div>
    `;
  };

  const bindCardActions = () => {
    document.querySelectorAll('[data-action="view-image"]').forEach(trigger => {
      trigger.addEventListener("click", (e) => {
        const id = e.target.closest(".food-card").dataset.id;
        openImageViewer(id);
      });
    });

    document.querySelectorAll('[data-action="view-details"]').forEach(title => {
      title.addEventListener("click", (e) => {
        const id = e.target.closest(".food-card").dataset.id;
        openDetailModal(id);
      });
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const id = e.target.closest(".food-card").dataset.id;
          openDetailModal(id);
        }
      });
    });

    document.querySelectorAll(".add-order-btn:not(.request-tomorrow-btn-primary):not(.confirmed-preorder-btn):not(.confirmed-reserve-btn)").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        addToCart(id);
      });
    });

    document.querySelectorAll(".request-tomorrow-btn-secondary, .request-tomorrow-btn-primary").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        addToRequestBasket(id);
      });
    });

    document.querySelectorAll("#today-food-list .confirmed-preorder-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const item = menuItems.find(entry => entry.id === id);
        if (item) handleConfirmedPreOrder(item);
      });
    });

    document.querySelectorAll("#today-food-list .confirmed-reserve-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        addToRequestBasket(id);
      });
    });

    document.querySelectorAll(".suggest-empty-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        switchSection("suggest");
        document.getElementById("section-suggest-dish")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll(".request-go-menu-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        switchSection("today");
        document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll(".remove-request-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        removeFromRequestBasket(id);
      });
    });

    document.querySelectorAll(".request-qty-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const id = e.currentTarget.dataset.id;
        const qty = parseInt(e.currentTarget.value);
        updateRequestQuantity(id, qty);
      });
    });

    document.querySelectorAll(".qty-btn.plus").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        updateQuantity(id, 1);
      });
    });

    document.querySelectorAll(".qty-btn.minus").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        updateQuantity(id, -1);
      });
    });
  };

  // --- TIME SLOTS ENGINE ---
  const generateTimeSlots = () => {
    const startHour = 12;
    const endHour = 22;
    let html = "";

    for (let h = startHour; h < endHour; h++) {
      const formatTime = (hour) => {
        const ampm = hour >= 12 ? "PM" : "AM";
        let displayHour = hour % 12;
        displayHour = displayHour ? displayHour : 12;
        return `${displayHour}:00 ${ampm}`;
      };

      const startText = formatTime(h);
      const endText = formatTime(h + 1);
      const val = `${startText} - ${endText}`;
      const checked = h === startHour ? "checked" : "";

      html += `
        <div class="time-slot-item">
          <input type="radio" name="preferredTime" id="slot-${h}" class="time-slot-opt" value="${val}" ${checked}>
          <label for="slot-${h}" class="time-slot-label">${val}</label>
        </div>
      `;
    }
    timeSlotsContainer.innerHTML = html;
  };

  // --- CART OPERATIONS ---
  const addToCart = (id) => {
    if (!canAcceptPreorders()) {
      alert("Pre-orders are currently disabled.");
      return;
    }
    const isClosed = settings.restaurantStatus === "closed";
    if (isClosed) {
      alert("Orders are currently closed.");
      return;
    }

    const item = menuItems.find(i => i.id === id);
    if (!item || !item.availableToday || item.soldOut) return;

    const timeAvail = checkTimeAvailability(item);
    if (!timeAvail.available) {
      alert(`This item is only available from ${item.availableFrom} to ${item.availableTo}.`);
      return;
    }

    cart.push({
      id: item.id,
      title: item.title,
      price: item.price,
      quantity: 1,
      image: item.image
    });

    logAction("cart_add", {
      itemId: item.id,
      itemTitle: item.title,
      itemPrice: item.price,
      quantity: 1
    });

    updateUI();
  };

  const updateQuantity = (id, change) => {
    const isClosed = settings.restaurantStatus === "closed";
    if (isClosed && change > 0) {
      alert("Orders are currently closed.");
      return;
    }

    const cartIndex = cart.findIndex(c => c.id === id);
    if (cartIndex === -1) return;

    const item = cart[cartIndex];
    const origItem = menuItems.find(i => i.id === id);
    if (origItem && change > 0) {
      if (origItem.soldOut) {
        alert("This item is now sold out.");
        return;
      }
      const timeAvail = checkTimeAvailability(origItem);
      if (!timeAvail.available) {
        alert(`This item is only available from ${origItem.availableFrom} to ${origItem.availableTo}.`);
        return;
      }
    }

    const newQty = item.quantity + change;

    if (newQty <= 0) {
      logAction("cart_remove", {
        itemId: item.id,
        itemTitle: item.title,
        price: item.price
      });
      cart.splice(cartIndex, 1);
    } else {
      item.quantity = newQty;
      logAction("cart_quantity_change", {
        itemId: item.id,
        itemTitle: item.title,
        newQuantity: newQty
      });
    }

    updateUI();
  };

  const updateUI = () => {
    renderMenu();

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) {
      cartBadge.innerText = totalQty;
      if (totalQty > 0) {
        cartBadge.style.transform = "scale(1.2)";
        setTimeout(() => cartBadge.style.transform = "scale(1)", 150);
      }
    }

    const cartBadgeBottom = document.getElementById("cart-badge-bottom");
    if (cartBadgeBottom) {
      cartBadgeBottom.innerText = totalQty;
    }

    renderCartDrawerList();
  };

  const renderCartDrawerList = () => {
    const isClosed = settings.restaurantStatus === "closed";
    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="cart-empty">
          <i class="bx bx-basket"></i>
          <p>Your pre-order list is empty.<br>Choose delicious meals to fill it!</p>
        </div>
      `;
      cartTotalVal.innerText = formatPrice(0);
      cartCheckoutBtn.disabled = true;
      cartCheckoutBtn.style.opacity = "0.5";
      cartCheckoutBtn.innerText = isClosed ? "Orders Closed" : "Proceed to Pre-Order";
      return;
    }

    if (isClosed) {
      cartCheckoutBtn.disabled = true;
      cartCheckoutBtn.style.opacity = "0.5";
      cartCheckoutBtn.innerText = "Orders Closed";
    } else {
      cartCheckoutBtn.disabled = false;
      cartCheckoutBtn.style.opacity = "1";
      cartCheckoutBtn.innerText = "Proceed to Pre-Order";
    }

    let html = "";
    let subtotal = 0;

    cart.forEach(item => {
      const itemCost = item.price * item.quantity;
      subtotal += itemCost;

      html += `
        <div class="cart-item">
          <img src="${resolveMediaUrl(item.image)}" alt="${item.title}" class="cart-item-img" loading="lazy" decoding="async">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.title}</h4>
            <span class="cart-item-price">${formatPrice(item.price)}</span>
          </div>
          
          <div class="qty-selector">
            <button class="qty-btn minus" data-id="${item.id}">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn plus" data-id="${item.id}">+</button>
          </div>
          
          <button class="cart-item-remove" data-id="${item.id}" title="Remove item">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      `;
    });

    cartItemsList.innerHTML = html;
    cartTotalVal.innerText = formatPrice(subtotal);

    cartItemsList.querySelectorAll(".qty-btn.plus").forEach(btn => {
      btn.addEventListener("click", (e) => updateQuantity(e.currentTarget.dataset.id, 1));
    });
    cartItemsList.querySelectorAll(".qty-btn.minus").forEach(btn => {
      btn.addEventListener("click", (e) => updateQuantity(e.currentTarget.dataset.id, -1));
    });
    cartItemsList.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", (e) => updateQuantity(e.currentTarget.dataset.id, -999));
    });
  };

  // --- REQUEST BASKET OPERATIONS ---
  const addToRequestBasket = (id) => {
    const isClosed = settings.restaurantStatus === "closed";
    const allowRequests = settings.allowRequestsWhileClosed !== false;
    if (!settingBool("enableRequests", true) || (isClosed && !allowRequests)) {
      alert("Requests are currently closed.");
      return;
    }

    let item = menuItems.find(i => i.id === id);
    if (!item) {
      // Check if it's a custom decision item
      const decision = cookingDecisions[id];
      if (decision && typeof decision === "object" && decision.status === "selected" && decision.isCustom) {
        item = {
          id: id,
          title: decision.title,
          price: decision.price || 12.50,
          image: decision.image || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
          description: decision.description || ""
        };
      }
    }
    if (!item) return;

    // Check if already in request basket
    const existing = requestBasket.find(r => r.itemId === id);
    if (existing) {
      alert(`"${item.title}" is already in your Request Basket.`);
      return;
    }

    requestBasket.push({
      itemId: item.id,
      itemName: item.title,
      price: item.price,
      quantity: 1,
      image: item.image
    });

    logAction("request_basket_add", { itemId: item.id, itemTitle: item.title });
    updateRequestUI();
  };

  const updateRequestQuantity = (id, qty) => {
    const item = requestBasket.find(r => r.itemId === id);
    if (item) {
      item.quantity = qty;
      logAction("request_basket_qty_change", { itemId: id, quantity: qty });
    }
    updateRequestUI();
  };

  const removeFromRequestBasket = (id) => {
    const index = requestBasket.findIndex(r => r.itemId === id);
    if (index !== -1) {
      logAction("request_basket_remove", { itemId: id });
      requestBasket.splice(index, 1);
    }
    updateRequestUI();
  };

  const updateRequestUI = () => {
    localStorage.setItem("requestBasket", JSON.stringify(requestBasket));

    renderMenu();

    const totalRequestsCount = requestBasket.length;
    if (requestBadge) requestBadge.innerText = totalRequestsCount;
    if (requestBadgeDot) requestBadgeDot.style.display = totalRequestsCount > 0 ? "block" : "none";

    renderRequestDrawerList();
    renderRequestInlineSummary();
    renderSubmittedRequestStatuses();
  };

  const renderRequestDrawerList = () => {
    if (!requestItemsList) return;

    if (requestBasket.length === 0) {
      requestItemsList.innerHTML = `
        <div class="cart-empty">
          <i class="bx bx-calendar-star" style="color: var(--color-secondary); font-size: 3rem;"></i>
          <p>Your request basket is empty.<br>Request dishes you want to eat tomorrow!</p>
        </div>
      `;
      if (requestTotalCount) requestTotalCount.innerText = "0 items";
      if (requestCheckoutBtn) {
        requestCheckoutBtn.disabled = true;
        requestCheckoutBtn.style.opacity = "0.5";
      }
      return;
    }

    if (requestCheckoutBtn) {
      requestCheckoutBtn.disabled = false;
      requestCheckoutBtn.style.opacity = "1";
    }

    let html = "";
    requestBasket.forEach(item => {
      html += `
        <div class="cart-item" style="border-bottom-color: rgba(255, 182, 39, 0.1);">
          <img src="${resolveMediaUrl(item.image)}" alt="${item.itemName}" class="cart-item-img" loading="lazy" decoding="async">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.itemName}</h4>
            <span class="cart-item-price" style="color: var(--color-secondary);">${formatPrice(item.price)}</span>
          </div>
          
          <div style="display:flex; align-items:center; gap:8px;">
            <select class="drawer-request-qty-select" data-id="${item.itemId}" style="background:var(--bg-surface-elevated); border:1px solid var(--border-color); padding:4px; border-radius:var(--radius-sm); font-size:0.8rem; color:white;">
              ${[1, 2, 3, 4, 5].map(q => `<option value="${q}" ${item.quantity === q ? 'selected' : ''}>${q}</option>`).join("")}
            </select>
          </div>
          
          <button class="cart-item-remove request-item-remove" data-id="${item.itemId}" title="Remove request">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      `;
    });

    requestItemsList.innerHTML = html;
    if (requestTotalCount) requestTotalCount.innerText = `${requestBasket.length} item${requestBasket.length > 1 ? 's' : ''}`;

    // Bind drawer events
    requestItemsList.querySelectorAll(".drawer-request-qty-select").forEach(select => {
      select.addEventListener("change", (e) => {
        updateRequestQuantity(e.currentTarget.dataset.id, parseInt(e.currentTarget.value));
      });
    });

    requestItemsList.querySelectorAll(".request-item-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        removeFromRequestBasket(e.currentTarget.dataset.id);
      });
    });
  };

  const renderRequestInlineSummary = () => {
    const summary = document.getElementById("request-inline-summary");
    const text = document.getElementById("request-inline-text");
    if (!summary || !text) return;

    if (requestBasket.length === 0) {
      summary.style.display = "none";
      text.innerText = "No selected requests yet.";
      return;
    }

    const totalQty = requestBasket.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    const names = requestBasket.map(item => `${item.quantity}x ${item.itemName}`).join(", ");
    text.innerText = `${requestBasket.length} dish${requestBasket.length > 1 ? "es" : ""}, ${totalQty} portion${totalQty > 1 ? "s" : ""}: ${names}`;
    summary.style.display = "grid";
  };

  // --- MODAL TRIGGERS & RENDER ---
  const getDisplayItemById = (id) => {
    let item = menuItems.find(i => i.id === id);
    if (!item && cookingDecisions[id] && typeof cookingDecisions[id] === "object") {
      const decision = cookingDecisions[id];
      item = {
        id,
        title: decision.title || "Selected dish",
        description: decision.description || "",
        price: decision.price || 0,
        image: decision.image || "",
        category: "Tomorrow",
        availableToday: false,
        popular: false
      };
    }
    return item;
  };

  const ensureImageViewer = () => {
    let viewer = document.getElementById("image-viewer-modal");
    if (viewer) return viewer;

    viewer = document.createElement("div");
    viewer.id = "image-viewer-modal";
    viewer.className = "image-viewer-modal";
    viewer.innerHTML = `
      <div class="image-viewer-stage" role="dialog" aria-modal="true" aria-label="Food photo viewer">
        <button class="image-viewer-close" type="button" aria-label="Close image"><i class="bx bx-x"></i></button>
        <div class="image-viewer-frame">
          <img class="image-viewer-img" src="" alt="">
        </div>
        <div class="image-viewer-caption">
          <strong></strong>
          <span></span>
        </div>
        <div class="image-viewer-controls">
          <button type="button" data-zoom="out" aria-label="Zoom out"><i class="bx bx-minus"></i></button>
          <span class="image-viewer-zoom">100%</span>
          <button type="button" data-zoom="in" aria-label="Zoom in"><i class="bx bx-plus"></i></button>
        </div>
      </div>
    `;
    document.body.appendChild(viewer);

    const closeViewer = () => {
      viewer.classList.remove("active");
      document.body.classList.remove("modal-open");
    };

    viewer.addEventListener("click", (e) => {
      const clickedImage = e.target.closest(".image-viewer-img");
      const clickedControl = e.target.closest(".image-viewer-controls, .image-viewer-close");
      if (!clickedImage && !clickedControl) closeViewer();
    });
    viewer.querySelector(".image-viewer-close").addEventListener("click", closeViewer);
    viewer.querySelectorAll("[data-zoom]").forEach(btn => {
      btn.addEventListener("click", () => {
        const direction = btn.dataset.zoom;
        imageViewerState.zoom = direction === "in"
          ? Math.min(3, imageViewerState.zoom + 0.25)
          : Math.max(1, imageViewerState.zoom - 0.25);
        const img = viewer.querySelector(".image-viewer-img");
        const zoomText = viewer.querySelector(".image-viewer-zoom");
        img.style.transform = `scale(${imageViewerState.zoom})`;
        zoomText.textContent = `${Math.round(imageViewerState.zoom * 100)}%`;
      });
    });

    return viewer;
  };

  const openImageViewer = (id) => {
    const item = getDisplayItemById(id);
    if (!item || !item.image) return;

    logAction("item_image_view", {
      itemId: item.id,
      itemTitle: item.title,
      itemCategory: item.category
    });

    const viewer = ensureImageViewer();
    const img = viewer.querySelector(".image-viewer-img");
    imageViewerState.zoom = 1;
    img.src = resolveMediaUrl(item.image);
    img.alt = item.title;
    img.style.transform = "scale(1)";
    viewer.querySelector(".image-viewer-caption strong").textContent = item.title;
    viewer.querySelector(".image-viewer-caption span").textContent = (item.description || "").trim();
    viewer.querySelector(".image-viewer-zoom").textContent = "100%";
    viewer.classList.add("active");
    document.body.classList.add("modal-open");
  };

  const openDetailModal = (id) => {
    const item = getDisplayItemById(id);
    if (!item) return;

    logAction("item_view", {
      itemId: item.id,
      itemTitle: item.title,
      itemCategory: item.category
    });

    const isPopular = item.popular ? `<span class="badge badge-secondary">Popular Choice</span>` : "";
    const detailStatusBadges = [];
    if (item.soldOut) {
      detailStatusBadges.push(`<span class="badge badge-danger-soft">Sold Out</span>`);
    } else {
      if (item.confirmedTomorrow || item.availableTomorrow) {
        detailStatusBadges.push(`<span class="badge badge-success-soft"><i class="bx bx-calendar-check"></i> Tomorrow Plan</span>`);
      }
      if (item.availableToday) {
        detailStatusBadges.push(`<span class="badge badge-today"><i class="bx bx-check-circle"></i> Today</span>`);
      }
      if (!item.availableToday && !item.confirmedTomorrow && !item.availableTomorrow) {
        detailStatusBadges.push(`<span class="badge badge-request-soft"><i class="bx bx-message-square-add"></i> Request</span>`);
      }
    }

    detailModalBody.innerHTML = `
      <div class="detail-modal-grid">
        <button class="detail-modal-image-button" type="button" data-id="${item.id}" aria-label="Open ${item.title} photo fullscreen">
          <img src="${resolveMediaUrl(item.image)}" alt="${item.title}" class="detail-modal-img" loading="lazy" decoding="async">
        </button>
        <div>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            <span class="badge badge-outline">${item.category}</span>
            ${isPopular}
            ${detailStatusBadges.join("")}
          </div>
          <h2 class="detail-modal-title">${item.title}</h2>
          <div class="detail-modal-price">${formatPrice(item.price)}</div>
          ${(item.description || "").trim() ? `<p class="detail-modal-desc">${item.description}</p>` : ""}
        </div>
      </div>
    `;

    detailModal.classList.add("active");
    const detailImgBtn = detailModalBody.querySelector(".detail-modal-image-button");
    if (detailImgBtn) {
      detailImgBtn.addEventListener("click", () => openImageViewer(item.id));
    }
  };

  const openCheckoutModal = () => {
    if (cart.length === 0) return;
    const fulfillment = getFulfillmentAvailability();
    if (!fulfillment.any) {
      alert("Pre-orders are currently disabled.");
      return;
    }

    logAction("checkout_begin", {
      cartItemsCount: cart.length,
      cartTotalValue: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)
    });

    let html = "";
    let subtotal = 0;

    cart.forEach(item => {
      const cost = item.price * item.quantity;
      subtotal += cost;
      html += `
        <div class="checkout-summary-item">
          <span>${item.quantity}x ${item.title}</span>
          <span>${formatPrice(cost)}</span>
        </div>
      `;
    });

    checkoutItemsSummary.innerHTML = html;
    checkoutTotalVal.innerText = formatPrice(subtotal);

    // Apply delivery and pickup controls from settings
    const optDelivery = document.getElementById("opt-delivery");
    const optPickup = document.getElementById("opt-pickup");
    const optDeliveryLabel = document.querySelector("label[for='opt-delivery']");
    const optPickupLabel = document.querySelector("label[for='opt-pickup']");

    if (optDelivery) {
      optDelivery.disabled = !fulfillment.delivery;
      optDelivery.checked = fulfillment.delivery;
    }
    if (optPickup) {
      optPickup.disabled = !fulfillment.pickup;
      optPickup.checked = !fulfillment.delivery && fulfillment.pickup;
    }
    if (optDeliveryLabel) optDeliveryLabel.style.display = fulfillment.delivery ? "" : "none";
    if (optPickupLabel) optPickupLabel.style.display = fulfillment.pickup ? "" : "none";

    setRequiredState("cust-name", "checkout-name-label", settingBool("orderNameRequired", true), "Your Full Name");
    setRequiredState("cust-phone", "checkout-phone-label", settingBool("orderPhoneRequired", true), "Phone Number");
    const timeLabel = document.getElementById("checkout-time-label");
    if (timeLabel) timeLabel.innerText = `Preferred Time Slot Tomorrow${settingBool("orderTimeRequired", true) ? " *" : " (Optional)"}`;
    setRequiredState("cust-notes", "checkout-notes-label", settingBool("orderNotesRequired", false), "Special Requests / Notes");

    // Prefill name & phone
    const nameInput = document.getElementById("cust-name");
    const phoneInput = document.getElementById("cust-phone");
    if (nameInput) nameInput.value = localStorage.getItem("customerName") || "";
    if (phoneInput) phoneInput.value = localStorage.getItem("customerPhone") || "";

    cartDrawer.classList.remove("active");
    cartOverlay.classList.remove("active");
    checkoutModal.classList.add("active");
  };

  const openRequestCheckoutModal = () => {
    if (requestBasket.length === 0) return;

    logAction("request_checkout_begin", { count: requestBasket.length });

    // Populate summary in modal
    let html = "";
    requestBasket.forEach(item => {
      html += `
        <div class="checkout-summary-item">
          <span>${item.quantity}x ${item.itemName}</span>
          <span style="color: var(--color-secondary);">${formatPrice(item.price * item.quantity)}</span>
        </div>
      `;
    });
    requestItemsSummary.innerHTML = html;

    // Apply settings for required request fields
    setRequiredState("request-name", "request-name-label", settingBool("requestNameRequired", false), "Your Full Name");
    const phoneInput = document.getElementById("request-phone");
    const requestPhoneRequired = settings.requestPhoneRequired === undefined ? !!settings.phoneRequiredForRequest : !!settings.requestPhoneRequired;
    setRequiredState("request-phone", "request-phone-label", requestPhoneRequired, "Phone Number");
    setRequiredState("request-time", "request-time-label", settingBool("requestTimeRequired", true), "Preferred Time Slot");
    setRequiredState("request-notes", "request-notes-label", settingBool("requestNotesRequired", false), "Special Requests / Notes");

    // Prefill name & phone
    const nameInput = document.getElementById("request-name");
    if (nameInput) nameInput.value = localStorage.getItem("customerName") || "";
    if (phoneInput) phoneInput.value = localStorage.getItem("customerPhone") || "";

    requestDrawer.classList.remove("active");
    requestOverlay.classList.remove("active");

    const requestTomorrowModal = document.getElementById("request-tomorrow-modal");
    document.getElementById("request-modal-form-body").style.display = "block";
    document.getElementById("request-modal-success-body").style.display = "none";
    requestTomorrowModal.classList.add("active");
  };

  // --- SUBMIT ORDER (CHECKOUT) ---
  const handleCheckoutSubmit = async () => {
    const name = document.getElementById("cust-name").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const selectedFulfillment = document.querySelector('input[name="orderType"]:checked');
    const selectedTime = document.querySelector('input[name="preferredTime"]:checked');
    const deliveryType = selectedFulfillment ? selectedFulfillment.value : "";
    const preferredTime = selectedTime ? selectedTime.value : "";
    const notes = document.getElementById("cust-notes").value.trim();

    if (settingBool("orderNameRequired", true) && !name) {
      alert("Name is required.");
      return;
    }
    if (settingBool("orderPhoneRequired", true) && !phone) {
      alert("Phone number is required.");
      return;
    }
    if (!deliveryType) {
      alert("Choose delivery or pickup.");
      return;
    }
    if (settingBool("orderTimeRequired", true) && !preferredTime) {
      alert("Preferred time is required.");
      return;
    }
    if (settingBool("orderNotesRequired", false) && !notes) {
      alert("Notes are required.");
      return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
      customerName: name || "Anonymous",
      customerPhone: phone || "N/A",
      type: deliveryType,
      fulfillmentType: deliveryType,
      preferredTime: preferredTime,
      notes: notes,
      items: cart.map(i => ({
        id: i.id,
        title: i.title,
        price: i.price,
        quantity: i.quantity
      })),
      total: total
    };

    const btn = document.getElementById("submit-order-btn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Submitting...`;

    try {
      const savedOrder = await window.dbEngine.saveOrder(orderData);
      
      await logAction("submit_order", {
        orderId: savedOrder.id,
        orderTotal: total,
        itemsCount: cart.length
      });

      // Save customer info locally for reuse
      if (name) localStorage.setItem("customerName", name);
      if (phone) localStorage.setItem("customerPhone", phone);

      confOrderId.innerText = savedOrder.id;
      confCustomerName.innerText = name || "Anonymous";
      confFulfillmentType.innerText = deliveryType;
      confTimeSlot.innerText = preferredTime;
      confTotalPrice.innerText = formatPrice(total);

      setupWhatsAppLink(savedOrder);

      checkoutForm.reset();
      cart = [];
      updateUI();

      checkoutModal.classList.remove("active");
      successModal.classList.add("active");

    } catch (err) {
      console.error("Error submitting order:", err);
      alert("Something went wrong while placing your order. Please try again.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };

  // --- WHATSAPP ORDER LINK COMPILER ---
  const setupWhatsAppLink = (order) => {
    const whatsappContact = cleanWhatsAppNumber(settings.whatsappOrderNumber);
    
    const dishesListText = order.items.map(i => {
      const itemCost = i.price * i.quantity;
      return `- ${i.quantity}x ${i.title} (${formatPrice(itemCost)})`;
    }).join("\n");

    const message = `Hello, I want to pre-order for tomorrow from ${settings.businessName || 'Gourmet Tomorrow'}.

*Order ID:* ${order.id}
*Name:* ${order.customerName}
*Phone:* ${order.customerPhone}

*Order:*
${dishesListText}

*Total Expected:* ${formatPrice(order.total)}
*Fulfillment:* ${order.type}
*Preferred Time:* ${order.preferredTime}
${order.notes ? `*Notes:* ${order.notes}` : ""}`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${whatsappContact}?text=${encoded}`;
    
    // Show confirmation sent step
    const confirmSentBtn = document.getElementById("confirm-sent-btn");
    if (confirmSentBtn) {
      confirmSentBtn.style.display = "block";
      confirmSentBtn.onclick = async () => {
        try {
          await window.dbEngine.updateOrderStatus(order.id, "Customer Confirmed");
          logAction("order_confirmed_by_customer", { orderId: order.id });
          alert("Order confirmation logged. Thank you!");
          confirmSentBtn.style.display = "none";
          successModal.classList.remove("active");
        } catch (err) {
          console.error("Error confirming order status:", err);
        }
      };
    }

    whatsappBtn.onclick = () => {
      if (!whatsappContact) {
        alert("WhatsApp order number is not configured in Settings.");
        return;
      }
      logAction("whatsapp_click", { orderId: order.id });
      window.open(waUrl, "_blank");
    };
  };

  // --- SUBMIT MULTI-REQUESTS ---
  const handleRequestFormSubmit = async () => {
    const name = document.getElementById("request-name").value.trim();
    const phone = document.getElementById("request-phone").value.trim();
    const preferredTime = document.getElementById("request-time").value;
    const notes = document.getElementById("request-notes").value.trim();

    const requestPhoneRequired = settings.requestPhoneRequired === undefined ? !!settings.phoneRequiredForRequest : !!settings.requestPhoneRequired;
    if (settingBool("requestNameRequired", false) && !name) {
      alert("Name is required.");
      return;
    }
    if (requestPhoneRequired && !phone) {
      alert("Phone number is required.");
      return;
    }
    if (settingBool("requestTimeRequired", true) && !preferredTime) {
      alert("Preferred time is required.");
      return;
    }
    if (settingBool("requestNotesRequired", false) && !notes) {
      alert("Notes are required.");
      return;
    }

    const btn = document.getElementById("submit-request-btn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Submitting...`;

    try {
      const submitPromises = requestBasket.map(basketItem => {
        const requestData = {
          itemId: basketItem.itemId,
          itemName: basketItem.itemName,
          foodItemId: basketItem.itemId,
          foodTitle: basketItem.itemName,
          customerName: name || "Anonymous",
          phone: phone || "N/A",
          customerPhone: phone || "N/A",
          quantity: basketItem.quantity,
          notes: notes,
          preferredTime: preferredTime,
          isCustom: basketItem.itemId.startsWith("custom_"),
          reserve: true,
          sessionId: window.dbEngine.getSessionId()
        };
        return window.dbEngine.saveTomorrowRequest(requestData);
      });

      const savedRequests = await Promise.all(submitPromises);
      rememberSubmittedRequests(savedRequests);
      await refreshMyRequestStatuses();

      // Save customer info locally
      if (name) localStorage.setItem("customerName", name);
      if (phone) localStorage.setItem("customerPhone", phone);

      logAction("request_submit", { count: requestBasket.length });

      // Render success items list
      if (confReqItemsList) {
        confReqItemsList.innerHTML = savedRequests.map(r => `
          <div class="conf-row">
            <span>${r.foodTitle}</span>
            <strong>${r.quantity} portion${r.quantity > 1 ? 's' : ''}</strong>
          </div>
        `).join("");
      }
      
      const confReqTime = document.getElementById("conf-req-time");
      if (confReqTime) confReqTime.innerText = preferredTime;

      // Setup Chef WhatsApp link
      setupRequestWhatsAppLink(savedRequests, name, phone, preferredTime, notes);

      // Reset request basket
      requestBasket = [];
      updateRequestUI();

      document.getElementById("request-modal-form-body").style.display = "none";
      document.getElementById("request-modal-success-body").style.display = "block";

    } catch (err) {
      console.error("Error submitting request:", err);
      alert("Failed to submit request. Please try again.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };

  // --- WHATSAPP REQUEST LINK COMPILER ---
  const setupRequestWhatsAppLink = (requestsList, name, phone, preferredTime, notes) => {
    const requestWhatsappBtn = document.getElementById("request-whatsapp-btn");
    if (!requestWhatsappBtn) return;

    // Use chef number if configured, fallback to business number
    const chefNumber = cleanWhatsAppNumber(settings.chefWhatsappNumber);
    const orderNumber = cleanWhatsAppNumber(settings.whatsappOrderNumber);
    const whatsappContact = chefNumber || orderNumber;

    const requestItemsText = requestsList.map(r => `- ${r.quantity}x ${r.foodTitle}`).join("\n");

    const message = `Hello, I want to request food for tomorrow from ${settings.businessName || 'Gourmet Tomorrow'}!

*Name:* ${name || "Anonymous"}
*Phone:* ${phone || "N/A"}
*Time:* ${preferredTime}

*Requested Items:*
${requestItemsText}
${notes ? `\n*Notes:* ${notes}` : ""}`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${whatsappContact}?text=${encoded}`;
    
    requestWhatsappBtn.onclick = () => {
      if (!whatsappContact) {
        alert("Chef WhatsApp number is not configured in Settings.");
        return;
      }
      logAction("request_whatsapp_click", { requestsCount: requestsList.length });
      window.open(waUrl, "_blank");
    };
  };

  // --- CLIENT BEHAVIOR LOG UTILITY ---
  const logAction = (action, details = {}) => {
    try {
      window.dbEngine.saveBehaviorLog(action, details);
    } catch (err) {
      console.warn("Telemetry warning:", err);
    }
  };

  // --- CONFIRMED MENU RENDER ---
  const renderConfirmedMenu = () => {
    if (!tomorrowFoodList) return;
    
    const confirmedItemsList = [];
    
    menuItems.forEach(item => {
      if (item.confirmedTomorrow || item.availableTomorrow) {
        confirmedItemsList.push({
          id: item.id,
          title: item.title,
          description: item.description || "",
          price: item.price,
          image: item.image,
          isCustom: false
        });
      }
    });
    
    for (const [key, val] of Object.entries(cookingDecisions)) {
      if (val && typeof val === "object" && val.status === "selected" && val.isCustom) {
        if (!confirmedItemsList.some(i => i.id === key)) {
          confirmedItemsList.push({
            id: key,
            title: val.title,
            description: val.description || "",
            price: val.price || 12.50,
            image: val.image || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
            isCustom: true
          });
        }
      }
    }

    if (confirmedItemsList.length > 0) {
      const sortedConfirmed = [...confirmedItemsList].sort(compareTitles);
      tomorrowFoodList.innerHTML = sortedConfirmed.map(item => {
        const reserveEnabled = settingBool("enableRequests", true) && (settings.restaurantStatus !== "closed" || settings.allowRequestsWhileClosed !== false);
        const preorderButton = canAcceptPreorders()
          ? `<button class="add-order-btn confirmed-preorder-btn" data-id="${item.id}">
              Pre-Order <i class="bx bx-shopping-bag"></i>
            </button>`
          : "";
        const reserveButton = reserveEnabled
          ? `<button class="add-order-btn confirmed-reserve-btn" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); color: var(--text-secondary);" data-id="${item.id}">
              Reserve <i class="bx bx-bell"></i>
            </button>`
          : "";
        return `
          <div class="food-card confirmed-card${(item.description || "").trim() ? "" : " no-desc"}" data-id="${item.id}">
            <button class="food-card-img-wrapper food-card-image-button" type="button" data-action="view-image" aria-label="Open ${item.title} photo" style="aspect-ratio: 16/10;">
              <img src="${resolveMediaUrl(item.image)}" alt="${item.title}" class="food-card-img" loading="lazy" decoding="async">
              <div class="food-card-badges">
                <span class="badge" style="background: var(--gradient-success); color: white;"><i class="bx bx-check-shield"></i> Chef Selected</span>
              </div>
            </button>
            <div class="food-card-content">
              <h3 class="food-card-title">${item.title}</h3>
              ${(item.description || "").trim() ? `<p class="food-card-desc">${item.description}</p>` : ""}
              <div class="food-card-footer">
                <span class="food-card-price">${formatPrice(item.price)}</span>
                <div style="display: flex; gap: 8px;">
                  ${preorderButton}
                  ${reserveButton}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("");

      // Bind events to confirmed menu buttons
      tomorrowFoodList.querySelectorAll('[data-action="view-image"]').forEach(trigger => {
        trigger.addEventListener("click", (e) => {
          const id = e.target.closest(".food-card").dataset.id;
          openImageViewer(id);
        });
      });

      tomorrowFoodList.querySelectorAll(".confirmed-preorder-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const id = e.currentTarget.dataset.id;
          const item = sortedConfirmed.find(i => i.id === id);
          if (item) {
            handleConfirmedPreOrder(item);
          }
        });
      });

      tomorrowFoodList.querySelectorAll(".confirmed-reserve-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const id = e.currentTarget.dataset.id;
          const item = sortedConfirmed.find(i => i.id === id);
          if (item) {
            addToRequestBasket(item.id);
          }
        });
      });
    } else {
      tomorrowFoodList.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">No items confirmed for tomorrow yet.</p>`;
    }
  };

  const handleConfirmedPreOrder = (item) => {
    if (!canAcceptPreorders() || settings.restaurantStatus === "closed") {
      alert("Pre-orders are currently closed.");
      return;
    }
    const cartItem = cart.find(c => c.id === item.id);
    if (cartItem) {
      cartItem.quantity++;
    } else {
      cart.push({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: 1,
        image: item.image
      });
    }

    logAction("confirmed_preorder_add", {
      itemId: item.id,
      itemTitle: item.title,
      price: item.price
    });

    updateUI();
  };

  // --- EVENT LISTENERS REGISTRATION ---
  const setupListeners = () => {
    // 1. Cart Drawer toggle open/close
    cartBtn.addEventListener("click", () => {
      logAction("cart_drawer_open", { cartSize: cart.length });
      cartDrawer.classList.add("active");
      cartOverlay.classList.add("active");
    });

    const closeCart = () => {
      cartDrawer.classList.remove("active");
      cartOverlay.classList.remove("active");
    };
    cartCloseBtn.addEventListener("click", closeCart);
    cartOverlay.addEventListener("click", closeCart);

    // 2. Request Drawer toggle open/close
    if (requestBasketBtn) {
      requestBasketBtn.addEventListener("click", () => {
        logAction("request_drawer_open", { size: requestBasket.length });
        requestDrawer.classList.add("active");
        requestOverlay.classList.add("active");
      });
    }

    const closeRequestDrawer = () => {
      requestDrawer.classList.remove("active");
      requestOverlay.classList.remove("active");
    };
    if (requestCloseBtn) requestCloseBtn.addEventListener("click", closeRequestDrawer);
    if (requestOverlay) requestOverlay.addEventListener("click", closeRequestDrawer);

    // 3. Checkout Modals trigger
    cartCheckoutBtn.addEventListener("click", openCheckoutModal);
    checkoutModalClose.addEventListener("click", () => {
      logAction("checkout_cancel");
      checkoutModal.classList.remove("active");
    });

    if (requestCheckoutBtn) {
      requestCheckoutBtn.addEventListener("click", openRequestCheckoutModal);
    }
    const requestInlineSubmitBtn = document.getElementById("request-inline-submit-btn");
    if (requestInlineSubmitBtn) {
      requestInlineSubmitBtn.addEventListener("click", openRequestCheckoutModal);
    }

    const requestSuggestBtn = document.getElementById("request-suggest-btn");
    if (requestSuggestBtn) {
      requestSuggestBtn.addEventListener("click", () => {
        switchSection("suggest");
        document.getElementById("section-suggest-dish")?.scrollIntoView({ behavior: "smooth", block: "start" });
        logAction("request_suggest_cta_click", {});
      });
    }

    // 4. Detail Modal close
    detailModalClose.addEventListener("click", () => {
      detailModal.classList.remove("active");
    });

    // Close modals by clicking backdrop
    window.addEventListener("click", (e) => {
      if (e.target === detailModal) detailModal.classList.remove("active");
      if (e.target === checkoutModal) {
        logAction("checkout_cancel");
        checkoutModal.classList.remove("active");
      }
      if (e.target === requestDrawer) {
        requestDrawer.classList.remove("active");
        requestOverlay.classList.remove("active");
      }
    });

    // 5. Submit Order Form
    checkoutForm.addEventListener("submit", handleCheckoutSubmit);

    // 6. Close Success modal
    successCloseBtn.addEventListener("click", () => {
      successModal.classList.remove("active");
    });

    // 7. Real-time Search Input (Debounced)
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = searchInput.value.trim();
        if (query) {
          logAction("search", { query: query });
        }
        renderMenu();
      }, 400);
    });

    // 8. Navigation Links (smooth tracking/scrolling)
    document.getElementById("link-home").addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      logAction("nav_click", { section: "home" });
    });
    
    document.getElementById("link-menu").addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
      logAction("nav_click", { section: "menu" });
    });

    document.getElementById("link-about").addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("about").scrollIntoView({ behavior: "smooth" });
      logAction("nav_click", { section: "about" });
    });

    heroActionBtn.addEventListener("click", () => {
      logAction("hero_cta_click");
    });

    // 9. Request Tomorrow form submit
    const requestForm = document.getElementById("request-tomorrow-form");
    if (requestForm) {
      requestForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleRequestFormSubmit();
      });
    }

    // 10. Close request modal
    const requestModal = document.getElementById("request-tomorrow-modal");
    const requestModalClose = document.getElementById("request-modal-close");
    if (requestModalClose) {
      requestModalClose.addEventListener("click", () => {
        requestModal.classList.remove("active");
      });
    }

    const requestSuccessCloseBtn = document.getElementById("request-success-close-btn");
    if (requestSuccessCloseBtn) {
      requestSuccessCloseBtn.addEventListener("click", () => {
        requestModal.classList.remove("active");
      });
    }

    // Close modals by clicking backdrop
    window.addEventListener("click", (e) => {
      if (e.target === requestModal) {
        requestModal.classList.remove("active");
      }
    });

    // 11. Nav link for Request Food
    const linkVoting = document.getElementById("link-voting");
    if (linkVoting) {
      linkVoting.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll(".nav-links a").forEach(link => link.classList.remove("active"));
        linkVoting.classList.add("active");
        switchSection("request");
        document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
        logAction("nav_click", { section: "menu_request" });
      });
    }

    const linkSuggest = document.getElementById("link-suggest");
    if (linkSuggest) {
      linkSuggest.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll(".nav-links a").forEach(link => link.classList.remove("active"));
        linkSuggest.classList.add("active");
        switchSection("suggest");
        document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
        logAction("nav_click", { section: "menu_suggest" });
      });
    }

    // 9b. Dish Suggestion form submit
    const suggestionForm = document.getElementById("dish-suggestion-form");
    if (suggestionForm) {
      suggestionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const dishName = document.getElementById("sug-dish-name").value.trim();
        const custNameRaw = document.getElementById("sug-cust-name").value.trim();
        const custPhoneRaw = document.getElementById("sug-cust-phone").value.trim();
        const notes = document.getElementById("sug-notes").value.trim();
        
        if (!dishName) return;
        if (settingBool("suggestionNameRequired", false) && !custNameRaw) {
          alert("Name is required.");
          return;
        }
        if (settingBool("suggestionPhoneRequired", false) && !custPhoneRaw) {
          alert("Phone number is required.");
          return;
        }
        if (settingBool("suggestionNotesRequired", false) && !notes) {
          alert("Notes are required.");
          return;
        }
        
        const btn = suggestionForm.querySelector("button[type='submit']");
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Submitting...`;
        
        try {
          const suggestionData = {
            dishName: dishName,
            customerName: custNameRaw || "Anonymous",
            customerPhone: custPhoneRaw || "N/A",
            notes: notes,
            sessionId: window.dbEngine.getSessionId()
          };
          
          await window.dbEngine.saveCustomerSuggestion(suggestionData);
          logAction("submit_suggestion", { dishName: dishName });
          
          alert("Your dish suggestion has been submitted to the chef! Thank you.");
          suggestionForm.reset();
          
          // Switch to Today or Tomorrow tab
          switchSection("today");
        } catch (err) {
          console.error("Error submitting suggestion:", err);
          alert("Failed to submit suggestion. Please try again.");
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }

    // 11b. Mobile Bottom Nav items click handlers
    const btnNavHome = document.getElementById("btn-nav-home");
    const btnNavMenu = document.getElementById("btn-nav-menu");
    const btnNavRequest = document.getElementById("btn-nav-request");
    const btnNavCart = document.getElementById("btn-nav-cart");
    const allBottomNavItems = document.querySelectorAll(".bottom-nav-item");

    const setBottomNavActive = (activeItem) => {
      allBottomNavItems.forEach(item => item.classList.remove("active"));
      if (activeItem) activeItem.classList.add("active");
    };

    if (btnNavHome) {
      btnNavHome.addEventListener("click", (e) => {
        e.preventDefault();
        setBottomNavActive(btnNavHome);
        window.scrollTo({ top: 0, behavior: "smooth" });
        logAction("mobile_nav_click", { tab: "home" });
      });
    }

    if (btnNavMenu) {
      btnNavMenu.addEventListener("click", (e) => {
        e.preventDefault();
        setBottomNavActive(btnNavMenu);
        switchSection("today");
        document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
        logAction("mobile_nav_click", { tab: "menu" });
      });
    }

    if (btnNavRequest) {
      btnNavRequest.addEventListener("click", (e) => {
        e.preventDefault();
        setBottomNavActive(btnNavRequest);
        switchSection(settingBool("enableRequests", true) ? "request" : "suggest");
        document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
        logAction("mobile_nav_click", { tab: "request" });
      });
    }

    if (btnNavCart) {
      btnNavCart.addEventListener("click", (e) => {
        e.preventDefault();
        setBottomNavActive(btnNavCart);
        
        cartDrawer.classList.add("active");
        cartOverlay.classList.add("active");
        
        logAction("mobile_nav_click", { tab: "cart" });
      });
    }

    // 11c. Menu Section horizontal tabs click handlers (mobile view)
    const sectionTabs = document.querySelectorAll(".menu-sections-tabs .section-tab");
    sectionTabs.forEach(tab => {
      tab.addEventListener("click", (e) => {
        const targetSection = e.currentTarget.dataset.section;
        switchSection(targetSection);
        
        logAction("section_tab_click", { section: targetSection });
      });
    });
  };

  // --- MENU SECTION TAB SWITCHER (MOBILE ONLY) ---
  const switchSection = (sectionId) => {
    // Remove active class from all section blocks and add to target
    document.querySelectorAll(".menu-section-block").forEach(block => {
      block.classList.remove("active");
    });
    
    let targetBlockId = "section-available-today";
    if (sectionId === "tomorrow") targetBlockId = "section-confirmed-tomorrow";
    else if (sectionId === "request") targetBlockId = "section-request-tomorrow";
    else if (sectionId === "suggest") targetBlockId = "section-suggest-dish";
    
    const targetBlock = document.getElementById(targetBlockId);
    if (targetBlock) targetBlock.classList.add("active");
    
    // Update active state on horizontal tabs
    document.querySelectorAll(".menu-sections-tabs .section-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.section === sectionId);
    });
    
    // Update active state on bottom nav
    const btnNavMenu = document.getElementById("btn-nav-menu");
    const btnNavRequest = document.getElementById("btn-nav-request");
    
    document.querySelectorAll(".bottom-nav-item").forEach(item => item.classList.remove("active"));
    
    if (sectionId === "today" || sectionId === "tomorrow") {
      if (btnNavMenu) btnNavMenu.classList.add("active");
    } else if (sectionId === "request" || sectionId === "suggest") {
      if (btnNavRequest) btnNavRequest.classList.add("active");
    }
  };

  // Launch initial execution
  init();
});
