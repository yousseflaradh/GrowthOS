"use server";

/**
 * Generate a landing page from a project's latest product analysis, grounded in
 * the creative strategy (angles/hooks) and real customer voice when available.
 * Orchestrates analysis → creative → intel → landing at the delivery layer so
 * the landing module stays decoupled. Synchronous (one AI call), queue-ready.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { AppError } from "@/shared/errors/app-error";
import { captureServerEvent } from "@/lib/posthog";
import { projectService } from "@/modules/projects";
import { analysisService } from "@/modules/analysis";
import { creativeService } from "@/modules/creative";
import { intelService } from "@/modules/intel";
import { landingService, type PageVersionView, type SectionInput } from "@/modules/landing";
import { teardownLandingPage, type LandingTeardown } from "@/lib/scraper";
import { analyzeCompetitorPages, playbookToText } from "@/ai/competitor-teardown";
import { buildLifestyleImages } from "@/ai/images";
import { isRealComment } from "@/lib/text-filters";
import type { LandingInputs } from "@/ai/prompts/landing";

const OUTLINE_CAP = 3000; // chars of competitor copy fed per page

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Scrape competitor landing pages (ad destinations + any pasted URLs) into
 *  faithful, structured teardowns (top 3). */
async function scrapeReferences(rawUrls: (string | null | undefined)[]): Promise<LandingTeardown[]> {
  const urls = [
    ...new Set(rawUrls.filter((u): u is string => !!u && /^https?:\/\//i.test(u.trim())).map((u) => u.trim())),
  ].slice(0, 4);
  if (urls.length === 0) return [];
  // Hard cap per URL so one hung site can't stall generation — they run in
  // parallel, so the whole step is bounded by this cap, not the sum.
  const capped = (u: string) =>
    Promise.race<LandingTeardown | null>([
      teardownLandingPage(u),
      new Promise((resolve) => setTimeout(() => resolve(null), 14000)),
    ]);
  const results = await Promise.allSettled(urls.map(capped));
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((t): t is LandingTeardown => !!t && t.outline.length > 0)
    .slice(0, 3);
}

/** Raw-outline reference block — fallback when the pass-1 analyst is unavailable. */
function formatReference(t: LandingTeardown): string {
  const host = hostOf(t.url);
  return [
    `PAGE: ${t.title ?? host} (${host})`,
    t.offers.length ? `OFFER: ${t.offers.join(" · ")}` : "",
    t.ctas.length ? `CTAs: ${t.ctas.map((c) => `"${c}"`).join(" / ")}` : "",
    t.signals.length ? `CONVERSION ELEMENTS: ${t.signals.join(", ")}` : "",
    `STRUCTURE & COPY (in page order):\n${t.outline.slice(0, OUTLINE_CAP)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getLandingVersionAction(
  projectId: string,
  versionId: string,
): Promise<ActionResult<PageVersionView>> {
  return action(async () => {
    const ctx = await requireContext();
    const version = await landingService.getVersion(ctx, projectId, versionId);
    if (!version) throw AppError.notFound("Version not found.");
    return version;
  });
}

export async function deleteLandingVersionAction(
  projectId: string,
  versionId: string,
): Promise<ActionResult<null>> {
  return action(async () => {
    const ctx = await requireContext();
    await landingService.deleteVersion(ctx, projectId, versionId);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/landing`);
    return null;
  });
}

export async function saveLandingSectionsAction(
  projectId: string,
  versionId: string,
  sections: SectionInput[],
): Promise<ActionResult<PageVersionView>> {
  return action(async () => {
    const ctx = await requireContext();
    const version = await landingService.saveSections(ctx, projectId, versionId, sections);
    revalidatePath(`/projects/${projectId}/landing`);
    return version;
  });
}

export async function runLandingPageAction(
  projectId: string,
  referenceUrls: string[] = [],
  theme: string = "auto",
  aiImages: boolean = true,
  design: string = "auto",
): Promise<ActionResult<PageVersionView>> {
  return action(async () => {
    const ctx = await requireContext();

    const analysis = await analysisService.latest(ctx, projectId);
    if (!analysis || analysis.status !== "COMPLETED" || !analysis.result) {
      throw AppError.validation("Run a product analysis first — the landing page is built from it.");
    }

    const project = await projectService.getProject(ctx, projectId);
    // Optional grounding: proven angles/hooks (Phase 3) + real voice (intel).
    const [strategy, voice] = await Promise.all([
      creativeService.latest(ctx, projectId),
      intelService.overview(ctx, projectId),
    ]);

    // Pass 1 — scrape competitor pages (pasted URLs first, then ad destinations)
    // and run the CRO analyst over them. Best-effort: if the analyst is
    // unavailable, fall back to feeding the raw page outlines.
    const teardowns = await scrapeReferences([...referenceUrls, ...voice.ads.map((a) => a.landingUrl)]);
    let competitorPlaybook: string | undefined;
    let referencePages: string[] = [];
    if (teardowns.length) {
      const playbook = await analyzeCompetitorPages(
        teardowns.map((t) => ({ source: hostOf(t.url), outline: t.outline })),
      );
      if (playbook) competitorPlaybook = playbookToText(playbook);
      else referencePages = teardowns.map(formatReference);
    }

    const r = analysis.result;
    const inputs: LandingInputs = {
      productName: project.productName,
      productUrl: project.productUrl ?? undefined,
      avatarSummary: r.customerAvatar.summary,
      painPoints: r.painPoints,
      desires: r.desires,
      objections: r.objections,
      uspPoints: r.uspAnalysis.uniqueSellingPoints,
      differentiation: r.uspAnalysis.differentiation,
      buyingMotivations: r.buyingMotivations,
      emotionalTriggers: r.emotionalTriggers,
      logicalTriggers: r.logicalTriggers,
      topAngles: strategy?.angles
        .filter((a) => a.favorite)
        .concat(strategy.angles.filter((a) => !a.favorite))
        .slice(0, 10)
        .map((a) => `${a.headline} — ${a.description}`),
      topHooks: strategy?.hooks
        .filter((h) => h.favorite)
        .concat(strategy.hooks.filter((h) => !h.favorite))
        .slice(0, 15)
        .map((h) => h.text),
      customerComments: voice.comments.map((c) => c.text).filter(isRealComment),
      referencePages,
      competitorPlaybook,
    };

    // Real photos (scraped product + ad creative) keep the hero accurate; free
    // AI lifestyle shots fill the decorative bands/gallery where we have none.
    const realImages = [
      ...(analysis.snapshot?.images ?? []),
      ...voice.ads.map((a) => a.mediaUrl).filter((u): u is string => !!u && /^https?:\/\//i.test(u)),
    ];
    const lifestyle = aiImages
      ? await buildLifestyleImages({ productName: project.productName, avatarSummary: r.customerAvatar.summary })
      : [];
    // Real hero first (accurate product), then AI lifestyle for problem/features/
    // collage slots, then any remaining real images.
    const images = [realImages[0], ...lifestyle, ...realImages.slice(1)].filter(
      (u): u is string => typeof u === "string" && u.length > 0,
    );

    // Real customer voice for testimonials: scraped product reviews first, then
    // genuine pasted/scraped comments (dropping junk).
    const reviews = [
      ...(analysis.snapshot?.reviews ?? []).map((rv) => ({
        text: rv.text,
        author: rv.author ?? undefined,
        rating: rv.rating ?? undefined,
      })),
      ...voice.comments
        .filter((c) => isRealComment(c.text))
        .map((c) => ({ text: c.text, author: c.author ?? undefined, rating: undefined })),
    ];

    const version = await landingService.run(ctx, { projectId, inputs, images, theme, design, reviews });

    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "landing_page_generated",
      properties: {
        projectId,
        framework: version.framework,
        version: version.version,
        referencePages: referencePages.length,
        usedPlaybook: Boolean(competitorPlaybook),
      },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/landing`);
    return version;
  });
}
