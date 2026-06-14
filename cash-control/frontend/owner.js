/**
 * Owner screens — dashboard, transactions, edit/void, settings, toys collection
 */

import * as api from './api.js';
import {
  formatBD, formatDateTime, todayLabel, showToast, showLoading, navigate,
  amountInput, noteInput, backHeader, screenLayout, EXPENSE_CATEGORIES,
  TYPE_LABELS, WALLET_LABELS,
} from './app.js';

// ─── Bottom nav for owner ────────────────────────────────────────────────────

function ownerBottomNav(active) {
  const items = [
    { id: 'owner-dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'transactions', icon: '📋', label: 'History' },
    { id: 'owner-cash', icon: '💰', label: 'Cash' },
    { id: 'owner-toys', icon: '🎮', label: 'Toys' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
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

function statCard(label, value, { highlight = false } = {}) {
  return `
    <div class="stat-card ${highlight ? 'highlight' : ''}">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>`;
}

// ─── Screen renderers ────────────────────────────────────────────────────────

export function renderOwnerScreen(screen, data) {
  switch (screen) {
    case 'owner-dashboard': return '<div class="screen"><div class="spinner center"></div></div>';
    case 'transactions': return '<div class="screen"><div class="spinner center"></div></div>';
    case 'owner-cash': return renderOwnerCash();
    case 'owner-toys': return '<div class="screen"><div class="spinner center"></div></div>';
    case 'settings': return '<div class="screen"><div class="spinner center"></div></div>';
    case 'edit-entry': return renderEditEntry(data);
    default: return '<div class="screen"><p>Screen not found</p></div>';
  }
}

async function renderOwnerDashboard(d) {
  return screenLayout(`
    <header class="top-bar">
      <div>
        <p class="top-date">${todayLabel()}</p>
        <h1 class="top-title">Owner Dashboard</h1>
      </div>
      <button class="btn-icon" data-action="logout" title="Logout">⏻</button>
    </header>

    ${d.test_mode ? '<div class="test-banner">⚠️ Test Mode ON — test entries affect balances</div>' : ''}

    <div class="hero-card owner">
      <p class="hero-label">Expected Cash With Worker</p>
      <p class="hero-value">${formatBD(d.expected_cash_with_worker)}</p>
    </div>

    <div class="section-title">Today</div>
    <div class="stat-grid">
      ${statCard('Cash Sales', formatBD(d.today_cash_sales))}
      ${statCard('BenefitPay', formatBD(d.today_benefitpay))}
      ${statCard('Expenses', formatBD(d.today_expenses))}
    </div>

    <div class="section-title">Last Closing</div>
    <div class="stat-grid two-col">
      ${statCard('Actual Counted', d.last_actual_closing != null ? formatBD(d.last_actual_closing) : '—')}
      ${statCard('Difference', d.last_closing_difference != null ? formatBD(d.last_closing_difference) : '—')}
    </div>

    <div class="section-title">This Month</div>
    <div class="stat-grid">
      ${statCard('Cash Sales', formatBD(d.month_cash_sales))}
      ${statCard('BenefitPay', formatBD(d.month_benefitpay))}
      ${statCard('Expenses', formatBD(d.month_expenses))}
      ${statCard('Toys Saved', formatBD(d.toys_month_balance), { highlight: true })}
    </div>

    <div class="action-grid owner-actions">
      <button class="action-btn" data-nav="transactions">
        <span class="action-icon">📋</span><span>Transactions</span>
      </button>
      <button class="action-btn" data-action="export">
        <span class="action-icon">📤</span><span>Export CSV</span>
      </button>
    </div>
  `, { bottomNav: ownerBottomNav('owner-dashboard') });
}

function renderOwnerCash() {
  return screenLayout(`
    ${backHeader('Cash Management')}
    <div class="cash-actions">
      <form id="cash-taken-form" class="form-card">
        <h3>Cash Taken From Worker</h3>
        ${amountInput('taken-amount', 'Amount')}
        ${noteInput('taken-note')}
        <button type="submit" class="btn btn-warning btn-full">Record Cash Taken</button>
      </form>
      <form id="cash-added-form" class="form-card">
        <h3>Cash Added To Worker</h3>
        ${amountInput('added-amount', 'Amount')}
        ${noteInput('added-note')}
        <button type="submit" class="btn btn-success btn-full">Record Cash Added</button>
      </form>
    </div>
  `, { bottomNav: ownerBottomNav('owner-cash') });
}

async function renderTransactions(data) {
  const { transactions = [], filters = {} } = data;
  return screenLayout(`
    ${backHeader('Transactions')}
    <div class="filters">
      <select id="filter-period">
        <option value="today" ${filters.period === 'today' ? 'selected' : ''}>Today</option>
        <option value="week" ${filters.period === 'week' ? 'selected' : ''}>This Week</option>
        <option value="month" ${filters.period === 'month' ? 'selected' : ''}>This Month</option>
        <option value="" ${!filters.period ? 'selected' : ''}>All</option>
      </select>
      <select id="filter-wallet">
        <option value="">All Wallets</option>
        <option value="daily_cash" ${filters.wallet === 'daily_cash' ? 'selected' : ''}>Daily Cash</option>
        <option value="benefitpay" ${filters.wallet === 'benefitpay' ? 'selected' : ''}>BenefitPay</option>
        <option value="toys_monthly" ${filters.wallet === 'toys_monthly' ? 'selected' : ''}>Toys</option>
      </select>
      <label class="filter-check">
        <input type="checkbox" id="filter-test" ${filters.test_only ? 'checked' : ''}> Test only
      </label>
    </div>
    <div class="tx-list" id="tx-list">
      ${transactions.length === 0
        ? '<p class="empty-msg">No transactions found</p>'
        : transactions.map(tx => renderTxRow(tx)).join('')}
    </div>
  `, { bottomNav: ownerBottomNav('transactions') });
}

function renderTxRow(tx) {
  const isVoided = tx.status === 'voided';
  const isDeleted = tx.status === 'deleted';
  const sign = ['expense', 'cash_taken_by_owner', 'toy_collected_by_owner'].includes(tx.type) ? '-' : '+';
  const amountClass = sign === '+' ? 'positive' : 'negative';

  return `
    <div class="tx-row ${tx.is_test ? 'test' : ''} ${isVoided ? 'voided' : ''}" data-id="${tx.id}">
      <div class="tx-main">
        <span class="tx-type">${TYPE_LABELS[tx.type] || tx.type}</span>
        <span class="tx-amount ${amountClass}">${isVoided ? '~~' : ''}${sign}${formatBD(tx.amount)}${isVoided ? '~~' : ''}</span>
      </div>
      <div class="tx-meta">
        ${formatDateTime(tx.created_at)} · ${WALLET_LABELS[tx.wallet] || tx.wallet}
        ${tx.category ? ` · ${tx.category}` : ''}
        ${tx.is_test ? '<span class="badge-test">TEST</span>' : ''}
        ${isVoided ? '<span class="badge-void">VOID</span>' : ''}
      </div>
      ${tx.note ? `<div class="tx-note">${tx.note}</div>` : ''}
      <div class="tx-by">By ${tx.created_by}</div>
      ${tx.status === 'active' ? `
        <div class="tx-actions">
          <button class="btn-sm" data-action="edit" data-id="${tx.id}">Edit</button>
          <button class="btn-sm btn-warning" data-action="void" data-id="${tx.id}">Void</button>
          <button class="btn-sm btn-danger" data-action="delete" data-id="${tx.id}">Delete</button>
        </div>` : ''}
    </div>`;
}

function renderEditEntry(data) {
  const tx = data.transaction;
  const cats = EXPENSE_CATEGORIES.map(c =>
    `<option value="${c}" ${tx.category === c ? 'selected' : ''}>${c}</option>`,
  ).join('');

  return screenLayout(`
    ${backHeader('Edit Entry')}
    <form id="edit-form" class="form-screen">
      <div class="info-box">Editing: ${TYPE_LABELS[tx.type] || tx.type} · ${formatDateTime(tx.created_at)}</div>
      ${amountInput('amount', 'Amount', tx.amount)}
      ${tx.type === 'expense' ? `
        <div class="form-group">
          <label for="category">Category</label>
          <select id="category">${cats}</select>
        </div>` : ''}
      ${noteInput('note', tx.note || '')}
      <div class="form-group">
        <label for="edit_reason">Edit Reason <span class="required">*</span></label>
        <textarea id="edit_reason" rows="2" required placeholder="Why are you editing this?"></textarea>
      </div>
      <button type="submit" class="btn btn-primary btn-full btn-lg">Save Changes</button>
    </form>
  `);
}

async function renderOwnerToys(d) {
  const history = d.history || [];
  return screenLayout(`
    ${backHeader('Toys Money')}
    <div class="hero-card toys">
      <p class="hero-label">Toys Saved This Month</p>
      <p class="hero-value">${formatBD(d.balance)}</p>
    </div>
    <form id="collect-toys-form" class="form-card">
      <h3>Owner Collected Toys Money</h3>
      ${amountInput('collect-amount', 'Amount Collected')}
      ${noteInput('collect-note')}
      <button type="submit" class="btn btn-primary btn-full">Record Collection</button>
    </form>
    <div class="section-title">This Month History</div>
    <div class="tx-list compact">
      ${history.length === 0 ? '<p class="empty-msg">No toys records this month</p>' :
        history.map(t => `
          <div class="tx-row ${t.is_test ? 'test' : ''} ${t.status === 'voided' ? 'voided' : ''}">
            <div class="tx-main">
              <span class="tx-type">${TYPE_LABELS[t.type] || t.type}</span>
              <span class="tx-amount">${t.type === 'toy_collection' ? '+' : '-'}${formatBD(t.amount)}</span>
            </div>
            <div class="tx-meta">${t.business_date} · ${t.category || ''}${t.is_test ? ' <span class="badge-test">TEST</span>' : ''}</div>
          </div>`).join('')}
    </div>
  `, { bottomNav: ownerBottomNav('owner-toys') });
}

async function renderSettings(d) {
  return screenLayout(`
    ${backHeader('Settings')}
    <div class="settings-list">
      <div class="setting-row">
        <div>
          <strong>Test Mode</strong>
          <p class="setting-desc">New entries marked as test data</p>
        </div>
        <label class="toggle">
          <input type="checkbox" id="test-mode-toggle" ${d.test_mode ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <button class="btn btn-warning btn-full" id="delete-test-btn">Delete All Test Data</button>
      <button class="btn btn-secondary btn-full" id="export-btn">Export CSV Report</button>

      <div class="danger-zone">
        <h3>⚠️ Danger Zone</h3>
        <p>Resetting the app requires manual database cleanup. Contact your developer.</p>
      </div>
    </div>
  `, { bottomNav: ownerBottomNav('settings') });
}

// ─── Screen bindings ─────────────────────────────────────────────────────────

export function ownerScreens(screen, data) {
  switch (screen) {
    case 'owner-dashboard': loadOwnerDashboard(); break;
    case 'transactions': loadTransactions(data.filters || { period: 'month' }); break;
    case 'owner-cash': bindOwnerCash(); break;
    case 'owner-toys': loadOwnerToys(); break;
    case 'settings': loadSettings(); break;
    case 'edit-entry': bindEditEntry(data.transaction); break;
  }
}

async function loadOwnerDashboard() {
  try {
    const d = await api.getOwnerDashboard();
    const html = await renderOwnerDashboard(d);
    document.getElementById('app').innerHTML = html;
    bindOwnerNav('owner-dashboard');
    document.querySelector('[data-action="export"]')?.addEventListener('click', async () => {
      try {
        showLoading(true);
        await api.exportCsv(d.test_mode);
        showToast('Export downloaded', 'success');
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

function bindOwnerNav(active) {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
  document.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
    import('./app.js').then(m => m.logout());
  });
}

async function loadTransactions(filters) {
  try {
    const params = {};
    if (filters.period) params.period = filters.period;
    if (filters.wallet) params.wallet = filters.wallet;
    if (filters.test_only) params.test_only = '1';
    params.show_test = '1';

    const res = await api.getTransactions(params);
    const html = await renderTransactions({ transactions: res.transactions, filters });
    document.getElementById('app').innerHTML = html;
    bindOwnerNav('transactions');

    document.getElementById('filter-period').addEventListener('change', (e) => {
      loadTransactions({ ...filters, period: e.target.value });
    });
    document.getElementById('filter-wallet').addEventListener('change', (e) => {
      loadTransactions({ ...filters, wallet: e.target.value });
    });
    document.getElementById('filter-test').addEventListener('change', (e) => {
      loadTransactions({ ...filters, test_only: e.target.checked });
    });

    document.getElementById('tx-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'edit') {
        const tx = res.transactions.find(t => t.id == id);
        navigate('edit-entry', { transaction: tx });
      } else if (action === 'void') {
        const reason = prompt('Void reason (required):');
        if (!reason) return;
        try {
          showLoading(true);
          await api.voidTransaction(id, reason);
          showToast('Entry voided', 'success');
          loadTransactions(filters);
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          showLoading(false);
        }
      } else if (action === 'delete') {
        if (!confirm('Hard delete this entry? Test entries are permanently removed.')) return;
        try {
          showLoading(true);
          await api.deleteTransaction(id);
          showToast('Entry deleted', 'success');
          loadTransactions(filters);
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          showLoading(false);
        }
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function bindOwnerCash() {
  document.getElementById('cash-taken-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('taken-amount').value);
    const note = document.getElementById('taken-note').value.trim();
    try {
      showLoading(true);
      await api.cashTakenByOwner(amount, note || undefined);
      showToast('Cash taken recorded', 'success');
      e.target.reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });

  document.getElementById('cash-added-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('added-amount').value);
    const note = document.getElementById('added-note').value.trim();
    try {
      showLoading(true);
      await api.cashAddedToWorker(amount, note || undefined);
      showToast('Cash added recorded', 'success');
      e.target.reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}

async function loadOwnerToys() {
  try {
    const d = await api.getToysMonth();
    document.getElementById('app').innerHTML = await renderOwnerToys(d);
    bindOwnerNav('owner-toys');
    document.getElementById('collect-toys-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('collect-amount').value);
      const note = document.getElementById('collect-note').value.trim();
      try {
        showLoading(true);
        await api.collectToys({ amount, note: note || undefined });
        showToast('Toys collection recorded', 'success');
        loadOwnerToys();
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

async function loadSettings() {
  try {
    const d = await api.getSettings();
    document.getElementById('app').innerHTML = await renderSettings(d);
    bindOwnerNav('settings');

    document.getElementById('test-mode-toggle').addEventListener('change', async (e) => {
      try {
        showLoading(true);
        await api.updateSettings({ test_mode: e.target.checked });
        showToast(`Test mode ${e.target.checked ? 'ON' : 'OFF'}`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
        e.target.checked = !e.target.checked;
      } finally {
        showLoading(false);
      }
    });

    document.getElementById('delete-test-btn').addEventListener('click', async () => {
      if (!confirm('Delete ALL test data? This cannot be undone.')) return;
      try {
        showLoading(true);
        await api.deleteAllTestData();
        showToast('All test data deleted', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    });

    document.getElementById('export-btn').addEventListener('click', async () => {
      try {
        showLoading(true);
        await api.exportCsv(true);
        showToast('Export downloaded', 'success');
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

function bindEditEntry(tx) {
  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value.trim();
    const edit_reason = document.getElementById('edit_reason').value.trim();
    const category = document.getElementById('category')?.value;
    try {
      showLoading(true);
      await api.updateTransaction(tx.id, { amount, note, category, edit_reason });
      showToast('Entry updated', 'success');
      navigate('transactions', { filters: { period: 'month' } });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}
