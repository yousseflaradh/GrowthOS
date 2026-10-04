/**
 * creative context — PUBLIC API + composition root.
 */
import { createCreativeService } from "./application/creative-service";
import { prismaCreativeRepository } from "./infrastructure/prisma-creative-repository";
import {
  generatePsychology,
  generateAngles,
  generateHooks,
  generateConcepts,
} from "./infrastructure/openrouter-creative";

export const creativeService = createCreativeService({
  generatePsychology,
  generateAngles,
  generateHooks,
  generateConcepts,
  repo: prismaCreativeRepository,
});

export type {
  CreativeStrategyView,
  ConceptView,
  AngleView,
  HookView,
  UgcConceptView,
  CreativeItemKind,
} from "./application/dto";
export type { CreativeStatus } from "./domain/creative-status";
export type { CustomerPsychology, AngleItem, HookItem } from "./application/creative-schemas";
export { ANGLE_CATEGORIES, HOOK_CATEGORIES } from "./application/creative-schemas";
