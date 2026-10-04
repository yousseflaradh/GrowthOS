/**
 * Personal-organization provisioning. Every user gets a personal org with an
 * OWNER membership on first sign-up (credentials) or first OAuth sign-in.
 * Identity tables are not RLS-guarded, so we use the base client directly.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify, withRandomSuffix } from "@/shared/util/slug";

type Client = Prisma.TransactionClient | typeof prisma;

async function uniqueSlug(client: Client, name: string): Promise<string> {
  const base = slugify(name);
  // Try the clean slug first, then fall back to a suffixed variant.
  const taken = await client.organization.findUnique({ where: { slug: base } });
  return taken ? withRandomSuffix(base) : base;
}

/** Idempotent: returns the existing personal org membership if present. */
export async function provisionPersonalOrg(
  userId: string,
  displayName: string,
): Promise<{ organizationId: string }> {
  const existing = await prisma.membership.findFirst({
    where: { userId, organization: { type: "PERSONAL" } },
    select: { organizationId: true },
  });
  if (existing) return existing;

  const slug = await uniqueSlug(prisma, displayName);
  const org = await prisma.organization.create({
    data: {
      name: displayName,
      slug,
      type: "PERSONAL",
      memberships: { create: { userId, role: "OWNER" } },
    },
    select: { id: true },
  });
  return { organizationId: org.id };
}
