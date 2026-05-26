-- Add CRM and auditing fields to whatsapp_leads to track actual booking outcomes.
ALTER TABLE whatsapp_leads ADD COLUMN status TEXT DEFAULT 'new';
ALTER TABLE whatsapp_leads ADD COLUMN admin_notes TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN revenue REAL DEFAULT 0.0;

-- Index by status for quick filtering of active or converted leads in summaries
CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_status ON whatsapp_leads (status, clicked_at DESC);
