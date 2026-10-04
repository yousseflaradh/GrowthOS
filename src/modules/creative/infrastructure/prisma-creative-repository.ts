/**
 * Prisma implementation of CreativeRepository. withTenant (RLS) + explicit
 * organization_id filters on every access.
 */
import type { Prisma } from "@prisma/client";
import { withTenant, type TenantTx } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/application/request-context";
import type { CreativeStatus } from "@/modules/creative/domain/creative-status";
import type { CreativeStrategyView, ConceptView, CreativeItemKind } from "@/modules/creative/application/dto";
import type { CustomerPsychology, AngleItem, HookItem } from "@/modules/creative/application/creative-schemas";
import type { CreativeRepository, CreativeItemPatch } from "@/modules/creative/application/ports";

const json = (v: unknown) => v as unknown as Prisma.InputJsonValue;

const strategyInclude: Prisma.CreativeStrategyInclude = {
  angles: { orderBy: [{ favorite: "desc" }, { position: "asc" }] },
  hooks: { orderBy: [{ favorite: "desc" }, { position: "asc" }] },
  ugcConcepts: { orderBy: [{ favorite: "desc" }, { position: "asc" }] },
};

type StrategyRow = {
  id: string;
  projectId: string;
  status: CreativeStatus;
  model: string | null;
  customerPsychology: unknown;
  staticConcepts: unknown;
  videoConcepts: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  angles: { id: string; category: string; headline: string; description: string; favorite: boolean }[];
  hooks: { id: string; category: string; content: string; favorite: boolean }[];
  ugcConcepts: {
    id: string;
    title: string;
    concept: string;
    format: string | null;
    hooks: unknown;
    favorite: boolean;
  }[];
};

const asHooks = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

/** Older strategies stored concepts without per-concept hooks — default to []. */
function toConceptView(c: unknown): ConceptView {
  const o = (c ?? {}) as { title?: string; description?: string; hooks?: unknown };
  return { title: o.title ?? "", description: o.description ?? "", hooks: asHooks(o.hooks) };
}

function toView(r: StrategyRow): CreativeStrategyView {
  return {
    id: r.id,
    projectId: r.projectId,
    status: r.status,
    model: r.model,
    customerPsychology: (r.customerPsychology as CustomerPsychology | null) ?? null,
    angles: r.angles.map((a) => ({
      id: a.id,
      category: a.category,
      headline: a.headline,
      description: a.description,
      favorite: a.favorite,
    })),
    hooks: r.hooks.map((h) => ({ id: h.id, category: h.category, text: h.content, favorite: h.favorite })),
    staticConcepts: (Array.isArray(r.staticConcepts) ? r.staticConcepts : []).map(toConceptView),
    videoConcepts: (Array.isArray(r.videoConcepts) ? r.videoConcepts : []).map(toConceptView),
    ugcConcepts: r.ugcConcepts.map((u) => ({
      id: u.id,
      title: u.title,
      concept: u.concept,
      format: u.format ?? undefined,
      hooks: asHooks(u.hooks),
      favorite: u.favorite,
    })),
    error: r.error,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function loadView(tx: TenantTx, ctx: RequestContext, id: string): Promise<CreativeStrategyView> {
  const row = await tx.creativeStrategy.findFirstOrThrow({
    where: { id, organizationId: ctx.organizationId },
    include: strategyInclude,
  });
  return toView(row as StrategyRow);
}

export const prismaCreativeRepository: CreativeRepository = {
  createBrief(ctx, { projectId, analysisId, inputs }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!project) throw AppError.notFound("Project not found.");
      const brief = await tx.creativeBrief.create({
        data: { organizationId: ctx.organizationId, projectId, analysisId, inputs: json(inputs) },
        select: { id: true },
      });
      return { id: brief.id };
    });
  },

  createStrategy(ctx, { projectId, briefId }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const s = await tx.creativeStrategy.create({
        data: { organizationId: ctx.organizationId, projectId, briefId, status: "PROCESSING" },
        select: { id: true },
      });
      return { id: s.id };
    });
  },

  async setPsychology(ctx, strategyId, psychology: CustomerPsychology) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.creativeStrategy.updateMany({
        where: { id: strategyId, organizationId: ctx.organizationId },
        data: { customerPsychology: json(psychology) },
      });
    });
  },

  async addAngles(ctx, strategyId, angles: AngleItem[]) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.angle.createMany({
        data: angles.map((a, i) => ({
          organizationId: ctx.organizationId,
          strategyId,
          category: a.category,
          headline: a.headline,
          description: a.description,
          position: i,
        })),
      });
    });
  },

  async addHooks(ctx, strategyId, hooks: HookItem[]) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.hook.createMany({
        data: hooks.map((h, i) => ({
          organizationId: ctx.organizationId,
          strategyId,
          category: h.category,
          content: h.text,
          position: i,
        })),
      });
    });
  },

  async setConcepts(ctx, strategyId, concepts) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.creativeStrategy.updateMany({
        where: { id: strategyId, organizationId: ctx.organizationId },
        data: { staticConcepts: json(concepts.static), videoConcepts: json(concepts.video) },
      });
      if (concepts.ugc.length) {
        await tx.uGCConcept.createMany({
          data: concepts.ugc.map((u, i) => ({
            organizationId: ctx.organizationId,
            strategyId,
            title: u.title,
            concept: u.concept,
            format: u.format ?? null,
            hooks: json(u.hooks),
            position: i,
          })),
        });
      }
    });
  },

  complete(ctx, strategyId, { model }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const res = await tx.creativeStrategy.updateMany({
        where: { id: strategyId, organizationId: ctx.organizationId },
        data: { status: "COMPLETED", model, error: null },
      });
      if (res.count === 0) throw AppError.notFound("Strategy not found.");
      return loadView(tx, ctx, strategyId);
    });
  },

  async fail(ctx, strategyId, error) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.creativeStrategy.updateMany({
        where: { id: strategyId, organizationId: ctx.organizationId },
        data: { status: "FAILED", error },
      });
    });
  },

  latestForProject(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      // Prefer the latest COMPLETED strategy so a failed re-generate never
      // hides good results; fall back to the latest of any status otherwise.
      const completed = await tx.creativeStrategy.findFirst({
        where: { projectId, organizationId: ctx.organizationId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        include: strategyInclude,
      });
      if (completed) return toView(completed as StrategyRow);
      const any = await tx.creativeStrategy.findFirst({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        include: strategyInclude,
      });
      return any ? toView(any as StrategyRow) : null;
    });
  },

  async setFavorite(ctx, kind, id, favorite) {
    await withTenant(ctx.organizationId, async (tx) => {
      const where = { id, organizationId: ctx.organizationId };
      if (kind === "angle") await tx.angle.updateMany({ where, data: { favorite } });
      else if (kind === "hook") await tx.hook.updateMany({ where, data: { favorite } });
      else await tx.uGCConcept.updateMany({ where, data: { favorite } });
    });
  },

  async updateItem(ctx, kind: CreativeItemKind, id, patch: CreativeItemPatch) {
    await withTenant(ctx.organizationId, async (tx) => {
      const where = { id, organizationId: ctx.organizationId };
      if (kind === "angle") {
        await tx.angle.updateMany({
          where,
          data: {
            ...(patch.headline !== undefined ? { headline: patch.headline } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
          },
        });
      } else if (kind === "hook") {
        await tx.hook.updateMany({
          where,
          data: { ...(patch.text !== undefined ? { content: patch.text } : {}) },
        });
      } else {
        await tx.uGCConcept.updateMany({
          where,
          data: {
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.concept !== undefined ? { concept: patch.concept } : {}),
          },
        });
      }
    });
  },
};
