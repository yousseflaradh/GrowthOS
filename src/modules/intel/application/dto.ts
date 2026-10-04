import type { IntelStatus, AdSource } from "@/modules/intel/domain/intel-status";
import type { IntelReportResult } from "@/modules/intel/application/intel-schema";

export interface CompetitorAdView {
  id: string;
  source: AdSource;
  advertiser: string | null;
  adText: string;
  mediaUrl: string | null;
  landingUrl: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface AdCommentView {
  id: string;
  source: AdSource;
  author: string | null;
  text: string;
  sentiment: string | null;
  createdAt: string;
}

export interface IntelReportView {
  id: string;
  projectId: string;
  status: IntelStatus;
  model: string | null;
  result: IntelReportResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntelOverview {
  ads: CompetitorAdView[];
  comments: AdCommentView[];
  report: IntelReportView | null;
}
