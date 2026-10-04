-- Per-concept hooks for UGC concepts (static/video hooks ride in their JSON).
ALTER TABLE "ugc_concepts" ADD COLUMN IF NOT EXISTS "hooks" JSONB;
