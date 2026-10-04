/**
 * agents context — PUBLIC API + composition root (Phase 9: AI Agent Orchestration).
 * `runCampaign` executes the eight-agent LangGraph workflow for a project,
 * grounded in the Phase 8 knowledge base, with per-step cost/retry tracking.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";
import { ZERO_USAGE } from "@/ai/types";
import { projectService } from "@/modules/projects";
import { buildCampaignGraph } from "@/agents/graph";
import { AGENT_ORDER } from "@/agents/schemas";
import { createRun, finishRun, getRun, latestRun, listRuns } from "@/agents/runtime/persist";
import type { AgentRunView, AgentRunSummary } from "@/agents/dto";

export const agentService = {
  /** Run the campaign agent graph end-to-end and persist every step. */
  async runCampaign(ctx: RequestContext, projectId: string, goal: string): Promise<AgentRunView> {
    if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to run agents.");
    const project = await projectService.getProject(ctx, projectId); // throws NOT_FOUND if missing

    const { id: runId } = await createRun(ctx, projectId, "campaign", { goal });
    const graph = buildCampaignGraph(ctx, runId);

    try {
      const final = await graph.invoke({ projectId, productName: project.productName, goal: goal.trim() });

      const produced = AGENT_ORDER.filter((a) => {
        const channel = a === "copywriter" ? "copy" : a;
        return final[channel as keyof typeof final] != null;
      }).length;
      const status = produced === 0 ? "FAILED" : "COMPLETED";
      const result = {
        product: final.product,
        research: final.research,
        psychology: final.psychology,
        competitor: final.competitor,
        creative: final.creative,
        copy: final.copy,
        landing: final.landing,
        audit: final.audit,
        errors: final.errors,
      };

      await finishRun(ctx, runId, {
        status,
        result,
        usage: final.usage ?? ZERO_USAGE,
        costUsd: final.costUsd ?? 0,
        error: status === "FAILED" ? "Every agent failed — check provider keys / rate limits." : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("agent.run_failed", { runId, err: message });
      await finishRun(ctx, runId, { status: "FAILED", result: null, usage: ZERO_USAGE, costUsd: 0, error: message });
    }

    const view = await getRun(ctx, runId);
    if (!view) throw new AppError("INTERNAL", "Run vanished after execution.");
    return view;
  },

  latest(ctx: RequestContext, projectId: string): Promise<AgentRunView | null> {
    return latestRun(ctx, projectId);
  },
  get(ctx: RequestContext, runId: string): Promise<AgentRunView | null> {
    return getRun(ctx, runId);
  },
  history(ctx: RequestContext, projectId: string): Promise<AgentRunSummary[]> {
    return listRuns(ctx, projectId);
  },
};

export type { AgentRunView, AgentStepView, AgentRunSummary } from "@/agents/dto";
