/**
 * Read model for the app shell: the signed-in user's display info + active org.
 */
import { prisma } from "@/lib/prisma";

export interface NavData {
  user: { name: string | null; email: string; image: string | null };
  org: { id: string; name: string };
}

export async function getNavData(userId: string, organizationId: string): Promise<NavData | null> {
  const [user, org] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, image: true } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } }),
  ]);
  if (!user || !org) return null;
  return { user, org };
}
