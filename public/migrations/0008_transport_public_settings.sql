-- Public-only transport settings and customer pricing.
-- Confidential driver rates must never be stored in these tables.

CREATE TABLE IF NOT EXISTS transport_public_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS transport_public_routes (
  route_slug TEXT PRIMARY KEY,
  route_name_ar TEXT NOT NULL,
  route_name_en TEXT NOT NULL,
  price_bhd REAL,
  price_kind TEXT NOT NULL DEFAULT 'standard' CHECK (price_kind IN ('standard', 'from')),
  unit_kind TEXT NOT NULL DEFAULT 'one_way_vehicle',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  whatsapp_override TEXT,
  booking_notice_ar TEXT,
  booking_notice_en TEXT,
  included_ar TEXT,
  included_en TEXT,
  route_notes_ar TEXT,
  route_notes_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_transport_public_routes_active
  ON transport_public_routes (is_active, sort_order, route_slug);

ALTER TABLE whatsapp_leads ADD COLUMN care_token TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN booking_phone_used TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN public_price_shown REAL;
ALTER TABLE whatsapp_leads ADD COLUMN customer_name TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN customer_phone TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN follow_up_consent INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_leads_care_token
  ON whatsapp_leads(care_token) WHERE care_token IS NOT NULL AND care_token <> '';

