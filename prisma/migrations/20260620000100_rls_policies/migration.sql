-- Row-Level Security for tenant business tables (defense in depth).
-- The app sets `app.org_id` per transaction (see src/shared/tenancy/tenant-db.ts).
-- When the GUC is unset, current_setting(..., true) returns NULL and every
-- policy predicate evaluates to NULL → no rows visible (fail-closed).
--
-- FORCE makes the policy apply even to the table owner role. NOTE: Postgres
-- SUPERUSERS bypass RLS entirely (even with FORCE) — the default docker
-- `growthos` role is a superuser, so in local dev RLS is effectively bypassed.
-- App-layer isolation (explicit organizationId filters in repositories) is the
-- primary guard; in production, run the app under a dedicated NON-superuser,
-- NON-owner role WITHOUT BYPASSRLS so these policies are actually enforced.

-- ── projects ─────────────────────────────────────────────────
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;

CREATE POLICY "projects_tenant_isolation" ON "projects"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

-- ── activity_logs ────────────────────────────────────────────
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_tenant_isolation" ON "activity_logs"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
