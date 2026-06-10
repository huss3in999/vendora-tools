CREATE TABLE IF NOT EXISTS nada_menu_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price REAL DEFAULT 0,
  image TEXT,
  image_key TEXT,
  category TEXT,
  available_today INTEGER DEFAULT 1,
  confirmed_tomorrow INTEGER DEFAULT 0,
  available_tomorrow INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  popular INTEGER DEFAULT 0,
  sold_out INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  available_from TEXT,
  available_to TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS nada_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hidden INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS nada_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS nada_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  fulfillment_type TEXT,
  preferred_time TEXT,
  total REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Pending Confirmation',
  whatsapp_sent INTEGER DEFAULT 0,
  items_json TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS nada_tomorrow_requests (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  food_item_id TEXT,
  food_title TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  preferred_time TEXT,
  is_custom INTEGER DEFAULT 0,
  reserve INTEGER DEFAULT 0,
  session_id TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS nada_customer_suggestions (
  id TEXT PRIMARY KEY,
  dish_name TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS nada_cooking_decisions (
  item_id TEXT PRIMARY KEY,
  status_json TEXT NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS nada_behavior_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  action TEXT,
  details_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_nada_items_visible ON nada_menu_items (visible, available_today, available_tomorrow);
CREATE INDEX IF NOT EXISTS idx_nada_requests_item ON nada_tomorrow_requests (item_id);
CREATE INDEX IF NOT EXISTS idx_nada_orders_created ON nada_orders (created_at DESC);
