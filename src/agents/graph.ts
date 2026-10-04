/**
 * Assembles the campaign workflow as a LangGraph StateGraph: the eight agents
 * chained linearly, each bound to the active run (for live step persistence).
 * The graph is built per-invocation so nodes close over ctx + runId.
 *
 * LangGraph's builder types node names as literals; since our node list is
 * data-driven we drive it through a locally-relaxed handle while keeping the
 * compiled `invoke` result strongly typed as CampaignState.
 */
import { StateGraph, START, END } from "@langchain/langgraph";
import type { RequestContext } from "@/shared/application/request-context";
import { CampaignState, type CampaignStateType } from "@/agents/state";
import { AGENTS } from "@/agents/nodes";
import { makeAgentNode, type GraphNode } from "@/agents/runtime/node";

interface GraphHandle {
  addNode(name: string, fn: GraphNode): GraphHandle;
  addEdge(from: string, to: string): GraphHandle;
  compile(): CompiledCampaign;
}

export interface CompiledCampaign {
  invoke(input: Partial<CampaignStateType>): Promise<CampaignStateType>;
}

// LangGraph forbids a node id that matches a state channel name (product,
// research, …), so nodes get a distinct id while the readable agent name is
// still what we persist on each step.
const nodeId = (agent: string) => `${agent}__agent`;

export function buildCampaignGraph(ctx: RequestContext, runId: string): CompiledCampaign {
  const g = new StateGraph(CampaignState) as unknown as GraphHandle;

  for (const def of AGENTS) g.addNode(nodeId(def.name), makeAgentNode(ctx, runId, def));

  g.addEdge(START, nodeId(AGENTS[0]!.name));
  for (let i = 0; i < AGENTS.length - 1; i++) g.addEdge(nodeId(AGENTS[i]!.name), nodeId(AGENTS[i + 1]!.name));
  g.addEdge(nodeId(AGENTS[AGENTS.length - 1]!.name), END);

  return g.compile();
}
