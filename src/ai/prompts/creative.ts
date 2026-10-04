/**
 * Prompts for the Creative Strategy Engine (Phase 3). All four calls share the
 * same product/customer context built from the product analysis.
 */
import { ANGLE_CATEGORIES, HOOK_CATEGORIES } from "@/modules/creative/application/creative-schemas";

export interface CreativeInputs {
  productName: string;
  avatarSummary: string;
  demographics?: string[];
  psychographics?: string[];
  painPoints: string[];
  desires: string[];
  objections: string[];
  uspPoints: string[];
  differentiation: string;
  // Real customer voice gathered from the channels the product sells on.
  customerComments?: string[];
  competitorAds?: string[];
}

export function buildContext(i: CreativeInputs): string {
  const lines = [
    `PRODUCT: ${i.productName}`,
    `CUSTOMER AVATAR: ${i.avatarSummary}`,
    i.demographics?.length ? `DEMOGRAPHICS: ${i.demographics.join("; ")}` : "",
    i.psychographics?.length ? `PSYCHOGRAPHICS: ${i.psychographics.join("; ")}` : "",
    `PAIN POINTS:\n- ${i.painPoints.join("\n- ")}`,
    `DESIRES:\n- ${i.desires.join("\n- ")}`,
    `OBJECTIONS:\n- ${i.objections.join("\n- ")}`,
    `USP / DIFFERENTIATION: ${i.differentiation}`,
    i.uspPoints?.length ? `UNIQUE SELLING POINTS:\n- ${i.uspPoints.join("\n- ")}` : "",
    i.competitorAds?.length
      ? `COMPETITOR / MARKET ADS (for inspiration — do not copy):\n- ${i.competitorAds.slice(0, 20).join("\n- ")}`
      : "",
    i.customerComments?.length
      ? `REAL CUSTOMER COMMENTS (verbatim — mirror this exact language in hooks/angles):\n- ${i.customerComments
          .slice(0, 80)
          .join("\n- ")}`
      : "",
  ].filter(Boolean);
  return `<context>\n${lines.join("\n\n")}\n</context>`;
}

const JSON_RULE = "Return ONLY a valid JSON object — no markdown, no commentary.";

// ── 1. Customer Psychology ──
export const PSYCHOLOGY_SYSTEM = `You are a consumer psychologist and direct-response strategist.
From the product and customer context, produce deep buyer psychology.
${JSON_RULE}
Shape:
{ "emotionalTriggers": string[], "logicalTriggers": string[], "purchaseMotivations": string[], "trustDrivers": string[], "buyingBarriers": string[] }
Provide 5–8 specific items per array, grounded in the context.`;

export function buildPsychologyUser(i: CreativeInputs): string {
  return `Analyze the buyer psychology for this product.\n\n${buildContext(i)}`;
}

// ── 2. Marketing Angles ──
export const ANGLES_SYSTEM = `You are a senior performance-marketing strategist.
Generate AT LEAST 20 distinct marketing angles for the product, spread across these categories:
${ANGLE_CATEGORIES.join(", ")}.
Each angle has a punchy headline and a 1–2 sentence description of the angle.
${JSON_RULE}
Shape: { "angles": [ { "category": string (one of the categories above), "headline": string, "description": string } ] }`;

export function buildAnglesUser(i: CreativeInputs): string {
  return `Generate at least 20 marketing angles across all categories.\n\n${buildContext(i)}`;
}

// ── 3. Hooks ──
export const HOOKS_SYSTEM = `You are an elite ad copywriter.
Generate AT LEAST 50 scroll-stopping hooks (opening lines for ads/posts) for the product, spread across these categories:
${HOOK_CATEGORIES.join(", ")}.
Each hook is a single punchy line.
${JSON_RULE}
Shape: { "hooks": [ { "category": string (one of the categories above), "text": string } ] }`;

export function buildHooksUser(i: CreativeInputs): string {
  return `Generate at least 50 hooks across all categories.\n\n${buildContext(i)}`;
}

// ── 4. Creative Concepts ──
export const CONCEPTS_SYSTEM = `You are a creative director for ecommerce ads.
Generate creative concepts for the product in three formats:
- 10 STATIC ad concepts (image ads): title + visual/copy description.
- 10 VIDEO ad concepts: title + description of the shots/narrative.
- 10 UGC concepts (user-generated style): title + concept description + a "format" tag (e.g. "unboxing", "testimonial", "day-in-the-life", "before/after").
For EVERY concept, also provide 2–3 "hooks" — scroll-stopping opening lines/taglines written specifically FOR THAT concept (so the user gets the ad idea AND the exact copy to run with it).
${JSON_RULE}
Shape: { "static": [ { "title": string, "description": string, "hooks": string[] } ], "video": [ { "title": string, "description": string, "hooks": string[] } ], "ugc": [ { "title": string, "concept": string, "format": string, "hooks": string[] } ] }`;

export function buildConceptsUser(i: CreativeInputs): string {
  return `Generate 10 static, 10 video, and 10 UGC creative concepts.\n\n${buildContext(i)}`;
}
