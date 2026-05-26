-- D1 Migration: Add visitor-level persistent tracking to group sessions and identify returning customers.
ALTER TABLE whatsapp_leads ADD COLUMN visitor_id TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN visit_count INTEGER DEFAULT 1;
ALTER TABLE whatsapp_leads ADD COLUMN session_page_views INTEGER DEFAULT 1;

-- Index by visitor_id for quick grouping of customer journeys and retention analysis
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_visitor ON whatsapp_leads (visitor_id, clicked_at DESC);
