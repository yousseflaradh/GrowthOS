/**
 * Analyzer adapter — turns product context into structured analysis via the
 * OpenRouter gateway, validated against productAnalysisResultSchema.
 */
import { generateJson } from "@/ai/gateway";
import {
  PRODUCT_ANALYSIS_SYSTEM,
  buildProductAnalysisUser,
  type ProductContext,
} from "@/ai/prompts/product-analysis";
import {
  productAnalysisResultSchema,
  type ProductAnalysisResult,
} from "@/modules/analysis/application/analysis-schema";

export async function analyze(
  ctx: ProductContext,
): Promise<{ result: ProductAnalysisResult; model: string }> {
  const { data, model } = await generateJson({
    system: PRODUCT_ANALYSIS_SYSTEM,
    user: buildProductAnalysisUser(ctx),
    schema: productAnalysisResultSchema,
  });
  return { result: data, model };
}
