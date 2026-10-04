/**
 * Prompt for the Landing Page Generation Engine (Phase 4). One call returns the
 * whole page: the AI picks the best copywriting framework (AIDA / PAS / BAB)
 * for the product, then writes all 8 sections grounded in the product analysis
 * and (when present) the creative strategy.
 */
export interface LandingInputs {
  productName: string;
  productUrl?: string;
  avatarSummary: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  uspPoints: string[];
  differentiation: string;
  buyingMotivations?: string[];
  emotionalTriggers?: string[];
  logicalTriggers?: string[];
  // Optional grounding from the creative strategy (Phase 3).
  topAngles?: string[];
  topHooks?: string[];
  // Optional real customer voice (Phase 4 intel).
  customerComments?: string[];
  // Structural teardowns of the landing pages that winning competitor ads send
  // traffic to — proven structure/offers in THIS market to emulate.
  referencePages?: string[];
  // Pass-1 CRO playbook distilled from those competitor pages (preferred input).
  competitorPlaybook?: string;
}

function buildContext(i: LandingInputs): string {
  const lines = [
    `PRODUCT: ${i.productName}`,
    i.productUrl ? `URL: ${i.productUrl}` : "",
    `CUSTOMER AVATAR: ${i.avatarSummary}`,
    `PAIN POINTS:\n- ${i.painPoints.join("\n- ")}`,
    `DESIRES:\n- ${i.desires.join("\n- ")}`,
    `OBJECTIONS (address these in copy / FAQ):\n- ${i.objections.join("\n- ")}`,
    `UNIQUE SELLING POINTS:\n- ${i.uspPoints.join("\n- ")}`,
    `DIFFERENTIATION: ${i.differentiation}`,
    i.buyingMotivations?.length ? `BUYING MOTIVATIONS:\n- ${i.buyingMotivations.join("\n- ")}` : "",
    i.emotionalTriggers?.length ? `EMOTIONAL TRIGGERS:\n- ${i.emotionalTriggers.join("\n- ")}` : "",
    i.logicalTriggers?.length ? `LOGICAL TRIGGERS:\n- ${i.logicalTriggers.join("\n- ")}` : "",
    i.topAngles?.length ? `PROVEN MARKETING ANGLES (lean on these):\n- ${i.topAngles.slice(0, 10).join("\n- ")}` : "",
    i.topHooks?.length ? `PROVEN HOOKS (reuse the strongest in the hero):\n- ${i.topHooks.slice(0, 15).join("\n- ")}` : "",
    i.customerComments?.length
      ? `REAL CUSTOMER VOICE (verbatim — mirror this language):\n- ${i.customerComments.slice(0, 40).join("\n- ")}`
      : "",
    i.competitorPlaybook
      ? `WINNING-PAGE PLAYBOOK — distilled from a CRO teardown of the top competitor pages in THIS market. Follow this section flow, offer strategy, and proof tactics; adapt every element to OUR product and rewrite all copy in our own voice:\n${i.competitorPlaybook}`
      : "",
    i.referencePages?.length
      ? `WINNING COMPETITOR LANDING PAGES — real, high-performing pages in THIS market (the destinations of top long-running ads and/or references the user provided). Study each one's section ORDER, OFFER mechanics, PROOF tactics, and COPY patterns, then adapt the winning structure and offer logic to OUR product. Rewrite every line in our own voice — NEVER copy their wording, brand names, or specific claims:\n\n${i.referencePages
          .slice(0, 3)
          .join("\n\n---\n\n")}`
      : "",
  ].filter(Boolean);
  return `<context>\n${lines.join("\n\n")}\n</context>`;
}

const JSON_RULE = "Return ONLY a valid JSON object — no markdown fences, no commentary.";

export const LANDING_SYSTEM = `You are a world-class direct-response copywriter and conversion strategist.
Write a complete, high-converting product landing page.

FIRST, choose the single best copywriting framework for THIS product and audience:
- AIDA (Attention → Interest → Desire → Action): best for impulse / desire-driven products.
- PAS (Problem → Agitate → Solution): best when a strong, painful problem drives the purchase.
- BAB (Before → After → Bridge): best for transformation / outcome-driven products.
Set "framework" to your choice and explain it in one sentence in "rationale".
Then write ALL sections so the page reads as one coherent narrative in that framework.

HIGH-CONVERTING PLAYBOOK — distilled from award-winning DTC landing pages. Apply per section:
- HERO: lead with the single biggest outcome or a pattern-interrupt question (e.g. "What if you could ___ in under 30 seconds?"). Subheadline names the mechanism + who it's for in one line. ctaLabel is an action+value phrase ("Build my box", "Start my plan") — never "Submit"/"Sign up". supportingPoints = 3–4 quick trust badges (free shipping, money-back, tested, made in X).
- PROBLEM: name the painful status quo and the cost of doing nothing. Make it specific and visceral; lead the body with a believable stat-style framing when plausible (e.g. "Most people only ___"). painPoints are sharp, relatable, one line each.
- BENEFITS: outcome-led — describe the better life/result, not the spec. Title = the benefit; description = one vivid sentence of proof or mechanism.
- FEATURES: the "how it works" that makes the benefits believable — concrete, specific mechanisms (ingredients, process, tech). No vague adjectives.
- SOCIAL_PROOF: hard, scannable numbers (customers served, average rating, % who saw a result) + credibility markers (tested, certified, dietitian-approved). Stats should feel earned, not hypey.
- TESTIMONIALS: specific and results-focused ("My ___ went from ___ to ___"), in the customer's own voice, from relatable personas. Avoid generic "Great product!".
- COMPARISON: you vs. the old way the customer uses today. Rows are the buying criteria where you win; include a price/value-perception row. Honest marks (you win most, the alternative wins one or two).
- GUARANTEE: reverse the risk boldly and specifically; confident, warm tone; concrete badge ("30-Day Money-Back Guarantee").
- FAQ: answer the REAL objections that block the sale — price/worth-it, how it works, safety/side-effects, time-to-results, shipping, returns. Answer plainly, then reframe to a benefit.
- CTA: restate the core promise in fresh words + add genuine urgency (limited offer, today's bonus). One unmistakable action.

Rules:
- Ground every claim in the provided context. Do NOT invent specific numbers, prices, or fake brand names.
- For SOCIAL_PROOF stats and TESTIMONIALS, write realistic but clearly illustrative placeholder content the user can later replace; keep authors generic (e.g. "Verified buyer", first name + initial). Never fabricate a real person or company.
- COMPARISON: contrast the product against the common alternative/old way the customer uses today (e.g. "Ordinary multivitamins"). Each row is a buying criterion where the product wins; set hasProduct/hasAlternative honestly (the product should win most rows, the alternative a few).
- GUARANTEE: a confident risk-reversal (e.g. money-back guarantee) with a short badge label like "30-Day Money-Back Guarantee" — only claim a guarantee that is plausible for this product; keep it generic if unsure.
- FORM: the lead-capture form copy. Fields are FIXED (first name, last name, phone, email) — do NOT list fields; just write a compelling headline, a one-line subheadline (the incentive to submit, e.g. unlock the offer / claim the discount), the submit buttonLabel, and a short reassuring consent line (e.g. "No spam. Unsubscribe anytime.").
- Mirror real customer language where provided. Address objections directly in the FAQ.
- Punchy, benefit-led, scannable copy. No fluff.

${JSON_RULE}
Shape:
{
  "framework": "AIDA" | "PAS" | "BAB",
  "rationale": string,
  "hero": { "headline": string, "subheadline": string, "ctaLabel": string, "supportingPoints": string[] },
  "problem": { "headline": string, "body": string, "painPoints": string[] },
  "benefits": { "headline": string, "items": [ { "title": string, "description": string } ] },
  "features": { "headline": string, "items": [ { "title": string, "description": string } ] },
  "comparison": { "headline": string, "productLabel": string, "alternativeLabel": string, "rows": [ { "point": string, "hasProduct": boolean, "hasAlternative": boolean } ] },
  "socialProof": { "headline": string, "stats": [ { "value": string, "label": string } ], "highlights": string[] },
  "testimonials": { "headline": string, "items": [ { "quote": string, "author": string, "role": string } ] },
  "guarantee": { "headline": string, "body": string, "badge": string },
  "faq": { "headline": string, "items": [ { "question": string, "answer": string } ] },
  "cta": { "headline": string, "subheadline": string, "buttonLabel": string, "urgency": string },
  "form": { "headline": string, "subheadline": string, "buttonLabel": string, "consent": string }
}
Every top-level key above is REQUIRED — include all of them, especially "form".
Provide 3–6 benefits, 3–6 features, 4–6 comparison rows, 3–5 testimonials, and 4–8 FAQ items.`;

export function buildLandingUser(i: LandingInputs): string {
  return `Write the full landing page for this product. Pick the framework, then write all 8 sections.\n\n${buildContext(
    i,
  )}`;
}
