/**
 * Prisma client singleton. Reused across hot reloads in dev and shared by
 * the web and worker processes.
 */
import { PrismaClient } from "@prisma/client";
import { env, isProd } from "@/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ["error"] : ["error", "warn"],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export type { Prisma } from "@prisma/client";
void env; // ensure env validation runs when prisma is first imported
