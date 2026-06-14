/**
 * Cash Control API — Cloudflare Worker
 * Handles all API routes, auth, and serves frontend static assets.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Food products', 'Drinks', 'Packaging', 'Cleaning',
  'Maintenance', 'Delivery', 'Other',
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
      return json(await listTransactions(env, session, url.searchParams));
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
      return json(await getSettings(env));
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

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    const status = err.status || 500;
    return json({ error: err.message || 'Server error' }, status);
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function login(request, env) {
  const { pin } = await request.json();
  if (!pin) throw httpError(400, 'PIN required');

  const ownerPin = env.OWNER_PIN || 'CHANGE_ME_OWNER';
  const workerPin = env.WORKER_PIN || 'CHANGE_ME_WORKER';

  let role = null;
  let name = null;
  let userId = null;

  if (pin === ownerPin) {
    role = 'owner';
    name = 'Owner';
    userId = 1;
  } else if (pin === workerPin) {
    role = 'worker';
    name = 'Worker';
    userId = 2;
  } else {
    throw httpError(401, 'Invalid PIN');
  }

  const token = await createSessionToken({ userId, role, name }, env);
  return { token, role, name };
}

async function createSessionToken(payload, env) {
  const secret = env.SESSION_SECRET || 'dev-secret-change-me';
  const exp = Date.now() + SESSION_TTL_MS;
  const data = JSON.stringify({ ...payload, exp });
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

async function getSettings(env) {
  const row = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = 'test_mode'",
  ).first();
  return { test_mode: row?.value === '1' };
}

async function updateSettings(request, env, session) {
  const body = await request.json();
  if (typeof body.test_mode === 'boolean') {
    await env.DB.prepare(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('test_mode', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
    ).bind(body.test_mode ? '1' : '0').run();
  }
  return getSettings(env);
}

async function isTestMode(env) {
  const s = await getSettings(env);
  return s.test_mode;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function weekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

// ─── Balance calculations ────────────────────────────────────────────────────

/**
 * Build SQL filter for active records respecting test mode.
 * includeTest: when true, include test records; when false, exclude them.
 */
function activeFilter(includeTest) {
  const statusClause = "status = 'active'";
  const testClause = includeTest ? '1=1' : 'is_test = 0';
  return { statusClause, testClause };
}

async function getOpeningCash(env, businessDate, includeTest) {
  const { testClause } = activeFilter(includeTest);

  // Previous day's closing actual_cash
  const prev = await env.DB.prepare(`
    SELECT actual_cash FROM daily_closings
    WHERE business_date < ? AND status = 'active' AND ${testClause}
    ORDER BY business_date DESC LIMIT 1
  `).bind(businessDate).first();

  if (prev) return prev.actual_cash;

  // First day — check if there's an opening correction or cash_added before this date
  const added = await env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE wallet = 'daily_cash' AND status = 'active' AND ${testClause}
      AND type IN ('cash_added_by_owner', 'correction')
      AND business_date <= ?
  `).bind(businessDate).first();

  return added?.total || 0;
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

async function getLastClosing(env, includeTest) {
  const { testClause } = activeFilter(includeTest);
  return env.DB.prepare(`
    SELECT * FROM daily_closings
    WHERE status = 'active' AND ${testClause}
    ORDER BY business_date DESC LIMIT 1
  `).first();
}

// ─── Dashboards ──────────────────────────────────────────────────────────────

async function getWorkerDashboard(env, session) {
  const includeTest = await isTestMode(env);
  const today = todayStr();

  const opening = await getOpeningCash(env, today, includeTest);
  const expected = await calcExpectedCash(env, today, includeTest);
  const lastClosing = await getLastClosing(env, includeTest);

  return {
    date: today,
    opening_cash: opening,
    cash_sales_today: await sumByType(env, { businessDate: today, types: ['cash_sale'], wallet: 'daily_cash', includeTest }),
    benefitpay_today: await sumByType(env, { businessDate: today, types: ['benefitpay_sale'], wallet: 'benefitpay', includeTest }),
    expenses_today: await sumByType(env, { businessDate: today, types: ['expense'], wallet: 'daily_cash', includeTest }),
    expected_cash_now: expected,
    last_closing_difference: lastClosing?.difference ?? null,
    toys_month_balance: await calcToysBalance(env, includeTest),
    test_mode: includeTest,
  };
}

async function getOwnerDashboard(env, session) {
  const includeTest = await isTestMode(env);
  const today = todayStr();
  const ms = monthStart();

  const expected = await calcExpectedCash(env, today, includeTest);
  const lastClosing = await getLastClosing(env, includeTest);

  return {
    expected_cash_with_worker: expected,
    today_cash_sales: await sumByType(env, { businessDate: today, types: ['cash_sale'], wallet: 'daily_cash', includeTest }),
    today_benefitpay: await sumByType(env, { businessDate: today, types: ['benefitpay_sale'], wallet: 'benefitpay', includeTest }),
    today_expenses: await sumByType(env, { businessDate: today, types: ['expense'], wallet: 'daily_cash', includeTest }),
    last_actual_closing: lastClosing?.actual_cash ?? null,
    last_closing_difference: lastClosing?.difference ?? null,
    toys_month_balance: await calcToysBalance(env, includeTest),
    month_cash_sales: await sumByType(env, { monthStart: ms, types: ['cash_sale'], wallet: 'daily_cash', includeTest }),
    month_benefitpay: await sumByType(env, { monthStart: ms, types: ['benefitpay_sale'], wallet: 'benefitpay', includeTest }),
    month_expenses: await sumByType(env, { monthStart: ms, types: ['expense'], wallet: 'daily_cash', includeTest }),
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

  // Workers cannot do owner-only types
  const ownerOnly = ['cash_taken_by_owner', 'cash_added_by_owner', 'toy_collected_by_owner', 'correction'];
  if (ownerOnly.includes(type) && session.role !== 'owner') {
    throw httpError(403, 'Owner access required');
  }

  if (type === 'expense' && !category) {
    throw httpError(400, 'Category required for expenses');
  }

  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;
  const wallet = WALLET_BY_TYPE[type];
  const businessDate = todayStr();

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

  const period = params.get('period');
  if (period === 'today') { sql += ' AND business_date = ?'; binds.push(todayStr()); }
  else if (period === 'week') { sql += ' AND business_date >= ?'; binds.push(weekStart()); }
  else if (period === 'month') { sql += ' AND business_date >= ?'; binds.push(monthStart()); }

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

  return { success: true };
}

async function deleteTransaction(env, session, id) {
  const existing = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
  if (!existing) throw httpError(404, 'Transaction not found');

  // Hard delete — mark as deleted (soft delete in DB) or actually DELETE for test records
  if (existing.is_test === 1) {
    await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
  } else {
    await env.DB.prepare(`
      UPDATE transactions SET status = 'deleted', updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(session.name, id).run();
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
  const today = todayStr();

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

// ─── Toys ────────────────────────────────────────────────────────────────────

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

async function collectToys(request, env, session) {
  const body = await request.json();
  const { amount, note } = body;

  if (!amount || amount <= 0) throw httpError(400, 'Amount required');

  const includeTest = await isTestMode(env);
  const isTest = includeTest ? 1 : 0;

  const result = await env.DB.prepare(`
    INSERT INTO transactions (business_date, type, wallet, amount, note, is_test, created_by, category)
    VALUES (?, 'toy_collected_by_owner', 'toys_monthly', ?, ?, ?, ?, 'Owner collection')
  `).bind(todayStr(), parseFloat(amount), note || null, isTest, session.name).run();

  return { id: result.meta.last_row_id, success: true };
}

// ─── Export CSV ──────────────────────────────────────────────────────────────

async function exportCsv(env, session, params) {
  const includeTest = params.get('show_test') === '1';
  const { testClause } = activeFilter(includeTest);

  const rows = await env.DB.prepare(`
    SELECT business_date, type, wallet, amount, category, note, status, is_test,
           created_by, created_at, void_reason, edit_reason
    FROM transactions WHERE ${testClause} AND status != 'deleted'
    ORDER BY created_at DESC
  `).all();

  const header = 'Date,Type,Wallet,Amount,Category,Note,Status,Test,Created By,Created At,Void Reason,Edit Reason\n';
  const lines = rows.results.map(r =>
    [r.business_date, r.type, r.wallet, r.amount, r.category, r.note, r.status,
     r.is_test ? 'YES' : 'NO', r.created_by, r.created_at, r.void_reason, r.edit_reason]
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
