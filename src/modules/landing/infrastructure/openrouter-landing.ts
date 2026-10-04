/**
 * Landing-page generator — wraps the AI gateway with the landing prompt and the
 * output schema. One call returns the full page. Returns { data, model }.
 */
import { generateJson } from "@/ai/gateway";
import { LANDING_SYSTEM, buildLandingUser, type LandingInputs } from "@/ai/prompts/landing";
import { landingPageSchema } from "@/modules/landing/application/landing-schema";

export function generateLandingPage(i: LandingInputs) {
  return generateJson({
    system: LANDING_SYSTEM,
    user: buildLandingUser(i),
    schema: landingPageSchema,
    temperature: 0.7,
  });
}
