-- Route review fields on existing Passenger Care feedback (applied at runtime by ensurePassengerCareSchema).
ALTER TABLE passenger_care_feedback ADD COLUMN route_slug TEXT;
ALTER TABLE passenger_care_feedback ADD COLUMN route_label TEXT;
ALTER TABLE passenger_care_feedback ADD COLUMN review_approved INTEGER DEFAULT 0;
ALTER TABLE passenger_care_feedback ADD COLUMN review_approved_at TEXT;

CREATE INDEX IF NOT EXISTS idx_pcf_route_reviews
  ON passenger_care_feedback(route_slug, review_approved, submitted_at DESC);
