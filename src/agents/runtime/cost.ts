/**
 * Cost tracking. Maps a model + token usage to an estimated USD cost using
 * published per-million-token rates. GrowthOS runs mostly on free tiers, so the
 * figure is an "at paid rates" estimate — its value is relative comparison
 * across agents/runs, and a guard against a runaway workflow.
 */
import type { TokenUsage } from "@/ai/types";

interface Rate {
  in: number; // USD per 1M input tokens
  out: number; // USD per 1M output tokens
}

// Prefix-matched so model variants (dates, tags) resolve to the closest rate.
const RATES: [string, Rate][] = [
  ["gemini-flash", { in: 0.075, out: 0.3 }],
  ["gemini-2.5-flash", { in: 0.075, out: 0.3 }],
  ["gemini-1.5-flash", { in: 0.075, out: 0.3 }],
  ["gemini-1.5-pro", { in: 1.25, out: 5.0 }],
  ["gemini", { in: 0.075, out: 0.3 }],
  ["anthropic/claude-3.5-sonnet", { in: 3.0, out: 15.0 }],
  ["anthropic/claude", { in: 3.0, out: 15.0 }],
  ["meta-llama", { in: 0.06, out: 0.06 }],
  ["openai/gpt-4o-mini", { in: 0.15, out: 0.6 }],
  ["openai/gpt-4o", { in: 2.5, out: 10.0 }],
];

const FALLBACK: Rate = { in: 0.5, out: 1.5 };

function rateFor(model: string): Rate {
  const m = model.toLowerCase();
  for (const [prefix, rate] of RATES) if (m.includes(prefix)) return rate;
  return FALLBACK;
}

/** Estimated USD cost for one model call. */
export function computeCost(model: string, usage: TokenUsage): number {
  const r = rateFor(model);
  return (usage.inputTokens * r.in + usage.outputTokens * r.out) / 1_000_000;
}
