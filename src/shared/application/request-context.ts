/**
 * RequestContext — the tenant/identity envelope threaded into every use case.
 * Built once per request (from the Auth.js session + active org) and never
 * derived from client-supplied input. See docs/architecture/01 §5, 07 §3.
 */
import type { MembershipRole } from "@prisma/client";

export interface RequestContext {
  userId: string;
  organizationId: string;
  role: MembershipRole;
}

/** Capability checks (RBAC). Mirrors docs/architecture/06-user-flows.md §7. */
const RANK: Record<MembershipRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function atLeast(role: MembershipRole, min: MembershipRole): boolean {
  return RANK[role] >= RANK[min];
}

export const can = {
  edit: (ctx: RequestContext) => atLeast(ctx.role, "EDITOR"),
  manageMembers: (ctx: RequestContext) => atLeast(ctx.role, "ADMIN"),
  manageBilling: (ctx: RequestContext) => ctx.role === "OWNER",
};
