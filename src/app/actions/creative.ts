"use server";

/**
 * Generate a Creative Strategy from a project's latest product analysis.
 * Orchestrates two modules (analysis → creative) at the delivery layer so the
 * creative module stays decoupled from the analysis module.
 * Runs synchronously (4 AI calls) — see creative-service for the queue-ready note.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { AppError } from "@/shared/errors/app-error";
import { captureServerEvent } from "@/lib/posthog";
import { projectService } from "@/modules/projects";
import { analysisService } from "@/modules/analysis";
import { intelService } from "@/modules/intel";
import { creativeService, type CreativeStrategyView, type CreativeItemKind } from "@/modules/creative";
import { isRealAdCopy, isRealComment } from "@/lib/text-filters";
import type { CreativeInputs } from "@/ai/prompts/creative";

export async function runCreativeStrategyAction(projectId: string): Promise<ActionResult<CreativeStrategyView>> {
  return action(async () => {
    const ctx = await requireContext();

    const analysis = await analysisService.latest(ctx, projectId);
    if (!analysis || analysis.status !== "COMPLETED" || !analysis.result) {
      throw AppError.validation("Run a product analysis first — creative strategy is built from it.");
    }

    const project = await projectService.getProject(ctx, projectId);
    // Real customer voice gathered for this product (optional grounding).
    const voice = await intelService.overview(ctx, projectId);

    const r = analysis.result;
    const inputs: CreativeInputs = {
      productName: project.productName,
      avatarSummary: r.customerAvatar.summary,
      demographics: r.customerAvatar.demographics,
      psychographics: r.customerAvatar.psychographics,
      painPoints: r.painPoints,
      desires: r.desires,
      objections: r.objections,
      uspPoints: r.uspAnalysis.uniqueSellingPoints,
      differentiation: r.uspAnalysis.differentiation,
      // Only feed REAL copy/voice to the AI — drop bare URLs, domains, and junk.
      customerComments: voice.comments.map((c) => c.text).filter(isRealComment),
      competitorAds: voice.ads.map((a) => a.adText).filter(isRealAdCopy),
    };

    const strategy = await creativeService.run(ctx, { projectId, analysisId: analysis.id, inputs });

    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "creative_strategy_generated",
      properties: { projectId, angles: strategy.angles.length, hooks: strategy.hooks.length },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/creative`);
    return strategy;
  });
}

export async function toggleFavoriteAction(
  projectId: string,
  kind: CreativeItemKind,
  id: string,
  favorite: boolean,
): Promise<ActionResult<null>> {
  return action(async () => {
    const ctx = await requireContext();
    await creativeService.setFavorite(ctx, kind, id, favorite);
    revalidatePath(`/projects/${projectId}/creative`);
    return null;
  });
}

export async function updateCreativeItemAction(
  projectId: string,
  kind: CreativeItemKind,
  id: string,
  patch: { headline?: string; description?: string; text?: string; title?: string; concept?: string },
): Promise<ActionResult<null>> {
  return action(async () => {
    const ctx = await requireContext();
    await creativeService.updateItem(ctx, kind, id, patch);
    revalidatePath(`/projects/${projectId}/creative`);
    return null;
  });
}
