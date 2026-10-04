/**
 * intel context — PUBLIC API + composition root.
 * Manual import always works (free); Apify auto-fetch activates with APIFY_TOKEN.
 */
import { createIntelService } from "./application/intel-service";
import { prismaIntelRepository } from "./infrastructure/prisma-intel-repository";
import { analyzeIntel } from "./infrastructure/intel-analyzer";
import { apifyProvider } from "./infrastructure/apify-provider";

export const intelService = createIntelService({
  repo: prismaIntelRepository,
  analyze: analyzeIntel,
  provider: apifyProvider,
});

export type { CompetitorAdView, AdCommentView, IntelReportView, IntelOverview } from "./application/dto";
export type { IntelReportResult } from "./application/intel-schema";
export type { AdSource, IntelStatus } from "./domain/intel-status";
