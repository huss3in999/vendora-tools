-- Passenger Care was historically created at runtime. Create its base table so
-- a clean migration sequence is deterministic before adding review fields.
CREATE TABLE IF NOT EXISTS passenger_care_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT NOT NULL,
  booking_ref TEXT NOT NULL,
  outcome TEXT NOT NULL,
  rating INTEGER,
  comment TEXT,
  quoted_price REAL,
  paid_price REAL,
  language TEXT,
  submitted_at TEXT NOT NULL,
  country TEXT,
  city TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  UNIQUE(lead_uuid),
  UNIQUE(booking_ref)
);

ALTER TABLE passenger_care_feedback ADD COLUMN route_slug TEXT;
ALTER TABLE passenger_care_feedback ADD COLUMN route_label TEXT;
ALTER TABLE passenger_care_feedback ADD COLUMN review_approved INTEGER DEFAULT 0;
ALTER TABLE passenger_care_feedback ADD COLUMN review_approved_at TEXT;

CREATE INDEX IF NOT EXISTS idx_pcf_route_reviews
  ON passenger_care_feedback(route_slug, review_approved, submitted_at DESC);
