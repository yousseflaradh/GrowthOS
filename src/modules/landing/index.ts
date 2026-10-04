/**
 * landing context — PUBLIC API + composition root.
 */
import { createLandingService } from "./application/landing-service";
import { prismaLandingRepository } from "./infrastructure/prisma-landing-repository";
import { generateLandingPage } from "./infrastructure/openrouter-landing";

export const landingService = createLandingService({
  generateLandingPage,
  repo: prismaLandingRepository,
});

export type { LandingPageView, PageVersionView, SectionView, VersionSummary } from "./application/dto";
export type { SectionInput } from "./application/ports";
export {
  SECTION_TYPES,
  SECTION_LABEL,
  SECTION_KEY,
  PAGE_FRAMEWORKS,
} from "./application/landing-schema";
export { LANDING_THEMES, THEME_KEYS, getTheme, resolveTheme, type LandingTheme } from "./application/themes";
export { LANDING_DESIGNS, DESIGN_KEYS, resolveDesign, type LandingDesign } from "./application/designs";
export type {
  PageFramework,
  SectionType,
  LandingPageResult,
  HeroContent,
  ProblemContent,
  BenefitsContent,
  FeaturesContent,
  ComparisonContent,
  SocialProofContent,
  TestimonialsContent,
  GuaranteeContent,
  FaqContent,
  CtaContent,
  FormContent,
  GalleryContent,
} from "./application/landing-schema";
