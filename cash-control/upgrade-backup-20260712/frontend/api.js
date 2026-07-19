/**
 * API client — all backend communication goes through here.
 * PINs are never stored or sent except during login.
 */

const API_BASE = '';
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTLS = {
  '/api/settings': 30000,
  '/api/expense-options': 30000,
  '/api/toys/month': 10000,
  '/api/dashboard/worker': 8000,
  '/api/dashboard/owner': 8000,
  '/api/activity': 5000,
};

localStorage.removeItem('cc_token');
let authToken = sessionStorage.getItem('cc_token') || null;
let currentScreen = 'init';
const responseCache = new Map();
const pendingRequests = new Map();

export function setCurrentScreen(screen) {
  currentScreen = screen || 'unknown';
}

function cacheBasePath(path) {
  return path.split('?')[0];
}

function cacheKey(path) {
  return path;
}

function cacheTtl(path) {
  return CACHE_TTLS[cacheBasePath(path)] || 0;
}

function logPerf(path, duration, source, extra = '') {
  const suffix = extra ? ` ${extra}` : '';
  console.log(`[CashControl PERF] screen=${currentScreen} endpoint=${path} duration=${duration}ms source=${source}${suffix}`);
}

function invalidateCache() {
  responseCache.clear();
}

export function setToken(token) {
  authToken = token;
  if (token) {
    sessionStorage.setItem('cc_token', token);
  } else {
    sessionStorage.removeItem('cc_token');
  }
  localStorage.removeItem('cc_token');
}

export function getToken() {
  return authToken;
}

export function clearAuth() {
  setToken(null);
  sessionStorage.removeItem('cc_role');
  sessionStorage.removeItem('cc_name');
  localStorage.removeItem('cc_role');
  localStorage.removeItem('cc_name');
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const key = `${method}:${cacheKey(path)}:${options.body || ''}`;
  const ttl = method === 'GET' ? cacheTtl(path) : 0;
  const started = Date.now();

  if (ttl > 0) {
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.time < ttl) {
      logPerf(path, Date.now() - started, 'cache');
      return cached.data;
    }
  }

  if (pendingRequests.has(key)) {
    logPerf(path, Date.now() - started, 'pending', 'deduped=true');
    return pendingRequests.get(key);
  }

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const promise = (async () => {
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });

      if (res.status === 401 && path !== '/api/login') {
        clearAuth();
        window.dispatchEvent(new Event('auth-expired'));
        throw new Error('Session expired. Please login again.');
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('text/csv')) {
        logPerf(path, Date.now() - started, 'network');
        return res;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      if (ttl > 0) responseCache.set(key, { data, time: Date.now() });
      if (method !== 'GET') invalidateCache();
      logPerf(path, Date.now() - started, 'network');
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check connection and try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function login(pin, role) {
  return request('/api/login', { method: 'POST', body: JSON.stringify({ pin, role }) });
}

// ─── Dashboards ──────────────────────────────────────────────────────────────

export function getWorkerDashboard() {
  return request('/api/dashboard/worker');
}

export function getOwnerDashboard() {
  return request('/api/dashboard/owner');
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export function createTransaction(data) {
  return request('/api/transactions', { method: 'POST', body: JSON.stringify(data) });
}

export function getTransactions(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/transactions?${qs}`);
}

export function getActivity(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/activity?${qs}`);
}

export function updateTransaction(id, data) {
  return request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function voidTransaction(id, void_reason) {
  return request(`/api/transactions/${id}/void`, { method: 'POST', body: JSON.stringify({ void_reason }) });
}

export function deleteTransaction(id) {
  return request(`/api/transactions/${id}`, { method: 'DELETE' });
}

// ─── Closing ─────────────────────────────────────────────────────────────────

export function closeDay(data) {
  return request('/api/closing', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Toys ────────────────────────────────────────────────────────────────────

export function getToysMonth() {
  return request('/api/toys/month');
}

export function collectToys(data) {
  return request('/api/toys/collect', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSettings() {
  return request('/api/settings');
}

export function updateSettings(data) {
  return request('/api/settings', { method: 'PUT', body: JSON.stringify(data) });
}

export function getExpenseOptions() {
  return request('/api/expense-options');
}

export function updateExpenseOptions(options) {
  return request('/api/expense-options', { method: 'PUT', body: JSON.stringify({ options }) });
}

export function deleteAllTestData() {
  return request('/api/test-data', { method: 'DELETE' });
}

export function bulkVoidTransactions(ids, void_reason) {
  return request('/api/transactions/bulk-void', { method: 'POST', body: JSON.stringify({ ids, void_reason }) });
}

export function bulkDeleteTransactions(ids) {
  return request('/api/transactions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}

export function setOpeningCash(amount, note) {
  return request('/api/opening-cash', { method: 'POST', body: JSON.stringify({ amount, note }) });
}

export function getClosings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/closings?${qs}`);
}

export function voidClosing(id, void_reason) {
  return request(`/api/closings/${id}/void`, { method: 'POST', body: JSON.stringify({ void_reason }) });
}

export function deleteClosing(id) {
  return request(`/api/closings/${id}`, { method: 'DELETE' });
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportCsv(showTest = false) {
  const qs = showTest ? '?show_test=1' : '';
  const res = await request(`/api/export.csv${qs}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cash-control-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Owner cash actions ──────────────────────────────────────────────────────

export function cashTakenByOwner(amount, note, overdraw_reason) {
  return createTransaction({ type: 'cash_taken_by_owner', amount, note, overdraw_reason });
}

export function cashAddedToWorker(amount, note) {
  return createTransaction({ type: 'cash_added_by_owner', amount, note });
}

export function addCorrection(amount, note) {
  return createTransaction({ type: 'correction', amount, note });
}
