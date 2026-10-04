export type AuditStatus = "PROCESSING" | "COMPLETED" | "FAILED";
export type AuditCategory = "HEADLINE" | "CTA" | "TRUST" | "MOBILE";
export type AuditSeverity = "HIGH" | "MEDIUM" | "LOW";

export const AUDIT_CATEGORIES: AuditCategory[] = ["HEADLINE", "CTA", "TRUST", "MOBILE"];
export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  HEADLINE: "Headline",
  CTA: "Call to Action",
  TRUST: "Trust Signals",
  MOBILE: "Mobile UX",
};
