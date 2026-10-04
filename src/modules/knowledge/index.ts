/**
 * knowledge context — PUBLIC API + composition root (Phase 8: Knowledge Base & RAG).
 * Other engines can `import { knowledgeService }` and call `retrieveContext(...)`
 * to ground generation in the project's real product/review/competitor data.
 */
import { createKnowledgeService } from "./application/knowledge-service";
import { prismaKnowledgeRepository } from "./infrastructure/prisma-knowledge-repository";
import { qdrantVectorStore } from "./infrastructure/qdrant-vector-store";
import { geminiEmbedder } from "./infrastructure/gemini-embedder";
import {
  collectProduct,
  collectReviews,
  collectCompetitors,
} from "./infrastructure/source-collectors";

export const knowledgeService = createKnowledgeService({
  repo: prismaKnowledgeRepository,
  vectors: qdrantVectorStore,
  embedder: geminiEmbedder,
  collectors: {
    PRODUCT: collectProduct,
    REVIEWS: collectReviews,
    COMPETITOR: collectCompetitors,
  },
});

export type { DocumentView, KnowledgeStats, SearchHit, RetrievedContext, IngestResult } from "./application/dto";
