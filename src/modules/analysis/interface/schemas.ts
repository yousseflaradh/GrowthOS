/** Input validation for running an analysis (productName comes from the project, server-side). */
import { z } from "zod";

export const runAnalysisSchema = z
  .object({
    mode: z.enum(["url", "manual"]),
    url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    description: z.string().max(8000).optional().or(z.literal("")),
    features: z.string().max(4000).optional().or(z.literal("")), // newline-separated in the form
    extraNotes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => d.mode !== "url" || (d.url && d.url.length > 0), {
    message: "A product URL is required.",
    path: ["url"],
  })
  .refine(
    (d) => d.mode !== "manual" || (d.description && d.description.trim().length > 0),
    { message: "Add a product description to analyze.", path: ["description"] },
  );

export type RunAnalysisValues = z.infer<typeof runAnalysisSchema>;

/** Split a newline/comma separated textarea into a clean string[]. */
export function parseFeatures(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 30);
}
