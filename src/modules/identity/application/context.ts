/**
 * Resolve the active tenant context for a signed-in user. Phase 1 users have a
 * single personal org; the `preferredOrgId` arg + membership lookup already
 * support multi-org switching for later phases.
 */
import { prisma } from "@/lib/prisma";
import type { RequestContext } from "@/shared/application/request-context";

export async function resolveActiveContext(
  userId: string,
  preferredOrgId?: string,
): Promise<RequestContext | null> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { organizationId: true, role: true, organization: { select: { type: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) return null;

  const chosen =
    (preferredOrgId && memberships.find((m) => m.organizationId === preferredOrgId)) ||
    memberships.find((m) => m.organization.type === "PERSONAL") ||
    memberships[0];

  if (!chosen) return null;
  return { userId, organizationId: chosen.organizationId, role: chosen.role };
}
