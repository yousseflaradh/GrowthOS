"use server";

/**
 * Knowledge Base actions: ingest project data into the vector store, run
 * semantic search, and delete documents. Synchronous (server action), queue-ready.
 */
import { revalidatePath } from "next/cache";
import type { KnowledgeSourceType } from "@prisma/client";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { captureServerEvent } from "@/lib/posthog";
import { knowledgeService, type IngestResult, type SearchHit } from "@/modules/knowledge";

export async function ingestKnowledgeAction(
  projectId: string,
  sources?: KnowledgeSourceType[],
): Promise<ActionResult<IngestResult>> {
  return action(async () => {
    const ctx = await requireContext();
    const result = await knowledgeService.ingest(ctx, projectId, sources);

    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "knowledge_ingested",
      properties: { projectId, sources: sources ?? "all", chunks: result.chunksWritten },
    });

    revalidatePath(`/projects/${projectId}/knowledge`);
    return result;
  });
}

export async function searchKnowledgeAction(
  projectId: string,
  query: string,
  sourceType?: KnowledgeSourceType,
): Promise<ActionResult<SearchHit[]>> {
  return action(async () => {
    const ctx = await requireContext();
    return knowledgeService.search(ctx, projectId, query, { sourceType, limit: 8 });
  });
}

export async function deleteDocumentAction(
  projectId: string,
  documentId: string,
): Promise<ActionResult<null>> {
  return action(async () => {
    const ctx = await requireContext();
    await knowledgeService.deleteDocument(ctx, projectId, documentId);
    revalidatePath(`/projects/${projectId}/knowledge`);
    return null;
  });
}
