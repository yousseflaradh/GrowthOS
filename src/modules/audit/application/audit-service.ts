/**
 * CRO Audit pipeline: scrape a live landing-page URL → AI CRO analysis →
 * persist scores/findings/recommendations. Synchronous (server action) like the
 * other phases; queue-ready.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import { looksBotBlocked } from "@/lib/scraper";
import type { AuditRunView, AuditSummary } from "@/modules/audit/application/dto";
import type { AuditRepository, AuditScraper, AuditAnalyzer } from "@/modules/audit/application/ports";

export interface AuditDeps {
  scrape: AuditScraper;
  analyze: AuditAnalyzer;
  repo: AuditRepository;
}

const isHttpUrl = (u: string) => /^https?:\/\/\S+\.\S+/i.test(u.trim());

export function createAuditService(deps: AuditDeps) {
  return {
    async run(ctx: RequestContext, projectId: string, url: string): Promise<AuditRunView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to run an audit.");
      const target = url.trim();
      if (!isHttpUrl(target)) throw AppError.validation("Enter a valid page URL (https://…).");

      const run = await deps.repo.create(ctx, { projectId, url: target });
      try {
        const scrape = await deps.scrape(target);
        if (!scrape || (!scrape.outline && scrape.headings.length === 0)) {
          throw AppError.validation("Couldn't read that page — it may be blocking bots or unreachable.");
        }
        if (looksBotBlocked(`${scrape.title ?? ""} ${scrape.outline.slice(0, 2000)}`)) {
          throw AppError.validation(
            "That site is protected by a bot wall (security checkpoint) — we can't read it reliably.",
          );
        }
        const { data, model } = await deps.analyze(scrape);
        return await deps.repo.complete(ctx, run.id, { result: data, model });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const message = err instanceof AppError ? err.message : `Audit failed: ${detail}`;
        await deps.repo.fail(ctx, run.id, message);
        throw err instanceof AppError ? err : new AppError("INTERNAL", message);
      }
    },

    latest(ctx: RequestContext, projectId: string): Promise<AuditRunView | null> {
      return deps.repo.latestForProject(ctx, projectId);
    },
    get(ctx: RequestContext, id: string): Promise<AuditRunView | null> {
      return deps.repo.get(ctx, id);
    },
    history(ctx: RequestContext, projectId: string): Promise<AuditSummary[]> {
      return deps.repo.history(ctx, projectId);
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
