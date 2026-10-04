/** Shared AI gateway types — used by all providers (OpenRouter, Gemini). */
import type { z } from "zod";

export interface ChatArgs {
  system: string;
  user: string;
  /** data URLs or https URLs — requires a vision-capable model. */
  images?: string[];
  /** Explicit model id. If omitted, the provider picks text/vision default. */
  model?: string;
  /** Use the provider's vision model when no explicit model is given. */
  vision?: boolean;
  temperature?: number;
}

/**
 * `schema` is any zod schema; callers get back its OUTPUT type via `z.infer`.
 * Generic over the schema (not the output) so schemas that use transforms,
 * defaults, or preprocess (input ≠ output) still infer cleanly.
 */
export interface GenerateJsonArgs<S extends z.ZodTypeAny = z.ZodTypeAny> extends ChatArgs {
  schema: S;
}

/** Token usage for cost tracking (Phase 9 agent orchestration). */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export const ZERO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0 };

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens };
}

export interface ChatResult {
  content: string;
  model: string;
  usage: TokenUsage;
}
