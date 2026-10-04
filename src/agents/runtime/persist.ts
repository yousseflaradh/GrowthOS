/**
 * Persistence for agent runs/steps. withTenant (RLS) on every access. Steps are
 * written live (start → complete/fail) so the UI can show progress and the
 * per-agent cost/token/retry record survives even a partial run.
 */
import type { Prisma, AgentRunStatus } from "@prisma/client";
import { withTenant } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/application/request-context";
import type { TokenUsage } from "@/ai/types";
import type { AgentRunView, AgentStepView, AgentRunSummary } from "@/agents/dto";

const json = (v: unknown) => v as unknown as Prisma.InputJsonValue;

export async function createRun(
  ctx: RequestContext,
  projectId: string,
  workflow: string,
  input: unknown,
): Promise<{ id: string }> {
  return withTenant(ctx.organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!project) throw AppError.notFound("Project not found.");
    const run = await tx.agentRun.create({
      data: { organizationId: ctx.organizationId, projectId, workflow, status: "PROCESSING", input: json(input) },
      select: { id: true },
    });
    return { id: run.id };
  });
}

export async function startStep(
  ctx: RequestContext,
  runId: string,
  agent: string,
  position: number,
): Promise<{ id: string }> {
  return withTenant(ctx.organizationId, async (tx) => {
    const step = await tx.agentStep.create({
      data: {
        organizationId: ctx.organizationId,
        runId,
        agent,
        position,
        status: "PROCESSING",
        startedAt: new Date(),
      },
      select: { id: true },
    });
    return { id: step.id };
  });
}

export async function completeStep(
  ctx: RequestContext,
  stepId: string,
  args: { model: string; usage: TokenUsage; costUsd: number; output: unknown; attempts: number },
): Promise<void> {
  await withTenant(ctx.organizationId, async (tx) => {
    await tx.agentStep.updateMany({
      where: { id: stepId, organizationId: ctx.organizationId },
      data: {
        status: "COMPLETED",
        model: args.model,
        inputTokens: args.usage.inputTokens,
        outputTokens: args.usage.outputTokens,
        costUsd: args.costUsd,
        output: json(args.output),
        attempts: args.attempts,
        finishedAt: new Date(),
        error: null,
      },
    });
  });
}

export async function failStep(
  ctx: RequestContext,
  stepId: string,
  args: { error: string; attempts: number },
): Promise<void> {
  await withTenant(ctx.organizationId, async (tx) => {
    await tx.agentStep.updateMany({
      where: { id: stepId, organizationId: ctx.organizationId },
      data: { status: "FAILED", error: args.error, attempts: args.attempts, finishedAt: new Date() },
    });
  });
}

export async function finishRun(
  ctx: RequestContext,
  runId: string,
  args: { status: AgentRunStatus; result: unknown; usage: TokenUsage; costUsd: number; error?: string },
): Promise<void> {
  await withTenant(ctx.organizationId, async (tx) => {
    await tx.agentRun.updateMany({
      where: { id: runId, organizationId: ctx.organizationId },
      data: {
        status: args.status,
        result: json(args.result),
        totalInputTokens: args.usage.inputTokens,
        totalOutputTokens: args.usage.outputTokens,
        totalCostUsd: args.costUsd,
        error: args.error ?? null,
      },
    });
  });
}

type StepRow = {
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
  startedAt: Date | null;
  finishedAt: Date | null;
};

function toStepView(s: StepRow): AgentStepView {
  return {
    id: s.id,
    agent: s.agent,
    position: s.position,
    status: s.status,
    attempts: s.attempts,
    model: s.model,
    inputTokens: s.inputTokens,
    outputTokens: s.outputTokens,
    costUsd: s.costUsd,
    output: s.output ?? null,
    error: s.error,
    startedAt: s.startedAt?.toISOString() ?? null,
    finishedAt: s.finishedAt?.toISOString() ?? null,
  };
}

export function getRun(ctx: RequestContext, runId: string): Promise<AgentRunView | null> {
  return withTenant(ctx.organizationId, async (tx) => {
    const run = await tx.agentRun.findFirst({
      where: { id: runId, organizationId: ctx.organizationId },
      include: { steps: { orderBy: { position: "asc" } } },
    });
    if (!run) return null;
    return {
      id: run.id,
      workflow: run.workflow,
      status: run.status,
      input: run.input ?? null,
      result: run.result ?? null,
      totalInputTokens: run.totalInputTokens,
      totalOutputTokens: run.totalOutputTokens,
      totalCostUsd: run.totalCostUsd,
      error: run.error,
      steps: (run.steps as StepRow[]).map(toStepView),
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    };
  });
}

export function latestRun(ctx: RequestContext, projectId: string): Promise<AgentRunView | null> {
  return withTenant(ctx.organizationId, async (tx) => {
    const run = await tx.agentRun.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return run ? getRun(ctx, run.id) : null;
  });
}

export function listRuns(ctx: RequestContext, projectId: string): Promise<AgentRunSummary[]> {
  return withTenant(ctx.organizationId, async (tx) => {
    const runs = await tx.agentRun.findMany({
      where: { projectId, organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { _count: { select: { steps: true } } },
    });
    return runs.map((r) => ({
      id: r.id,
      workflow: r.workflow,
      status: r.status,
      totalCostUsd: r.totalCostUsd,
      totalTokens: r.totalInputTokens + r.totalOutputTokens,
      steps: r._count.steps,
      createdAt: r.createdAt.toISOString(),
    }));
  });
}
