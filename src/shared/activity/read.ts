/**
 * Org-scoped activity feed reader (dashboard). RLS-guarded via withTenant.
 */
import { withTenant } from "@/shared/tenancy/tenant-db";
import type { RequestContext } from "@/shared/application/request-context";

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorName: string | null;
  metadata: unknown;
  createdAt: string;
}

export async function listRecentActivity(
  ctx: RequestContext,
  limit = 15,
): Promise<ActivityItem[]> {
  return withTenant(ctx.organizationId, async (tx) => {
    const rows = await tx.activityLog.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
    });

    // Resolve actor display names (users table is not org-scoped).
    const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter(Boolean) as string[])];
    const users = actorIds.length
      ? await tx.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name] as const));

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      actorName: r.actorUserId ? nameById.get(r.actorUserId) ?? null : null,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    }));
  });
}
