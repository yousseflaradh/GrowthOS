-- Phase 4 — Market & Comment Intelligence: competitor ads, comments, reports.

CREATE TYPE "AdSource" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'MANUAL', 'OTHER');
CREATE TYPE "IntelStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ── competitor_ads ───────────────────────────────────────────
CREATE TABLE "competitor_ads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source" "AdSource" NOT NULL DEFAULT 'MANUAL',
    "advertiser" TEXT,
    "ad_text" TEXT NOT NULL,
    "media_url" TEXT,
    "landing_url" TEXT,
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_ads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "competitor_ads_organization_id_project_id_idx" ON "competitor_ads"("organization_id", "project_id");

-- ── ad_comments ──────────────────────────────────────────────
CREATE TABLE "ad_comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "ad_id" TEXT,
    "source" "AdSource" NOT NULL DEFAULT 'MANUAL',
    "author" TEXT,
    "text" TEXT NOT NULL,
    "sentiment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ad_comments_organization_id_project_id_idx" ON "ad_comments"("organization_id", "project_id");

-- ── intel_reports ────────────────────────────────────────────
CREATE TABLE "intel_reports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "IntelStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "intel_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "intel_reports_organization_id_project_id_created_at_idx" ON "intel_reports"("organization_id", "project_id", "created_at");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "competitor_ads" ADD CONSTRAINT "competitor_ads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_comments" ADD CONSTRAINT "ad_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_comments" ADD CONSTRAINT "ad_comments_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "competitor_ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intel_reports" ADD CONSTRAINT "intel_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── row-level security ───────────────────────────────────────
ALTER TABLE "competitor_ads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "competitor_ads" FORCE ROW LEVEL SECURITY;
CREATE POLICY "competitor_ads_tenant_isolation" ON "competitor_ads"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "ad_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ad_comments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ad_comments_tenant_isolation" ON "ad_comments"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "intel_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "intel_reports" FORCE ROW LEVEL SECURITY;
CREATE POLICY "intel_reports_tenant_isolation" ON "intel_reports"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
