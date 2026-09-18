-- Incremental, privacy-safe reporting rollup.
--
-- This migration intentionally does not backfill historical rows. A later
-- controlled batch job may populate them in bounded windows. Runtime tracking
-- only adds one row per accepted, meaningful event.
CREATE TABLE IF NOT EXISTS daily_analytics_aggregates (
  aggregate_date TEXT NOT NULL,
  route_name TEXT NOT NULL DEFAULT '',
  page_path TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  events INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  confirmed_bookings INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (aggregate_date, route_name, page_path, country)
);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_date
  ON daily_analytics_aggregates (aggregate_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_route_date
  ON daily_analytics_aggregates (route_name, aggregate_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_page_date
  ON daily_analytics_aggregates (page_path, aggregate_date DESC);
