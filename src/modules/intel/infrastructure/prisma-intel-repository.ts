/** Prisma implementation of IntelRepository (withTenant + explicit org filters). */
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { IntelStatus, AdSource } from "@/modules/intel/domain/intel-status";
import type { CompetitorAdView, AdCommentView, IntelReportView } from "@/modules/intel/application/dto";
import type { IntelReportResult } from "@/modules/intel/application/intel-schema";
import type { IntelRepository, AdInput, CommentInput } from "@/modules/intel/application/ports";

const json = (v: unknown) => v as unknown as Prisma.InputJsonValue;

type ReportRow = {
  id: string;
  projectId: string;
  status: IntelStatus;
  model: string | null;
  result: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toReportView(r: ReportRow): IntelReportView {
  return {
    id: r.id,
    projectId: r.projectId,
    status: r.status,
    model: r.model,
    result: (r.result as IntelReportResult | null) ?? null,
    error: r.error,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function assertProject(tx: Prisma.TransactionClient, ctx: { organizationId: string }, projectId: string) {
  const p = await tx.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!p) throw AppError.notFound("Project not found.");
}

export const prismaIntelRepository: IntelRepository = {
  addAds(ctx, projectId, ads: AdInput[]) {
    return withTenant(ctx.organizationId, async (tx) => {
      await assertProject(tx, ctx, projectId);
      const res = await tx.competitorAd.createMany({
        data: ads.map((a) => ({
          organizationId: ctx.organizationId,
          projectId,
          source: a.source,
          advertiser: a.advertiser ?? null,
          adText: a.adText,
          mediaUrl: a.mediaUrl ?? null,
          landingUrl: a.landingUrl ?? null,
          sourceUrl: a.sourceUrl ?? null,
        })),
      });
      return res.count;
    });
  },

  addComments(ctx, projectId, comments: CommentInput[]) {
    return withTenant(ctx.organizationId, async (tx) => {
      await assertProject(tx, ctx, projectId);
      const res = await tx.adComment.createMany({
        data: comments.map((c) => ({
          organizationId: ctx.organizationId,
          projectId,
          adId: c.adId ?? null,
          source: c.source,
          author: c.author ?? null,
          text: c.text,
        })),
      });
      return res.count;
    });
  },

  listAds(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const rows = await tx.competitorAd.findMany({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return rows.map(
        (r): CompetitorAdView => ({
          id: r.id,
          source: r.source as AdSource,
          advertiser: r.advertiser,
          adText: r.adText,
          mediaUrl: r.mediaUrl,
          landingUrl: r.landingUrl,
          sourceUrl: r.sourceUrl,
          createdAt: r.createdAt.toISOString(),
        }),
      );
    });
  },

  listComments(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const rows = await tx.adComment.findMany({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      return rows.map(
        (r): AdCommentView => ({
          id: r.id,
          source: r.source as AdSource,
          author: r.author,
          text: r.text,
          sentiment: r.sentiment,
          createdAt: r.createdAt.toISOString(),
        }),
      );
    });
  },

  createReport(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      await assertProject(tx, ctx, projectId);
      const r = await tx.intelReport.create({
        data: { organizationId: ctx.organizationId, projectId, status: "PROCESSING" },
        select: { id: true },
      });
      return { id: r.id };
    });
  },

  completeReport(ctx, id, { result, model }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const res = await tx.intelReport.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { status: "COMPLETED", result: json(result), model, error: null },
      });
      if (res.count === 0) throw AppError.notFound("Report not found.");
      const row = await tx.intelReport.findFirstOrThrow({ where: { id, organizationId: ctx.organizationId } });
      return toReportView(row as ReportRow);
    });
  },

  async failReport(ctx, id, error) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.intelReport.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { status: "FAILED", error },
      });
    });
  },

  latestReport(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const row = await tx.intelReport.findFirst({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      });
      return row ? toReportView(row as ReportRow) : null;
    });
  },
};
