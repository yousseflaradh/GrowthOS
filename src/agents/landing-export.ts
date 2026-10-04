/**
 * Materialize an agent run into a real landing page.
 *
 * The Landing agent emits a lean page; the full campaign run holds the rest
 * (psychology pains, copy value-props, competitor differentiators, objections).
 * This maps the WHOLE run into the Landing module's rich LandingPageResult so
 * one click turns the agents' work into an editable page in the builder — no
 * second AI call. Every required field has a safe fallback so the page always
 * renders; the user refines it in the builder.
 */
import type {
  ProductOut,
  PsychologyOut,
  CompetitorOut,
  CreativeOut,
  CopyOut,
  LandingOut,
} from "@/agents/schemas";
import {
  PAGE_FRAMEWORKS,
  type LandingPageResult,
  type PageFramework,
} from "@/modules/landing/application/landing-schema";

export interface CampaignRunResult {
  product?: ProductOut | null;
  psychology?: PsychologyOut | null;
  competitor?: CompetitorOut | null;
  creative?: CreativeOut | null;
  copy?: CopyOut | null;
  landing?: LandingOut | null;
}

const clamp = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const pick = (...vals: (string | undefined | null)[]) => vals.find((v) => v && v.trim())?.trim() ?? "";
const nonEmpty = (s: string | undefined | null, fb: string) => (s && s.trim() ? s.trim() : fb);
const take = (a: string[] | undefined | null, n: number) => (a ?? []).filter((x) => x && x.trim()).slice(0, n);
const titled = (s: string) => ({ title: clamp(s, 64), description: s });

export function buildLandingResultFromRun(run: CampaignRunResult, productName: string): LandingPageResult {
  const { product, psychology, competitor, creative, copy, landing } = run;

  const framework: PageFramework = (PAGE_FRAMEWORKS as readonly string[]).includes(landing?.framework ?? "")
    ? (landing!.framework as PageFramework)
    : "PAS";

  // Hero — the Landing agent's, backfilled from the copywriter.
  const heroHeadline = pick(landing?.hero?.headline, take(copy?.headlines, 1)[0], productName);
  const heroSub = pick(landing?.hero?.subhead, copy?.withoutHook, copy?.primaryText, product?.summary);
  const heroCta = pick(landing?.hero?.cta, copy?.cta, "Get started");
  const supporting = take(copy?.valueProps, 4);

  // Problem — from psychology + the unique mechanism.
  const pains = take(psychology?.pains, 8);
  const painPoints = pains.length ? pains : [nonEmpty(product?.coreProblem, "This problem is quietly costing you more than you think.")];

  // Benefits / Features — value props + product benefits.
  const benefitStrings = take(copy?.valueProps, 6).length ? take(copy?.valueProps, 6) : take(product?.keyBenefits, 6);
  const benefitItems = (benefitStrings.length ? benefitStrings : ["A better way to get the result you want."]).map(titled);
  const featureStrings = take(product?.keyBenefits, 6).length
    ? take(product?.keyBenefits, 6)
    : take(creative?.angles?.map((a) => a.name), 6);
  const featureItems = (featureStrings.length ? featureStrings : ["Built around a proprietary mechanism."]).map(titled);

  // Comparison — differentiators vs. the old way (needs ≥2 rows).
  const diffs = take(competitor?.differentiators, 6);
  const rowSource = diffs.length >= 2 ? diffs : [...diffs, ...take(product?.keyBenefits, 4)];
  const rows = (rowSource.length >= 2 ? rowSource : ["Solves the root cause", "No wasted spend on what doesn't work"]).map(
    (point) => ({ point, hasProduct: true, hasAlternative: false }),
  );

  // Testimonials — provisional (real reviews replace these in the service).
  const desires = take(psychology?.desires, 3);
  const testimonialItems = (desires.length ? desires : ["Finally something that actually worked for me."]).map((quote) => ({
    quote: clamp(quote, 240),
    author: "Verified buyer",
    role: null as string | null,
  }));

  // FAQ — objections answered with the discredit line / reassurance.
  const objections = take(psychology?.objections, 6);
  const faqItems = (objections.length ? objections : ["Will this work for me?"]).map((question) => ({
    question: clamp(question, 140),
    answer: pick(copy?.discreditLine, product?.uniqueMechanismSolution, "We've built this around the real root cause — reach out anytime and we'll help."),
  }));

  return {
    framework,
    rationale: nonEmpty(landing?.leadBelief, nonEmpty(creative?.coreMessage, "Assembled from the campaign agent run.")),
    hero: {
      headline: clamp(heroHeadline, 120),
      subheadline: nonEmpty(heroSub, "Discover the difference for yourself."),
      ctaLabel: clamp(heroCta, 40),
      supportingPoints: supporting.length ? supporting : null,
      image: null,
    },
    problem: {
      headline: nonEmpty(psychology?.avatar ? "If this sounds like you…" : "", "The real problem"),
      body: nonEmpty(product?.uniqueMechanismProblem, nonEmpty(product?.coreProblem, "Most solutions treat the symptom, not the cause.")),
      painPoints,
    },
    benefits: { headline: "What you get", items: benefitItems },
    features: { headline: "How it works", items: featureItems },
    comparison: {
      headline: "Why this is different",
      productLabel: clamp(productName, 40),
      alternativeLabel: "The old way",
      rows: rows.slice(0, 8),
    },
    socialProof: {
      headline: "Why people switch",
      stats: null,
      highlights: take(psychology?.buyingTriggers, 4).length ? take(psychology?.buyingTriggers, 4) : null,
    },
    testimonials: { headline: "What customers say", verified: null, items: testimonialItems },
    guarantee: {
      headline: "Try it risk-free",
      body: "If it's not right for you, you're covered. No hassle.",
      badge: "Money-back guarantee",
    },
    faq: { headline: "Common questions", items: faqItems },
    cta: {
      headline: nonEmpty(creative?.coreMessage, nonEmpty(landing?.hero?.headline, "Ready to get started?")),
      subheadline: nonEmpty(copy?.withoutHook, "Join the others who made the switch."),
      buttonLabel: clamp(pick(copy?.cta, heroCta, "Get started"), 40),
      urgency: null,
    },
    form: {
      headline: "Get started today",
      subheadline: "Enter your details and we'll take it from here.",
      buttonLabel: clamp(pick(copy?.cta, "Claim your offer"), 40),
      consent: null,
    },
  };
}
