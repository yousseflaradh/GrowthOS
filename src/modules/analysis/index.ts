/**
 * analysis context — PUBLIC API + composition root.
 * Wires the scraper + OpenRouter analyzer + Prisma repo into the service.
 */
import { createAnalysisService } from "./application/analysis-service";
import { prismaAnalysisRepository } from "./infrastructure/prisma-analysis-repository";
import { analyze } from "./infrastructure/openrouter-analyzer";
import { scrapeProduct } from "@/lib/scraper";

export const analysisService = createAnalysisService({
  scrape: scrapeProduct,
  analyze,
  repo: prismaAnalysisRepository,
});

export type { AnalysisView, SnapshotView, ReviewView } from "./application/dto";
export type { ProductAnalysisResult } from "./application/analysis-schema";
export type { AnalysisStatus } from "./domain/analysis-status";
export { runAnalysisSchema, parseFeatures } from "./interface/schemas";
