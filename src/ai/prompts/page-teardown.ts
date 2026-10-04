/**
 * Pass-1 "teardown analyst": reads the faithful outlines of top competitor
 * landing pages and distils a reusable conversion PLAYBOOK. Its output feeds
 * the landing generator (pass 2), so the page is modeled on what actually wins
 * in this market — not generic best practice.
 */
import { z } from "zod";

const strList = z.array(z.string().min(1)).max(12);

export const competitorPlaybookSchema = z.object({
  pages: z
    .array(
      z.object({
        source: z.string().min(1),
        framework: z.string().min(1), // AIDA / PAS / BAB / freeform
        sectionFlow: z.array(z.string().min(1)).max(18), // ordered section labels
        offer: z.string().nullish(), // pricing / discount / subscription structure
        proofTactics: strList,
        strongestHooks: strList,
      }),
    )
    .max(3),
  playbook: z.object({
    recommendedFlow: z.array(z.string().min(1)).min(3).max(18),
    offerStrategy: z.string().min(1),
    proofStrategy: strList,
    mustHaves: strList, // conversion elements common to the winners
    hooksToAdapt: strList, // angles worth adapting (not copying)
  }),
});
export type CompetitorPlaybook = z.infer<typeof competitorPlaybookSchema>;

const JSON_RULE = "Return ONLY a valid JSON object — no markdown fences, no commentary.";

export const TEARDOWN_SYSTEM = `You are a senior CRO (conversion-rate optimization) analyst.
You are given the faithful, in-order content outlines of one or more HIGH-PERFORMING competitor landing pages.
For EACH page, reverse-engineer what makes it convert:
- framework (AIDA / PAS / BAB, or a short label),
- sectionFlow: the ordered list of its sections (e.g. "Hero", "Offer/Pricing", "Benefits", "How it works", "3rd-party testing", "Comparison", "Reviews", "FAQ", "Sticky CTA"),
- offer: the exact offer mechanics (discount %, subscribe-&-save, free gifts, price anchoring, guarantee),
- proofTactics: how it builds trust (specific stats, testing/certifications, review counts, testimonials),
- strongestHooks: its sharpest copy lines (for inspiration only).

THEN synthesize ONE winning PLAYBOOK across the pages:
- recommendedFlow: the section order that the winners share,
- offerStrategy: the offer structure to use (be specific about anchoring + risk reversal),
- proofStrategy: the proof elements to include,
- mustHaves: conversion elements common to all winners,
- hooksToAdapt: angle ideas to adapt to a new product.

Be specific and concrete — quote real patterns you see, not vague advice. Do NOT invent pages that aren't shown.
${JSON_RULE}
Shape:
{
  "pages": [ { "source": string, "framework": string, "sectionFlow": string[], "offer": string, "proofTactics": string[], "strongestHooks": string[] } ],
  "playbook": { "recommendedFlow": string[], "offerStrategy": string, "proofStrategy": string[], "mustHaves": string[], "hooksToAdapt": string[] }
}`;

export function buildTeardownUser(pages: { source: string; outline: string }[]): string {
  const blocks = pages
    .map((p, i) => `PAGE ${i + 1} — ${p.source}\n<outline>\n${p.outline}\n</outline>`)
    .join("\n\n=====\n\n");
  return `Tear down these competitor landing pages and produce the playbook.\n\n${blocks}`;
}
