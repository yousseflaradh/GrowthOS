-- Phase 7 — Competitor Intelligence Engine.

-- ── competitors ──────────────────────────────────────────────
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "competitors_project_id_url_key" ON "competitors"("project_id", "url");
CREATE INDEX "competitors_org_project_idx" ON "competitors"("organization_id", "project_id");

-- ── competitor_snapshots ─────────────────────────────────────
CREATE TABLE "competitor_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "competitor_id" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitor_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "competitor_snapshots_org_competitor_idx" ON "competitor_snapshots"("organization_id", "competitor_id");

-- ── competitor_analyses ──────────────────────────────────────
CREATE TABLE "competitor_analyses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "competitor_id" TEXT NOT NULL,
    "snapshot_id" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PROCESSING',
    "result" JSONB,
    "model" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "competitor_analyses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "competitor_analyses_org_competitor_created_idx" ON "competitor_analyses"("organization_id", "competitor_id", "created_at");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_competitor_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competitor_analyses" ADD CONSTRAINT "competitor_analyses_competitor_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competitor_analyses" ADD CONSTRAINT "competitor_analyses_snapshot_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "competitor_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── row-level security ───────────────────────────────────────
ALTER TABLE "competitors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "competitors" FORCE ROW LEVEL SECURITY;
CREATE POLICY "competitors_tenant_isolation" ON "competitors"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "competitor_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "competitor_snapshots" FORCE ROW LEVEL SECURITY;
CREATE POLICY "competitor_snapshots_tenant_isolation" ON "competitor_snapshots"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "competitor_analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "competitor_analyses" FORCE ROW LEVEL SECURITY;
CREATE POLICY "competitor_analyses_tenant_isolation" ON "competitor_analyses"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
