/**
 * Competitor analyzer — wraps the AI gateway with the competitive-intel prompt
 * + schema. Returns { data, model }.
 */
import { generateJson } from "@/ai/gateway";
import { COMPETITOR_SYSTEM, buildCompetitorUser } from "@/ai/prompts/competitor";
import { competitorAnalysisResultSchema } from "@/modules/competitor/application/competitor-schema";
import type { LandingTeardown } from "@/lib/scraper";

export function analyzeCompetitor(teardown: LandingTeardown, name: string) {
  return generateJson({
    system: COMPETITOR_SYSTEM,
    user: buildCompetitorUser(teardown, name),
    schema: competitorAnalysisResultSchema,
    temperature: 0.4,
  });
}
