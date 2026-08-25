PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rota_staff (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager')),
  pin_hash TEXT,
  force_pin_reset INTEGER NOT NULL DEFAULT 0 CHECK (force_pin_reset IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rota_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  timezone TEXT NOT NULL DEFAULT 'Asia/Bahrain',
  timezone_offset_minutes INTEGER NOT NULL DEFAULT 180,
  week_start_day INTEGER NOT NULL DEFAULT 5 CHECK (week_start_day BETWEEN 0 AND 6),
  cutoff_day INTEGER NOT NULL DEFAULT 0 CHECK (cutoff_day BETWEEN 0 AND 6),
  cutoff_time TEXT NOT NULL DEFAULT '23:59',
  total_staff INTEGER NOT NULL DEFAULT 7 CHECK (total_staff BETWEEN 1 AND 50),
  minimum_morning INTEGER NOT NULL DEFAULT 2 CHECK (minimum_morning BETWEEN 0 AND 20),
  minimum_closing INTEGER NOT NULL DEFAULT 2 CHECK (minimum_closing BETWEEN 0 AND 20),
  max_absent_per_day INTEGER NOT NULL DEFAULT 2 CHECK (max_absent_per_day BETWEEN 0 AND 20),
  allow_emergency_override INTEGER NOT NULL DEFAULT 1 CHECK (allow_emergency_override IN (0, 1)),
  shift_templates_json TEXT NOT NULL DEFAULT '{"normal":{"morning":["08:00-17:00","09:00-18:00"],"mid":["10:00-19:00","11:00-20:00"],"closing":["13:00-22:00"]},"weekend":{"days":[4,5],"mid":["12:00-21:00","13:00-22:00"],"closing":["15:00-00:00"]}}',
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rota_requests (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('day_off', 'morning', 'mid', 'closing', 'shift_swap', 'annual_leave', 'emergency_leave', 'other')),
  original_target_date TEXT NOT NULL,
  target_date TEXT NOT NULL,
  rota_week_start TEXT NOT NULL,
  shift_detail TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancel_requested', 'cancelled')),
  manager_note TEXT,
  late_submission INTEGER NOT NULL DEFAULT 0 CHECK (late_submission IN (0, 1)),
  decided_by_user_id TEXT,
  decided_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES rota_staff(id) ON DELETE RESTRICT,
  FOREIGN KEY (decided_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rota_request_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('staff', 'manager', 'system')),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES rota_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rota_notifications (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  manager_user_id TEXT,
  request_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((staff_id IS NOT NULL AND manager_user_id IS NULL) OR (staff_id IS NULL AND manager_user_id IS NOT NULL)),
  FOREIGN KEY (staff_id) REFERENCES rota_staff(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES rota_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rota_push_subscriptions (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  manager_user_id TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_success_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((staff_id IS NOT NULL AND manager_user_id IS NULL) OR (staff_id IS NULL AND manager_user_id IS NOT NULL)),
  FOREIGN KEY (staff_id) REFERENCES rota_staff(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rota_login_attempts (
  attempt_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TEXT
);

INSERT OR IGNORE INTO rota_settings (id) VALUES (1);

INSERT OR IGNORE INTO rota_staff (id, employee_id, name, role) VALUES
  ('rst_hussain', '44009', 'Hussain Mahdi Yusuf Yaqoob', 'manager'),
  ('rst_sara', '401897', 'Sara Isa Turki Matrook', 'staff'),
  ('rst_jonathan', '43193', 'Jonathan Braza Tacuycuy', 'staff'),
  ('rst_barbie', '401363', 'Barbie Ann Buendia', 'staff'),
  ('rst_khadija', '508238', 'Khadija Ebrahim', 'staff'),
  ('rst_sonam', '402372', 'Sonam Deki', 'staff'),
  ('rst_anum', '401678', 'Anum Noreen Muhammad A.Rehman', 'staff');

CREATE INDEX IF NOT EXISTS idx_rota_requests_staff_time ON rota_requests(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rota_requests_week_status ON rota_requests(rota_week_start, status);
CREATE INDEX IF NOT EXISTS idx_rota_requests_target_status ON rota_requests(target_date, status);
CREATE INDEX IF NOT EXISTS idx_rota_events_request_time ON rota_request_events(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rota_notifications_staff_unread ON rota_notifications(staff_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rota_notifications_manager_unread ON rota_notifications(manager_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rota_push_staff ON rota_push_subscriptions(staff_id);
CREATE INDEX IF NOT EXISTS idx_rota_push_manager ON rota_push_subscriptions(manager_user_id);

PRAGMA optimize;
