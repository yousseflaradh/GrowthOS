-- Phase 9 — AI Agent Orchestration (LangGraph).

-- ── enum ─────────────────────────────────────────────────────
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ── agent_runs ───────────────────────────────────────────────
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "workflow" TEXT NOT NULL DEFAULT 'campaign',
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PROCESSING',
    "input" JSONB,
    "result" JSONB,
    "total_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_runs_org_project_created_idx" ON "agent_runs"("organization_id", "project_id", "created_at");

-- ── agent_steps ──────────────────────────────────────────────
CREATE TABLE "agent_steps" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "output" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_steps_org_run_idx" ON "agent_steps"("organization_id", "run_id");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── row-level security ───────────────────────────────────────
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "agent_runs_tenant_isolation" ON "agent_runs"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "agent_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_steps" FORCE ROW LEVEL SECURITY;
CREATE POLICY "agent_steps_tenant_isolation" ON "agent_steps"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
