/**
 * Qdrant client + the "knowledge" collection that backs the RAG plane (Phase 8).
 *
 * Tenancy: a SINGLE shared collection, isolated by a mandatory `organizationId`
 * payload filter at query time (pool tenancy — same model as Postgres RLS), not
 * one collection per org. `projectId`, `documentId` and `sourceType` are indexed
 * so ingestion cleanup and scoped search stay fast.
 * See docs/architecture/03-ai-architecture.md §3.
 */
import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@/config/env";
import { logger } from "@/shared/observability/logger";

const globalForQdrant = globalThis as unknown as {
  qdrant: QdrantClient | undefined;
};

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({ url: env.QDRANT_URL, apiKey: env.QDRANT_API_KEY });

if (env.NODE_ENV !== "production") globalForQdrant.qdrant = qdrant;

export const KNOWLEDGE_COLLECTION = "knowledge";

/** Payload stored alongside every knowledge vector. Mirrors the Chunk row. */
export interface KnowledgePayload {
  organizationId: string;
  projectId: string;
  documentId: string;
  chunkId: string;
  sourceType: string; // KnowledgeSourceType
  sourceId: string | null;
  title: string;
  text: string;
  index: number;
  [key: string]: unknown;
}

export interface KnowledgePoint {
  id: string; // Chunk.vectorId (UUID — Qdrant requires UUID or uint64 ids)
  vector: number[];
  payload: KnowledgePayload;
}

export interface KnowledgeHit {
  id: string;
  score: number;
  payload: KnowledgePayload;
}

const KEYWORD_INDEXES = ["organizationId", "projectId", "documentId", "sourceType"] as const;

/**
 * Idempotently ensure the knowledge collection exists at the configured
 * embedding dimension. If it exists with a DIFFERENT vector size (e.g. the old
 * Phase-1 placeholder), it's recreated — safe while empty, and re-ingestion
 * repopulates it. Payload indexes make the mandatory org filter cheap.
 */
export async function ensureKnowledgeCollection(vectorSize = env.EMBEDDING_DIM): Promise<void> {
  try {
    const { collections } = await qdrant.getCollections();
    const existing = collections.find((c) => c.name === KNOWLEDGE_COLLECTION);

    if (existing) {
      const info = await qdrant.getCollection(KNOWLEDGE_COLLECTION);
      const currentSize =
        typeof info.config?.params?.vectors === "object" &&
        info.config.params.vectors &&
        "size" in info.config.params.vectors
          ? (info.config.params.vectors.size as number)
          : undefined;
      if (currentSize === vectorSize) {
        await ensurePayloadIndexes();
        return;
      }
      logger.warn("qdrant.collection.resizing", { from: currentSize, to: vectorSize });
      await qdrant.deleteCollection(KNOWLEDGE_COLLECTION);
    }

    await qdrant.createCollection(KNOWLEDGE_COLLECTION, {
      vectors: { size: vectorSize, distance: "Cosine" },
    });
    await ensurePayloadIndexes();
    logger.info("qdrant.collection.created", { collection: KNOWLEDGE_COLLECTION, vectorSize });
  } catch (err) {
    logger.error("qdrant.collection.ensure_failed", { err: String(err) });
    throw err;
  }
}

async function ensurePayloadIndexes(): Promise<void> {
  for (const field of KEYWORD_INDEXES) {
    // createPayloadIndex is idempotent-ish; ignore "already exists" races.
    await qdrant
      .createPayloadIndex(KNOWLEDGE_COLLECTION, { field_name: field, field_schema: "keyword" })
      .catch(() => undefined);
  }
}

/** Upsert knowledge points (chunks). No-op on an empty batch. */
export async function upsertKnowledgePoints(points: KnowledgePoint[]): Promise<void> {
  if (points.length === 0) return;
  await ensureKnowledgeCollection();
  await qdrant.upsert(KNOWLEDGE_COLLECTION, {
    wait: true,
    points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload })),
  });
}

interface SearchArgs {
  vector: number[];
  organizationId: string;
  projectId?: string;
  sourceType?: string;
  limit?: number;
}

/** Vector search, always constrained to the caller's organization. */
export async function searchKnowledge(args: SearchArgs): Promise<KnowledgeHit[]> {
  await ensureKnowledgeCollection();
  const must: { key: string; match: { value: string } }[] = [
    { key: "organizationId", match: { value: args.organizationId } },
  ];
  if (args.projectId) must.push({ key: "projectId", match: { value: args.projectId } });
  if (args.sourceType) must.push({ key: "sourceType", match: { value: args.sourceType } });

  const res = await qdrant.search(KNOWLEDGE_COLLECTION, {
    vector: args.vector,
    filter: { must },
    limit: args.limit ?? 8,
    with_payload: true,
  });
  return res.map((r) => ({
    id: String(r.id),
    score: r.score,
    payload: r.payload as unknown as KnowledgePayload,
  }));
}

interface DeleteArgs {
  organizationId: string;
  documentId?: string;
  projectId?: string;
}

/** Delete points by org (+ optional document/project) — used before re-ingest. */
export async function deleteKnowledgePoints(args: DeleteArgs): Promise<void> {
  const must: { key: string; match: { value: string } }[] = [
    { key: "organizationId", match: { value: args.organizationId } },
  ];
  if (args.documentId) must.push({ key: "documentId", match: { value: args.documentId } });
  if (args.projectId) must.push({ key: "projectId", match: { value: args.projectId } });
  await qdrant.delete(KNOWLEDGE_COLLECTION, { wait: true, filter: { must } }).catch((err) => {
    // A missing collection means nothing to delete — tolerate it.
    logger.warn("qdrant.delete_failed", { err: String(err) });
  });
}
