/**
 * Turns an agent definition into a LangGraph node bound to a run.
 * Each node: records a live step → recalls memory (RAG) → runs one structured
 * LLM call (with usage/cost/retry) → writes its artifact channel and adds its
 * usage/cost to the shared accounting channels. A node never aborts the graph:
 * on failure it records the step as FAILED and emits an error, leaving its
 * artifact null so downstream agents degrade gracefully.
 */
import type { z } from "zod";
import type { RequestContext } from "@/shared/application/request-context";
import type { CampaignStateType, CampaignUpdate } from "@/agents/state";
import { runStructured } from "@/agents/runtime/llm";
import { recall } from "@/agents/runtime/memory";
import { startStep, completeStep, failStep } from "@/agents/runtime/persist";

export interface AgentDef<S extends z.ZodTypeAny> {
  name: string;
  position: number;
  channel: keyof CampaignStateType;
  system: string;
  /** RAG query used to recall relevant project knowledge before reasoning. */
  memoryQuery: (state: CampaignStateType) => string;
  /** Build the user prompt from upstream state + recalled memory. */
  buildUser: (state: CampaignStateType, memory: string) => string;
  schema: S;
  temperature?: number;
}

export type GraphNode = (state: CampaignStateType) => Promise<CampaignUpdate>;

export function makeAgentNode<S extends z.ZodTypeAny>(
  ctx: RequestContext,
  runId: string,
  def: AgentDef<S>,
): GraphNode {
  return async (state) => {
    const { id: stepId } = await startStep(ctx, runId, def.name, def.position);
    try {
      const memory = await recall(ctx, state.projectId, def.memoryQuery(state));
      const res = await runStructured({
        label: def.name,
        system: def.system,
        user: def.buildUser(state, memory),
        schema: def.schema,
        temperature: def.temperature,
      });
      await completeStep(ctx, stepId, {
        model: res.model,
        usage: res.usage,
        costUsd: res.costUsd,
        output: res.data,
        attempts: res.attempts,
      });
      return {
        [def.channel]: res.data,
        usage: res.usage,
        costUsd: res.costUsd,
      } as CampaignUpdate;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await failStep(ctx, stepId, { error: message, attempts: 2 });
      return { errors: [`${def.name}: ${message}`] } as CampaignUpdate;
    }
  };
}
