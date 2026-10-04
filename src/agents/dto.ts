/** Read models for agent runs/steps surfaced to the delivery layer. */
import type { AgentRunStatus } from "@prisma/client";

export interface AgentStepView {
  id: string;
  agent: string;
  position: number;
  status: AgentRunStatus;
  attempts: number;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  output: unknown;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AgentRunView {
  id: string;
  workflow: string;
  status: AgentRunStatus;
  input: unknown;
  result: unknown;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  error: string | null;
  steps: AgentStepView[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunSummary {
  id: string;
  workflow: string;
  status: AgentRunStatus;
  totalCostUsd: number;
  totalTokens: number;
  steps: number;
  createdAt: string;
}
