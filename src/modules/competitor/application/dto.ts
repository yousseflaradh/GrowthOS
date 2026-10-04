import type { AnalysisStatus } from "@/modules/analysis/domain/analysis-status";
import type { CompetitorAnalysisResult } from "@/modules/competitor/application/competitor-schema";

export interface CompetitorView {
  id: string;
  projectId: string;
  name: string;
  url: string;
  /** Latest analysis (COMPLETED preferred), if any. */
  analysis: CompetitorAnalysisView | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorAnalysisView {
  id: string;
  status: AnalysisStatus;
  result: CompetitorAnalysisResult | null;
  model: string | null;
  error: string | null;
  createdAt: string;
}
