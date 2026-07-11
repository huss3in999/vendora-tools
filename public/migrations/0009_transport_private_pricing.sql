-- Protected commercial pricing. This table is admin-only and must never be
-- joined into a public response, HTML rewrite, analytics event, or schema.
CREATE TABLE IF NOT EXISTS transport_private_route_pricing (
  route_slug TEXT PRIMARY KEY,
  private_minimum_bhd REAL,
  currency TEXT NOT NULL DEFAULT 'BHD',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (private_minimum_bhd IS NULL OR private_minimum_bhd >= 0)
);

INSERT OR IGNORE INTO transport_private_route_pricing (route_slug, private_minimum_bhd) VALUES
  ('king-fahd-causeway', 20),
  ('bahrain-to-khobar', 25),
  ('first-stop-after-causeway', 25),
  ('bahrain-to-dammam-airport', 35),
  ('bahrain-to-al-ahsa', 55),
  ('bahrain-to-jubail', 55),
  ('bahrain-to-riyadh', 110),
  ('bahrain-to-madinah', NULL),
  ('bahrain-to-makkah', NULL),
  ('bahrain-to-khafji', NULL),
  ('bahrain-to-kuwait', 100),
  ('bahrain-to-abdali', NULL),
  ('bahrain-to-safwan', 200),
  ('bahrain-to-iraq', NULL),
  ('bahrain-to-qatar', 100),
  ('bahrain-to-dubai', 230),
  ('bahrain-to-abu-dhabi', 210),
  ('bahrain-to-oman', 300),
  ('bahrain-sightseeing-full-day', 65),
  ('bahrain-sightseeing-afternoon', 55),
  ('dammam-shopping-full-day', NULL),
  ('dammam-shopping-afternoon', NULL),
  ('additional-gcc-vehicle-day', 50);

ALTER TABLE transport_public_routes ADD COLUMN currency TEXT NOT NULL DEFAULT 'BHD';
ALTER TABLE transport_public_routes ADD COLUMN trip_type TEXT NOT NULL DEFAULT 'one_way';
ALTER TABLE transport_public_routes ADD COLUMN public_price_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transport_public_routes ADD COLUMN approximate_sar_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transport_public_routes ADD COLUMN causeway_toll_included INTEGER NOT NULL DEFAULT 0;

UPDATE transport_public_routes
SET approximate_sar_enabled = 1
WHERE route_slug IN (
  'king-fahd-causeway', 'bahrain-to-khobar', 'first-stop-after-causeway',
  'bahrain-to-dammam-airport', 'bahrain-to-al-ahsa', 'bahrain-to-jubail',
  'bahrain-to-riyadh', 'bahrain-to-madinah', 'bahrain-to-makkah',
  'bahrain-to-khafji'
);

UPDATE transport_public_routes
SET causeway_toll_included = 1
WHERE route_slug NOT IN ('bahrain-sightseeing-full-day', 'bahrain-sightseeing-afternoon');

UPDATE transport_public_routes
SET trip_type = 'full_day'
WHERE unit_kind = 'package';

UPDATE transport_public_routes
SET trip_type = 'additional_day'
WHERE unit_kind = 'per_day';

ALTER TABLE whatsapp_leads ADD COLUMN customer_paid_amount REAL;
ALTER TABLE whatsapp_leads ADD COLUMN driver_payout_amount REAL;
ALTER TABLE whatsapp_leads ADD COLUMN actual_commission REAL;
