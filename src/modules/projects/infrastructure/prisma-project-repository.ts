/**
 * Prisma implementation of ProjectRepository. Every method runs inside
 * `withTenant` so Postgres RLS scopes all access to the active org. Mutations
 * also append an activity-log entry in the same transaction.
 */
import type { Prisma } from "@prisma/client";
import { withTenant, type TenantTx } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/application/request-context";
import { PROJECT_STATUSES, type ProjectStatus } from "@/modules/projects/domain/project-status";
import type { ProjectView, Paginated, ProjectCounts } from "@/modules/projects/application/dto";
import type {
  ProjectRepository,
  CreateProjectData,
  UpdateProjectData,
  ListProjectsOptions,
} from "@/modules/projects/application/ports/project-repository";

type Row = {
  id: string;
  productName: string;
  productUrl: string | null;
  description: string | null;
  image: string | null;
  status: ProjectStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

function toView(r: Row): ProjectView {
  return {
    id: r.id,
    productName: r.productName,
    productUrl: r.productUrl,
    description: r.description,
    image: r.image,
    status: r.status,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function recordActivity(
  tx: TenantTx,
  ctx: RequestContext,
  action: string,
  projectId: string,
  metadata?: Prisma.InputJsonValue,
) {
  await tx.activityLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action,
      entityType: "project",
      entityId: projectId,
      metadata,
    },
  });
}

export const prismaProjectRepository: ProjectRepository = {
  create(ctx, data: CreateProjectData) {
    return withTenant(ctx.organizationId, async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: ctx.organizationId,
          createdByUserId: ctx.userId,
          productName: data.productName,
          productUrl: data.productUrl ?? null,
          description: data.description ?? null,
          image: data.image ?? null,
          status: data.status ?? "DRAFT",
        },
      });
      await recordActivity(tx, ctx, "project.created", project.id, { productName: project.productName });
      return toView(project);
    });
  },

  list(ctx, opts: ListProjectsOptions): Promise<Paginated<ProjectView>> {
    return withTenant(ctx.organizationId, async (tx) => {
      const limit = opts.limit ?? 20;
      const rows = await tx.project.findMany({
        // Explicit org filter = app-layer isolation (RLS is the 2nd layer).
        where: { organizationId: ctx.organizationId, ...(opts.status ? { status: opts.status } : {}) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        items: page.map(toView),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    });
  },

  findById(ctx, id) {
    return withTenant(ctx.organizationId, async (tx) => {
      const row = await tx.project.findFirst({ where: { id, organizationId: ctx.organizationId } });
      return row ? toView(row) : null;
    });
  },

  update(ctx, id, data: UpdateProjectData) {
    return withTenant(ctx.organizationId, async (tx) => {
      // Scope the write by org so a wrong id can never touch another tenant.
      const res = await tx.project.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: {
          ...(data.productName !== undefined ? { productName: data.productName } : {}),
          ...(data.productUrl !== undefined ? { productUrl: data.productUrl } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.image !== undefined ? { image: data.image } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });
      if (res.count === 0) throw AppError.notFound("Project not found.");
      const project = await tx.project.findFirstOrThrow({ where: { id, organizationId: ctx.organizationId } });
      await recordActivity(tx, ctx, "project.updated", project.id);
      return toView(project);
    });
  },

  remove(ctx, id) {
    return withTenant(ctx.organizationId, async (tx) => {
      const res = await tx.project.deleteMany({ where: { id, organizationId: ctx.organizationId } });
      if (res.count === 0) throw AppError.notFound("Project not found.");
      await recordActivity(tx, ctx, "project.deleted", id);
    });
  },

  counts(ctx): Promise<ProjectCounts> {
    return withTenant(ctx.organizationId, async (tx) => {
      const grouped = await tx.project.groupBy({
        by: ["status"],
        where: { organizationId: ctx.organizationId },
        _count: { _all: true },
      });
      const byStatus = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0])) as Record<ProjectStatus, number>;
      let total = 0;
      for (const g of grouped) {
        byStatus[g.status as ProjectStatus] = g._count._all;
        total += g._count._all;
      }
      return { total, byStatus };
    });
  },
};
