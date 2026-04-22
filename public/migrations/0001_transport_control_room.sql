-- Transport Admin Control Room - Phase 1
-- D1 schema for dynamic route pricing and WhatsApp lead capture.

CREATE TABLE IF NOT EXISTS routes_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_slug TEXT NOT NULL UNIQUE,
  route_name_ar TEXT NOT NULL,
  route_name_en TEXT NOT NULL,
  origin_country TEXT,
  origin_city TEXT,
  destination_country TEXT,
  destination_city TEXT,
  price_bd REAL,
  currency TEXT NOT NULL DEFAULT 'BHD',
  is_visible INTEGER NOT NULL DEFAULT 0 CHECK (is_visible IN (0, 1)),
  notes_ar TEXT,
  notes_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_routes_pricing_visible
  ON routes_pricing (is_visible, sort_order, route_slug);

CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT NOT NULL UNIQUE,
  clicked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  client_clicked_at TEXT,
  route_slug TEXT,
  route_label TEXT,
  service_type TEXT,
  from_country TEXT,
  from_city TEXT,
  to_country TEXT,
  to_city TEXT,
  page_url TEXT,
  page_path TEXT,
  target_url TEXT,
  language TEXT,
  device_type TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  ip_address TEXT,
  cf_city TEXT,
  cf_region TEXT,
  cf_country TEXT,
  cf_timezone TEXT,
  user_agent TEXT,
  request_ray_id TEXT,
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_clicked_at
  ON whatsapp_leads (clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_route
  ON whatsapp_leads (route_slug, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_utm
  ON whatsapp_leads (utm_source, utm_campaign, clicked_at DESC);
