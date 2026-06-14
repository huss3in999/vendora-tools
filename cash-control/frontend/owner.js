/**
 * Owner screens — dashboard, transactions, edit/void, settings, toys collection
 */

import * as api from './api.js';
import {
  formatBD, formatDateTime, todayLabel, showToast, showLoading, navigate,
  amountInput, noteInput, backHeader, screenLayout, EXPENSE_CATEGORIES,
  TYPE_LABELS, WALLET_LABELS, cashBreakdown, heroCashBlock, bindInstallButton,
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

function ownerDashboardStats(d) {
  const lastActual = d.last_actual_closing != null ? formatBD(d.last_actual_closing) : '-';
  const lastDifference = d.last_closing_difference != null ? formatBD(d.last_closing_difference) : '-';

  return `
    <div class="section-title">Owner Dashboard</div>
    <div class="stat-grid owner-stat-order">
      ${statCard('Today Cash Sales', formatBD(d.today_cash_sales))}
      ${statCard('Today BenefitPay', formatBD(d.today_benefitpay))}
      ${statCard('Today Expenses', formatBD(d.today_expenses))}
      ${statCard('Cash Taken By Owner Today', formatBD(d.cash_taken_today || 0))}
      ${statCard('Cash Added By Owner Today', formatBD(d.cash_added_today || 0))}
      ${statCard('Last Actual Closing', lastActual)}
      ${statCard('Last Closing Difference', lastDifference)}
      ${statCard('Toys Saved This Month', formatBD(d.toys_month_balance), { highlight: true })}
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
    ${heroCashBlock(d, {
      totalKey: 'expected_cash_with_worker',
      label: 'Cash With Worker Now',
      sub: 'Last actual closing + cash sales + owner added - expenses - owner taken + corrections',
      heroClass: 'owner cash-now',
      baseLabel: 'Last Actual Closing',
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
      sub: 'Opening + sales − expenses − taken = total now',
      heroClass: 'owner',
    }) : ''}

    ${cashBreakdown(d, 'Cash With Worker Now', 'expected_cash_with_worker', { baseLabel: 'Last Actual Closing' })}

    <div class="section-title">Quick Actions</div>
    <div class="action-grid owner-actions">
      <button class="action-btn" data-action="owner-took-cash">
        <span class="action-icon">BD</span><span>Owner Took Cash</span>
      </button>
      <button class="action-btn" data-action="owner-added-cash">
        <span class="action-icon">BD</span><span>Owner Added Cash</span>
      </button>
      <button class="action-btn" data-action="add-expense">
        <span class="action-icon">-</span><span>Add Expense</span>
      </button>
      <button class="action-btn" data-action="add-cash-sale">
        <span class="action-icon">+</span><span>Add Cash Sale</span>
      </button>
      <button class="action-btn" data-action="add-benefitpay-sale">
        <span class="action-icon">BP</span><span>Add BenefitPay Sale</span>
      </button>
      <button class="action-btn" data-action="close-day">
        <span class="action-icon">OK</span><span>Close Day</span>
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
    <div class="section-title">Other Today</div>
    <div class="stat-grid">
      ${statCard('BenefitPay (to you)', formatBD(d.today_benefitpay))}
      ${statCard('Expenses Today', formatBD(d.today_expenses))}
      ${statCard('Taken Today', formatBD(d.cash_taken_today || 0))}
    </div>
    </div>

    <div class="hidden">
    <div class="section-title">Last Closing</div>
    <div class="stat-grid two-col">
      ${statCard('Actual Counted', d.last_actual_closing != null ? formatBD(d.last_actual_closing) : '—')}
      ${statCard('Difference', d.last_closing_difference != null ? formatBD(d.last_closing_difference) : '—')}
    </div>
    </div>

    <div class="section-title">Reports</div>
    <div class="action-grid owner-actions secondary-actions">
      <button class="action-btn" data-nav="transactions">
        <span class="action-icon">ðŸ“‹</span><span>Transactions</span>
      </button>
      <button class="action-btn" data-action="export">
        <span class="action-icon">ðŸ“¤</span><span>Export CSV</span>
      </button>
    </div>

    <div class="hidden">
    <div class="section-title">This Month</div>
    <div class="stat-grid">
      ${statCard('Cash Sales', formatBD(d.month_cash_sales))}
      ${statCard('BenefitPay', formatBD(d.month_benefitpay))}
      ${statCard('Expenses', formatBD(d.month_expenses))}
      ${statCard('Toys Saved', formatBD(d.toys_month_balance), { highlight: true })}
    </div>
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
      <form id="opening-cash-form" class="form-card">
        <h3>Set Starting Cash Today</h3>
        <p class="setting-desc">If worker already had cash before today (no close day done), set it here once.</p>
        ${amountInput('opening-amount', 'Cash From Before Today')}
        ${noteInput('opening-note')}
        <button type="submit" class="btn btn-secondary btn-full">Set Opening Cash</button>
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
    ${backHeader('Admin Settings')}
    <div class="settings-list">

      <div class="setting-section">
        <h3>📱 Install App (Owner Only)</h3>
        <p class="setting-desc">Add to your phone home screen. Worker uses the link in browser only.</p>
        <button class="btn btn-primary btn-full hidden" id="install-app-btn">Install on My Phone</button>
        <p class="form-hint">If button hidden: Chrome menu → Add to Home screen</p>
      </div>

      <div class="setting-section">
        <h3>🔐 PIN & Access Control</h3>
        <form id="pin-form" class="form-card">
          <div class="form-group">
            <label>New Worker PIN</label>
            <input type="password" id="new-worker-pin" inputmode="numeric" placeholder="Leave blank to keep current">
          </div>
          <div class="form-group">
            <label>New Owner PIN</label>
            <input type="password" id="new-owner-pin" inputmode="numeric" placeholder="Leave blank to keep current">
          </div>
          <div class="form-group">
            <label>Current Owner PIN (required to change owner PIN)</label>
            <input type="password" id="current-owner-pin" inputmode="numeric">
          </div>
          <button type="submit" class="btn btn-primary btn-full">Save PIN Changes</button>
        </form>
        <div class="setting-row">
          <div>
            <strong>Worker Can Login</strong>
            <p class="setting-desc">Turn off to block worker access</p>
          </div>
          <label class="toggle">
            <input type="checkbox" id="worker-login-toggle" ${d.worker_login_enabled !== false ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-section">
        <h3>⚙️ App Settings</h3>
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
      </div>

      <div class="danger-zone">
        <h3>⚠️ Danger Zone</h3>
        <p>Use Transactions → select multiple → bulk void or delete.</p>
      </div>
    </div>
  `, { bottomNav: ownerBottomNav('settings') });
}

// ─── Screen bindings ─────────────────────────────────────────────────────────

async function renderAdminSettings(d) {
  const workerAccessEnabled = d.worker_access_enabled !== false;
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
    await saveQuickEntry(() => api.cashTakenByOwner(amount, note), `Recorded: owner took ${formatBD(amount)}`);
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
    const category = prompt(`Category:\n${EXPENSE_CATEGORIES.join('\n')}`) || 'Other';
    const note = prompt('Note (optional):') || undefined;
    await saveQuickEntry(
      () => api.createTransaction({ type: 'expense', amount, category, note }),
      `Expense saved: ${formatBD(amount)}`,
    );
  });

  document.querySelector('[data-action="add-cash-sale"]')?.addEventListener('click', async () => {
    const amount = readAmount('Cash sale amount? (BD)');
    if (amount == null) return;
    const note = prompt('Note (optional):') || undefined;
    await saveQuickEntry(
      () => api.createTransaction({ type: 'cash_sale', amount, note }),
      `Cash sale saved: ${formatBD(amount)}`,
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
    const html = await renderOwnerDashboard(d);
    document.getElementById('app').innerHTML = html;
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
        await api.cashTakenByOwner(amount, note);
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
    document.getElementById('app').innerHTML = await renderAdminSettings(d);
    bindOwnerNav('settings');
    bindInstallButton('install-app-btn');

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
