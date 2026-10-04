/**
 * Provider-agnostic AI gateway with automatic failover. The primary provider is
 * AI_PROVIDER (= "openrouter" | "gemini"); if it fails (rate-limit, overload,
 * bad shape) and the other provider is configured, we transparently retry on it.
 * This keeps generation working even when one free tier is exhausted. All app
 * code imports from here, never a specific provider.
 */
import type { z } from "zod";
import { env } from "@/config/env";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";
import * as openrouter from "@/ai/openrouter";
import * as gemini from "@/ai/gemini";
import type { ChatArgs, GenerateJsonArgs, TokenUsage } from "@/ai/types";

type ProviderName = "gemini" | "openrouter";
const impls = { gemini, openrouter };

/** Providers to try, in order: the configured primary first, then any other that has a key. */
function providerChain(): ProviderName[] {
  const ready: Record<ProviderName, boolean> = {
    gemini: Boolean(env.GEMINI_API_KEY),
    openrouter: Boolean(env.OPENROUTER_API_KEY),
  };
  const order: ProviderName[] =
    env.AI_PROVIDER === "gemini" ? ["gemini", "openrouter"] : ["openrouter", "gemini"];
  return order.filter((p) => ready[p]);
}

/** Run `op` across the provider chain, falling over on any failure. */
async function withFailover<R>(op: (p: (typeof impls)[ProviderName]) => Promise<R>, label: string): Promise<R> {
  const chain = providerChain();
  if (chain.length === 0) {
    throw new AppError("INTERNAL", "No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.");
  }
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    const name = chain[i]!;
    try {
      return await op(impls[name]);
    } catch (err) {
      lastErr = err;
      const hasNext = i < chain.length - 1;
      logger.warn("ai.provider_failed", {
        op: label,
        provider: name,
        fallingBackTo: hasNext ? chain[i + 1] : null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  throw lastErr instanceof AppError
    ? lastErr
    : new AppError("INTERNAL", "All AI providers failed. Try again shortly.");
}

export function generateJson<S extends z.ZodTypeAny>(
  args: GenerateJsonArgs<S>,
): Promise<{ data: z.infer<S>; model: string; usage: TokenUsage }> {
  return withFailover((p) => p.generateJson(args), "generateJson");
}

export function generateText(args: ChatArgs): Promise<{ text: string; model: string; usage: TokenUsage }> {
  return withFailover((p) => p.generateText(args), "generateText");
}
