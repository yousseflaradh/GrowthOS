import type { RequestContext } from "@/shared/application/request-context";
import type { LandingTeardown } from "@/lib/scraper";
import type { CompetitorAnalysisResult } from "@/modules/competitor/application/competitor-schema";
import type { CompetitorView } from "@/modules/competitor/application/dto";

export type CompetitorScraper = (url: string) => Promise<LandingTeardown | null>;
export type CompetitorAnalyzer = (
  teardown: LandingTeardown,
  name: string,
) => Promise<{ data: CompetitorAnalysisResult; model: string }>;

export interface CompetitorRepository {
  /** Find-or-create the competitor (unique per project+url). */
  upsert(ctx: RequestContext, args: { projectId: string; url: string; name: string }): Promise<{ id: string }>;
  saveSnapshot(
    ctx: RequestContext,
    competitorId: string,
    args: { title: string | null; content: unknown },
  ): Promise<{ id: string }>;
  createAnalysis(ctx: RequestContext, competitorId: string, snapshotId: string | null): Promise<{ id: string }>;
  completeAnalysis(
    ctx: RequestContext,
    analysisId: string,
    args: { result: CompetitorAnalysisResult; model: string },
  ): Promise<void>;
  failAnalysis(ctx: RequestContext, analysisId: string, error: string): Promise<void>;
  /** All competitors for a project, each with its latest (COMPLETED-preferred) analysis. */
  listForProject(ctx: RequestContext, projectId: string): Promise<CompetitorView[]>;
  delete(ctx: RequestContext, projectId: string, competitorId: string): Promise<void>;
}
