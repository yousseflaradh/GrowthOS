import type { RequestContext } from "@/shared/application/request-context";
import type { AuditScrape } from "@/lib/scraper";
import type { AuditResult } from "@/modules/audit/application/audit-schema";
import type { AuditRunView, AuditSummary } from "@/modules/audit/application/dto";

export type AuditScraper = (url: string) => Promise<AuditScrape | null>;
export type AuditAnalyzer = (scrape: AuditScrape) => Promise<{ data: AuditResult; model: string }>;

export interface AuditRepository {
  create(ctx: RequestContext, args: { projectId: string; url: string }): Promise<{ id: string }>;
  complete(ctx: RequestContext, id: string, args: { result: AuditResult; model: string }): Promise<AuditRunView>;
  fail(ctx: RequestContext, id: string, error: string): Promise<void>;
  get(ctx: RequestContext, id: string): Promise<AuditRunView | null>;
  latestForProject(ctx: RequestContext, projectId: string): Promise<AuditRunView | null>;
  history(ctx: RequestContext, projectId: string): Promise<AuditSummary[]>;
}
