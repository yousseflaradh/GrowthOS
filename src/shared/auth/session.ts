/**
 * Server-only helpers to turn an Auth.js session into a tenant RequestContext.
 * Used by server actions, route handlers, and RSC. The org is resolved from
 * membership (+ optional `active_org` cookie), never from client input.
 */
import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { resolveActiveContext } from "@/modules/identity";
import type { RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";

export const ACTIVE_ORG_COOKIE = "active_org";

/** Returns the context or null if not authenticated / no membership. */
export async function getRequestContext(): Promise<RequestContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  return resolveActiveContext(session.user.id, preferred);
}

/** Throws AppError if the caller is not authenticated within an org. */
export async function requireContext(): Promise<RequestContext> {
  const ctx = await getRequestContext();
  if (!ctx) throw AppError.unauthenticated();
  return ctx;
}

/** Just the authenticated user id (no org resolution). */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
