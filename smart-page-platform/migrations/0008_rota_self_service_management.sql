ALTER TABLE rota_requests ADD COLUMN decided_by_staff_id TEXT REFERENCES rota_staff(id) ON DELETE SET NULL;
ALTER TABLE rota_settings ADD COLUMN updated_by_staff_id TEXT REFERENCES rota_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rota_staff_role_active ON rota_staff(role, active);
PRAGMA optimize;
