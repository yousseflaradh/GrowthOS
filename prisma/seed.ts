/**
 * Seed: a demo user with a personal organization and a few projects.
 * Projects/activity_logs are RLS-guarded, so inserts happen inside a
 * transaction that sets `app.org_id` (mirrors the runtime tenancy helper).
 *
 * Run: npm run db:seed
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@growthos.app";
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      company: "Demo Commerce Co.",
      website: "https://demo.example.com",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  // Personal organization + owner membership (idempotent on slug).
  const slug = "demo-user";
  const org = await prisma.organization.upsert({
    where: { slug },
    update: {},
    create: {
      name: "Demo User",
      slug,
      type: "PERSONAL",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  // Insert RLS-guarded rows within a tenant-scoped transaction.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.org_id', ${org.id}, true)`;

    const existing = await tx.project.count();
    if (existing > 0) return;

    const projects: Prisma.ProjectCreateManyInput[] = [
      {
        organizationId: org.id,
        createdByUserId: user.id,
        productName: "Hydra Glow Serum",
        productUrl: "https://demo.example.com/hydra-glow",
        description: "Vitamin-C brightening serum for daily use.",
        status: "ACTIVE",
      },
      {
        organizationId: org.id,
        createdByUserId: user.id,
        productName: "EcoStep Running Shoes",
        productUrl: "https://demo.example.com/ecostep",
        description: "Recycled-material performance running shoes.",
        status: "DRAFT",
      },
    ];
    await tx.project.createMany({ data: projects });

    await tx.activityLog.create({
      data: {
        organizationId: org.id,
        actorUserId: user.id,
        action: "seed.bootstrap",
        metadata: { projects: projects.length },
      },
    });
  });

  console.log(`Seeded user ${user.email} / org ${org.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
