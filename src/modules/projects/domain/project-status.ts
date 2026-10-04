/**
 * Domain-level project status. Declared locally (not imported from Prisma) so
 * the domain/application layers stay persistence-agnostic. Mirrors the
 * ProjectStatus enum in the Prisma schema.
 */
export const PROJECT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
