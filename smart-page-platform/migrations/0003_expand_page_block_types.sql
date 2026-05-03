PRAGMA foreign_keys = OFF;

CREATE TABLE page_blocks_new (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'header',
      'text',
      'link_button',
      'image',
      'video',
      'whatsapp_button',
      'divider',
      'profile',
      'social_links',
      'faq',
      'map_location',
      'price_list',
      'gallery',
      'contact_card',
      'countdown',
      'announcement'
    )
  ),
  sort_order INTEGER NOT NULL,
  props_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  UNIQUE (page_id, sort_order)
);

INSERT INTO page_blocks_new (id, page_id, type, sort_order, props_json, created_at, updated_at)
SELECT id, page_id, type, sort_order, props_json, created_at, updated_at
FROM page_blocks;

DROP TABLE page_blocks;
ALTER TABLE page_blocks_new RENAME TO page_blocks;

CREATE INDEX IF NOT EXISTS idx_page_blocks_page_sort ON page_blocks(page_id, sort_order);

PRAGMA foreign_keys = ON;
