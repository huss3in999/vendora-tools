-- SEO settings for public discoverability (/p/:code).
ALTER TABLE pages ADD COLUMN seo_title TEXT;
ALTER TABLE pages ADD COLUMN seo_description TEXT;
ALTER TABLE pages ADD COLUMN allow_indexing INTEGER NOT NULL DEFAULT 1 CHECK (allow_indexing IN (0, 1));
