/**
 * The single call primitive every agent node uses. Wraps the provider-agnostic
 * gateway (keeping Gemini↔OpenRouter failover + schema-retry), then layers on
 * node-level retry, real token-usage capture, and USD cost estimation.
 */
import type { z } from "zod";
import { generateJson } from "@/ai/gateway";
import type { TokenUsage } from "@/ai/types";
import { computeCost } from "@/agents/runtime/cost";
import { withRetry } from "@/agents/runtime/retry";

export interface StructuredResult<T> {
  data: T;
  usage: TokenUsage;
  costUsd: number;
  model: string;
  attempts: number;
}

export async function runStructured<S extends z.ZodTypeAny>(args: {
  label: string;
  system: string;
  user: string;
  schema: S;
  temperature?: number;
}): Promise<StructuredResult<z.infer<S>>> {
  const { value, attempts } = await withRetry(args.label, () =>
    generateJson({
      system: args.system,
      user: args.user,
      schema: args.schema,
      temperature: args.temperature,
    }),
  );
  return {
    data: value.data,
    usage: value.usage,
    costUsd: computeCost(value.model, value.usage),
    model: value.model,
    attempts,
  };
}
