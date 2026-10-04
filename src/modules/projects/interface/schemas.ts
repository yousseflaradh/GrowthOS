/** Zod schemas for project create/update/list forms and requests. */
import { z } from "zod";
import { PROJECT_STATUSES } from "@/modules/projects/domain/project-status";

const optionalUrl = z.string().url("Enter a valid URL").max(500).optional().or(z.literal(""));

// Accepts an empty string, an http(s) URL, or an uploaded base64 data URL.
const imageValue = z
  .string()
  .max(3_000_000, "Image is too large")
  .refine((v) => v === "" || v.startsWith("http") || v.startsWith("data:image/"), "Invalid image")
  .optional()
  .or(z.literal(""));

export const createProjectSchema = z.object({
  productName: z.string().min(1, "Product name is required").max(200),
  productUrl: optionalUrl,
  description: z.string().max(5000).optional().or(z.literal("")),
  image: imageValue,
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const updateProjectSchema = z.object({
  productName: z.string().min(1).max(200).optional(),
  productUrl: optionalUrl,
  description: z.string().max(5000).optional().or(z.literal("")),
  image: imageValue,
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const listProjectsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

/** Normalize empty strings to null so optional fields clear cleanly. */
export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  return out as T;
}

export type CreateProjectValues = z.infer<typeof createProjectSchema>;
export type UpdateProjectValues = z.infer<typeof updateProjectSchema>;
