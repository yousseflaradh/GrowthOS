import type { RequestContext } from "@/shared/application/request-context";
import type { AnalysisView, ReviewView } from "@/modules/analysis/application/dto";
import type { ProductAnalysisResult } from "@/modules/analysis/application/analysis-schema";

export interface SnapshotInput {
  source: string;
  sourceUrl: string | null;
  title: string | null;
  description: string | null;
  features: string[];
  images: string[];
  reviews: ReviewView[];
  contentHash: string | null;
}

export interface AnalysisRepository {
  createSnapshot(ctx: RequestContext, projectId: string, data: SnapshotInput): Promise<{ id: string }>;
  createAnalysis(ctx: RequestContext, args: { projectId: string; snapshotId: string }): Promise<AnalysisView>;
  completeAnalysis(
    ctx: RequestContext,
    id: string,
    args: { result: ProductAnalysisResult; model: string },
  ): Promise<AnalysisView>;
  failAnalysis(ctx: RequestContext, id: string, error: string): Promise<void>;
  latestForProject(ctx: RequestContext, projectId: string): Promise<AnalysisView | null>;
  getById(ctx: RequestContext, id: string): Promise<AnalysisView | null>;
}
