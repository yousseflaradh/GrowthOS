/**
 * VectorStore backed by the shared Qdrant "knowledge" collection.
 * Maps module-level points/hits to the low-level client in @/lib/qdrant.
 */
import type { KnowledgeSourceType } from "@prisma/client";
import {
  upsertKnowledgePoints,
  searchKnowledge,
  deleteKnowledgePoints,
} from "@/lib/qdrant";
import type { SearchHit } from "@/modules/knowledge/application/dto";
import type { VectorStore } from "@/modules/knowledge/application/ports";

export const qdrantVectorStore: VectorStore = {
  async upsert(points) {
    await upsertKnowledgePoints(points);
  },

  async search(args): Promise<SearchHit[]> {
    const hits = await searchKnowledge({
      vector: args.vector,
      organizationId: args.organizationId,
      projectId: args.projectId,
      sourceType: args.sourceType,
      limit: args.limit,
    });
    return hits.map((h) => ({
      chunkId: h.payload.chunkId,
      documentId: h.payload.documentId,
      sourceType: h.payload.sourceType as KnowledgeSourceType,
      title: h.payload.title,
      text: h.payload.text,
      score: h.score,
    }));
  },

  async deleteByDocument(organizationId, documentId) {
    await deleteKnowledgePoints({ organizationId, documentId });
  },

  async deleteByProject(organizationId, projectId) {
    await deleteKnowledgePoints({ organizationId, projectId });
  },
};
