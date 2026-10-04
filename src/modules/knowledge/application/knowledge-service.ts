/**
 * Knowledge Base / RAG orchestration.
 *
 * Ingestion: collect domain content (product, reviews, competitors) → chunk →
 * embed → persist chunk rows + provenance → upsert vectors in Qdrant. Each
 * source becomes one Document whose chunks are REPLACED on re-ingest, so the
 * operation is idempotent.
 *
 * Retrieval: embed the query → vector search (always org-scoped) → return hits,
 * or assemble a budgeted context block for feeding back into other AI features.
 */
import { randomUUID } from "node:crypto";
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";
import type { KnowledgeSourceType } from "@prisma/client";
import { chunkText, estimateTokens } from "@/modules/knowledge/application/chunk";
import type {
  DocumentView,
  IngestResult,
  KnowledgeStats,
  RetrievedContext,
  SearchHit,
} from "@/modules/knowledge/application/dto";
import type {
  Embedder,
  KnowledgeRepository,
  PersistChunk,
  RawSource,
  SourceCollector,
  VectorPoint,
  VectorStore,
} from "@/modules/knowledge/application/ports";

export interface KnowledgeDeps {
  repo: KnowledgeRepository;
  vectors: VectorStore;
  embedder: Embedder;
  collectors: Record<KnowledgeSourceType, SourceCollector>;
}

const ALL_SOURCES: KnowledgeSourceType[] = ["PRODUCT", "REVIEWS", "COMPETITOR"];
const MAX_CONTEXT_CHARS = 6000;

const SOURCE_LABEL: Record<KnowledgeSourceType, string> = {
  PRODUCT: "Product knowledge",
  REVIEWS: "Customer reviews",
  COMPETITOR: "Competitor",
};

export function createKnowledgeService(deps: KnowledgeDeps) {
  async function ingestOne(ctx: RequestContext, projectId: string, raw: RawSource): Promise<number> {
    const { id: documentId } = await deps.repo.upsertDocument(ctx, {
      projectId,
      sourceType: raw.sourceType,
      sourceId: raw.sourceId,
      title: raw.title,
    });
    await deps.repo.markProcessing(ctx, documentId);
    try {
      const texts = chunkText(raw.text);
      if (texts.length === 0) {
        await deps.repo.markReady(ctx, documentId, { chunkCount: 0, model: deps.embedder.model });
        await deps.vectors.deleteByDocument(ctx.organizationId, documentId);
        return 0;
      }

      const vectors = await deps.embedder.embedDocuments(texts);
      const persist: PersistChunk[] = [];
      const points: VectorPoint[] = [];
      texts.forEach((content, index) => {
        const vectorId = randomUUID();
        persist.push({ index, content, tokenCount: estimateTokens(content), vectorId });
        points.push({
          id: vectorId,
          vector: vectors[index]!,
          payload: {
            organizationId: ctx.organizationId,
            projectId,
            documentId,
            chunkId: vectorId,
            sourceType: raw.sourceType,
            sourceId: raw.sourceId,
            title: raw.title,
            text: content,
            index,
          },
        });
      });

      // Purge stale vectors first, then rewrite rows, then write fresh vectors.
      await deps.vectors.deleteByDocument(ctx.organizationId, documentId);
      await deps.repo.replaceChunks(ctx, documentId, persist, {
        provider: deps.embedder.provider,
        model: deps.embedder.model,
        dimensions: deps.embedder.dimensions,
      });
      await deps.vectors.upsert(points);
      await deps.repo.markReady(ctx, documentId, { chunkCount: persist.length, model: deps.embedder.model });
      return persist.length;
    } catch (err) {
      const message = err instanceof AppError ? err.message : `Ingestion failed: ${String(err)}`;
      logger.error("knowledge.ingest_failed", { documentId, sourceType: raw.sourceType, err: String(err) });
      await deps.repo.markFailed(ctx, documentId, message);
      throw err instanceof AppError ? err : new AppError("INTERNAL", message);
    }
  }

  return {
    /** Ingest the given source types (default: all) for a project. */
    async ingest(
      ctx: RequestContext,
      projectId: string,
      sources: KnowledgeSourceType[] = ALL_SOURCES,
    ): Promise<IngestResult> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to build the knowledge base.");
      await deps.repo.assertProject(ctx, projectId);

      const skipped: IngestResult["skipped"] = [];
      let chunksWritten = 0;
      let anyFailure: unknown = null;

      for (const type of sources) {
        let raws: RawSource[] = [];
        try {
          raws = await deps.collectors[type](ctx, projectId);
        } catch (err) {
          logger.error("knowledge.collect_failed", { type, err: String(err) });
          skipped.push({ sourceType: type, reason: "Could not read source data." });
          continue;
        }
        const usable = raws.filter((r) => r.text.trim().length > 0);
        if (usable.length === 0) {
          skipped.push({ sourceType: type, reason: "Nothing to ingest yet." });
          continue;
        }
        for (const raw of usable) {
          try {
            chunksWritten += await ingestOne(ctx, projectId, raw);
          } catch (err) {
            // Keep going across sources; surface the failure only if nothing landed.
            anyFailure = err;
            skipped.push({ sourceType: type, reason: err instanceof AppError ? err.message : "Ingestion failed." });
          }
        }
      }

      const documents = await deps.repo.listDocuments(ctx, projectId);
      if (chunksWritten === 0 && anyFailure) {
        throw anyFailure instanceof AppError ? anyFailure : new AppError("INTERNAL", "Ingestion failed.");
      }
      return { documents, chunksWritten, skipped };
    },

    /** Semantic search over the project's (or whole org's) knowledge. */
    async search(
      ctx: RequestContext,
      projectId: string | undefined,
      query: string,
      opts?: { limit?: number; sourceType?: KnowledgeSourceType },
    ): Promise<SearchHit[]> {
      const q = query.trim();
      if (q.length < 2) throw AppError.validation("Enter a search query.");
      if (projectId) await deps.repo.assertProject(ctx, projectId);
      const vector = await deps.embedder.embedQuery(q);
      return deps.vectors.search({
        vector,
        organizationId: ctx.organizationId,
        projectId,
        sourceType: opts?.sourceType,
        limit: opts?.limit ?? 8,
      });
    },

    /**
     * Retrieve a budgeted context block for RAG. Other engines call this to
     * ground generation in the project's real product/review/competitor data.
     */
    async retrieveContext(
      ctx: RequestContext,
      projectId: string,
      query: string,
      opts?: { limit?: number; maxChars?: number },
    ): Promise<RetrievedContext> {
      const hits = await this.search(ctx, projectId, query, { limit: opts?.limit ?? 8 });
      const budget = opts?.maxChars ?? MAX_CONTEXT_CHARS;
      const lines: string[] = [];
      const citations: SearchHit[] = [];
      let used = 0;
      for (const hit of hits) {
        const block = `[${SOURCE_LABEL[hit.sourceType]} — ${hit.title}]\n${hit.text}`;
        if (used + block.length > budget && citations.length > 0) break;
        lines.push(block);
        citations.push(hit);
        used += block.length;
      }
      return { context: lines.join("\n\n---\n\n"), citations };
    },

    listDocuments(ctx: RequestContext, projectId: string): Promise<DocumentView[]> {
      return deps.repo.listDocuments(ctx, projectId);
    },
    stats(ctx: RequestContext, projectId: string): Promise<KnowledgeStats> {
      return deps.repo.stats(ctx, projectId);
    },
    async deleteDocument(ctx: RequestContext, projectId: string, documentId: string): Promise<void> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to delete.");
      const existed = await deps.repo.deleteDocument(ctx, projectId, documentId);
      if (!existed) throw AppError.notFound("Document not found.");
      await deps.vectors.deleteByDocument(ctx.organizationId, documentId);
    },
  };
}

export type KnowledgeService = ReturnType<typeof createKnowledgeService>;
