/**
 * Worker screens — dashboard, received cash, expenses/removals, toys
 */

import * as api from './api.js?v=18';
import {
  formatBD, formatDate, todayLabel, showToast, showLoading, navigate,
  amountInput, noteInput, backHeader, screenLayout, EXPENSE_CATEGORIES,
  cashBreakdown, heroCashBlock, bindInstallButton, getState,
} from './app.js?v=18';

let workerDashboardHtml = '';
let workerToysHtml = '';
let workerActivityHtml = '';
let expenseOptionsCache = [
  'Potato', 'Petrol', 'Tea', 'Food products', 'Drinks', 'Packaging',
  'Cleaning', 'Maintenance', 'Delivery', 'Other',
];

const TYPE_OPTIONS = [
  ['cash_sale', 'Cash Received'],
  ['expense', 'Expense / Removal'],
  ['cash_taken_by_owner', 'Owner Took Cash'],
  ['cash_added_by_owner', 'Owner Added Cash'],
  ['benefitpay_sale', 'BenefitPay'],
  ['toy_collection', 'Toys Added'],
  ['toy_collected_by_owner', 'Toys Taken'],
  ['correction', 'Correction'],
];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function summaryCards(summary = {}) {
  const optional = [
    ['BenefitPay', summary.benefitpay_total, 'positive'],
    ['Owner Added', summary.owner_added_total, 'positive'],
    ['Toys Added', summary.toys_added_total, 'positive'],
    ['Toys Taken', summary.toys_taken_total, 'negative'],
  ].filter(([, amount]) => Math.abs(amount || 0) >= 0.0005);
  const cards = [
    ['Records', summary.count || 0, ''],
    ['Cash Sales', summary.cash_sales_total || 0, 'positive'],
    ['Expenses', summary.expense_total || 0, 'negative'],
    ['Owner Took', summary.owner_taken_total || 0, 'negative'],
    ...optional,
    ['Net Movement', summary.net_total || 0, ''],
  ];

  return `
    <div class="summary-strip">
      ${cards.map(([label, amount, cls]) => `
        <div>
          <span>${label}</span>
          <strong class="${cls}">${label === 'Records' ? amount : formatBD(amount)}</strong>
        </div>`).join('')}
    </div>`;
}

function isOverdrawError(err) {
  return (err?.message || '').includes('Enter a reason');
}

async function createTransactionWithOverdrawReason(payload) {
  try {
    return await api.createTransaction(payload);
  } catch (err) {
    if (!isOverdrawError(err)) throw err;
    const reason = prompt(`${err.message}\n\nReason required:`);
    if (!reason?.trim()) throw err;
    return api.createTransaction({ ...payload, overdraw_reason: reason.trim() });
  }
}

// ─── Bottom nav for worker ───────────────────────────────────────────────────

function workerBottomNav(active) {
  const items = [
    { id: 'worker-dashboard', icon: '🏠', label: 'Home' },
    { id: 'add-cash-sale', icon: '💵', label: 'Add Cash' },
    { id: 'add-expense', icon: '🧾', label: 'Expense' },
    { id: 'worker-toys', icon: '🎮', label: 'Toys' },
  ];
  return `
    <nav class="bottom-nav">
      ${items.map(i => `
        <button class="nav-item ${active === i.id ? 'active' : ''}" data-nav="${i.id}">
          <span class="nav-icon">${i.icon}</span>
          <span class="nav-label">${i.label}</span>
        </button>`).join('')}
    </nav>`;
}

// ─── Dashboard card helper ───────────────────────────────────────────────────

function statCard(label, value, { highlight = false } = {}) {
  return `
    <div class="stat-card ${highlight ? 'highlight' : ''}">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>`;
}

// ─── Screen renderers ────────────────────────────────────────────────────────

export function renderWorkerScreen(screen, data) {
  switch (screen) {
    case 'worker-dashboard': return workerDashboardHtml || '<div class="screen" id="worker-dash-loading"><div class="spinner center"></div></div>';
    case 'add-cash-sale': return renderAddCashSale();
    case 'owner-added-cash-worker': return renderOwnerCashMove('added');
    case 'owner-took-cash-worker': return renderOwnerCashMove('taken');
    case 'add-benefitpay': return renderAddBenefitPay();
    case 'add-expense': return renderAddExpense(expenseOptionsCache);
    case 'close-day': return '<div class="screen" id="close-day-loading"><div class="spinner center"></div></div>';
    case 'worker-toys': return workerToysHtml || '<div class="screen" id="toys-loading"><div class="spinner center"></div></div>';
    case 'worker-activity': return workerActivityHtml || '<div class="screen" id="activity-loading"><div class="spinner center"></div></div>';
    default: return '<div class="screen"><p>Screen not found</p></div>';
  }
}

async function renderWorkerDashboard(d) {
  const todayNet = (d.cash_sales_today || 0)
    + (d.cash_added_today || 0)
    - (d.expenses_today || 0)
    - (d.cash_taken_today || 0)
    + (d.corrections_today || 0);
  return screenLayout(`
    <header class="top-bar">
      <div>
        <p class="top-date">${todayLabel()}</p>
        <h1 class="top-title">Worker Dashboard</h1>
      </div>
      <button class="btn-icon" data-action="logout" title="Logout">⏻</button>
    </header>

    ${d.test_mode ? '<div class="test-banner">⚠️ Test Mode ON</div>' : ''}

    ${heroCashBlock(d, { label: 'Cash With Worker Now', sub: 'Previous balance + cash received + owner added - expenses/removals - owner taken' })}

    ${cashBreakdown(d, 'Cash With Worker Now')}

    <div class="section-title">Today And Month Summary</div>
    <div class="stat-grid">
      ${statCard('Previous Cash Balance', formatBD(d.opening_cash))}
      ${statCard('Cash Received Today', formatBD(d.cash_sales_today))}
      ${statCard('Expenses Today', formatBD(d.expenses_today))}
      ${statCard('Work Day Net Cash', formatBD(todayNet), { highlight: true })}
      ${statCard('Cash With Worker Now', formatBD(d.expected_cash_now), { highlight: true })}
      ${statCard('Expenses This Month', formatBD(d.month_expenses || 0))}
      ${statCard('Total Expenses', formatBD(d.total_expenses || 0))}
      ${statCard('Owner Added Today', formatBD(d.cash_added_today || 0))}
      ${statCard('Owner Took Today', formatBD(d.cash_taken_today || 0))}
      ${statCard('Toys Saved Separate', formatBD(d.toys_month_balance), { highlight: true })}
    </div>

    <div class="action-grid">
      <button class="action-btn" data-nav="add-cash-sale">
        <span class="action-icon">💵</span>
        <span>Add Cash Received</span>
      </button>
      <button class="action-btn" data-nav="add-expense">
        <span class="action-icon">🧾</span>
        <span>Add Expense / Removal</span>
      </button>
      <button class="action-btn" data-nav="owner-added-cash-worker">
        <span class="action-icon">+</span>
        <span>Owner Added Cash</span>
      </button>
      <button class="action-btn" data-nav="owner-took-cash-worker">
        <span class="action-icon">-</span>
        <span>Owner Took Cash</span>
      </button>
      <button class="action-btn" data-nav="worker-toys">
        <span class="action-icon">🎮</span>
        <span>Toys Money</span>
      </button>
      <button class="action-btn hidden" id="install-app-btn">
        <span class="action-icon">APP</span>
        <span>Install App</span>
      </button>
    </div>
    <button class="btn btn-secondary btn-full" data-nav="worker-activity">Activity Details</button>
  `, { bottomNav: workerBottomNav('worker-dashboard') });
}

function renderAddCashSale() {
  return screenLayout(`
    ${backHeader('Add Cash Received')}
    <form id="cash-sale-form" class="form-screen">
      ${amountInput('amount', 'Cash Amount')}
      ${noteInput()}
      <button type="submit" class="btn btn-primary btn-full btn-lg">Save Cash Received</button>
    </form>
  `, { bottomNav: workerBottomNav('add-cash-sale') });
}

function renderAddBenefitPay() {
  return screenLayout(`
    ${backHeader('Add BenefitPay Sale')}
    <div class="info-box">BenefitPay goes to the owner and does not change worker cash.</div>
    <form id="benefitpay-form" class="form-screen">
      ${amountInput('amount', 'Sale Amount')}
      ${noteInput()}
      <button type="submit" class="btn btn-primary btn-full btn-lg">Save BenefitPay Sale</button>
    </form>
  `, { bottomNav: workerBottomNav('add-cash-sale') });
}

function renderAddExpense(options = EXPENSE_CATEGORIES) {
  const cats = options.map(c =>
    `<option value="${c}">${c}</option>`,
  ).join('');

  return screenLayout(`
    ${backHeader('Add Expense / Removal')}
    <form id="expense-form" class="form-screen">
      ${amountInput('amount', 'Amount Used')}
      <div class="form-group">
        <label for="category">Paid For / Company</label>
        <select id="category" required>
          <option value="">Select what this money was used for...</option>
          ${cats}
        </select>
      </div>
      ${noteInput()}
      <button type="submit" class="btn btn-danger btn-full btn-lg">Save Expense / Removal</button>
    </form>
  `, { bottomNav: workerBottomNav('add-expense') });
}

function labelForWorker(type) {
  const labels = {
    cash_sale: 'Cash Received',
    expense: 'Expense / Removal',
    cash_taken_by_owner: 'Owner Took Cash',
    cash_added_by_owner: 'Owner Added Cash',
    toy_collection: 'Toys Money Added',
    toy_collected_by_owner: 'Toys Money Taken',
    correction: 'Correction',
  };
  return labels[type] || type;
}

function renderOwnerCashMove(kind) {
  const isAdded = kind === 'added';
  return screenLayout(`
    ${backHeader(isAdded ? 'Owner Added Cash' : 'Owner Took Cash')}
    <form id="owner-cash-move-form" class="form-screen" data-kind="${kind}">
      <div class="info-box">${isAdded
        ? 'Use this when the owner gives cash to the worker.'
        : 'Use this when the owner takes cash from the worker.'}</div>
      ${amountInput('amount', isAdded ? 'Amount Owner Added' : 'Amount Owner Took')}
      ${noteInput()}
      <button type="submit" class="btn ${isAdded ? 'btn-success' : 'btn-warning'} btn-full btn-lg">${isAdded ? 'Save Cash Added' : 'Save Cash Taken'}</button>
    </form>
  `, { bottomNav: workerBottomNav('worker-dashboard') });
}

async function renderCloseDay(d) {
  return screenLayout(`
    ${backHeader('Close Day')}
    <div class="hero-card secondary">
      <p class="hero-label">Cash With You Now</p>
      <p class="hero-value">${formatBD(d.expected_cash_now)}</p>
    </div>
    <form id="close-day-form" class="form-screen">
      ${amountInput('actual_cash', 'Actual Cash Counted')}
      ${noteInput()}
      <button type="submit" class="btn btn-primary btn-full btn-lg">Close Day & Save</button>
    </form>
    <p class="form-hint">Actual cash becomes tomorrow's opening cash.</p>
  `, { bottomNav: workerBottomNav('close-day') });
}

async function renderWorkerToys(d) {
  const history = (d.history || []).slice(0, 20);
  return screenLayout(`
    ${backHeader('Toys Money')}
    <div class="hero-card toys">
      <p class="hero-label">Toys Money Saved</p>
      <p class="hero-value">${formatBD(d.balance)}</p>
      <p class="hero-sub">Separate from worker cash</p>
    </div>
    <form id="toys-form" class="form-card">
      <h3>Add Toys Money</h3>
      ${amountInput('amount', 'Coins Collected')}
      <div class="form-group">
        <label for="source">Source / Machine Name</label>
        <input type="text" id="source" placeholder="e.g. Claw Machine 1" required>
      </div>
      ${noteInput()}
      <button type="submit" class="btn btn-primary btn-full btn-lg">Save Collection</button>
    </form>
    <form id="toys-taken-form" class="form-card">
      <h3>Toys Money Taken</h3>
      <div class="info-box">Use this when the owner takes money from the toys box.</div>
      ${amountInput('toys-taken-amount', 'Amount Taken')}
      ${noteInput('toys-taken-note')}
      <button type="submit" class="btn btn-warning btn-full">Save Toys Money Taken</button>
    </form>
    ${history.length ? `
      <div class="section-title">Toys History</div>
      <div class="tx-list compact">
        ${history.map(t => `
          <div class="tx-row ${t.is_test ? 'test' : ''}">
            <div class="tx-main">
              <span class="tx-type">${t.category || labelForWorker(t.type)}</span>
              <span class="tx-amount ${t.type === 'toy_collected_by_owner' ? 'negative' : 'positive'}">${t.type === 'toy_collected_by_owner' ? '-' : '+'}${formatBD(t.amount)}</span>
            </div>
            <div class="tx-meta">${t.business_date} &middot; ${labelForWorker(t.type)}${t.is_test ? ' <span class="badge-test">TEST</span>' : ''}</div>
            ${t.note ? `<div class="tx-note">${t.note}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}
  `, { bottomNav: workerBottomNav('worker-toys') });
}

// ─── Screen bindings ───────────────────────────────────────────────────────────

function renderWorkerActivity(data) {
  const filters = data.filters || { period: data.period || 'today' };
  const period = filters.period || '';
  const activity = data.activity || [];

  return screenLayout(`
    ${backHeader('Activity Details')}
    <form id="activity-filter-form" class="filter-panel">
      <input type="search" id="activity-q" placeholder="Search mint, toys, date, note..." value="${esc(filters.q)}">
      <div class="filter-grid">
        <select id="activity-period">
          <option value="" ${!period ? 'selected' : ''}>All Time</option>
          <option value="today" ${period === 'today' ? 'selected' : ''}>Today</option>
          <option value="yesterday" ${period === 'yesterday' ? 'selected' : ''}>Yesterday</option>
          <option value="week" ${period === 'week' ? 'selected' : ''}>This Week</option>
          <option value="month" ${period === 'month' ? 'selected' : ''}>This Month</option>
          <option value="quarter" ${period === 'quarter' ? 'selected' : ''}>This Quarter</option>
          <option value="year" ${period === 'year' ? 'selected' : ''}>This Year</option>
        </select>
        <select id="activity-wallet">
          <option value="" ${!filters.wallet ? 'selected' : ''}>All Wallets</option>
          <option value="daily_cash" ${filters.wallet === 'daily_cash' ? 'selected' : ''}>Daily Cash</option>
          <option value="benefitpay" ${filters.wallet === 'benefitpay' ? 'selected' : ''}>BenefitPay</option>
          <option value="toys_monthly" ${filters.wallet === 'toys_monthly' ? 'selected' : ''}>Toys</option>
        </select>
        <select id="activity-type">
          <option value="" ${!filters.type ? 'selected' : ''}>All Types</option>
          ${TYPE_OPTIONS.map(([value, label]) => `<option value="${value}" ${filters.type === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="filter-grid date-grid">
        <label>From <input type="date" id="activity-date-from" value="${esc(filters.date_from)}"></label>
        <label>To <input type="date" id="activity-date-to" value="${esc(filters.date_to)}"></label>
      </div>
      <div class="filter-actions">
        <button type="submit" class="btn btn-primary">Search</button>
        <button type="button" class="btn btn-secondary" id="activity-clear">Clear</button>
      </div>
    </form>
    ${summaryCards(data.summary)}
    <div class="info-box">Read-only list of money movement. Worker can view records here but cannot edit or delete.</div>
    <div class="tx-list compact">
      ${activity.length === 0 ? '<p class="empty-msg">No activity found</p>' : activity.map(t => {
        const negative = ['expense', 'cash_taken_by_owner', 'toy_collected_by_owner'].includes(t.type);
        return `
          <div class="tx-row ${t.is_test ? 'test' : ''}">
            <div class="tx-main">
              <span class="tx-type">${t.category || labelForWorker(t.type)}</span>
              <span class="tx-amount ${negative ? 'negative' : 'positive'}">${negative ? '-' : '+'}${formatBD(t.amount)}</span>
            </div>
            <div class="tx-meta">${t.business_date} &middot; ${labelForWorker(t.type)}${t.created_by ? ` &middot; By ${t.created_by}` : ''}</div>
            ${t.note ? `<div class="tx-note">${t.note}</div>` : ''}
          </div>`;
      }).join('')}
    </div>
  `, { bottomNav: workerBottomNav('worker-activity') });
}

export function workerScreens(screen, data) {
  switch (screen) {
    case 'worker-dashboard': loadWorkerDashboard(); break;
    case 'add-cash-sale': bindCashSaleForm(); break;
    case 'owner-added-cash-worker': bindOwnerCashMoveForm('added'); break;
    case 'owner-took-cash-worker': bindOwnerCashMoveForm('taken'); break;
    case 'add-benefitpay': bindBenefitPayForm(); break;
    case 'add-expense': bindExpenseForm(); break;
    case 'close-day': loadCloseDay(); break;
    case 'worker-toys': loadWorkerToys(); break;
    case 'worker-activity': loadWorkerActivity(data?.filters || { period: data?.period || 'month' }); break;
  }
}

async function loadWorkerDashboard() {
  try {
    api.getExpenseOptions()
      .then((options) => { expenseOptionsCache = options.options || expenseOptionsCache; })
      .catch(() => {});

    const d = await api.getWorkerDashboard();
    workerDashboardHtml = await renderWorkerDashboard(d);
    if (getState().screen !== 'worker-dashboard' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = workerDashboardHtml;
    // Re-bind nav events
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
    document.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      import('./app.js?v=18').then(m => m.logout());
    });
    bindInstallButton('install-app-btn');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function bindCashSaleForm() {
  document.getElementById('cash-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value.trim();
    try {
      showLoading(true);
      await api.createTransaction({ type: 'cash_sale', amount, note: note || undefined });
      workerDashboardHtml = '';
      showToast('Cash received saved', 'success');
      navigate('worker-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}

function bindBenefitPayForm() {
  document.getElementById('benefitpay-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value.trim();
    try {
      showLoading(true);
      await api.createTransaction({ type: 'benefitpay_sale', amount, note: note || undefined });
      showToast('BenefitPay sale saved', 'success');
      navigate('worker-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}

function bindExpenseForm() {
  api.getExpenseOptions().then((res) => {
    expenseOptionsCache = res.options || expenseOptionsCache;
    const select = document.getElementById('category');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Select what this money was used for...</option>'
      + expenseOptionsCache.map(c => `<option value="${c}">${c}</option>`).join('');
    if (expenseOptionsCache.includes(current)) select.value = current;
  }).catch(() => {});

  document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value.trim();
    try {
      showLoading(true);
      await createTransactionWithOverdrawReason({ type: 'expense', amount, category, note: note || undefined });
      workerDashboardHtml = '';
      showToast('Expense / removal saved', 'success');
      navigate('worker-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}

function bindOwnerCashMoveForm(kind) {
  document.getElementById('owner-cash-move-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value.trim();
    try {
      showLoading(true);
      await createTransactionWithOverdrawReason({
        type: kind === 'added' ? 'cash_added_by_owner' : 'cash_taken_by_owner',
        amount,
        note: note || undefined,
      });
      workerDashboardHtml = '';
      showToast(kind === 'added' ? 'Owner cash added saved' : 'Owner cash taken saved', 'success');
      navigate('worker-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}

async function loadCloseDay() {
  try {
    const d = await api.getWorkerDashboard();
    document.getElementById('app').innerHTML = await renderCloseDay(d);
    document.querySelector('[data-action="back"]')?.addEventListener('click', () => navigate('worker-dashboard'));
    document.getElementById('close-day-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const actual_cash = parseFloat(document.getElementById('actual_cash').value);
      const note = document.getElementById('note').value.trim();
      if (!confirm('Close the day? This cannot be undone without owner help.')) return;
      try {
        showLoading(true);
        const res = await api.closeDay({ actual_cash, note: note || undefined });
        const diff = res.difference;
        showToast(`Day closed. Difference: ${formatBD(diff)}`, diff === 0 ? 'success' : 'info');
        navigate('worker-dashboard');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadWorkerToys() {
  try {
    const d = await api.getToysMonth();
    workerToysHtml = await renderWorkerToys(d);
    document.getElementById('app').innerHTML = workerToysHtml;
    document.querySelector('[data-action="back"]')?.addEventListener('click', () => navigate('worker-dashboard'));
    document.getElementById('toys-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('amount').value);
      const source = document.getElementById('source').value.trim();
      const note = document.getElementById('note').value.trim();
      try {
        showLoading(true);
        await api.createTransaction({ type: 'toy_collection', amount, source, note: note || undefined });
        workerToysHtml = '';
        workerDashboardHtml = '';
        showToast('Toys collection saved', 'success');
        loadWorkerToys();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    });
    document.getElementById('toys-taken-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('toys-taken-amount').value);
      const note = document.getElementById('toys-taken-note').value.trim();
      try {
        showLoading(true);
        await createTransactionWithOverdrawReason({
          type: 'toy_collected_by_owner',
          amount,
          category: 'Owner took toys money',
          note: note || undefined,
        });
        workerToysHtml = '';
        workerDashboardHtml = '';
        showToast('Toys money taken saved', 'success');
        loadWorkerToys();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadWorkerActivity(filters = { period: 'month' }) {
  try {
    const params = { ...filters, limit: 500 };
    if (!params.period) delete params.period;
    const data = await api.getActivity(params);
    workerActivityHtml = renderWorkerActivity({ ...data, filters });
    if (getState().screen !== 'worker-activity' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = workerActivityHtml;
    document.querySelector('[data-action="back"]')?.addEventListener('click', () => navigate('worker-dashboard'));
    document.getElementById('activity-filter-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      navigate('worker-activity', { filters: readWorkerActivityFilters() });
    });
    document.getElementById('activity-clear')?.addEventListener('click', () => {
      navigate('worker-activity', { filters: {} });
    });
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function readWorkerActivityFilters() {
  const filters = {
    q: document.getElementById('activity-q')?.value.trim(),
    period: document.getElementById('activity-period')?.value,
    wallet: document.getElementById('activity-wallet')?.value,
    type: document.getElementById('activity-type')?.value,
    date_from: document.getElementById('activity-date-from')?.value,
    date_to: document.getElementById('activity-date-to')?.value,
  };
  Object.keys(filters).forEach((key) => {
    if (!filters[key]) delete filters[key];
  });
  return filters;
}
