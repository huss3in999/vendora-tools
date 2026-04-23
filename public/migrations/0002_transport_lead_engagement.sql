-- Add richer lead intelligence for WhatsApp click reporting.

ALTER TABLE whatsapp_leads ADD COLUMN session_id TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN page_loaded_at TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN time_on_page_ms INTEGER;
ALTER TABLE whatsapp_leads ADD COLUMN scroll_depth_percent INTEGER;
ALTER TABLE whatsapp_leads ADD COLUMN click_x INTEGER;
ALTER TABLE whatsapp_leads ADD COLUMN click_y INTEGER;
ALTER TABLE whatsapp_leads ADD COLUMN click_text TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN browser_language TEXT;
ALTER TABLE whatsapp_leads ADD COLUMN screen_width INTEGER;
ALTER TABLE whatsapp_leads ADD COLUMN screen_height INTEGER;
ALTER TABLE whatsapp_leads ADD COLUMN timezone_offset_minutes INTEGER;
ALTER TABLE whatsapp_leads ADD COLUMN interaction_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_session
  ON whatsapp_leads (session_id, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_time_on_page
  ON whatsapp_leads (time_on_page_ms, clicked_at DESC);
