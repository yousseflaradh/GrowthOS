/**
 * Tenant-scoped database access. Runs the callback inside a transaction with
 * the `app.org_id` GUC set, so Postgres Row-Level Security filters every query
 * to the active organization automatically. This is the ONLY sanctioned way to
 * touch RLS-guarded tables (projects, activity_logs, …).
 *
 * See docs/architecture/07-security.md §4.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TenantTx = Prisma.TransactionClient;

/**
 * Execute `fn` with tenant isolation active.
 * `set_config(..., true)` scopes the GUC to this transaction only, so pooled
 * connections never leak org context across requests.
 */
export async function withTenant<T>(
  organizationId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  if (!organizationId) {
    throw new Error("withTenant called without an organizationId");
  }
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.org_id', ${organizationId}, true)`;
      return fn(tx);
    },
    // Serverless Postgres (Neon) + cross-region latency can be slow to hand out
    // a connection — especially after long gaps between AI calls in a pipeline.
    // Generous waits avoid spurious "unable to start a transaction" errors.
    { maxWait: 20_000, timeout: 30_000 },
  );
}
