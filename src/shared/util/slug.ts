/** Slug helpers for organization slugs (and other human-readable ids). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "org";
}

/** Append a short random suffix to keep slugs unique. */
export function withRandomSuffix(base: string): string {
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
