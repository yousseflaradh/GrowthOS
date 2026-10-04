/**
 * Audit analyzer — wraps the AI gateway with the CRO audit prompt + schema.
 * Returns { data, model }.
 */
import { generateJson } from "@/ai/gateway";
import { AUDIT_SYSTEM, buildAuditUser } from "@/ai/prompts/audit";
import { auditResultSchema } from "@/modules/audit/application/audit-schema";
import type { AuditScrape } from "@/lib/scraper";

export function analyzeAudit(scrape: AuditScrape) {
  return generateJson({
    system: AUDIT_SYSTEM,
    user: buildAuditUser(scrape),
    schema: auditResultSchema,
    temperature: 0.4,
  });
}
