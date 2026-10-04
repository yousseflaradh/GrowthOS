/**
 * Competitor Intelligence pipeline: scrape a competitor URL → snapshot →
 * AI competitive analysis (offer/pricing/creative/positioning/SWOT).
 * Synchronous (server action) like the other phases; queue-ready.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import { looksBotBlocked } from "@/lib/scraper";
import type { CompetitorView } from "@/modules/competitor/application/dto";
import type {
  CompetitorRepository,
  CompetitorScraper,
  CompetitorAnalyzer,
} from "@/modules/competitor/application/ports";

export interface CompetitorDeps {
  scrape: CompetitorScraper;
  analyze: CompetitorAnalyzer;
  repo: CompetitorRepository;
}

const isHttpUrl = (u: string) => /^https?:\/\/\S+\.\S+/i.test(u.trim());

function nameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0] ?? url;
  } catch {
    return url;
  }
}

export function createCompetitorService(deps: CompetitorDeps) {
  return {
    async run(ctx: RequestContext, projectId: string, url: string, name?: string): Promise<CompetitorView[]> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to analyze competitors.");
      const target = url.trim();
      if (!isHttpUrl(target)) throw AppError.validation("Enter a valid competitor URL (https://…).");
      const label = name?.trim() || nameFromUrl(target);

      const competitor = await deps.repo.upsert(ctx, { projectId, url: target, name: label });

      const teardown = await deps.scrape(target);
      if (!teardown || !teardown.outline) {
        throw AppError.validation("Couldn't read that page — it may be blocking bots or unreachable.");
      }
      if (looksBotBlocked(`${teardown.title ?? ""} ${teardown.outline.slice(0, 2000)}`)) {
        throw AppError.validation(
          "That site is protected by a bot wall (security checkpoint) — we can't read it. Try a different page of theirs, or a different competitor.",
        );
      }
      const snapshot = await deps.repo.saveSnapshot(ctx, competitor.id, {
        title: teardown.title ?? null,
        content: teardown,
      });

      const analysis = await deps.repo.createAnalysis(ctx, competitor.id, snapshot.id);
      try {
        const { data, model } = await deps.analyze(teardown, label);
        await deps.repo.completeAnalysis(ctx, analysis.id, { result: data, model });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const message = err instanceof AppError ? err.message : `Competitor analysis failed: ${detail}`;
        await deps.repo.failAnalysis(ctx, analysis.id, message);
        throw err instanceof AppError ? err : new AppError("INTERNAL", message);
      }

      return deps.repo.listForProject(ctx, projectId);
    },

    list(ctx: RequestContext, projectId: string): Promise<CompetitorView[]> {
      return deps.repo.listForProject(ctx, projectId);
    },

    async remove(ctx: RequestContext, projectId: string, competitorId: string): Promise<void> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to delete.");
      return deps.repo.delete(ctx, projectId, competitorId);
    },
  };
}

export type CompetitorService = ReturnType<typeof createCompetitorService>;
