/**
 * Cash Control API — Cloudflare Worker
 * Handles all API routes, auth, and serves frontend static assets.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Potato', 'Petrol', 'Tea', 'Food products', 'Drinks', 'Packaging',
  'Cleaning', 'Maintenance', 'Delivery', 'Other',
];

const WALLET_BY_TYPE = {
  cash_sale: 'daily_cash',
  benefitpay_sale: 'benefitpay',
  expense: 'daily_cash',
  cash_taken_by_owner: 'daily_cash',
  cash_added_by_owner: 'daily_cash',
  closing_count: 'daily_cash',
  toy_collection: 'toys_monthly',
  toy_collected_by_owner: 'toys_monthly',
  correction: 'daily_cash',
};

const DAILY_CASH_REMOVAL_TYPES = ['expense', 'cash_taken_by_owner'];
const TOYS_REMOVAL_TYPES = ['toy_collected_by_owner'];
const OVERDRAW_EPSILON = 0.0005;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function nowMs() {
  return Date.now();
}

async function timed(label, fn, timings = null) {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    const duration = nowMs() - start;
    if (timings) timings[label] = duration;
  }
}

function logApiPerf(endpoint, timings, totalStart) {
  const parts = Object.entries(timings).map(([key, ms]) => `${key}=${ms}ms`);
  console.log(`[API PERF] ${endpoint} ${parts.join(' ')} total=${nowMs() - totalStart}ms`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    // robots.txt
    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Static assets (SPA — all paths serve index.html except real files)
    return serveStatic(request, env);
  },
};

// ─── Static file serving ─────────────────────────────────────────────────────

async function serveStatic(request, env) {
  const url = new URL(request.url);
  const assetPath = url.pathname === '/' ? '/index.html' : url.pathname;

  // Try exact file first
  const response = await env.ASSETS.fetch(new URL(assetPath, request.url));
  if (response.status !== 404) return response;

  // SPA fallback
  return env.ASSETS.fetch(new URL('/index.html', request.url));
}

// ─── API router ──────────────────────────────────────────────────────────────

async function handleApi(request, env, url) {
  const method = request.method;
  const path = url.pathname;

  try {
    // Public
    if (method === 'POST' && path === '/api/login') {
      return json(await login(request, env));
    }

    // Auth required below
    const session = await getSession(request, env);
    if (!session) return json({ error: 'Unauthorized' }, 401);

    // Accountant sessions are strictly read-only, regardless of which endpoint
    // a caller attempts to invoke directly.
    if (session.role === 'accountant' && method !== 'GET') {
      return json({ error: 'Accountant access is read-only' }, 403);
    }

    // Worker dashboard
    if (method === 'GET' && path === '/api/dashboard/worker') {
      if (session.role !== 'worker' && session.role !== 'owner') {
        return json({ error: 'Forbidden' }, 403);
      }
      return json(await getWorkerDashboard(env, session));
    }

    // Owner dashboard
    if (method === 'GET' && path === '/api/dashboard/owner') {
      requireRole(session, 'owner');
      return json(await getOwnerDashboard(env, session));
    }

    // Transactions list
    if (method === 'GET' && path === '/api/transactions') {
      requireRole(session, 'owner');
      return json(await listTransactions(env, session, url.searchParams));
    }

    // Read-only activity list for worker/owner screens
    if (method === 'GET' && path === '/api/activity') {
      return json(await listActivity(env, session, url.searchParams));
    }

    // Create transaction
    if (method === 'POST' && path === '/api/transactions') {
      return json(await createTransaction(request, env, session));
    }

    // Update transaction (owner only)
    const updateMatch = path.match(/^\/api\/transactions\/(\d+)$/);
    if (method === 'PUT' && updateMatch) {
      requireRole(session, 'owner');
      return json(await updateTransaction(request, env, session, updateMatch[1]));
    }

    // Void transaction (owner only)
    const voidMatch = path.match(/^\/api\/transactions\/(\d+)\/void$/);
    if (method === 'POST' && voidMatch) {
      requireRole(session, 'owner');
      return json(await voidTransaction(request, env, session, voidMatch[1]));
    }

    // Hard delete transaction (owner only, test records preferred)
    const deleteMatch = path.match(/^\/api\/transactions\/(\d+)$/);
    if (method === 'DELETE' && deleteMatch) {
      requireRole(session, 'owner');
      return json(await deleteTransaction(env, session, deleteMatch[1]));
    }

    // Close day
    if (method === 'POST' && path === '/api/closing') {
      return json(await closeDay(request, env, session));
    }

    // Toys month summary
    if (method === 'GET' && path === '/api/toys/month') {
      return json(await getToysMonth(env, session));
    }

    // Expense options for worker forms and owner settings
    if (method === 'GET' && path === '/api/expense-options') {
      return json(await getExpenseOptions(env));
    }
    if (method === 'PUT' && path === '/api/expense-options') {
      requireRole(session, 'owner');
      return json(await updateExpenseOptions(request, env));
    }

    // Owner collects toys money
    if (method === 'POST' && path === '/api/toys/collect') {
      requireRole(session, 'owner');
      return json(await collectToys(request, env, session));
    }

    // Export CSV (owner only)
    if (method === 'GET' && path === '/api/export.csv') {
      requireRole(session, 'owner');
      return exportCsv(env, session, url.searchParams);
    }

    // Settings
    if (method === 'GET' && path === '/api/settings') {
      requireRole(session, 'owner');
      return json(await getSettings(env, session));
    }
    if (method === 'PUT' && path === '/api/settings') {
      requireRole(session, 'owner');
      return json(await updateSettings(request, env, session));
    }

    // Delete all test data (owner only)
    if (method === 'DELETE' && path === '/api/test-data') {
      requireRole(session, 'owner');
      return json(await deleteAllTestData(env));
    }

    // Bulk void (owner only)
    if (method === 'POST' && path === '/api/transactions/bulk-void') {
      requireRole(session, 'owner');
      return json(await bulkVoidTransactions(request, env, session));
    }

    // Bulk delete (owner only)
    if (method === 'POST' && path === '/api/transactions/bulk-delete') {
      requireRole(session, 'owner');
      return json(await bulkDeleteTransactions(request, env, session));
    }

    // Owner sets opening cash for today
    if (method === 'POST' && path === '/api/opening-cash') {
      requireRole(session, 'owner');
      return json(await setOpeningCash(request, env, session));
    }

    // Closings list (owner only)
    if (method === 'GET' && path === '/api/closings') {
      requireRole(session, 'owner');
      return json(await listClosings(env, session, url.searchParams));
    }

    // Void closing (owner only)
    const voidClosingMatch = path.match(/^\/api\/closings\/(\d+)\/void$/);
    if (method === 'POST' && voidClosingMatch) {
      requireRole(session, 'owner');
      return json(await voidClosing(request, env, session, voidClosingMatch[1]));
    }

    // Delete closing (owner only)
    const deleteClosingMatch = path.match(/^\/api\/closings\/(\d+)$/);
    if (method === 'DELETE' && deleteClosingMatch) {
      requireRole(session, 'owner');
      return json(await deleteClosing(env, session, deleteClosingMatch[1]));
    }

    // Owner purchase and master-data APIs. Workers are denied by each read guard.
    if (method === 'GET' && path === '/api/purchase-data') {
      requirePurchaseReader(session);
      return json(await getPurchaseData(env, session, url.searchParams));
    }
    if (method === 'GET' && path === '/api/owner-purchases') {
      requirePurchaseReader(session);
      return json(await listOwnerPurchases(env, session, url.searchParams));
    }
    if (method === 'POST' && path === '/api/owner-purchases') {
      requireRole(session, 'owner');
      return json(await createOwnerPurchase(request, env, session));
    }
    const purchaseMatch = path.match(/^\/api\/owner-purchases\/(\d+)$/);
    if (method === 'GET' && purchaseMatch) {
      requirePurchaseReader(session);
      return json(await getOwnerPurchase(env, purchaseMatch[1]));
    }
    if (method === 'PUT' && purchaseMatch) {
      requireRole(session, 'owner');
      return json(await updateOwnerPurchase(request, env, session, purchaseMatch[1]));
    }
    if (method === 'DELETE' && purchaseMatch) {
      requireRole(session, 'owner');
      return json(await deleteOwnerPurchase(env, session, purchaseMatch[1]));
    }
    const purchaseVoidMatch = path.match(/^\/api\/owner-purchases\/(\d+)\/void$/);
    if (method === 'POST' && purchaseVoidMatch) {
      requireRole(session, 'owner');
      return json(await voidOwnerPurchase(request, env, session, purchaseVoidMatch[1]));
    }
    const receiptMatch = path.match(/^\/api\/owner-purchases\/(\d+)\/receipt$/);
    if (method === 'POST' && receiptMatch) {
      requireRole(session, 'owner');
      return uploadPurchaseReceipt(request, env, receiptMatch[1]);
    }
    if (method === 'GET' && receiptMatch) {
      requirePurchaseReader(session);
      return getPurchaseReceipt(env, receiptMatch[1]);
    }
    if (method === 'DELETE' && receiptMatch) {
      requireRole(session, 'owner');
      return json(await deletePurchaseReceipt(env, receiptMatch[1]));
    }

    for (const resource of ['products', 'purchase-categories', 'suppliers']) {
      if (method === 'GET' && path === `/api/${resource}`) {
        requirePurchaseReader(session);
        return json(await listMasterData(env, resource, url.searchParams));
      }
      if (method === 'POST' && path === `/api/${resource}`) {
        requireRole(session, 'owner');
        return json(await createMasterData(request, env, resource));
      }
      const match = path.match(new RegExp(`^/api/${resource}/(\\d+)$`));
      if (method === 'PUT' && match) {
        requireRole(session, 'owner');
        return json(await updateMasterData(request, env, resource, match[1]));
      }
    }

    if (method === 'POST' && path === '/api/products/bulk') {
      requireRole(session, 'owner');
      return json(await createProductsBulk(request, env));
    }

    if (method === 'GET' && path === '/api/accountant/dashboard') {
      requireRole(session, 'accountant');
      return json(await getAccountantDashboard(env, url.searchParams));
    }
    if (method === 'GET' && path === '/api/accountant/expenses') {
      requireRole(session, 'accountant');
      return json(await getUnifiedExpenses(env, url.searchParams));
    }
    if (method === 'GET' && path === '/api/accountant/export.csv') {
      requireRole(session, 'accountant');
      return exportAccountantCsv(env, url.searchParams);
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    const status = err.status || 500;
    return json({ error: err.message || 'Server error' }, status);
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function login(request, env) {
  const totalStart = nowMs();
  const timings = {};
  const { pin, role: requestedRole } = await request.json();
  if (!pin) throw httpError(400, 'PIN required');
  if (!['owner', 'worker', 'accountant'].includes(requestedRole)) {
    throw httpError(400, 'Choose Owner, Worker or Accountant login');
  }

  const pins = await timed('pinSettingsQuery', () => getPinSettings(env), timings);

  if (requestedRole === 'worker' && !pins.worker_access_enabled) {
    throw httpError(403, 'Worker access is currently disabled. Please contact owner.');
  }
  if (requestedRole === 'accountant' && !pins.accountant_access_enabled) {
    throw httpError(403, 'Accountant access is currently disabled. Please contact owner.');
  }

  if (requestedRole === 'owner') {
    if (pin !== pins.owner_pin) throw httpError(401, 'Invalid owner PIN');
    const token = await timed('tokenCreate', () => createSessionToken({ userId: 1, role: 'owner', name: 'Owner' }, env), timings);
    logApiPerf('/api/login', timings, totalStart);
    return { token, role: 'owner', name: 'Owner' };
  }

  if (requestedRole === 'accountant') {
    if ([pins.owner_pin, pins.worker_pin].includes(pins.accountant_pin)) {
      throw httpError(403, 'Accountant PIN must be different from Owner and Worker PINs.');
    }
    if (pin !== pins.accountant_pin) throw httpError(401, 'Invalid accountant PIN');
    const token = await timed('tokenCreate', () => createSessionToken({ userId: 3, role: 'accountant', name: 'Accountant' }, env), timings);
    logApiPerf('/api/login', timings, totalStart);
    return { token, role: 'accountant', name: 'Accountant' };
  }

  if (pins.owner_pin === pins.worker_pin) {
    throw httpError(403, 'Owner PIN and Worker PIN cannot be the same. Login as owner and change the worker PIN.');
  }

  if (pin !== pins.worker_pin) {
    throw httpError(401, 'Invalid worker PIN');
  }

  const token = await timed('tokenCreate', () => createSessionToken({ userId: 2, role: 'worker', name: 'Worker' }, env), timings);
  logApiPerf('/api/login', timings, totalStart);
  return { token, role: 'worker', name: 'Worker' };
}

async function getAuthVersion(env, role) {
  const roleKey = role === 'worker' ? 'worker_auth_version' : role === 'accountant' ? 'accountant_auth_version' : 'owner_auth_version';
  const settings = await getSettingsMap(env, [roleKey, 'auth_version']);
  return settings[roleKey] || settings.auth_version || '1';
}

async function bumpAuthVersion(env, role) {
  const roleKey = role === 'worker' ? 'worker_auth_version' : role === 'accountant' ? 'accountant_auth_version' : 'owner_auth_version';
  await setSetting(env, roleKey, String(Date.now()));
}

async function createSessionToken(payload, env) {
  const secret = env.SESSION_SECRET || 'dev-secret-change-me';
  const exp = Date.now() + SESSION_TTL_MS;
  const authVersion = await getAuthVersion(env, payload.role);
  const data = JSON.stringify({ ...payload, exp, authVersion });
  const sig = await hmacSign(data, secret);
  return btoa(JSON.stringify({ data, sig }));
}

async function getSession(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const secret = env.SESSION_SECRET || 'dev-secret-change-me';
  try {
    const { data, sig } = JSON.parse(atob(auth.slice(7)));
    const expected = await hmacSign(data, secret);
    if (sig !== expected) return null;

    const session = JSON.parse(data);
    if (session.exp < Date.now()) return null;

    const pins = await getPinSettings(env);
    if (session.authVersion !== await getAuthVersion(env, session.role)) return null;
    if (session.role === 'worker' && !pins.worker_access_enabled) return null;
    if (session.role === 'accountant' && !pins.accountant_access_enabled) return null;

    return session;
  } catch {
    return null;
  }
}

function requireRole(session, role) {
  if (session.role !== role) throw httpError(403, `${role[0].toUpperCase()}${role.slice(1)} access required`);
}

function requirePurchaseReader(session) {
  if (!['owner', 'accountant'].includes(session.role)) throw httpError(403, 'Owner or Accountant access required');
}

async function hmacSign(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Settings ────────────────────────────────────────────────────────────────

async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM app_settings WHERE key = ?').bind(key).first();
  return row?.value ?? null;
}

async function getSettingsMap(env, keys) {
  if (!keys.length) return {};
  const placeholders = keys.map(() => '?').join(',');
  const rows = await env.DB.prepare(`
    SELECT key, value FROM app_settings WHERE key IN (${placeholders})
  `).bind(...keys).all();
  const map = {};
  for (const row of rows.results || []) map[row.key] = row.value;
  return map;
}

async function setSetting(env, key, value) {
  await env.DB.prepare(`
    INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).bind(key, String(value)).run();
}

async function getPinSettings(env) {
  const settings = await getSettingsMap(env, [
    'owner_pin',
    'worker_pin',
    'accountant_pin',
    'worker_access_enabled',
    'accountant_access_enabled',
    'worker_login_enabled',
    'notifications_enabled',
  ]);
  const dbOwner = settings.owner_pin;
  const dbWorker = settings.worker_pin;
  const dbAccountant = settings.accountant_pin;
  const workerAccess = settings.worker_access_enabled;
  const legacyWorkerLogin = settings.worker_login_enabled;
  const workerAccessEnabled = workerAccess ?? legacyWorkerLogin;
  return {
    owner_pin: dbOwner || env.OWNER_PIN || '1111',
    worker_pin: dbWorker || env.WORKER_PIN || '1111',
    accountant_pin: dbAccountant || env.ACCOUNTANT_PIN || 'CHANGE_ME_ACCOUNTANT',
    worker_access_enabled: workerAccessEnabled !== '0',
    accountant_access_enabled: settings.accountant_access_enabled !== '0',
  };
}

async function getSettings(env, session = null) {
  const settings = await getSettingsMap(env, [
    'test_mode',
    'owner_pin',
    'worker_pin',
    'accountant_pin',
    'worker_access_enabled',
    'accountant_access_enabled',
    'worker_login_enabled',
    'notifications_enabled',
    'business_day_start_hour',
  ]);
  const workerAccessEnabled = (settings.worker_access_enabled ?? settings.worker_login_enabled) !== '0';
  const result = {
    test_mode: settings.test_mode === '1',
    worker_access_enabled: workerAccessEnabled,
    worker_login_enabled: workerAccessEnabled,
    accountant_access_enabled: settings.accountant_access_enabled !== '0',
    notifications_enabled: settings.notifications_enabled === '1',
    business_day_start_hour: parseBusinessHour(settings.business_day_start_hour, 16),
    pins_configured: !!settings.owner_pin || !!settings.worker_pin || !!settings.accountant_pin,
  };
  // Owner-only admin info (never return actual PIN values)
  if (session?.role === 'owner') {
    result.worker_access = workerAccessEnabled ? 'enabled' : 'disabled';
  }
  return result;
}

async function updateSettings(request, env, session) {
  const body = await request.json();
  const pins = await getPinSettings(env);
  let expireOwnerSessions = false;
  let expireWorkerSessions = false;
  let expireAccountantSessions = false;
  const newWorkerPin = body.new_worker_pin != null ? String(body.new_worker_pin).trim() : null;
  const newOwnerPin = body.new_owner_pin != null ? String(body.new_owner_pin).trim() : null;
  const newAccountantPin = body.new_accountant_pin != null ? String(body.new_accountant_pin).trim() : null;
  const finalWorkerPin = newWorkerPin || pins.worker_pin;
  const finalOwnerPin = newOwnerPin || pins.owner_pin;
  const finalAccountantPin = newAccountantPin || pins.accountant_pin;

  if ((newWorkerPin || newOwnerPin || newAccountantPin) && new Set([finalOwnerPin, finalWorkerPin, finalAccountantPin]).size !== 3) {
    throw httpError(400, 'Owner, Worker and Accountant PINs must all be different.');
  }

  if (typeof body.test_mode === 'boolean') {
    await setSetting(env, 'test_mode', body.test_mode ? '1' : '0');
  }

  const workerAccess =
    typeof body.worker_access_enabled === 'boolean'
      ? body.worker_access_enabled
      : body.worker_login_enabled;
  if (typeof workerAccess === 'boolean') {
    await setSetting(env, 'worker_access_enabled', workerAccess ? '1' : '0');
    expireWorkerSessions = true;
  }
  if (typeof body.accountant_access_enabled === 'boolean') {
    await setSetting(env, 'accountant_access_enabled', body.accountant_access_enabled ? '1' : '0');
    expireAccountantSessions = true;
  }

  if (typeof body.notifications_enabled === 'boolean') {
    await setSetting(env, 'notifications_enabled', body.notifications_enabled ? '1' : '0');
  }

  if (body.business_day_start_hour != null) {
    const hour = parseBusinessHour(body.business_day_start_hour, null);
    if (hour == null) throw httpError(400, 'Business day start hour must be between 0 and 23');
    await setSetting(env, 'business_day_start_hour', String(hour));
  }

  // Change worker PIN (owner only)
  if (newWorkerPin != null) {
    if (newWorkerPin.length < 4) throw httpError(400, 'Worker PIN must be at least 4 characters');
    await setSetting(env, 'worker_pin', newWorkerPin);
    expireWorkerSessions = true;
  }

  // Change owner PIN — require current owner PIN
  if (newOwnerPin != null) {
    if (newOwnerPin.length < 4) throw httpError(400, 'Owner PIN must be at least 4 characters');
    if (!body.current_owner_pin || body.current_owner_pin !== pins.owner_pin) {
      throw httpError(403, 'Current owner PIN is wrong');
    }
    await setSetting(env, 'owner_pin', newOwnerPin);
    expireOwnerSessions = true;
  }

  if (newAccountantPin != null) {
    if (newAccountantPin.length < 4) throw httpError(400, 'Accountant PIN must be at least 4 characters');
    await setSetting(env, 'accountant_pin', newAccountantPin);
    expireAccountantSessions = true;
  }

  if (expireWorkerSessions) await bumpAuthVersion(env, 'worker');
  if (expireOwnerSessions) await bumpAuthVersion(env, 'owner');
  if (expireAccountantSessions) await bumpAuthVersion(env, 'accountant');

  return getSettings(env, session);
}

async function getExpenseOptions(env) {
  const saved = await getSetting(env, 'expense_options');
  if (!saved) return { options: EXPENSE_CATEGORIES };

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      const options = parsed
        .map((v) => String(v).trim())
        .filter(Boolean)
        .slice(0, 100);
      return { options: options.length ? options : EXPENSE_CATEGORIES };
    }
  } catch {}

  return { options: EXPENSE_CATEGORIES };
}

async function updateExpenseOptions(request, env) {
  const body = await request.json();
  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const seen = new Set();
  const options = [];

  for (const raw of rawOptions) {
    const option = String(raw).trim().slice(0, 80);
    const key = option.toLowerCase();
    if (!option || seen.has(key)) continue;
    seen.add(key);
    options.push(option);
    if (options.length >= 100) break;
  }

  if (!options.length) throw httpError(400, 'Add at least one expense option');
  await setSetting(env, 'expense_options', JSON.stringify(options));
  return { success: true, options };
}

async function isTestMode(env) {
  const s = await getSettings(env);
  return s.test_mode;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function parseBusinessHour(value, fallback = 16) {
  const n = Number.parseInt(value, 10);
  if (Number.isInteger(n) && n >= 0 && n <= 23) return n;
  return fallback;
}

async function getBusinessDayStartHour(env) {
  return parseBusinessHour(await getSetting(env, 'business_day_start_hour'), 16);
}

function bahrainNowParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const map = {};
  for (const part of parts) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
  };
}

function dateStringFromParts({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function previousLocalDate({ year, month, day }) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - 1);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

async function businessDateStr(env) {
  const startHour = await getBusinessDayStartHour(env);
  const parts = bahrainNowParts();
  const businessParts = parts.hour < startHour ? previousLocalDate(parts) : parts;
  return dateStringFromParts(businessParts);
}

function todayStr() {
  return dateStringFromParts(bahrainNowParts());
}

function monthStart(dateStr = null) {
  if (dateStr) return `${dateStr.slice(0, 7)}-01`;
  const parts = bahrainNowParts();
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-01`;
}

function yearStart(dateStr = null) {
  const year = dateStr ? dateStr.slice(0, 4) : String(bahrainNowParts().year);
  return `${year}-01-01`;
}

function previousDateStr(dateStr = null) {
  const parts = dateStr
    ? {
        year: parseInt(dateStr.slice(0, 4), 10),
        month: parseInt(dateStr.slice(5, 7), 10),
        day: parseInt(dateStr.slice(8, 10), 10),
      }
    : bahrainNowParts();
  return dateStringFromParts(previousLocalDate(parts));
}

// Mon start
function weekStart() {
  const p = bahrainNowParts();
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function quarterStart(dateStr = null) {
  const parts = dateStr
    ? { year: parseInt(dateStr.slice(0, 4), 10), month: parseInt(dateStr.slice(5, 7), 10) }
    : bahrainNowParts();
  const startMonth = Math.floor((parts.month - 1) / 3) * 3 + 1;
  return `${parts.year}-${String(startMonth).padStart(2, '0')}-01`;
}

// ─── Balance calculations ────────────────────────────────────────────────────

function activeFilter(includeTest) {
  const statusClause = "status = 'active'";
  const testClause = includeTest ? '1=1' : 'is_test = 0';
  return { statusClause, testClause };
}

async function getOpeningCash(env, businessDate, includeTest) {
  const { testClause } = activeFilter(includeTest);

  // Owner manual override for this date
  const manual = await getSetting(env, `opening_cash_${businessDate}`);
  if (manual != null && manual !== '') return parseFloat(manual);

  return calcBalanceBeforeDate(env, businessDate, includeTest);

  const lastClose = await env.DB.prepare(`
    SELECT actual_cash, business_date FROM daily_closings
    WHERE business_date < ? AND status = 'active' AND ${testClause}
    ORDER BY business_date DESC LIMIT 1
  `).bind(businessDate).first();

  if (lastClose) {
    // Start from last close, add all daily cash activity AFTER close date but BEFORE today
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

    return lastClose.actual_cash
      + (map.cash_sale || 0)
      + (map.cash_added_by_owner || 0)
      - (map.expense || 0)
      - (map.cash_taken_by_owner || 0)
      + (map.correction || 0);
  }

  // No closing record — sum ALL daily cash activity before today
  return calcBalanceBeforeDate(env, businessDate, includeTest);
}

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

  return (map.cash_sale || 0)
    + (map.cash_added_by_owner || 0)
    - (map.expense || 0)
    - (map.cash_taken_by_owner || 0)
    + (map.correction || 0);
}

async function setOpeningCash(request, env, session) {
  const body = await request.json();
  const { amount, note } = body;
  if (amount == null || amount < 0) throw httpError(400, 'Amount required');

  const today = await businessDateStr(env);
  await setSetting(env, `opening_cash_${today}`, parseFloat(amount));

  return { success: true, opening_cash: parseFloat(amount), note: note || null };
}

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

  return opening
    + (map.cash_sale || 0)
    + (map.cash_added_by_owner || 0)
    - (map.expense || 0)
    - (map.cash_taken_by_owner || 0)
    + (map.correction || 0);
}

async function sumByType(env, { businessDate, monthStart: ms, types, wallet, includeTest }) {
  const { testClause } = activeFilter(includeTest);
  let sql = `
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE status = 'active' AND ${testClause}
  `;
  const binds = [];

  if (wallet) { sql += ' AND wallet = ?'; binds.push(wallet); }
  if (types?.length) { sql += ` AND type IN (${types.map(() => '?').join(',')})`; binds.push(...types); }
  if (businessDate) { sql += ' AND business_date = ?'; binds.push(businessDate); }
  if (ms) { sql += ' AND business_date >= ?'; binds.push(ms); }

  const row = await env.DB.prepare(sql).bind(...binds).first();
  return row?.total || 0;
}

async function calcToysBalance(env, includeTest, businessDate = null) {
  const { testClause } = activeFilter(includeTest);

  const row = await env.DB.prepare(`
    SELECT COALESCE(SUM(
      CASE
        WHEN type = 'toy_collection' THEN amount
        WHEN type = 'toy_collected_by_owner' THEN -amount
        ELSE 0
      END
    ), 0) as balance
    FROM transactions
    WHERE wallet = 'toys_monthly' AND status = 'active' AND ${testClause}
      AND type IN ('toy_collection', 'toy_collected_by_owner')
  `).first();

  return row?.balance || 0;
}

function appendOverdrawReason(note, reason) {
  const reasonText = (reason || '').trim();
  if (!reasonText) return note || null;
  return note ? `${note}\nOverdraw reason: ${reasonText}` : `Overdraw reason: ${reasonText}`;
}

async function requireOverdrawReasonIfNeeded(env, {
  type,
  amount,
  businessDate,
  includeTest,
  overdrawReason,
}) {
  let available = null;
  let label = '';

  if (DAILY_CASH_REMOVAL_TYPES.includes(type)) {
    available = await calcExpectedCash(env, businessDate, includeTest);
    label = 'worker cash';
  } else if (TOYS_REMOVAL_TYPES.includes(type)) {
    available = await calcToysBalance(env, includeTest, businessDate);
    label = 'toys balance';
  } else {
    return;
  }

  if (amount <= available + OVERDRAW_EPSILON) return;
  if ((overdrawReason || '').trim()) return;

  throw httpError(
    409,
    `This is more than the available ${label} (${available.toFixed(3)} BD). Enter a reason if it was paid from POS or owner money.`,
  );
}

async function getTodaySums(env, businessDate, includeTest) {
  const { testClause } = activeFilter(includeTest);
  const rows = await env.DB.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE status = 'active' AND ${testClause}
      AND business_date = ?
      AND type IN ('cash_sale', 'benefitpay_sale', 'cash_added_by_owner', 'expense', 'cash_taken_by_owner', 'correction')
    GROUP BY type
  `).bind(businessDate).all();

  const map = {};
  for (const row of rows.results || []) map[row.type] = row.total;
  return {
    cash_sale: map.cash_sale || 0,
    benefitpay_sale: map.benefitpay_sale || 0,
    cash_added_by_owner: map.cash_added_by_owner || 0,
    expense: map.expense || 0,
    cash_taken_by_owner: map.cash_taken_by_owner || 0,
    correction: map.correction || 0,
  };
}

async function getLastClosing(env, includeTest) {
  const { testClause } = activeFilter(includeTest);
  return env.DB.prepare(`
    SELECT * FROM daily_closings
    WHERE status = 'active' AND ${testClause}
    ORDER BY business_date DESC LIMIT 1
  `).first();
}

async function getRecentActivity(env, includeTest, limit = 10) {
  const { testClause } = activeFilter(includeTest);
  const rows = await env.DB.prepare(`
    SELECT id, business_date, created_at, type, wallet, amount, category, note, created_by, is_test
    FROM transactions
    WHERE status = 'active' AND ${testClause}
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all();

  return rows.results || [];
}

function applyTransactionFilters(sql, binds, params, today) {
  const period = params.get('period');
  const dateFrom = params.get('date_from');
  const dateTo = params.get('date_to');

  if (dateFrom) {
    sql += ' AND business_date >= ?';
    binds.push(dateFrom);
  }

  if (dateTo) {
    sql += ' AND business_date <= ?';
    binds.push(dateTo);
  }

  if (!dateFrom && !dateTo) {
    if (period === 'today') {
      sql += ' AND business_date = ?';
      binds.push(today);
    } else if (period === 'yesterday') {
      sql += ' AND business_date = ?';
      binds.push(previousDateStr(today));
    } else if (period === 'week') {
      sql += ' AND business_date >= ?';
      binds.push(weekStart());
    } else if (period === 'month') {
      sql += ' AND business_date >= ?';
      binds.push(monthStart(today));
    } else if (period === 'quarter') {
      sql += ' AND business_date >= ?';
      binds.push(quarterStart(today));
    } else if (period === 'year') {
      sql += ' AND business_date >= ?';
      binds.push(yearStart(today));
    }
  }

  const wallet = params.get('wallet');
  if (wallet) {
    sql += ' AND wallet = ?';
    binds.push(wallet);
  }

  const type = params.get('type');
  if (type) {
    sql += ' AND type = ?';
    binds.push(type);
  }

  const q = (params.get('q') || '').trim();
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    sql += ` AND (
      lower(COALESCE(type, '')) LIKE ?
      OR lower(COALESCE(wallet, '')) LIKE ?
      OR lower(COALESCE(category, '')) LIKE ?
      OR lower(COALESCE(note, '')) LIKE ?
      OR lower(COALESCE(created_by, '')) LIKE ?
      OR business_date LIKE ?
      OR CAST(amount AS TEXT) LIKE ?
    )`;
    binds.push(like, like, like, like, like, `%${q}%`, `%${q}%`);
  }

  return sql;
}

async function transactionSummary(env, whereSql, binds) {
  const row = await env.DB.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN type IN ('expense', 'cash_taken_by_owner', 'toy_collected_by_owner') THEN amount ELSE 0 END), 0) as negative_total,
      COALESCE(SUM(CASE WHEN type NOT IN ('expense', 'cash_taken_by_owner', 'toy_collected_by_owner') THEN amount ELSE 0 END), 0) as positive_total,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense_total,
      COALESCE(SUM(CASE WHEN type = 'cash_sale' THEN amount ELSE 0 END), 0) as cash_sales_total,
      COALESCE(SUM(CASE WHEN type = 'benefitpay_sale' THEN amount ELSE 0 END), 0) as benefitpay_total,
      COALESCE(SUM(CASE WHEN type = 'cash_taken_by_owner' THEN amount ELSE 0 END), 0) as owner_taken_total,
      COALESCE(SUM(CASE WHEN type = 'cash_added_by_owner' THEN amount ELSE 0 END), 0) as owner_added_total,
      COALESCE(SUM(CASE WHEN type = 'correction' THEN amount ELSE 0 END), 0) as correction_total,
      COALESCE(SUM(CASE WHEN type = 'toy_collection' THEN amount ELSE 0 END), 0) as toys_added_total,
      COALESCE(SUM(CASE WHEN type = 'toy_collected_by_owner' THEN amount ELSE 0 END), 0) as toys_taken_total,
      COALESCE(SUM(CASE
        WHEN type IN ('expense', 'cash_taken_by_owner', 'toy_collected_by_owner') THEN -amount
        ELSE amount
      END), 0) as net_total
    FROM transactions
    ${whereSql}
  `).bind(...binds).first();

  const categoryRows = await env.DB.prepare(`
    SELECT COALESCE(category, 'Uncategorized') as category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM transactions
    ${whereSql} AND type = 'expense'
    GROUP BY COALESCE(category, 'Uncategorized')
    ORDER BY total DESC
    LIMIT 8
  `).bind(...binds).all();

  return { ...row, top_expense_categories: categoryRows.results || [] };
}

// ─── Dashboards ──────────────────────────────────────────────────────────────

async function getWorkerDashboard(env, session) {
  const totalStart = nowMs();
  const timings = {};
  const includeTest = await timed('settings', () => isTestMode(env), timings);
  const today = await businessDateStr(env);

  const [
    opening,
    lastClosing,
    todaySums,
    toysMonthBalance,
    monthExpenses,
    totalExpenses,
  ] = await Promise.all([
    timed('openingQuery', () => getOpeningCash(env, today, includeTest), timings),
    timed('closingQuery', () => getLastClosing(env, includeTest), timings),
    timed('todayTotalsQuery', () => getTodaySums(env, today, includeTest), timings),
    timed('toysQuery', () => calcToysBalance(env, includeTest, today), timings),
    timed('monthExpensesQuery', () => sumByType(env, { monthStart: monthStart(today), types: ['expense'], wallet: 'daily_cash', includeTest }), timings),
    timed('totalExpensesQuery', () => sumByType(env, { types: ['expense'], wallet: 'daily_cash', includeTest }), timings),
  ]);
  const expected = opening
    + todaySums.cash_sale
    + todaySums.cash_added_by_owner
    - todaySums.expense
    - todaySums.cash_taken_by_owner
    + todaySums.correction;

  logApiPerf('/api/dashboard/worker', timings, totalStart);

  return {
    date: today,
    opening_cash: opening,
    cash_sales_today: todaySums.cash_sale,
    benefitpay_today: todaySums.benefitpay_sale,
    expenses_today: todaySums.expense,
    cash_added_today: todaySums.cash_added_by_owner,
    cash_taken_today: todaySums.cash_taken_by_owner,
    corrections_today: todaySums.correction,
    expected_cash_now: expected,
    last_closing_actual: lastClosing?.actual_cash ?? null,
    last_closing_date: lastClosing?.business_date ?? null,
    last_closing_difference: lastClosing?.difference ?? null,
    toys_month_balance: toysMonthBalance,
    month_expenses: monthExpenses,
    total_expenses: totalExpenses,
    test_mode: includeTest,
  };
}

async function getOwnerDashboard(env, session) {
  const totalStart = nowMs();
  const timings = {};
  const includeTest = await timed('settings', () => isTestMode(env), timings);
  const today = await businessDateStr(env);
  const ms = monthStart(today);

  const [
    opening,
    lastClosing,
    todaySums,
    toysMonthBalance,
    monthCashSales,
    monthBenefitpay,
    monthExpenses,
    totalExpenses,
  ] = await Promise.all([
    timed('openingQuery', () => getOpeningCash(env, today, includeTest), timings),
    timed('closingQuery', () => getLastClosing(env, includeTest), timings),
    timed('todayTotalsQuery', () => getTodaySums(env, today, includeTest), timings),
    timed('toysQuery', () => calcToysBalance(env, includeTest, today), timings),
    timed('monthCashQuery', () => sumByType(env, { monthStart: ms, types: ['cash_sale'], wallet: 'daily_cash', includeTest }), timings),
    timed('monthBenefitpayQuery', () => sumByType(env, { monthStart: ms, types: ['benefitpay_sale'], wallet: 'benefitpay', includeTest }), timings),
    timed('monthExpensesQuery', () => sumByType(env, { monthStart: ms, types: ['expense'], wallet: 'daily_cash', includeTest }), timings),
    timed('totalExpensesQuery', () => sumByType(env, { types: ['expense'], wallet: 'daily_cash', includeTest }), timings),
  ]);
  const expected = opening
    + todaySums.cash_sale
    + todaySums.cash_added_by_owner
    - todaySums.expense
    - todaySums.cash_taken_by_owner
    + todaySums.correction;

  logApiPerf('/api/dashboard/owner', timings, totalStart);

  return {
    date: today,
    expected_cash_with_worker: expected,
    opening_cash: opening,
    previous_cash_balance: opening,
    today_cash_sales: todaySums.cash_sale,
    today_benefitpay: todaySums.benefitpay_sale,
    today_expenses: todaySums.expense,
    cash_added_today: todaySums.cash_added_by_owner,
    cash_taken_today: todaySums.cash_taken_by_owner,
    corrections_today: todaySums.correction,
    last_actual_closing: lastClosing?.actual_cash ?? null,
    last_closing_date: lastClosing?.business_date ?? null,
    last_closing_difference: lastClosing?.difference ?? null,
    toys_month_balance: toysMonthBalance,
    month_cash_sales: monthCashSales,
    month_benefitpay: monthBenefitpay,
    month_expenses: monthExpenses,
    total_expenses: totalExpenses,
    test_mode: includeTest,
  };
}

// ─── Transactions CRUD ───────────────────────────────────────────────────────

async function createTransaction(request, env, session) {
  const body = await request.json();
  const { type, amount, category, note, source, overdraw_reason } = body;
  const parsedAmount = parseFloat(amount);

  if (!type || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw httpError(400, 'Type and positive amount required');
  }

  if (!WALLET_BY_TYPE[type]) throw httpError(400, 'Invalid transaction type');

  // Corrections remain owner-only. Worker can record owner cash/toys movement as an audit entry.
  const ownerOnly = ['correction'];
  if (ownerOnly.includes(type) && session.role !== 'owner') {
    throw httpError(403, 'Owner access required');
  }

  if (type === 'expense' && !category) {
    throw httpError(400, 'Category required for expenses');
  }

  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;
  const wallet = WALLET_BY_TYPE[type];
  const businessDate = await businessDateStr(env);

  await requireOverdrawReasonIfNeeded(env, {
    type,
    amount: parsedAmount,
    businessDate,
    includeTest,
    overdrawReason: overdraw_reason,
  });

  // For toy_collection, source goes in category field
  const cat = type === 'toy_collection' ? (source || category || 'Machine') : (category || null);
  const noteText = appendOverdrawReason(note || null, overdraw_reason);

  const result = await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, category, note, is_test, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(businessDate, type, wallet, parsedAmount, cat, noteText, isTest, session.name).run();

  return { id: result.meta.last_row_id, success: true };
}

async function listTransactions(env, session, params) {
  const includeTest = params.get('show_test') === '1' || await isTestMode(env);
  const { testClause } = activeFilter(includeTest);

  let whereSql = `WHERE ${testClause}`;
  const binds = [];
  const today = await businessDateStr(env);
  whereSql = applyTransactionFilters(whereSql, binds, params, today);

  const status = params.get('status');
  if (status) { whereSql += ' AND status = ?'; binds.push(status); }
  else { whereSql += " AND status != 'deleted'"; }

  if (params.get('test_only') === '1') {
    whereSql += ' AND is_test = 1';
  }

  const limit = Math.min(Math.max(parseInt(params.get('limit') || '500', 10) || 500, 50), 1000);
  const summary = await transactionSummary(env, whereSql, binds);
  const sql = `SELECT * FROM transactions ${whereSql} ORDER BY created_at DESC LIMIT ?`;

  const rows = await env.DB.prepare(sql).bind(...binds, limit).all();
  return { transactions: rows.results, summary, limit };
}

async function listActivity(env, session, params) {
  const includeTest = params.get('show_test') === '1' || await isTestMode(env);
  const { testClause } = activeFilter(includeTest);
  const today = await businessDateStr(env);
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '300', 10) || 300, 20), 1000);

  let whereSql = `WHERE ${testClause} AND status = 'active'`;
  const binds = [];
  whereSql = applyTransactionFilters(whereSql, binds, params, today);

  const summary = await transactionSummary(env, whereSql, binds);
  const sql = `
    SELECT id, business_date, created_at, type, wallet, amount, category, note, created_by, is_test
    FROM transactions
    ${whereSql}
    ORDER BY created_at DESC LIMIT ?
  `;

  const rows = await env.DB.prepare(sql).bind(...binds, limit).all();
  return { period: params.get('period') || 'today', activity: rows.results || [], summary, limit };
}

async function updateTransaction(request, env, session, id) {
  const body = await request.json();
  const { amount, category, note, edit_reason } = body;

  if (!edit_reason) throw httpError(400, 'Edit reason required');

  const existing = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
  if (!existing) throw httpError(404, 'Transaction not found');
  if (existing.status !== 'active') throw httpError(400, 'Cannot edit voided/deleted entry');

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
    id,
  ).run();

  return { success: true };
}

async function voidTransaction(request, env, session, id) {
  const body = await request.json();
  const { void_reason } = body;
  if (!void_reason) throw httpError(400, 'Void reason required');

  const existing = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
  if (!existing) throw httpError(404, 'Transaction not found');
  if (existing.status !== 'active') throw httpError(400, 'Already voided or deleted');

  await env.DB.prepare(`
    UPDATE transactions SET status = 'voided', void_reason = ?, updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(void_reason, session.name, id).run();

  // If it's a closing count transaction, also void the corresponding daily closing
  if (existing.type === 'closing_count') {
    await env.DB.prepare(`
      UPDATE daily_closings SET status = 'voided', note = COALESCE(note || ' | ', '') || ? WHERE business_date = ? AND status = 'active'
    `).bind(`Voided: ${void_reason}`, existing.business_date).run();
  }

  return { success: true };
}

async function deleteTransaction(env, session, id) {
  const existing = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
  if (!existing) throw httpError(404, 'Transaction not found');

  // Hard delete — mark as deleted (soft delete in DB) or actually DELETE for test records
  if (existing.is_test === 1) {
    await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
    if (existing.type === 'closing_count') {
      await env.DB.prepare('DELETE FROM daily_closings WHERE business_date = ?').bind(existing.business_date).run();
    }
  } else {
    await env.DB.prepare(`
      UPDATE transactions SET status = 'deleted', updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(session.name, id).run();
    if (existing.type === 'closing_count') {
      await env.DB.prepare(`
        UPDATE daily_closings SET status = 'deleted' WHERE business_date = ? AND status = 'active'
      `).bind(existing.business_date).run();
    }
  }

  return { success: true };
}

// ─── Close day ───────────────────────────────────────────────────────────────

async function closeDay(request, env, session) {
  const body = await request.json();
  const { actual_cash, note } = body;

  if (actual_cash == null || actual_cash < 0) {
    throw httpError(400, 'Actual cash count required');
  }

  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;
  const today = await businessDateStr(env);

  // Check if already closed today
  const existing = await env.DB.prepare(
    "SELECT id FROM daily_closings WHERE business_date = ? AND status = 'active'",
  ).bind(today).first();

  if (existing) throw httpError(400, 'Day already closed. Contact owner to void closing.');

  const opening = await getOpeningCash(env, today, includeTest);
  const expected = await calcExpectedCash(env, today, includeTest);
  const actual = parseFloat(actual_cash);
  const difference = actual - expected;

  await env.DB.prepare(`
    INSERT INTO daily_closings (business_date, opening_cash, expected_cash, actual_cash, difference, note, is_test, closed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(today, opening, expected, actual, difference, note || null, isTest, session.name).run();

  // Record closing_count transaction for audit trail
  await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, note, is_test, created_by, category)
    VALUES (?, 'closing_count', 'daily_cash', ?, ?, ?, ?, 'Day closing')
  `).bind(today, actual, note || `Closing diff: ${difference.toFixed(3)}`, isTest, session.name).run();

  return { success: true, expected_cash: expected, actual_cash: actual, difference };
}

async function listClosings(env, session, params) {
  const includeTest = params.get('show_test') === '1' || await isTestMode(env);
  const { testClause } = activeFilter(includeTest);

  let sql = `SELECT * FROM daily_closings WHERE ${testClause}`;
  const binds = [];

  const status = params.get('status');
  if (status) {
    sql += ' AND status = ?';
    binds.push(status);
  } else {
    sql += " AND status != 'deleted'";
  }

  sql += ' ORDER BY business_date DESC LIMIT 500';

  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return { closings: rows.results };
}

async function voidClosing(request, env, session, id) {
  const body = await request.json();
  const { void_reason } = body;
  if (!void_reason) throw httpError(400, 'Void reason required');

  const existing = await env.DB.prepare('SELECT * FROM daily_closings WHERE id = ?').bind(id).first();
  if (!existing) throw httpError(404, 'Closing record not found');
  if (existing.status !== 'active') throw httpError(400, 'Already voided or deleted');

  // Void daily closing record
  await env.DB.prepare(`
    UPDATE daily_closings SET status = 'voided', note = COALESCE(note || ' | ', '') || ?
    WHERE id = ?
  `).bind(`Voided: ${void_reason}`, id).run();

  // Also void the corresponding transaction in transactions table
  await env.DB.prepare(`
    UPDATE transactions SET status = 'voided', void_reason = ?, updated_by = ?, updated_at = datetime('now')
    WHERE business_date = ? AND type = 'closing_count' AND status = 'active'
  `).bind(void_reason, session.name, existing.business_date).run();

  return { success: true };
}

async function deleteClosing(env, session, id) {
  const existing = await env.DB.prepare('SELECT * FROM daily_closings WHERE id = ?').bind(id).first();
  if (!existing) throw httpError(404, 'Closing record not found');

  if (existing.is_test === 1) {
    // Hard delete
    await env.DB.prepare('DELETE FROM daily_closings WHERE id = ?').bind(id).run();
    // Also delete corresponding transaction
    await env.DB.prepare(`
      DELETE FROM transactions WHERE business_date = ? AND type = 'closing_count'
    `).bind(existing.business_date).run();
  } else {
    // Soft delete
    await env.DB.prepare(`
      UPDATE daily_closings SET status = 'deleted' WHERE id = ?
    `).bind(id).run();
    // Also soft delete corresponding transaction
    await env.DB.prepare(`
      UPDATE transactions SET status = 'deleted', updated_by = ?, updated_at = datetime('now')
      WHERE business_date = ? AND type = 'closing_count' AND status = 'active'
    `).bind(session.name, existing.business_date).run();
  }

  return { success: true };
}

// ─── Toys ────────────────────────────────────────────────────────────────────

async function getToysMonth(env, session) {
  const totalStart = nowMs();
  const timings = {};
  const includeTest = await timed('settings', () => isTestMode(env), timings);
  const { testClause } = activeFilter(includeTest);

  const balance = await timed('balanceQuery', () => calcToysBalance(env, includeTest), timings);

  const history = await timed('historyQuery', () => env.DB.prepare(`
    SELECT * FROM transactions
    WHERE wallet = 'toys_monthly' AND ${testClause} AND status = 'active'
    ORDER BY created_at DESC LIMIT 100
  `).all(), timings);

  logApiPerf('/api/toys/month', timings, totalStart);

  return { balance, history: history.results };
}

async function collectToys(request, env, session) {
  const body = await request.json();
  const { amount, note, overdraw_reason } = body;
  const parsedAmount = parseFloat(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw httpError(400, 'Amount required');

  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;
  const businessDate = await businessDateStr(env);

  await requireOverdrawReasonIfNeeded(env, {
    type: 'toy_collected_by_owner',
    amount: parsedAmount,
    businessDate,
    includeTest,
    overdrawReason: overdraw_reason,
  });

  const result = await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, note, is_test, created_by, category)
    VALUES (?, 'toy_collected_by_owner', 'toys_monthly', ?, ?, ?, ?, 'Owner collection')
  `).bind(
    businessDate,
    parsedAmount,
    appendOverdrawReason(note || null, overdraw_reason),
    isTest,
    session.name,
  ).run();

  return { id: result.meta.last_row_id, success: true };
}

// ─── Export CSV ──────────────────────────────────────────────────────────────

async function exportCsv(env, session, params) {
  const includeTest = params.get('show_test') === '1';
  const { testClause } = activeFilter(includeTest);

  const rows = await env.DB.prepare(`
    SELECT created_at, business_date, type, wallet, amount, category, note,
           created_by, status, is_test
    FROM transactions WHERE ${testClause} AND status != 'deleted'
    ORDER BY created_at DESC
  `).all();

  const header = 'date/time,business date,type,wallet,amount,category,note,created by,status,is_test\n';
  const lines = rows.results.map(r =>
    [r.created_at, r.business_date, r.type, r.wallet, r.amount, r.category, r.note,
     r.created_by, r.status, r.is_test ? 'YES' : 'NO']
      .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','),
  ).join('\n');

  return new Response(header + lines, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="cash-control-export-${todayStr()}.csv"`,
    },
  });
}

// ─── Delete test data ────────────────────────────────────────────────────────

async function deleteAllTestData(env) {
  await env.DB.prepare("DELETE FROM owner_purchase_items WHERE purchase_id IN (SELECT id FROM owner_purchases WHERE is_test = 1)").run();
  await env.DB.prepare("DELETE FROM owner_purchases WHERE is_test = 1").run();
  await env.DB.prepare("DELETE FROM transactions WHERE is_test = 1").run();
  await env.DB.prepare("DELETE FROM daily_closings WHERE is_test = 1").run();
  return { success: true, message: 'All test data deleted' };
}

async function bulkVoidTransactions(request, env, session) {
  const { ids, void_reason } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) throw httpError(400, 'Select entries to void');
  if (!void_reason) throw httpError(400, 'Void reason required');

  let count = 0;
  for (const id of ids) {
    const existing = await env.DB.prepare('SELECT status, type, business_date FROM transactions WHERE id = ?').bind(id).first();
    if (existing?.status === 'active') {
      await env.DB.prepare(`
        UPDATE transactions SET status = 'voided', void_reason = ?, updated_by = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(void_reason, session.name, id).run();

      if (existing.type === 'closing_count') {
        await env.DB.prepare(`
          UPDATE daily_closings SET status = 'voided', note = COALESCE(note || ' | ', '') || ? WHERE business_date = ? AND status = 'active'
        `).bind(`Voided: ${void_reason}`, existing.business_date).run();
      }
      count++;
    }
  }
  return { success: true, voided: count };
}

async function bulkDeleteTransactions(request, env, session) {
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) throw httpError(400, 'Select entries to delete');

  let count = 0;
  for (const id of ids) {
    const existing = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
    if (!existing) continue;
    if (existing.is_test === 1) {
      await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
      if (existing.type === 'closing_count') {
        await env.DB.prepare("DELETE FROM daily_closings WHERE business_date = ?").bind(existing.business_date).run();
      }
    } else {
      await env.DB.prepare(`
        UPDATE transactions SET status = 'deleted', updated_by = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(session.name, id).run();
      if (existing.type === 'closing_count') {
        await env.DB.prepare(`
          UPDATE daily_closings SET status = 'deleted' WHERE business_date = ? AND status = 'active'
        `).bind(existing.business_date).run();
      }
    }
    count++;
  }
  return { success: true, deleted: count };
}

// ─── Owner purchases, master data and Accountant reporting ──────────────────

const MASTER_CONFIG = {
  products: { table: 'products', fields: ['name', 'category_id', 'default_unit', 'is_favourite', 'status', 'display_order'] },
  'purchase-categories': { table: 'purchase_categories', fields: ['name', 'status', 'display_order'] },
  suppliers: { table: 'suppliers', fields: ['name', 'location', 'phone', 'note', 'status'] },
};

function cleanText(value, max = 500) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function positiveNumber(value, label = 'Amount') {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw httpError(400, `${label} must be positive`);
  return Math.round(number * 1000) / 1000;
}

async function getPurchaseData(env, session, params) {
  const includeHidden = session.role === 'owner' && params.get('include_hidden') === '1';
  const statusSql = includeHidden ? '' : " WHERE status = 'active'";
  const [categories, products, suppliers] = await Promise.all([
    env.DB.prepare(`SELECT * FROM purchase_categories${statusSql} ORDER BY display_order, name`).all(),
    env.DB.prepare(`SELECT p.*, c.name category_name FROM products p LEFT JOIN purchase_categories c ON c.id=p.category_id${includeHidden ? '' : " WHERE p.status = 'active'"} ORDER BY p.is_favourite DESC, CASE WHEN p.last_used_at IS NULL THEN 1 ELSE 0 END, p.last_used_at DESC, p.display_order, p.name`).all(),
    env.DB.prepare(`SELECT * FROM suppliers${statusSql} ORDER BY CASE WHEN last_used_at IS NULL THEN 1 ELSE 0 END, last_used_at DESC, name`).all(),
  ]);
  return { categories: categories.results || [], products: products.results || [], suppliers: suppliers.results || [], receipt_upload_enabled: !!env.RECEIPTS };
}

async function listMasterData(env, resource, params) {
  const config = MASTER_CONFIG[resource];
  if (!config) throw httpError(404, 'Unknown resource');
  const q = cleanText(params.get('q'), 100);
  const includeHidden = params.get('include_hidden') === '1';
  const where = [];
  const binds = [];
  if (!includeHidden) where.push("status = 'active'");
  if (q) { where.push('name LIKE ?'); binds.push(`%${q}%`); }
  const select = resource === 'products'
    ? 'SELECT p.*, c.name category_name FROM products p LEFT JOIN purchase_categories c ON c.id=p.category_id'
    : `SELECT * FROM ${config.table}`;
  const qualifiedWhere = resource === 'products' ? where.map(condition => condition.replace(/^status\b/, 'p.status').replace(/^name\b/, 'p.name')) : where;
  const orderBy = resource === 'products'
    ? 'p.is_favourite DESC, p.last_used_at DESC, p.display_order, p.name'
    : resource === 'purchase-categories' ? 'display_order, name' : 'name';
  const sql = `${select}${qualifiedWhere.length ? ` WHERE ${qualifiedWhere.join(' AND ')}` : ''} ORDER BY ${orderBy}`;
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return { records: rows.results || [] };
}

async function createMasterData(request, env, resource) {
  const config = MASTER_CONFIG[resource];
  if (!config) throw httpError(404, 'Unknown resource');
  const body = await request.json();
  if (resource === 'products' && Array.isArray(body.names)) return createProductsBulkBody(body, env);
  const name = cleanText(body.name, 120);
  if (!name) throw httpError(400, 'Name required');
  const duplicate = await env.DB.prepare(`SELECT id FROM ${config.table} WHERE name = ? COLLATE NOCASE`).bind(name).first();
  if (duplicate) throw httpError(409, 'Name already exists');
  const values = { ...body, name, status: body.status === 'hidden' ? 'hidden' : 'active' };
  validateMasterValues(resource, values);
  const fields = config.fields.filter(f => values[f] != null);
  const placeholders = fields.map(() => '?').join(',');
  const result = await env.DB.prepare(`INSERT INTO ${config.table} (${fields.join(',')}) VALUES (${placeholders})`).bind(...fields.map(f => values[f])).run();
  return { success: true, id: result.meta.last_row_id };
}

async function createProductsBulk(request, env) {
  const body = await request.json();
  return createProductsBulkBody(body, env);
}

async function createProductsBulkBody(body, env) {
  if (!Array.isArray(body.names)) throw httpError(400, 'Product names required');
  const names = body.names.map(name => cleanText(name, 120)).filter(Boolean);
  if (!names.length) throw httpError(400, 'Add at least one product');
  if (names.length > 50) throw httpError(400, 'Add no more than 50 products at once');
  const normalized = names.map(name => name.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) throw httpError(409, 'The product list contains duplicate names');
  const placeholders = names.map(() => '?').join(',');
  const existing = await env.DB.prepare(`SELECT name FROM products WHERE name COLLATE NOCASE IN (${placeholders})`).bind(...names).all();
  if (existing.results?.length) throw httpError(409, `Product already exists: ${existing.results[0].name}`);
  const shared = {
    category_id: body.category_id == null || body.category_id === '' ? null : body.category_id,
    default_unit: body.default_unit,
    display_order: body.display_order == null ? 0 : body.display_order,
  };
  validateMasterValues('products', shared);
  const statements = names.map((name, index) => env.DB.prepare(`
    INSERT INTO products (name, category_id, default_unit, display_order)
    VALUES (?, ?, ?, ?)
  `).bind(name, shared.category_id, shared.default_unit, Number(shared.display_order) + index));
  await env.DB.batch(statements);
  return { success: true, created: names.length };
}

async function updateMasterData(request, env, resource, id) {
  const config = MASTER_CONFIG[resource];
  if (!config) throw httpError(404, 'Unknown resource');
  const body = await request.json();
  if (body.name != null) {
    body.name = cleanText(body.name, 120);
    if (!body.name) throw httpError(400, 'Name required');
    const duplicate = await env.DB.prepare(`SELECT id FROM ${config.table} WHERE name = ? COLLATE NOCASE AND id != ?`).bind(body.name, id).first();
    if (duplicate) throw httpError(409, 'Name already exists');
  }
  const fields = config.fields.filter(f => body[f] != null);
  if (!fields.length) throw httpError(400, 'No changes supplied');
  if (body.status != null && !['active', 'hidden'].includes(body.status)) throw httpError(400, 'Invalid status');
  validateMasterValues(resource, body);
  await env.DB.prepare(`UPDATE ${config.table} SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...fields.map(f => body[f]), id).run();
  return { success: true };
}

function validateMasterValues(resource, values) {
  if (values.display_order != null && (!Number.isInteger(Number(values.display_order)) || Math.abs(Number(values.display_order)) > 1000000)) {
    throw httpError(400, 'Display order must be a whole number');
  }
  if (values.category_id != null && values.category_id !== '' && (!Number.isInteger(Number(values.category_id)) || Number(values.category_id) <= 0)) {
    throw httpError(400, 'Invalid category');
  }
  if (values.is_favourite != null && ![0, 1, '0', '1', false, true].includes(values.is_favourite)) {
    throw httpError(400, 'Favourite must be enabled or disabled');
  }
  if (resource === 'products') values.default_unit = cleanText(values.default_unit, 30);
  if (resource === 'suppliers') {
    values.location = cleanText(values.location, 200);
    values.phone = cleanText(values.phone, 50);
    values.note = cleanText(values.note, 500);
  }
}

async function purchaseSnapshots(env, body) {
  const supplier = body.supplier_id ? await env.DB.prepare('SELECT id,name FROM suppliers WHERE id=?').bind(body.supplier_id).first() : null;
  const category = body.category_id ? await env.DB.prepare('SELECT id,name FROM purchase_categories WHERE id=?').bind(body.category_id).first() : null;
  return { supplier, category };
}

async function normalizePurchaseItems(env, items) {
  if (!Array.isArray(items) || !items.length) throw httpError(400, 'Detailed purchase requires at least one item');
  const normalized = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index] || {};
    const product = item.product_id ? await env.DB.prepare('SELECT p.id,p.name,p.category_id,c.name category_name FROM products p LEFT JOIN purchase_categories c ON c.id=p.category_id WHERE p.id=?').bind(item.product_id).first() : null;
    const name = cleanText(product?.name || item.product_name, 120);
    if (!name) throw httpError(400, `Item ${index + 1} product name required`);
    const lineTotal = positiveNumber(item.line_total, `Item ${index + 1} total`);
    const quantity = item.quantity == null || item.quantity === '' ? null : positiveNumber(item.quantity, `Item ${index + 1} quantity`);
    const unitPrice = item.unit_price == null || item.unit_price === '' ? null : positiveNumber(item.unit_price, `Item ${index + 1} unit price`);
    normalized.push({ product_id: product?.id || null, product_name_snapshot: name, category_name_snapshot: cleanText(product?.category_name || item.category_name, 120), quantity, unit: cleanText(item.unit, 30), unit_price: unitPrice, line_total: lineTotal, note: cleanText(item.note), display_order: index });
  }
  return normalized;
}

async function createOwnerPurchase(request, env, session) {
  const body = await request.json();
  const mode = body.entry_mode;
  if (!['detailed', 'quick'].includes(mode)) throw httpError(400, 'Entry mode must be detailed or quick');
  const snapshots = await purchaseSnapshots(env, body);
  const items = mode === 'detailed' ? await normalizePurchaseItems(env, body.items) : [];
  const total = mode === 'detailed' ? Math.round(items.reduce((sum, item) => sum + item.line_total, 0) * 1000) / 1000 : positiveNumber(body.total_amount);
  if (body.total_amount != null && Math.abs(total - Number(body.total_amount)) > 0.001) throw httpError(400, 'Purchase item totals do not match purchase total');
  const categoryName = cleanText(snapshots.category?.name || body.category_description, 120);
  if (mode === 'quick' && !categoryName) throw httpError(400, 'Quick purchase category or description required');
  const businessDate = await businessDateStr(env);
  const purchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(body.purchase_date || '') ? body.purchase_date : businessDate;
  const isTest = await isTestMode(env) ? 1 : 0;
  const header = await env.DB.prepare(`INSERT INTO owner_purchases
    (business_date,purchase_date,supplier_id,supplier_name_snapshot,entry_mode,category_id,category_name_snapshot,total_amount,note,is_test,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(businessDate,purchaseDate,snapshots.supplier?.id || null,snapshots.supplier?.name || null,mode,snapshots.category?.id || null,categoryName,total,cleanText(body.note,1000),isTest,session.name).run();
  const purchaseId = header.meta.last_row_id;
  try {
    if (items.length) await env.DB.batch(items.map(item => env.DB.prepare(`INSERT INTO owner_purchase_items
      (purchase_id,product_id,product_name_snapshot,category_name_snapshot,quantity,unit,unit_price,line_total,note,display_order)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(purchaseId,item.product_id,item.product_name_snapshot,item.category_name_snapshot,item.quantity,item.unit,item.unit_price,item.line_total,item.note,item.display_order)));
    const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))];
    if (productIds.length) await env.DB.batch(productIds.map(id => env.DB.prepare("UPDATE products SET use_count=use_count+1,last_used_at=datetime('now') WHERE id=?").bind(id)));
    if (snapshots.supplier?.id) await env.DB.prepare("UPDATE suppliers SET use_count=use_count+1,last_used_at=datetime('now') WHERE id=?").bind(snapshots.supplier.id).run();
  } catch (error) {
    await env.DB.prepare('DELETE FROM owner_purchase_items WHERE purchase_id=?').bind(purchaseId).run();
    await env.DB.prepare('DELETE FROM owner_purchases WHERE id=?').bind(purchaseId).run();
    throw error;
  }
  return { success: true, id: purchaseId, total_amount: total };
}

function applyPurchaseFilters(where, binds, params) {
  const map = { supplier_id: 'p.supplier_id', category_id: 'p.category_id', entry_mode: 'p.entry_mode', status: 'p.status' };
  for (const [key, column] of Object.entries(map)) if (params.get(key)) { where.push(`${column}=?`); binds.push(params.get(key)); }
  if (params.get('test_only') === '1') where.push('p.is_test=1');
  if (params.get('date_from')) { where.push('p.purchase_date>=?'); binds.push(params.get('date_from')); }
  if (params.get('date_to')) { where.push('p.purchase_date<=?'); binds.push(params.get('date_to')); }
  if (params.get('product_id')) { where.push('EXISTS (SELECT 1 FROM owner_purchase_items i WHERE i.purchase_id=p.id AND i.product_id=?)'); binds.push(params.get('product_id')); }
  if (params.get('receipt') === '1') where.push('p.receipt_key IS NOT NULL');
  if (params.get('receipt') === '0') where.push('p.receipt_key IS NULL');
  if (params.get('min_amount')) { where.push('p.total_amount>=?'); binds.push(params.get('min_amount')); }
  if (params.get('max_amount')) { where.push('p.total_amount<=?'); binds.push(params.get('max_amount')); }
  const q = cleanText(params.get('q'), 100);
  if (q) { const like=`%${q}%`; where.push('(p.supplier_name_snapshot LIKE ? OR p.category_name_snapshot LIKE ? OR p.note LIKE ? OR EXISTS (SELECT 1 FROM owner_purchase_items qi WHERE qi.purchase_id=p.id AND qi.product_name_snapshot LIKE ?))'); binds.push(like,like,like,like); }
}

async function listOwnerPurchases(env, session, params) {
  const where=[]; const binds=[];
  const includeTest = params.get('show_test') === '1' || (session.role === 'owner' && await isTestMode(env));
  if (!includeTest) where.push('p.is_test=0');
  if (!params.get('status')) where.push("p.status='active'");
  applyPurchaseFilters(where, binds, params);
  const clause=where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows=await env.DB.prepare(`SELECT p.*,(SELECT GROUP_CONCAT(product_name_snapshot, ', ') FROM owner_purchase_items i WHERE i.purchase_id=p.id) product_summary FROM owner_purchases p ${clause} ORDER BY p.purchase_date DESC,p.created_at DESC LIMIT 1000`).bind(...binds).all();
  const summary=await env.DB.prepare(`SELECT COUNT(*) count,COALESCE(SUM(p.total_amount),0) total FROM owner_purchases p ${clause}`).bind(...binds).first();
  return { purchases: rows.results || [], summary };
}

async function getOwnerPurchase(env, id) {
  const purchase=await env.DB.prepare('SELECT * FROM owner_purchases WHERE id=?').bind(id).first();
  if (!purchase) throw httpError(404, 'Purchase not found');
  const items=await env.DB.prepare('SELECT * FROM owner_purchase_items WHERE purchase_id=? ORDER BY display_order,id').bind(id).all();
  return { purchase, items: items.results || [], receipt_available: !!purchase.receipt_key };
}

async function updateOwnerPurchase(request, env, session, id) {
  const existing=await env.DB.prepare('SELECT * FROM owner_purchases WHERE id=?').bind(id).first();
  if (!existing) throw httpError(404,'Purchase not found');
  if (existing.status !== 'active') throw httpError(400,'Cannot edit voided/deleted purchase');
  const body=await request.json();
  if (!cleanText(body.edit_reason,500)) throw httpError(400,'Edit reason required');
  const merged={...existing,...body};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(merged.purchase_date || '')) throw httpError(400,'Valid purchase date required');
  const snapshots=await purchaseSnapshots(env, merged);
  const items=merged.entry_mode === 'detailed' ? await normalizePurchaseItems(env, body.items) : [];
  const total=merged.entry_mode === 'detailed' ? Math.round(items.reduce((s,i)=>s+i.line_total,0)*1000)/1000 : positiveNumber(merged.total_amount);
  if (body.total_amount != null && merged.entry_mode === 'detailed' && Math.abs(total-Number(body.total_amount))>0.001) throw httpError(400,'Purchase item totals do not match purchase total');
  const categoryName=cleanText(snapshots.category?.name || body.category_description || existing.category_name_snapshot,120);
  if (merged.entry_mode === 'quick' && !categoryName) throw httpError(400,'Quick purchase category or description required');
  const statements=[env.DB.prepare(`UPDATE owner_purchases SET purchase_date=?,supplier_id=?,supplier_name_snapshot=?,entry_mode=?,category_id=?,category_name_snapshot=?,total_amount=?,note=?,updated_by=?,updated_at=datetime('now'),edit_reason=? WHERE id=?`).bind(merged.purchase_date,snapshots.supplier?.id || null,snapshots.supplier?.name || null,merged.entry_mode,snapshots.category?.id || null,categoryName,total,cleanText(merged.note,1000),session.name,cleanText(body.edit_reason,500),id),env.DB.prepare('DELETE FROM owner_purchase_items WHERE purchase_id=?').bind(id)];
  statements.push(...items.map(item=>env.DB.prepare(`INSERT INTO owner_purchase_items (purchase_id,product_id,product_name_snapshot,category_name_snapshot,quantity,unit,unit_price,line_total,note,display_order) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id,item.product_id,item.product_name_snapshot,item.category_name_snapshot,item.quantity,item.unit,item.unit_price,item.line_total,item.note,item.display_order)));
  await env.DB.batch(statements);
  return { success:true,total_amount:total };
}

async function voidOwnerPurchase(request, env, session, id) {
  const { void_reason }=await request.json();
  if (!cleanText(void_reason,500)) throw httpError(400,'Void reason required');
  const result=await env.DB.prepare("UPDATE owner_purchases SET status='voided',void_reason=?,updated_by=?,updated_at=datetime('now') WHERE id=? AND status='active'").bind(cleanText(void_reason,500),session.name,id).run();
  if (!result.meta.changes) throw httpError(400,'Purchase not found or not active');
  return { success:true };
}

async function deleteOwnerPurchase(env, session, id) {
  const existing=await env.DB.prepare('SELECT * FROM owner_purchases WHERE id=?').bind(id).first();
  if (!existing) throw httpError(404,'Purchase not found');
  if (existing.is_test===1) await env.DB.batch([env.DB.prepare('DELETE FROM owner_purchase_items WHERE purchase_id=?').bind(id),env.DB.prepare('DELETE FROM owner_purchases WHERE id=?').bind(id)]);
  else await env.DB.prepare("UPDATE owner_purchases SET status='deleted',updated_by=?,updated_at=datetime('now'),void_reason='Deleted by owner' WHERE id=?").bind(session.name,id).run();
  return { success:true };
}

async function uploadPurchaseReceipt(request, env, id) {
  if (!env.RECEIPTS) throw httpError(503,'Receipt storage is not configured');
  const purchase=await env.DB.prepare('SELECT receipt_key FROM owner_purchases WHERE id=?').bind(id).first();
  if (!purchase) throw httpError(404,'Purchase not found');
  const form=await request.formData(); const file=form.get('receipt');
  const allowed=['image/jpeg','image/png','image/webp'];
  if (!file || !allowed.includes(file.type)) throw httpError(400,'Receipt must be JPEG, PNG or WebP');
  if (file.size>8*1024*1024) throw httpError(400,'Receipt must be 8 MB or smaller');
  const ext={ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' }[file.type];
  const key=`owner-purchases/${id}/${crypto.randomUUID()}.${ext}`;
  await env.RECEIPTS.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
  if (purchase.receipt_key) await env.RECEIPTS.delete(purchase.receipt_key);
  await env.DB.prepare('UPDATE owner_purchases SET receipt_key=?,receipt_name=?,receipt_type=?,updated_at=datetime(\'now\') WHERE id=?').bind(key,cleanText(file.name,200),file.type,id).run();
  return json({success:true,receipt_available:true});
}

async function getPurchaseReceipt(env,id) {
  if (!env.RECEIPTS) throw httpError(503,'Receipt storage is not configured');
  const purchase=await env.DB.prepare('SELECT receipt_key,receipt_type FROM owner_purchases WHERE id=?').bind(id).first();
  if (!purchase?.receipt_key) throw httpError(404,'Receipt not found');
  const object=await env.RECEIPTS.get(purchase.receipt_key);
  if (!object) throw httpError(404,'Receipt not found');
  return new Response(object.body,{headers:{'Content-Type':purchase.receipt_type || 'application/octet-stream','Cache-Control':'private, no-store','Content-Disposition':'inline'}});
}

async function deletePurchaseReceipt(env,id) {
  if (!env.RECEIPTS) throw httpError(503,'Receipt storage is not configured');
  const purchase=await env.DB.prepare('SELECT receipt_key FROM owner_purchases WHERE id=?').bind(id).first();
  if (!purchase?.receipt_key) throw httpError(404,'Receipt not found');
  await env.RECEIPTS.delete(purchase.receipt_key);
  await env.DB.prepare('UPDATE owner_purchases SET receipt_key=NULL,receipt_name=NULL,receipt_type=NULL,updated_at=datetime(\'now\') WHERE id=?').bind(id).run();
  return {success:true};
}

function reportDates(params,today) {
  const period=params.get('period') || 'month'; let from=params.get('date_from'); let to=params.get('date_to');
  if (!from && period!=='all' && period!=='custom') from=period==='today'?today:period==='yesterday'?previousDateStr(today):period==='week'?weekStart():period==='month'?monthStart(today):null;
  if (!to && period==='yesterday') to=previousDateStr(today); else if (!to && period!=='all') to=today;
  return {from,to};
}

async function getAccountantDashboard(env,params) {
  const today=await businessDateStr(env); const dates=reportDates(params,today); const testOnly=params.get('test_only')==='1'; const includeTest=params.get('show_test')==='1'||testOnly;
  const cash=await getWorkerDashboard(env,{role:'accountant'});
  const testSql=testOnly?'is_test=1':includeTest?'1=1':'is_test=0'; const dateSql=`${dates.from?' AND business_date>=?':''}${dates.to?' AND business_date<=?':''}`; const binds=[...(dates.from?[dates.from]:[]),...(dates.to?[dates.to]:[])];
  const worker=await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE type='expense' AND status='active' AND ${testSql}${dateSql}`).bind(...binds).first();
  const purchaseDateSql=`${dates.from?' AND purchase_date>=?':''}${dates.to?' AND purchase_date<=?':''}`;
  const owner=await env.DB.prepare(`SELECT COALESCE(SUM(total_amount),0) total FROM owner_purchases WHERE status='active' AND ${testSql}${purchaseDateSql}`).bind(...binds).first();
  return {cash,period:{...dates,name:params.get('period')||'month'},worker_expenses:worker.total||0,owner_purchases:owner.total||0,combined_expenses:(worker.total||0)+(owner.total||0)};
}

async function getUnifiedExpenses(env,params) {
  const today=await businessDateStr(env); const dates=reportDates(params,today); const testOnly=params.get('test_only')==='1'; const includeTest=params.get('show_test')==='1'||testOnly; const source=params.get('source'); const rows=[];
  const min=Number(params.get('min_amount')||0); const max=Number(params.get('max_amount')||0); const q=cleanText(params.get('q'),100)?.toLowerCase();
  if (source!=='owner') {
    const binds=[]; let where="type='expense' AND status='active'"+(testOnly?" AND is_test=1":includeTest?'':" AND is_test=0");
    if(dates.from){where+=' AND business_date>=?';binds.push(dates.from);} if(dates.to){where+=' AND business_date<=?';binds.push(dates.to);}
    const result=await env.DB.prepare(`SELECT * FROM transactions WHERE ${where} ORDER BY business_date DESC`).bind(...binds).all();
    for(const r of result.results||[]) rows.push({id:r.id,date:r.business_date,source:'worker',record_type:'worker_expense',amount:r.amount,category:r.category,supplier:null,product_summary:null,note:r.note,receipt_available:false,entry_mode:null,created_by:r.created_by,status:r.status,is_test:r.is_test});
  }
  if(source!=='worker') {
    const search=new URLSearchParams(params); if(dates.from)search.set('date_from',dates.from);if(dates.to)search.set('date_to',dates.to);search.set('status','active');if(includeTest)search.set('show_test','1');if(testOnly)search.set('test_only','1');
    const result=await listOwnerPurchases(env,{role:'accountant'},search);
    for(const r of result.purchases) rows.push({id:r.id,date:r.purchase_date,source:'owner',record_type:'owner_purchase',amount:r.total_amount,category:r.category_name_snapshot,supplier:r.supplier_name_snapshot,product_summary:r.product_summary,note:r.note,receipt_available:!!r.receipt_key,entry_mode:r.entry_mode,created_by:r.created_by,status:r.status,is_test:r.is_test});
  }
  const category=cleanText(params.get('category'),120)?.toLowerCase();
  const filtered=rows.filter(r=>(!min||r.amount>=min)&&(!max||r.amount<=max)&&(!params.get('receipt')||(params.get('receipt')==='1')===r.receipt_available)&&(!params.get('entry_mode')||r.entry_mode===params.get('entry_mode'))&&(!category||String(r.category||'').toLowerCase().includes(category))&&(!q||JSON.stringify(r).toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
  return {expenses:filtered,summary:{count:filtered.length,total:filtered.reduce((s,r)=>s+Number(r.amount),0)},period:dates};
}

function csvCell(value){return `"${String(value??'').replace(/"/g,'""')}"`;}
async function exportAccountantCsv(env,params){
  const kind=params.get('kind')||'combined'; let records=[]; let headers=[];
  if(kind==='items'){
    const expenses=await getUnifiedExpenses(env,new URLSearchParams({...Object.fromEntries(params),source:'owner'})); const ids=expenses.expenses.map(e=>e.id); headers=['Date','Purchase ID','Supplier','Product','Category','Quantity','Unit','Unit Price','Line Total','Test'];
    for(const expense of expenses.expenses){const detail=await getOwnerPurchase(env,expense.id);for(const item of detail.items)records.push([expense.date,expense.id,expense.supplier,item.product_name_snapshot,item.category_name_snapshot,item.quantity,item.unit,item.unit_price==null?'':Number(item.unit_price).toFixed(3),Number(item.line_total).toFixed(3),expense.is_test]);}
  }else{
    const query=new URLSearchParams(params); if(kind==='worker')query.set('source','worker');if(kind==='purchases')query.set('source','owner'); const data=await getUnifiedExpenses(env,query); headers=['Date','Source','Record Type','Amount','Category','Supplier','Products','Note','Receipt Available','Entry Mode','Created By','Status','Test']; records=data.expenses.map(r=>[r.date,r.source,r.record_type,Number(r.amount).toFixed(3),r.category,r.supplier,r.product_summary,r.note,r.receipt_available?'Yes':'No',r.entry_mode,r.created_by,r.status,r.is_test]);
  }
  return new Response([headers,...records].map(row=>row.map(csvCell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="accountant-${kind}-${todayStr()}.csv"`}});
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
