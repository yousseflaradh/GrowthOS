-- Phase 4 — Landing Page Generation Engine.

CREATE TYPE "PageFramework" AS ENUM ('AIDA', 'PAS', 'BAB');
CREATE TYPE "SectionType" AS ENUM ('HERO', 'PROBLEM', 'BENEFITS', 'FEATURES', 'SOCIAL_PROOF', 'TESTIMONIALS', 'FAQ', 'CTA');

-- ── landing_pages ────────────────────────────────────────────
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "landing_pages_organization_id_project_id_idx" ON "landing_pages"("organization_id", "project_id");

-- ── page_versions ────────────────────────────────────────────
CREATE TABLE "page_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "landing_page_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "framework" "PageFramework" NOT NULL,
    "rationale" TEXT,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "page_versions_organization_id_landing_page_id_version_idx" ON "page_versions"("organization_id", "landing_page_id", "version");

-- ── page_sections ────────────────────────────────────────────
CREATE TABLE "page_sections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,
    CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "page_sections_organization_id_version_id_idx" ON "page_sections"("organization_id", "version_id");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "page_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── row-level security ───────────────────────────────────────
ALTER TABLE "landing_pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "landing_pages" FORCE ROW LEVEL SECURITY;
CREATE POLICY "landing_pages_tenant_isolation" ON "landing_pages"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "page_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "page_versions_tenant_isolation" ON "page_versions"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "page_sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_sections" FORCE ROW LEVEL SECURITY;
CREATE POLICY "page_sections_tenant_isolation" ON "page_sections"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
