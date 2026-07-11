/**
 * Cash Control — Main app router, login, shared UI helpers
 */

import * as api from './api.js?v=18';
import { renderWorkerScreen, workerScreens } from './worker.js?v=18';
import { renderOwnerScreen, ownerScreens } from './owner.js?v=18';

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  role: sessionStorage.getItem('cc_role') || null,
  name: sessionStorage.getItem('cc_name') || null,
  screen: 'login',
  screenData: {},
};

localStorage.removeItem('cc_role');
localStorage.removeItem('cc_name');

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatBD(amount) {
  const parsed = parseFloat(amount) || 0;
  const n = Math.abs(parsed) < 0.0005 ? 0 : parsed;
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
  api.setCurrentScreen(screen);
  render();
}

export function getState() {
  return state;
}

export function logout() {
  api.clearAuth();
  state.role = null;
  state.name = null;
  localStorage.removeItem('cc_role');
  localStorage.removeItem('cc_name');
  navigate('login');
}

// ─── Expense categories ──────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  'Potato', 'Petrol', 'Tea', 'Food products', 'Drinks', 'Packaging',
  'Cleaning', 'Maintenance', 'Delivery', 'Other',
];

// ─── Transaction type labels ─────────────────────────────────────────────────

export const TYPE_LABELS = {
  cash_sale: 'Cash Received',
  benefitpay_sale: 'BenefitPay',
  expense: 'Expense',
  cash_taken_by_owner: 'Owner Took Cash',
  cash_added_by_owner: 'Owner Added Cash',
  closing_count: 'Cash Count',
  toy_collection: 'Toys Collection',
  toy_collected_by_owner: 'Toys Money Taken',
  correction: 'Correction',
};

export const WALLET_LABELS = {
  daily_cash: 'Daily Cash',
  benefitpay: 'BenefitPay',
  toys_monthly: 'Toys',
};

// ─── Cash breakdown (worker + owner dashboards) ──────────────────────────────

/**
 * @param {object} d - dashboard data with opening, sales, expenses, total
 * @param {string} totalLabel - label for the final total row
 * @param {string} totalKey - property name for total amount
 */
export function cashBreakdown(d, totalLabel = 'Total Cash Now', totalKey = 'expected_cash_now', options = {}) {
  const total = d[totalKey] ?? 0;
  const baseLabel = options.baseLabel || 'Previous Cash Balance';
  const rows = [
    { label: baseLabel, amount: d.opening_cash || 0, type: 'base' },
    { label: 'Cash Received Today', amount: d.cash_sales_today ?? d.today_cash_sales ?? 0, type: 'add' },
    { label: "Expenses / Removals Today", amount: d.expenses_today ?? d.today_expenses ?? 0, type: 'sub' },
  ];
  const added = d.cash_added_today || 0;
  const taken = d.cash_taken_today || 0;
  const corrections = d.corrections_today || 0;
  if (added > 0) rows.push({ label: 'Cash Added by Owner', amount: added, type: 'add' });
  if (taken > 0) rows.push({ label: 'Cash Taken by Owner', amount: taken, type: 'sub' });
  if (corrections) rows.push({ label: 'Corrections', amount: Math.abs(corrections), type: corrections >= 0 ? 'add' : 'sub' });

  const rowHtml = rows.map(r => {
    const prefix = r.type === 'add' ? '+' : r.type === 'sub' ? '−' : '';
    const cls = r.type === 'add' ? 'add' : r.type === 'sub' ? 'sub' : 'base';
    return `
      <div class="breakdown-row ${cls}">
        <span class="breakdown-label">${prefix ? `<span class="breakdown-sign">${prefix}</span>` : ''}${r.label}</span>
        <span class="breakdown-amt">${formatBD(r.amount)}</span>
      </div>`;
  }).join('');

  const opening = d.opening_cash || 0;
  const lastActual = d.last_closing_actual ?? d.last_actual_closing;
  const lastDate = d.last_closing_date;
  let hint = '';
  if (opening > 0) {
    hint = `<p class="breakdown-hint">${formatBD(opening)} is cash carried from previous days before today's entries.</p>`;
  } else {
    hint = '<p class="breakdown-hint">No previous cash balance before today.</p>';
  }

  if (getState().role === 'owner') {
    hint += `<button class="btn-sm" style="margin: 8px auto 0; display: block;" data-nav="manage-entries">Manage Entries</button>`;
  }

  return `
    <div class="cash-breakdown">
      <div class="section-title">How this total is calculated</div>
      ${rowHtml}
      <div class="breakdown-row total">
        <span class="breakdown-label">= ${totalLabel}</span>
        <span class="breakdown-amt">${formatBD(total)}</span>
      </div>
      ${hint}
    </div>`;
}

/** Big hero block: total on top, before today + sales today visible immediately */
export function heroCashBlock(d, { totalKey = 'expected_cash_now', label = 'Total Cash Now', sub = 'All cash the worker has right now', heroClass = '', baseLabel = 'Previous Cash Balance' } = {}) {
  const total = d[totalKey] ?? 0;
  const opening = d.opening_cash || 0;
  const sales = d.cash_sales_today ?? d.today_cash_sales ?? 0;
  const expenses = d.expenses_today ?? d.today_expenses ?? 0;
  const taken = d.cash_taken_today || 0;

  return `
    <div class="hero-card ${heroClass}">
      <p class="hero-label">${label}</p>
      <p class="hero-value">${formatBD(total)}</p>
      <p class="hero-sub">${sub}</p>
      <div class="hero-quick-stats">
        <div class="quick-stat">
          <span class="quick-label">${baseLabel}</span>
          <span class="quick-value">${formatBD(opening)}</span>
        </div>
        <div class="quick-stat highlight-stat">
          <span class="quick-label">Cash Received Today</span>
          <span class="quick-value">${formatBD(sales)}</span>
        </div>
      </div>
      ${expenses > 0 || taken > 0 ? `
        <div class="hero-deduct">
          ${expenses > 0 ? `<span>− Expenses / Removals Today: ${formatBD(expenses)}</span>` : ''}
          ${taken > 0 ? `<span>− Taken by Owner: ${formatBD(taken)}</span>` : ''}
        </div>` : ''}
    </div>`;
}

// ─── PWA — owner only can install ────────────────────────────────────────────

let deferredInstallPrompt = null;

export function setupPwaForRole() {
  // Keep the manifest available for both owner and worker installs.
  document.querySelector('link[rel="manifest"]')?.remove();
  document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.remove();

  if (false) {
    return;
  }

  // Enable PWA install and service worker for all logged-in roles.
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
  }
  const appleCap = document.createElement('meta');
  appleCap.name = 'apple-mobile-web-app-capable';
  appleCap.content = 'yes';
  document.head.appendChild(appleCap);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function refreshInstallButton(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('hidden', isStandaloneApp() || !deferredInstallPrompt);
}

export function bindInstallButton(btnId = 'install-app-btn') {
  refreshInstallButton(btnId);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    refreshInstallButton(btnId);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    refreshInstallButton(btnId);
  });

  document.getElementById(btnId)?.addEventListener('click', async () => {
    if (isStandaloneApp()) {
      refreshInstallButton(btnId);
      return;
    }
    if (!deferredInstallPrompt) {
      showToast('Use browser menu → Add to Home screen', 'info');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    refreshInstallButton(btnId);
  });
}

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
        <button type="submit" class="btn btn-primary btn-full" data-role="owner">Login as Owner</button>
        <button type="submit" class="btn btn-secondary btn-full" data-role="worker" style="margin-top:10px">Login as Worker</button>
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
    const role = e.submitter?.dataset?.role || 'owner';
    try {
      showLoading(true);
      const res = await api.login(pin, role);
      api.setToken(res.token);
      state.role = res.role;
      state.name = res.name;
      sessionStorage.setItem('cc_role', res.role);
      sessionStorage.setItem('cc_name', res.name);
      navigate(res.role === 'owner' ? 'owner-dashboard' : 'worker-dashboard');
      showToast(`Welcome, ${res.name}`, 'success');
      setupPwaForRole(res.role);
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
  api.setCurrentScreen(state.screen);

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

// Init auto-navigate if session exists
if (state.role && api.getToken()) {
  setupPwaForRole(state.role);
  navigate(state.role === 'owner' ? 'owner-dashboard' : 'worker-dashboard');
} else {
  render();
}
