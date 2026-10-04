/**
 * Typed result envelope for Server Actions (see docs/architecture/04 §5).
 * Keeps controllers free of try/catch noise and maps AppError + Zod uniformly.
 */
import { z } from "zod";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error: { code, message, fieldErrors } };
}

/**
 * Run an action body, mapping Zod and AppError to a uniform failure shape.
 * Unexpected errors are logged and returned as a generic INTERNAL error.
 */
export async function action<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return fail("VALIDATION", "Please check the highlighted fields.", err.flatten().fieldErrors as Record<string, string[]>);
    }
    if (err instanceof AppError) {
      return fail(err.code, err.message);
    }
    logger.error("action.unhandled", { err: String(err) });
    return fail("INTERNAL", "Something went wrong. Please try again.");
  }
}
