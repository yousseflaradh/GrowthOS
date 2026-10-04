-- Per-version color palette for the landing page.
ALTER TABLE "page_versions" ADD COLUMN IF NOT EXISTS "theme" TEXT;
