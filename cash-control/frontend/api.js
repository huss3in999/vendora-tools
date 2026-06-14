/**
 * API client — all backend communication goes through here.
 * PINs are never stored or sent except during login.
 */

const API_BASE = '';

let authToken = sessionStorage.getItem('cc_token') || null;

export function setToken(token) {
  authToken = token;
  if (token) sessionStorage.setItem('cc_token', token);
  else sessionStorage.removeItem('cc_token');
}

export function getToken() {
  return authToken;
}

export function clearAuth() {
  setToken(null);
  sessionStorage.removeItem('cc_role');
  sessionStorage.removeItem('cc_name');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event('auth-expired'));
    throw new Error('Session expired. Please login again.');
  }

  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('text/csv')) return res;

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function login(pin) {
  return request('/api/login', { method: 'POST', body: JSON.stringify({ pin }) });
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

export function deleteAllTestData() {
  return request('/api/test-data', { method: 'DELETE' });
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

export function cashTakenByOwner(amount, note) {
  return createTransaction({ type: 'cash_taken_by_owner', amount, note });
}

export function cashAddedToWorker(amount, note) {
  return createTransaction({ type: 'cash_added_by_owner', amount, note });
}

export function addCorrection(amount, note) {
  return createTransaction({ type: 'correction', amount, note });
}
