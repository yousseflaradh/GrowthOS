import type { RequestContext } from "@/shared/application/request-context";
import type { AdSource } from "@/modules/intel/domain/intel-status";
import type {
  CompetitorAdView,
  AdCommentView,
  IntelReportView,
} from "@/modules/intel/application/dto";
import type { IntelReportResult } from "@/modules/intel/application/intel-schema";

export interface AdInput {
  source: AdSource;
  advertiser?: string | null;
  adText: string;
  mediaUrl?: string | null;
  landingUrl?: string | null;
  sourceUrl?: string | null;
}

export interface CommentInput {
  source: AdSource;
  author?: string | null;
  text: string;
  adId?: string | null;
}

export interface IntelRepository {
  addAds(ctx: RequestContext, projectId: string, ads: AdInput[]): Promise<number>;
  addComments(ctx: RequestContext, projectId: string, comments: CommentInput[]): Promise<number>;
  listAds(ctx: RequestContext, projectId: string): Promise<CompetitorAdView[]>;
  listComments(ctx: RequestContext, projectId: string): Promise<AdCommentView[]>;
  createReport(ctx: RequestContext, projectId: string): Promise<{ id: string }>;
  completeReport(
    ctx: RequestContext,
    id: string,
    args: { result: IntelReportResult; model: string },
  ): Promise<IntelReportView>;
  failReport(ctx: RequestContext, id: string, error: string): Promise<void>;
  latestReport(ctx: RequestContext, projectId: string): Promise<IntelReportView | null>;
}

/** Automated ad source (Apify). Manual import/upload bypasses this. */
export interface FetchQuery {
  /** A keyword/brand to search across all sources, or a single URL. */
  query: string;
  limit?: number;
}

export interface AdSourceProvider {
  readonly available: boolean;
  /** One query → all configured sources (Facebook + TikTok), merged. */
  fetch(query: FetchQuery): Promise<{ ads: AdInput[]; comments: CommentInput[] }>;
}
