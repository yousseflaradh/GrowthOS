/** Ports for the Knowledge Base / RAG module (hexagonal boundaries). */
import type { KnowledgeSourceType } from "@prisma/client";
import type { RequestContext } from "@/shared/application/request-context";
import type { DocumentView, KnowledgeStats, SearchHit } from "@/modules/knowledge/application/dto";

/** Raw content pulled from a domain source, before chunking/embedding. */
export interface RawSource {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  text: string;
}

/** Collects ingestible text for a project from an existing domain (Phase 2/7/…). */
export type SourceCollector = (ctx: RequestContext, projectId: string) => Promise<RawSource[]>;

/** Embedding provider metadata + operations. */
export interface Embedder {
  provider: string;
  model: string;
  dimensions: number;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface VectorPoint {
  id: string; // Chunk.vectorId (UUID)
  vector: number[];
  payload: {
    organizationId: string;
    projectId: string;
    documentId: string;
    chunkId: string;
    sourceType: string;
    sourceId: string | null;
    title: string;
    text: string;
    index: number;
  };
}

export interface VectorSearchArgs {
  vector: number[];
  organizationId: string;
  projectId?: string;
  sourceType?: KnowledgeSourceType;
  limit?: number;
}

export interface VectorStore {
  upsert(points: VectorPoint[]): Promise<void>;
  search(args: VectorSearchArgs): Promise<SearchHit[]>;
  deleteByDocument(organizationId: string, documentId: string): Promise<void>;
  deleteByProject(organizationId: string, projectId: string): Promise<void>;
}

/** A chunk ready to persist (its vector already lives in the store). */
export interface PersistChunk {
  index: number;
  content: string;
  tokenCount: number;
  vectorId: string;
}

export interface KnowledgeRepository {
  /** Throw if the project doesn't belong to the caller's org. */
  assertProject(ctx: RequestContext, projectId: string): Promise<void>;
  /** Find-or-create the Document for a source (unique per project+type+sourceId). */
  upsertDocument(
    ctx: RequestContext,
    args: { projectId: string; sourceType: KnowledgeSourceType; sourceId: string; title: string },
  ): Promise<{ id: string }>;
  markProcessing(ctx: RequestContext, documentId: string): Promise<void>;
  /** Replace a document's chunks + embedding metadata atomically. */
  replaceChunks(
    ctx: RequestContext,
    documentId: string,
    chunks: PersistChunk[],
    embed: { provider: string; model: string; dimensions: number },
  ): Promise<void>;
  markReady(ctx: RequestContext, documentId: string, args: { chunkCount: number; model: string }): Promise<void>;
  markFailed(ctx: RequestContext, documentId: string, error: string): Promise<void>;
  listDocuments(ctx: RequestContext, projectId: string): Promise<DocumentView[]>;
  stats(ctx: RequestContext, projectId: string): Promise<KnowledgeStats>;
  /** Delete a document (+ its chunks via cascade). Returns whether it existed. */
  deleteDocument(ctx: RequestContext, projectId: string, documentId: string): Promise<boolean>;
}
