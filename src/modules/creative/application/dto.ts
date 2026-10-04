import type { CreativeStatus } from "@/modules/creative/domain/creative-status";
import type { CustomerPsychology } from "@/modules/creative/application/creative-schemas";

export interface ConceptView {
  title: string;
  description: string;
  hooks: string[];
}

/** Persisted, curatable items carry an id + favorite flag for the UI. */
export interface AngleView {
  id: string;
  category: string;
  headline: string;
  description: string;
  favorite: boolean;
}
export interface HookView {
  id: string;
  category: string;
  text: string;
  favorite: boolean;
}
export interface UgcConceptView {
  id: string;
  title: string;
  concept: string;
  format?: string;
  hooks: string[];
  favorite: boolean;
}

export interface CreativeStrategyView {
  id: string;
  projectId: string;
  status: CreativeStatus;
  model: string | null;
  customerPsychology: CustomerPsychology | null;
  angles: AngleView[];
  hooks: HookView[];
  staticConcepts: ConceptView[];
  videoConcepts: ConceptView[];
  ugcConcepts: UgcConceptView[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Which curatable child collection an item belongs to. */
export type CreativeItemKind = "angle" | "hook" | "ugc";
