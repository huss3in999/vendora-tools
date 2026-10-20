-- Keep exact customer-to-WhatsApp outbound taps separate from contact intents,
-- modal cancellations, and other WhatsApp-related interactions.
-- Historical aggregates are intentionally not backfilled; this metric is
-- complete from the migration onward and must be labeled that way in reports.
ALTER TABLE daily_analytics_aggregates
  ADD COLUMN whatsapp_outbound_clicks INTEGER NOT NULL DEFAULT 0;
