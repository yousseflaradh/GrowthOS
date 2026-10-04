/**
 * Market & Comment Intelligence service. Ingests competitor ads + customer
 * comments (manual import or Apify auto-fetch) and synthesizes them with AI
 * into an actionable intel report. Pure orchestration over injected deps.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import type { IntelInputs } from "@/ai/prompts/intel";
import type { IntelReportResult } from "@/modules/intel/application/intel-schema";
import type { IntelReportView, IntelOverview } from "@/modules/intel/application/dto";
import type {
  IntelRepository,
  AdInput,
  CommentInput,
  AdSourceProvider,
  FetchQuery,
} from "@/modules/intel/application/ports";

export interface IntelDeps {
  repo: IntelRepository;
  analyze: (inputs: IntelInputs) => Promise<{ data: IntelReportResult; model: string }>;
  provider: AdSourceProvider;
}

export function createIntelService(deps: IntelDeps) {
  return {
    providerAvailable: deps.provider.available,

    async importAds(ctx: RequestContext, projectId: string, ads: AdInput[]): Promise<number> {
      if (!can.edit(ctx)) throw AppError.forbidden();
      if (ads.length === 0) return 0;
      return deps.repo.addAds(ctx, projectId, ads);
    },

    async importComments(ctx: RequestContext, projectId: string, comments: CommentInput[]): Promise<number> {
      if (!can.edit(ctx)) throw AppError.forbidden();
      if (comments.length === 0) return 0;
      return deps.repo.addComments(ctx, projectId, comments);
    },

    async fetchFromProvider(ctx: RequestContext, projectId: string, query: FetchQuery): Promise<{ ads: number; comments: number }> {
      if (!can.edit(ctx)) throw AppError.forbidden();
      if (!deps.provider.available) {
        throw AppError.validation("Automated scraping isn't configured. Add APIFY_TOKEN to .env, or paste ads/comments manually.");
      }
      const { ads, comments } = await deps.provider.fetch(query);
      const [a, c] = await Promise.all([
        ads.length ? deps.repo.addAds(ctx, projectId, ads) : Promise.resolve(0),
        comments.length ? deps.repo.addComments(ctx, projectId, comments) : Promise.resolve(0),
      ]);
      return { ads: a, comments: c };
    },

    async generateReport(ctx: RequestContext, projectId: string, productName: string): Promise<IntelReportView> {
      if (!can.edit(ctx)) throw AppError.forbidden();
      const [ads, comments] = await Promise.all([
        deps.repo.listAds(ctx, projectId),
        deps.repo.listComments(ctx, projectId),
      ]);
      if (ads.length === 0 && comments.length === 0) {
        throw AppError.validation("Add some competitor ads or customer comments first.");
      }

      const report = await deps.repo.createReport(ctx, projectId);
      try {
        const { data, model } = await deps.analyze({
          productName,
          ads: ads.map((a) => ({ advertiser: a.advertiser, adText: a.adText })),
          comments: comments.map((c) => ({ text: c.text })),
        });
        return await deps.repo.completeReport(ctx, report.id, { result: data, model });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const message = err instanceof AppError ? err.message : `Intel synthesis failed: ${detail}`;
        await deps.repo.failReport(ctx, report.id, message);
        throw err instanceof AppError ? err : new AppError("INTERNAL", message);
      }
    },

    async overview(ctx: RequestContext, projectId: string): Promise<IntelOverview> {
      const [ads, comments, report] = await Promise.all([
        deps.repo.listAds(ctx, projectId),
        deps.repo.listComments(ctx, projectId),
        deps.repo.latestReport(ctx, projectId),
      ]);
      return { ads, comments, report };
    },
  };
}

export type IntelService = ReturnType<typeof createIntelService>;
