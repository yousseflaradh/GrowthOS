import type { AuditStatus, AuditCategory, AuditSeverity } from "@/modules/audit/domain/audit-status";

export interface ScoreView {
  category: AuditCategory;
  score: number;
  summary: string | null;
}
export interface FindingView {
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  detail: string;
}
export interface RecommendationView {
  category: AuditCategory;
  priority: AuditSeverity;
  title: string;
  detail: string;
}

export interface AuditRunView {
  id: string;
  projectId: string;
  url: string;
  status: AuditStatus;
  overallScore: number | null;
  summary: string | null;
  model: string | null;
  error: string | null;
  scores: ScoreView[];
  findings: FindingView[];
  recommendations: RecommendationView[];
  createdAt: string;
  updatedAt: string;
}

/** Lightweight entry for the audit-history list. */
export interface AuditSummary {
  id: string;
  url: string;
  status: AuditStatus;
  overallScore: number | null;
  createdAt: string;
}
