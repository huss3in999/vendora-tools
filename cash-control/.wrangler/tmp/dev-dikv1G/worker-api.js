var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// backend/worker-api.js
var WALLET_BY_TYPE = {
  cash_sale: "daily_cash",
  benefitpay_sale: "benefitpay",
  expense: "daily_cash",
  cash_taken_by_owner: "daily_cash",
  cash_added_by_owner: "daily_cash",
  closing_count: "daily_cash",
  toy_collection: "toys_monthly",
  toy_collected_by_owner: "toys_monthly",
  correction: "daily_cash"
};
var SESSION_TTL_MS = 12 * 60 * 60 * 1e3;
var worker_api_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "Content-Type": "text/plain" }
      });
    }
    return serveStatic(request, env);
  }
};
async function serveStatic(request, env) {
  const url = new URL(request.url);
  const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const response = await env.ASSETS.fetch(new URL(assetPath, request.url));
  if (response.status !== 404) return response;
  return env.ASSETS.fetch(new URL("/index.html", request.url));
}
__name(serveStatic, "serveStatic");
async function handleApi(request, env, url) {
  const method = request.method;
  const path = url.pathname;
  try {
    if (method === "POST" && path === "/api/login") {
      return json(await login(request, env));
    }
    const session = await getSession(request, env);
    if (!session) return json({ error: "Unauthorized" }, 401);
    if (method === "GET" && path === "/api/dashboard/worker") {
      if (session.role !== "worker" && session.role !== "owner") {
        return json({ error: "Forbidden" }, 403);
      }
      return json(await getWorkerDashboard(env, session));
    }
    if (method === "GET" && path === "/api/dashboard/owner") {
      requireRole(session, "owner");
      return json(await getOwnerDashboard(env, session));
    }
    if (method === "GET" && path === "/api/transactions") {
      return json(await listTransactions(env, session, url.searchParams));
    }
    if (method === "POST" && path === "/api/transactions") {
      return json(await createTransaction(request, env, session));
    }
    const updateMatch = path.match(/^\/api\/transactions\/(\d+)$/);
    if (method === "PUT" && updateMatch) {
      requireRole(session, "owner");
      return json(await updateTransaction(request, env, session, updateMatch[1]));
    }
    const voidMatch = path.match(/^\/api\/transactions\/(\d+)\/void$/);
    if (method === "POST" && voidMatch) {
      requireRole(session, "owner");
      return json(await voidTransaction(request, env, session, voidMatch[1]));
    }
    const deleteMatch = path.match(/^\/api\/transactions\/(\d+)$/);
    if (method === "DELETE" && deleteMatch) {
      requireRole(session, "owner");
      return json(await deleteTransaction(env, session, deleteMatch[1]));
    }
    if (method === "POST" && path === "/api/closing") {
      return json(await closeDay(request, env, session));
    }
    if (method === "GET" && path === "/api/toys/month") {
      return json(await getToysMonth(env, session));
    }
    if (method === "POST" && path === "/api/toys/collect") {
      requireRole(session, "owner");
      return json(await collectToys(request, env, session));
    }
    if (method === "GET" && path === "/api/export.csv") {
      requireRole(session, "owner");
      return exportCsv(env, session, url.searchParams);
    }
    if (method === "GET" && path === "/api/settings") {
      requireRole(session, "owner");
      return json(await getSettings(env, session));
    }
    if (method === "PUT" && path === "/api/settings") {
      requireRole(session, "owner");
      return json(await updateSettings(request, env, session));
    }
    if (method === "DELETE" && path === "/api/test-data") {
      requireRole(session, "owner");
      return json(await deleteAllTestData(env));
    }
    if (method === "POST" && path === "/api/transactions/bulk-void") {
      requireRole(session, "owner");
      return json(await bulkVoidTransactions(request, env, session));
    }
    if (method === "POST" && path === "/api/transactions/bulk-delete") {
      requireRole(session, "owner");
      return json(await bulkDeleteTransactions(request, env, session));
    }
    if (method === "POST" && path === "/api/opening-cash") {
      requireRole(session, "owner");
      return json(await setOpeningCash(request, env, session));
    }
    return json({ error: "Not found" }, 404);
  } catch (err) {
    const status = err.status || 500;
    return json({ error: err.message || "Server error" }, status);
  }
}
__name(handleApi, "handleApi");
async function login(request, env) {
  const { pin, role: requestedRole } = await request.json();
  if (!pin) throw httpError(400, "PIN required");
  const pins = await getPinSettings(env);
  if (requestedRole === "worker" && !pins.worker_access_enabled) {
    throw httpError(403, "Worker access is currently disabled. Please contact owner.");
  }
  if (pin !== pins.owner_pin && pin !== pins.worker_pin) {
    throw httpError(401, "Invalid PIN");
  }
  if (pins.owner_pin === pins.worker_pin && pin === pins.owner_pin) {
    if (requestedRole === "worker") {
      if (!pins.worker_access_enabled) {
        throw httpError(403, "Worker access is currently disabled. Please contact owner.");
      }
      const token3 = await createSessionToken({ userId: 2, role: "worker", name: "Worker" }, env);
      return { token: token3, role: "worker", name: "Worker" };
    }
    const token2 = await createSessionToken({ userId: 1, role: "owner", name: "Owner" }, env);
    return { token: token2, role: "owner", name: "Owner" };
  }
  if (pin === pins.owner_pin) {
    const token2 = await createSessionToken({ userId: 1, role: "owner", name: "Owner" }, env);
    return { token: token2, role: "owner", name: "Owner" };
  }
  if (!pins.worker_access_enabled) {
    throw httpError(403, "Worker access is currently disabled. Please contact owner.");
  }
  const token = await createSessionToken({ userId: 2, role: "worker", name: "Worker" }, env);
  return { token, role: "worker", name: "Worker" };
}
__name(login, "login");
async function createSessionToken(payload, env) {
  const secret = env.SESSION_SECRET || "dev-secret-change-me";
  const exp = Date.now() + SESSION_TTL_MS;
  const data = JSON.stringify({ ...payload, exp });
  const sig = await hmacSign(data, secret);
  return btoa(JSON.stringify({ data, sig }));
}
__name(createSessionToken, "createSessionToken");
async function getSession(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const secret = env.SESSION_SECRET || "dev-secret-change-me";
  try {
    const { data, sig } = JSON.parse(atob(auth.slice(7)));
    const expected = await hmacSign(data, secret);
    if (sig !== expected) return null;
    const session = JSON.parse(data);
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
__name(getSession, "getSession");
function requireRole(session, role) {
  if (session.role !== role) throw httpError(403, "Owner access required");
}
__name(requireRole, "requireRole");
async function hmacSign(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSign, "hmacSign");
async function getSetting(env, key) {
  const row = await env.DB.prepare("SELECT value FROM app_settings WHERE key = ?").bind(key).first();
  return row?.value ?? null;
}
__name(getSetting, "getSetting");
async function setSetting(env, key, value) {
  await env.DB.prepare(`
    INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).bind(key, String(value)).run();
}
__name(setSetting, "setSetting");
async function getPinSettings(env) {
  const dbOwner = await getSetting(env, "owner_pin");
  const dbWorker = await getSetting(env, "worker_pin");
  const workerAccess = await getSetting(env, "worker_access_enabled");
  const legacyWorkerLogin = await getSetting(env, "worker_login_enabled");
  const workerAccessEnabled = workerAccess ?? legacyWorkerLogin;
  return {
    owner_pin: dbOwner || env.OWNER_PIN || "1111",
    worker_pin: dbWorker || env.WORKER_PIN || "1111",
    worker_access_enabled: workerAccessEnabled !== "0"
  };
}
__name(getPinSettings, "getPinSettings");
async function getSettings(env, session = null) {
  const testRow = await getSetting(env, "test_mode");
  const pins = await getPinSettings(env);
  const result = {
    test_mode: testRow === "1",
    worker_access_enabled: pins.worker_access_enabled,
    worker_login_enabled: pins.worker_access_enabled,
    pins_configured: !!await getSetting(env, "owner_pin") || !!await getSetting(env, "worker_pin")
  };
  if (session?.role === "owner") {
    result.worker_access = pins.worker_access_enabled ? "enabled" : "disabled";
  }
  return result;
}
__name(getSettings, "getSettings");
async function updateSettings(request, env, session) {
  const body = await request.json();
  const pins = await getPinSettings(env);
  if (typeof body.test_mode === "boolean") {
    await setSetting(env, "test_mode", body.test_mode ? "1" : "0");
  }
  const workerAccess = typeof body.worker_access_enabled === "boolean" ? body.worker_access_enabled : body.worker_login_enabled;
  if (typeof workerAccess === "boolean") {
    await setSetting(env, "worker_access_enabled", workerAccess ? "1" : "0");
  }
  if (body.new_worker_pin != null) {
    const wp = String(body.new_worker_pin).trim();
    if (wp.length < 4) throw httpError(400, "Worker PIN must be at least 4 characters");
    await setSetting(env, "worker_pin", wp);
  }
  if (body.new_owner_pin != null) {
    const op = String(body.new_owner_pin).trim();
    if (op.length < 4) throw httpError(400, "Owner PIN must be at least 4 characters");
    if (!body.current_owner_pin || body.current_owner_pin !== pins.owner_pin) {
      throw httpError(403, "Current owner PIN is wrong");
    }
    await setSetting(env, "owner_pin", op);
  }
  return getSettings(env, session);
}
__name(updateSettings, "updateSettings");
async function isTestMode(env) {
  const s = await getSettings(env);
  return s.test_mode;
}
__name(isTestMode, "isTestMode");
function todayStr() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(todayStr, "todayStr");
function monthStart() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
__name(monthStart, "monthStart");
function weekStart() {
  const d = /* @__PURE__ */ new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}
__name(weekStart, "weekStart");
function activeFilter(includeTest) {
  const statusClause = "status = 'active'";
  const testClause = includeTest ? "1=1" : "is_test = 0";
  return { statusClause, testClause };
}
__name(activeFilter, "activeFilter");
async function getOpeningCash(env, businessDate, includeTest) {
  const { testClause } = activeFilter(includeTest);
  const manual = await getSetting(env, `opening_cash_${businessDate}`);
  if (manual != null && manual !== "") return parseFloat(manual);
  const lastClose = await env.DB.prepare(`
    SELECT actual_cash, business_date FROM daily_closings
    WHERE business_date < ? AND status = 'active' AND ${testClause}
    ORDER BY business_date DESC LIMIT 1
  `).bind(businessDate).first();
  if (lastClose) {
    const afterClose = await env.DB.prepare(`
      SELECT type, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE wallet = 'daily_cash' AND status = 'active' AND ${testClause}
        AND business_date > ? AND business_date < ?
        AND type IN ('cash_sale', 'cash_added_by_owner', 'expense', 'cash_taken_by_owner', 'correction')
      GROUP BY type
    `).bind(lastClose.business_date, businessDate).all();
    const map = {};
    for (const row of afterClose.results) map[row.type] = row.total;
    return lastClose.actual_cash + (map.cash_sale || 0) + (map.cash_added_by_owner || 0) - (map.expense || 0) - (map.cash_taken_by_owner || 0) + (map.correction || 0);
  }
  return calcBalanceBeforeDate(env, businessDate, includeTest);
}
__name(getOpeningCash, "getOpeningCash");
async function calcBalanceBeforeDate(env, businessDate, includeTest) {
  const { testClause } = activeFilter(includeTest);
  const sums = await env.DB.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE wallet = 'daily_cash' AND status = 'active' AND ${testClause}
      AND business_date < ?
      AND type IN ('cash_sale', 'cash_added_by_owner', 'expense', 'cash_taken_by_owner', 'correction')
    GROUP BY type
  `).bind(businessDate).all();
  const map = {};
  for (const row of sums.results) map[row.type] = row.total;
  return (map.cash_sale || 0) + (map.cash_added_by_owner || 0) - (map.expense || 0) - (map.cash_taken_by_owner || 0) + (map.correction || 0);
}
__name(calcBalanceBeforeDate, "calcBalanceBeforeDate");
async function setOpeningCash(request, env, session) {
  const body = await request.json();
  const { amount, note } = body;
  if (amount == null || amount < 0) throw httpError(400, "Amount required");
  const today = todayStr();
  await setSetting(env, `opening_cash_${today}`, parseFloat(amount));
  return { success: true, opening_cash: parseFloat(amount), note: note || null };
}
__name(setOpeningCash, "setOpeningCash");
async function calcExpectedCash(env, businessDate, includeTest) {
  const { testClause } = activeFilter(includeTest);
  const opening = await getOpeningCash(env, businessDate, includeTest);
  const sums = await env.DB.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE wallet = 'daily_cash' AND status = 'active' AND ${testClause}
      AND business_date = ?
      AND type IN ('cash_sale', 'cash_added_by_owner', 'expense', 'cash_taken_by_owner', 'correction')
    GROUP BY type
  `).bind(businessDate).all();
  const map = {};
  for (const row of sums.results) map[row.type] = row.total;
  return opening + (map.cash_sale || 0) + (map.cash_added_by_owner || 0) - (map.expense || 0) - (map.cash_taken_by_owner || 0) + (map.correction || 0);
}
__name(calcExpectedCash, "calcExpectedCash");
async function sumByType(env, { businessDate, monthStart: ms, types, wallet, includeTest }) {
  const { testClause } = activeFilter(includeTest);
  let sql = `
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE status = 'active' AND ${testClause}
  `;
  const binds = [];
  if (wallet) {
    sql += " AND wallet = ?";
    binds.push(wallet);
  }
  if (types?.length) {
    sql += ` AND type IN (${types.map(() => "?").join(",")})`;
    binds.push(...types);
  }
  if (businessDate) {
    sql += " AND business_date = ?";
    binds.push(businessDate);
  }
  if (ms) {
    sql += " AND business_date >= ?";
    binds.push(ms);
  }
  const row = await env.DB.prepare(sql).bind(...binds).first();
  return row?.total || 0;
}
__name(sumByType, "sumByType");
async function calcToysBalance(env, includeTest) {
  const { testClause } = activeFilter(includeTest);
  const ms = monthStart();
  const collected = await env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE wallet = 'toys_monthly' AND status = 'active' AND ${testClause}
      AND type = 'toy_collection' AND business_date >= ?
  `).bind(ms).first();
  const taken = await env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE wallet = 'toys_monthly' AND status = 'active' AND ${testClause}
      AND type = 'toy_collected_by_owner' AND business_date >= ?
  `).bind(ms).first();
  return (collected?.total || 0) - (taken?.total || 0);
}
__name(calcToysBalance, "calcToysBalance");
async function getLastClosing(env, includeTest) {
  const { testClause } = activeFilter(includeTest);
  return env.DB.prepare(`
    SELECT * FROM daily_closings
    WHERE status = 'active' AND ${testClause}
    ORDER BY business_date DESC LIMIT 1
  `).first();
}
__name(getLastClosing, "getLastClosing");
async function getWorkerDashboard(env, session) {
  const includeTest = await isTestMode(env);
  const today = todayStr();
  const opening = await getOpeningCash(env, today, includeTest);
  const expected = await calcExpectedCash(env, today, includeTest);
  const lastClosing = await getLastClosing(env, includeTest);
  return {
    date: today,
    opening_cash: opening,
    cash_sales_today: await sumByType(env, { businessDate: today, types: ["cash_sale"], wallet: "daily_cash", includeTest }),
    benefitpay_today: await sumByType(env, { businessDate: today, types: ["benefitpay_sale"], wallet: "benefitpay", includeTest }),
    expenses_today: await sumByType(env, { businessDate: today, types: ["expense"], wallet: "daily_cash", includeTest }),
    cash_added_today: await sumByType(env, { businessDate: today, types: ["cash_added_by_owner"], wallet: "daily_cash", includeTest }),
    cash_taken_today: await sumByType(env, { businessDate: today, types: ["cash_taken_by_owner"], wallet: "daily_cash", includeTest }),
    corrections_today: await sumByType(env, { businessDate: today, types: ["correction"], wallet: "daily_cash", includeTest }),
    expected_cash_now: expected,
    last_closing_actual: lastClosing?.actual_cash ?? null,
    last_closing_date: lastClosing?.business_date ?? null,
    last_closing_difference: lastClosing?.difference ?? null,
    toys_month_balance: await calcToysBalance(env, includeTest),
    test_mode: includeTest
  };
}
__name(getWorkerDashboard, "getWorkerDashboard");
async function getOwnerDashboard(env, session) {
  const includeTest = await isTestMode(env);
  const today = todayStr();
  const ms = monthStart();
  const opening = await getOpeningCash(env, today, includeTest);
  const lastClosing = await getLastClosing(env, includeTest);
  const todayCashSales = await sumByType(env, { businessDate: today, types: ["cash_sale"], wallet: "daily_cash", includeTest });
  const todayBenefitPay = await sumByType(env, { businessDate: today, types: ["benefitpay_sale"], wallet: "benefitpay", includeTest });
  const todayExpenses = await sumByType(env, { businessDate: today, types: ["expense"], wallet: "daily_cash", includeTest });
  const cashAddedToday = await sumByType(env, { businessDate: today, types: ["cash_added_by_owner"], wallet: "daily_cash", includeTest });
  const cashTakenToday = await sumByType(env, { businessDate: today, types: ["cash_taken_by_owner"], wallet: "daily_cash", includeTest });
  const correctionsToday = await sumByType(env, { businessDate: today, types: ["correction"], wallet: "daily_cash", includeTest });
  const lastActualClosing = lastClosing?.actual_cash ?? opening;
  const expected = lastActualClosing + todayCashSales + cashAddedToday - todayExpenses - cashTakenToday + correctionsToday;
  return {
    expected_cash_with_worker: expected,
    opening_cash: lastActualClosing,
    today_cash_sales: todayCashSales,
    today_benefitpay: todayBenefitPay,
    today_expenses: todayExpenses,
    cash_added_today: cashAddedToday,
    cash_taken_today: cashTakenToday,
    corrections_today: correctionsToday,
    last_actual_closing: lastActualClosing,
    last_closing_date: lastClosing?.business_date ?? null,
    last_closing_difference: lastClosing?.difference ?? null,
    toys_month_balance: await calcToysBalance(env, includeTest),
    month_cash_sales: await sumByType(env, { monthStart: ms, types: ["cash_sale"], wallet: "daily_cash", includeTest }),
    month_benefitpay: await sumByType(env, { monthStart: ms, types: ["benefitpay_sale"], wallet: "benefitpay", includeTest }),
    month_expenses: await sumByType(env, { monthStart: ms, types: ["expense"], wallet: "daily_cash", includeTest }),
    test_mode: includeTest
  };
}
__name(getOwnerDashboard, "getOwnerDashboard");
async function createTransaction(request, env, session) {
  const body = await request.json();
  const { type, amount, category, note, source } = body;
  if (!type || amount == null || amount <= 0) {
    throw httpError(400, "Type and positive amount required");
  }
  if (!WALLET_BY_TYPE[type]) throw httpError(400, "Invalid transaction type");
  const ownerOnly = ["cash_taken_by_owner", "cash_added_by_owner", "toy_collected_by_owner", "correction"];
  if (ownerOnly.includes(type) && session.role !== "owner") {
    throw httpError(403, "Owner access required");
  }
  if (type === "expense" && !category) {
    throw httpError(400, "Category required for expenses");
  }
  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;
  const wallet = WALLET_BY_TYPE[type];
  const businessDate = todayStr();
  const cat = type === "toy_collection" ? source || category || "Machine" : category || null;
  const noteText = note || null;
  const result = await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, category, note, is_test, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(businessDate, type, wallet, parseFloat(amount), cat, noteText, isTest, session.name).run();
  return { id: result.meta.last_row_id, success: true };
}
__name(createTransaction, "createTransaction");
async function listTransactions(env, session, params) {
  const includeTest = params.get("show_test") === "1" || await isTestMode(env);
  const { testClause } = activeFilter(includeTest);
  let sql = `SELECT * FROM transactions WHERE ${testClause}`;
  const binds = [];
  const period = params.get("period");
  if (period === "today") {
    sql += " AND business_date = ?";
    binds.push(todayStr());
  } else if (period === "week") {
    sql += " AND business_date >= ?";
    binds.push(weekStart());
  } else if (period === "month") {
    sql += " AND business_date >= ?";
    binds.push(monthStart());
  }
  const wallet = params.get("wallet");
  if (wallet) {
    sql += " AND wallet = ?";
    binds.push(wallet);
  }
  const status = params.get("status");
  if (status) {
    sql += " AND status = ?";
    binds.push(status);
  } else {
    sql += " AND status != 'deleted'";
  }
  if (params.get("test_only") === "1") {
    sql += " AND is_test = 1";
  }
  sql += " ORDER BY created_at DESC LIMIT 500";
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return { transactions: rows.results };
}
__name(listTransactions, "listTransactions");
async function updateTransaction(request, env, session, id) {
  const body = await request.json();
  const { amount, category, note, edit_reason } = body;
  if (!edit_reason) throw httpError(400, "Edit reason required");
  const existing = await env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
  if (!existing) throw httpError(404, "Transaction not found");
  if (existing.status !== "active") throw httpError(400, "Cannot edit voided/deleted entry");
  await env.DB.prepare(`
    UPDATE transactions SET
      amount = ?, category = ?, note = ?,
      updated_by = ?, updated_at = datetime('now'), edit_reason = ?
    WHERE id = ?
  `).bind(
    parseFloat(amount ?? existing.amount),
    category ?? existing.category,
    note ?? existing.note,
    session.name,
    edit_reason,
    id
  ).run();
  return { success: true };
}
__name(updateTransaction, "updateTransaction");
async function voidTransaction(request, env, session, id) {
  const body = await request.json();
  const { void_reason } = body;
  if (!void_reason) throw httpError(400, "Void reason required");
  const existing = await env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
  if (!existing) throw httpError(404, "Transaction not found");
  if (existing.status !== "active") throw httpError(400, "Already voided or deleted");
  await env.DB.prepare(`
    UPDATE transactions SET status = 'voided', void_reason = ?, updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(void_reason, session.name, id).run();
  return { success: true };
}
__name(voidTransaction, "voidTransaction");
async function deleteTransaction(env, session, id) {
  const existing = await env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
  if (!existing) throw httpError(404, "Transaction not found");
  if (existing.is_test === 1) {
    await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
  } else {
    await env.DB.prepare(`
      UPDATE transactions SET status = 'deleted', updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(session.name, id).run();
  }
  return { success: true };
}
__name(deleteTransaction, "deleteTransaction");
async function closeDay(request, env, session) {
  const body = await request.json();
  const { actual_cash, note } = body;
  if (actual_cash == null || actual_cash < 0) {
    throw httpError(400, "Actual cash count required");
  }
  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;
  const today = todayStr();
  const existing = await env.DB.prepare(
    "SELECT id FROM daily_closings WHERE business_date = ? AND status = 'active'"
  ).bind(today).first();
  if (existing) throw httpError(400, "Day already closed. Contact owner to void closing.");
  const opening = await getOpeningCash(env, today, includeTest);
  const expected = await calcExpectedCash(env, today, includeTest);
  const actual = parseFloat(actual_cash);
  const difference = actual - expected;
  await env.DB.prepare(`
    INSERT INTO daily_closings (business_date, opening_cash, expected_cash, actual_cash, difference, note, is_test, closed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(today, opening, expected, actual, difference, note || null, isTest, session.name).run();
  await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, note, is_test, created_by, category)
    VALUES (?, 'closing_count', 'daily_cash', ?, ?, ?, ?, 'Day closing')
  `).bind(today, actual, note || `Closing diff: ${difference.toFixed(3)}`, isTest, session.name).run();
  return { success: true, expected_cash: expected, actual_cash: actual, difference };
}
__name(closeDay, "closeDay");
async function getToysMonth(env, session) {
  const includeTest = await isTestMode(env);
  const ms = monthStart();
  const { testClause } = activeFilter(includeTest);
  const balance = await calcToysBalance(env, includeTest);
  const history = await env.DB.prepare(`
    SELECT * FROM transactions
    WHERE wallet = 'toys_monthly' AND ${testClause} AND status != 'deleted'
      AND business_date >= ?
    ORDER BY created_at DESC LIMIT 100
  `).bind(ms).all();
  return { balance, history: history.results };
}
__name(getToysMonth, "getToysMonth");
async function collectToys(request, env, session) {
  const body = await request.json();
  const { amount, note } = body;
  if (!amount || amount <= 0) throw httpError(400, "Amount required");
  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;
  const result = await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, note, is_test, created_by, category)
    VALUES (?, 'toy_collected_by_owner', 'toys_monthly', ?, ?, ?, ?, 'Owner collection')
  `).bind(todayStr(), parseFloat(amount), note || null, isTest, session.name).run();
  return { id: result.meta.last_row_id, success: true };
}
__name(collectToys, "collectToys");
async function exportCsv(env, session, params) {
  const includeTest = params.get("show_test") === "1";
  const { testClause } = activeFilter(includeTest);
  const rows = await env.DB.prepare(`
    SELECT created_at, business_date, type, wallet, amount, category, note,
           created_by, status, is_test
    FROM transactions WHERE ${testClause} AND status != 'deleted'
    ORDER BY created_at DESC
  `).all();
  const header = "date/time,business date,type,wallet,amount,category,note,created by,status,is_test\n";
  const lines = rows.results.map(
    (r) => [
      r.created_at,
      r.business_date,
      r.type,
      r.wallet,
      r.amount,
      r.category,
      r.note,
      r.created_by,
      r.status,
      r.is_test ? "YES" : "NO"
    ].map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  return new Response(header + lines, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="cash-control-export-${todayStr()}.csv"`
    }
  });
}
__name(exportCsv, "exportCsv");
async function deleteAllTestData(env) {
  await env.DB.prepare("DELETE FROM transactions WHERE is_test = 1").run();
  await env.DB.prepare("DELETE FROM daily_closings WHERE is_test = 1").run();
  return { success: true, message: "All test data deleted" };
}
__name(deleteAllTestData, "deleteAllTestData");
async function bulkVoidTransactions(request, env, session) {
  const { ids, void_reason } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) throw httpError(400, "Select entries to void");
  if (!void_reason) throw httpError(400, "Void reason required");
  let count = 0;
  for (const id of ids) {
    const existing = await env.DB.prepare("SELECT status FROM transactions WHERE id = ?").bind(id).first();
    if (existing?.status === "active") {
      await env.DB.prepare(`
        UPDATE transactions SET status = 'voided', void_reason = ?, updated_by = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(void_reason, session.name, id).run();
      count++;
    }
  }
  return { success: true, voided: count };
}
__name(bulkVoidTransactions, "bulkVoidTransactions");
async function bulkDeleteTransactions(request, env, session) {
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) throw httpError(400, "Select entries to delete");
  let count = 0;
  for (const id of ids) {
    const existing = await env.DB.prepare("SELECT * FROM transactions WHERE id = ?").bind(id).first();
    if (!existing) continue;
    if (existing.is_test === 1) {
      await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
    } else {
      await env.DB.prepare(`
        UPDATE transactions SET status = 'deleted', updated_by = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(session.name, id).run();
    }
    count++;
  }
  return { success: true, deleted: count };
}
__name(bulkDeleteTransactions, "bulkDeleteTransactions");
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
__name(httpError, "httpError");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");

// C:/Users/Hussain Alyaqoob/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// C:/Users/Hussain Alyaqoob/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-7cX2IV/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_api_default;

// C:/Users/Hussain Alyaqoob/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-7cX2IV/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker-api.js.map
