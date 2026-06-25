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
  if (!['owner', 'worker'].includes(requestedRole)) {
    throw httpError(400, 'Choose Owner or Worker login');
  }

  const pins = await timed('pinSettingsQuery', () => getPinSettings(env), timings);

  if (requestedRole === 'worker' && !pins.worker_access_enabled) {
    throw httpError(403, 'Worker access is currently disabled. Please contact owner.');
  }

  if (requestedRole === 'owner') {
    if (pin !== pins.owner_pin) throw httpError(401, 'Invalid owner PIN');
    const token = await timed('tokenCreate', () => createSessionToken({ userId: 1, role: 'owner', name: 'Owner' }, env), timings);
    logApiPerf('/api/login', timings, totalStart);
    return { token, role: 'owner', name: 'Owner' };
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
  const roleKey = role === 'worker' ? 'worker_auth_version' : 'owner_auth_version';
  const settings = await getSettingsMap(env, [roleKey, 'auth_version']);
  return settings[roleKey] || settings.auth_version || '1';
}

async function bumpAuthVersion(env, role) {
  const roleKey = role === 'worker' ? 'worker_auth_version' : 'owner_auth_version';
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

    return session;
  } catch {
    return null;
  }
}

function requireRole(session, role) {
  if (session.role !== role) throw httpError(403, 'Owner access required');
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
    'worker_access_enabled',
    'worker_login_enabled',
    'notifications_enabled',
  ]);
  const dbOwner = settings.owner_pin;
  const dbWorker = settings.worker_pin;
  const workerAccess = settings.worker_access_enabled;
  const legacyWorkerLogin = settings.worker_login_enabled;
  const workerAccessEnabled = workerAccess ?? legacyWorkerLogin;
  return {
    owner_pin: dbOwner || env.OWNER_PIN || '1111',
    worker_pin: dbWorker || env.WORKER_PIN || '1111',
    worker_access_enabled: workerAccessEnabled !== '0',
  };
}

async function getSettings(env, session = null) {
  const settings = await getSettingsMap(env, [
    'test_mode',
    'owner_pin',
    'worker_pin',
    'worker_access_enabled',
    'worker_login_enabled',
    'notifications_enabled',
    'business_day_start_hour',
  ]);
  const workerAccessEnabled = (settings.worker_access_enabled ?? settings.worker_login_enabled) !== '0';
  const result = {
    test_mode: settings.test_mode === '1',
    worker_access_enabled: workerAccessEnabled,
    worker_login_enabled: workerAccessEnabled,
    notifications_enabled: settings.notifications_enabled === '1',
    business_day_start_hour: parseBusinessHour(settings.business_day_start_hour, 16),
    pins_configured: !!settings.owner_pin || !!settings.worker_pin,
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
  const newWorkerPin = body.new_worker_pin != null ? String(body.new_worker_pin).trim() : null;
  const newOwnerPin = body.new_owner_pin != null ? String(body.new_owner_pin).trim() : null;
  const finalWorkerPin = newWorkerPin || pins.worker_pin;
  const finalOwnerPin = newOwnerPin || pins.owner_pin;

  if ((newWorkerPin || newOwnerPin) && finalOwnerPin === finalWorkerPin) {
    throw httpError(400, 'Owner PIN and Worker PIN cannot be the same.');
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

  if (expireWorkerSessions) await bumpAuthVersion(env, 'worker');
  if (expireOwnerSessions) await bumpAuthVersion(env, 'owner');

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

// Mon start
function weekStart() {
  const p = bahrainNowParts();
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
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
  const ms = monthStart(businessDate);

  const rows = await env.DB.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE wallet = 'toys_monthly' AND status = 'active' AND ${testClause}
      AND type IN ('toy_collection', 'toy_collected_by_owner') AND business_date >= ?
    GROUP BY type
  `).bind(ms).all();

  const map = {};
  for (const row of rows.results || []) map[row.type] = row.total;
  return (map.toy_collection || 0) - (map.toy_collected_by_owner || 0);
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
  ] = await Promise.all([
    timed('openingQuery', () => getOpeningCash(env, today, includeTest), timings),
    timed('closingQuery', () => getLastClosing(env, includeTest), timings),
    timed('todayTotalsQuery', () => getTodaySums(env, today, includeTest), timings),
    timed('toysQuery', () => calcToysBalance(env, includeTest, today), timings),
    timed('monthExpensesQuery', () => sumByType(env, { monthStart: monthStart(today), types: ['expense'], wallet: 'daily_cash', includeTest }), timings),
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
  ] = await Promise.all([
    timed('openingQuery', () => getOpeningCash(env, today, includeTest), timings),
    timed('closingQuery', () => getLastClosing(env, includeTest), timings),
    timed('todayTotalsQuery', () => getTodaySums(env, today, includeTest), timings),
    timed('toysQuery', () => calcToysBalance(env, includeTest, today), timings),
    timed('monthCashQuery', () => sumByType(env, { monthStart: ms, types: ['cash_sale'], wallet: 'daily_cash', includeTest }), timings),
    timed('monthBenefitpayQuery', () => sumByType(env, { monthStart: ms, types: ['benefitpay_sale'], wallet: 'benefitpay', includeTest }), timings),
    timed('monthExpensesQuery', () => sumByType(env, { monthStart: ms, types: ['expense'], wallet: 'daily_cash', includeTest }), timings),
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
    test_mode: includeTest,
  };
}

// ─── Transactions CRUD ───────────────────────────────────────────────────────

async function createTransaction(request, env, session) {
  const body = await request.json();
  const { type, amount, category, note, source } = body;

  if (!type || amount == null || amount <= 0) {
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

  // For toy_collection, source goes in category field
  const cat = type === 'toy_collection' ? (source || category || 'Machine') : (category || null);
  const noteText = note || null;

  const result = await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, category, note, is_test, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(businessDate, type, wallet, parseFloat(amount), cat, noteText, isTest, session.name).run();

  return { id: result.meta.last_row_id, success: true };
}

async function listTransactions(env, session, params) {
  const includeTest = params.get('show_test') === '1' || await isTestMode(env);
  const { testClause } = activeFilter(includeTest);

  let sql = `SELECT * FROM transactions WHERE ${testClause}`;
  const binds = [];
  const today = await businessDateStr(env);

  const period = params.get('period');
  if (period === 'today') { sql += ' AND business_date = ?'; binds.push(today); }
  else if (period === 'week') { sql += ' AND business_date >= ?'; binds.push(weekStart()); }
  else if (period === 'month') { sql += ' AND business_date >= ?'; binds.push(monthStart(today)); }

  const wallet = params.get('wallet');
  if (wallet) { sql += ' AND wallet = ?'; binds.push(wallet); }

  const status = params.get('status');
  if (status) { sql += ' AND status = ?'; binds.push(status); }
  else { sql += " AND status != 'deleted'"; }

  if (params.get('test_only') === '1') {
    sql += ' AND is_test = 1';
  }

  sql += ' ORDER BY created_at DESC LIMIT 500';

  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return { transactions: rows.results };
}

async function listActivity(env, session, params) {
  const includeTest = params.get('show_test') === '1' || await isTestMode(env);
  const { testClause } = activeFilter(includeTest);
  const period = params.get('period') || 'today';
  const today = await businessDateStr(env);
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '100', 10) || 100, 20), 300);

  let sql = `
    SELECT id, business_date, created_at, type, wallet, amount, category, note, created_by, is_test
    FROM transactions
    WHERE ${testClause} AND status = 'active'
  `;
  const binds = [];

  if (period === 'today') {
    sql += ' AND business_date = ?';
    binds.push(today);
  } else if (period === 'month') {
    sql += ' AND business_date >= ?';
    binds.push(monthStart(today));
  } else if (period === 'year') {
    sql += ' AND business_date >= ?';
    binds.push(yearStart(today));
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  binds.push(limit);

  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return { period, activity: rows.results || [] };
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
  const today = await businessDateStr(env);
  const ms = monthStart(today);
  const { testClause } = activeFilter(includeTest);

  const balance = await timed('balanceQuery', () => calcToysBalance(env, includeTest, today), timings);

  const history = await timed('historyQuery', () => env.DB.prepare(`
    SELECT * FROM transactions
    WHERE wallet = 'toys_monthly' AND ${testClause} AND status != 'deleted'
      AND business_date >= ?
    ORDER BY created_at DESC LIMIT 100
  `).bind(ms).all(), timings);

  logApiPerf('/api/toys/month', timings, totalStart);

  return { balance, history: history.results };
}

async function collectToys(request, env, session) {
  const body = await request.json();
  const { amount, note } = body;

  if (!amount || amount <= 0) throw httpError(400, 'Amount required');

  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;

  const result = await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, note, is_test, created_by, category)
    VALUES (?, 'toy_collected_by_owner', 'toys_monthly', ?, ?, ?, ?, 'Owner collection')
  `).bind(await businessDateStr(env), parseFloat(amount), note || null, isTest, session.name).run();

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
