"use server";

/**
 * Run a CRO audit of a landing-page URL. Scrapes the live page + AI analysis,
 * stored as an AuditRun with scores/findings/recommendations. Synchronous
 * (one scrape + one AI call), queue-ready.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { captureServerEvent } from "@/lib/posthog";
import { auditService, type AuditRunView } from "@/modules/audit";

export async function runAuditAction(projectId: string, url: string): Promise<ActionResult<AuditRunView>> {
  return action(async () => {
    const ctx = await requireContext();
    const run = await auditService.run(ctx, projectId, url);

    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "landing_audit_run",
      properties: { projectId, url, score: run.overallScore },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/audit`);
    return run;
  });
}
