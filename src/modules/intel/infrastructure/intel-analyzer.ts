/** Intel synthesis via the AI gateway (free Gemini / OpenRouter). */
import { generateJson } from "@/ai/gateway";
import { INTEL_SYSTEM, buildIntelUser, type IntelInputs } from "@/ai/prompts/intel";
import { intelReportSchema, type IntelReportResult } from "@/modules/intel/application/intel-schema";

export async function analyzeIntel(
  inputs: IntelInputs,
): Promise<{ data: IntelReportResult; model: string }> {
  return generateJson({
    system: INTEL_SYSTEM,
    user: buildIntelUser(inputs),
    schema: intelReportSchema,
    temperature: 0.5,
  });
}
