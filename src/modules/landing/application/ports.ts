import type { RequestContext } from "@/shared/application/request-context";
import type { LandingPageView, PageVersionView } from "@/modules/landing/application/dto";
import type { LandingPageResult, SectionType } from "@/modules/landing/application/landing-schema";

/** A section as edited in the builder (position is taken from array order). */
export interface SectionInput {
  type: SectionType;
  content: unknown;
}

export interface LandingRepository {
  /**
   * Persist a freshly generated page as a new version (auto-incrementing
   * `version` within the project's LandingPage) plus its 8 sections, in one
   * transaction. Creates the LandingPage row on first use. Returns the version.
   */
  saveVersion(
    ctx: RequestContext,
    args: { projectId: string; result: LandingPageResult; model: string; images: string[]; theme: string; design: string },
  ): Promise<PageVersionView>;

  /** The project's landing page with its latest version + version history. */
  forProject(ctx: RequestContext, projectId: string): Promise<LandingPageView | null>;

  /** A specific version (must belong to the project's landing page). */
  getVersion(ctx: RequestContext, projectId: string, versionId: string): Promise<PageVersionView | null>;

  /** Delete a version (cascades its sections); removes the empty page if it was the last. */
  deleteVersion(ctx: RequestContext, projectId: string, versionId: string): Promise<void>;

  /** Replace a version's sections with the builder's edited list (content + order). */
  replaceSections(
    ctx: RequestContext,
    projectId: string,
    versionId: string,
    sections: SectionInput[],
  ): Promise<PageVersionView>;
}
