/**
 * Prompts for assisted product-input generation (manual mode):
 * - description from a product photo (vision)
 * - key features from a photo and/or description
 */

export const DESCRIPTION_SYSTEM = `You are an expert ecommerce copywriter.
Look ONLY at the product image and write a concise, benefit-driven product description of 2–4 sentences.
Describe the product that is actually shown in the image.
Do NOT invent, assume, or state a brand name — refer to the product by what it is (e.g. "these nasal strips", "this espresso maker").
If the brand name is clearly legible on the packaging in the image, you may use it; otherwise stay generic.
Return ONLY the description text — no preamble, no quotes, no markdown.`;

export function buildDescriptionUser(): string {
  return `Write a product description for the product shown in the image.`;
}

export const FEATURES_SYSTEM = `You are an ecommerce product strategist.
Based on the product image and/or description provided, list the key features and benefits.
Return ONLY a JSON array of 5–8 short strings (each a single feature/benefit, no numbering). No markdown.`;

export function buildFeaturesUser(description?: string): string {
  const base = "List the key features and benefits of this product as a JSON array of short strings.";
  return description && description.trim()
    ? `${base}\n\nPRODUCT DESCRIPTION:\n${description.trim()}`
    : base;
}
