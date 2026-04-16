(function () {
  var STORAGE_KEY_V1 = "vendora_inventory_tracker_v1";
  var STORAGE_KEY = "vendora_inventory_dashboard_v2";
  var HISTORY_MAX = 800;
  var STALE_DAYS = 30;

  var REASONS = [
    { id: "received", label: "Received" },
    { id: "sold", label: "Sold" },
    { id: "wasted", label: "Wasted" },
    { id: "damaged", label: "Damaged" },
    { id: "returned", label: "Returned" },
    { id: "manual_correction", label: "Manual correction" }
  ];

  var tbody = document.getElementById("invBody");
  var historyBody = document.getElementById("historyBody");
  var addRowBtn = document.getElementById("addRowBtn");
  var totalSku = document.getElementById("totalSku");
  var totalQty = document.getElementById("totalQty");
  var totalValue = document.getElementById("totalValue");
  var lowStockBanner = document.getElementById("lowStockBanner");
  var saveStatus = document.getElementById("saveStatus");
  var invSearch = document.getElementById("invSearch");
  var invFilterCategory = document.getElementById("invFilterCategory");
  var invFilterSupplier = document.getElementById("invFilterSupplier");
  var invSort = document.getElementById("invSort");
  var filterHint = document.getElementById("filterHint");
  var historyEmpty = document.getElementById("historyEmpty");
  var importError = document.getElementById("importError");
  var importFileIo = document.getElementById("importFileIo");
  var importMode = document.getElementById("importMode");
  var btnDownloadTemplate = document.getElementById("btnDownloadTemplate");
  var btnExportXlsx = document.getElementById("btnExportXlsx");
  var btnExportCsv = document.getElementById("btnExportCsv");
  var exportJsonHidden = document.getElementById("exportJsonHidden");
  var importJsonHidden = document.getElementById("importJsonHidden");
  var btnClearData = document.getElementById("btnClearData");
  var btnPrepareReorder = document.getElementById("btnPrepareReorder");

  var saveIndicatorTimer = null;

  function nowIso() {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }

  function createRow(data) {
    return {
      id: data && data.id ? data.id : "inv-" + Math.random().toString(36).slice(2, 10),
      name: data && data.name != null ? data.name : "",
      sku: data && data.sku != null ? data.sku : "",
      qty: data && data.qty != null ? data.qty : 0,
      unitCost: data && data.unitCost != null ? data.unitCost : 0,
      minLevel: data && data.minLevel != null ? data.minLevel : 0,
      category: data && data.category != null ? data.category : "",
      supplier: data && data.supplier != null ? data.supplier : "",
      updated: data && data.updated ? data.updated : nowIso()
    };
  }

  var state = { rows: [], history: [] };

  function migrateFromV1() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_V1);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return false;
      state.rows = parsed.map(function (r) {
        return createRow(r);
      });
      state.history = [];
      persist();
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.rows)) {
          state.rows = parsed.rows.map(function (r) {
            return createRow(r);
          });
          state.history = Array.isArray(parsed.history)
            ? parsed.history.filter(function (h) {
                return h && h.ts;
              })
            : [];
          return;
        }
      }
    } catch (e) {}
    if (migrateFromV1()) return;
    state.rows = [
      createRow({
        name: "Example item",
        sku: "SKU-001",
        qty: 24,
        unitCost: 5.5,
        minLevel: 10,
        category: "Dry goods",
        supplier: "Wholesale Co"
      })
    ];
    state.history = [];
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          rows: state.rows,
          history: state.history
        })
      );
    } catch (e) {}
  }

  function setSaveIndicator(mode) {
    if (!saveStatus) return;
    if (mode === "saving") {
      saveStatus.textContent = "Saving…";
      saveStatus.classList.add("is-saving");
      saveStatus.classList.remove("is-error");
    } else if (mode === "saved") {
      saveStatus.textContent = "Saved";
      saveStatus.classList.remove("is-saving");
      saveStatus.classList.remove("is-error");
    } else if (mode === "error") {
      saveStatus.textContent = "Save failed";
      saveStatus.classList.remove("is-saving");
      saveStatus.classList.add("is-error");
    }
  }

  function scheduleSavedIndicator() {
    setSaveIndicator("saving");
    if (saveIndicatorTimer) clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(function () {
      setSaveIndicator("saved");
    }, 280);
  }

  function save() {
    try {
      persist();
      scheduleSavedIndicator();
    } catch (e) {
      setSaveIndicator("error");
    }
  }

  function lineValue(r) {
    return (parseFloat(r.qty) || 0) * (parseFloat(r.unitCost) || 0);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function reasonLabel(id) {
    var f = REASONS.find(function (x) {
      return x.id === id;
    });
    return f ? f.label : id;
  }

  function reasonOptionsHtml(selectedId) {
    return REASONS.map(function (r) {
      return (
        "<option value=\"" +
        escapeHtml(r.id) +
        "\"" +
        (r.id === selectedId ? " selected" : "") +
        ">" +
        escapeHtml(r.label) +
        "</option>"
      );
    }).join("");
  }

  function logMovement(item, oldQty, newQty, reason) {
    var o = parseFloat(oldQty) || 0;
    var n = parseFloat(newQty) || 0;
    if (Math.abs(o - n) < 1e-9) return;
    state.history.unshift({
      id: "h-" + Math.random().toString(36).slice(2, 11),
      itemId: item.id,
      itemName: String(item.name || item.sku || "Item").slice(0, 200),
      oldQty: o,
      newQty: n,
      delta: n - o,
      reason: reason || "manual_correction",
      ts: new Date().toISOString()
    });
    if (state.history.length > HISTORY_MAX) {
      state.history.length = HISTORY_MAX;
    }
  }

  function parseUpdatedMs(s) {
    if (!s) return 0;
    var t = Date.parse(String(s).replace(" ", "T"));
    return isNaN(t) ? 0 : t;
  }

  function isStaleRow(r) {
    var ms = parseUpdatedMs(r.updated);
    if (!ms) return false;
    return Date.now() - ms > STALE_DAYS * 86400000;
  }

  function normalizeKey(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  var HEADER_ALIASES = {
    "item name": "name",
    name: "name",
    product: "name",
    "product name": "name",
    sku: "sku",
    "item sku": "sku",
    code: "sku",
    "item code": "sku",
    quantity: "qty",
    qty: "qty",
    stock: "qty",
    "on hand": "qty",
    "unit cost": "unitCost",
    cost: "unitCost",
    "cost price": "unitCost",
    price: "unitCost",
    "min level": "minLevel",
    minimum: "minLevel",
    "minimum stock": "minLevel",
    "reorder level": "minLevel",
    "min qty": "minLevel",
    category: "category",
    supplier: "supplier",
    vendor: "supplier",
    "last updated": "updated"
  };

  function mapHeaderCell(h) {
    var k = normalizeKey(h);
    return HEADER_ALIASES[k] || null;
  }

  function sheetRowsToObjects(matrix) {
    if (!matrix || !matrix.length) {
      throw new Error("The file appears empty. Add a header row and at least one data row, or use the downloadable template.");
    }
    var headerRow = matrix[0];
    var colMap = [];
    for (var c = 0; c < headerRow.length; c++) {
      var mapped = mapHeaderCell(headerRow[c]);
      colMap[c] = mapped;
    }
    var hasName = colMap.indexOf("name") >= 0;
    var hasSku = colMap.indexOf("sku") >= 0;
    var hasQty = colMap.indexOf("qty") >= 0;
    if (!hasName && !hasSku) {
      throw new Error('Could not find an "Item Name" or "SKU" column. Check spelling or use the Excel template.');
    }
    if (!hasQty) {
      throw new Error('Could not find a "Quantity" column. Add a Quantity column or use the template.');
    }
    var out = [];
    for (var r = 1; r < matrix.length; r++) {
      var row = matrix[r];
      if (!row || !row.length) continue;
      var allEmpty = true;
      for (var j = 0; j < row.length; j++) {
        if (String(row[j] || "").trim() !== "") {
          allEmpty = false;
          break;
        }
      }
      if (allEmpty) continue;
      var obj = {};
      for (var c2 = 0; c2 < colMap.length; c2++) {
        var field = colMap[c2];
        if (!field) continue;
        var cell = row[c2];
        obj[field] = cell;
      }
      out.push(obj);
    }
    if (!out.length) {
      throw new Error("No data rows found below the header.");
    }
    return out;
  }

  function rowFromImportObj(obj) {
    return createRow({
      name: obj.name != null ? String(obj.name) : "",
      sku: obj.sku != null ? String(obj.sku) : "",
      qty: obj.qty,
      unitCost: obj.unitCost,
      minLevel: obj.minLevel,
      category: obj.category != null ? String(obj.category) : "",
      supplier: obj.supplier != null ? String(obj.supplier) : "",
      updated: obj.updated ? String(obj.updated) : nowIso()
    });
  }

  function coerceNumber(v, def) {
    if (v === "" || v === undefined || v === null) return def;
    var n = parseFloat(String(v).replace(/,/g, ""));
    return isNaN(n) ? def : n;
  }

  function normalizeImportedRow(raw) {
    return {
      name: raw.name != null ? String(raw.name).trim() : "",
      sku: raw.sku != null ? String(raw.sku).trim() : "",
      qty: coerceNumber(raw.qty, 0),
      unitCost: coerceNumber(raw.unitCost, 0),
      minLevel: coerceNumber(raw.minLevel, 0),
      category: raw.category != null ? String(raw.category).trim() : "",
      supplier: raw.supplier != null ? String(raw.supplier).trim() : "",
      updated: raw.updated ? String(raw.updated).trim() : nowIso()
    };
  }

  function parseCsvText(text) {
    var rows = [];
    var cur = [];
    var field = "";
    var i = 0;
    var inQ = false;
    while (i < text.length) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQ = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (ch === ",") {
        cur.push(field);
        field = "";
        i++;
        continue;
      }
      if (ch === "\r") {
        i++;
        continue;
      }
      if (ch === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    cur.push(field);
    rows.push(cur);
    return rows;
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(r.result);
      };
      r.onerror = function () {
        reject(new Error("Could not read file."));
      };
      r.readAsArrayBuffer(file);
    });
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(String(r.result || ""));
      };
      r.onerror = function () {
        reject(new Error("Could not read file."));
      };
      r.readAsText(file);
    });
  }

  function parseWorkbook(ab) {
    if (typeof XLSX === "undefined") {
      throw new Error("Spreadsheet library not loaded. Refresh the page and try again.");
    }
    var wb = XLSX.read(ab, { type: "array" });
    var name = wb.SheetNames[0];
    if (!name) throw new Error("No sheet found in workbook.");
    var ws = wb.Sheets[name];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
  }

  function buildExportMatrix() {
    var headers = [
      "Item Name",
      "SKU",
      "Quantity",
      "Unit Cost",
      "Min Level",
      "Category",
      "Supplier",
      "Last Updated"
    ];
    var m = [headers];
    state.rows.forEach(function (r) {
      m.push([
        r.name,
        r.sku,
        r.qty,
        r.unitCost,
        r.minLevel,
        r.category,
        r.supplier,
        r.updated
      ]);
    });
    return m;
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportXlsx() {
    if (typeof XLSX === "undefined") return;
    var m = buildExportMatrix();
    var ws = XLSX.utils.aoa_to_sheet(m);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    var out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      "vendora-inventory.xlsx"
    );
  }

  function exportCsv() {
    var m = buildExportMatrix();
    var lines = m.map(function (row) {
      return row
        .map(function (cell) {
          var s = String(cell == null ? "" : cell);
          if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        })
        .join(",");
    });
    downloadBlob(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), "vendora-inventory.csv");
  }

  function templateMatrix() {
    return [
      ["Item Name", "SKU", "Quantity", "Unit Cost", "Min Level", "Category", "Supplier", "Last Updated"],
      ["Sample coffee beans", "SKU-100", 12, 8.5, 20, "Beverage", "Roasters Inc", nowIso()]
    ];
  }

  function downloadTemplate() {
    if (typeof XLSX === "undefined") return;
    var m = templateMatrix();
    var ws = XLSX.utils.aoa_to_sheet(m);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    var out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      "vendora-inventory-template.xlsx"
    );
  }

  function findRowIndexByKeys(sku, name) {
    var sn = normalizeKey(sku);
    var nn = normalizeKey(name);
    if (sn) {
      for (var i = 0; i < state.rows.length; i++) {
        if (normalizeKey(state.rows[i].sku) === sn) return i;
      }
    }
    if (nn) {
      for (var j = 0; j < state.rows.length; j++) {
        if (normalizeKey(state.rows[j].name) === nn) return j;
      }
    }
    return -1;
  }

  function applyImportObjects(objs, mode) {
    var normalized = objs.map(normalizeImportedRow);
    var valid = normalized.filter(function (r) {
      return r.name || r.sku;
    });
    if (!valid.length) {
      throw new Error("No rows with an item name or SKU were found.");
    }
    if (mode === "replace") {
      state.rows = valid.map(function (r) {
        return createRow(r);
      });
      state.history.unshift({
        id: "h-" + Math.random().toString(36).slice(2, 11),
        itemId: "",
        itemName: "Inventory import (replaced all rows)",
        oldQty: 0,
        newQty: 0,
        delta: 0,
        reason: "manual_correction",
        ts: new Date().toISOString()
      });
      return;
    }
    for (var i = 0; i < valid.length; i++) {
      var imp = valid[i];
      var ix = findRowIndexByKeys(imp.sku, imp.name);
      if (ix >= 0) {
        var existing = state.rows[ix];
        var oldQ = parseFloat(existing.qty) || 0;
        existing.name = imp.name || existing.name;
        existing.sku = imp.sku || existing.sku;
        existing.unitCost = imp.unitCost;
        existing.minLevel = imp.minLevel;
        existing.category = imp.category;
        existing.supplier = imp.supplier;
        existing.qty = imp.qty;
        existing.updated = nowIso();
        logMovement(existing, oldQ, parseFloat(existing.qty) || 0, "manual_correction");
      } else {
        var nr = createRow(imp);
        state.rows.push(nr);
        logMovement(nr, 0, parseFloat(nr.qty) || 0, "received");
      }
    }
  }

  function getFilterState() {
    var q = (invSearch && invSearch.value) || "";
    var cat = (invFilterCategory && invFilterCategory.value) || "__all__";
    var sup = (invFilterSupplier && invFilterSupplier.value) || "__all__";
    return {
      q: q.trim().toLowerCase(),
      cat: cat,
      sup: sup
    };
  }

  function rowMatchesFilters(r, f) {
    if (f.q) {
      var blob = (String(r.name || "") + " " + String(r.sku || "")).toLowerCase();
      if (blob.indexOf(f.q) === -1) return false;
    }
    if (f.cat !== "__all__" && normalizeKey(r.category) !== normalizeKey(f.cat)) return false;
    if (f.sup !== "__all__" && normalizeKey(r.supplier) !== normalizeKey(f.sup)) return false;
    return true;
  }

  function getDisplayRows() {
    var f = getFilterState();
    var list = state.rows.filter(function (r) {
      return rowMatchesFilters(r, f);
    });
    var sort = (invSort && invSort.value) || "updated-desc";
    list.sort(function (a, b) {
      var va, vb;
      switch (sort) {
        case "updated-asc":
          return parseUpdatedMs(a.updated) - parseUpdatedMs(b.updated);
        case "updated-desc":
          return parseUpdatedMs(b.updated) - parseUpdatedMs(a.updated);
        case "qty-asc":
          return (parseFloat(a.qty) || 0) - (parseFloat(b.qty) || 0);
        case "qty-desc":
          return (parseFloat(b.qty) || 0) - (parseFloat(a.qty) || 0);
        case "value-asc":
          return lineValue(a) - lineValue(b);
        case "value-desc":
          return lineValue(b) - lineValue(a);
        case "name-asc":
        default:
          return String(a.name || a.sku || "").localeCompare(String(b.name || b.sku || ""));
      }
    });
    return list;
  }

  function populateFilterSelects() {
    var cats = {};
    var sups = {};
    state.rows.forEach(function (r) {
      if (String(r.category || "").trim()) cats[String(r.category).trim()] = true;
      if (String(r.supplier || "").trim()) sups[String(r.supplier).trim()] = true;
    });
    var catList = Object.keys(cats).sort();
    var supList = Object.keys(sups).sort();
    var prevC = invFilterCategory ? invFilterCategory.value : "__all__";
    var prevS = invFilterSupplier ? invFilterSupplier.value : "__all__";
    if (invFilterCategory) {
      invFilterCategory.innerHTML =
        "<option value=\"__all__\">All categories</option>" +
        catList
          .map(function (c) {
            return "<option value=\"" + escapeHtml(c) + "\">" + escapeHtml(c) + "</option>";
          })
          .join("");
      if ([].slice.call(invFilterCategory.options).some(function (o) { return o.value === prevC; })) {
        invFilterCategory.value = prevC;
      }
    }
    if (invFilterSupplier) {
      invFilterSupplier.innerHTML =
        "<option value=\"__all__\">All suppliers</option>" +
        supList
          .map(function (c) {
            return "<option value=\"" + escapeHtml(c) + "\">" + escapeHtml(c) + "</option>";
          })
          .join("");
      if ([].slice.call(invFilterSupplier.options).some(function (o) { return o.value === prevS; })) {
        invFilterSupplier.value = prevS;
      }
    }
  }

  function renderDashboard() {
    var skus = state.rows.length;
    var tq = 0;
    var tv = 0;
    var low = [];
    state.rows.forEach(function (r) {
      var q = parseFloat(r.qty) || 0;
      var min = parseFloat(r.minLevel) || 0;
      tq += q;
      tv += lineValue(r);
      if (min > 0 && q <= min) {
        low.push({ r: r, gap: min - q });
      }
    });
    var el = function (id, val) {
      var n = document.getElementById(id);
      if (n) n.textContent = val;
    };
    el("dashSkuCount", String(skus));
    el("dashTotalQty", tq.toFixed(2));
    el("dashTotalValue", tv.toFixed(2));
    el("dashLowStockCount", String(low.length));

    low.sort(function (a, b) {
      return b.gap - a.gap;
    });
    var low5 = low.slice(0, 5);
    var lowOl = document.getElementById("dashLowStockList");
    if (lowOl) {
      lowOl.innerHTML = low5.length
        ? low5
            .map(function (x) {
              return (
                "<li>" +
                escapeHtml(x.r.name || x.r.sku) +
                " — <span class=\"list-muted\">qty " +
                escapeHtml(String(x.r.qty)) +
                ", min " +
                escapeHtml(String(x.r.minLevel)) +
                "</span></li>"
              );
            })
            .join("")
        : "<li class=\"list-empty\">None</li>";
    }

    var byVal = state.rows
      .map(function (r) {
        return { r: r, v: lineValue(r) };
      })
      .sort(function (a, b) {
        return b.v - a.v;
      });
    var top5 = byVal.slice(0, 5);
    var topEl = document.getElementById("dashTopValueList");
    if (topEl) {
      topEl.innerHTML = top5.length
        ? top5
            .map(function (x) {
              return (
                "<li>" +
                escapeHtml(x.r.name || x.r.sku) +
                " — <strong>" +
                x.v.toFixed(2) +
                "</strong></li>"
              );
            })
            .join("")
        : "<li class=\"list-empty\">None</li>";
    }

    var catMap = {};
    var supMap = {};
    state.rows.forEach(function (r) {
      var v = lineValue(r);
      var c = String(r.category || "").trim() || "Uncategorized";
      var s = String(r.supplier || "").trim() || "Unspecified";
      catMap[c] = (catMap[c] || 0) + v;
      supMap[s] = (supMap[s] || 0) + v;
    });
    function breakdownHtml(map) {
      var entries = Object.keys(map)
        .map(function (k) {
          return { k: k, v: map[k] };
        })
        .sort(function (a, b) {
          return b.v - a.v;
        });
      return entries.length
        ? entries
            .map(function (e) {
              return (
                "<li><span class=\"bk-name\">" +
                escapeHtml(e.k) +
                "</span><span class=\"bk-val\">" +
                e.v.toFixed(2) +
                "</span></li>"
              );
            })
            .join("")
        : "<li class=\"list-empty\">No data</li>";
    }
    var cEl = document.getElementById("dashValueByCategory");
    var sEl = document.getElementById("dashValueBySupplier");
    if (cEl) cEl.innerHTML = breakdownHtml(catMap);
    if (sEl) sEl.innerHTML = breakdownHtml(supMap);

    var stale = state.rows.filter(isStaleRow);
    var staleEl = document.getElementById("dashStaleList");
    if (staleEl) {
      staleEl.innerHTML = stale.length
        ? stale
            .sort(function (a, b) {
              return parseUpdatedMs(a.updated) - parseUpdatedMs(b.updated);
            })
            .slice(0, 20)
            .map(function (r) {
              return (
                "<li>" +
                escapeHtml(r.name || r.sku) +
                " <span class=\"list-muted\">(" +
                escapeHtml(r.updated) +
                ")</span></li>"
              );
            })
            .join("")
        : "<li class=\"list-empty\">None in the last " + STALE_DAYS + " days threshold.</li>";
    }

    var rp = document.getElementById("reorderPanel");
    if (rp) {
      rp.innerHTML = low.length
        ? low
            .map(function (x) {
              var need = Math.max(0, Math.ceil(parseFloat(x.r.minLevel) - parseFloat(x.r.qty)));
              return (
                "<li>" +
                escapeHtml(x.r.name || x.r.sku) +
                " — suggest +" +
                need +
                " to reach min " +
                escapeHtml(String(x.r.minLevel)) +
                " (" +
                escapeHtml(String(x.r.supplier || "supplier?")) +
                ")</li>"
              );
            })
            .join("")
        : "<li class=\"list-empty\">No lines at or below minimum.</li>";
    }
  }

  function renderHistory() {
    if (!historyBody) return;
    if (!state.history.length) {
      historyBody.innerHTML = "";
      if (historyEmpty) historyEmpty.hidden = false;
      return;
    }
    if (historyEmpty) historyEmpty.hidden = true;
    historyBody.innerHTML = state.history
      .map(function (h) {
        var t = h.ts ? new Date(h.ts).toLocaleString() : "";
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(t) +
          "</td>" +
          "<td>" +
          escapeHtml(h.itemName) +
          "</td>" +
          "<td>" +
          escapeHtml(String(h.oldQty)) +
          "</td>" +
          "<td>" +
          escapeHtml(String(h.newQty)) +
          "</td>" +
          "<td>" +
          escapeHtml(String(h.delta)) +
          "</td>" +
          "<td>" +
          escapeHtml(reasonLabel(h.reason)) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function render() {
    populateFilterSelects();
    var displayRows = getDisplayRows();
    var f = getFilterState();
    var filtered =
      f.q || f.cat !== "__all__" || f.sup !== "__all__";
    if (filterHint) {
      if (filtered) {
        filterHint.hidden = false;
        filterHint.textContent =
          "Showing " +
          displayRows.length +
          " of " +
          state.rows.length +
          " items (filters active).";
      } else {
        filterHint.hidden = true;
        filterHint.textContent = "";
      }
    }

    var lowNames = [];
    tbody.innerHTML = displayRows
      .map(function (r) {
        var q = parseFloat(r.qty) || 0;
        var min = parseFloat(r.minLevel) || 0;
        var isLow = min > 0 && q <= min;
        if (isLow) lowNames.push(r.name || r.sku || "item");
        return (
          "<tr data-id=\"" +
          r.id +
          "\" class=\"" +
          (isLow ? "stock-low" : "") +
          "\">" +
          "<td><input type=\"text\" class=\"inv-in\" data-f=\"name\" value=\"" +
          escapeHtml(r.name) +
          "\" aria-label=\"Item name\"></td>" +
          "<td><input type=\"text\" class=\"inv-in\" data-f=\"sku\" value=\"" +
          escapeHtml(r.sku) +
          "\" aria-label=\"SKU\"></td>" +
          "<td><input type=\"number\" class=\"inv-in numeric-input-xs\" data-f=\"qty\" step=\"0.01\" value=\"" +
          escapeHtml(r.qty) +
          "\" aria-label=\"Quantity\"></td>" +
          "<td><input type=\"number\" class=\"inv-in numeric-input-xs\" data-f=\"unitCost\" step=\"0.01\" value=\"" +
          escapeHtml(r.unitCost) +
          "\" aria-label=\"Unit cost\"></td>" +
          "<td class=\"val-cell\">" +
          lineValue(r).toFixed(2) +
          "</td>" +
          "<td><input type=\"number\" class=\"inv-in numeric-input-xs\" data-f=\"minLevel\" step=\"1\" value=\"" +
          escapeHtml(r.minLevel) +
          "\" aria-label=\"Minimum stock\"></td>" +
          "<td><select class=\"inv-reason\" aria-label=\"Stock change reason\">" +
          reasonOptionsHtml("received") +
          "</select></td>" +
          "<td><button type=\"button\" class=\"btn btn-secondary btn-inline stock-in\" data-d=\"1\">+1</button> <button type=\"button\" class=\"btn btn-ghost btn-inline stock-in\" data-d=\"-1\">−1</button></td>" +
          "<td><input type=\"text\" class=\"inv-in\" data-f=\"category\" value=\"" +
          escapeHtml(r.category) +
          "\" aria-label=\"Category\"></td>" +
          "<td><input type=\"text\" class=\"inv-in\" data-f=\"supplier\" value=\"" +
          escapeHtml(r.supplier) +
          "\" aria-label=\"Supplier\"></td>" +
          "<td class=\"updated-cell\">" +
          escapeHtml(r.updated) +
          "</td>" +
          "<td><button type=\"button\" class=\"btn btn-danger btn-inline row-del\" aria-label=\"Remove row\">Remove</button></td>" +
          "</tr>"
        );
      })
      .join("");

    var tq = 0;
    var tv = 0;
    displayRows.forEach(function (r) {
      tq += parseFloat(r.qty) || 0;
      tv += lineValue(r);
    });
    totalSku.textContent = String(displayRows.length);
    totalQty.textContent = tq.toFixed(2);
    totalValue.textContent = tv.toFixed(2);

    var lowAll = [];
    state.rows.forEach(function (r) {
      var q = parseFloat(r.qty) || 0;
      var min = parseFloat(r.minLevel) || 0;
      if (min > 0 && q <= min) lowAll.push(r.name || r.sku || "item");
    });
    if (lowAll.length) {
      lowStockBanner.hidden = false;
      lowStockBanner.textContent =
        "Low stock: " + lowAll.slice(0, 8).join(", ") + (lowAll.length > 8 ? "…" : "");
    } else {
      lowStockBanner.hidden = true;
    }

    renderDashboard();
    renderHistory();
    save();
  }

  function findRow(id) {
    return state.rows.find(function (r) {
      return r.id === id;
    });
  }

  tbody.addEventListener("focusin", function (e) {
    var inp = e.target.closest(".inv-in");
    if (!inp || inp.getAttribute("data-f") !== "qty") return;
    var tr = inp.closest("tr");
    if (!tr) return;
    var row = findRow(tr.getAttribute("data-id"));
    if (!row) return;
    inp.setAttribute("data-prev-qty", String(parseFloat(row.qty) || 0));
  });

  tbody.addEventListener("change", function (e) {
    var inp = e.target.closest(".inv-in");
    if (!inp) return;
    var tr = inp.closest("tr");
    if (!tr) return;
    var row = findRow(tr.getAttribute("data-id"));
    if (!row) return;
    var f = inp.getAttribute("data-f");
    var oldQtyBeforeCommit = null;
    if (f === "qty") {
      var pq = inp.getAttribute("data-prev-qty");
      oldQtyBeforeCommit = pq != null && pq !== "" ? parseFloat(pq) : NaN;
      if (isNaN(oldQtyBeforeCommit)) oldQtyBeforeCommit = 0;
    }
    row[f] = inp.type === "number" ? inp.value : inp.value;
    row.updated = nowIso();
    if (f === "qty") {
      var nv = parseFloat(row.qty) || 0;
      logMovement(row, oldQtyBeforeCommit, nv, "manual_correction");
      inp.setAttribute("data-prev-qty", String(nv));
    }
    render();
  });

  tbody.addEventListener("input", function (e) {
    var inp = e.target.closest(".inv-in");
    if (!inp) return;
    var tr = inp.closest("tr");
    if (!tr) return;
    var row = findRow(tr.getAttribute("data-id"));
    if (!row) return;
    var f = inp.getAttribute("data-f");
    row[f] = inp.type === "number" ? inp.value : inp.value;
    row.updated = nowIso();
    var vc = tr.querySelector(".val-cell");
    if (vc) vc.textContent = lineValue(row).toFixed(2);
    var uc = tr.querySelector(".updated-cell");
    if (uc) uc.textContent = row.updated;
    tr.classList.toggle(
      "stock-low",
      (parseFloat(row.minLevel) || 0) > 0 && (parseFloat(row.qty) || 0) <= (parseFloat(row.minLevel) || 0)
    );
    save();

    var displayRows = getDisplayRows();
    var tq = 0;
    var tv = 0;
    displayRows.forEach(function (r) {
      tq += parseFloat(r.qty) || 0;
      tv += lineValue(r);
    });
    totalQty.textContent = tq.toFixed(2);
    totalValue.textContent = tv.toFixed(2);

    var low = [];
    state.rows.forEach(function (r) {
      if ((parseFloat(r.minLevel) || 0) > 0 && (parseFloat(r.qty) || 0) <= (parseFloat(r.minLevel) || 0)) {
        low.push(r.name || r.sku);
      }
    });
    if (low.length) {
      lowStockBanner.hidden = false;
      lowStockBanner.textContent = "Low stock: " + low.slice(0, 8).join(", ");
    } else lowStockBanner.hidden = true;
  });

  tbody.addEventListener("click", function (e) {
    var del = e.target.closest(".row-del");
    if (del) {
      var tr = del.closest("tr");
      if (!tr) return;
      if (state.rows.length <= 1) return;
      state.rows = state.rows.filter(function (r) {
        return r.id !== tr.getAttribute("data-id");
      });
      render();
      return;
    }
    var si = e.target.closest(".stock-in");
    if (si) {
      var tr2 = si.closest("tr");
      if (!tr2) return;
      var row = findRow(tr2.getAttribute("data-id"));
      if (!row) return;
      var d = parseFloat(si.getAttribute("data-d")) || 0;
      var sel = tr2.querySelector(".inv-reason");
      var rid = sel && sel.value ? sel.value : d > 0 ? "received" : "sold";
      var oldQ = parseFloat(row.qty) || 0;
      row.qty = Math.max(0, oldQ + d);
      row.updated = nowIso();
      logMovement(row, oldQ, parseFloat(row.qty) || 0, rid);
      render();
    }
  });

  addRowBtn.addEventListener("click", function () {
    state.rows.push(createRow({}));
    render();
  });

  [invSearch, invFilterCategory, invFilterSupplier, invSort].forEach(function (el) {
    if (!el) return;
    el.addEventListener("change", function () {
      render();
    });
    el.addEventListener("input", function () {
      if (el === invSearch) render();
    });
  });

  document.querySelectorAll(".dash-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var panel = tab.getAttribute("data-panel");
      document.querySelectorAll(".dash-tab").forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".dash-panel").forEach(function (p) {
        var id = p.id.replace("panel-", "");
        var show = id === panel;
        p.classList.toggle("is-hidden", !show);
        p.hidden = !show;
      });
    });
  });

  btnDownloadTemplate.addEventListener("click", downloadTemplate);
  btnExportXlsx.addEventListener("click", exportXlsx);
  btnExportCsv.addEventListener("click", exportCsv);

  exportJsonHidden.addEventListener("click", function () {
    var blob = new Blob([JSON.stringify({ version: 2, rows: state.rows, history: state.history }, null, 2)], {
      type: "application/json"
    });
    downloadBlob(blob, "vendora-inventory-backup.json");
  });

  importJsonHidden.addEventListener("change", function () {
    var f = importJsonHidden.files && importJsonHidden.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data && Array.isArray(data.rows) && data.rows.length) {
          state.rows = data.rows.map(function (x) {
            return createRow(x);
          });
          state.history = Array.isArray(data.history) ? data.history : [];
          render();
        }
      } catch (err) {}
      importJsonHidden.value = "";
    };
    reader.readAsText(f);
  });

  btnClearData.addEventListener("click", function () {
    if (
      !confirm(
        "Delete all inventory and movement history from this browser? This cannot be undone. Export Excel or CSV first if you need a backup."
      )
    ) {
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_V1);
    } catch (e) {}
    state.rows = [createRow({})];
    state.history = [];
    render();
  });

  btnPrepareReorder.addEventListener("click", function () {
    var lines = [];
    state.rows.forEach(function (r) {
      var q = parseFloat(r.qty) || 0;
      var min = parseFloat(r.minLevel) || 0;
      if (min > 0 && q <= min) {
        var need = Math.max(0, Math.ceil(min - q));
        lines.push(
          (r.name || r.sku || "Item") +
            " — order ~" +
            need +
            " (min " +
            min +
            ", on hand " +
            q +
            ") — " +
            (r.supplier || "supplier TBD") +
            " — SKU: " +
            (r.sku || "n/a")
        );
      }
    });
    var text =
      "Vendora reorder draft — " +
      new Date().toLocaleString() +
      "\n\n" +
      (lines.length ? lines.join("\n") : "No low-stock lines.");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          alert("Reorder list copied to clipboard.");
        },
        function () {
          prompt("Copy this reorder list:", text);
        }
      );
    } else {
      prompt("Copy this reorder list:", text);
    }
  });

  importFileIo.addEventListener("change", function () {
    if (importError) {
      importError.hidden = true;
      importError.textContent = "";
    }
    var file = importFileIo.files && importFileIo.files[0];
    if (!file) return;
    var name = file.name.toLowerCase();
    var mode = importMode && importMode.value === "replace" ? "replace" : "merge";

    function fail(msg) {
      if (importError) {
        importError.hidden = false;
        importError.textContent = msg;
      }
      importFileIo.value = "";
    }

    if (name.endsWith(".csv")) {
      readFileAsText(file).then(
        function (text) {
          try {
            var matrix = parseCsvText(text.replace(/^\uFEFF/, ""));
            var objs = sheetRowsToObjects(matrix).map(function (raw) {
              return normalizeImportedRow(raw);
            });
            applyImportObjects(objs, mode);
            render();
          } catch (err) {
            fail(err.message || String(err));
          }
          importFileIo.value = "";
        },
        function () {
          fail("Could not read file.");
          importFileIo.value = "";
        }
      );
      return;
    }

    readFileAsArrayBuffer(file).then(
      function (ab) {
        try {
          var matrix = parseWorkbook(ab);
          var objs = sheetRowsToObjects(matrix).map(function (raw) {
            return normalizeImportedRow(raw);
          });
          applyImportObjects(objs, mode);
          render();
        } catch (err) {
          fail(err.message || String(err));
        }
        importFileIo.value = "";
      },
      function () {
        fail("Could not read file.");
        importFileIo.value = "";
      }
    );
  });

  load();
  render();
  setSaveIndicator("saved");
})();
