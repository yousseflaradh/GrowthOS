/**
 * Problem+JSON response helpers for Route Handlers.
 * See docs/architecture/04-api-contracts.md §2.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function problem(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid request.", details: err.flatten().fieldErrors } },
      { status: 422 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  logger.error("http.unhandled", { err: String(err) });
  return NextResponse.json({ error: { code: "INTERNAL", message: "Internal server error." } }, { status: 500 });
}
