/**
 * Focused output schemas for each agent node. Each agent consumes upstream state
 * + recalled memory and emits one tight structured artifact.
 *
 * The fields encode the direct-response methodology the agents are prompted with
 * (see nodes.ts): Unique Mechanism, Necessary Beliefs, the winning Message,
 * direct/indirect angles, and the "without"/discredit copy laws. Tolerant of
 * nullish arrays (weak free models) via a shared list transform.
 */
import { z } from "zod";

const list = z
  .array(z.string().min(1))
  .nullish()
  .transform((v) => v ?? []);

const str = z
  .string()
  .nullish()
  .transform((v) => v ?? "");

export const productSchema = z.object({
  summary: z.string(),
  category: str,
  coreProblem: str,
  idealCustomer: str,
  // Unique Mechanism — the spine of the whole methodology.
  uniqueMechanismProblem: str, // the root cause they DON'T know about
  uniqueMechanismSolution: str, // why THIS product fixes it at that root
  keyBenefits: list,
});

export const researchSchema = z.object({
  marketSummary: z.string(),
  awarenessLevel: str, // unaware | problem-aware | solution-aware | product-aware | most-aware
  purpleOcean: str, // hyper-specific demographic to own inside a proven market
  trends: list,
  opportunities: list,
  risks: list,
});

export const psychologySchema = z.object({
  avatar: z.string(),
  pains: list, // first-person, emotional, voice-of-customer
  desires: list,
  objections: list,
  buyingTriggers: list,
  // The few beliefs a prospect MUST hold before buying ("I believe that…").
  necessaryBeliefs: list,
});

export const competitorSchema = z.object({
  landscapeSummary: z.string(),
  players: z
    .array(
      z.object({
        name: z.string(),
        angle: str,
        psychologicalLever: str, // pain / fear / status / curiosity / authority…
      }),
    )
    .nullish()
    .transform((v) => v ?? []),
  swipeableAngles: list, // proven structures worth adapting
  gaps: list, // openings rivals leave uncovered
  differentiators: list,
});

export const creativeSchema = z.object({
  // Chase the winning MESSAGE, not a single ad — the reusable core idea.
  coreMessage: z.string(),
  angles: z
    .array(
      z.object({
        name: z.string(),
        bigIdea: str,
        type: str, // "direct" | "indirect"
      }),
    )
    .nullish()
    .transform((v) => v ?? []),
  hooks: list, // open-loop / specificity / mechanism-framed scroll-stoppers
});

export const copySchema = z.object({
  headlines: list, // direct-response headlines
  withoutHook: str, // "[outcome] WITHOUT [hated alternative]"
  discreditLine: str, // acknowledges the failed alternative, pivots to the mechanism
  primaryText: z.string(),
  cta: z.string().nullish().transform((v) => v ?? "Get started"),
  valueProps: list,
});

export const landingSchema = z.object({
  framework: z.string().nullish().transform((v) => v ?? "AIDA"),
  leadBelief: str, // the ONE belief the page must install before the offer
  hero: z.object({
    headline: z.string(),
    subhead: str,
    cta: z.string().nullish().transform((v) => v ?? "Get started"),
  }),
  sections: z
    .array(
      z.object({
        type: z.string(),
        headline: z.string(),
        body: str,
      }),
    )
    .nullish()
    .transform((v) => v ?? []),
});

export const auditSchema = z.object({
  score: z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n)))),
  // Pass/fail against the specific DR frameworks the pipeline is built on.
  frameworkChecks: z
    .array(
      z.object({
        criterion: z.string(),
        pass: z.preprocess((v) => (typeof v === "string" ? /^(true|yes|pass)$/i.test(v) : v), z.boolean().catch(false)),
        note: str,
      }),
    )
    .nullish()
    .transform((v) => v ?? []),
  strengths: list,
  weaknesses: list,
  fixes: z
    .array(
      z.object({
        priority: z.string().nullish().transform((v) => v ?? "MEDIUM"),
        fix: z.string(),
      }),
    )
    .nullish()
    .transform((v) => v ?? []),
});

export type ProductOut = z.infer<typeof productSchema>;
export type ResearchOut = z.infer<typeof researchSchema>;
export type PsychologyOut = z.infer<typeof psychologySchema>;
export type CompetitorOut = z.infer<typeof competitorSchema>;
export type CreativeOut = z.infer<typeof creativeSchema>;
export type CopyOut = z.infer<typeof copySchema>;
export type LandingOut = z.infer<typeof landingSchema>;
export type AuditOut = z.infer<typeof auditSchema>;

/** The eight agents, in pipeline order. */
export const AGENT_ORDER = [
  "product",
  "research",
  "psychology",
  "competitor",
  "creative",
  "copywriter",
  "landing",
  "audit",
] as const;
export type AgentName = (typeof AGENT_ORDER)[number];
