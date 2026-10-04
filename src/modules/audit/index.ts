/**
 * audit context — PUBLIC API + composition root.
 */
import { scrapeForAudit } from "@/lib/scraper";
import { createAuditService } from "./application/audit-service";
import { prismaAuditRepository } from "./infrastructure/prisma-audit-repository";
import { analyzeAudit } from "./infrastructure/openrouter-auditor";

export const auditService = createAuditService({
  scrape: scrapeForAudit,
  analyze: analyzeAudit,
  repo: prismaAuditRepository,
});

export type {
  AuditRunView,
  AuditSummary,
  ScoreView,
  FindingView,
  RecommendationView,
} from "./application/dto";
export type { AuditStatus, AuditCategory, AuditSeverity } from "./domain/audit-status";
export { AUDIT_CATEGORIES, CATEGORY_LABEL } from "./domain/audit-status";
