/**
 * Worker screens — dashboard, sales, expenses, closing, toys
 */

import * as api from './api.js';
import {
  formatBD, formatDate, todayLabel, showToast, showLoading, navigate,
  amountInput, noteInput, backHeader, screenLayout, EXPENSE_CATEGORIES,
} from './app.js';

// ─── Bottom nav for worker ───────────────────────────────────────────────────

function workerBottomNav(active) {
  const items = [
    { id: 'worker-dashboard', icon: '🏠', label: 'Home' },
    { id: 'add-cash-sale', icon: '💵', label: 'Cash' },
    { id: 'add-expense', icon: '🧾', label: 'Expense' },
    { id: 'worker-toys', icon: '🎮', label: 'Toys' },
    { id: 'close-day', icon: '🌙', label: 'Close' },
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

function statCard(label, value, { highlight = false, diff = null } = {}) {
  const diffHtml = diff != null
    ? `<span class="diff ${diff >= 0 ? 'positive' : 'negative'}">${diff >= 0 ? '+' : ''}${formatBD(diff)}</span>`
    : '';
  return `
    <div class="stat-card ${highlight ? 'highlight' : ''}">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
      ${diffHtml}
    </div>`;
}

// ─── Screen renderers ────────────────────────────────────────────────────────

export function renderWorkerScreen(screen, data) {
  switch (screen) {
    case 'worker-dashboard': return '<div class="screen" id="worker-dash-loading"><div class="spinner center"></div></div>';
    case 'add-cash-sale': return renderAddCashSale();
    case 'add-benefitpay': return renderAddBenefitPay();
    case 'add-expense': return renderAddExpense();
    case 'close-day': return '<div class="screen" id="close-day-loading"><div class="spinner center"></div></div>';
    case 'worker-toys': return '<div class="screen" id="toys-loading"><div class="spinner center"></div></div>';
    default: return '<div class="screen"><p>Screen not found</p></div>';
  }
}

async function renderWorkerDashboard(d) {
  const diffClass = d.last_closing_difference == null ? '' :
    d.last_closing_difference >= 0 ? 'positive' : 'negative';

  return screenLayout(`
    <header class="top-bar">
      <div>
        <p class="top-date">${todayLabel()}</p>
        <h1 class="top-title">Worker Dashboard</h1>
      </div>
      <button class="btn-icon" data-action="logout" title="Logout">⏻</button>
    </header>

    ${d.test_mode ? '<div class="test-banner">⚠️ Test Mode ON</div>' : ''}

    <div class="hero-card">
      <p class="hero-label">Expected Cash Now</p>
      <p class="hero-value">${formatBD(d.expected_cash_now)}</p>
    </div>

    <div class="stat-grid">
      ${statCard('Opening Cash', formatBD(d.opening_cash))}
      ${statCard('Cash Sales Today', formatBD(d.cash_sales_today))}
      ${statCard('BenefitPay Today', formatBD(d.benefitpay_today))}
      ${statCard('Expenses Today', formatBD(d.expenses_today))}
      ${statCard('Last Closing Diff', d.last_closing_difference != null ? formatBD(d.last_closing_difference) : '—', { diff: null })}
      ${statCard('Toys This Month', formatBD(d.toys_month_balance))}
    </div>

    <div class="action-grid">
      <button class="action-btn" data-nav="add-cash-sale">
        <span class="action-icon">💵</span>
        <span>Add Cash Sale</span>
      </button>
      <button class="action-btn" data-nav="add-benefitpay">
        <span class="action-icon">📱</span>
        <span>Add BenefitPay</span>
      </button>
      <button class="action-btn" data-nav="add-expense">
        <span class="action-icon">🧾</span>
        <span>Add Expense</span>
      </button>
      <button class="action-btn" data-nav="close-day">
        <span class="action-icon">🌙</span>
        <span>Close Day</span>
      </button>
      <button class="action-btn" data-nav="worker-toys">
        <span class="action-icon">🎮</span>
        <span>Toys Collection</span>
      </button>
    </div>
  `, { bottomNav: workerBottomNav('worker-dashboard') });
}

function renderAddCashSale() {
  return screenLayout(`
    ${backHeader('Add Cash Sale')}
    <form id="cash-sale-form" class="form-screen">
      ${amountInput('amount', 'Sale Amount')}
      ${noteInput()}
      <button type="submit" class="btn btn-primary btn-full btn-lg">Save Cash Sale</button>
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

function renderAddExpense() {
  const cats = EXPENSE_CATEGORIES.map(c =>
    `<option value="${c}">${c}</option>`,
  ).join('');

  return screenLayout(`
    ${backHeader('Add Expense')}
    <form id="expense-form" class="form-screen">
      ${amountInput('amount', 'Expense Amount')}
      <div class="form-group">
        <label for="category">Category</label>
        <select id="category" required>
          <option value="">Select category...</option>
          ${cats}
        </select>
      </div>
      ${noteInput()}
      <div class="form-group">
        <label>Receipt Photo <span class="optional">(coming soon)</span></label>
        <div class="placeholder-upload">📷 Photo upload placeholder</div>
      </div>
      <button type="submit" class="btn btn-danger btn-full btn-lg">Save Expense</button>
    </form>
  `, { bottomNav: workerBottomNav('add-expense') });
}

async function renderCloseDay(d) {
  return screenLayout(`
    ${backHeader('Close Day')}
    <div class="hero-card secondary">
      <p class="hero-label">Expected Cash Now</p>
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
  const history = (d.history || []).filter(t => t.type === 'toy_collection').slice(0, 10);
  return screenLayout(`
    ${backHeader('Toys Collection')}
    <div class="hero-card toys">
      <p class="hero-label">Toys Saved This Month</p>
      <p class="hero-value">${formatBD(d.balance)}</p>
    </div>
    <form id="toys-form" class="form-screen">
      ${amountInput('amount', 'Coins Collected')}
      <div class="form-group">
        <label for="source">Source / Machine Name</label>
        <input type="text" id="source" placeholder="e.g. Claw Machine 1" required>
      </div>
      ${noteInput()}
      <button type="submit" class="btn btn-primary btn-full btn-lg">Save Collection</button>
    </form>
    ${history.length ? `
      <div class="section-title">Recent Collections</div>
      <div class="tx-list compact">
        ${history.map(t => `
          <div class="tx-row ${t.is_test ? 'test' : ''}">
            <div class="tx-main">
              <span class="tx-type">${t.category || 'Toys'}</span>
              <span class="tx-amount positive">+${formatBD(t.amount)}</span>
            </div>
            <div class="tx-meta">${t.business_date}${t.is_test ? ' <span class="badge-test">TEST</span>' : ''}</div>
          </div>`).join('')}
      </div>` : ''}
  `, { bottomNav: workerBottomNav('worker-toys') });
}

// ─── Screen bindings ───────────────────────────────────────────────────────────

export function workerScreens(screen, data) {
  switch (screen) {
    case 'worker-dashboard': loadWorkerDashboard(); break;
    case 'add-cash-sale': bindCashSaleForm(); break;
    case 'add-benefitpay': bindBenefitPayForm(); break;
    case 'add-expense': bindExpenseForm(); break;
    case 'close-day': loadCloseDay(); break;
    case 'worker-toys': loadWorkerToys(); break;
  }
}

async function loadWorkerDashboard() {
  try {
    const d = await api.getWorkerDashboard();
    document.getElementById('app').innerHTML = await renderWorkerDashboard(d);
    // Re-bind nav events
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
    document.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      import('./app.js').then(m => m.logout());
    });
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
      showToast('Cash sale saved', 'success');
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
  document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value.trim();
    try {
      showLoading(true);
      await api.createTransaction({ type: 'expense', amount, category, note: note || undefined });
      showToast('Expense saved', 'success');
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
    document.getElementById('app').innerHTML = await renderWorkerToys(d);
    document.querySelector('[data-action="back"]')?.addEventListener('click', () => navigate('worker-dashboard'));
    document.getElementById('toys-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('amount').value);
      const source = document.getElementById('source').value.trim();
      const note = document.getElementById('note').value.trim();
      try {
        showLoading(true);
        await api.createTransaction({ type: 'toy_collection', amount, source, note: note || undefined });
        showToast('Toys collection saved', 'success');
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
