/**
 * Prisma implementation of AnalysisRepository. All access runs through
 * withTenant (RLS) and adds explicit organization_id filters (defense in depth).
 */
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { AnalysisStatus } from "@/modules/analysis/domain/analysis-status";
import type { AnalysisView, SnapshotView, ReviewView } from "@/modules/analysis/application/dto";
import type { ProductAnalysisResult } from "@/modules/analysis/application/analysis-schema";
import type { AnalysisRepository, SnapshotInput } from "@/modules/analysis/application/ports";

type SnapshotRow = {
  id: string;
  source: string;
  sourceUrl: string | null;
  title: string | null;
  description: string | null;
  features: unknown;
  images: unknown;
  reviews: unknown;
  createdAt: Date;
};

type AnalysisRow = {
  id: string;
  projectId: string;
  status: AnalysisStatus;
  result: unknown;
  model: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  snapshot: SnapshotRow | null;
};

function toSnapshotView(r: SnapshotRow): SnapshotView {
  return {
    id: r.id,
    source: r.source,
    sourceUrl: r.sourceUrl,
    title: r.title,
    description: r.description,
    features: (r.features as string[] | null) ?? [],
    images: (r.images as string[] | null) ?? [],
    reviews: (r.reviews as ReviewView[] | null) ?? [],
    createdAt: r.createdAt.toISOString(),
  };
}

function toAnalysisView(r: AnalysisRow): AnalysisView {
  return {
    id: r.id,
    projectId: r.projectId,
    status: r.status,
    result: (r.result as ProductAnalysisResult | null) ?? null,
    model: r.model,
    error: r.error,
    snapshot: r.snapshot ? toSnapshotView(r.snapshot) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const withSnapshot = { snapshot: true } as const;

export const prismaAnalysisRepository: AnalysisRepository = {
  createSnapshot(ctx, projectId, data: SnapshotInput) {
    return withTenant(ctx.organizationId, async (tx) => {
      // Ensure the project belongs to this org before attaching children.
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!project) throw AppError.notFound("Project not found.");

      const snap = await tx.productSnapshot.create({
        data: {
          organizationId: ctx.organizationId,
          projectId,
          source: data.source,
          sourceUrl: data.sourceUrl,
          title: data.title,
          description: data.description,
          features: data.features as unknown as Prisma.InputJsonValue,
          images: data.images as unknown as Prisma.InputJsonValue,
          reviews: data.reviews as unknown as Prisma.InputJsonValue,
          contentHash: data.contentHash,
        },
        select: { id: true },
      });
      return { id: snap.id };
    });
  },

  createAnalysis(ctx, { projectId, snapshotId }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const row = await tx.productAnalysis.create({
        data: { organizationId: ctx.organizationId, projectId, snapshotId, status: "PROCESSING" },
        include: withSnapshot,
      });
      return toAnalysisView(row as AnalysisRow);
    });
  },

  completeAnalysis(ctx, id, { result, model }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const res = await tx.productAnalysis.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { status: "COMPLETED", result: result as unknown as Prisma.InputJsonValue, model, error: null },
      });
      if (res.count === 0) throw AppError.notFound("Analysis not found.");
      const row = await tx.productAnalysis.findFirstOrThrow({
        where: { id, organizationId: ctx.organizationId },
        include: withSnapshot,
      });
      return toAnalysisView(row as AnalysisRow);
    });
  },

  async failAnalysis(ctx, id, error) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.productAnalysis.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { status: "FAILED", error },
      });
    });
  },

  latestForProject(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      // Prefer the latest COMPLETED analysis; fall back to latest of any status.
      const completed = await tx.productAnalysis.findFirst({
        where: { projectId, organizationId: ctx.organizationId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        include: withSnapshot,
      });
      if (completed) return toAnalysisView(completed as AnalysisRow);
      const any = await tx.productAnalysis.findFirst({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        include: withSnapshot,
      });
      return any ? toAnalysisView(any as AnalysisRow) : null;
    });
  },

  getById(ctx, id) {
    return withTenant(ctx.organizationId, async (tx) => {
      const row = await tx.productAnalysis.findFirst({
        where: { id, organizationId: ctx.organizationId },
        include: withSnapshot,
      });
      return row ? toAnalysisView(row as AnalysisRow) : null;
    });
  },
};
