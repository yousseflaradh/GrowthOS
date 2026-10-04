/**
 * Structured shape of the AI CRO audit. One call returns the overall score, a
 * summary, and a per-category breakdown (score + findings + recommendations).
 */
import { z } from "zod";

/** Tolerant 0–100 integer (models sometimes return strings or out-of-range). */
const score = z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n || 0))));
const severity = z.enum(["HIGH", "MEDIUM", "LOW"]);
const category = z.enum(["HEADLINE", "CTA", "TRUST", "MOBILE"]);

const findingSchema = z.object({
  severity,
  title: z.string().min(1),
  detail: z.string().min(1),
});
const recommendationSchema = z.object({
  priority: severity,
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const auditResultSchema = z.object({
  overallScore: score,
  summary: z.string().min(1),
  categories: z
    .array(
      z.object({
        category,
        score,
        summary: z.string().min(1),
        findings: z.array(findingSchema).max(8).nullish().transform((v) => v ?? []),
        recommendations: z.array(recommendationSchema).max(8).nullish().transform((v) => v ?? []),
      }),
    )
    .min(1)
    .max(6),
});

export type AuditResult = z.infer<typeof auditResultSchema>;
