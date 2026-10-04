/**
 * Source collectors — read existing domain data (Phase 2 product analysis,
 * scraped reviews, Phase 7 competitor intel) and flatten it into plain text
 * ready for chunking + embedding. All reads go through withTenant (RLS).
 */
import { withTenant } from "@/shared/tenancy/tenant-db";
import type { RawSource, SourceCollector } from "@/modules/knowledge/application/ports";

/** Recursively render a JSON value into labelled, readable lines for embedding. */
function flattenText(value: unknown, label = "", depth = 0): string[] {
  if (value == null || depth > 6) return [];
  if (typeof value === "string") {
    const s = value.trim();
    return s ? [label ? `${label}: ${s}` : s] : [];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [label ? `${label}: ${value}` : String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => flattenText(v, label, depth + 1));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      flattenText(v, humanize(k), depth + 1),
    );
  }
  return [];
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Product knowledge: the project + its latest completed AI analysis + snapshot. */
export const collectProduct: SourceCollector = (ctx, projectId) =>
  withTenant(ctx.organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId: ctx.organizationId },
      select: { productName: true, description: true, productUrl: true },
    });
    if (!project) return [];

    const analysis = await tx.productAnalysis.findFirst({
      where: { projectId, organizationId: ctx.organizationId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { result: true },
    });
    const snapshot = await tx.productSnapshot.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      select: { description: true, features: true },
    });

    const parts: string[] = [`Product: ${project.productName}`];
    if (project.description) parts.push(`Description: ${project.description}`);
    if (snapshot?.description) parts.push(`Page description: ${snapshot.description}`);
    parts.push(...flattenText(snapshot?.features, "Feature"));
    parts.push(...flattenText(analysis?.result, ""));

    const text = parts.filter(Boolean).join("\n");
    if (!text.trim()) return [];
    const source: RawSource = {
      sourceType: "PRODUCT",
      sourceId: projectId,
      title: project.productName,
      text,
    };
    return [source];
  });

/** Customer reviews captured on the latest product snapshot. */
export const collectReviews: SourceCollector = (ctx, projectId) =>
  withTenant(ctx.organizationId, async (tx) => {
    const snapshot = await tx.productSnapshot.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      select: { reviews: true },
    });
    const reviews = Array.isArray(snapshot?.reviews)
      ? (snapshot.reviews as { author?: string; rating?: number; text?: string }[])
      : [];
    const lines = reviews
      .map((r) => {
        const who = r.author ? `${r.author}` : "Customer";
        const stars = typeof r.rating === "number" ? ` (${r.rating}★)` : "";
        const body = (r.text ?? "").trim();
        return body ? `${who}${stars}: ${body}` : "";
      })
      .filter(Boolean);
    if (lines.length === 0) return [];
    const source: RawSource = {
      sourceType: "REVIEWS",
      sourceId: projectId,
      title: `Customer reviews (${lines.length})`,
      text: lines.join("\n"),
    };
    return [source];
  });

/** One document per tracked competitor: its scraped teardown + AI analysis. */
export const collectCompetitors: SourceCollector = (ctx, projectId) =>
  withTenant(ctx.organizationId, async (tx) => {
    const competitors = await tx.competitor.findMany({
      where: { projectId, organizationId: ctx.organizationId },
      select: {
        id: true,
        name: true,
        url: true,
        snapshots: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
        analyses: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { result: true },
        },
      },
    });

    const sources: RawSource[] = [];
    for (const c of competitors) {
      const teardown = c.snapshots[0]?.content as
        | { outline?: string; offers?: string[]; signals?: string[] }
        | undefined;
      const parts: string[] = [`Competitor: ${c.name}`, `URL: ${c.url}`];
      if (teardown?.offers?.length) parts.push(`Offers: ${teardown.offers.join(" | ")}`);
      if (teardown?.signals?.length) parts.push(`Conversion signals: ${teardown.signals.join(", ")}`);
      if (teardown?.outline) parts.push(`Page outline:\n${teardown.outline}`);
      parts.push(...flattenText(c.analyses[0]?.result, ""));

      const text = parts.filter(Boolean).join("\n");
      if (text.trim()) {
        sources.push({ sourceType: "COMPETITOR", sourceId: c.id, title: c.name, text });
      }
    }
    return sources;
  });
