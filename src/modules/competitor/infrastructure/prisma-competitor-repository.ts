/**
 * Prisma implementation of CompetitorRepository. withTenant (RLS) + explicit
 * organization_id filters on every access.
 */
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { AnalysisStatus } from "@/modules/analysis/domain/analysis-status";
import type { CompetitorAnalysisResult } from "@/modules/competitor/application/competitor-schema";
import type { CompetitorView, CompetitorAnalysisView } from "@/modules/competitor/application/dto";
import type { CompetitorRepository } from "@/modules/competitor/application/ports";

const json = (v: unknown) => v as unknown as Prisma.InputJsonValue;

type AnalysisRow = {
  id: string;
  status: AnalysisStatus;
  result: unknown;
  model: string | null;
  error: string | null;
  createdAt: Date;
};

function toAnalysisView(a: AnalysisRow): CompetitorAnalysisView {
  return {
    id: a.id,
    status: a.status,
    result: (a.result as CompetitorAnalysisResult | null) ?? null,
    model: a.model,
    error: a.error,
    createdAt: a.createdAt.toISOString(),
  };
}

export const prismaCompetitorRepository: CompetitorRepository = {
  upsert(ctx, { projectId, url, name }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!project) throw AppError.notFound("Project not found.");
      const existing = await tx.competitor.findFirst({
        where: { projectId, url, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (existing) {
        await tx.competitor.updateMany({
          where: { id: existing.id, organizationId: ctx.organizationId },
          data: { name },
        });
        return { id: existing.id };
      }
      const created = await tx.competitor.create({
        data: { organizationId: ctx.organizationId, projectId, url, name },
        select: { id: true },
      });
      return { id: created.id };
    });
  },

  saveSnapshot(ctx, competitorId, { title, content }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const snap = await tx.competitorSnapshot.create({
        data: { organizationId: ctx.organizationId, competitorId, title, content: json(content) },
        select: { id: true },
      });
      return { id: snap.id };
    });
  },

  createAnalysis(ctx, competitorId, snapshotId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const a = await tx.competitorAnalysis.create({
        data: { organizationId: ctx.organizationId, competitorId, snapshotId, status: "PROCESSING" },
        select: { id: true },
      });
      return { id: a.id };
    });
  },

  async completeAnalysis(ctx, analysisId, { result, model }) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.competitorAnalysis.updateMany({
        where: { id: analysisId, organizationId: ctx.organizationId },
        data: { status: "COMPLETED", result: json(result), model, error: null },
      });
    });
  },

  async failAnalysis(ctx, analysisId, error) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.competitorAnalysis.updateMany({
        where: { id: analysisId, organizationId: ctx.organizationId },
        data: { status: "FAILED", error },
      });
    });
  },

  listForProject(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const rows = await tx.competitor.findMany({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        include: { analyses: { orderBy: { createdAt: "desc" }, take: 5 } },
      });
      return rows.map((c): CompetitorView => {
        const analyses = c.analyses as AnalysisRow[];
        const best = analyses.find((a) => a.status === "COMPLETED") ?? analyses[0] ?? null;
        return {
          id: c.id,
          projectId: c.projectId,
          name: c.name,
          url: c.url,
          analysis: best ? toAnalysisView(best) : null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      });
    });
  },

  async delete(ctx, projectId, competitorId) {
    await withTenant(ctx.organizationId, async (tx) => {
      const res = await tx.competitor.deleteMany({
        where: { id: competitorId, projectId, organizationId: ctx.organizationId },
      });
      if (res.count === 0) throw AppError.notFound("Competitor not found.");
    });
  },
};
