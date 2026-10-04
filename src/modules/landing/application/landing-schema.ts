/**
 * Structured shape of the AI landing-page output. One AI call returns the whole
 * page: the chosen copywriting framework plus the copy sections. Visual sections
 * (the image gallery, the hero image) are injected by the service from the
 * scraped product photos — the AI never invents image URLs.
 */
import { z } from "zod";

export const PAGE_FRAMEWORKS = ["AIDA", "PAS", "BAB"] as const;
export type PageFramework = (typeof PAGE_FRAMEWORKS)[number];

/**
 * Section types in canonical render order — modeled on proven DTC landers
 * (problem → proof → trust → testimonials → comparison → product → FAQ → close).
 * GALLERY is injected (not from the AI); every other type maps to a key on the
 * AI result via SECTION_KEY.
 */
export const SECTION_TYPES = [
  "HERO",
  "PROBLEM",
  "BENEFITS",
  "FEATURES",
  "SOCIAL_PROOF",
  "GUARANTEE",
  "TESTIMONIALS",
  "COMPARISON",
  "GALLERY",
  "FAQ",
  "CTA",
  "FORM",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

const titled = z.object({ title: z.string().min(1), description: z.string().min(1) });

// Optional fields tolerate the model emitting null (not just omitting the key).
// Plain `.nullish()` keeps zod input == output, so `z.ZodType<T>` inference in
// the gateway stays clean; render sites guard for null/undefined alike.
const optStr = z.string().nullish();
const optArr = <T extends z.ZodTypeAny>(item: T) => z.array(item).nullish();

/** Coerce "yes"/"no"/"✓"/etc. (common model output) into a real boolean. */
const boolish = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "yes", "y", "1", "✓", "✔", "✅"].includes(s)) return true;
    if (["false", "no", "n", "0", "✗", "✕", "❌", "-", ""].includes(s)) return false;
  }
  return v;
}, z.boolean());

export const heroSchema = z.object({
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  ctaLabel: z.string().min(1),
  supportingPoints: optArr(z.string().min(1)),
  /** Featured product image — set by the service from the scrape, not the AI. */
  image: optStr,
});

export const problemSchema = z.object({
  headline: z.string().min(1),
  body: z.string().min(1),
  painPoints: z.array(z.string().min(1)).min(1).max(8),
});

export const benefitsSchema = z.object({
  headline: z.string().min(1),
  items: z.array(titled).min(1).max(8),
});

export const featuresSchema = z.object({
  headline: z.string().min(1),
  items: z.array(titled).min(1).max(10),
});

export const comparisonSchema = z.object({
  headline: z.string().min(1),
  productLabel: z.string().min(1),
  alternativeLabel: z.string().min(1),
  rows: z
    .array(
      z.object({
        point: z.string().min(1),
        hasProduct: boolish,
        hasAlternative: boolish,
      }),
    )
    .min(2)
    .max(8),
});

export const socialProofSchema = z.object({
  headline: z.string().min(1),
  stats: optArr(z.object({ value: z.string().min(1), label: z.string().min(1) })),
  highlights: optArr(z.string().min(1)),
});

export const testimonialsSchema = z.object({
  headline: z.string().min(1),
  /** Set by the service when items are real scraped/pasted reviews (not AI). */
  verified: z.boolean().nullish(),
  items: z
    .array(
      z.object({
        quote: z.string().min(1),
        author: z.string().min(1),
        role: optStr,
      }),
    )
    .min(1)
    .max(8),
});

export const guaranteeSchema = z.object({
  headline: z.string().min(1),
  body: z.string().min(1),
  badge: z.string().min(1),
});

export const faqSchema = z.object({
  headline: z.string().min(1),
  items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1).max(10),
});

export const ctaSchema = z.object({
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  buttonLabel: z.string().min(1),
  urgency: optStr,
});

/** Lead-capture form. Fields are fixed (name/phone/email); AI writes the copy. */
export const formSchema = z.object({
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  buttonLabel: z.string().min(1),
  consent: optStr,
});

/** The copy returned by one AI call (visuals injected separately). */
export const landingPageSchema = z.object({
  framework: z.enum(PAGE_FRAMEWORKS),
  rationale: z.string().min(1),
  hero: heroSchema,
  problem: problemSchema,
  benefits: benefitsSchema,
  features: featuresSchema,
  comparison: comparisonSchema,
  socialProof: socialProofSchema,
  testimonials: testimonialsSchema,
  guarantee: guaranteeSchema,
  faq: faqSchema,
  cta: ctaSchema,
  form: formSchema,
});

export type LandingPageResult = z.infer<typeof landingPageSchema>;

export type HeroContent = z.infer<typeof heroSchema>;
export type ProblemContent = z.infer<typeof problemSchema>;
export type BenefitsContent = z.infer<typeof benefitsSchema>;
export type FeaturesContent = z.infer<typeof featuresSchema>;
export type ComparisonContent = z.infer<typeof comparisonSchema>;
export type SocialProofContent = z.infer<typeof socialProofSchema>;
export type TestimonialsContent = z.infer<typeof testimonialsSchema>;
export type GuaranteeContent = z.infer<typeof guaranteeSchema>;
export type FaqContent = z.infer<typeof faqSchema>;
export type CtaContent = z.infer<typeof ctaSchema>;
export type FormContent = z.infer<typeof formSchema>;

/** Image gallery (carousel) — injected from the scraped product photos. */
export type GalleryContent = { images: string[] };

/** AI-backed section types → their key on LandingPageResult. GALLERY excluded. */
export const SECTION_KEY: Record<
  Exclude<SectionType, "GALLERY">,
  keyof Omit<LandingPageResult, "framework" | "rationale">
> = {
  HERO: "hero",
  PROBLEM: "problem",
  BENEFITS: "benefits",
  FEATURES: "features",
  COMPARISON: "comparison",
  SOCIAL_PROOF: "socialProof",
  TESTIMONIALS: "testimonials",
  GUARANTEE: "guarantee",
  FAQ: "faq",
  CTA: "cta",
  FORM: "form",
};

export const SECTION_LABEL: Record<SectionType, string> = {
  HERO: "Hero",
  GALLERY: "Gallery",
  PROBLEM: "Problem",
  BENEFITS: "Benefits",
  FEATURES: "Features",
  COMPARISON: "Comparison",
  SOCIAL_PROOF: "Social Proof",
  TESTIMONIALS: "Testimonials",
  GUARANTEE: "Guarantee",
  FAQ: "FAQ",
  CTA: "Call to Action",
  FORM: "Lead Form",
};
