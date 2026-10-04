/**
 * Agent memory. Each agent recalls relevant project knowledge (Phase 8 RAG)
 * before it reasons, so the graph is grounded in the product's real data, not
 * just the prompt. Best-effort: if the vector store is unavailable, agents run
 * on upstream state alone rather than failing the whole workflow.
 */
import type { RequestContext } from "@/shared/application/request-context";
import { knowledgeService } from "@/modules/knowledge";
import { logger } from "@/shared/observability/logger";

export async function recall(
  ctx: RequestContext,
  projectId: string,
  query: string,
  limit = 6,
): Promise<string> {
  try {
    const { context } = await knowledgeService.retrieveContext(ctx, projectId, query, { limit });
    return context;
  } catch (err) {
    logger.warn("agent.memory_recall_failed", { projectId, err: String(err) });
    return "";
  }
}
