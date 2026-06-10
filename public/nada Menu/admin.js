/**
 * Gourmet Tomorrow - Admin Dashboard Logic (admin.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE VARIABLES ---
  let orders = [];
  let behaviorLogs = [];
  let foodItems = [];
  let tomorrowRequests = [];
  let customerSuggestions = [];
  let cookingDecisions = {};
  let settings = {};
  let categories = [];
  let currentEditingItem = null;
  let currentEditingCategory = null;
  let settingsFormDirty = false;
  let hasAutoOpenedRequestsTab = false;
  const ADMIN_POLL_MS = 25000;
  let adminPollTimer = null;

  const getActiveAdminSection = () => {
    const active = document.querySelector("#admin-sections-tabs .section-tab.active");
    return active?.dataset.section || "menu";
  };

  const isSocialTabActive = () => getActiveAdminSection() === "social";

  // --- DOM ELEMENT REFERENCES ---
  const dbIndicatorDot = document.getElementById("db-indicator-dot");
  const dbIndicatorText = document.getElementById("db-indicator-text");
  const resetDemoBtn = document.getElementById("reset-demo-btn");
  
  // KPIs
  const kpiTodayOrders = document.getElementById("kpi-today-orders");
  const kpiTomorrowRequests = document.getElementById("kpi-tomorrow-requests");
  const kpiNewSuggestions = document.getElementById("kpi-new-suggestions");
  const kpiTodayMenuCount = document.getElementById("kpi-today-menu-count");
  const kpiTomorrowMenuCount = document.getElementById("kpi-tomorrow-menu-count");
  const kpiSoldOutCount = document.getElementById("kpi-sold-out-count");
  
  // Visualizations
  const itemsChartContainer = document.getElementById("items-chart-container");
  const slotsChartContainer = document.getElementById("slots-chart-container");
  
  // Tables & Streams
  const ordersTableBody = document.getElementById("orders-table-body");
  const behaviorLogStream = document.getElementById("behavior-log-stream");
  const adminMenuList = document.getElementById("admin-menu-list");
  
  // Dish Modals
  const dishModal = document.getElementById("dish-modal");
  const dishModalTitle = document.getElementById("dish-modal-title");
  const dishModalClose = document.getElementById("dish-modal-close");
  const dishForm = document.getElementById("dish-form");
  const addDishBtn = document.getElementById("add-dish-btn");

  // Category elements
  const btnAddCategory = document.getElementById("btn-add-category");
  const categoryModal = document.getElementById("category-modal");
  const categoryModalClose = document.getElementById("category-modal-close");
  const categoryForm = document.getElementById("category-form");
  const adminCategoryList = document.getElementById("admin-category-list");

  // Settings form elements
  const settingsForm = document.getElementById("settings-form");

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

  const settingBool = (key, fallback = false) => {
    return settings[key] === undefined ? fallback : !!settings[key];
  };

  const getDeliveryOptionsFromToggles = (deliveryEnabled, pickupEnabled) => {
    if (deliveryEnabled && pickupEnabled) return "both";
    if (deliveryEnabled) return "delivery";
    if (pickupEnabled) return "pickup";
    return "none";
  };

  const getFulfillmentTogglesFromOption = (option) => ({
    delivery: option === "both" || option === "delivery",
    pickup: option === "both" || option === "pickup"
  });

  const setSettingsSaveStatus = (message, tone = "muted") => {
    const status = document.getElementById("settings-save-status");
    if (!status) return;
    status.innerText = message;
    status.style.color = tone === "success"
      ? "var(--color-success)"
      : tone === "danger"
        ? "var(--color-danger)"
        : "var(--text-muted)";
  };

  const markSettingsDirty = (message = "Unsaved changes. Press Save Settings.") => {
    settingsFormDirty = true;
    setSettingsSaveStatus(message, "muted");
  };

  // --- TIMEZONE & AVAILABILITY UTILITIES ---
  const getRestaurantTime = () => {
    const tz = settings.restaurantTimezone || "Asia/Bahrain";
    try {
      return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    } catch (e) {
      return new Date(); // fallback
    }
  };

  const getRestaurantDateString = (isoString = null) => {
    const tz = settings.restaurantTimezone || "Asia/Bahrain";
    const date = isoString ? new Date(isoString) : new Date();
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(date);
      const year = parts.find(p => p.type === "year").value;
      const month = parts.find(p => p.type === "month").value;
      const day = parts.find(p => p.type === "day").value;
      return `${year}-${month}-${day}`;
    } catch (e) {
      return date.toISOString().split("T")[0];
    }
  };

  const getSecondsToDeadline = (deadlineTimeStr) => {
    const nowRestaurant = getRestaurantTime();
    
    let [time, ampm] = deadlineTimeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    
    const deadlineRestaurant = new Date(nowRestaurant);
    deadlineRestaurant.setHours(hours, minutes, 0, 0);
    
    if (nowRestaurant > deadlineRestaurant) {
      deadlineRestaurant.setDate(deadlineRestaurant.getDate() + 1);
    }
    
    return Math.max(0, deadlineRestaurant.getTime() - nowRestaurant.getTime());
  };

  // --- CLIENT-SIDE IMAGE COMPRESSION UTILITY ---
  const compressImage = (file, callback, options = {}) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = options.maxWidth || 900;
        const MAX_HEIGHT = options.maxHeight || 900;
        const quality = options.quality || 0.82;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // WebP keeps menu uploads small in Cloudflare while preserving good visual quality.
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        callback(dataUrl);
      };
      img.onerror = () => {
        callback(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      alert("Error reading file");
    };
    reader.readAsDataURL(file);
  };

  // --- INITIALIZE DASHBOARD ---
  const init = async () => {
    // 1. Render Connection Status
    updateDbIndicator();

    // 2. Fetch Initial Dataset
    await refreshData();

    // 3. Setup Listeners
    setupListeners();

    // 4. Poll live data only when admin tab is visible and not on Social (story is browser-only there)
    startAdminPolling();

    // 5. Update voting deadline countdown every second (local UI only, no API)
    setInterval(updateVotingDeadlineTimer, 1000);
  };

  const startAdminPolling = () => {
    if (adminPollTimer) clearInterval(adminPollTimer);
    adminPollTimer = setInterval(async () => {
      if (document.hidden || isSocialTabActive()) return;
      await refreshData();
    }, ADMIN_POLL_MS);
  };

  const syncStoryMenuData = async () => {
    settings = await window.dbEngine.getSettings();
    foodItems = await window.dbEngine.getFoodItems();
    const storyCountEl = document.getElementById("story-today-count");
    if (storyCountEl) {
      const todayCount = foodItems.filter((item) => item.availableToday && item.visible !== false && !item.soldOut).length;
      storyCountEl.textContent = `${todayCount} today`;
    }
  };

  // --- DATA SYNCING ---
  const updateDbIndicator = () => {
    if (window.dbEngine.useCloudflareApi && window.dbEngine.cloudflareApiReady) {
      dbIndicatorDot.className = "indicator-dot firebase";
      dbIndicatorText.innerText = "Cloudflare Live Mode";
      return;
    }

    if (window.dbEngine.useCloudflareApi && !window.dbEngine._apiUnavailable) {
      dbIndicatorDot.className = "indicator-dot firebase";
      dbIndicatorText.innerText = "Connecting to live server...";
      return;
    }

    const isFirebase = window.dbEngine.useFirebase;
    if (isFirebase) {
      dbIndicatorDot.className = "indicator-dot firebase";
      dbIndicatorText.innerText = "Firebase Live Mode";
    } else {
      dbIndicatorDot.className = "indicator-dot local";
      dbIndicatorText.innerText = "Local Demo Mode (localStorage)";
    }
  };

  const switchAdminTab = (section) => {
    const tabBtn = document.querySelector(`#admin-sections-tabs .section-tab[data-section="${section}"]`);
    if (tabBtn) tabBtn.click();
  };

  const updateRequestsTabBadge = () => {
    const badge = document.getElementById("requests-tab-badge");
    if (!badge) return;

    const pendingCount = tomorrowRequests.filter(req => (req.status || "pending") === "pending").length;
    if (pendingCount > 0) {
      badge.innerText = pendingCount;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  };

  const maybeAutoOpenRequestsTab = () => {
    if (hasAutoOpenedRequestsTab) return;
    const pendingCount = tomorrowRequests.filter(req => (req.status || "pending") === "pending").length;
    if (pendingCount > 0) {
      hasAutoOpenedRequestsTab = true;
      switchAdminTab("requests");
    }
  };

  const renderLiveConnectionAlert = () => {
    const container = document.getElementById("admin-config-alert-container");
    if (!container) return;

    const existing = document.getElementById("admin-live-connection-alert");
    if (existing) existing.remove();

    if (window.dbEngine.useCloudflareApi && window.dbEngine.lastApiError && !window.dbEngine.cloudflareApiReady) {
      const alert = document.createElement("div");
      alert.id = "admin-live-connection-alert";
      alert.style.cssText = "background:rgba(230,57,70,0.12); border:1px solid rgba(230,57,70,0.45); color:#ffb4b4; padding:12px 16px; border-radius:var(--radius-sm); margin-bottom:16px; font-size:0.9rem;";
      alert.innerHTML = `<strong>Live connection issue:</strong> ${window.dbEngine.lastApiError}. Customer requests may not load until the live API is reachable.`;
      container.prepend(alert);
    }
  };

  const refreshData = async (options = {}) => {
    const { force = false } = options;
    if (!force && isSocialTabActive()) return;

    try {
      // Load settings and categories first
      settings = await window.dbEngine.getSettings();
      categories = await window.dbEngine.getCategories();

      orders = await window.dbEngine.getOrders();
      behaviorLogs = await window.dbEngine.getBehaviorLogs();
      foodItems = await window.dbEngine.getFoodItems();
      const rawTomorrowRequests = await window.dbEngine.getTomorrowRequests();
      const activeTomorrowRequests = filterActiveRequests(rawTomorrowRequests);
      if (activeTomorrowRequests.length !== rawTomorrowRequests.length) {
        try {
          localStorage.setItem("tomorrowRequests", JSON.stringify(activeTomorrowRequests));
        } catch (e) {
          console.warn("Could not prune expired local request cache:", e);
        }
      }
      tomorrowRequests = activeTomorrowRequests;
      cookingDecisions = await window.dbEngine.getCookingDecisions();
      customerSuggestions = await window.dbEngine.getCustomerSuggestions();
      updateDbIndicator();

      // Populate category dropdown inside Dish Form Modal
      const dishCategorySelect = document.getElementById("dish-category");
      if (dishCategorySelect) {
        dishCategorySelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
      }

      // Populate category filter dropdown
      const adminFilterCat = document.getElementById("admin-filter-category");
      if (adminFilterCat) {
        const currentSelected = adminFilterCat.value;
        adminFilterCat.innerHTML = `<option value="all">All Categories</option>` + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
        adminFilterCat.value = currentSelected || "all";
      }

      // Populate configurations warning alert
      checkChefWhatsappConfig();

      // Load settings form values unless the owner is actively editing unsaved settings.
      if (!settingsFormDirty) {
        loadSettingsForm();
      }

      // Recalculate stats & rebuild views
      calculateKPIs();
      renderItemsChart();
      renderTimeSlotsChart();
      renderOrdersTable();
      renderBehaviorLogs();
      renderMenuManagementList();
      renderCategoryManagementList();
      renderCustomerHistoryTable();
      renderTomorrowPlan();

      // Voting Analytics Render
      calculateVotingAnalytics();
      renderCookingDecisionsTable();
      renderRequestsDetails();
      updateVotingDeadlineTimer();

      // Notification Bell and Chef Summary
      updateNotificationBell();
      updateRequestsTabBadge();
      renderChefSummary();
      renderLiveConnectionAlert();
      maybeAutoOpenRequestsTab();

      // Suggestions render
      await renderSuggestionsTable();

    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
    }
  };

  // --- KPI CALCULATION ENGINE ---
  const calculateKPIs = () => {
    const todayStr = getRestaurantDateString();
    
    // Today's Orders count
    const todayOrders = orders.filter(o => getRestaurantDateString(o.createdAt) === todayStr);
    const todayOrdersCount = todayOrders.length;
    if (kpiTodayOrders) kpiTodayOrders.innerText = todayOrdersCount;

    // Today's Revenue (expected for non-cancelled orders today)
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.status !== "Cancelled" ? order.total : 0), 0);
    const ordersKpiRevenue = document.getElementById("orders-kpi-revenue");
    if (ordersKpiRevenue) ordersKpiRevenue.innerText = formatPrice(todayRevenue);

    // Tomorrow Requests portions sum
    const tomorrowRequestsQty = tomorrowRequests.reduce((sum, req) => sum + (req.quantity || 1), 0);
    if (kpiTomorrowRequests) kpiTomorrowRequests.innerText = tomorrowRequestsQty;

    // Suggestions count
    const suggestionsCount = customerSuggestions.length;
    if (kpiNewSuggestions) kpiNewSuggestions.innerText = suggestionsCount;

    // Today Menu Items count
    const todayMenuItemsCount = foodItems.filter(item => item.availableToday === true).length;
    if (kpiTodayMenuCount) kpiTodayMenuCount.innerText = todayMenuItemsCount;

    // Tomorrow Menu Items count
    const tomorrowMenuItemsCount = foodItems.filter(item => item.confirmedTomorrow === true || item.availableTomorrow === true).length;
    if (kpiTomorrowMenuCount) kpiTomorrowMenuCount.innerText = tomorrowMenuItemsCount;

    // Sold Out Items count
    const soldOutItemsCount = foodItems.filter(item => item.soldOut === true).length;
    if (kpiSoldOutCount) kpiSoldOutCount.innerText = soldOutItemsCount;
  };

  // --- SVG ENGAGEMENT CHART GENERATION ---
  const renderItemsChart = () => {
    const itemStats = {};

    foodItems.forEach(item => {
      itemStats[item.id] = {
        title: item.title,
        views: 0,
        orders: 0
      };
    });

    behaviorLogs.forEach(log => {
      if (log.action === "item_view" && log.details && log.details.itemId) {
        const itemId = log.details.itemId;
        if (itemStats[itemId]) {
          itemStats[itemId].views++;
        }
      }
    });

    orders.forEach(order => {
      if (order.status !== "Cancelled") {
        order.items.forEach(item => {
          if (itemStats[item.id]) {
            itemStats[item.id].orders += item.quantity;
          }
        });
      }
    });

    const statsList = Object.values(itemStats)
                            .sort((a, b) => (b.views + b.orders) - (a.views + a.orders))
                            .slice(0, 7);

    const maxVal = Math.max(...statsList.map(s => Math.max(s.views, s.orders)), 1);

    if (statsList.length === 0 || (statsList.length > 0 && statsList.every(s => s.views === 0 && s.orders === 0))) {
      itemsChartContainer.innerHTML = `
        <div style="width:100%; text-align:center; color:var(--text-muted); font-size:0.85rem; padding-bottom:40px;">
          No engagement data logged yet.
        </div>
      `;
      return;
    }

    let html = "";
    statsList.forEach(stat => {
      const viewPercent = (stat.views / maxVal) * 80;
      const orderPercent = (stat.orders / maxVal) * 80;

      let displayTitle = stat.title;
      if (displayTitle.length > 12) {
        displayTitle = displayTitle.slice(0, 10) + "..";
      }

      html += `
        <div class="svg-chart-bar-col">
          <div style="display:flex; align-items:flex-end; gap:4px; height:180px; width:100%; justify-content:center;">
            <div class="svg-chart-bar" style="height:${viewPercent}%; background:var(--gradient-gold); width:14px;" title="Views: ${stat.views}">
              <div class="svg-chart-bar-tooltip">Views: ${stat.views}</div>
            </div>
            <div class="svg-chart-bar" style="height:${orderPercent}%; width:14px;" title="Ordered: ${stat.orders}">
              <div class="svg-chart-bar-tooltip">Ordered: ${stat.orders}</div>
            </div>
          </div>
          <span class="svg-chart-bar-label" title="${stat.title}">${displayTitle}</span>
        </div>
      `;
    });

    itemsChartContainer.innerHTML = html;
  };

  // --- TIME SLOT POPULARITY PROGRESS BARS ---
  const renderTimeSlotsChart = () => {
    const slotsCount = {};
    orders.forEach(order => {
      if (order.status !== "Cancelled" && order.preferredTime) {
        slotsCount[order.preferredTime] = (slotsCount[order.preferredTime] || 0) + 1;
      }
    });

    const sortedSlots = Object.entries(slotsCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxVal = sortedSlots.length > 0 ? sortedSlots[0][1] : 1;

    if (sortedSlots.length === 0) {
      slotsChartContainer.innerHTML = `
        <p style="text-align:center; color:var(--text-muted); font-size:0.85rem;">No tomorrow delivery slots requested yet.</p>
      `;
      return;
    }

    let html = "";
    sortedSlots.forEach(([slotName, count]) => {
      const percentage = (count / maxVal) * 100;
      html += `
        <div class="metric-row-item">
          <span style="font-weight:600; white-space:nowrap;">${slotName}</span>
          <span style="color:var(--color-primary); font-weight:700;">${count} order${count > 1 ? 's' : ''}</span>
          <div class="metric-row-bar-bg">
            <div class="metric-row-bar-fill" style="width: ${percentage}%;"></div>
          </div>
        </div>
      `;
    });

    slotsChartContainer.innerHTML = html;
  };

  // --- ORDERS TABLE RENDER ---
  const renderOrdersTable = () => {
    if (orders.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
            No orders yet.
          </td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = orders.map(order => {
      const dateText = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateDay = new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const dishesSummary = order.items.map(i => `${i.quantity}x ${i.title}`).join(", ");
      const notesField = order.notes ? `<div style="max-width:180px; font-size:0.8rem; opacity:0.8; word-wrap:break-word; margin-top: 4px;"><b>Note:</b> ${order.notes}</div>` : "";
      const fulfillmentType = order.fulfillmentType || order.type || "Not set";

      // WhatsApp status check from customer behaviour logs
      const hasWaClick = behaviorLogs.some(log => log.action === "whatsapp_click" && log.details && log.details.orderId === order.id);
      const waStatusHtml = hasWaClick ? 
        `<span class="badge" style="background: rgba(37, 211, 102, 0.15); border: 1px solid #25d366; color: #25d366; font-weight:700; display:inline-flex; align-items:center; gap:2px;"><i class="bx bxl-whatsapp"></i> Sent</span>` : 
        `<span class="badge" style="background: rgba(255, 107, 53, 0.15); border: 1px solid var(--color-primary); color: var(--color-primary); display:inline-flex; align-items:center; gap:2px;"><i class="bx bx-time"></i> Not Sent</span>`;

      // Status badge styling
      let statusBadge = `<span class="badge badge-outline">${order.status}</span>`;
      if (order.status === "Pending Confirmation" || order.status === "Pending") {
        statusBadge = `<span class="badge" style="background: rgba(255, 182, 39, 0.15); border: 1px solid var(--color-secondary); color: var(--color-secondary);">Pending</span>`;
      } else if (order.status === "Confirmed") {
        statusBadge = `<span class="badge" style="background: rgba(46, 196, 182, 0.15); border: 1px solid #2ec4b6; color: #2ec4b6; font-weight:700;">Confirmed</span>`;
      } else if (order.status === "Preparing") {
        statusBadge = `<span class="badge" style="background: rgba(255, 107, 53, 0.15); border: 1px solid var(--color-primary); color: var(--color-primary); font-weight:700;">Preparing</span>`;
      } else if (order.status === "Completed") {
        statusBadge = `<span class="badge" style="background: rgba(46, 196, 182, 0.2); border: 1px solid var(--color-success); color: var(--color-success); font-weight:700;">Completed</span>`;
      } else if (order.status === "Cancelled") {
        statusBadge = `<span class="badge" style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--color-danger); color: var(--color-danger);">Cancelled</span>`;
      }

      return `
        <tr data-order-id="${order.id}">
          <td><strong style="color:var(--color-secondary);">${order.id}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${dateDay} ${dateText}</span></td>
          <td><strong>${order.customerName}</strong></td>
          <td><a href="tel:${order.customerPhone}" style="color:var(--color-primary); font-weight:600;">${order.customerPhone}</a></td>
          <td><span class="badge ${fulfillmentType === 'Delivery' ? 'badge-primary' : 'badge-outline'}">${fulfillmentType}</span><br><span style="font-size:0.75rem; color:var(--text-muted);">${order.preferredTime || 'No time set'}</span></td>
          <td><span style="font-weight:500;">${dishesSummary}</span>${notesField}</td>
          <td><strong style="color:var(--text-primary);">${formatPrice(order.total)}</strong></td>
          <td>${waStatusHtml}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <button class="admin-btn-outline order-action-btn confirm" data-id="${order.id}" style="padding:4px 8px; font-size:0.75rem; border-color:var(--color-success); color:var(--color-success); background:transparent;">Confirm</button>
              <button class="admin-btn-outline order-action-btn preparing" data-id="${order.id}" style="padding:4px 8px; font-size:0.75rem; border-color:var(--color-primary); color:var(--color-primary); background:transparent;">Preparing</button>
              <button class="admin-btn-outline order-action-btn completed" data-id="${order.id}" style="padding:4px 8px; font-size:0.75rem; border-color:#2ec4b6; color:#2ec4b6; background:transparent;">Completed</button>
              <button class="admin-btn-outline order-action-btn cancelled" data-id="${order.id}" style="padding:4px 8px; font-size:0.75rem; border-color:var(--color-danger); color:var(--color-danger); background:transparent;">Cancel</button>
              <button class="admin-btn-outline order-action-btn delete" data-id="${order.id}" style="padding:4px 8px; font-size:0.75rem; border-color:var(--text-muted); color:var(--text-muted); background:transparent;" title="Delete Order"><i class="bx bx-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    ordersTableBody.querySelectorAll(".order-action-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (e.currentTarget.classList.contains("delete")) {
          if (confirm(`Are you sure you want to delete order "${id}"?`)) {
            await window.dbEngine.deleteOrder(id);
            refreshData();
          }
          return;
        }
        
        let newStatus = "Pending";
        if (e.currentTarget.classList.contains("confirm")) newStatus = "Confirmed";
        else if (e.currentTarget.classList.contains("preparing")) newStatus = "Preparing";
        else if (e.currentTarget.classList.contains("completed")) newStatus = "Completed";
        else if (e.currentTarget.classList.contains("cancelled")) newStatus = "Cancelled";
        
        await window.dbEngine.updateOrderStatus(id, newStatus);
        await window.dbEngine.saveBehaviorLog("admin_change_status", {
          orderId: id,
          newStatus: newStatus
        });
        refreshData();
      });
    });
  };

  // --- LIVE TELEMETRY FEED RENDER ---
  const renderBehaviorLogs = () => {
    if (behaviorLogs.length === 0) {
      behaviorLogStream.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding-top:60px;">
          Waiting for customer interactions...
        </div>
      `;
      return;
    }

    const subset = behaviorLogs.slice(0, 35);

    behaviorLogStream.innerHTML = subset.map(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      let description = "Action recorded";
      let cssClass = log.action;

      switch (log.action) {
        case "page_view":
          description = `Visited landing page from <i>${log.details.referrer || 'direct'}</i>`;
          break;
        case "category_filter_click":
          description = `Filtered dishes by: <b>${log.details.category}</b>`;
          break;
        case "search":
          description = `Searched query: "<b>${log.details.query}</b>"`;
          break;
        case "item_view":
          description = `Opened details for: <b>${log.details.itemTitle}</b>`;
          break;
        case "cart_add":
          description = `Added <b>${log.details.quantity}x ${log.details.itemTitle}</b> to cart`;
          break;
        case "cart_remove":
          description = `Removed <b>${log.details.itemTitle}</b> from cart`;
          break;
        case "cart_quantity_change":
          description = `Adjusted quantity of <b>${log.details.itemTitle}</b> to ${log.details.newQuantity}`;
          break;
        case "cart_drawer_open":
          description = `Opened shopping cart drawer (Items: ${log.details.cartSize})`;
          break;
        case "checkout_begin":
          description = `Initiated checkout flow (Cart value: ${formatPrice(log.details.cartTotalValue)})`;
          break;
        case "checkout_cancel":
          description = `Cancelled checkout form`;
          break;
        case "submit_order":
          description = `Placed pre-order <b style="color:var(--color-success);">${log.details.orderId}</b> (${formatPrice(log.details.orderTotal)})`;
          break;
        case "whatsapp_click":
          description = `Initiated WhatsApp transfer for order <b>${log.details.orderId}</b>`;
          break;
        case "admin_change_status":
          description = `Admin updated order <b>${log.details.orderId}</b> to <b>${log.details.newStatus}</b>`;
          break;
        case "admin_modify_settings":
          description = `Admin modified system settings`;
          break;
        case "admin_modify_category":
          description = `Admin ${log.details.action === 'edit' ? 'edited' : 'created'} category: <b>${log.details.categoryName}</b>`;
          break;
        case "admin_delete_category":
          description = `Admin deleted category: <b>${log.details.categoryName}</b>`;
          break;
        case "request_basket_add":
          description = `Added <b>${log.details.itemTitle}</b> to request tomorrow basket`;
          break;
        case "request_basket_remove":
          description = `Removed item <b>${log.details.itemId}</b> from request basket`;
          break;
        case "request_submit":
          description = `Submitted <b>${log.details.count} requests</b> for tomorrow`;
          break;
        default:
          description = `Logged action: ${log.action}`;
      }

      return `
        <div class="log-stream-item ${cssClass}">
          <div class="log-stream-header">
            <span class="log-stream-tag" style="color: ${getTagColor(log.action)};">${log.action.replace("_", " ")}</span>
            <span class="log-stream-time">${timeStr}</span>
          </div>
          <div class="log-stream-body">${description}</div>
          <div style="font-size: 0.65rem; color: var(--text-muted); margin-top:2px;">Session: ${log.sessionId.slice(-6)}</div>
        </div>
      `;
    }).join("");
  };

  const getTagColor = (action) => {
    switch (action) {
      case "submit_order": return "var(--color-success)";
      case "cart_add": return "var(--color-primary)";
      case "cart_remove": return "var(--color-danger)";
      case "item_view": return "var(--color-secondary)";
      case "checkout_begin": return "#2ec4b6";
      case "search": return "#a29bfe";
      default: return "var(--text-muted)";
    }
  };

  // --- MENU MANAGEMENT PANEL (CRUD) ---
  const renderMenuManagementList = () => {
    if (foodItems.length === 0) {
      adminMenuList.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px; width: 100%;">No menu items found.</p>`;
      return;
    }

    const searchQuery = document.getElementById("admin-search-dishes") ? document.getElementById("admin-search-dishes").value.trim().toLowerCase() : "";
    const selectedCategory = document.getElementById("admin-filter-category") ? document.getElementById("admin-filter-category").value : "all";
    const selectedStatus = document.getElementById("admin-filter-status") ? document.getElementById("admin-filter-status").value : "all";

    const filtered = foodItems.filter(item => {
      // 1. Search Query
      const title = item.title || "";
      const description = item.description || "";
      const matchesSearch = title.toLowerCase().includes(searchQuery) || 
                            description.toLowerCase().includes(searchQuery);
      
      // 2. Category
      const matchesCategory = selectedCategory === "all" || selectedCategory === "" || item.category === selectedCategory;
      
      // 3. Status
      let matchesStatus = true;
      if (selectedStatus === "today") {
        matchesStatus = item.availableToday === true;
      } else if (selectedStatus === "tomorrow") {
        matchesStatus = item.confirmedTomorrow === true || item.availableTomorrow === true;
      } else if (selectedStatus === "soldout") {
        matchesStatus = item.soldOut === true;
      } else if (selectedStatus === "hidden") {
        matchesStatus = item.visible === false;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (filtered.length === 0) {
      adminMenuList.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px; width: 100%;">No matching menu items found.</p>`;
      return;
    }

    adminMenuList.innerHTML = filtered.map(item => {
      const popularBadge = item.popular ? `<span class="badge badge-secondary" style="font-size:0.65rem; padding: 2px 6px;">Popular</span>` : "";
      const soldOutBadge = item.soldOut ? `<span class="badge badge-danger" style="font-size:0.65rem; padding: 2px 6px;">Sold Out</span>` : "";
      const hiddenBadge = item.visible ? "" : `<span class="badge badge-outline" style="font-size:0.65rem; padding: 2px 6px; border-color:var(--color-danger); color:var(--color-danger);">Hidden</span>`;
      const timeWindowText = (item.availableFrom && item.availableTo) ? `<div style="font-size:0.7rem; color:var(--color-primary); margin-top:4px;"><i class="bx bx-time"></i> Slot: ${item.availableFrom} - ${item.availableTo}</div>` : "";

      return `
        <div class="admin-menu-item-row" data-id="${item.id}">
          <img src="${resolveMediaUrl(item.image)}" alt="${item.title}" class="admin-menu-item-img" loading="lazy" decoding="async">
          
          <div class="admin-menu-item-details">
            <div class="admin-menu-item-title">
              <span>${item.title}</span> 
              ${popularBadge} 
              ${soldOutBadge} 
              ${hiddenBadge}
            </div>
            <div style="font-size: 0.75rem; color:var(--text-secondary); margin-bottom: 2px;">Category: ${item.category}</div>
            <div class="admin-menu-item-price">${formatPrice(item.price)}</div>
            ${timeWindowText}

            <!-- Checkbox toggles grid -->
            <div class="menu-item-toggles">
              <label>
                <input type="checkbox" class="toggle-prop" data-prop="availableToday" data-id="${item.id}" ${item.availableToday ? 'checked' : ''}> Available Today
              </label>
              <label>
                <input type="checkbox" class="toggle-prop" data-prop="confirmedTomorrow" data-id="${item.id}" ${item.confirmedTomorrow ? 'checked' : ''}> Confirmed Tomorrow
              </label>
              <label>
                <input type="checkbox" class="toggle-prop" data-prop="soldOut" data-id="${item.id}" ${item.soldOut ? 'checked' : ''}> Sold Out
              </label>
              <label>
                <input type="checkbox" class="toggle-prop" data-prop="visible" data-id="${item.id}" ${item.visible !== false ? 'checked' : ''}> Visible
              </label>
              <label>
                <input type="checkbox" class="toggle-prop" data-prop="popular" data-id="${item.id}" ${item.popular ? 'checked' : ''}> Popular
              </label>
            </div>
          </div>

          <div class="admin-menu-item-actions">
            <button class="admin-icon-btn edit" data-id="${item.id}" title="Edit Food Details">
              <i class="bx bx-edit-alt"></i>
            </button>
            <button class="admin-icon-btn delete" data-id="${item.id}" title="Delete Food Item">
              <i class="bx bx-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    bindMenuManagementActions();
  };

  const bindMenuManagementActions = () => {
    // 1. Toggle properties directly
    adminMenuList.querySelectorAll(".toggle-prop").forEach(checkbox => {
      checkbox.addEventListener("change", async (e) => {
        const id = e.target.dataset.id;
        const prop = e.target.dataset.prop;
        const value = e.target.checked;
        
        const item = foodItems.find(i => i.id === id);
        if (item) {
          item[prop] = value;
          if (prop === "confirmedTomorrow") {
            item.availableTomorrow = value;
            await window.dbEngine.setAvailableTomorrow(id, value);
          }
          await window.dbEngine.saveFoodItem(item);
          refreshData();
        }
      });
    });

    // 2. Edit item
    adminMenuList.querySelectorAll(".admin-icon-btn.edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const item = foodItems.find(i => i.id === id);
        if (item) {
          openDishModal(item);
        }
      });
    });

    // 3. Delete item with warnings
    adminMenuList.querySelectorAll(".admin-icon-btn.delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        deleteFoodItemConfirm(id);
      });
    });
  };

  // --- DELETE FOOD WARNING AND CONFIRMATION ENGINE ---
  const deleteFoodItemConfirm = async (itemId) => {
    const item = foodItems.find(i => i.id === itemId);
    if (!item) return;

    // Check if item has orders or requests
    const hasOrders = orders.some(order => 
      order.items && order.items.some(oi => oi.id === itemId)
    );
    const hasRequests = tomorrowRequests.some(req => req.foodItemId === itemId);

    let warnMessage = `Are you sure you want to delete this food item "${item.title}"?`;
    if (hasOrders || hasRequests) {
      warnMessage += `\n\nWARNING: This item has existing orders or requests. Deleting may affect reports.\n\nWould you prefer to HIDE the food item from customers instead of deleting it? (Click OK to Hide, Cancel to proceed with Deletion options)`;
      if (confirm(warnMessage)) {
        item.visible = false;
        await window.dbEngine.saveFoodItem(item);
        alert(`"${item.title}" is now hidden.`);
        refreshData();
        return;
      }
    } else {
      if (!confirm(warnMessage)) {
        return;
      }
    }

    // Double check confirmation for final deletion
    if (confirm(`Are you absolutely sure you want to delete "${item.title}" permanently? This cannot be undone.`)) {
      await window.dbEngine.deleteFoodItem(itemId);
      alert(`"${item.title}" deleted.`);
      refreshData();
    }
  };

  // --- CRUD DISH MODAL LOGIC ---
  const openDishModal = (item = null) => {
    currentEditingItem = item;
    dishForm.reset();

    const previewContainer = document.getElementById("image-upload-preview-container");
    const previewImage = document.getElementById("image-upload-preview");
    if (previewContainer) previewContainer.style.display = "none";
    if (previewImage) previewImage.src = "";

    if (item) {
      dishModalTitle.innerText = "Edit Food Item";
      document.getElementById("dish-id").value = item.id;
      document.getElementById("dish-title").value = item.title;
      document.getElementById("dish-category").value = item.category;
      document.getElementById("dish-price").value = item.price;
      document.getElementById("dish-image").value = item.image;
      document.getElementById("dish-desc").value = item.description || "";
      document.getElementById("dish-available").checked = item.availableToday;
      document.getElementById("dish-confirmed-tomorrow").checked = !!item.confirmedTomorrow;
      document.getElementById("dish-visible").checked = item.visible !== false;
      document.getElementById("dish-popular").checked = item.popular;
      document.getElementById("dish-available-from").value = item.availableFrom || "";
      document.getElementById("dish-available-to").value = item.availableTo || "";
    } else {
      dishModalTitle.innerText = "Add New Food";
      document.getElementById("dish-id").value = "";
      document.getElementById("dish-available").checked = true;
      document.getElementById("dish-confirmed-tomorrow").checked = false;
      document.getElementById("dish-visible").checked = true;
      document.getElementById("dish-popular").checked = false;
      document.getElementById("dish-available-from").value = "";
      document.getElementById("dish-available-to").value = "";
    }

    dishModal.classList.add("active");
  };

  const resolveMediaUrl = (url) => {
    if (window.dbEngine && typeof window.dbEngine.resolveMediaUrl === "function") {
      return window.dbEngine.resolveMediaUrl(url);
    }
    return url || "";
  };

  const DISH_PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80";

  const getDishImageUrl = (image) => {
    const resolved = resolveMediaUrl(image);
    return resolved || DISH_PLACEHOLDER_IMAGE;
  };

  const getFoodItemImage = (itemId) => {
    const item = foodItems.find(food => food.id === itemId);
    return getDishImageUrl(item && item.image);
  };

  const getRequestRetentionHours = () => {
    return Math.max(1, Math.min(168, Number(settings.requestAutoClearHours || 24)));
  };

  const isRequestFromToday = (createdAt) => {
    if (!createdAt) return true;
    return getRestaurantDateString(createdAt) === getRestaurantDateString();
  };

  const filterActiveRequests = (requests = []) => {
    if (!settingBool("requestAutoClearEnabled", true)) return requests;
    const retentionMs = getRequestRetentionHours() * 60 * 60 * 1000;
    const now = Date.now();
    return requests.filter((req) => {
      if (!req.createdAt) return true;
      const created = new Date(req.createdAt).getTime();
      return isRequestFromToday(req.createdAt) && (now - created <= retentionMs);
    });
  };

  const formatRequestTimestamp = (createdAt) => {
    if (!createdAt) return "Unknown time";
    const date = new Date(createdAt);
    const todayStr = getRestaurantDateString();
    const requestDay = getRestaurantDateString(createdAt);
    const dayLabel = requestDay === todayStr ? "Today" : "Earlier";
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dayLabel} ${timeStr}`;
  };

  const deleteAllTomorrowRequests = async () => {
    await window.dbEngine.resetDailyRequests();
    localStorage.setItem("adminLastCheckedCount", "0");
    await window.dbEngine.saveBehaviorLog("admin_delete_all_requests", { count: tomorrowRequests.length });
    await refreshData();
  };

  const handleDishFormSubmit = async () => {
    const id = document.getElementById("dish-id").value;
    const title = document.getElementById("dish-title").value.trim();
    const category = document.getElementById("dish-category").value;
    const price = parseFloat(document.getElementById("dish-price").value);
    let image = document.getElementById("dish-image").value.trim();
    const description = document.getElementById("dish-desc").value.trim();
    const availableToday = document.getElementById("dish-available").checked;
    const confirmedTomorrow = document.getElementById("dish-confirmed-tomorrow").checked;
    const visible = document.getElementById("dish-visible").checked;
    const popular = document.getElementById("dish-popular").checked;
    const availableFrom = document.getElementById("dish-available-from").value || null;
    const availableTo = document.getElementById("dish-available-to").value || null;

    if (!title || isNaN(price) || !image) {
      alert("Please add a food name, price, and image. Description is optional.");
      return;
    }

    const btn = document.getElementById("save-dish-btn");
    const originalText = btn.innerHTML;
    btn.disabled = true;

    if (image.startsWith("data:") && window.dbEngine.uploadImageDataUrl) {
      btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Uploading image...`;
      try {
        image = await window.dbEngine.uploadImageDataUrl(image, "menu");
        document.getElementById("dish-image").value = image;
      } catch (err) {
        console.error("Image upload failed:", err);
        alert("Could not save the compressed image live. Please upload the photo again.");
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }
    }

    const dishData = {
      id: id || null,
      title,
      category,
      price,
      image: resolveMediaUrl(image),
      description: description || "",
      availableToday,
      confirmedTomorrow,
      availableTomorrow: confirmedTomorrow,
      popular,
      availableFrom,
      availableTo,
      visible,
      soldOut: currentEditingItem ? (currentEditingItem.soldOut || false) : false
    };

    btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Saving...`;

    try {
      const savedDish = await window.dbEngine.saveFoodItem(dishData);
      if (savedDish && savedDish.id) {
        dishData.id = savedDish.id;
      }

      // Save Tomorrow decision if checked
      if (confirmedTomorrow && dishData.id) {
        await window.dbEngine.setAvailableTomorrow(dishData.id, true);
      }

      await window.dbEngine.saveBehaviorLog("admin_modify_menu", {
        dishTitle: title,
        actionType: id ? "edit" : "create"
      });

      dishModal.classList.remove("active");
      refreshData();
    } catch (err) {
      console.error("Error saving dish:", err);
      alert("Failed to save menu item.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };

  // --- TOMORROW FOOD VOTING ANALYTICS & LOGIC ---
  const calculateVotingAnalytics = () => {
    // Total portions requested sum
    const totalRequestsQty = tomorrowRequests.reduce((sum, req) => sum + (req.quantity || 1), 0);
    const voteCountEl = document.getElementById("kpi-vote-count");
    if (voteCountEl) voteCountEl.innerText = totalRequestsQty;

    // Reserved portions count
    const totalReserves = tomorrowRequests.reduce((sum, req) => sum + (req.quantity || 1), 0);
    const reserveCountEl = document.getElementById("kpi-reserve-count");
    if (reserveCountEl) reserveCountEl.innerText = totalReserves;

    let expectedInterestSales = 0;
    tomorrowRequests.forEach(req => {
      if (req.isCustom) {
        expectedInterestSales += 12.50 * (req.quantity || 1);
      } else {
        const option = foodItems.find(o => o.id === req.foodItemId);
        expectedInterestSales += (option ? option.price : 12.50) * (req.quantity || 1);
      }
    });
    const expectedSalesEl = document.getElementById("kpi-vote-expected-sales");
    if (expectedSalesEl) expectedSalesEl.innerText = formatPrice(expectedInterestSales);

    // Voter conversion
    const voterPhones = new Set(tomorrowRequests.map(r => r.customerPhone.trim()));
    const convertedVoters = orders.filter(o => o.status !== "Cancelled" && voterPhones.has(o.customerPhone.trim())).length;
    const voterCount = Math.max(tomorrowRequests.length, 1);
    const voterConversionRate = tomorrowRequests.length > 0 ? (convertedVoters / voterCount) * 100 : 0.0;
    
    const voterConvEl = document.getElementById("kpi-voter-conversion");
    if (voterConvEl) voterConvEl.innerText = `${voterConversionRate.toFixed(1)}%`;
    
    const trendEl = document.getElementById("kpi-voter-conversion-trend");
    if (trendEl) {
      if (voterConversionRate > 30) {
        trendEl.className = "kpi-trend positive";
        trendEl.innerHTML = `<i class="bx bx-trending-up"></i> Strong conversion`;
      } else if (voterConversionRate > 10) {
        trendEl.className = "kpi-trend neutral";
        trendEl.innerHTML = `<i class="bx bx-minus"></i> Moderate conversion`;
      } else {
        trendEl.className = "kpi-trend neutral";
        if (tomorrowRequests.length > 0) trendEl.style.color = "var(--color-danger)";
        trendEl.innerHTML = `<i class="bx bx-trending-down"></i> Low conversion`;
      }
    }

    // Popularity Podium ranking calculations
    const aggregates = {};
    foodItems.forEach(opt => {
      aggregates[opt.title] = {
        id: opt.id,
        title: opt.title,
        image: opt.image,
        votes: 0,
        portions: 0,
        isCustom: false,
        price: opt.price
      };
    });

    tomorrowRequests.forEach(req => {
      const title = req.foodTitle;
      if (!aggregates[title]) {
        aggregates[title] = {
          id: req.foodItemId || "custom",
          title: title,
          image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
          votes: 0,
          portions: 0,
          isCustom: true,
          price: 12.50
        };
      }
      aggregates[title].votes++;
      aggregates[title].portions += req.quantity || 1;
    });

    const sortedItems = Object.values(aggregates).sort((a, b) => b.portions - a.portions);
    
    const first = sortedItems[0] && sortedItems[0].portions > 0 ? sortedItems[0] : null;
    const second = sortedItems[1] && sortedItems[1].portions > 0 ? sortedItems[1] : null;
    const third = sortedItems[2] && sortedItems[2].portions > 0 ? sortedItems[2] : null;

    const podiumWrapper = document.getElementById("podium-rankings-wrapper");
    if (podiumWrapper) {
      if (!first && !second && !third) {
        podiumWrapper.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; width:100%; text-align:center;">No requests submitted yet to establish rankings.</p>`;
      } else {
        let podiumHtml = "";

        if (second) {
          podiumHtml += `
            <div class="podium-col second" style="display:flex; flex-direction:column; align-items:center;">
              <div class="podium-avatar-wrapper" style="position:relative;">
                <img src="${getDishImageUrl(second.image)}" alt="${second.title}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:2px solid #b2bec3;" loading="lazy" decoding="async">
                <div class="podium-badge" style="position:absolute; bottom:-4px; right:-4px; background:#b2bec3; color:black; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:bold;">2</div>
              </div>
              <span style="font-size:0.8rem; font-weight:600; margin-top:8px; text-align:center; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${second.title}">${second.title}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${second.portions} portion(s)</span>
              <div style="background:#b2bec3; width:60px; height:35px; margin-top:6px; border-radius:4px 4px 0 0; display:flex; align-items:center; justify-content:center; font-weight:800; color:#16161a;">#2</div>
            </div>
          `;
        }

        if (first) {
          podiumHtml += `
            <div class="podium-col first" style="display:flex; flex-direction:column; align-items:center; transform:scale(1.15);">
              <div class="podium-avatar-wrapper" style="position:relative;">
                <img src="${getDishImageUrl(first.image)}" alt="${first.title}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid #ffb627; box-shadow:0 0 10px rgba(255,182,39,0.5);" loading="lazy" decoding="async">
                <div class="podium-badge" style="position:absolute; bottom:-4px; right:-4px; background:#ffb627; color:black; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:bold;">1</div>
              </div>
              <span style="font-size:0.8rem; font-weight:700; margin-top:8px; text-align:center; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${first.title}">${first.title}</span>
              <span style="font-size:0.75rem; color:var(--color-secondary); font-weight:700;">${first.portions} portion(s)</span>
              <div style="background:#ffb627; width:70px; height:50px; margin-top:6px; border-radius:4px 4px 0 0; display:flex; align-items:center; justify-content:center; font-weight:800; color:#16161a; box-shadow:0 0 15px rgba(255,182,39,0.25);">#1</div>
            </div>
          `;
        }

        if (third) {
          podiumHtml += `
            <div class="podium-col third" style="display:flex; flex-direction:column; align-items:center;">
              <div class="podium-avatar-wrapper" style="position:relative;">
                <img src="${getDishImageUrl(third.image)}" alt="${third.title}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid #d63031;" loading="lazy" decoding="async">
                <div class="podium-badge" style="position:absolute; bottom:-4px; right:-4px; background:#d63031; color:white; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.65rem; font-weight:bold;">3</div>
              </div>
              <span style="font-size:0.8rem; font-weight:600; margin-top:8px; text-align:center; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${third.title}">${third.title}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${third.portions} portion(s)</span>
              <div style="background:#d63031; width:55px; height:25px; margin-top:6px; border-radius:4px 4px 0 0; display:flex; align-items:center; justify-content:center; font-weight:800; color:white;">#3</div>
            </div>
          `;
        }

        podiumWrapper.innerHTML = podiumHtml;
      }
    }

    // Smart highlights Alerts
    const alertsContainer = document.getElementById("demand-alerts-container");
    if (alertsContainer) {
      let alertsHtml = "";
      
      const votedItems = sortedItems.filter(item => item.portions > 0);
      votedItems.forEach(item => {
        const prepSuggested = Math.ceil(item.portions * 1.2);
        if (item.portions >= 5) {
          alertsHtml += `
            <div class="demand-alert-card high-demand" style="background: rgba(46, 196, 182, 0.08); border-left: 4px solid var(--color-success); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; align-items: center; gap: 12px; color: var(--text-primary); font-size: 0.85rem;">
              <i class="bx bxs-hot" style="font-size: 1.4rem; color: var(--color-success);"></i>
              <div>
                <strong>High demand:</strong> ${item.portions} portions requested for <strong>${item.title}</strong> by ${item.votes} customers. 
                <span style="color: var(--text-secondary); margin-left: 8px;">Suggested quantity to prepare: <b>${prepSuggested} portions</b> (includes 20% safety buffer).</span>
              </div>
            </div>
          `;
        } else if (item.portions > 0 && item.portions <= 2) {
          alertsHtml += `
            <div class="demand-alert-card low-demand" style="background: rgba(230, 57, 70, 0.08); border-left: 4px solid var(--color-danger); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; align-items: center; gap: 12px; color: var(--text-primary); font-size: 0.85rem;">
              <i class="bx bx-error-circle" style="font-size: 1.4rem; color: var(--color-danger);"></i>
              <div>
                <strong>Low demand:</strong> Only ${item.portions} portion(s) requested for <strong>${item.title}</strong>. Cook with caution.
              </div>
            </div>
          `;
        }
      });

      if (alertsHtml === "") {
        alertsHtml = `
          <div class="demand-alert-card info-demand" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; align-items: center; gap: 12px; color: var(--text-secondary); font-size: 0.85rem;">
            <i class="bx bx-info-circle" style="font-size: 1.4rem; color: var(--color-secondary);"></i>
            <div>No tomorrow requests yet.</div>
          </div>
        `;
      }
      alertsContainer.innerHTML = alertsHtml;
    }
  };

  const getRequestStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      approved: "Approved for tomorrow",
      not_available: "Not available this time",
      closed: "Closed for this cycle"
    };
    return labels[status] || labels.pending;
  };

  const renderRequestStatusBadge = (status) => {
    const normalized = status || "pending";
    if (normalized === "approved") {
      return `<span class="badge" style="background: var(--color-success); color: black; font-weight:700;"><i class="bx bx-check-circle"></i> Approved</span>`;
    }
    if (normalized === "not_available") {
      return `<span class="badge" style="background: rgba(255, 182, 39, 0.18); border: 1px solid rgba(255, 182, 39, 0.7); color: var(--color-secondary); font-weight:700;"><i class="bx bx-time-five"></i> Not available this time</span>`;
    }
    if (normalized === "closed") {
      return `<span class="badge" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); color: var(--text-secondary); font-weight:700;"><i class="bx bx-archive"></i> Closed</span>`;
    }
    return `<span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);"><i class="bx bx-help-circle"></i> Pending</span>`;
  };

  const updateRequestStatus = async (payload) => {
    if (!window.dbEngine.updateTomorrowRequestStatus) return null;
    return window.dbEngine.updateTomorrowRequestStatus(payload);
  };

  const renderCookingDecisionsTable = () => {
    const tableBody = document.getElementById("cooking-decision-table-body");
    if (!tableBody) return;

    const aggregates = {};
    
    foodItems.forEach(opt => {
      aggregates[opt.id] = {
        id: opt.id,
        title: opt.title,
        description: opt.description,
        price: opt.price,
        image: opt.image,
        votes: 0,
        quantity: 0,
        isCustom: false
      };
    });

    tomorrowRequests.forEach(req => {
      const id = req.foodItemId || "custom";
      if (req.isCustom) {
        const customKey = "custom_" + req.foodTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
        if (!aggregates[customKey]) {
          aggregates[customKey] = {
            id: customKey,
            title: req.foodTitle,
            description: "Custom request from customer.",
            price: 12.50,
            image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
            votes: 0,
            quantity: 0,
            isCustom: true
          };
        }
        aggregates[customKey].votes++;
        aggregates[customKey].quantity += req.quantity || 1;
      } else {
        if (aggregates[id]) {
          aggregates[id].votes++;
          aggregates[id].quantity += req.quantity || 1;
        }
      }
    });

    const sortedList = Object.values(aggregates).sort((a, b) => b.quantity - a.quantity);

    // Filter to show only items that actually have requests
    const requestedItems = sortedList.filter(item => item.quantity > 0);

    if (requestedItems.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
            No tomorrow requests yet.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = requestedItems.map(item => {
      const decisionData = cookingDecisions[item.id];
      const decision = (decisionData && typeof decisionData === "object") ? decisionData.status : (decisionData || "none");
      const votes = item.votes;
      const totalQty = item.quantity;
      
      const expectedSales = totalQty * item.price;
      const prepSuggested = Math.ceil(totalQty * 1.2);
      const isCustomBadge = item.isCustom ? `<span class="badge badge-outline" style="font-size:0.6rem; padding:1px 4px; border-color:var(--color-primary); color:var(--color-primary); margin-left:4px;">Custom</span>` : "";

      let statusBadge = `<span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);"><i class="bx bx-help-circle"></i> Pending</span>`;
      if (decision === "selected") {
        statusBadge = `<span class="badge" style="background: var(--color-success); color: black; font-weight:700;"><i class="bx bx-check-circle"></i> Approved</span>`;
      } else if (decision === "not_selected") {
        statusBadge = `<span class="badge" style="background: rgba(255, 182, 39, 0.18); border: 1px solid rgba(255, 182, 39, 0.7); color: var(--color-secondary); font-weight:700;"><i class="bx bx-time-five"></i> Not available this time</span>`;
      }

      return `
        <tr data-item-id="${item.id}">
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${getDishImageUrl(item.image)}" alt="${item.title}" style="width:36px; height:36px; border-radius:var(--radius-sm); object-fit:cover;" loading="lazy" decoding="async">
              <div>
                <strong>${item.title}</strong> ${isCustomBadge}
                ${(item.description || "").trim() ? `<div style="font-size:0.75rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; max-width:200px; white-space:nowrap;" title="${item.description}">${item.description}</div>` : ""}
              </div>
            </div>
          </td>
          <td style="text-align: center; font-weight: 700; color: var(--color-secondary);">${votes} customer(s)</td>
          <td style="text-align: center; font-weight: 700; color: var(--color-success);">${totalQty}</td>
          <td style="font-weight:600;">${prepSuggested > 0 ? `${prepSuggested} portions` : `<span style='color:var(--text-muted);'>0</span>`}</td>
          <td>${statusBadge}</td>
          <td style="text-align: center;">
            <div style="display:flex; flex-direction:column; gap:6px; align-items:center;">
              <div style="display:flex; gap:4px;">
                <button class="admin-btn-outline approve-req-btn" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--color-success); color: var(--color-success); background: transparent;" data-id="${item.id}" data-title="${item.title}" data-desc="${item.description}" data-price="${item.price}" data-image="${item.image}" data-custom="${item.isCustom}">
                  Approve For Tomorrow
                </button>
                <button class="admin-btn-outline reject-req-btn" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--color-secondary); color: var(--color-secondary); background: transparent;" data-id="${item.id}" data-title="${item.title}">
                  Not available this time
                </button>
                <button class="admin-btn-outline clear-req-btn" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--color-danger); color: var(--color-danger); background: transparent;" data-id="${item.id}" data-title="${item.title}" data-count="${votes}">
                  <i class="bx bx-trash"></i> Delete (${votes})
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Bind action buttons
    tableBody.querySelectorAll(".approve-req-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const title = e.currentTarget.dataset.title;
        const price = parseFloat(e.currentTarget.dataset.price);
        const description = e.currentTarget.dataset.desc || "";
        const image = resolveMediaUrl(e.currentTarget.dataset.image || "");
        const isCustom = e.currentTarget.dataset.custom === "true";

        const decisionObject = {
          status: "selected",
          title: title,
          price: price,
          description: description || "",
          image: image,
          isCustom: isCustom
        };

        await window.dbEngine.saveCookingDecision(id, decisionObject);

        if (!isCustom) {
          await window.dbEngine.setAvailableTomorrow(id, true);
        }
        await updateRequestStatus({
          itemId: id,
          status: "approved",
          statusNote: "Approved for tomorrow"
        });

        await window.dbEngine.saveBehaviorLog("admin_cooking_decision", {
          itemId: id,
          itemTitle: title,
          status: "selected"
        });

        alert(`Approved "${title}" for tomorrow.`);
        refreshData();
      });
    });

    tableBody.querySelectorAll(".reject-req-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const title = e.currentTarget.dataset.title;

        const decisionObject = {
          status: "not_selected",
          title: title
        };

        await window.dbEngine.saveCookingDecision(id, decisionObject);
        await window.dbEngine.setAvailableTomorrow(id, false);
        await updateRequestStatus({
          itemId: id,
          status: "not_available",
          statusNote: "Not available this time"
        });

        await window.dbEngine.saveBehaviorLog("admin_cooking_decision", {
          itemId: id,
          itemTitle: title,
          status: "not_selected"
        });

        alert(`Marked "${title}" as not available this time.`);
        refreshData();
      });
    });

    tableBody.querySelectorAll(".clear-req-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const title = e.currentTarget.dataset.title;

        const count = e.currentTarget.dataset.count || "0";
        if (!confirm(`Delete all ${count} request(s) for "${title}" from live storage?`)) return;

        e.currentTarget.disabled = true;
        try {
          await window.dbEngine.clearTomorrowRequestsForItem(id);
          
          const decisionObject = {
            status: "none",
            title: title
          };
          await window.dbEngine.saveCookingDecision(id, decisionObject);
          await window.dbEngine.setAvailableTomorrow(id, false);

          await window.dbEngine.saveBehaviorLog("admin_clear_requests", {
            itemId: id,
            itemTitle: title
          });

          refreshData();
        } catch (err) {
          console.error("Error deleting dish requests:", err);
          alert("Failed to delete requests for this dish.");
          e.currentTarget.disabled = false;
        }
      });
    });
  };

  const renderRequestsDetails = () => {
    const streamEl = document.getElementById("requests-details-stream");
    const countBadge = document.getElementById("requests-list-count");
    
    if (!streamEl) return;

    if (countBadge) {
      countBadge.innerText = `${tomorrowRequests.length} submissions`;
    }

    if (tomorrowRequests.length === 0) {
      streamEl.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding-top:60px;">
          No tomorrow requests yet.
        </div>
      `;
      return;
    }

    streamEl.innerHTML = tomorrowRequests.map(req => {
      const timeStr = formatRequestTimestamp(req.createdAt);
      const phoneDigits = String(req.customerPhone || "").replace(/\D/g, "");
      const status = req.status || "pending";
      const itemId = req.foodItemId || req.itemId || "";
      const waText = status === "approved"
        ? `Hi ${req.customerName}, your request for ${req.quantity}x ${req.foodTitle} is approved for tomorrow.`
        : status === "not_available"
          ? `Hi ${req.customerName}, ${req.foodTitle} is not available this time. We will keep your request in mind for a future menu.`
          : `Hi ${req.customerName}, thanks for requesting ${req.quantity}x ${req.foodTitle} for tomorrow! We are preparing tomorrow's menu now.`;
      const waMsg = encodeURIComponent(waText);
      const waUrl = `https://wa.me/${phoneDigits}?text=${waMsg}`;
      const isReserved = req.reserve;
      const dishImage = getFoodItemImage(itemId);

      return `
        <div class="log-stream-item" style="border-left-color: ${isReserved ? 'var(--color-success)' : 'var(--color-secondary)'};">
          <div class="log-stream-header">
            <span class="log-stream-tag" style="color: ${isReserved ? 'var(--color-success)' : 'var(--color-secondary)'};">
              ${isReserved ? 'RESERVATION' : 'VOTE'}
            </span>
            <span class="log-stream-time">${timeStr}</span>
          </div>
          <div class="log-stream-body" style="display:flex; gap:10px; align-items:flex-start;">
            <img src="${dishImage}" alt="${req.foodTitle}" style="width:48px; height:48px; border-radius:var(--radius-sm); object-fit:cover; flex-shrink:0; border:1px solid var(--border-color);" loading="lazy" decoding="async">
            <div>
            <strong>${req.customerName}</strong> (<a href="tel:${req.customerPhone}" style="color:var(--color-primary);">${req.customerPhone}</a>)<br>
            Requested: <strong style="color: var(--text-primary);">${req.quantity}x ${req.foodTitle}</strong>
            <div style="margin-top:6px;">${renderRequestStatusBadge(status)}</div>
            ${req.notes ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px; font-style:italic;">"${req.notes}"</div>` : ""}
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px; font-size:0.65rem; color:var(--text-muted); flex-wrap:wrap;">
            <span>Session: ${req.sessionId ? req.sessionId.slice(-6) : "—"}</span>
            <span style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
              <button class="admin-btn-outline request-detail-approve-btn" style="padding: 4px 8px; font-size: 0.7rem; border-color: var(--color-success); color: var(--color-success); background: transparent;" data-id="${req.id}" data-item-id="${itemId}" data-title="${req.foodTitle}">
                Approve
              </button>
              <button class="admin-btn-outline request-detail-unavailable-btn" style="padding: 4px 8px; font-size: 0.7rem; border-color: var(--color-secondary); color: var(--color-secondary); background: transparent;" data-id="${req.id}" data-item-id="${itemId}" data-title="${req.foodTitle}">
                Not available this time
              </button>
              <button class="admin-btn-outline request-detail-delete-btn" style="padding: 4px 8px; font-size: 0.7rem; border-color: var(--color-danger); color: var(--color-danger); background: transparent;" data-id="${req.id}" data-title="${req.foodTitle}">
                <i class="bx bx-trash"></i> Delete
              </button>
              <a href="${waUrl}" target="_blank" style="color: var(--color-success); font-weight:700; display:flex; align-items:center; gap:2px;"><i class="bx bxl-whatsapp" style="font-size:0.9rem;"></i> WhatsApp Chat</a>
            </span>
          </div>
        </div>
      `;
    }).join("");

    const setSingleRequestStatus = async (button, status) => {
      const requestId = button.dataset.id;
      const itemId = button.dataset.itemId;
      const title = button.dataset.title || "Requested dish";
      const item = foodItems.find(food => food.id === itemId) || {};
      const isCustom = String(itemId || "").startsWith("custom_");
      const statusNote = getRequestStatusLabel(status);

      button.disabled = true;
      try {
        await updateRequestStatus({ requestId, itemId, status, statusNote });

        if (itemId) {
          if (status === "approved") {
            await window.dbEngine.saveCookingDecision(itemId, {
              status: "selected",
              title,
              price: Number(item.price || 0),
              description: item.description || "",
              image: item.image || "",
              isCustom
            });
            if (!isCustom) await window.dbEngine.setAvailableTomorrow(itemId, true);
          } else if (status === "not_available") {
            await window.dbEngine.saveCookingDecision(itemId, {
              status: "not_selected",
              title
            });
            await window.dbEngine.setAvailableTomorrow(itemId, false);
          }
        }

        await window.dbEngine.saveBehaviorLog("admin_request_status", {
          requestId,
          itemId,
          itemTitle: title,
          status
        });
        refreshData();
      } catch (err) {
        console.error("Error updating request status:", err);
        alert("Failed to update request status.");
        button.disabled = false;
      }
    };

    streamEl.querySelectorAll(".request-detail-approve-btn").forEach(btn => {
      btn.addEventListener("click", () => setSingleRequestStatus(btn, "approved"));
    });
    streamEl.querySelectorAll(".request-detail-unavailable-btn").forEach(btn => {
      btn.addEventListener("click", () => setSingleRequestStatus(btn, "not_available"));
    });

    streamEl.querySelectorAll(".request-detail-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const requestId = btn.dataset.id;
        const title = btn.dataset.title || "this request";
        if (!confirm(`Delete the request for "${title}" from the live database?`)) return;

        btn.disabled = true;
        try {
          await window.dbEngine.deleteTomorrowRequest(requestId);
          await window.dbEngine.saveBehaviorLog("admin_delete_request", { requestId, itemTitle: title });
          refreshData();
        } catch (err) {
          console.error("Error deleting request:", err);
          alert("Failed to delete request from live storage.");
          btn.disabled = false;
        }
      });
    });
  };

  const updateVotingDeadlineTimer = () => {
    const countdownEl = document.getElementById("voting-deadline-countdown");
    if (!countdownEl) return;

    const selectedTime = settings.votingDeadline || "11:00 PM";
    
    const now = new Date();
    let [time, ampm] = selectedTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    
    if (now > deadline) {
      deadline.setDate(deadline.getDate() + 1);
    }

    const diff = deadline - now;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    countdownEl.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} left`;
  };

  const checkChefWhatsappConfig = () => {
    const chefNum = settings.chefWhatsappNumber;
    const configAlertContainer = document.getElementById("admin-config-alert-container");
    if (configAlertContainer) {
      if (!chefNum || chefNum === "973XXXXXXXX" || chefNum.includes("X") || chefNum.trim() === "") {
        configAlertContainer.innerHTML = `
          <div class="demand-alert-card low-demand" style="background: rgba(230, 57, 70, 0.12); border: 1px solid var(--color-danger); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; color: white;">
            <i class="bx bx-error" style="font-size: 1.8rem; color: var(--color-danger);"></i>
            <div>
              <strong style="color: var(--color-danger); font-size: 1rem;">Setup Action Required:</strong> Please configure the chef's real WhatsApp number in <strong>System Settings</strong> at the bottom of this page. WhatsApp summaries sending is currently locked.
            </div>
          </div>
        `;
      } else {
        configAlertContainer.innerHTML = "";
      }
    }
  };

  // --- NOTIFICATION BELL & CHEF SUMMARY ---
  const updateNotificationBell = () => {
    const bellBadge = document.getElementById("admin-bell-badge");
    if (!bellBadge) return;
    
    const lastCheckedCount = parseInt(localStorage.getItem("adminLastCheckedCount") || "0");
    const currentCount = tomorrowRequests.length;
    
    if (currentCount > lastCheckedCount) {
      const diff = currentCount - lastCheckedCount;
      bellBadge.innerText = diff;
      bellBadge.style.display = "block";
    } else {
      bellBadge.style.display = "none";
    }
  };

  const renderChefSummary = () => {
    const summaryContent = document.getElementById("chef-summary-content");
    if (!summaryContent) return;
    
    const aggregates = {};
    tomorrowRequests.forEach(req => {
      const title = req.foodTitle;
      if (!aggregates[title]) {
        aggregates[title] = {
          title: title,
          votesCount: 0,
          qtyCount: 0,
          isCustom: req.isCustom
        };
      }
      aggregates[title].votesCount++;
      aggregates[title].qtyCount += req.quantity || 1;
    });
    
    const sortedItems = Object.values(aggregates).sort((a, b) => b.qtyCount - a.qtyCount);
    
    if (sortedItems.length === 0) {
      summaryContent.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">No tomorrow requests yet.</p>`;
      return;
    }
    
    let html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <p style="font-size: 0.95rem; color: var(--text-secondary); margin: 0 0 8px 0;">
          Total Portions Requested: <strong style="color: white; font-size: 1.1rem;">${tomorrowRequests.reduce((sum, r) => sum + (r.quantity || 1), 0)}</strong>
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
    `;
    
    sortedItems.forEach((item, index) => {
      const bufferPortions = Math.ceil(item.qtyCount * 1.2);
      const isCustomBadge = item.isCustom ? `<span class="badge badge-outline" style="font-size:0.6rem; padding:1px 4px; border-color:var(--color-primary); color:var(--color-primary); margin-left:4px;">Custom</span>` : "";
      
      html += `
        <div class="kpi-trend" style="background: var(--bg-surface); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-sm); color: white; display: flex; flex-direction: column; gap: 4px;">
          <div style="font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between;">
            <span>${index + 1}. ${item.title}</span>
            ${isCustomBadge}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
            <span>Requests: <b>${item.votesCount} cust (${item.qtyCount} portions)</b></span>
            <span style="color: var(--color-success); font-weight: 600;">Chef Suggests: <b>${bufferPortions} portions</b></span>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    summaryContent.innerHTML = html;
  };

  const sendChefSummaryToWhatsApp = () => {
    const chefNum = settings.chefWhatsappNumber;
    if (!chefNum || chefNum === "973XXXXXXXX" || chefNum.includes("X") || chefNum.trim() === "") {
      alert("Please configure the chef's real WhatsApp number in Settings before sending summaries.");
      return;
    }
    
    if (tomorrowRequests.length === 0) {
      alert("No tomorrow requests submitted yet to compile.");
      return;
    }
    
    const aggregates = {};
    tomorrowRequests.forEach(req => {
      const title = req.foodTitle;
      if (!aggregates[title]) {
        aggregates[title] = {
          title: title,
          votesCount: 0,
          qtyCount: 0
        };
      }
      aggregates[title].votesCount++;
      aggregates[title].qtyCount += req.quantity || 1;
    });
    
    const sortedItems = Object.values(aggregates).sort((a, b) => b.qtyCount - a.qtyCount);
    
    let text = `Tomorrow Food Requests Summary (${settings.businessName || 'Gourmet Tomorrow'})\n`;
    text += `Total portions requested: ${tomorrowRequests.reduce((sum, r) => sum + (r.quantity || 1), 0)}\n\n`;
    text += `Top requested dishes:\n\n`;
    
    sortedItems.forEach((item, index) => {
      const bufferPortions = Math.ceil(item.qtyCount * 1.2);
      text += `${index + 1}. ${item.title} - ${item.votesCount} customers (${item.qtyCount} portions) -> Suggested Cook: ${bufferPortions} portions\n`;
    });
    
    text += `\nPlease review and confirm what will be cooked tomorrow.`;
    
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${chefNum.replace(/\D/g, "")}?text=${encoded}`;
    
    window.open(url, "_blank");
    
    window.dbEngine.saveBehaviorLog("admin_chef_summary_whatsapp_send", {
      totalRequests: tomorrowRequests.length
    });
  };

  // --- SYSTEM SETTINGS PANEL HANDLERS ---
  const updateLogoPreview = (src) => {
    const previewContainer = document.getElementById("settings-logo-preview-container");
    const previewImage = document.getElementById("settings-logo-preview");
    const emptyState = document.getElementById("settings-logo-empty");
    if (!previewImage) return;

    if (src) {
      previewImage.src = resolveMediaUrl(src);
      previewImage.style.display = "block";
      if (previewContainer) previewContainer.style.display = "flex";
      if (emptyState) emptyState.style.display = "none";
    } else {
      previewImage.src = "";
      previewImage.style.display = "none";
      if (previewContainer) previewContainer.style.display = "none";
      if (emptyState) emptyState.style.display = "flex";
    }
  };

  const updateHeroPreview = (src) => {
    const previewImage = document.getElementById("settings-hero-preview");
    const emptyState = document.getElementById("settings-hero-empty");
    if (!previewImage) return;

    if (src) {
      previewImage.src = resolveMediaUrl(src);
      previewImage.style.display = "block";
      if (emptyState) emptyState.style.display = "none";
    } else {
      previewImage.src = "";
      previewImage.style.display = "none";
      if (emptyState) emptyState.style.display = "flex";
    }
  };

  const getLogoSizeFromInput = () => {
    const sizeInput = document.getElementById("settings-brand-logo-size");
    return Math.max(40, Math.min(140, Number(sizeInput?.value || settings.brandLogoSize || 72)));
  };

  const updateLogoSizePreview = () => {
    const size = getLogoSizeFromInput();
    const sizeLabel = document.getElementById("settings-brand-logo-size-value");
    const previewFrame = document.querySelector(".admin-branding-logo-frame");
    if (sizeLabel) sizeLabel.textContent = `${size}px`;
    if (previewFrame) {
      previewFrame.style.width = `${Math.min(size, 120)}px`;
      previewFrame.style.height = `${Math.min(size, 120)}px`;
    }
  };

  const updateBrandPreview = () => {
    const namePreview = document.getElementById("settings-brand-preview-name");
    const taglinePreview = document.getElementById("settings-brand-preview-tagline");
    const nameInput = document.getElementById("settings-business-name");
    const taglineInput = document.getElementById("settings-business-tagline");
    if (namePreview) namePreview.innerText = (nameInput && nameInput.value.trim()) || settings.businessName || "Your Business";
    if (taglinePreview) taglinePreview.innerText = (taglineInput && taglineInput.value.trim()) || settings.businessTagline || "Upload your logo and set the customer-facing name.";
    updateLogoSizePreview();
  };

  const loadSettingsForm = () => {
    if (settingsFormDirty) return;
    const bizName = document.getElementById("settings-business-name");
    if (bizName) bizName.value = settings.businessName || "";

    const bizTagline = document.getElementById("settings-business-tagline");
    if (bizTagline) bizTagline.value = settings.businessTagline || "";

    const bizLogo = document.getElementById("settings-business-logo");
    if (bizLogo) bizLogo.value = settings.businessLogo || "";
    updateLogoPreview(settings.businessLogo || "");

    const logoSizeInput = document.getElementById("settings-brand-logo-size");
    if (logoSizeInput) logoSizeInput.value = Math.max(40, Math.min(140, Number(settings.brandLogoSize || 72)));

    const logoPlacementInput = document.getElementById("settings-brand-logo-placement");
    if (logoPlacementInput) {
      const placement = String(settings.brandLogoPlacement || "header").toLowerCase();
      logoPlacementInput.value = placement === "hero" || placement === "both" ? placement : "header";
    }
    updateLogoSizePreview();

    const heroImage = document.getElementById("settings-hero-image");
    if (heroImage) heroImage.value = settings.heroImage || "";
    updateHeroPreview(settings.heroImage || "");

    updateBrandPreview();

    const waOrder = document.getElementById("settings-whatsapp-order");
    if (waOrder) waOrder.value = settings.whatsappOrderNumber || "";

    const chefWA = document.getElementById("settings-chef-whatsapp");
    if (chefWA) chefWA.value = settings.chefWhatsappNumber || "";

    const currSym = document.getElementById("settings-currency-symbol");
    if (currSym) currSym.value = settings.currencySymbol || "BD";

    const currCod = document.getElementById("settings-currency-code");
    if (currCod) currCod.value = settings.currencyCode || "BHD";

    const deadline = document.getElementById("settings-voting-deadline");
    if (deadline) deadline.value = settings.votingDeadline || "11:00 PM";

    const delivery = document.getElementById("settings-delivery-options");
    const legacyToggles = getFulfillmentTogglesFromOption(settings.deliveryOptions || "both");
    const deliveryEnabled = settings.deliveryEnabled === undefined ? legacyToggles.delivery : !!settings.deliveryEnabled;
    const pickupEnabled = settings.pickupEnabled === undefined ? legacyToggles.pickup : !!settings.pickupEnabled;
    if (delivery) delivery.value = (settings.deliveryEnabled === undefined && settings.pickupEnabled === undefined)
      ? (settings.deliveryOptions || "both")
      : getDeliveryOptionsFromToggles(deliveryEnabled, pickupEnabled);

    const deliveryEnabledInput = document.getElementById("settings-delivery-enabled");
    if (deliveryEnabledInput) deliveryEnabledInput.checked = deliveryEnabled;

    const pickupEnabledInput = document.getElementById("settings-pickup-enabled");
    if (pickupEnabledInput) pickupEnabledInput.checked = pickupEnabled;

    const enableReq = document.getElementById("settings-enable-requests");
    if (enableReq) enableReq.checked = settingBool("enableRequests", true);

    const enablePre = document.getElementById("settings-enable-preorders");
    if (enablePre) enablePre.checked = settingBool("enablePreorders", true);

    const enableSuggest = document.getElementById("settings-enable-suggest");
    if (enableSuggest) enableSuggest.checked = settingBool("enableSuggestDish", true);

    const showCounts = document.getElementById("settings-show-counts");
    if (showCounts) showCounts.checked = settingBool("showRequestCounts", true);

    const statusSelect = document.getElementById("settings-restaurant-status");
    if (statusSelect) statusSelect.value = settings.restaurantStatus || "open";

    const timezoneInput = document.getElementById("settings-restaurant-timezone");
    if (timezoneInput) timezoneInput.value = settings.restaurantTimezone || "Asia/Bahrain";

    const allowReqClosed = document.getElementById("settings-allow-requests-closed");
    if (allowReqClosed) allowReqClosed.checked = settingBool("allowRequestsWhileClosed", true);

    const setChecked = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!value;
    };

    setChecked("settings-order-name-required", settingBool("orderNameRequired", true));
    setChecked("settings-order-phone-required", settingBool("orderPhoneRequired", true));
    setChecked("settings-order-time-required", settingBool("orderTimeRequired", true));
    setChecked("settings-order-notes-required", settingBool("orderNotesRequired", false));
    setChecked("settings-request-name-required", settingBool("requestNameRequired", false));
    setChecked("settings-request-phone-required", settings.requestPhoneRequired === undefined ? !!settings.phoneRequiredForRequest : !!settings.requestPhoneRequired);
    setChecked("settings-request-time-required", settingBool("requestTimeRequired", true));
    setChecked("settings-request-notes-required", settingBool("requestNotesRequired", false));
    setChecked("settings-suggestion-name-required", settingBool("suggestionNameRequired", false));
    setChecked("settings-suggestion-phone-required", settingBool("suggestionPhoneRequired", false));
    setChecked("settings-suggestion-notes-required", settingBool("suggestionNotesRequired", false));
    setChecked("settings-request-auto-clear-enabled", settingBool("requestAutoClearEnabled", true));

    const autoClearHours = document.getElementById("settings-request-auto-clear-hours");
    if (autoClearHours) autoClearHours.value = Math.max(1, Math.min(168, Number(settings.requestAutoClearHours || 24)));
  };

  const handleSettingsSubmit = async () => {
    const deliveryEnabled = document.getElementById("settings-delivery-enabled") ? document.getElementById("settings-delivery-enabled").checked : true;
    const pickupEnabled = document.getElementById("settings-pickup-enabled") ? document.getElementById("settings-pickup-enabled").checked : true;
    const requestPhoneRequired = document.getElementById("settings-request-phone-required") ? document.getElementById("settings-request-phone-required").checked : false;

    const updated = {
      businessName: document.getElementById("settings-business-name").value.trim(),
      businessTagline: document.getElementById("settings-business-tagline") ? document.getElementById("settings-business-tagline").value.trim() : "",
      businessLogo: document.getElementById("settings-business-logo") ? document.getElementById("settings-business-logo").value.trim() : "",
      brandLogoSize: getLogoSizeFromInput(),
      brandLogoPlacement: document.getElementById("settings-brand-logo-placement")
        ? document.getElementById("settings-brand-logo-placement").value
        : "header",
      heroImage: document.getElementById("settings-hero-image") ? document.getElementById("settings-hero-image").value.trim() : "",
      whatsappOrderNumber: document.getElementById("settings-whatsapp-order").value.trim(),
      chefWhatsappNumber: document.getElementById("settings-chef-whatsapp").value.trim(),
      currencySymbol: document.getElementById("settings-currency-symbol").value.trim(),
      currencyCode: document.getElementById("settings-currency-code").value.trim(),
      currencyFormat: settings.currencyFormat || "prefix",
      votingDeadline: document.getElementById("settings-voting-deadline").value,
      deliveryOptions: getDeliveryOptionsFromToggles(deliveryEnabled, pickupEnabled),
      deliveryEnabled,
      pickupEnabled,
      enableRequests: document.getElementById("settings-enable-requests").checked,
      enablePreorders: document.getElementById("settings-enable-preorders").checked,
      enableSuggestDish: document.getElementById("settings-enable-suggest") ? document.getElementById("settings-enable-suggest").checked : true,
      orderNameRequired: document.getElementById("settings-order-name-required") ? document.getElementById("settings-order-name-required").checked : true,
      orderPhoneRequired: document.getElementById("settings-order-phone-required") ? document.getElementById("settings-order-phone-required").checked : true,
      orderTimeRequired: document.getElementById("settings-order-time-required") ? document.getElementById("settings-order-time-required").checked : true,
      orderNotesRequired: document.getElementById("settings-order-notes-required") ? document.getElementById("settings-order-notes-required").checked : false,
      requestNameRequired: document.getElementById("settings-request-name-required") ? document.getElementById("settings-request-name-required").checked : false,
      requestPhoneRequired,
      requestTimeRequired: document.getElementById("settings-request-time-required") ? document.getElementById("settings-request-time-required").checked : true,
      requestNotesRequired: document.getElementById("settings-request-notes-required") ? document.getElementById("settings-request-notes-required").checked : false,
      suggestionNameRequired: document.getElementById("settings-suggestion-name-required") ? document.getElementById("settings-suggestion-name-required").checked : false,
      suggestionPhoneRequired: document.getElementById("settings-suggestion-phone-required") ? document.getElementById("settings-suggestion-phone-required").checked : false,
      suggestionNotesRequired: document.getElementById("settings-suggestion-notes-required") ? document.getElementById("settings-suggestion-notes-required").checked : false,
      phoneRequiredForRequest: requestPhoneRequired,
      showRequestCounts: document.getElementById("settings-show-counts").checked,
      restaurantStatus: document.getElementById("settings-restaurant-status").value,
      restaurantTimezone: document.getElementById("settings-restaurant-timezone").value.trim(),
      allowRequestsWhileClosed: document.getElementById("settings-allow-requests-closed").checked,
      requestAutoClearEnabled: document.getElementById("settings-request-auto-clear-enabled") ? document.getElementById("settings-request-auto-clear-enabled").checked : true,
      requestAutoClearHours: document.getElementById("settings-request-auto-clear-hours")
        ? Math.max(1, Math.min(168, Number(document.getElementById("settings-request-auto-clear-hours").value || 36)))
        : 36,
      defaultLanguage: settings.defaultLanguage || "en"
    };

    const buttons = [
      document.getElementById("save-settings-btn"),
      document.getElementById("save-settings-top-btn")
    ].filter(Boolean);
    const originalText = new Map(buttons.map(btn => [btn, btn.innerHTML]));
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Saving...`;
    });
    setSettingsSaveStatus("Saving live settings...", "muted");

    try {
      settings = await window.dbEngine.saveSettings(updated);
      settingsFormDirty = false;
      await window.dbEngine.saveBehaviorLog("admin_modify_settings", { success: true });
      setSettingsSaveStatus("Saved. Customer menu will update shortly.", "success");
      alert("Settings saved successfully.");
      refreshData();
    } catch (err) {
      console.error("Error saving settings:", err);
      setSettingsSaveStatus("Save failed. Check the live API connection.", "danger");
      alert("Failed to save settings.");
    } finally {
      buttons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = originalText.get(btn);
      });
    }
  };

  // --- CATEGORY MANAGEMENT PANEL HANDLERS ---
  const renderCategoryManagementList = () => {
    if (!adminCategoryList) return;
    
    if (categories.length === 0) {
      adminCategoryList.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px; font-size:0.85rem;">No categories defined.</p>`;
      return;
    }

    adminCategoryList.innerHTML = categories.map(cat => {
      const hiddenLabel = cat.hidden ? `<span class="badge badge-danger" style="font-size:0.6rem; padding: 2px 6px; margin-left: 6px;">Hidden</span>` : "";
      return `
        <div class="admin-menu-item-row" style="padding: 10px 16px; border-radius: var(--radius-sm); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;" data-id="${cat.id}">
          <div style="font-weight: 600; font-size: 0.9rem; display: flex; align-items: center;">
            ${cat.name} ${hiddenLabel}
          </div>
          <div class="admin-menu-item-actions">
            <button class="admin-icon-btn edit-category" data-id="${cat.id}" title="Edit Category">
              <i class="bx bx-edit-alt"></i>
            </button>
            <button class="admin-icon-btn delete-category" data-id="${cat.id}" title="Delete Category">
              <i class="bx bx-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    bindCategoryManagementActions();
  };

  const bindCategoryManagementActions = () => {
    // Edit category Click
    adminCategoryList.querySelectorAll(".edit-category").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const cat = categories.find(c => c.id === id);
        if (cat) {
          openCategoryModal(cat);
        }
      });
    });

    // Delete category Click
    adminCategoryList.querySelectorAll(".delete-category").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const cat = categories.find(c => c.id === id);
        if (cat) {
          // Check if any items are assigned to this category
          const itemsWithCategory = foodItems.filter(item => item.category === cat.name);
          if (itemsWithCategory.length > 0) {
            alert(`Cannot delete category "${cat.name}". There are ${itemsWithCategory.length} food items assigned to it. Please reassign those items first.`);
            return;
          }
          
          if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
            await window.dbEngine.deleteCategory(id);
            await window.dbEngine.saveBehaviorLog("admin_delete_category", { categoryName: cat.name });
            refreshData();
          }
        }
      });
    });
  };

  const openCategoryModal = (cat = null) => {
    currentEditingCategory = cat;
    categoryForm.reset();

    const titleEl = document.getElementById("category-modal-title");
    if (cat) {
      titleEl.innerText = "Edit Category";
      document.getElementById("category-id").value = cat.id;
      document.getElementById("category-name").value = cat.name;
      document.getElementById("category-hidden").checked = !!cat.hidden;
    } else {
      titleEl.innerText = "Add New Category";
      document.getElementById("category-id").value = "";
      document.getElementById("category-hidden").checked = false;
    }

    categoryModal.classList.add("active");
  };

  const handleCategorySubmit = async () => {
    const id = document.getElementById("category-id").value;
    const name = document.getElementById("category-name").value.trim();
    const hidden = document.getElementById("category-hidden").checked;

    if (!name) return;

    const catData = {
      id: id || null,
      name,
      hidden
    };

    const btn = document.getElementById("save-category-btn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Saving...`;

    try {
      // Re-assign menu items category names if editing name
      if (currentEditingCategory && currentEditingCategory.name !== name) {
        const affectedItems = foodItems.filter(i => i.category === currentEditingCategory.name);
        for (const item of affectedItems) {
          item.category = name;
          await window.dbEngine.saveFoodItem(item);
        }
      }

      await window.dbEngine.saveCategory(catData);
      await window.dbEngine.saveBehaviorLog("admin_modify_category", {
        categoryName: name,
        action: id ? "edit" : "create"
      });

      categoryModal.classList.remove("active");
      refreshData();
    } catch (err) {
      console.error("Error saving category:", err);
      alert("Failed to save category.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };

  // --- CUSTOMER DISH SUGGESTIONS TABLE RENDER ---
  const renderSuggestionsTable = async () => {
    const tableBody = document.getElementById("suggestions-table-body");
    if (!tableBody) return;
    
    const suggestions = await window.dbEngine.getCustomerSuggestions();
    
    if (suggestions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
            No suggestions yet.
          </td>
        </tr>
      `;
      return;
    }
    
    // Group suggestions by dish name case-insensitively
    const grouped = {};
    suggestions.forEach(sug => {
      if (!sug.dishName) return;
      const nameNorm = sug.dishName.trim().toLowerCase();
      if (!grouped[nameNorm]) {
        grouped[nameNorm] = {
          dishName: sug.dishName.trim(),
          count: 0,
          submitters: [],
          notes: [],
          rawSuggestions: []
        };
      }
      grouped[nameNorm].count++;
      
      const identity = sug.customerName && sug.customerName !== "Anonymous" ? 
        `${sug.customerName} (${sug.customerPhone || 'N/A'})` : 
        sug.customerPhone || "Anonymous";

      if (!grouped[nameNorm].submitters.includes(identity)) {
        grouped[nameNorm].submitters.push(identity);
      }
      if (sug.notes && sug.notes.trim()) {
        grouped[nameNorm].notes.push(sug.notes.trim());
      }
      grouped[nameNorm].rawSuggestions.push(sug);
    });
    
    const sortedGrouped = Object.values(grouped).sort((a, b) => b.count - a.count);
    
    tableBody.innerHTML = sortedGrouped.map(group => {
      const submittersText = group.submitters.join(", ");
      const notesText = group.notes.length > 0 ? group.notes.map(n => `"${n}"`).join("<br>") : `<span style="color:var(--text-muted);">None</span>`;
      const escName = group.dishName.replace(/"/g, '&quot;');
      
      // Determine Status
      const addedToMenu = foodItems.some(item => item.title.toLowerCase().trim() === group.dishName.toLowerCase().trim());
      
      const customId = "custom_" + group.dishName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const decisionData = cookingDecisions[customId];
      const isApprovedTomorrow = decisionData && (typeof decisionData === "object" ? decisionData.status === "selected" : decisionData === "selected");
      const isRejected = decisionData && (typeof decisionData === "object" ? decisionData.status === "not_selected" : decisionData === "not_selected");

      let statusHtml = "";
      if (addedToMenu) {
        statusHtml = `<span class="badge" style="background: rgba(46, 196, 182, 0.15); border: 1px solid #2ec4b6; color: #2ec4b6; font-weight:700;"><i class="bx bx-check-circle"></i> Added to Menu</span>`;
      } else if (isApprovedTomorrow) {
        statusHtml = `<span class="badge" style="background: rgba(255, 182, 39, 0.15); border: 1px solid var(--color-secondary); color: var(--color-secondary); font-weight:700;"><i class="bx bx-calendar-check"></i> Approved Tomorrow</span>`;
      } else if (isRejected) {
        statusHtml = `<span class="badge" style="background: rgba(255, 182, 39, 0.18); border: 1px solid rgba(255, 182, 39, 0.7); color: var(--color-secondary); font-weight:700;"><i class="bx bx-time-five"></i> Not available this time</span>`;
      } else {
        statusHtml = `<span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);"><i class="bx bx-help-circle"></i> Pending</span>`;
      }

      return `
        <tr>
          <td><strong>${group.dishName}</strong></td>
          <td style="text-align: center; font-weight: 700; color: var(--color-secondary);">${group.count}</td>
          <td>${submittersText}</td>
          <td style="font-size:0.8rem; line-height:1.4;">${notesText}</td>
          <td>${statusHtml}</td>
          <td style="text-align: center;">
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <button class="admin-btn-primary add-to-menu-sug-btn" style="padding: 4px 8px; font-size: 0.75rem;" data-name="${escName}" data-desc="${group.notes.join(' / ').replace(/"/g, '&quot;')}">
                Add to Menu
              </button>
              <button class="admin-btn-outline approve-sug-btn" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--color-success); color: var(--color-success); background: transparent;" data-name="${escName}">
                Approve for Tomorrow
              </button>
              <button class="admin-btn-outline reject-sug-btn" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--color-secondary); color: var(--color-secondary); background: transparent;" data-name="${escName}">
                Not available this time
              </button>
              <button class="admin-btn-outline delete-sug-btn" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--text-muted); color: var(--text-muted); background: transparent;" data-name="${escName}">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
    
    // Bind actions
    tableBody.querySelectorAll(".add-to-menu-sug-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const dishName = e.currentTarget.dataset.name;
        const notes = e.currentTarget.dataset.desc;
        openDishModal({
          id: "",
          title: dishName,
          category: categories.length > 0 ? categories[0].name : "",
          price: 12.50,
          image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
          description: notes || "",
          availableToday: true,
          popular: false,
          visible: true
        });
      });
    });
    
    tableBody.querySelectorAll(".approve-sug-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const dishName = e.currentTarget.dataset.name;
        
        // Approve suggestion: write it to cookingDecisions with isCustom: true
        const customId = "custom_" + dishName.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const decisionObject = {
          status: "selected",
          title: dishName,
          price: 12.50,
          description: "",
          image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
          isCustom: true
        };
        
        // Also save to tomorrowRequests so it shows up in requests counts and chef summary
        const requestData = {
          itemId: customId,
          itemName: dishName,
          foodItemId: customId,
          foodTitle: dishName,
          customerName: "Chef Approved Suggestion",
          phone: "N/A",
          customerPhone: "N/A",
          quantity: 1,
          notes: "Approved from customer suggestions",
          preferredTime: "12:00 PM - 1:00 PM",
          isCustom: true,
          reserve: false,
          sessionId: "chef"
        };
        await window.dbEngine.saveTomorrowRequest(requestData);
        await window.dbEngine.saveCookingDecision(customId, decisionObject);
        alert(`Approved suggestion "${dishName}" for tomorrow! It will show up in tomorrow requests.`);
        refreshData();
      });
    });
    
    tableBody.querySelectorAll(".reject-sug-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const dishName = e.currentTarget.dataset.name;
        const customId = "custom_" + dishName.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const decisionObject = {
          status: "not_selected",
          title: dishName
        };
        await window.dbEngine.saveCookingDecision(customId, decisionObject);
        alert(`Marked suggestion "${dishName}" as not available this time.`);
        refreshData();
      });
    });
    
    tableBody.querySelectorAll(".delete-sug-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const dishName = e.currentTarget.dataset.name;
        if (confirm(`Are you sure you want to delete all suggestion records for "${dishName}"?`)) {
          await window.dbEngine.clearCustomerSuggestionsByDish(dishName);
          refreshData();
        }
      });
    });
  };

  // --- CUSTOMER HISTORY EXPLORER RENDER ---
  const renderCustomerHistoryTable = () => {
    const tableBody = document.getElementById("customers-table-body");
    const searchInput = document.getElementById("admin-search-customers");
    if (!tableBody) return;

    if (orders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
            No customers registered yet. Place pre-orders on the storefront!
          </td>
        </tr>
      `;
      return;
    }

    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // Aggregate profiles dynamically from the orders array
    const customerProfiles = {};

    orders.forEach(order => {
      const phone = order.customerPhone ? order.customerPhone.trim() : "";
      const name = order.customerName ? order.customerName.trim() : "Anonymous";
      const key = phone || `name_${name.toLowerCase()}`;

      if (!customerProfiles[key]) {
        customerProfiles[key] = {
          name: name,
          phone: phone,
          totalOrders: 0,
          totalSpend: 0,
          lastOrderDate: order.createdAt,
          itemCounts: {}
        };
      }

      const profile = customerProfiles[key];
      profile.totalOrders++;
      
      if (order.status !== "Cancelled") {
        profile.totalSpend += order.total;
      }
      
      if (new Date(order.createdAt) > new Date(profile.lastOrderDate)) {
        profile.lastOrderDate = order.createdAt;
      }

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          profile.itemCounts[item.title] = (profile.itemCounts[item.title] || 0) + item.quantity;
        });
      }
    });

    const sortedProfiles = Object.values(customerProfiles).sort((a, b) => b.totalOrders - a.totalOrders);

    const filteredProfiles = sortedProfiles.filter(profile => {
      return profile.name.toLowerCase().includes(searchQuery) || 
             profile.phone.toLowerCase().includes(searchQuery);
    });

    if (filteredProfiles.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
            No matching customers found.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filteredProfiles.map(profile => {
      const dateText = new Date(profile.lastOrderDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      
      const favDishes = Object.entries(profile.itemCounts)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([title, qty]) => `${title} (${qty}x)`)
                              .join(", ") || `<span style="color:var(--text-muted);">None</span>`;

      const displayPhone = profile.phone ? `<a href="tel:${profile.phone}" style="color:var(--color-primary);">${profile.phone}</a>` : `<span style="color:var(--text-muted);">N/A</span>`;

      return `
        <tr>
          <td>
            <strong>${profile.name}</strong>
            <div style="font-size:0.8rem; margin-top:2px;">${displayPhone}</div>
          </td>
          <td style="text-align: center; font-weight:700;">${profile.totalOrders}</td>
          <td style="font-size:0.85rem;">${favDishes}</td>
          <td style="text-align: center; font-weight:700; color:var(--color-success);">${formatPrice(profile.totalSpend)}</td>
          <td>${dateText}</td>
        </tr>
      `;
    }).join("");
  };

  const renderTomorrowPlan = () => {
    const liveList = document.getElementById("tomorrow-plan-live-list");
    const catalogList = document.getElementById("tomorrow-plan-catalog-list");
    const countBadge = document.getElementById("tomorrow-plan-count");
    if (!liveList || !catalogList) return;

    const confirmedItems = foodItems.filter(item => item.visible !== false && (item.confirmedTomorrow || item.availableTomorrow));
    const customConfirmed = Object.entries(cookingDecisions)
      .filter(([, decision]) => decision && typeof decision === "object" && decision.status === "selected" && decision.isCustom)
      .map(([id, decision]) => ({
        id,
        title: decision.title || "Custom dish",
        category: "Customer suggestion",
        image: decision.image || "",
        price: Number(decision.price || 0),
        custom: true
      }));

    const allConfirmed = [...confirmedItems, ...customConfirmed];
    if (countBadge) countBadge.innerText = `${allConfirmed.length} confirmed`;

    if (allConfirmed.length === 0) {
      liveList.innerHTML = `<p class="muted-empty">No dishes confirmed for tomorrow yet. Turn on Cook Tomorrow below or approve customer requests.</p>`;
    } else {
      liveList.innerHTML = allConfirmed.map(item => `
        <div class="tomorrow-plan-item">
          <img src="${resolveMediaUrl(item.image)}" alt="${item.title}" loading="lazy" decoding="async">
          <div>
            <strong>${item.title}</strong>
            <span>${item.custom ? "Approved customer suggestion" : `${item.category || "Menu item"} · ${formatPrice(item.price || 0)}`}</span>
          </div>
          ${item.custom ? `<span class="badge badge-outline">Custom</span>` : `<span class="badge" style="background:rgba(46,196,182,0.16); border:1px solid var(--color-success); color:var(--color-success);">Customer visible</span>`}
        </div>
      `).join("");
    }

    if (foodItems.length === 0) {
      catalogList.innerHTML = `<p class="muted-empty">No menu items yet. Add food in the Menu tab first.</p>`;
      return;
    }

    catalogList.innerHTML = foodItems.map(item => {
      const isConfirmed = item.confirmedTomorrow || item.availableTomorrow;
      return `
        <div class="tomorrow-plan-item" data-id="${item.id}">
          <img src="${resolveMediaUrl(item.image)}" alt="${item.title}" loading="lazy" decoding="async">
          <div>
            <strong>${item.title}</strong>
            <span>${item.category || "No category"} · ${item.visible === false ? "Hidden from shop" : "Visible"}${item.soldOut ? " · Sold out" : ""}</span>
          </div>
          <label class="tomorrow-plan-toggle">
            <input type="checkbox" class="tomorrow-plan-checkbox" data-id="${item.id}" ${isConfirmed ? "checked" : ""}>
            Cook Tomorrow
          </label>
        </div>
      `;
    }).join("");

    catalogList.querySelectorAll(".tomorrow-plan-checkbox").forEach(input => {
      input.addEventListener("change", async (event) => {
        const id = event.currentTarget.dataset.id;
        const selected = event.currentTarget.checked;
        const item = foodItems.find(entry => entry.id === id);
        if (!item) return;

        event.currentTarget.disabled = true;
        try {
          item.confirmedTomorrow = selected;
          item.availableTomorrow = selected;
          await window.dbEngine.saveFoodItem(item);
          await window.dbEngine.setAvailableTomorrow(id, selected);
          await window.dbEngine.saveBehaviorLog("admin_tomorrow_plan_toggle", {
            itemId: id,
            itemTitle: item.title,
            selected
          });
          await refreshData();
        } catch (error) {
          console.error("Error updating tomorrow plan:", error);
          alert("Could not update Tomorrow Plan. Please try again.");
          event.currentTarget.checked = !selected;
          event.currentTarget.disabled = false;
        }
      });
    });
  };

  // --- GENERAL EVENT LISTENERS ---
  const setupListeners = () => {
    // 0. Tab Switching Event Listeners
    const adminTabs = document.querySelectorAll("#admin-sections-tabs .section-tab");
    adminTabs.forEach(tab => {
      tab.addEventListener("click", async (e) => {
        const previousSection = getActiveAdminSection();
        const targetSection = e.currentTarget.dataset.section;
        
        // Remove active class from all tabs and add to current
        adminTabs.forEach(t => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        // Hide all contents and show current
        document.querySelectorAll(".admin-tab-content").forEach(content => {
          content.classList.remove("active");
        });
        const targetContent = document.getElementById(`admin-tab-${targetSection}`);
        if (targetContent) targetContent.classList.add("active");

        if (previousSection === "social" && targetSection !== "social") {
          refreshData({ force: true });
        } else if (targetSection === "social") {
          try {
            await syncStoryMenuData();
          } catch (error) {
            console.warn("Story menu sync skipped:", error);
          }
          if (window.MenuStoryExport?.enterTab) window.MenuStoryExport.enterTab();
          else if (window.MenuStoryExport?.resizePreview) window.MenuStoryExport.resizePreview();
        }
        
        window.dbEngine.saveBehaviorLog("admin_tab_switch", { tab: targetSection });
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !isSocialTabActive()) refreshData();
    });

    // 0b. Clickable Dashboard KPI Cards Handler
    document.querySelectorAll(".clickable-kpi").forEach(card => {
      card.addEventListener("click", (e) => {
        const section = e.currentTarget.dataset.targetSection;
        const filter = e.currentTarget.dataset.filter;
        
        // Find corresponding section tab button and click it
        const tabBtn = document.querySelector(`#admin-sections-tabs .section-tab[data-section="${section}"]`);
        if (tabBtn) {
          tabBtn.click();
        }
        
        // If there is a filter, apply it
        if (filter) {
          const filterStatusSelect = document.getElementById("admin-filter-status");
          if (filterStatusSelect) {
            filterStatusSelect.value = filter;
            // Trigger change event to filter list
            filterStatusSelect.dispatchEvent(new Event("change"));
          }
        }
      });
    });

    // 1. Reset data button
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener("click", async () => {
        if (confirm("This will reset all customer requests, request counts, and tomorrow's confirmed menu. Do you want to proceed?")) {
          await window.dbEngine.resetDailyRequests();
          localStorage.setItem("adminLastCheckedCount", "0"); // Reset unread badge to 0
          window.location.reload();
        }
      });
    }

    // 2. Add dish button
    if (addDishBtn) addDishBtn.addEventListener("click", () => openDishModal());

    const quickAddDishBtn = document.getElementById("quick-add-dish-btn");
    if (quickAddDishBtn) quickAddDishBtn.addEventListener("click", () => openDishModal());

    const quickSettingsBtn = document.getElementById("quick-settings-btn");
    if (quickSettingsBtn) quickSettingsBtn.addEventListener("click", () => switchAdminTab("settings"));

    const planOpenRequestsBtn = document.getElementById("plan-open-requests-btn");
    if (planOpenRequestsBtn) planOpenRequestsBtn.addEventListener("click", () => switchAdminTab("requests"));

    const bindDeleteAllRequests = (button) => {
      if (!button) return;
      button.addEventListener("click", async () => {
        if (!tomorrowRequests.length) {
          alert("There are no customer requests to delete.");
          return;
        }
        if (!confirm(`Delete all ${tomorrowRequests.length} customer request(s) from live storage? This cannot be undone.`)) {
          return;
        }
        button.disabled = true;
        try {
          await deleteAllTomorrowRequests();
        } catch (err) {
          console.error("Error deleting all requests:", err);
          alert("Failed to delete all requests from live storage.");
        } finally {
          button.disabled = false;
        }
      });
    };

    bindDeleteAllRequests(document.getElementById("delete-all-requests-btn"));
    bindDeleteAllRequests(document.getElementById("delete-all-inbox-requests-btn"));

    const planOpenMenuBtn = document.getElementById("plan-open-menu-btn");
    if (planOpenMenuBtn) planOpenMenuBtn.addEventListener("click", () => switchAdminTab("menu"));

    const clearMenuBtn = document.getElementById("btn-clear-menu");
    if (clearMenuBtn) {
      clearMenuBtn.addEventListener("click", async () => {
        if (foodItems.length === 0) {
          alert("The menu is already empty.");
          return;
        }

        const confirmed = confirm(`This will delete all ${foodItems.length} menu items from the catalog. Existing orders and request history may still reference old dish names. Continue?`);
        if (!confirmed) return;

        clearMenuBtn.disabled = true;
        const originalText = clearMenuBtn.innerHTML;
        clearMenuBtn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Clearing...`;

        try {
          for (const item of foodItems) {
            await window.dbEngine.deleteFoodItem(item.id);
          }
          await window.dbEngine.saveBehaviorLog("admin_clear_menu", { deletedItems: foodItems.length });
          await refreshData();
          alert("Menu cleared. You can now add your real dishes.");
        } catch (err) {
          console.error("Error clearing menu:", err);
          alert("Failed to clear the menu. Please try again.");
        } finally {
          clearMenuBtn.disabled = false;
          clearMenuBtn.innerHTML = originalText;
        }
      });
    }

    // 3. Modals closes
    dishModalClose.addEventListener("click", () => dishModal.classList.remove("active"));
    if (categoryModalClose) {
      categoryModalClose.addEventListener("click", () => categoryModal.classList.remove("active"));
    }
    
    // Close modal click backdrop
    window.addEventListener("click", (e) => {
      if (e.target === dishModal) dishModal.classList.remove("active");
      if (e.target === categoryModal) categoryModal.classList.remove("active");
    });

    // 4. Form Submits
    dishForm.addEventListener("submit", handleDishFormSubmit);
    if (categoryForm) categoryForm.addEventListener("submit", handleCategorySubmit);
    if (settingsForm) {
      settingsForm.addEventListener("submit", handleSettingsSubmit);
      settingsForm.querySelectorAll("input, select, textarea").forEach(field => {
        field.addEventListener("input", () => markSettingsDirty());
        field.addEventListener("change", () => markSettingsDirty());
      });
    }

    // 4b. Bell click opens Requests tab and resets badge count
    const adminBell = document.getElementById("admin-bell");
    if (adminBell) {
      adminBell.addEventListener("click", () => {
        switchAdminTab("requests");
        localStorage.setItem("adminLastCheckedCount", tomorrowRequests.length);
        updateNotificationBell();

        const requestsDetailsStream = document.getElementById("requests-details-stream");
        if (requestsDetailsStream) {
          requestsDetailsStream.style.boxShadow = "0 0 20px var(--color-primary-glow)";
          setTimeout(() => {
            requestsDetailsStream.style.boxShadow = "none";
          }, 1500);
        }
      });
    }

    // 4c. WhatsApp Summary button
    const sendChefSummaryBtn = document.getElementById("btn-send-chef-summary");
    if (sendChefSummaryBtn) {
      sendChefSummaryBtn.addEventListener("click", sendChefSummaryToWhatsApp);
    }

    // 5. Add Category Button
    if (btnAddCategory) {
      btnAddCategory.addEventListener("click", () => openCategoryModal());
    }

    // 6. Voting Deadline Select (Header dropdown) changed
    const deadlineSelect = document.getElementById("voting-deadline-select");
    if (deadlineSelect) {
      deadlineSelect.addEventListener("change", async () => {
        // Save back to settings database
        const updated = {
          ...settings,
          votingDeadline: deadlineSelect.value
        };
        settings = await window.dbEngine.saveSettings(updated);
        updateVotingDeadlineTimer();
        loadSettingsForm();
      });
    }

    const deliveryOptionsSelect = document.getElementById("settings-delivery-options");
    const deliveryToggle = document.getElementById("settings-delivery-enabled");
    const pickupToggle = document.getElementById("settings-pickup-enabled");

    const syncFulfillmentSelectFromToggles = () => {
      if (!deliveryOptionsSelect || !deliveryToggle || !pickupToggle) return;
      deliveryOptionsSelect.value = getDeliveryOptionsFromToggles(deliveryToggle.checked, pickupToggle.checked);
    };

    const syncFulfillmentTogglesFromSelect = () => {
      if (!deliveryOptionsSelect || !deliveryToggle || !pickupToggle) return;
      const next = getFulfillmentTogglesFromOption(deliveryOptionsSelect.value);
      deliveryToggle.checked = next.delivery;
      pickupToggle.checked = next.pickup;
    };

    if (deliveryOptionsSelect) deliveryOptionsSelect.addEventListener("change", syncFulfillmentTogglesFromSelect);
    if (deliveryToggle) deliveryToggle.addEventListener("change", syncFulfillmentSelectFromToggles);
    if (pickupToggle) pickupToggle.addEventListener("change", syncFulfillmentSelectFromToggles);

    // 7. Image file upload change listener (client-side compression)
    const fileInput = document.getElementById("dish-image-file");
    const textInput = document.getElementById("dish-image");
    const previewContainer = document.getElementById("image-upload-preview-container");
    const previewImage = document.getElementById("image-upload-preview");

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          if (previewContainer) previewContainer.style.display = "none";
          if (textInput) textInput.value = "";
          compressImage(file, async (dataUrl) => {
            let imageUrl = dataUrl;
            const statusEl = previewContainer ? previewContainer.querySelector("span") : null;
            if (statusEl) statusEl.textContent = "Compressing photo...";
            if (previewContainer) previewContainer.style.display = "flex";
            if (previewImage) previewImage.src = dataUrl;
            try {
              if (window.dbEngine.uploadImageDataUrl) {
                if (statusEl) statusEl.textContent = "Uploading compressed image...";
                imageUrl = await window.dbEngine.uploadImageDataUrl(dataUrl, "menu");
              }
              if (textInput) textInput.value = imageUrl;
              if (previewImage) previewImage.src = resolveMediaUrl(imageUrl);
              if (statusEl) statusEl.textContent = "Compressed image ready";
            } catch (err) {
              console.error("Menu image upload failed:", err);
              alert("Could not save the compressed image live. Please try again.");
              if (textInput) textInput.value = "";
              if (previewContainer) previewContainer.style.display = "none";
              if (previewImage) previewImage.src = "";
            }
          }, { maxWidth: 900, maxHeight: 900, quality: 0.82 });
        }
      });
    }

    const logoFileInput = document.getElementById("settings-business-logo-file");
    const logoTextInput = document.getElementById("settings-business-logo");
    const removeLogoBtn = document.getElementById("settings-remove-logo-btn");
    const heroFileInput = document.getElementById("settings-hero-image-file");
    const heroTextInput = document.getElementById("settings-hero-image");
    const removeHeroBtn = document.getElementById("settings-remove-hero-btn");
    const businessNameInput = document.getElementById("settings-business-name");
    const businessTaglineInput = document.getElementById("settings-business-tagline");

    if (businessNameInput) businessNameInput.addEventListener("input", updateBrandPreview);
    if (businessTaglineInput) businessTaglineInput.addEventListener("input", updateBrandPreview);

    const logoSizeInput = document.getElementById("settings-brand-logo-size");
    if (logoSizeInput) {
      logoSizeInput.addEventListener("input", () => {
        updateLogoSizePreview();
        markSettingsDirty("Logo size changed. Press Save Settings to publish.");
      });
    }
    const logoPlacementInput = document.getElementById("settings-brand-logo-placement");
    if (logoPlacementInput) {
      logoPlacementInput.addEventListener("change", () => {
        markSettingsDirty("Logo position changed. Press Save Settings to publish.");
      });
    }

    if (logoTextInput) {
      logoTextInput.addEventListener("input", () => {
        updateLogoPreview(logoTextInput.value.trim());
        updateBrandPreview();
      });
    }
    if (logoFileInput) {
      logoFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          compressImage(file, async (dataUrl) => {
            let imageUrl = dataUrl;
            try {
              if (window.dbEngine.uploadImageDataUrl) {
                imageUrl = await window.dbEngine.uploadImageDataUrl(dataUrl, "logo");
              }
            } catch (err) {
              alert("Logo upload could not be saved live. Please try again.");
            }
            if (logoTextInput) logoTextInput.value = imageUrl;
            updateLogoPreview(imageUrl);
            updateBrandPreview();
            markSettingsDirty("Logo ready. Press Save Settings to publish it.");
          }, { maxWidth: 600, maxHeight: 600, quality: 0.88 });
        }
      });
    }
    if (removeLogoBtn) {
      removeLogoBtn.addEventListener("click", () => {
        if (logoTextInput) logoTextInput.value = "";
        if (logoFileInput) logoFileInput.value = "";
        updateLogoPreview("");
        updateBrandPreview();
        markSettingsDirty("Logo removed. Press Save Settings to publish the change.");
      });
    }

    if (heroTextInput) {
      heroTextInput.addEventListener("input", () => updateHeroPreview(heroTextInput.value.trim()));
    }
    if (heroFileInput) {
      heroFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          compressImage(file, async (dataUrl) => {
            let imageUrl = dataUrl;
            try {
              if (window.dbEngine.uploadImageDataUrl) {
                imageUrl = await window.dbEngine.uploadImageDataUrl(dataUrl, "hero");
              }
            } catch (err) {
              alert("Hero image upload could not be saved live. Please try again.");
            }
            if (heroTextInput) heroTextInput.value = imageUrl;
            updateHeroPreview(imageUrl);
            markSettingsDirty("Hero image ready. Press Save Settings to publish it.");
          }, { maxWidth: 1200, maxHeight: 900, quality: 0.82 });
        }
      });
    }
    if (removeHeroBtn) {
      removeHeroBtn.addEventListener("click", () => {
        if (heroTextInput) heroTextInput.value = "";
        if (heroFileInput) heroFileInput.value = "";
        updateHeroPreview("");
        markSettingsDirty("Hero image removed. Press Save Settings to publish the change.");
      });
    }

    // 8. Search & Multi-status filters for menu items
    const searchDishes = document.getElementById("admin-search-dishes");
    const filterCategory = document.getElementById("admin-filter-category");
    const filterStatus = document.getElementById("admin-filter-status");

    if (searchDishes) searchDishes.addEventListener("input", renderMenuManagementList);
    if (filterCategory) filterCategory.addEventListener("change", renderMenuManagementList);
    if (filterStatus) filterStatus.addEventListener("change", renderMenuManagementList);

    // 9. Customer History search
    const searchCustomersInput = document.getElementById("admin-search-customers");
    if (searchCustomersInput) {
      searchCustomersInput.addEventListener("input", renderCustomerHistoryTable);
    }

    // 10. Copy Today Menu to Tomorrow button handler
    const copyTodayTomorrowBtn = document.getElementById("btn-copy-today-tomorrow");
    if (copyTodayTomorrowBtn) {
      copyTodayTomorrowBtn.addEventListener("click", async () => {
        const activeTodayItems = foodItems.filter(item => item.availableToday === true);
        if (activeTodayItems.length === 0) {
          alert("No items currently available today in the catalog.");
          return;
        }
        if (confirm(`This will copy all ${activeTodayItems.length} 'Available Today' food item selections to be 'Confirmed for Tomorrow'. Continue?`)) {
          let count = 0;
          for (const item of activeTodayItems) {
            item.confirmedTomorrow = true;
            item.availableTomorrow = true;
            await window.dbEngine.saveFoodItem(item);
            await window.dbEngine.setAvailableTomorrow(item.id, true);
            count++;
          }
          await window.dbEngine.saveBehaviorLog("admin_copy_today_to_tomorrow", { itemsCopied: count });
          alert(`Successfully copied ${count} items to tomorrow's menu!`);
          refreshData();
        }
      });
    }
  };

  // Run initialization
  init().then(() => {
    if (window.MenuStoryExport && window.MenuStoryExport.bind) {
      window.MenuStoryExport.bind({
        getSettings: () => settings,
        getFoodItems: () => foodItems,
        formatPrice,
        resolveMediaUrl,
        getRestaurantDateString
      });
    }
  });
});
