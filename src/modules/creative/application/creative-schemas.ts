/**
 * Structured shapes for the 4 creative-strategy AI calls. Arrays are wrapped in
 * an object (e.g. { angles: [...] }) — far more reliable for JSON output across
 * models than a bare top-level array.
 */
import { z } from "zod";

const strList = z.array(z.string().min(1)).max(40);

export const customerPsychologySchema = z.object({
  emotionalTriggers: strList,
  logicalTriggers: strList,
  purchaseMotivations: strList,
  trustDrivers: strList,
  buyingBarriers: strList,
});
export type CustomerPsychology = z.infer<typeof customerPsychologySchema>;

export const anglesSchema = z.object({
  angles: z
    .array(
      z.object({
        category: z.string().min(1),
        headline: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .min(1)
    .max(40),
});
export type AngleItem = z.infer<typeof anglesSchema>["angles"][number];

export const hooksSchema = z.object({
  hooks: z
    .array(z.object({ category: z.string().min(1), text: z.string().min(1) }))
    .min(1)
    .max(80),
});
export type HookItem = z.infer<typeof hooksSchema>["hooks"][number];

// Tolerant of weak-model output: a missing/null array defaults to [], and the
// UGC item accepts `concept` OR `description` (models mix the two up). `.default`
// is safe now that the AI gateway infers the schema's OUTPUT type.
// Each concept ships with the hooks/taglines to use with it — so the user gets
// ad ideas + the copy to run, not two disconnected lists.
const conceptHooks = z
  .array(z.string().min(1))
  .max(6)
  .nullish()
  .transform((v) => v ?? []);

const conceptItem = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  hooks: conceptHooks,
});
const ugcItem = z
  .object({
    title: z.string().min(1),
    concept: z.string().min(1).nullish(),
    description: z.string().min(1).nullish(),
    format: z.string().nullish(),
    hooks: conceptHooks,
  })
  .transform((u) => ({
    title: u.title,
    concept: u.concept ?? u.description ?? u.title,
    format: u.format ?? undefined,
    hooks: u.hooks,
  }));

export const conceptsSchema = z.object({
  static: z.array(conceptItem).max(20).nullish().transform((v) => v ?? []),
  video: z.array(conceptItem).max(20).nullish().transform((v) => v ?? []),
  ugc: z.array(ugcItem).max(20).nullish().transform((v) => v ?? []),
});
export type ConceptsResult = z.infer<typeof conceptsSchema>;

// Canonical categories (for grouping/labels in the UI).
export const ANGLE_CATEGORIES = [
  "Problem Solution",
  "Social Proof",
  "Authority",
  "Aspirational",
  "Comparison",
  "Cost Saving",
  "Time Saving",
  "Scarcity",
] as const;

export const HOOK_CATEGORIES = [
  "Curiosity",
  "Story",
  "Shock",
  "Authority",
  "Question",
  "Contrarian",
] as const;
