/**
 * Prompt for the Landing Page Audit Engine (Phase 6). Turns the scraped signals
 * of a live page into a structured CRO report (scores + findings + fixes).
 */
import type { AuditScrape } from "@/lib/scraper";

const JSON_RULE = "Return ONLY a valid JSON object — no markdown fences, no commentary.";

export const AUDIT_SYSTEM = `You are a senior CRO (conversion-rate optimization) expert auditing a LIVE landing page from its scraped content.
Score the page 0–100 overall, and 0–100 for each category: HEADLINE, CTA, TRUST, MOBILE.

What each category covers:
- HEADLINE: is the main headline clear, specific, benefit/outcome-led? One obvious value proposition? Good hierarchy (a single strong H1)?
- CTA: is there a clear primary call-to-action? Action+value wording (not "Submit")? Prominent and repeated? Low friction?
- TRUST: social proof, reviews/testimonials, ratings, guarantees, security/trust badges, specific (not vague) claims, risk reversal.
- MOBILE: mobile-friendliness (viewport meta present?), scannability, length, structure — would it work well on a phone?

For EACH category produce: a 0–100 score, a one-sentence summary, "findings" (concrete issues, each with severity HIGH/MEDIUM/LOW), and "recommendations" (specific, actionable fixes, each prioritized HIGH/MEDIUM/LOW).
Be specific and grounded ONLY in the provided data — do NOT invent elements that aren't shown. Where the data is thin, say so in a finding rather than assuming.
overallScore should reflect the weighted whole, not just an average.

${JSON_RULE}
Shape:
{
  "overallScore": number (0-100),
  "summary": string,
  "categories": [
    {
      "category": "HEADLINE" | "CTA" | "TRUST" | "MOBILE",
      "score": number (0-100),
      "summary": string,
      "findings": [ { "severity": "HIGH"|"MEDIUM"|"LOW", "title": string, "detail": string } ],
      "recommendations": [ { "priority": "HIGH"|"MEDIUM"|"LOW", "title": string, "detail": string } ]
    }
  ]
}
Return all four categories.`;

export function buildAuditUser(s: AuditScrape): string {
  const lines = [
    `URL: ${s.url}`,
    `PAGE TITLE: ${s.title ?? "(none)"}`,
    `H1 HEADLINES (${s.h1.length}): ${s.h1.length ? s.h1.join(" | ") : "(none found)"}`,
    `CALLS-TO-ACTION (${s.ctas.length}): ${s.ctas.length ? s.ctas.map((c) => `"${c}"`).join(", ") : "(none detected)"}`,
    `TRUST SIGNALS DETECTED: ${s.signals.length ? s.signals.join(", ") : "(none detected)"}`,
    `MOBILE VIEWPORT META: ${s.hasViewport ? "present" : "MISSING"}`,
    `WORD COUNT: ${s.wordCount} · IMAGES: ${s.imageCount} · FORMS: ${s.formCount}`,
    `\nPAGE STRUCTURE & COPY (in order):\n${s.outline.slice(0, 6000)}`,
  ];
  return `Audit this landing page for conversion.\n\n${lines.join("\n")}`;
}
