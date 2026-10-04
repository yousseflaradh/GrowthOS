/**
 * Prisma implementation of AuditRepository. withTenant (RLS) + explicit
 * organization_id filters on every access.
 */
import type { Prisma } from "@prisma/client";
import { withTenant, type TenantTx } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/application/request-context";
import type { AuditStatus, AuditCategory, AuditSeverity } from "@/modules/audit/domain/audit-status";
import type { AuditRunView, AuditSummary } from "@/modules/audit/application/dto";
import type { AuditRepository } from "@/modules/audit/application/ports";

const runInclude = {
  scores: true,
  findings: { orderBy: { position: "asc" } },
  recommendations: { orderBy: { position: "asc" } },
} satisfies Prisma.AuditRunInclude;

type RunRow = {
  id: string;
  projectId: string;
  url: string;
  status: AuditStatus;
  overallScore: number | null;
  summary: string | null;
  model: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  scores: { category: AuditCategory; score: number; summary: string | null }[];
  findings: { category: AuditCategory; severity: AuditSeverity; title: string; detail: string }[];
  recommendations: { category: AuditCategory; priority: AuditSeverity; title: string; detail: string }[];
};

function toView(r: RunRow): AuditRunView {
  return {
    id: r.id,
    projectId: r.projectId,
    url: r.url,
    status: r.status,
    overallScore: r.overallScore,
    summary: r.summary,
    model: r.model,
    error: r.error,
    scores: r.scores.map((s) => ({ category: s.category, score: s.score, summary: s.summary })),
    findings: r.findings.map((f) => ({ category: f.category, severity: f.severity, title: f.title, detail: f.detail })),
    recommendations: r.recommendations.map((x) => ({
      category: x.category,
      priority: x.priority,
      title: x.title,
      detail: x.detail,
    })),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function loadView(tx: TenantTx, ctx: RequestContext, id: string): Promise<AuditRunView> {
  const row = await tx.auditRun.findFirstOrThrow({
    where: { id, organizationId: ctx.organizationId },
    include: runInclude,
  });
  return toView(row as RunRow);
}

export const prismaAuditRepository: AuditRepository = {
  create(ctx, { projectId, url }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!project) throw AppError.notFound("Project not found.");
      const run = await tx.auditRun.create({
        data: { organizationId: ctx.organizationId, projectId, url, status: "PROCESSING" },
        select: { id: true },
      });
      return { id: run.id };
    });
  },

  complete(ctx, id, { result, model }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const res = await tx.auditRun.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { status: "COMPLETED", overallScore: result.overallScore, summary: result.summary, model, error: null },
      });
      if (res.count === 0) throw AppError.notFound("Audit not found.");

      const org = ctx.organizationId;
      await tx.auditScore.createMany({
        data: result.categories.map((c) => ({
          organizationId: org,
          auditRunId: id,
          category: c.category,
          score: c.score,
          summary: c.summary,
        })),
      });
      const findings = result.categories.flatMap((c) =>
        c.findings.map((f) => ({
          organizationId: org,
          auditRunId: id,
          category: c.category,
          severity: f.severity,
          title: f.title,
          detail: f.detail,
        })),
      );
      if (findings.length) await tx.auditFinding.createMany({ data: findings.map((f, i) => ({ ...f, position: i })) });
      const recs = result.categories.flatMap((c) =>
        c.recommendations.map((x) => ({
          organizationId: org,
          auditRunId: id,
          category: c.category,
          priority: x.priority,
          title: x.title,
          detail: x.detail,
        })),
      );
      if (recs.length) await tx.recommendation.createMany({ data: recs.map((x, i) => ({ ...x, position: i })) });

      return loadView(tx, ctx, id);
    });
  },

  async fail(ctx, id, error) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.auditRun.updateMany({
        where: { id, organizationId: ctx.organizationId },
        data: { status: "FAILED", error },
      });
    });
  },

  get(ctx, id) {
    return withTenant(ctx.organizationId, async (tx) => {
      const row = await tx.auditRun.findFirst({
        where: { id, organizationId: ctx.organizationId },
        include: runInclude,
      });
      return row ? toView(row as RunRow) : null;
    });
  },

  latestForProject(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const completed = await tx.auditRun.findFirst({
        where: { projectId, organizationId: ctx.organizationId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        include: runInclude,
      });
      if (completed) return toView(completed as RunRow);
      const any = await tx.auditRun.findFirst({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        include: runInclude,
      });
      return any ? toView(any as RunRow) : null;
    });
  },

  history(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const rows = await tx.auditRun.findMany({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { id: true, url: true, status: true, overallScore: true, createdAt: true },
      });
      return rows.map(
        (r): AuditSummary => ({
          id: r.id,
          url: r.url,
          status: r.status as AuditStatus,
          overallScore: r.overallScore,
          createdAt: r.createdAt.toISOString(),
        }),
      );
    });
  },
};
