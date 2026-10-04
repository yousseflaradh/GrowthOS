/**
 * User profile read/update (name, company, website, avatar image).
 */
import { prisma } from "@/lib/prisma";

export interface ProfileInput {
  name?: string;
  company?: string | null;
  website?: string | null;
  image?: string | null;
}

export interface ProfileView {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  company: string | null;
  website: string | null;
}

export async function getProfile(userId: string): Promise<ProfileView | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, company: true, website: true },
  });
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<ProfileView> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.company !== undefined ? { company: input.company } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
    },
    select: { id: true, name: true, email: true, image: true, company: true, website: true },
  });
}
