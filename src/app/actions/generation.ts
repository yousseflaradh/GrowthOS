"use server";

/**
 * Assisted-input generation for the manual analyze form:
 * - generateDescriptionAction: photo → description (vision model)
 * - generateFeaturesAction: photo and/or description → key features
 */
import { z } from "zod";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { AppError } from "@/shared/errors/app-error";
import { generateText, generateJson } from "@/ai/gateway";
import {
  DESCRIPTION_SYSTEM,
  buildDescriptionUser,
  FEATURES_SYSTEM,
  buildFeaturesUser,
} from "@/ai/prompts/generation";

const imageSchema = z
  .string()
  .min(1)
  .refine((v) => v.startsWith("data:image/") || v.startsWith("http"), "Invalid image");

export async function generateDescriptionAction(input: unknown): Promise<ActionResult<{ description: string }>> {
  return action(async () => {
    await requireContext();
    // Note: we intentionally do NOT pass the project name — the photo is the
    // source of truth, so the description reflects what's actually shown.
    const { image } = z.object({ image: imageSchema }).parse(input);

    const { text } = await generateText({
      system: DESCRIPTION_SYSTEM,
      user: buildDescriptionUser(),
      images: [image],
      vision: true,
    });
    return { description: stripQuotes(text) };
  });
}

export async function generateFeaturesAction(input: unknown): Promise<ActionResult<{ features: string[] }>> {
  return action(async () => {
    await requireContext();
    const { image, description } = z
      .object({ image: imageSchema.optional(), description: z.string().optional() })
      .parse(input);

    if (!image && !description?.trim()) {
      throw AppError.validation("Add a photo or a description first.");
    }

    const { data } = await generateJson({
      system: FEATURES_SYSTEM,
      user: buildFeaturesUser(description),
      images: image ? [image] : undefined,
      // Vision model when a photo is present; text model otherwise.
      vision: !!image,
      schema: z.array(z.string().min(1)).max(20),
    });
    return { features: data };
  });
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "").trim();
}
