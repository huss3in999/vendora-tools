-- Cash Control D1 Schema
-- Run with: wrangler d1 execute cash-control-db --file=backend/schema.sql

-- Users (PIN auth references env vars; table stores role metadata)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'worker')),
  pin_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- All money movements
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'cash_sale', 'benefitpay_sale', 'expense',
    'cash_taken_by_owner', 'cash_added_by_owner',
    'closing_count', 'toy_collection', 'toy_collected_by_owner',
    'correction'
  )),
  wallet TEXT NOT NULL CHECK (wallet IN ('daily_cash', 'benefitpay', 'toys_monthly')),
  amount REAL NOT NULL,
  category TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided', 'deleted')),
  is_test INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,
  updated_at TEXT,
  void_reason TEXT,
  edit_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(business_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_test ON transactions(is_test);

-- End-of-day closing records
CREATE TABLE IF NOT EXISTS daily_closings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_date TEXT NOT NULL UNIQUE,
  opening_cash REAL NOT NULL DEFAULT 0,
  expected_cash REAL NOT NULL,
  actual_cash REAL NOT NULL,
  difference REAL NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided', 'deleted')),
  is_test INTEGER NOT NULL DEFAULT 0,
  closed_by TEXT NOT NULL,
  closed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_closings_date ON daily_closings(business_date);

-- App settings (test mode, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default users (PINs verified against Worker env vars, not stored here)
INSERT OR IGNORE INTO users (id, name, role, pin_key, status) VALUES
  (1, 'Owner', 'owner', 'owner', 'active'),
  (2, 'Worker', 'worker', 'worker', 'active');

-- Default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('test_mode', '0');
