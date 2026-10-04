/** Structured shape of the AI market-intelligence synthesis. */
import { z } from "zod";

const strList = z.array(z.string().min(1)).max(20);

export const intelReportSchema = z.object({
  sentimentSummary: z.object({
    positive: z.number().min(0).max(100),
    negative: z.number().min(0).max(100),
    neutral: z.number().min(0).max(100),
    overview: z.string(),
  }),
  topComplaints: strList,
  topPraises: strList,
  customerPhrases: strList, // verbatim language customers actually use
  emergingPains: strList,
  emergingDesires: strList,
  emergingObjections: strList,
  recommendedAngles: strList,
});

export type IntelReportResult = z.infer<typeof intelReportSchema>;
