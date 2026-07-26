-- D1 Migration: Business & Visitor Intelligence additions

CREATE TABLE IF NOT EXISTS lead_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  changed_by TEXT NOT NULL DEFAULT 'admin',
  admin_notes TEXT,
  quoted_price REAL,
  revenue REAL
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON lead_status_history (lead_uuid, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_status ON lead_status_history (new_status, changed_at DESC);

ALTER TABLE analytics_events ADD COLUMN active_seconds INTEGER DEFAULT 0;
ALTER TABLE analytics_events ADD COLUMN is_bot INTEGER DEFAULT 0;
ALTER TABLE analytics_events ADD COLUMN bot_type TEXT;
ALTER TABLE analytics_events ADD COLUMN confidence_score TEXT DEFAULT 'HIGH';

ALTER TABLE whatsapp_leads ADD COLUMN is_bot INTEGER DEFAULT 0;
ALTER TABLE whatsapp_leads ADD COLUMN bot_type TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN active_seconds INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS daily_analytics_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aggregate_date TEXT NOT NULL,
  route_slug TEXT,
  page_path TEXT,
  traffic_source TEXT,
  country TEXT,
  device_type TEXT,
  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  quote_requests INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0.0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(aggregate_date, route_slug, page_path, traffic_source, country, device_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_aggregates_date ON daily_analytics_aggregates (aggregate_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_aggregates_route ON daily_analytics_aggregates (route_slug, aggregate_date DESC);
