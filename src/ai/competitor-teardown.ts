/**
 * Pass-1 competitor teardown. Runs ONE AI call (through the failover gateway)
 * over the scraped competitor-page outlines and returns a distilled conversion
 * playbook. Best-effort: any failure returns null so landing generation (pass 2)
 * still proceeds with the raw outlines as a fallback.
 */
import { generateJson } from "@/ai/gateway";
import { logger } from "@/shared/observability/logger";
import {
  competitorPlaybookSchema,
  TEARDOWN_SYSTEM,
  buildTeardownUser,
  type CompetitorPlaybook,
} from "@/ai/prompts/page-teardown";

export async function analyzeCompetitorPages(
  pages: { source: string; outline: string }[],
): Promise<CompetitorPlaybook | null> {
  const usable = pages.filter((p) => p.outline.trim().length > 0).slice(0, 2);
  if (usable.length === 0) return null;
  try {
    const { data } = await generateJson({
      system: TEARDOWN_SYSTEM,
      user: buildTeardownUser(usable),
      schema: competitorPlaybookSchema,
      temperature: 0.4,
    });
    return data;
  } catch (e) {
    logger.warn("competitor_teardown.failed", { err: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

/** Compact, generator-ready text of the synthesized playbook. */
export function playbookToText(p: CompetitorPlaybook): string {
  const pb = p.playbook;
  return [
    `RECOMMENDED SECTION FLOW: ${pb.recommendedFlow.join(" → ")}`,
    `OFFER STRATEGY: ${pb.offerStrategy}`,
    pb.proofStrategy.length ? `PROOF STRATEGY: ${pb.proofStrategy.join("; ")}` : "",
    pb.mustHaves.length ? `MUST-HAVE CONVERSION ELEMENTS: ${pb.mustHaves.join("; ")}` : "",
    pb.hooksToAdapt.length ? `HOOK ANGLES TO ADAPT (rewrite for our product): ${pb.hooksToAdapt.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
