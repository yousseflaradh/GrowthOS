/** Zod schemas for identity-related forms (auth + profile). */
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// Accepts an empty string, an http(s) URL, or an uploaded base64 data URL.
const imageValue = z
  .string()
  .max(3_000_000, "Image is too large")
  .refine((v) => v === "" || v.startsWith("http") || v.startsWith("data:image/"), "Invalid image")
  .optional()
  .or(z.literal(""));

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  company: z.string().max(160).optional().or(z.literal("")),
  website: z
    .string()
    .url("Enter a valid URL")
    .max(300)
    .optional()
    .or(z.literal("")),
  image: imageValue,
});

export type RegisterValues = z.infer<typeof registerSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
