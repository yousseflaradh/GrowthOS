/**
 * Product analysis pipeline: gather product content (scrape a URL or use manual
 * data) → snapshot it → run the AI analysis → persist. Pure orchestration over
 * injected dependencies, so it can run inline (server action, Phase 2) or be
 * moved onto a queue worker later with no change to this code.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import type { ScrapedProduct } from "@/lib/scraper";
import type { ProductContext } from "@/ai/prompts/product-analysis";
import type { ProductAnalysisResult } from "@/modules/analysis/application/analysis-schema";
import type { AnalysisView } from "@/modules/analysis/application/dto";
import type { AnalysisRepository } from "@/modules/analysis/application/ports";

export interface AnalysisDeps {
  scrape: (url: string) => Promise<ScrapedProduct>;
  analyze: (ctx: ProductContext) => Promise<{ result: ProductAnalysisResult; model: string }>;
  repo: AnalysisRepository;
}

export interface RunAnalysisInput {
  projectId: string;
  productName: string;
  mode: "url" | "manual";
  url?: string;
  description?: string;
  features?: string[];
  extraNotes?: string;
}

export function createAnalysisService(deps: AnalysisDeps) {
  return {
    async run(ctx: RequestContext, input: RunAnalysisInput): Promise<AnalysisView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to run analysis.");

      // 1) Gather product content.
      let scraped: ScrapedProduct | null = null;
      if (input.mode === "url") {
        if (!input.url) throw AppError.validation("A product URL is required.");
        scraped = await deps.scrape(input.url);
      }

      // 2) Persist an immutable snapshot of what we analyzed.
      const snapshot = await deps.repo.createSnapshot(ctx, input.projectId, {
        source: input.mode,
        sourceUrl: input.url ?? null,
        title: scraped?.title ?? null,
        description: scraped?.description ?? input.description ?? null,
        features: scraped?.features ?? input.features ?? [],
        images: scraped?.images ?? [],
        reviews: scraped?.reviews ?? [],
        contentHash: scraped?.contentHash ?? null,
      });

      // 3) Create the analysis record (PROCESSING).
      const analysis = await deps.repo.createAnalysis(ctx, {
        projectId: input.projectId,
        snapshotId: snapshot.id,
      });

      // 4) Run the AI and persist result / failure.
      try {
        const productContext: ProductContext = {
          productName: input.productName,
          title: scraped?.title,
          description: scraped?.description ?? input.description,
          features: scraped?.features ?? input.features,
          reviews: scraped?.reviews,
          extraNotes: input.extraNotes,
        };
        const { result, model } = await deps.analyze(productContext);
        return await deps.repo.completeAnalysis(ctx, analysis.id, { result, model });
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : "Analysis failed unexpectedly. Please try again.";
        await deps.repo.failAnalysis(ctx, analysis.id, message);
        throw err instanceof AppError ? err : new AppError("INTERNAL", message);
      }
    },

    latest(ctx: RequestContext, projectId: string): Promise<AnalysisView | null> {
      return deps.repo.latestForProject(ctx, projectId);
    },

    get(ctx: RequestContext, id: string): Promise<AnalysisView | null> {
      return deps.repo.getById(ctx, id);
    },
  };
}

export type AnalysisService = ReturnType<typeof createAnalysisService>;
