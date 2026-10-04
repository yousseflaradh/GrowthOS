/**
 * Prisma implementation of KnowledgeRepository. withTenant (RLS) + explicit
 * organization_id filters on every access.
 */
import type { KnowledgeSourceType } from "@prisma/client";
import { withTenant } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { DocumentView, KnowledgeStats } from "@/modules/knowledge/application/dto";
import type { KnowledgeRepository } from "@/modules/knowledge/application/ports";

type DocRow = {
  id: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  status: DocumentView["status"];
  chunkCount: number;
  model: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toView(d: DocRow): DocumentView {
  return {
    id: d.id,
    sourceType: d.sourceType,
    sourceId: d.sourceId,
    title: d.title,
    status: d.status,
    chunkCount: d.chunkCount,
    model: d.model,
    error: d.error,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export const prismaKnowledgeRepository: KnowledgeRepository = {
  assertProject(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!project) throw AppError.notFound("Project not found.");
    });
  },

  upsertDocument(ctx, { projectId, sourceType, sourceId, title }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const existing = await tx.document.findFirst({
        where: { projectId, sourceType, sourceId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (existing) {
        await tx.document.updateMany({
          where: { id: existing.id, organizationId: ctx.organizationId },
          data: { title },
        });
        return { id: existing.id };
      }
      const created = await tx.document.create({
        data: { organizationId: ctx.organizationId, projectId, sourceType, sourceId, title, status: "PENDING" },
        select: { id: true },
      });
      return { id: created.id };
    });
  },

  async markProcessing(ctx, documentId) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.document.updateMany({
        where: { id: documentId, organizationId: ctx.organizationId },
        data: { status: "PROCESSING", error: null },
      });
    });
  },

  async replaceChunks(ctx, documentId, chunks, embed) {
    await withTenant(ctx.organizationId, async (tx) => {
      // Cascade drops the old embedding_metadata rows with their chunks.
      await tx.chunk.deleteMany({ where: { documentId, organizationId: ctx.organizationId } });
      if (chunks.length === 0) return;
      await tx.chunk.createMany({
        data: chunks.map((c) => ({
          organizationId: ctx.organizationId,
          documentId,
          index: c.index,
          content: c.content,
          tokenCount: c.tokenCount,
          vectorId: c.vectorId,
        })),
      });
      const created = await tx.chunk.findMany({
        where: { documentId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      await tx.embeddingMetadata.createMany({
        data: created.map((c) => ({
          organizationId: ctx.organizationId,
          chunkId: c.id,
          provider: embed.provider,
          model: embed.model,
          dimensions: embed.dimensions,
        })),
      });
    });
  },

  async markReady(ctx, documentId, { chunkCount, model }) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.document.updateMany({
        where: { id: documentId, organizationId: ctx.organizationId },
        data: { status: "READY", chunkCount, model, error: null },
      });
    });
  },

  async markFailed(ctx, documentId, error) {
    await withTenant(ctx.organizationId, async (tx) => {
      await tx.document.updateMany({
        where: { id: documentId, organizationId: ctx.organizationId },
        data: { status: "FAILED", error },
      });
    });
  },

  listDocuments(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const rows = await tx.document.findMany({
        where: { projectId, organizationId: ctx.organizationId },
        orderBy: [{ sourceType: "asc" }, { updatedAt: "desc" }],
      });
      return rows.map((r) => toView(r as DocRow));
    });
  },

  stats(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const docs = await tx.document.findMany({
        where: { projectId, organizationId: ctx.organizationId },
        select: { sourceType: true, chunkCount: true },
      });
      const bySource: KnowledgeStats["bySource"] = { PRODUCT: 0, REVIEWS: 0, COMPETITOR: 0 };
      let chunks = 0;
      for (const d of docs) {
        bySource[d.sourceType] += d.chunkCount;
        chunks += d.chunkCount;
      }
      return { documents: docs.length, chunks, bySource };
    });
  },

  deleteDocument(ctx, projectId, documentId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const res = await tx.document.deleteMany({
        where: { id: documentId, projectId, organizationId: ctx.organizationId },
      });
      return res.count > 0;
    });
  },
};
