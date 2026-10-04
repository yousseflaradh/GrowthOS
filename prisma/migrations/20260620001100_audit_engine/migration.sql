-- Phase 6 — Landing Page Audit Engine (CRO).

CREATE TYPE "AuditStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "AuditCategory" AS ENUM ('HEADLINE', 'CTA', 'TRUST', 'MOBILE');
CREATE TYPE "AuditSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- ── audit_runs ───────────────────────────────────────────────
CREATE TABLE "audit_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'PROCESSING',
    "overall_score" INTEGER,
    "summary" TEXT,
    "model" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "audit_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_runs_org_project_created_idx" ON "audit_runs"("organization_id", "project_id", "created_at");

-- ── audit_scores ─────────────────────────────────────────────
CREATE TABLE "audit_scores" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "audit_run_id" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "summary" TEXT,
    CONSTRAINT "audit_scores_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_scores_org_run_idx" ON "audit_scores"("organization_id", "audit_run_id");

-- ── audit_findings ───────────────────────────────────────────
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "audit_run_id" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "severity" "AuditSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_findings_org_run_idx" ON "audit_findings"("organization_id", "audit_run_id");

-- ── audit_recommendations ────────────────────────────────────
CREATE TABLE "audit_recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "audit_run_id" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "priority" "AuditSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "audit_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_recommendations_org_run_idx" ON "audit_recommendations"("organization_id", "audit_run_id");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "audit_runs" ADD CONSTRAINT "audit_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_scores" ADD CONSTRAINT "audit_scores_run_fkey" FOREIGN KEY ("audit_run_id") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_run_fkey" FOREIGN KEY ("audit_run_id") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_recommendations" ADD CONSTRAINT "audit_recommendations_run_fkey" FOREIGN KEY ("audit_run_id") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── row-level security ───────────────────────────────────────
ALTER TABLE "audit_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_runs_tenant_isolation" ON "audit_runs"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "audit_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_scores" FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_scores_tenant_isolation" ON "audit_scores"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "audit_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_findings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_findings_tenant_isolation" ON "audit_findings"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "audit_recommendations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_recommendations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_recommendations_tenant_isolation" ON "audit_recommendations"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
