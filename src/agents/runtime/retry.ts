/**
 * Node-level retry. The AI gateway already retries schema mismatches and fails
 * over between providers; this adds a coarser outer retry for transient
 * failures (network blips, brief overloads) around a whole agent step, and
 * reports how many attempts it took for the cost/step record.
 */
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";

export interface RetryResult<T> {
  value: T;
  attempts: number;
}

const RETRYABLE = new Set(["RATE_LIMITED", "INTERNAL"]);

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<RetryResult<T>> {
  const max = opts.attempts ?? 2;
  const base = opts.baseDelayMs ?? 1500;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return { value: await fn(), attempts: attempt };
    } catch (err) {
      lastErr = err;
      const code = err instanceof AppError ? err.code : "INTERNAL";
      const retryable = RETRYABLE.has(code);
      if (!retryable || attempt === max) break;
      const waitMs = base * attempt;
      logger.warn("agent.step_retry", { label, attempt, code, waitMs });
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
