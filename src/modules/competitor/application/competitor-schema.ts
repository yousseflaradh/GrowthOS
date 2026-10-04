/**
 * Structured shape of the AI competitive analysis. Tolerant of weak-model
 * output: optional arrays default to [], strings coerced where sensible.
 */
import { z } from "zod";

const strList = z
  .array(z.string().min(1))
  .max(10)
  .nullish()
  .transform((v) => v ?? []);

export const competitorAnalysisResultSchema = z.object({
  summary: z.string().min(1),
  offer: z.object({
    summary: z.string().min(1),
    coreOffer: z.string().min(1),
    guarantees: strList,
    bonuses: strList,
  }),
  pricing: z.object({
    summary: z.string().min(1),
    pricePoints: strList,
    strategy: z.string().min(1),
  }),
  creative: z.object({
    summary: z.string().min(1),
    tone: z.string().min(1),
    angles: strList,
    topHooks: strList,
  }),
  positioning: z.object({
    summary: z.string().min(1),
    targetAudience: z.string().min(1),
    valueProposition: z.string().min(1),
    differentiation: z.string().min(1),
  }),
  swot: z.object({
    strengths: strList,
    weaknesses: strList,
    opportunities: strList,
    threats: strList,
  }),
});

export type CompetitorAnalysisResult = z.infer<typeof competitorAnalysisResultSchema>;
