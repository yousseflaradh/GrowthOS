/** Read models returned by the knowledge module to the delivery layer. */
import type { KnowledgeSourceType, DocumentStatus } from "@prisma/client";

export interface DocumentView {
  id: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  status: DocumentStatus;
  chunkCount: number;
  model: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeStats {
  documents: number;
  chunks: number;
  bySource: Record<KnowledgeSourceType, number>;
}

/** A single semantic-search hit. */
export interface SearchHit {
  chunkId: string;
  documentId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  text: string;
  score: number; // cosine similarity, 0–1
}

/** Assembled context for feeding retrieved knowledge back into an AI prompt. */
export interface RetrievedContext {
  context: string; // ready-to-inject block, budgeted
  citations: SearchHit[];
}

/** Outcome of an ingestion run over one or more sources. */
export interface IngestResult {
  documents: DocumentView[];
  chunksWritten: number;
  skipped: { sourceType: KnowledgeSourceType; reason: string }[];
}
