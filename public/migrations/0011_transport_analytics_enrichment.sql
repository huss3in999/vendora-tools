-- Privacy-safe session enrichment for the existing transport analytics system.
-- No raw IP address is stored. Cloudflare-derived geography/network metadata is
-- approximate and kept separate from observed browser/client values.

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id TEXT PRIMARY KEY,
  visitor_id TEXT,
  first_visit_at TEXT,
  session_started_at TEXT,
  first_seen_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  visit_count INTEGER DEFAULT 1,
  is_returning INTEGER DEFAULT 0,
  visitor_local_time TEXT,
  landing_url TEXT,
  landing_path TEXT,
  landing_title TEXT,
  referrer TEXT,
  referrer_host TEXT,
  referrer_path TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  gclid TEXT,
  fbclid TEXT,
  ttclid TEXT,
  msclkid TEXT,
  dclid TEXT,
  traffic_source TEXT,
  source_category TEXT,
  ai_referral_source TEXT,
  language TEXT,
  browser_languages TEXT,
  browser_timezone TEXT,
  device_type TEXT,
  browser_name TEXT,
  browser_version TEXT,
  operating_system TEXT,
  operating_system_version TEXT,
  device_vendor TEXT,
  device_model TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  device_pixel_ratio REAL,
  touch_support INTEGER,
  color_scheme TEXT,
  connection_type TEXT,
  effective_connection_type TEXT,
  downlink_mbps REAL,
  round_trip_ms INTEGER,
  save_data INTEGER,
  cf_country TEXT,
  cf_region TEXT,
  cf_city TEXT,
  cf_timezone TEXT,
  http_protocol TEXT,
  asn INTEGER,
  network_organization TEXT,
  bot_score INTEGER,
  verified_bot INTEGER,
  client_hints TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON analytics_sessions (visitor_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_source ON analytics_sessions (source_category, traffic_source, session_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_country ON analytics_sessions (cf_country, session_started_at DESC);

ALTER TABLE whatsapp_leads ADD COLUMN session_snapshot_json TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN lead_snapshot_at TEXT;

