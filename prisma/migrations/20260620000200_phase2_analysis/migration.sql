-- Phase 2 — Product Analysis Engine: snapshots + analyses (org-scoped, RLS).

CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ── product_snapshots ────────────────────────────────────────
CREATE TABLE "product_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "title" TEXT,
    "description" TEXT,
    "features" JSONB,
    "images" JSONB,
    "reviews" JSONB,
    "content_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_snapshots_organization_id_project_id_idx" ON "product_snapshots"("organization_id", "project_id");

-- ── product_analyses ─────────────────────────────────────────
CREATE TABLE "product_analyses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "snapshot_id" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "model" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_analyses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_analyses_organization_id_project_id_created_at_idx" ON "product_analyses"("organization_id", "project_id", "created_at");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "product_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── row-level security (tenant isolation; see 20260620000100) ─
ALTER TABLE "product_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_snapshots" FORCE ROW LEVEL SECURITY;
CREATE POLICY "product_snapshots_tenant_isolation" ON "product_snapshots"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "product_analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_analyses" FORCE ROW LEVEL SECURITY;
CREATE POLICY "product_analyses_tenant_isolation" ON "product_analyses"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
