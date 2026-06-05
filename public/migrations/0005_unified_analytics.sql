-- D1 Migration: Add analytics_events table for unified server-side tracking.

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  page_url TEXT,
  page_path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_label TEXT,
  route_name TEXT,
  button_text TEXT,
  target_url TEXT,
  language TEXT,
  device_type TEXT,
  user_agent TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  lead_status TEXT,
  ip_city TEXT,
  ip_region TEXT,
  ip_country TEXT,
  ip_timezone TEXT,
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events (visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events (event_name, created_at DESC);
