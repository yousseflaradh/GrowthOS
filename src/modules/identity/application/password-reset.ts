/**
 * Password reset flow.
 * - request: always returns void (never reveals whether an email is registered).
 * - reset: validates the hashed token, rotates the password, single-use.
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import {
  createResetToken,
  hashResetToken,
  hashPassword,
} from "@/lib/auth/password";
import { enqueueEmail } from "@/lib/email";
import { passwordResetEmail } from "@/modules/identity/infrastructure/emails";
import { AppError } from "@/shared/errors/app-error";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // Enumeration-safe: silently no-op for unknown emails / OAuth-only accounts.
  if (!user) return;

  const { raw, hash } = createResetToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const url = `${env.APP_URL}/reset-password?token=${raw}`;
  await enqueueEmail(passwordResetEmail(email, url));
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashResetToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.validation("This reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalidate any other outstanding tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);
}
