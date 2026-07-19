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
CREATE INDEX IF NOT EXISTS idx_transactions_dashboard
  ON transactions(status, is_test, business_date, wallet, type);
CREATE INDEX IF NOT EXISTS idx_transactions_toys_month
  ON transactions(wallet, status, is_test, business_date, type);

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
CREATE INDEX IF NOT EXISTS idx_closings_active_date
  ON daily_closings(status, is_test, business_date);

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
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('worker_access_enabled', '1');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('notifications_enabled', '0');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('business_day_start_hour', '16');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('auth_version', '1');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('owner_auth_version', '1');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('worker_auth_version', '1');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('accountant_auth_version', '1');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('accountant_access_enabled', '1');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('expense_options', '["Potato","Petrol","Tea","Food products","Drinks","Packaging","Cleaning","Maintenance","Delivery","Other"]');

-- Owner purchases are deliberately separate from the cash-control transaction ledger.
CREATE TABLE IF NOT EXISTS purchase_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  category_id INTEGER,
  default_unit TEXT,
  is_favourite INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  display_order INTEGER NOT NULL DEFAULT 0,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (category_id) REFERENCES purchase_categories(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  location TEXT,
  phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS owner_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_date TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  supplier_id INTEGER,
  supplier_name_snapshot TEXT,
  entry_mode TEXT NOT NULL CHECK (entry_mode IN ('detailed', 'quick')),
  category_id INTEGER,
  category_name_snapshot TEXT,
  total_amount REAL NOT NULL CHECK (total_amount > 0),
  note TEXT,
  receipt_key TEXT,
  receipt_name TEXT,
  receipt_type TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided', 'deleted')),
  is_test INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,
  updated_at TEXT,
  edit_reason TEXT,
  void_reason TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (category_id) REFERENCES purchase_categories(id)
);

CREATE TABLE IF NOT EXISTS owner_purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name_snapshot TEXT NOT NULL,
  category_name_snapshot TEXT,
  quantity REAL,
  unit TEXT,
  unit_price REAL,
  line_total REAL NOT NULL CHECK (line_total > 0),
  note TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (purchase_id) REFERENCES owner_purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_categories_status_order ON purchase_categories(status, display_order, name);
CREATE INDEX IF NOT EXISTS idx_products_status_order ON products(status, is_favourite, display_order, name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status_name ON suppliers(status, name);
CREATE INDEX IF NOT EXISTS idx_owner_purchases_date ON owner_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_owner_purchases_reporting ON owner_purchases(status, is_test, purchase_date, entry_mode);
CREATE INDEX IF NOT EXISTS idx_owner_purchases_supplier ON owner_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_owner_purchases_category ON owner_purchases(category_id);
CREATE INDEX IF NOT EXISTS idx_owner_purchase_items_purchase ON owner_purchase_items(purchase_id, display_order);
CREATE INDEX IF NOT EXISTS idx_owner_purchase_items_product ON owner_purchase_items(product_id);

-- Small editable category seed; no products are seeded.
INSERT OR IGNORE INTO purchase_categories (name, display_order) VALUES
  ('Ingredients', 10), ('Frozen Food', 20), ('Sauces and Seasoning', 30),
  ('Corn and Popcorn', 40), ('Cooking Oil', 50), ('Drinks', 60),
  ('Packaging', 70), ('Disposable Items', 80), ('Cleaning', 90),
  ('Tools and Equipment', 100), ('Other', 110);
