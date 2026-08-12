-- D1 Migration: Additive indexes and backward-compatible prepared customer_email column.
-- No existing rows or tables are deleted, truncated, or modified destructively.

ALTER TABLE whatsapp_leads ADD COLUMN customer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_visitor_date ON whatsapp_leads (visitor_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_session_date ON whatsapp_leads (session_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_confirmed ON whatsapp_leads (whatsapp_confirmed_at, clicked_at DESC);
