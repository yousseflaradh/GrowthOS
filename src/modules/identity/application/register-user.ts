/**
 * Register a new user with email + password, and provision their personal org.
 */
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { slugify } from "@/shared/util/slug";
import { AppError } from "@/shared/errors/app-error";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  userId: string;
  organizationId: string;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw AppError.conflict("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);

  // Create user, personal org, and owner membership atomically.
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name.trim(), email, passwordHash },
      select: { id: true, name: true },
    });

    const baseSlug = slugify(user.name ?? email);
    const slugTaken = await tx.organization.findUnique({ where: { slug: baseSlug } });
    const slug = slugTaken ? `${baseSlug}-${user.id.slice(0, 6)}` : baseSlug;

    const org = await tx.organization.create({
      data: {
        name: user.name ?? "My Workspace",
        slug,
        type: "PERSONAL",
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
      select: { id: true },
    });

    return { userId: user.id, organizationId: org.id };
  });

  return result;
}
