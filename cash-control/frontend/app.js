/**
 * Cash Control — Main app router, login, shared UI helpers
 */

import * as api from './api.js';
import { renderWorkerScreen, workerScreens } from './worker.js';
import { renderOwnerScreen, ownerScreens } from './owner.js';

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  role: sessionStorage.getItem('cc_role') || null,
  name: sessionStorage.getItem('cc_name') || null,
  screen: 'login',
  screenData: {},
};

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatBD(amount) {
  const n = parseFloat(amount) || 0;
  return `BD ${n.toFixed(3)}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function todayLabel() {
  return formatDate(new Date().toISOString().slice(0, 10));
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3000);
}

export function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

export function navigate(screen, data = {}) {
  state.screen = screen;
  state.screenData = data;
  render();
}

export function getState() {
  return state;
}

export function logout() {
  api.clearAuth();
  state.role = null;
  state.name = null;
  navigate('login');
}

// ─── Expense categories ──────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  'Food products', 'Drinks', 'Packaging', 'Cleaning',
  'Maintenance', 'Delivery', 'Other',
];

// ─── Transaction type labels ─────────────────────────────────────────────────

export const TYPE_LABELS = {
  cash_sale: 'Cash Sale',
  benefitpay_sale: 'BenefitPay',
  expense: 'Expense',
  cash_taken_by_owner: 'Cash Taken',
  cash_added_by_owner: 'Cash Added',
  closing_count: 'Day Closing',
  toy_collection: 'Toys Collection',
  toy_collected_by_owner: 'Toys Collected',
  correction: 'Correction',
};

export const WALLET_LABELS = {
  daily_cash: 'Daily Cash',
  benefitpay: 'BenefitPay',
  toys_monthly: 'Toys',
};

// ─── Shared form components ──────────────────────────────────────────────────

export function amountInput(id, label, value = '') {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <div class="input-prefix">
        <span class="prefix">BD</span>
        <input type="number" id="${id}" inputmode="decimal" step="0.001" min="0.001"
               placeholder="0.000" value="${value}" required>
      </div>
    </div>`;
}

export function noteInput(id = 'note', value = '') {
  return `
    <div class="form-group">
      <label for="${id}">Note <span class="optional">(optional)</span></label>
      <textarea id="${id}" rows="2" placeholder="Add a note...">${value}</textarea>
    </div>`;
}

export function backHeader(title) {
  return `
    <header class="screen-header">
      <button class="btn-back" data-action="back" aria-label="Go back">←</button>
      <h1>${title}</h1>
    </header>`;
}

export function screenLayout(content, { bottomNav = '' } = {}) {
  return `<div class="screen">${content}${bottomNav}</div>`;
}

// ─── Login screen ──────────────────────────────────────────────────────────────

function renderLogin() {
  return screenLayout(`
    <div class="login-screen">
      <div class="login-logo">💰</div>
      <h1 class="login-title">Cash Control</h1>
      <p class="login-sub">Food Cart Cash Manager</p>
      <form id="login-form" class="login-form">
        <div class="pin-display" id="pin-display">••••</div>
        <input type="password" id="pin-input" inputmode="numeric" pattern="[0-9]*"
               maxlength="20" autocomplete="off" class="pin-hidden" aria-label="PIN">
        <div class="pin-pad" id="pin-pad">
          ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k => {
            if (k === '') return '<button type="button" class="pin-key empty" disabled></button>';
            return `<button type="button" class="pin-key" data-key="${k}">${k}</button>`;
          }).join('')}
        </div>
        <button type="submit" class="btn btn-primary btn-full">Login</button>
      </form>
    </div>
  `);
}

function bindLogin() {
  const input = document.getElementById('pin-input');
  const display = document.getElementById('pin-display');

  document.getElementById('pin-pad').addEventListener('click', (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    if (key === '⌫') {
      input.value = input.value.slice(0, -1);
    } else {
      input.value += key;
    }
    display.textContent = '•'.repeat(input.value.length) || '••••';
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = input.value.trim();
    if (!pin) return showToast('Enter your PIN', 'error');
    try {
      showLoading(true);
      const res = await api.login(pin);
      api.setToken(res.token);
      state.role = res.role;
      state.name = res.name;
      sessionStorage.setItem('cc_role', res.role);
      sessionStorage.setItem('cc_name', res.name);
      navigate(res.role === 'owner' ? 'owner-dashboard' : 'worker-dashboard');
      showToast(`Welcome, ${res.name}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      input.value = '';
      display.textContent = '••••';
    } finally {
      showLoading(false);
    }
  });
}

// ─── Render router ───────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');
  let html = '';

  if (!state.role || state.screen === 'login') {
    html = renderLogin();
  } else if (state.role === 'worker') {
    html = renderWorkerScreen(state.screen, state.screenData);
  } else if (state.role === 'owner') {
    html = renderOwnerScreen(state.screen, state.screenData);
  }

  app.innerHTML = html;
  bindEvents();
}

function bindEvents() {
  if (!state.role) { bindLogin(); return; }

  // Back buttons
  document.querySelectorAll('[data-action="back"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const home = state.role === 'owner' ? 'owner-dashboard' : 'worker-dashboard';
      navigate(home);
    });
  });

  // Bottom nav
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });

  // Logout
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', logout);
  });

  // Delegate screen-specific bindings
  if (state.role === 'worker') workerScreens(state.screen, state.screenData);
  if (state.role === 'owner') ownerScreens(state.screen, state.screenData);
}

// ─── Init ────────────────────────────────────────────────────────────────────

window.addEventListener('auth-expired', () => {
  showToast('Session expired', 'error');
  logout();
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

// Auto-navigate if session exists
if (state.role && api.getToken()) {
  navigate(state.role === 'owner' ? 'owner-dashboard' : 'worker-dashboard');
} else {
  render();
}
