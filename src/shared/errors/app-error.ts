/**
 * Domain/application error taxonomy. Controllers map these to HTTP/Problem+JSON
 * or server-action results. Throwing these (vs raw Error) keeps the boundary
 * mapping consistent. See docs/architecture/04-api-contracts.md §2.
 */
export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const statusByCode: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }

  static unauthenticated(msg = "Authentication required") {
    return new AppError("UNAUTHENTICATED", msg);
  }
  static forbidden(msg = "Not allowed") {
    return new AppError("FORBIDDEN", msg);
  }
  static notFound(msg = "Not found") {
    return new AppError("NOT_FOUND", msg);
  }
  static validation(msg = "Invalid input", details?: unknown) {
    return new AppError("VALIDATION", msg, details);
  }
  static conflict(msg = "Conflict") {
    return new AppError("CONFLICT", msg);
  }
}
