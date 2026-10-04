/**
 * competitor context — PUBLIC API + composition root.
 */
import { teardownLandingPage } from "@/lib/scraper";
import { createCompetitorService } from "./application/competitor-service";
import { prismaCompetitorRepository } from "./infrastructure/prisma-competitor-repository";
import { analyzeCompetitor } from "./infrastructure/openrouter-competitor";

export const competitorService = createCompetitorService({
  // Thorough: an explicit user request — worth the headless render on bot walls.
  scrape: (url) => teardownLandingPage(url, { thorough: true }),
  analyze: analyzeCompetitor,
  repo: prismaCompetitorRepository,
});

export type { CompetitorView, CompetitorAnalysisView } from "./application/dto";
export type { CompetitorAnalysisResult } from "./application/competitor-schema";
