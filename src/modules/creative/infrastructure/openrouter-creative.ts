/**
 * Creative generators — each wraps the OpenRouter gateway with the right prompt
 * and output schema. Returns { data, model }.
 */
import { generateJson } from "@/ai/gateway";
import {
  PSYCHOLOGY_SYSTEM,
  buildPsychologyUser,
  ANGLES_SYSTEM,
  buildAnglesUser,
  HOOKS_SYSTEM,
  buildHooksUser,
  CONCEPTS_SYSTEM,
  buildConceptsUser,
  type CreativeInputs,
} from "@/ai/prompts/creative";
import {
  customerPsychologySchema,
  anglesSchema,
  hooksSchema,
  conceptsSchema,
} from "@/modules/creative/application/creative-schemas";

export function generatePsychology(i: CreativeInputs) {
  return generateJson({ system: PSYCHOLOGY_SYSTEM, user: buildPsychologyUser(i), schema: customerPsychologySchema });
}

export function generateAngles(i: CreativeInputs) {
  return generateJson({ system: ANGLES_SYSTEM, user: buildAnglesUser(i), schema: anglesSchema });
}

export function generateHooks(i: CreativeInputs) {
  // Slightly higher temperature for variety across 50+ hooks.
  return generateJson({ system: HOOKS_SYSTEM, user: buildHooksUser(i), schema: hooksSchema, temperature: 0.85 });
}

export function generateConcepts(i: CreativeInputs) {
  return generateJson({ system: CONCEPTS_SYSTEM, user: buildConceptsUser(i), schema: conceptsSchema, temperature: 0.8 });
}
