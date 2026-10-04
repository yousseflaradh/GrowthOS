"use server";

/**
 * Analyze a competitor URL: scrape → snapshot → AI competitive analysis
 * (offer / pricing / creative / positioning / SWOT). Synchronous, queue-ready.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { captureServerEvent } from "@/lib/posthog";
import { competitorService, type CompetitorView } from "@/modules/competitor";

export async function runCompetitorAnalysisAction(
  projectId: string,
  url: string,
  name?: string,
): Promise<ActionResult<CompetitorView[]>> {
  return action(async () => {
    const ctx = await requireContext();
    const list = await competitorService.run(ctx, projectId, url, name);

    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "competitor_analyzed",
      properties: { projectId, url },
    });

    revalidatePath(`/projects/${projectId}/competitors`);
    return list;
  });
}

export async function deleteCompetitorAction(projectId: string, competitorId: string): Promise<ActionResult<null>> {
  return action(async () => {
    const ctx = await requireContext();
    await competitorService.remove(ctx, projectId, competitorId);
    revalidatePath(`/projects/${projectId}/competitors`);
    return null;
  });
}
