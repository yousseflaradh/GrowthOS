/**
 * Landing Page pipeline. One AI call generates the full page (framework + 8
 * sections) from the product-analysis inputs; the result is stored as a new
 * version. Synchronous (server action) like the other phases; queue-ready.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import type { LandingInputs } from "@/ai/prompts/landing";
import type { LandingPageView, PageVersionView } from "@/modules/landing/application/dto";
import type { LandingRepository, SectionInput } from "@/modules/landing/application/ports";
import type { LandingPageResult } from "@/modules/landing/application/landing-schema";
import { resolveTheme } from "@/modules/landing/application/themes";
import { resolveDesign } from "@/modules/landing/application/designs";

type Generate = (i: LandingInputs) => Promise<{ data: LandingPageResult; model: string }>;

export interface LandingDeps {
  generateLandingPage: Generate;
  repo: LandingRepository;
}

export interface RealReview {
  text: string;
  author?: string;
  rating?: number;
}

export interface RunLandingInput {
  projectId: string;
  inputs: LandingInputs;
  /** Scraped product photos used for the hero image + gallery carousel. */
  images?: string[];
  /** Palette key, or "auto"/undefined to let us pick from the product. */
  theme?: string;
  /** Design-system key (layout), or "auto"/undefined to pick per product. */
  design?: string;
  /** Real scraped/pasted reviews — replace the AI testimonials when present. */
  reviews?: RealReview[];
}

export function createLandingService(deps: LandingDeps) {
  return {
    async run(ctx: RequestContext, input: RunLandingInput): Promise<PageVersionView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to generate a landing page.");
      const { data, model } = await deps.generateLandingPage(input.inputs);

      // Prefer REAL reviews over AI placeholders in the testimonials section.
      const reviews = (input.reviews ?? []).filter((rv) => rv.text && rv.text.trim().length >= 12).slice(0, 6);
      if (reviews.length) {
        data.testimonials = {
          ...data.testimonials,
          verified: true,
          items: reviews.map((rv) => ({
            quote: rv.text.trim().slice(0, 400),
            author: rv.author?.trim() || "Verified buyer",
            role: rv.rating ? "★".repeat(Math.max(1, Math.min(5, Math.round(rv.rating)))) : undefined,
          })),
        };
      }

      const theme = resolveTheme(input.theme, input.inputs.productName);
      const design = resolveDesign(input.design, input.inputs.productName);
      return deps.repo.saveVersion(ctx, {
        projectId: input.projectId,
        result: data,
        model,
        images: input.images ?? [],
        theme,
        design,
      });
    },

    /**
     * Persist an already-built page (e.g. materialized from an agent run) as a
     * new version — no AI call. Real reviews still replace placeholder
     * testimonials, matching the generate flow.
     */
    async createFromResult(
      ctx: RequestContext,
      args: { projectId: string; productName: string; result: LandingPageResult; model: string; theme?: string; design?: string; images?: string[]; reviews?: RealReview[] },
    ): Promise<PageVersionView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to create a landing page.");
      const data = args.result;

      const reviews = (args.reviews ?? []).filter((rv) => rv.text && rv.text.trim().length >= 12).slice(0, 6);
      if (reviews.length) {
        data.testimonials = {
          ...data.testimonials,
          verified: true,
          items: reviews.map((rv) => ({
            quote: rv.text.trim().slice(0, 400),
            author: rv.author?.trim() || "Verified buyer",
            role: rv.rating ? "★".repeat(Math.max(1, Math.min(5, Math.round(rv.rating)))) : undefined,
          })),
        };
      }

      const theme = resolveTheme(args.theme, args.productName);
      const design = resolveDesign(args.design, args.productName);
      return deps.repo.saveVersion(ctx, {
        projectId: args.projectId,
        result: data,
        model: args.model,
        images: args.images ?? [],
        theme,
        design,
      });
    },

    forProject(ctx: RequestContext, projectId: string): Promise<LandingPageView | null> {
      return deps.repo.forProject(ctx, projectId);
    },

    getVersion(ctx: RequestContext, projectId: string, versionId: string): Promise<PageVersionView | null> {
      return deps.repo.getVersion(ctx, projectId, versionId);
    },

    async deleteVersion(ctx: RequestContext, projectId: string, versionId: string): Promise<void> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to delete.");
      return deps.repo.deleteVersion(ctx, projectId, versionId);
    },

    async saveSections(
      ctx: RequestContext,
      projectId: string,
      versionId: string,
      sections: SectionInput[],
    ): Promise<PageVersionView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to edit.");
      return deps.repo.replaceSections(ctx, projectId, versionId, sections);
    },
  };
}

export type LandingService = ReturnType<typeof createLandingService>;
