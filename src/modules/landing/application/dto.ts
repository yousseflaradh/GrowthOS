import type { PageFramework, SectionType, LandingPageResult } from "@/modules/landing/application/landing-schema";

/** One persisted section: its type, render order, and typed content blob. */
export interface SectionView {
  id: string;
  type: SectionType;
  position: number;
  content: unknown; // shape depends on `type`; narrowed by the renderer via SECTION_KEY.
}

/** A single generated version of the page, with its ordered sections. */
export interface PageVersionView {
  id: string;
  version: number;
  framework: PageFramework;
  rationale: string | null;
  /** Color-palette key (see themes.ts). */
  theme: string | null;
  /** Design-system key (layout/typography, see designs.ts). */
  design: string | null;
  model: string | null;
  sections: SectionView[];
  createdAt: string;
}

/** Lightweight entry for the version-history list. */
export interface VersionSummary {
  id: string;
  version: number;
  framework: PageFramework;
  createdAt: string;
}

/** The landing page for a project: its current (latest) version + history. */
export interface LandingPageView {
  id: string;
  projectId: string;
  current: PageVersionView | null;
  versions: VersionSummary[];
  createdAt: string;
  updatedAt: string;
}

/** Re-export the AI result type for the export/serialization layer. */
export type { LandingPageResult };
