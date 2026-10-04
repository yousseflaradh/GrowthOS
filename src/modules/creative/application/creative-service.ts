/**
 * Creative Strategy pipeline. From the product-analysis inputs it generates,
 * in sequence: customer psychology → 20+ angles → 50+ hooks → 30 concepts,
 * persisting each step. Four AI calls keep each output small enough to parse
 * reliably. Synchronous (server action) like Phase 2; queue-ready.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import type { CreativeInputs } from "@/ai/prompts/creative";
import type { CreativeStrategyView, CreativeItemKind } from "@/modules/creative/application/dto";
import type { CreativeRepository, CreativeItemPatch } from "@/modules/creative/application/ports";
import type {
  CustomerPsychology,
  AngleItem,
  HookItem,
  ConceptsResult,
} from "@/modules/creative/application/creative-schemas";

type Gen<T> = (i: CreativeInputs) => Promise<{ data: T; model: string }>;

export interface CreativeDeps {
  generatePsychology: Gen<CustomerPsychology>;
  generateAngles: Gen<{ angles: AngleItem[] }>;
  generateHooks: Gen<{ hooks: HookItem[] }>;
  generateConcepts: Gen<ConceptsResult>;
  repo: CreativeRepository;
}

export interface RunCreativeInput {
  projectId: string;
  analysisId: string | null;
  inputs: CreativeInputs;
}

export function createCreativeService(deps: CreativeDeps) {
  return {
    async run(ctx: RequestContext, input: RunCreativeInput): Promise<CreativeStrategyView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to generate strategy.");

      const brief = await deps.repo.createBrief(ctx, {
        projectId: input.projectId,
        analysisId: input.analysisId,
        inputs: input.inputs as unknown as Record<string, unknown>,
      });
      const strategy = await deps.repo.createStrategy(ctx, {
        projectId: input.projectId,
        briefId: brief.id,
      });

      // Each of the 4 AI calls runs independently — a single hiccup (rate limit,
      // malformed JSON) no longer discards the whole strategy. We persist
      // whatever succeeds and only mark FAILED if EVERY step failed.
      const failures: string[] = [];
      let model: string | null = null;
      // Two attempts per step (each already does provider failover + a JSON
      // retry inside the gateway). A brief pause between attempts lets a
      // free-tier per-minute rate limit recover, so one run reliably fills all
      // four parts instead of dropping a different one each time.
      const step = async (name: string, fn: () => Promise<string | void>) => {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const m = await fn();
            if (m && !model) model = m;
            return;
          } catch (err) {
            if (attempt === 2) {
              const detail = err instanceof Error ? err.message : String(err);
              failures.push(`${name}: ${detail}`);
              return;
            }
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      };

      await step("psychology", async () => {
        const r = await deps.generatePsychology(input.inputs);
        await deps.repo.setPsychology(ctx, strategy.id, r.data);
        return r.model;
      });
      await step("angles", async () => {
        const r = await deps.generateAngles(input.inputs);
        await deps.repo.addAngles(ctx, strategy.id, r.data.angles);
        return r.model;
      });
      await step("hooks", async () => {
        const r = await deps.generateHooks(input.inputs);
        await deps.repo.addHooks(ctx, strategy.id, r.data.hooks);
        return r.model;
      });
      await step("concepts", async () => {
        const r = await deps.generateConcepts(input.inputs);
        await deps.repo.setConcepts(ctx, strategy.id, {
          static: r.data.static,
          video: r.data.video,
          ugc: r.data.ugc,
        });
        return r.model;
      });

      if (failures.length === 4) {
        const message = `Creative generation failed: ${failures[0]}`;
        await deps.repo.fail(ctx, strategy.id, message);
        throw new AppError("INTERNAL", message);
      }
      return await deps.repo.complete(ctx, strategy.id, { model: model ?? "partial" });
    },

    latest(ctx: RequestContext, projectId: string): Promise<CreativeStrategyView | null> {
      return deps.repo.latestForProject(ctx, projectId);
    },

    async setFavorite(ctx: RequestContext, kind: CreativeItemKind, id: string, favorite: boolean): Promise<void> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to edit.");
      return deps.repo.setFavorite(ctx, kind, id, favorite);
    },

    async updateItem(ctx: RequestContext, kind: CreativeItemKind, id: string, patch: CreativeItemPatch): Promise<void> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to edit.");
      return deps.repo.updateItem(ctx, kind, id, patch);
    },
  };
}

export type CreativeService = ReturnType<typeof createCreativeService>;
