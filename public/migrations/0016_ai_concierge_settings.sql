-- AI Concierge control state. Provider credentials remain Worker bindings/secrets.
CREATE TABLE IF NOT EXISTS concierge_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'cloudflare',
  model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.1-8b-instruct-fast',
  allow_fallback INTEGER NOT NULL DEFAULT 0,
  instructions TEXT NOT NULL DEFAULT '',
  reference_name TEXT NOT NULL DEFAULT '',
  reference_data TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
