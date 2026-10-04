export const ANALYSIS_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];
