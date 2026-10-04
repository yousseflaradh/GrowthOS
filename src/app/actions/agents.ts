"use server";

/**
 * Agent orchestration actions: run the campaign agent graph for a project.
 * Long-running (8 sequential agents); synchronous like the other pipelines,
 * queue-ready. Every step is persisted live, so a refresh shows progress.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { AppError } from "@/shared/errors/app-error";
import { captureServerEvent } from "@/lib/posthog";
import { agentService, type AgentRunView } from "@/agents";
import { buildLandingResultFromRun, type CampaignRunResult } from "@/agents/landing-export";
import { projectService } from "@/modules/projects";
import { analysisService } from "@/modules/analysis";
import { landingService } from "@/modules/landing";

export async function runCampaignAction(projectId: string, goal: string): Promise<ActionResult<AgentRunView>> {
  return action(async () => {
    const ctx = await requireContext();
    const run = await agentService.runCampaign(ctx, projectId, goal);

    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "agent_campaign_run",
      properties: { projectId, runId: run.id, status: run.status, costUsd: run.totalCostUsd },
    });

    revalidatePath(`/projects/${projectId}/agents`);
    return run;
  });
}

/**
 * Materialize a finished agent run into a real, editable landing page version
 * (the Landing agent's design + the rest of the run's research). No AI call.
 * Returns the new version id so the UI can jump into the builder.
 */
export async function buildLandingFromRunAction(
  projectId: string,
  runId: string,
): Promise<ActionResult<{ versionId: string }>> {
  return action(async () => {
    const ctx = await requireContext();
    const run = await agentService.get(ctx, runId);
    if (!run || !run.result) throw AppError.notFound("Run not found.");
    if (!(run.result as CampaignRunResult).landing) {
      throw AppError.validation("This run has no landing page — re-run the workflow so the Landing agent completes.");
    }

    const project = await projectService.getProject(ctx, projectId);
    const result = buildLandingResultFromRun(run.result as CampaignRunResult, project.productName);

    // Real reviews (from the latest product analysis) replace placeholder quotes.
    const analysis = await analysisService.latest(ctx, projectId);
    const reviews = (analysis?.snapshot?.reviews ?? []).map((rv) => ({
      text: rv.text,
      author: rv.author ?? undefined,
      rating: rv.rating ?? undefined,
    }));

    const version = await landingService.createFromResult(ctx, {
      projectId,
      productName: project.productName,
      result,
      model: "agent-campaign",
      theme: "auto",
      reviews,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/landing`);
    return { versionId: version.id };
  });
}
