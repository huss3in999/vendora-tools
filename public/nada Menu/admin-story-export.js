/**
 * Today's Menu Story — themes + multi-page Menu Cards export (1080×1920).
 */
(function () {
  const STORY_W = 1080;
  const STORY_H = 1920;
  const MAX_ITEMS = 12;
  const GAP = 14;
  const HEADER_H = 228;
  const FOOTER_H = 108;
  const BODY_PAD = 48;

  let ctxApi = null;
  let selectedTheme = "luxury";
  let showAllPrices = true;
  let menuAppShowBadge = true;
  let menuAppShowButtons = true;
  let itemEdits = {};
  let lastBlob = null;
  let lastBlobs = [];
  let lastMenuSig = "";

  const themeClass = {
    luxury: "story-tpl-luxury",
    modern: "story-tpl-modern",
    vibrant: "story-tpl-vibrant",
    menuapp: "story-tpl-menuapp"
  };

  const escapeHtml = (v) => String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const getTodayItems = () => {
    const items = ctxApi.getFoodItems() || [];
    return items.filter((item) => item.availableToday && item.visible !== false && !item.soldOut);
  };

  const getEdit = (item) => {
    const saved = itemEdits[item.id];
    return {
      included: saved ? saved.included !== false : true,
      displayName: saved && saved.displayName ? saved.displayName : item.title,
      showPrice: saved && saved.showPrice !== undefined ? saved.showPrice : true
    };
  };

  const getMenuAppItemsPerPage = () => {
    if (menuAppShowButtons) return 4;
    if (menuAppShowBadge) return 6;
    return 8;
  };

  const getActiveItems = () => {
    const items = getTodayItems()
      .filter((item) => getEdit(item).included)
      .map((item) => {
        const edit = getEdit(item);
        return {
          ...item,
          displayName: edit.displayName,
          showPrice: showAllPrices && edit.showPrice
        };
      });
    if (selectedTheme === "menuapp") return items;
    return items.slice(0, MAX_ITEMS);
  };

  const formatStoryDate = () => {
    try {
      const tz = (ctxApi.getSettings() || {}).restaurantTimezone || "Asia/Bahrain";
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        weekday: "long",
        month: "long",
        day: "numeric"
      }).format(new Date());
    } catch (e) {
      return new Date().toLocaleDateString();
    }
  };

  const availableBodyHeight = () => STORY_H - HEADER_H - FOOTER_H - BODY_PAD;

  const computeLayout = (count) => {
    const available = availableBodyHeight();

    if (count <= 0) return { mode: "empty" };
    if (count === 1) return { mode: "single", singleH: available };
    if (count === 2) return { mode: "duo", duoH: available };

    const restCount = count - 1;
    const gridRows = Math.ceil(restCount / 2);
    const gapTotal = GAP + Math.max(0, gridRows - 1) * GAP;

    const heroFraction = count === 3 ? 0.46
      : count === 4 ? 0.40
        : count === 5 ? 0.36
          : count === 6 ? 0.33
            : Math.max(0.26, 0.38 - (count - 4) * 0.025);

    const heroH = Math.floor((available - gapTotal) * heroFraction);
    const gridArea = available - heroH - gapTotal;
    const gridCellH = Math.max(140, Math.floor(gridArea / gridRows));

    return {
      mode: "hero-grid",
      heroH,
      gridCellH,
      gridRows,
      oddLast: restCount % 2 === 1
    };
  };

  const densityClass = (count) => {
    if (count >= 8) return "story-card-tiny";
    if (count >= 5) return "story-card-compact";
    return "";
  };

  const cardHtml = (item, opts) => {
    const {
      variant = "grid",
      heightPx,
      density = "",
      span = false
    } = opts;
    const img = escapeHtml(ctxApi.resolveMediaUrl(item.image));
    const name = escapeHtml(item.displayName || item.title);
    const price = item.showPrice
      ? `<span class="story-price">${escapeHtml(ctxApi.formatPrice(item.price))}</span>`
      : "";
    const cls = variant === "hero"
      ? "story-hero-card"
      : variant === "single"
        ? "story-single-card"
        : "story-grid-card";
    const spanCls = span ? " story-grid-card-span" : "";
    const densityCls = density ? ` ${density}` : "";

    return `
      <div class="${cls}${spanCls}${densityCls}" style="height:${heightPx}px;">
        <img class="story-card-photo" src="${img}" alt="" crossorigin="anonymous" loading="eager">
        <div class="story-card-overlay">
          <h2>${name}</h2>
          ${price}
        </div>
      </div>
    `;
  };

  const menuAppCardHtml = (item) => {
    const img = escapeHtml(ctxApi.resolveMediaUrl(item.image));
    const name = escapeHtml(item.displayName || item.title);
    const price = item.showPrice
      ? `<div class="story-menu-card-price">${escapeHtml(ctxApi.formatPrice(item.price))}</div>`
      : "";
    const cardCls = [
      "story-menu-card",
      menuAppShowButtons ? "" : "no-actions",
      menuAppShowBadge ? "" : "no-badge"
    ].filter(Boolean).join(" ");
    const badge = menuAppShowBadge
      ? `<span class="story-menu-card-badge">✓ Chef Selected</span>`
      : "";
    const actions = menuAppShowButtons
      ? `<div class="story-menu-card-actions">
            <span class="story-menu-btn-preorder">Pre-Order</span>
            <span class="story-menu-btn-reserve">Reserve</span>
          </div>`
      : "";

    return `
      <article class="${cardCls}">
        <div class="story-menu-card-img-wrap">
          <img class="story-menu-card-img" src="${img}" alt="" crossorigin="anonymous" loading="eager">
          ${badge}
        </div>
        <div class="story-menu-card-content">
          <h2 class="story-menu-card-title">${name}</h2>
          ${price}
          ${actions}
        </div>
      </article>
    `;
  };

  const findItemById = (id) => getTodayItems().find((item) => item.id === id);

  const buildBodyHtml = (items) => {
    if (!items.length) {
      return `<div class="story-empty-msg">Turn on <strong>Available Today</strong> for your dishes, then customize names and prices here.</div>`;
    }

    const layout = computeLayout(items.length);
    const density = densityClass(items.length);

    if (layout.mode === "single") {
      return `<div class="story-body">${cardHtml(items[0], { variant: "single", heightPx: layout.singleH, density })}</div>`;
    }

    if (layout.mode === "duo") {
      return `
        <div class="story-body">
          <div class="story-duo-grid">
            ${items.map((item) => cardHtml(item, { variant: "grid", heightPx: layout.duoH, density })).join("")}
          </div>
        </div>
      `;
    }

    const [hero, ...rest] = items;
    const lastIdx = rest.length - 1;
    const gridCards = rest.map((item, idx) => cardHtml(item, {
      variant: "grid",
      heightPx: layout.gridCellH,
      density,
      span: layout.oddLast && idx === lastIdx
    })).join("");

    return `
      <div class="story-body">
        ${cardHtml(hero, { variant: "hero", heightPx: layout.heroH, density })}
        <div class="story-grid" style="gap:${GAP}px;">${gridCards}</div>
      </div>
    `;
  };

  const buildClassicStoryHtml = (items) => {
    const settings = ctxApi.getSettings() || {};
    const businessName = escapeHtml(settings.businessName || "Today's Menu");
    const tagline = escapeHtml((settings.businessTagline || "").trim());
    const logo = settings.businessLogo
      ? `<img class="story-logo" src="${escapeHtml(ctxApi.resolveMediaUrl(settings.businessLogo))}" alt="" crossorigin="anonymous" loading="eager">`
      : "";
    const tpl = themeClass[selectedTheme] || themeClass.luxury;
    const denseCls = items.length >= 5 ? " story-frame-dense" : "";
    const phone = String(settings.whatsappOrderNumber || "").replace(/\D/g, "");

    let headHtml = "";
    if (selectedTheme === "modern") {
      headHtml = `
        <header class="story-head">
          ${logo}
          <p class="story-kicker">Fresh service</p>
          <h1 class="story-title">READY<span>TODAY</span></h1>
          <p class="story-date">${escapeHtml(formatStoryDate())}</p>
          <p class="story-brand">${businessName}</p>
        </header>
      `;
    } else {
      headHtml = `
        <header class="story-head">
          ${logo}
          <p class="story-kicker">Chef's selection</p>
          <h1 class="story-title">TODAY'S MENU</h1>
          <p class="story-date">${escapeHtml(formatStoryDate())}</p>
          <p class="story-brand">${businessName}</p>
          ${tagline ? `<p class="story-date story-tagline">${tagline}</p>` : ""}
        </header>
      `;
    }

    const bodyHtml = buildBodyHtml(items);
    const footText = items.length
      ? `${items.length} dish${items.length === 1 ? "" : "es"} ready today${phone ? " · Order on WhatsApp" : ""}`
      : businessName;

    return `
      <div class="story-frame ${tpl}${denseCls}">
        ${headHtml}
        ${bodyHtml}
        <footer class="story-foot">${escapeHtml(footText)}</footer>
      </div>
    `;
  };

  const buildMenuAppPageHtml = (pageItems, pageNum, totalPages, perPage) => {
    const settings = ctxApi.getSettings() || {};
    const businessName = escapeHtml(settings.businessName || "Gourmet Tomorrow");
    const logo = settings.businessLogo
      ? `<img class="story-logo" src="${escapeHtml(ctxApi.resolveMediaUrl(settings.businessLogo))}" alt="" crossorigin="anonymous" loading="eager">`
      : "";
    const phone = String(settings.whatsappOrderNumber || "").replace(/\D/g, "");
    const pageLabel = totalPages > 1 ? `Page ${pageNum} of ${totalPages} · ` : "";
    const densityCls = perPage > 4 ? " story-menuapp-density-compact" : "";

    const bodyContent = pageItems.length
      ? `<div class="story-menuapp-grid${densityCls}">${pageItems.map(menuAppCardHtml).join("")}</div>`
      : `<div class="story-empty-msg">Turn on <strong>Available Today</strong> for your dishes, then customize names and prices here.</div>`;

    return `
      <div class="story-frame story-tpl-menuapp">
        <header class="story-menuapp-header">
          ${logo}
          <div class="story-menuapp-brand">
            <h1>${businessName}</h1>
            <p>Today's Menu · ${escapeHtml(formatStoryDate())}</p>
          </div>
        </header>
        <div class="story-menuapp-body">
          ${bodyContent}
        </div>
        <footer class="story-foot">${escapeHtml(`${pageLabel}${pageItems.length} dish${pageItems.length === 1 ? "" : "es"}${phone ? " · Order on WhatsApp" : ""}`)}</footer>
      </div>
    `;
  };

  const buildAllPages = () => {
    const items = getActiveItems();

    if (selectedTheme === "menuapp") {
      const perPage = getMenuAppItemsPerPage();
      if (!items.length) {
        return [{ page: 1, total: 1, html: buildMenuAppPageHtml([], 1, 1, perPage) }];
      }
      const totalPages = Math.ceil(items.length / perPage);
      const pages = [];
      for (let i = 0; i < items.length; i += perPage) {
        const chunk = items.slice(i, i + perPage);
        const pageNum = Math.floor(i / perPage) + 1;
        pages.push({
          page: pageNum,
          total: totalPages,
          html: buildMenuAppPageHtml(chunk, pageNum, totalPages, perPage)
        });
      }
      return pages;
    }

    return [{ page: 1, total: 1, html: buildClassicStoryHtml(items) }];
  };

  const updatePreviewScale = () => {
    const viewport = document.getElementById("story-preview-viewport");
    const scaler = document.getElementById("story-preview-scaler");
    if (!viewport || !scaler) return;
    const w = viewport.clientWidth || 320;
    const scale = w / STORY_W;
    scaler.style.transform = `scale(${scale})`;
    viewport.style.height = `${Math.ceil(STORY_H * scale)}px`;
  };

  const schedulePreviewScale = () => {
    updatePreviewScale();
    requestAnimationFrame(updatePreviewScale);
    setTimeout(updatePreviewScale, 80);
    setTimeout(updatePreviewScale, 280);
  };

  const renderEditorList = () => {
    const list = document.getElementById("story-item-editor-list");
    if (!list) return;
    const items = getTodayItems();
    if (!items.length) {
      list.innerHTML = `<p style="color:var(--text-muted); font-size:0.82rem; margin:0;">No dishes marked Available Today yet.</p>`;
      return;
    }

    list.innerHTML = items.map((item) => {
      const edit = getEdit(item);
      return `
        <div class="story-item-editor-row" data-id="${item.id}">
          <input type="checkbox" class="story-item-include" data-id="${item.id}" ${edit.included ? "checked" : ""} aria-label="Include ${escapeHtml(item.title)}">
          <img src="${escapeHtml(ctxApi.resolveMediaUrl(item.image))}" alt="">
          <div class="story-item-editor-fields">
            <input type="text" class="story-item-name" data-id="${item.id}" value="${escapeHtml(edit.displayName)}" placeholder="Display name on story">
            <label><input type="checkbox" class="story-item-price" data-id="${item.id}" ${edit.showPrice ? "checked" : ""}> Show price</label>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".story-item-include").forEach((el) => {
      el.addEventListener("change", () => {
        const item = findItemById(el.dataset.id) || { id: el.dataset.id, title: "" };
        itemEdits[el.dataset.id] = { ...getEdit(item), included: el.checked };
        renderStory();
      });
    });
    list.querySelectorAll(".story-item-name").forEach((el) => {
      el.addEventListener("input", () => {
        const item = findItemById(el.dataset.id) || { id: el.dataset.id, title: "" };
        itemEdits[el.dataset.id] = { ...getEdit(item), displayName: el.value };
        renderStory();
      });
    });
    list.querySelectorAll(".story-item-price").forEach((el) => {
      el.addEventListener("change", () => {
        const item = findItemById(el.dataset.id) || { id: el.dataset.id, title: "" };
        itemEdits[el.dataset.id] = { ...getEdit(item), showPrice: el.checked };
        renderStory();
      });
    });
  };

  const updateMenuAppOptionsVisibility = () => {
    const panel = document.getElementById("story-menuapp-options");
    if (panel) panel.style.display = selectedTheme === "menuapp" ? "flex" : "none";
  };

  const updateDownloadButtonLabel = (totalPages) => {
    const btn = document.getElementById("btn-download-story");
    if (!btn) return;
    btn.innerHTML = totalPages > 1
      ? `<i class="bx bx-download"></i> Download ${totalPages} Story Images`
      : `<i class="bx bx-download"></i> Download Story Image`;
  };

  const renderStory = () => {
    const pages = buildAllPages();
    const capture = document.getElementById("story-html-capture");
    const preview = document.getElementById("story-preview-scaler");
    if (capture) capture.innerHTML = pages.map((p) => p.html).join("");
    if (preview) preview.innerHTML = pages[0] ? pages[0].html : "";
    schedulePreviewScale();
    lastBlob = null;
    lastBlobs = [];

    const count = getActiveItems().length;
    const totalPages = pages[0] ? pages[0].total : 1;
    const todayTotal = getTodayItems().length;
    const countEl = document.getElementById("story-today-count");
    if (countEl) countEl.textContent = `${todayTotal} today`;

    updateDownloadButtonLabel(totalPages);
    updateMenuAppOptionsVisibility();

    if (!count) {
      setStatus("Include at least one dish to build the story.", "muted");
      return;
    }

    if (selectedTheme === "menuapp") {
      const perPage = getMenuAppItemsPerPage();
      const opts = [];
      if (!menuAppShowBadge) opts.push("no badge");
      if (!menuAppShowButtons) opts.push("no buttons");
      const optNote = opts.length ? ` · ${opts.join(", ")}` : "";
      setStatus(
        totalPages > 1
          ? `${count} dishes · ${totalPages} pages (${perPage}/page). One click downloads all ${totalPages} images${optNote}.`
          : `${count} dishes · Menu Cards (${perPage} per page max)${optNote}. Download when ready.`,
        "success"
      );
      return;
    }

    setStatus(
      `${count} dish${count === 1 ? "" : "es"} · hero + side-by-side layout. Download when ready.`,
      "success"
    );
  };

  const setStatus = (message, tone = "muted") => {
    const el = document.getElementById("story-export-status");
    if (!el) return;
    el.textContent = message;
    el.style.color = tone === "success"
      ? "var(--color-success)"
      : tone === "danger"
        ? "var(--color-danger)"
        : "var(--text-muted)";
  };

  const buildFilename = (pageNum = 1, totalPages = 1) => {
    const name = ((ctxApi.getSettings() || {}).businessName || "menu").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const date = new Date().toISOString().slice(0, 10);
    if (totalPages > 1) {
      return `${name || "menu"}-today-${date}-${selectedTheme}-page-${pageNum}-of-${totalPages}.png`;
    }
    return `${name || "menu"}-today-${date}-${selectedTheme}.png`;
  };

  const waitForImages = (root) => {
    const imgs = Array.from(root.querySelectorAll("img"));
    return Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  };

  const exportFrameToBlob = async (frame) => {
    if (typeof html2canvas !== "function") {
      throw new Error("Image engine not loaded. Check your internet connection and refresh.");
    }
    if (!frame) throw new Error("Nothing to export.");

    await document.fonts.ready;
    await waitForImages(frame);
    await new Promise((r) => setTimeout(r, 280));

    const canvas = await html2canvas(frame, {
      width: STORY_W,
      height: STORY_H,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      imageTimeout: 15000
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create PNG."));
      }, "image/png", 1);
    });
  };

  const exportAllPngBlobs = async (onProgress) => {
    const capture = document.getElementById("story-html-capture");
    const frames = capture ? Array.from(capture.querySelectorAll(".story-frame")) : [];
    if (!frames.length) throw new Error("Nothing to export.");
    const blobs = [];
    for (let i = 0; i < frames.length; i += 1) {
      if (onProgress) onProgress(i + 1, frames.length);
      blobs.push(await exportFrameToBlob(frames[i]));
    }
    return blobs;
  };

  const downloadBlob = (blob, pageNum = 1, totalPages = 1) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildFilename(pageNum, totalPages);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const downloadAllBlobs = async (blobs) => {
    const totalPages = blobs.length;
    const delayMs = totalPages > 10 ? 300 : 450;
    for (let i = 0; i < blobs.length; i += 1) {
      if (i > 0) await new Promise((r) => setTimeout(r, delayMs));
      downloadBlob(blobs[i], i + 1, totalPages);
    }
  };

  const shareBlob = async (blob, pageNum = 1, totalPages = 1) => {
    const file = new File([blob], buildFilename(pageNum, totalPages), { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${(ctxApi.getSettings() || {}).businessName || "Menu"} — Today's Menu`,
        text: totalPages > 1 ? `Today's menu (page ${pageNum} of ${totalPages})` : "Our menu ready today"
      });
      return true;
    }
    return false;
  };

  const bindUi = () => {
    document.getElementById("story-theme-picker")?.querySelectorAll("[data-story-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedTheme = btn.dataset.storyTheme;
        document.querySelectorAll("[data-story-theme]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderStory();
      });
    });

    const priceToggle = document.getElementById("story-show-all-prices");
    if (priceToggle) {
      priceToggle.addEventListener("change", () => {
        showAllPrices = priceToggle.checked;
        renderStory();
      });
    }

    const badgeToggle = document.getElementById("story-menuapp-show-badge");
    if (badgeToggle) {
      badgeToggle.addEventListener("change", () => {
        menuAppShowBadge = badgeToggle.checked;
        renderStory();
      });
    }

    const buttonsToggle = document.getElementById("story-menuapp-show-buttons");
    if (buttonsToggle) {
      buttonsToggle.addEventListener("change", () => {
        menuAppShowButtons = buttonsToggle.checked;
        renderStory();
      });
    }

    window.addEventListener("resize", updatePreviewScale);

    document.getElementById("btn-download-story")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      if (!getActiveItems().length) {
        alert("Include at least one dish in the story first.");
        return;
      }
      btn.disabled = true;
      const pages = buildAllPages();
      const totalPages = pages[0]?.total || 1;
      setStatus(totalPages > 1
        ? `Rendering ${totalPages} story images...`
        : "Rendering full-size story image...");
      try {
        const blobs = await exportAllPngBlobs((page, total) => {
          setStatus(`Rendering page ${page} of ${total}...`);
        });
        lastBlobs = blobs;
        lastBlob = blobs[0] || null;
        await downloadAllBlobs(blobs);
        setStatus(
          totalPages > 1
            ? `Downloaded ${totalPages} images. Post them in order to WhatsApp or TikTok.`
            : "Downloaded. Post to WhatsApp Status or TikTok.",
          "success"
        );
      } catch (err) {
        console.error(err);
        setStatus(err.message || "Export failed. Try again on Wi‑Fi.", "danger");
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById("btn-share-story")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      if (!getActiveItems().length) {
        alert("Include at least one dish first.");
        return;
      }
      btn.disabled = true;
      setStatus("Preparing share...");
      try {
        const pages = buildAllPages();
        const totalPages = pages[0]?.total || 1;
        const blobs = lastBlobs.length === totalPages
          ? lastBlobs
          : await exportAllPngBlobs((page, total) => {
            setStatus(`Preparing page ${page} of ${total}...`);
          });
        lastBlobs = blobs;
        lastBlob = blobs[0] || null;

        if (totalPages > 1) {
          await downloadAllBlobs(blobs);
          setStatus(`Shared/downloaded ${totalPages} pages. Upload each image in order to your story.`, "success");
          return;
        }

        const shared = await shareBlob(blobs[0], 1, 1);
        setStatus(shared ? "Pick WhatsApp in the share menu." : "Downloaded instead — upload to your story.", "success");
        if (!shared) downloadBlob(blobs[0], 1, 1);
      } catch (err) {
        if (err && err.name === "AbortError") setStatus("Share cancelled.", "muted");
        else {
          console.error(err);
          setStatus("Share failed. Use Download instead.", "danger");
        }
      } finally {
        btn.disabled = false;
      }
    });
  };

  const todayMenuSignature = () => getTodayItems()
    .map((item) => `${item.id}:${item.title}:${item.image}:${item.price}:${item.availableToday}`)
    .join("|");

  const seedItemEdits = () => {
    getTodayItems().forEach((item) => {
      if (!itemEdits[item.id]) {
        itemEdits[item.id] = { included: true, displayName: item.title, showPrice: true };
      }
    });
  };

  window.MenuStoryExport = {
    bind(api) {
      ctxApi = api;
      bindUi();
      document.querySelector("[data-story-theme]")?.classList.add("active");
      lastMenuSig = "";
      seedItemEdits();
      renderEditorList();
      renderStory();
      lastMenuSig = todayMenuSignature();
    },
    enterTab() {
      if (!ctxApi) return;
      const sig = todayMenuSignature();
      if (sig !== lastMenuSig) {
        lastMenuSig = sig;
        seedItemEdits();
        renderEditorList();
        renderStory();
        return;
      }
      schedulePreviewScale();
    },
    refresh() {
      if (!ctxApi) return;
      lastMenuSig = todayMenuSignature();
      seedItemEdits();
      renderEditorList();
      renderStory();
    },
    resizePreview: schedulePreviewScale
  };
})();
