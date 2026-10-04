/**
 * LangGraph state for the campaign workflow. Each agent writes its own artifact
 * channel (last-write-wins) while shared accounting channels — token usage,
 * cost, and errors — use reducers so contributions from every node accumulate.
 */
import { Annotation } from "@langchain/langgraph";
import { addUsage, ZERO_USAGE, type TokenUsage } from "@/ai/types";
import type {
  ProductOut,
  ResearchOut,
  PsychologyOut,
  CompetitorOut,
  CreativeOut,
  CopyOut,
  LandingOut,
  AuditOut,
} from "@/agents/schemas";

export const CampaignState = Annotation.Root({
  // Inputs (set at invoke).
  projectId: Annotation<string>(),
  productName: Annotation<string>(),
  goal: Annotation<string>(),

  // Per-agent artifacts (null until produced).
  product: Annotation<ProductOut | null>({ reducer: (_, b) => b, default: () => null }),
  research: Annotation<ResearchOut | null>({ reducer: (_, b) => b, default: () => null }),
  psychology: Annotation<PsychologyOut | null>({ reducer: (_, b) => b, default: () => null }),
  competitor: Annotation<CompetitorOut | null>({ reducer: (_, b) => b, default: () => null }),
  creative: Annotation<CreativeOut | null>({ reducer: (_, b) => b, default: () => null }),
  copy: Annotation<CopyOut | null>({ reducer: (_, b) => b, default: () => null }),
  landing: Annotation<LandingOut | null>({ reducer: (_, b) => b, default: () => null }),
  audit: Annotation<AuditOut | null>({ reducer: (_, b) => b, default: () => null }),

  // Shared accounting — accumulated across every node.
  usage: Annotation<TokenUsage>({ reducer: addUsage, default: () => ZERO_USAGE }),
  costUsd: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
  errors: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});

export type CampaignStateType = typeof CampaignState.State;
export type CampaignUpdate = Partial<CampaignStateType>;
