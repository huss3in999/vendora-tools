/**
 * Owner screens — dashboard, transactions, edit/void, settings, toys collection
 */

import * as api from './api.js?v=18';
import {
  formatBD, formatDateTime, todayLabel, showToast, showLoading, navigate,
  amountInput, noteInput, backHeader, screenLayout, EXPENSE_CATEGORIES,
  TYPE_LABELS, WALLET_LABELS, cashBreakdown, heroCashBlock, bindInstallButton, getState,
} from './app.js?v=18';

let ownerDashboardHtml = '';
let transactionsHtml = '';
let settingsHtml = '';
let ownerToysHtml = '';
let ownerExpenseOptions = [
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

function summaryPanel(summary = {}) {
  const topCategories = summary.top_expense_categories || [];
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
    </div>
    ${topCategories.length ? `
      <div class="category-summary">
        ${topCategories.map(c => `
          <div>
            <span>${esc(c.category)}</span>
            <strong>${formatBD(c.total)}</strong>
            <small>${c.count} records</small>
          </div>`).join('')}
      </div>` : ''}`;
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

async function collectToysWithOverdrawReason(payload) {
  try {
    return await api.collectToys(payload);
  } catch (err) {
    if (!isOverdrawError(err)) throw err;
    const reason = prompt(`${err.message}\n\nReason required:`);
    if (!reason?.trim()) throw err;
    return api.collectToys({ ...payload, overdraw_reason: reason.trim() });
  }
}

// ─── Bottom nav for owner ────────────────────────────────────────────────────

function ownerBottomNav(active) {
  const items = [
    { id: 'owner-dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'manage-entries', icon: '✏️', label: 'Manage' },
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

function ownerDashboardStats(d) {
  const todayNet = (d.today_cash_sales || 0)
    + (d.cash_added_today || 0)
    - (d.today_expenses || 0)
    - (d.cash_taken_today || 0)
    + (d.corrections_today || 0);
  return `
    <div class="section-title">Owner Dashboard</div>
    <div class="stat-grid owner-stat-order">
      ${statCard('Previous Cash Balance', formatBD(d.previous_cash_balance ?? d.opening_cash))}
      ${statCard('Cash Received Today', formatBD(d.today_cash_sales))}
      ${statCard('Expenses Today', formatBD(d.today_expenses))}
      ${statCard('Work Day Net Cash', formatBD(todayNet), { highlight: true })}
      ${statCard('Cash With Worker Now', formatBD(d.expected_cash_with_worker), { highlight: true })}
      ${statCard('Expenses This Month', formatBD(d.month_expenses || 0))}
      ${statCard('Total Expenses', formatBD(d.total_expenses || 0))}
      ${statCard('Owner Added Today', formatBD(d.cash_added_today || 0))}
      ${statCard('Owner Took Today', formatBD(d.cash_taken_today || 0))}
      ${statCard('Toys Saved Separate', formatBD(d.toys_month_balance), { highlight: true })}
    </div>`;
}

// ─── Screen renderers ────────────────────────────────────────────────────────

export function renderOwnerScreen(screen, data) {
  switch (screen) {
    case 'owner-dashboard': return ownerDashboardHtml || '<div class="screen"><div class="spinner center"></div></div>';
    case 'transactions': return transactionsHtml || '<div class="screen"><div class="spinner center"></div></div>';
    case 'owner-cash': return renderOwnerCash();
    case 'owner-toys': return ownerToysHtml || '<div class="screen"><div class="spinner center"></div></div>';
    case 'settings': return settingsHtml || '<div class="screen"><div class="spinner center"></div></div>';
    case 'edit-entry': return renderEditEntry(data);
    case 'manage-entries': return renderManageEntries(data);
    default: return '<div class="screen"><p>Screen not found</p></div>';
  }
}

async function renderOwnerDashboard(d) {
  return screenLayout(`
    ${heroCashBlock(d, {
      totalKey: 'expected_cash_with_worker',
      label: 'Cash With Worker Now',
      sub: 'Previous balance + cash received + owner added - expenses/removals - owner taken',
      heroClass: 'owner cash-now',
      baseLabel: 'Previous Cash Balance',
    })}

    <header class="top-bar">
      <div>
        <p class="top-date">${todayLabel()}</p>
        <h1 class="top-title">Cash Control</h1>
      </div>
      <button class="btn-icon" data-action="logout" title="Logout">⏻</button>
    </header>

    ${d.test_mode ? '<div class="test-banner">⚠️ Test Mode ON — test entries affect balances</div>' : ''}

    ${ownerDashboardStats(d)}

    ${false ? heroCashBlock(d, {
      totalKey: 'expected_cash_with_worker',
      label: 'Total Cash With Worker',
      sub: 'Opening + cash received - expenses/removals - taken = total now',
      heroClass: 'owner',
    }) : ''}

    ${cashBreakdown(d, 'Cash With Worker Now', 'expected_cash_with_worker', { baseLabel: 'Previous Cash Balance' })}

    <div class="section-title">Quick Actions</div>
    <div class="action-grid owner-actions">
      <button class="action-btn" data-action="owner-took-cash">
        <span class="action-icon">BD</span><span>Cash Taken From Worker</span>
      </button>
      <button class="action-btn" data-action="owner-added-cash">
        <span class="action-icon">BD</span><span>Owner Added Cash</span>
      </button>
      <button class="action-btn" data-action="add-expense">
        <span class="action-icon">-</span><span>Add Expense / Removal</span>
      </button>
      <button class="action-btn" data-action="add-cash-sale">
        <span class="action-icon">+</span><span>Add Cash Received</span>
      </button>
      <button class="action-btn" data-nav="owner-toys">
        <span class="action-icon">T</span><span>Toys</span>
      </button>
      <button class="action-btn" data-nav="settings">
        <span class="action-icon">SET</span><span>Settings</span>
      </button>
      <button class="action-btn hidden" id="install-app-btn">
        <span class="action-icon">APP</span><span>Install App</span>
      </button>
    </div>
    <div class="action-grid owner-actions hidden">
      <button class="action-btn" data-nav="owner-cash">
        <span class="action-icon">💸</span><span>Take / Add Cash</span>
      </button>
      <button class="action-btn" data-action="quick-take">
        <span class="action-icon">⬇️</span><span>Quick Take Cash</span>
      </button>
      <button class="action-btn" data-nav="transactions">
        <span class="action-icon">📋</span><span>Transactions</span>
      </button>
      <button class="action-btn" data-action="export">
        <span class="action-icon">📤</span><span>Export CSV</span>
      </button>
    </div>

    <div class="hidden">
    <div class="section-title">Last Closing</div>
    <div class="stat-grid two-col">
      ${statCard('Actual Counted', d.last_actual_closing != null ? formatBD(d.last_actual_closing) : '—')}
      ${statCard('Difference', d.last_closing_difference != null ? formatBD(d.last_closing_difference) : '—')}
    </div>
    </div>

    <div class="section-title">Reports & Management</div>
    <div class="action-grid owner-actions secondary-actions">
      <button class="action-btn" data-nav="transactions">
        <span class="action-icon">📋</span><span>Transactions</span>
      </button>
      <button class="action-btn" data-nav="manage-entries">
        <span class="action-icon">✏️</span><span>Manage Entries</span>
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
        <p class="setting-desc">When you take money from the worker, enter it here. Total cash will go down.</p>
        ${amountInput('taken-amount', 'Amount You Took')}
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
  const { transactions = [], filters = {}, summary = {} } = data;
  return screenLayout(`
    ${backHeader('Transactions')}
    <form id="transaction-filter-form" class="filter-panel">
      <input type="search" id="filter-q" placeholder="Search mint, toys, note, date..." value="${esc(filters.q)}">
      <div class="filter-grid">
      <select id="filter-period">
        <option value="" ${!filters.period ? 'selected' : ''}>All Time</option>
        <option value="today" ${filters.period === 'today' ? 'selected' : ''}>Today</option>
        <option value="yesterday" ${filters.period === 'yesterday' ? 'selected' : ''}>Yesterday</option>
        <option value="week" ${filters.period === 'week' ? 'selected' : ''}>This Week</option>
        <option value="month" ${filters.period === 'month' ? 'selected' : ''}>This Month</option>
        <option value="quarter" ${filters.period === 'quarter' ? 'selected' : ''}>This Quarter</option>
        <option value="year" ${filters.period === 'year' ? 'selected' : ''}>This Year</option>
      </select>
      <select id="filter-wallet">
        <option value="">All Wallets</option>
        <option value="daily_cash" ${filters.wallet === 'daily_cash' ? 'selected' : ''}>Daily Cash</option>
        <option value="benefitpay" ${filters.wallet === 'benefitpay' ? 'selected' : ''}>BenefitPay</option>
        <option value="toys_monthly" ${filters.wallet === 'toys_monthly' ? 'selected' : ''}>Toys</option>
      </select>
      <select id="filter-type">
        <option value="" ${!filters.type ? 'selected' : ''}>All Types</option>
        ${TYPE_OPTIONS.map(([value, label]) => `<option value="${value}" ${filters.type === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
      </div>
      <div class="filter-grid date-grid">
        <label>From <input type="date" id="filter-date-from" value="${esc(filters.date_from)}"></label>
        <label>To <input type="date" id="filter-date-to" value="${esc(filters.date_to)}"></label>
      </div>
      <label class="filter-check">
        <input type="checkbox" id="filter-test" ${filters.test_only ? 'checked' : ''}> Test only
      </label>
      <div class="filter-actions">
        <button type="submit" class="btn btn-primary">Search</button>
        <button type="button" class="btn btn-secondary" id="filter-clear">Clear</button>
      </div>
    </form>
    ${summaryPanel(summary)}
    <div class="bulk-bar hidden" id="bulk-bar">
      <span id="bulk-count">0 selected</span>
      <button class="btn-sm btn-warning" id="bulk-void-btn">Void Selected</button>
      <button class="btn-sm btn-danger" id="bulk-delete-btn">Delete Selected</button>
    </div>
    <label class="select-all-row">
      <input type="checkbox" id="select-all-tx"> Select all on screen
    </label>
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
      ${tx.status === 'active' ? `<label class="tx-check"><input type="checkbox" class="tx-select" value="${tx.id}"></label>` : ''}
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
      <p class="hero-label">Toys Money Saved</p>
      <p class="hero-value">${formatBD(d.balance)}</p>
      <p class="hero-sub">Separate from worker cash</p>
    </div>
    <form id="add-toys-form" class="form-card">
      <h3>Add Toys Money</h3>
      ${amountInput('add-toys-amount', 'Amount Added')}
      <div class="form-group">
        <label for="add-toys-source">Source / Machine Name</label>
        <input type="text" id="add-toys-source" placeholder="e.g. Toys box" required>
      </div>
      ${noteInput('add-toys-note')}
      <button type="submit" class="btn btn-success btn-full">Record Toys Money Added</button>
    </form>
    <form id="collect-toys-form" class="form-card">
      <h3>Toys Money Taken</h3>
      ${amountInput('collect-amount', 'Amount Taken')}
      ${noteInput('collect-note')}
      <button type="submit" class="btn btn-warning btn-full">Record Toys Money Taken</button>
    </form>
    <div class="section-title">Toys History</div>
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

// ─── Manage Entries Screen ───────────────────────────────────────────────────

function renderManageEntries(data) {
  const activeTab = data.tab || 'transactions';
  const records = data.records || [];
  const filters = data.filters || {};

  const tabsHtml = `
    <div class="manage-tabs">
      <button class="manage-tab ${activeTab === 'transactions' ? 'active' : ''}" data-tab="transactions">Transactions</button>
    </div>
  `;

  let listHtml = '';
  if (activeTab === 'transactions') {
    listHtml = records.length === 0
      ? '<p class="empty-msg">No transactions found</p>'
      : records.map(tx => renderManageTxRow(tx)).join('');
  } else {
    listHtml = records.length === 0
      ? '<p class="empty-msg">No closing records found</p>'
      : records.map(cl => renderManageClosingRow(cl)).join('');
  }

  return screenLayout(`
    ${backHeader('Manage Entries')}
    ${tabsHtml}
    <form id="manage-filter-form" class="filter-panel">
      <input type="search" id="manage-filter-q" placeholder="Search mint, toys, note, date..." value="${esc(filters.q)}">
      <div class="filter-grid">
        <select id="manage-filter-period">
          <option value="" ${!filters.period ? 'selected' : ''}>All Time</option>
          <option value="today" ${filters.period === 'today' ? 'selected' : ''}>Today</option>
          <option value="yesterday" ${filters.period === 'yesterday' ? 'selected' : ''}>Yesterday</option>
          <option value="week" ${filters.period === 'week' ? 'selected' : ''}>This Week</option>
          <option value="month" ${filters.period === 'month' ? 'selected' : ''}>This Month</option>
          <option value="quarter" ${filters.period === 'quarter' ? 'selected' : ''}>This Quarter</option>
          <option value="year" ${filters.period === 'year' ? 'selected' : ''}>This Year</option>
        </select>
        <select id="manage-filter-wallet">
          <option value="">All Wallets</option>
          <option value="daily_cash" ${filters.wallet === 'daily_cash' ? 'selected' : ''}>Daily Cash</option>
          <option value="benefitpay" ${filters.wallet === 'benefitpay' ? 'selected' : ''}>BenefitPay</option>
          <option value="toys_monthly" ${filters.wallet === 'toys_monthly' ? 'selected' : ''}>Toys</option>
        </select>
        <select id="manage-filter-type">
          <option value="" ${!filters.type ? 'selected' : ''}>All Types</option>
          ${TYPE_OPTIONS.map(([value, label]) => `<option value="${value}" ${filters.type === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="filter-grid date-grid">
        <label>From <input type="date" id="manage-filter-date-from" value="${esc(filters.date_from)}"></label>
        <label>To <input type="date" id="manage-filter-date-to" value="${esc(filters.date_to)}"></label>
      </div>
      <label class="filter-check">
        <input type="checkbox" id="manage-filter-test" ${filters.test_only ? 'checked' : ''}> Test only
      </label>
      <div class="filter-actions">
        <button type="submit" class="btn btn-primary">Search</button>
        <button type="button" class="btn btn-secondary" id="manage-filter-clear">Clear</button>
      </div>
    </form>
    <div class="tx-list">
      ${listHtml}
    </div>
  `, { bottomNav: ownerBottomNav('manage-entries') });
}

function renderManageTxRow(tx) {
  const isVoided = tx.status === 'voided';
  const isDeleted = tx.status === 'deleted';
  const sign = ['expense', 'cash_taken_by_owner', 'toy_collected_by_owner'].includes(tx.type) ? '-' : '+';
  const amountClass = sign === '+' ? 'positive' : 'negative';

  return `
    <div class="tx-row ${tx.is_test ? 'test' : ''} ${isVoided ? 'voided' : ''} ${isDeleted ? 'deleted' : ''}">
      <div class="tx-main">
        <span class="tx-type">${TYPE_LABELS[tx.type] || tx.type}</span>
        <span class="tx-amount ${amountClass}">${isVoided || isDeleted ? '~~' : ''}${sign}${formatBD(tx.amount)}${isVoided || isDeleted ? '~~' : ''}</span>
      </div>
      <div class="tx-meta">
        ${formatDateTime(tx.created_at)} · ${WALLET_LABELS[tx.wallet] || tx.wallet}
        ${tx.category ? ` · ${tx.category}` : ''}
        ${tx.is_test ? '<span class="badge-test">TEST</span>' : ''}
        ${isVoided ? '<span class="badge-void">VOID</span>' : ''}
        ${isDeleted ? '<span class="badge-void" style="background:#ef4444">DELETED</span>' : ''}
      </div>
      ${tx.note ? `<div class="tx-note">${tx.note}</div>` : ''}
      <div class="tx-by">By ${tx.created_by || 'Unknown'}</div>
      ${tx.status === 'active' ? `
        <div class="tx-actions" style="margin-top: 8px; display: flex; gap: 8px;">
          <button class="btn-sm" data-action="edit-tx" data-id="${tx.id}">Edit</button>
          <button class="btn-sm btn-warning" data-action="void-tx" data-id="${tx.id}">Void</button>
          <button class="btn-sm btn-danger" data-action="delete-tx" data-id="${tx.id}">Delete Permanently</button>
        </div>` : ''}
    </div>`;
}

function renderManageClosingRow(cl) {
  const isVoided = cl.status === 'voided';
  const isDeleted = cl.status === 'deleted';
  const diffPrefix = cl.difference >= 0 ? '+' : '';
  const diffClass = cl.difference >= 0 ? 'positive' : 'negative';

  return `
    <div class="tx-row ${cl.is_test ? 'test' : ''} ${isVoided ? 'voided' : ''} ${isDeleted ? 'deleted' : ''}">
      <div class="tx-main">
        <span class="tx-type">Closing Balance (${cl.business_date})</span>
        <span class="tx-amount">${formatBD(cl.actual_cash)}</span>
      </div>
      <div class="tx-meta">
        Closed At: ${formatDateTime(cl.closed_at)}
      </div>
      <div class="tx-meta">
        Opening: ${formatBD(cl.opening_cash)} · Expected: ${formatBD(cl.expected_cash)}
      </div>
      <div class="tx-meta">
        Diff: <span class="${diffClass}">${diffPrefix}${formatBD(cl.difference)}</span>
        ${cl.is_test ? '<span class="badge-test" style="margin-left: 4px">TEST</span>' : ''}
        ${isVoided ? '<span class="badge-void" style="margin-left: 4px">VOID</span>' : ''}
        ${isDeleted ? '<span class="badge-void" style="background:#ef4444; margin-left: 4px">DELETED</span>' : ''}
      </div>
      ${cl.note ? `<div class="tx-note">${cl.note}</div>` : ''}
      <div class="tx-by">Closed By ${cl.closed_by || 'Unknown'}</div>
      ${cl.status === 'active' ? `
        <div class="tx-actions" style="margin-top: 8px; display: flex; gap: 8px;">
          <button class="btn-sm btn-warning" data-action="void-cl" data-id="${cl.id}">Void</button>
          <button class="btn-sm btn-danger" data-action="delete-cl" data-id="${cl.id}">Delete Permanently</button>
        </div>` : ''}
    </div>`;
}

async function renderAdminSettings(d, expenseOptions = EXPENSE_CATEGORIES) {
  const workerAccessEnabled = d.worker_access_enabled !== false;
  const optionsText = expenseOptions.join('\n');
  return screenLayout(`
    ${backHeader('Admin Settings')}
    <div class="settings-list admin-settings">

      <section class="admin-card">
        <div class="admin-card-head">
          <span class="admin-kicker">Security</span>
          <h3>PIN Management</h3>
          <p class="setting-desc">PINs are checked and changed by the backend. They are never stored in public frontend JavaScript.</p>
        </div>
        <form id="pin-form">
          <div class="form-group">
            <label>New Owner PIN</label>
            <input type="password" id="new-owner-pin" inputmode="numeric" placeholder="Leave blank to keep current">
          </div>
          <div class="form-group">
            <label>Current Owner PIN</label>
            <input type="password" id="current-owner-pin" inputmode="numeric" placeholder="Required to change owner PIN">
          </div>
          <div class="form-group">
            <label>New Worker PIN</label>
            <input type="password" id="new-worker-pin" inputmode="numeric" placeholder="Leave blank to keep current">
          </div>
          <button type="submit" class="btn btn-primary btn-full">Save PIN Changes</button>
        </form>
      </section>

      <section class="admin-card">
        <div class="admin-card-head">
          <span class="admin-kicker">Access</span>
          <h3>Worker Access</h3>
          <p class="setting-desc">Disable worker login temporarily without affecting owner access.</p>
        </div>
        <div class="setting-row">
          <div>
            <strong>Worker Access</strong>
            <p class="setting-desc">${workerAccessEnabled ? 'Worker can currently login.' : 'Worker login is currently disabled.'}</p>
          </div>
          <label class="toggle">
            <input type="checkbox" id="worker-access-toggle" ${workerAccessEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-head">
          <span class="admin-kicker">Work Day</span>
          <h3>Business Day Timing</h3>
          <p class="setting-desc">Entries after midnight but before this start time stay with the previous work day.</p>
        </div>
        <div class="form-group">
          <label for="business-day-start">Business Day Starts At</label>
          <select id="business-day-start">
            ${Array.from({ length: 24 }, (_, h) => `
              <option value="${h}" ${Number(d.business_day_start_hour ?? 16) === h ? 'selected' : ''}>
                ${h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </option>
            `).join('')}
          </select>
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-head">
          <span class="admin-kicker">Phone</span>
          <h3>Phone Notifications</h3>
          <p class="setting-desc">Default is off. Real background push alerts need Web Push keys configured on the Worker.</p>
        </div>
        <div class="setting-row">
          <div>
            <strong>Notify owner when money is recorded</strong>
            <p class="setting-desc">${d.notifications_enabled ? 'Notification preference is enabled.' : 'Notifications are currently disabled.'}</p>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notifications-toggle" ${d.notifications_enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-head">
          <span class="admin-kicker">Expenses</span>
          <h3>Paid For / Company Options</h3>
          <p class="setting-desc">Each line appears in the worker expense form, for example Potato, Petrol, Tea, or supplier names.</p>
        </div>
        <form id="expense-options-form">
          <div class="form-group">
            <label for="expense-options">Options</label>
            <textarea id="expense-options" rows="7" required>${optionsText}</textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-full">Save Expense Options</button>
        </form>
      </section>

      <section class="admin-card">
        <div class="admin-card-head">
          <span class="admin-kicker">Testing</span>
          <h3>Test Mode</h3>
          <p class="setting-desc">When test mode is on, new records are marked as test data and show a TEST badge.</p>
        </div>
        <div class="setting-row">
          <div>
            <strong>Test Mode</strong>
            <p class="setting-desc">${d.test_mode ? 'New records are currently marked as test.' : 'New records are currently live records.'}</p>
          </div>
          <label class="toggle">
            <input type="checkbox" id="test-mode-toggle" ${d.test_mode ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-head">
          <span class="admin-kicker">Reports</span>
          <h3>Data Tools</h3>
          <p class="setting-desc">Export transactions or remove all test records when testing is complete.</p>
        </div>
        <button class="btn btn-warning btn-full" id="delete-test-btn">Delete All Test Data</button>
        <button class="btn btn-secondary btn-full" id="export-btn">Export CSV Report</button>
        <button class="btn btn-primary btn-full hidden" id="install-app-btn">Install on My Phone</button>
        <p class="form-hint">Install option appears when supported by the browser.</p>
      </section>

      <div class="danger-zone">
        <h3>Owner Only</h3>
        <p>These settings require an owner session. Worker accounts cannot open or change admin settings.</p>
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
    case 'edit-entry': bindEditEntry(data.transaction, data.returnTo, data.filters); break;
    case 'manage-entries': loadManageEntries(data.tab || 'transactions', data.filters || { period: 'month' }); break;
  }
}

function readAmount(message) {
  const amountStr = prompt(message);
  if (!amountStr) return null;
  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) {
    showToast('Enter a valid amount', 'error');
    return null;
  }
  return amount;
}

async function saveQuickEntry(action, successMessage) {
  try {
    showLoading(true);
    await action();
    ownerDashboardHtml = '';
    transactionsHtml = '';
    showToast(successMessage, 'success');
    loadOwnerDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    showLoading(false);
  }
}

function bindOwnerQuickActions() {
  document.querySelector('[data-action="owner-took-cash"]')?.addEventListener('click', async () => {
    const amount = readAmount('How much cash did owner take from the worker? (BD)');
    if (amount == null) return;
    const note = prompt('Note (optional):') || undefined;
    await saveQuickEntry(
      () => createTransactionWithOverdrawReason({ type: 'cash_taken_by_owner', amount, note }),
      `Recorded: owner took ${formatBD(amount)}`,
    );
  });

  document.querySelector('[data-action="owner-added-cash"]')?.addEventListener('click', async () => {
    const amount = readAmount('How much cash did owner add to the worker? (BD)');
    if (amount == null) return;
    const note = prompt('Note (optional):') || undefined;
    await saveQuickEntry(() => api.cashAddedToWorker(amount, note), `Recorded: owner added ${formatBD(amount)}`);
  });

  document.querySelector('[data-action="add-expense"]')?.addEventListener('click', async () => {
    const amount = readAmount('Expense amount? (BD)');
    if (amount == null) return;
    const optionRes = await api.getExpenseOptions().catch(() => ({ options: ownerExpenseOptions }));
    ownerExpenseOptions = optionRes.options || ownerExpenseOptions;
    const category = prompt(`Paid for / company:\n${ownerExpenseOptions.join('\n')}`) || 'Other';
    const note = prompt('Note (optional):') || undefined;
    await saveQuickEntry(
      () => createTransactionWithOverdrawReason({ type: 'expense', amount, category, note }),
      `Expense / removal saved: ${formatBD(amount)}`,
    );
  });

  document.querySelector('[data-action="add-cash-sale"]')?.addEventListener('click', async () => {
    const amount = readAmount('Cash sale amount? (BD)');
    if (amount == null) return;
    const note = prompt('Note (optional):') || undefined;
    await saveQuickEntry(
      () => api.createTransaction({ type: 'cash_sale', amount, note }),
      `Cash received saved: ${formatBD(amount)}`,
    );
  });

  document.querySelector('[data-action="add-benefitpay-sale"]')?.addEventListener('click', async () => {
    const amount = readAmount('BenefitPay sale amount? (BD)');
    if (amount == null) return;
    const note = prompt('Note (optional):') || undefined;
    await saveQuickEntry(
      () => api.createTransaction({ type: 'benefitpay_sale', amount, note }),
      `BenefitPay sale saved: ${formatBD(amount)}`,
    );
  });

  document.querySelector('[data-action="close-day"]')?.addEventListener('click', async () => {
    const actual_cash = readAmount('Actual cash counted with worker now? (BD)');
    if (actual_cash == null) return;
    const note = prompt('Closing note (optional):') || undefined;
    if (!confirm(`Close day with actual cash ${formatBD(actual_cash)}?`)) return;
    await saveQuickEntry(
      () => api.closeDay({ actual_cash, note }),
      `Day closed at ${formatBD(actual_cash)}`,
    );
  });
}

async function loadOwnerDashboard() {
  try {
    const d = await api.getOwnerDashboard();
    ownerDashboardHtml = await renderOwnerDashboard(d);
    if (getState().screen !== 'owner-dashboard' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = ownerDashboardHtml;
    bindOwnerNav('owner-dashboard');
    bindOwnerQuickActions();
    bindInstallButton('install-app-btn');
    document.querySelectorAll('[data-action="export"]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        showLoading(true);
        await api.exportCsv(d.test_mode);
        showToast('Export downloaded', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    }));
    document.querySelector('[data-action="quick-take"]')?.addEventListener('click', async () => {
      const amountStr = prompt('How much cash did you take from the worker? (BD)');
      if (!amountStr) return;
      const amount = parseFloat(amountStr);
      if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
      const note = prompt('Note (optional):') || undefined;
      try {
        showLoading(true);
        await createTransactionWithOverdrawReason({ type: 'cash_taken_by_owner', amount, note });
        showToast(`Recorded: took ${formatBD(amount)}`, 'success');
        loadOwnerDashboard();
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
  document.querySelectorAll('[data-action="back"]').forEach(btn => {
    btn.addEventListener('click', () => navigate('owner-dashboard'));
  });
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
  document.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      import('./app.js?v=18').then(m => m.logout());
  });
}

async function loadTransactions(filters) {
  try {
    const params = {};
    if (filters.period) params.period = filters.period;
    if (filters.wallet) params.wallet = filters.wallet;
    if (filters.type) params.type = filters.type;
    if (filters.q) params.q = filters.q;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.test_only) params.test_only = '1';
    params.show_test = '1';
    params.limit = '1000';

    const res = await api.getTransactions(params);
    transactionsHtml = await renderTransactions({ transactions: res.transactions, filters, summary: res.summary });
    if (getState().screen !== 'transactions' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = transactionsHtml;
    bindOwnerNav('transactions');

    document.getElementById('transaction-filter-form').addEventListener('submit', (e) => {
      e.preventDefault();
      loadTransactions(readTransactionFilters());
    });
    document.getElementById('filter-clear').addEventListener('click', () => {
      loadTransactions({ period: 'month' });
    });
    document.getElementById('filter-test').addEventListener('change', (e) => {
      loadTransactions({ ...readTransactionFilters(), test_only: e.target.checked });
    });

    bindBulkActions(filters, res.transactions);

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

function readTransactionFilters() {
  const filters = {
    q: document.getElementById('filter-q')?.value.trim(),
    period: document.getElementById('filter-period')?.value,
    wallet: document.getElementById('filter-wallet')?.value,
    type: document.getElementById('filter-type')?.value,
    date_from: document.getElementById('filter-date-from')?.value,
    date_to: document.getElementById('filter-date-to')?.value,
    test_only: document.getElementById('filter-test')?.checked,
  };
  Object.keys(filters).forEach((key) => {
    if (!filters[key]) delete filters[key];
  });
  return filters;
}

function readManageFilters() {
  const filters = {
    q: document.getElementById('manage-filter-q')?.value.trim(),
    period: document.getElementById('manage-filter-period')?.value,
    wallet: document.getElementById('manage-filter-wallet')?.value,
    type: document.getElementById('manage-filter-type')?.value,
    date_from: document.getElementById('manage-filter-date-from')?.value,
    date_to: document.getElementById('manage-filter-date-to')?.value,
    test_only: document.getElementById('manage-filter-test')?.checked,
  };
  Object.keys(filters).forEach((key) => {
    if (!filters[key]) delete filters[key];
  });
  return filters;
}

function bindBulkActions(filters, transactions) {
  const bulkBar = document.getElementById('bulk-bar');
  const bulkCount = document.getElementById('bulk-count');
  const selectAll = document.getElementById('select-all-tx');

  function updateBulkBar() {
    const selected = [...document.querySelectorAll('.tx-select:checked')].map(c => parseInt(c.value, 10));
    if (selected.length > 0) {
      bulkBar.classList.remove('hidden');
      bulkCount.textContent = `${selected.length} selected`;
    } else {
      bulkBar.classList.add('hidden');
    }
    return selected;
  }

  document.querySelectorAll('.tx-select').forEach(cb => {
    cb.addEventListener('change', updateBulkBar);
  });

  selectAll?.addEventListener('change', (e) => {
    document.querySelectorAll('.tx-select').forEach(cb => { cb.checked = e.target.checked; });
    updateBulkBar();
  });

  document.getElementById('bulk-void-btn')?.addEventListener('click', async () => {
    const ids = [...document.querySelectorAll('.tx-select:checked')].map(c => parseInt(c.value, 10));
    if (!ids.length) return;
    const reason = prompt(`Void ${ids.length} entries. Reason (required):`);
    if (!reason) return;
    try {
      showLoading(true);
      const res = await api.bulkVoidTransactions(ids, reason);
      showToast(`${res.voided} entries voided`, 'success');
      loadTransactions(filters);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });

  document.getElementById('bulk-delete-btn')?.addEventListener('click', async () => {
    const ids = [...document.querySelectorAll('.tx-select:checked')].map(c => parseInt(c.value, 10));
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} entries? Test entries are removed permanently.`)) return;
    try {
      showLoading(true);
      const res = await api.bulkDeleteTransactions(ids);
      showToast(`${res.deleted} entries deleted`, 'success');
      loadTransactions(filters);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}

function bindOwnerCash() {
  document.getElementById('cash-taken-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('taken-amount').value);
    const note = document.getElementById('taken-note').value.trim();
    try {
      showLoading(true);
      await createTransactionWithOverdrawReason({ type: 'cash_taken_by_owner', amount, note: note || undefined });
      ownerDashboardHtml = '';
      transactionsHtml = '';
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
      ownerDashboardHtml = '';
      transactionsHtml = '';
      showToast('Cash added recorded', 'success');
      e.target.reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });

  document.getElementById('opening-cash-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('opening-amount').value);
    const note = document.getElementById('opening-note').value.trim();
    if (!confirm(`Set starting cash today to ${formatBD(amount)}? Do this once at start of day.`)) return;
    try {
      showLoading(true);
      await api.setOpeningCash(amount, note || undefined);
      showToast('Opening cash set', 'success');
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
    ownerToysHtml = await renderOwnerToys(d);
    if (getState().screen !== 'owner-toys' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = ownerToysHtml;
    bindOwnerNav('owner-toys');
    document.getElementById('add-toys-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('add-toys-amount').value);
      const source = document.getElementById('add-toys-source').value.trim();
      const note = document.getElementById('add-toys-note').value.trim();
      try {
        showLoading(true);
        await api.createTransaction({ type: 'toy_collection', amount, source, note: note || undefined });
        ownerToysHtml = '';
        transactionsHtml = '';
        showToast('Toys money added', 'success');
        loadOwnerToys();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    });
    document.getElementById('collect-toys-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('collect-amount').value);
      const note = document.getElementById('collect-note').value.trim();
      try {
        showLoading(true);
        await collectToysWithOverdrawReason({ amount, note: note || undefined });
        ownerToysHtml = '';
        transactionsHtml = '';
        showToast('Toys money taken recorded', 'success');
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
    const [d, expenseOptionsRes] = await Promise.all([
      api.getSettings(),
      api.getExpenseOptions().catch(() => ({ options: ownerExpenseOptions })),
    ]);
    ownerExpenseOptions = expenseOptionsRes.options || ownerExpenseOptions;
    settingsHtml = await renderAdminSettings(d, ownerExpenseOptions);
    if (getState().screen !== 'settings' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = settingsHtml;
    bindOwnerNav('settings');
    bindInstallButton('install-app-btn');

    document.getElementById('expense-options-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const options = document.getElementById('expense-options').value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      try {
        showLoading(true);
        const res = await api.updateExpenseOptions(options);
        ownerExpenseOptions = res.options || options;
        settingsHtml = await renderAdminSettings(d, ownerExpenseOptions);
        document.getElementById('app').innerHTML = settingsHtml;
        bindOwnerNav('settings');
        showToast('Expense options saved', 'success');
        loadSettings();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    });

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

    document.getElementById('worker-access-toggle')?.addEventListener('change', async (e) => {
      try {
        showLoading(true);
        await api.updateSettings({ worker_access_enabled: e.target.checked });
        showToast(`Worker access ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
        e.target.checked = !e.target.checked;
      } finally {
        showLoading(false);
      }
    });

    document.getElementById('notifications-toggle')?.addEventListener('change', async (e) => {
      try {
        showLoading(true);
        await api.updateSettings({ notifications_enabled: e.target.checked });
        showToast(`Notifications ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
        e.target.checked = !e.target.checked;
      } finally {
        showLoading(false);
      }
    });

    document.getElementById('business-day-start')?.addEventListener('change', async (e) => {
      try {
        showLoading(true);
        await api.updateSettings({ business_day_start_hour: Number(e.target.value) });
        ownerDashboardHtml = '';
        transactionsHtml = '';
        showToast('Business day timing saved', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        showLoading(false);
      }
    });

    document.getElementById('pin-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const new_worker_pin = document.getElementById('new-worker-pin').value.trim();
      const new_owner_pin = document.getElementById('new-owner-pin').value.trim();
      const current_owner_pin = document.getElementById('current-owner-pin').value.trim();
      const payload = {};
      if (new_worker_pin) payload.new_worker_pin = new_worker_pin;
      if (new_owner_pin) {
        payload.new_owner_pin = new_owner_pin;
        payload.current_owner_pin = current_owner_pin;
      }
      if (!payload.new_worker_pin && !payload.new_owner_pin) {
        return showToast('Enter a new PIN to save', 'error');
      }
      try {
        showLoading(true);
        await api.updateSettings(payload);
        showToast('PIN updated', 'success');
        e.target.reset();
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

function bindEditEntry(tx, returnTo = 'transactions', returnFilters = { period: 'month' }) {
  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value.trim();
    const edit_reason = document.getElementById('edit_reason').value.trim();
    const category = document.getElementById('category')?.value;
    try {
      showLoading(true);
      await api.updateTransaction(tx.id, { amount, note, category, edit_reason });
      ownerDashboardHtml = '';
      transactionsHtml = '';
      showToast('Entry updated', 'success');
      navigate(returnTo === 'manage-entries' ? 'manage-entries' : 'transactions', { filters: returnFilters || { period: 'month' } });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      showLoading(false);
    }
  });
}

// ─── Manage Entries Controller ───────────────────────────────────────────────

async function loadManageEntries(tab = 'transactions', filters = { period: 'month' }) {
  try {
    let records = [];
    if (tab === 'transactions') {
      const params = {};
      if (filters.period) params.period = filters.period;
      if (filters.wallet) params.wallet = filters.wallet;
      if (filters.type) params.type = filters.type;
      if (filters.q) params.q = filters.q;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.test_only) params.test_only = '1';
      params.show_test = '1';
      params.limit = '1000';
      const res = await api.getTransactions(params);
      records = res.transactions || [];
    } else {
      const res = await api.getClosings({ show_test: '1' });
      records = res.closings || [];
    }

    const html = renderManageEntries({ tab, records, filters });
    if (getState().screen !== 'manage-entries' || !document.getElementById('app')) return;
    document.getElementById('app').innerHTML = html;

    bindOwnerNav('manage-entries');

    document.querySelectorAll('.manage-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        loadManageEntries(btn.dataset.tab, filters);
      });
    });

    document.getElementById('manage-filter-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      loadManageEntries(tab, readManageFilters());
    });
    document.getElementById('manage-filter-clear')?.addEventListener('click', () => {
      loadManageEntries(tab, {});
    });
    document.getElementById('manage-filter-test')?.addEventListener('change', (e) => {
      loadManageEntries(tab, { ...readManageFilters(), test_only: e.target.checked });
    });

    document.getElementById('app').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'edit-tx') {
        const tx = records.find(t => String(t.id) === String(id));
        if (tx) navigate('edit-entry', { transaction: tx, returnTo: 'manage-entries', filters });
      } else if (action === 'void-tx') {
        const reason = prompt('Void reason (required):');
        if (!reason) return;
        if (!confirm('Are you sure? This will affect dashboard totals.')) return;
        try {
          showLoading(true);
          await api.voidTransaction(id, reason);
          ownerDashboardHtml = '';
          transactionsHtml = '';
          showToast('Transaction voided successfully', 'success');
          loadManageEntries(tab, filters);
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          showLoading(false);
        }
      } else if (action === 'delete-tx') {
        if (!confirm('Are you sure? This will affect dashboard totals. Test entries are permanently removed.')) return;
        try {
          showLoading(true);
          await api.deleteTransaction(id);
          ownerDashboardHtml = '';
          transactionsHtml = '';
          showToast('Transaction deleted successfully', 'success');
          loadManageEntries(tab, filters);
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          showLoading(false);
        }
      } else if (action === 'void-cl') {
        const reason = prompt('Void reason (required):');
        if (!reason) return;
        if (!confirm('Are you sure? This will affect dashboard totals.')) return;
        try {
          showLoading(true);
          await api.voidClosing(id, reason);
          ownerDashboardHtml = '';
          transactionsHtml = '';
          showToast('Closing record voided successfully', 'success');
          loadManageEntries(tab, filters);
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          showLoading(false);
        }
      } else if (action === 'delete-cl') {
        if (!confirm('Are you sure? This will affect dashboard totals. Test entries are permanently removed.')) return;
        try {
          showLoading(true);
          await api.deleteClosing(id);
          ownerDashboardHtml = '';
          transactionsHtml = '';
          showToast('Closing record deleted successfully', 'success');
          loadManageEntries(tab, filters);
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
