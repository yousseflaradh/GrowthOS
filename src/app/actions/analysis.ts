"use server";

/**
 * Run a product analysis (Phase 2). Synchronous: scrape + AI happen inline and
 * the action resolves with the finished analysis. The pipeline is queue-ready,
 * so this can move to a worker later without changing the service.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { captureServerEvent } from "@/lib/posthog";
import { projectService } from "@/modules/projects";
import { analysisService, runAnalysisSchema, parseFeatures, type AnalysisView } from "@/modules/analysis";

export async function runAnalysisAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<AnalysisView>> {
  return action(async () => {
    const ctx = await requireContext();
    const values = runAnalysisSchema.parse(input);

    // Confirms the project belongs to this org and gives us the product name.
    const project = await projectService.getProject(ctx, projectId);

    const analysis = await analysisService.run(ctx, {
      projectId,
      productName: project.productName,
      mode: values.mode,
      url: values.url || undefined,
      description: values.description || undefined,
      features: parseFeatures(values.features),
      extraNotes: values.extraNotes || undefined,
    });

    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "product_analysis_run",
      properties: { projectId, mode: values.mode },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/analysis`);
    return analysis;
  });
}
