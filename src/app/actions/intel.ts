"use server";

/**
 * Market Intelligence actions: import pasted ads/comments (free, manual),
 * optionally auto-fetch via Apify, and synthesize an intel report.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { captureServerEvent } from "@/lib/posthog";
import { projectService } from "@/modules/projects";
import { intelService, type IntelReportView } from "@/modules/intel";

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}/intel`);
  revalidatePath(`/projects/${projectId}`);
}

/** Blocks separated by blank lines → one ad each. */
function parseAds(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .filter((b) => b.length >= 3)
    .slice(0, 30);
}

/** One comment per line. */
function parseComments(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2)
    .slice(0, 300);
}

export async function importAdsAction(projectId: string, rawText: string): Promise<ActionResult<{ added: number }>> {
  return action(async () => {
    const ctx = await requireContext();
    const ads = parseAds(rawText).map((adText) => ({ source: "MANUAL" as const, adText }));
    const added = await intelService.importAds(ctx, projectId, ads);
    revalidate(projectId);
    return { added };
  });
}

export async function importCommentsAction(
  projectId: string,
  rawText: string,
): Promise<ActionResult<{ added: number }>> {
  return action(async () => {
    const ctx = await requireContext();
    const comments = parseComments(rawText).map((text) => ({ source: "MANUAL" as const, text }));
    const added = await intelService.importComments(ctx, projectId, comments);
    revalidate(projectId);
    return { added };
  });
}

export async function fetchIntelAction(
  projectId: string,
  query: string,
): Promise<ActionResult<{ ads: number; comments: number }>> {
  return action(async () => {
    const ctx = await requireContext();
    const result = await intelService.fetchFromProvider(ctx, projectId, { query: query.trim(), limit: 30 });
    revalidate(projectId);
    return result;
  });
}

export async function generateIntelReportAction(projectId: string): Promise<ActionResult<IntelReportView>> {
  return action(async () => {
    const ctx = await requireContext();
    const project = await projectService.getProject(ctx, projectId);
    const report = await intelService.generateReport(ctx, projectId, project.productName);
    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "intel_report_generated",
      properties: { projectId },
    });
    revalidate(projectId);
    return report;
  });
}
