import type { AnalysisStatus } from "@/modules/analysis/domain/analysis-status";
import type { ProductAnalysisResult } from "@/modules/analysis/application/analysis-schema";

export interface ReviewView {
  author?: string;
  rating?: number;
  text: string;
}

export interface SnapshotView {
  id: string;
  source: string; // "url" | "manual"
  sourceUrl: string | null;
  title: string | null;
  description: string | null;
  features: string[];
  images: string[];
  reviews: ReviewView[];
  createdAt: string;
}

export interface AnalysisView {
  id: string;
  projectId: string;
  status: AnalysisStatus;
  result: ProductAnalysisResult | null;
  model: string | null;
  error: string | null;
  snapshot: SnapshotView | null;
  createdAt: string;
  updatedAt: string;
}
