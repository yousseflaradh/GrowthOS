import type { RequestContext } from "@/shared/application/request-context";
import type { CreativeStrategyView, ConceptView, CreativeItemKind } from "@/modules/creative/application/dto";
import type {
  CustomerPsychology,
  AngleItem,
  HookItem,
} from "@/modules/creative/application/creative-schemas";

/** UGC concept as produced by the AI (before it gets an id/favorite in the DB). */
export interface UgcConceptInput {
  title: string;
  concept: string;
  format?: string;
  hooks: string[];
}

/** Editable fields across the curatable item kinds. */
export interface CreativeItemPatch {
  headline?: string;
  description?: string;
  text?: string;
  title?: string;
  concept?: string;
}

export interface CreativeRepository {
  createBrief(
    ctx: RequestContext,
    args: { projectId: string; analysisId: string | null; inputs: Record<string, unknown> },
  ): Promise<{ id: string }>;
  createStrategy(ctx: RequestContext, args: { projectId: string; briefId: string }): Promise<{ id: string }>;
  setPsychology(ctx: RequestContext, strategyId: string, psychology: CustomerPsychology): Promise<void>;
  addAngles(ctx: RequestContext, strategyId: string, angles: AngleItem[]): Promise<void>;
  addHooks(ctx: RequestContext, strategyId: string, hooks: HookItem[]): Promise<void>;
  setConcepts(
    ctx: RequestContext,
    strategyId: string,
    concepts: { static: ConceptView[]; video: ConceptView[]; ugc: UgcConceptInput[] },
  ): Promise<void>;
  complete(ctx: RequestContext, strategyId: string, args: { model: string }): Promise<CreativeStrategyView>;
  fail(ctx: RequestContext, strategyId: string, error: string): Promise<void>;
  latestForProject(ctx: RequestContext, projectId: string): Promise<CreativeStrategyView | null>;

  // Curation
  setFavorite(ctx: RequestContext, kind: CreativeItemKind, id: string, favorite: boolean): Promise<void>;
  updateItem(ctx: RequestContext, kind: CreativeItemKind, id: string, patch: CreativeItemPatch): Promise<void>;
}
