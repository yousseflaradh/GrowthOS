/**
 * Structured shape of the AI product analysis. Used to validate the model's
 * JSON output and to type the stored result. The 8 sections map 1:1 to the
 * Phase 2 deliverable.
 */
import { z } from "zod";

const strList = z.array(z.string().min(1)).max(20);

export const productAnalysisResultSchema = z.object({
  customerAvatar: z.object({
    summary: z.string(),
    demographics: strList,
    psychographics: strList,
  }),
  painPoints: strList,
  desires: strList,
  objections: strList,
  uspAnalysis: z.object({
    uniqueSellingPoints: strList,
    differentiation: z.string(),
  }),
  buyingMotivations: strList,
  emotionalTriggers: strList,
  logicalTriggers: strList,
});

export type ProductAnalysisResult = z.infer<typeof productAnalysisResultSchema>;
