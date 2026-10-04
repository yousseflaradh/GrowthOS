-- Phase 3 — Creative Strategy Engine: briefs, strategies, angles, hooks, ugc.

CREATE TYPE "CreativeStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ── creative_briefs ──────────────────────────────────────────
CREATE TABLE "creative_briefs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "analysis_id" TEXT,
    "inputs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "creative_briefs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "creative_briefs_organization_id_project_id_idx" ON "creative_briefs"("organization_id", "project_id");

-- ── creative_strategies ──────────────────────────────────────
CREATE TABLE "creative_strategies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "brief_id" TEXT NOT NULL,
    "status" "CreativeStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "customer_psychology" JSONB,
    "static_concepts" JSONB,
    "video_concepts" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "creative_strategies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "creative_strategies_organization_id_project_id_created_at_idx" ON "creative_strategies"("organization_id", "project_id", "created_at");

-- ── angles ───────────────────────────────────────────────────
CREATE TABLE "angles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "angles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "angles_organization_id_strategy_id_idx" ON "angles"("organization_id", "strategy_id");

-- ── hooks ────────────────────────────────────────────────────
CREATE TABLE "hooks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "hooks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hooks_organization_id_strategy_id_idx" ON "hooks"("organization_id", "strategy_id");

-- ── ugc_concepts ─────────────────────────────────────────────
CREATE TABLE "ugc_concepts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "format" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ugc_concepts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ugc_concepts_organization_id_strategy_id_idx" ON "ugc_concepts"("organization_id", "strategy_id");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creative_strategies" ADD CONSTRAINT "creative_strategies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creative_strategies" ADD CONSTRAINT "creative_strategies_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "creative_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "angles" ADD CONSTRAINT "angles_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "creative_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hooks" ADD CONSTRAINT "hooks_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "creative_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ugc_concepts" ADD CONSTRAINT "ugc_concepts_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "creative_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── row-level security ───────────────────────────────────────
ALTER TABLE "creative_briefs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "creative_briefs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "creative_briefs_tenant_isolation" ON "creative_briefs"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "creative_strategies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "creative_strategies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "creative_strategies_tenant_isolation" ON "creative_strategies"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "angles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "angles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "angles_tenant_isolation" ON "angles"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "hooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hooks" FORCE ROW LEVEL SECURITY;
CREATE POLICY "hooks_tenant_isolation" ON "hooks"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "ugc_concepts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ugc_concepts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ugc_concepts_tenant_isolation" ON "ugc_concepts"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
