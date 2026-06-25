/**
 * Worker screens — dashboard, received cash, expenses/removals, toys
 */

import * as api from './api.js?v=13';
import {
  formatBD, formatDate, todayLabel, showToast, showLoading, navigate,
  amountInput, noteInput, backHeader, screenLayout, EXPENSE_CATEGORIES,
  cashBreakdown, heroCashBlock, bindInstallButton, getState,
} from './app.js?v=13';

let workerDashboardHtml = '';
let workerToysHtml = '';
let workerActivityHtml = '';
let expenseOptionsCache = [
  'Potato', 'Petrol', 'Tea', 'Food products', 'Drinks', 'Packaging',
  'Cleaning', 'Maintenance', 'Delivery', 'Other',
];

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
      ${statCard('Owner Added Today', formatBD(d.cash_added_today || 0))}
      ${statCard('Owner Took Today', formatBD(d.cash_taken_today || 0))}
      ${statCard('Toys This Month Separate', formatBD(d.toys_month_balance), { highlight: true })}
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
      <p class="hero-label">Toys Money This Month</p>
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
      <div class="section-title">This Month Toys History</div>
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
  const period = data.period || 'today';
  const activity = data.activity || [];
  const periodButtons = ['today', 'month', 'year', 'all'].map((p) => `
    <button class="btn-sm ${period === p ? 'btn-primary' : ''}" data-period="${p}">
      ${p === 'today' ? 'Today' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All'}
    </button>
  `).join('');

  return screenLayout(`
    ${backHeader('Activity Details')}
    <div class="filters">${periodButtons}</div>
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
    case 'worker-activity': loadWorkerActivity(data?.period || 'today'); break;
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
      import('./app.js?v=13').then(m => m.logout());
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
      await api.createTransaction({ type: 'expense', amount, category, note: note || undefined });
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
      await api.createTransaction({
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
        await api.createTransaction({
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

async function loadWorkerActivity(period = 'today') {
  try {
    const data = await api.getActivity({ period, limit: period === 'all' ? 200 : 100 });
    workerActivityHtml = renderWorkerActivity(data);
    if (getState().screen !== 'worker-activity' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = workerActivityHtml;
    document.querySelector('[data-action="back"]')?.addEventListener('click', () => navigate('worker-dashboard'));
    document.querySelectorAll('[data-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigate('worker-activity', { period: btn.dataset.period });
      });
    });
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}
