/**
 * Prisma implementation of LandingRepository. withTenant (RLS) + explicit
 * organization_id filters on every access. A page version stores its sections
 * as PageSection rows (typed JSON content), created in one transaction.
 */
import type { Prisma } from "@prisma/client";
import { withTenant, type TenantTx } from "@/shared/tenancy/tenant-db";
import { AppError } from "@/shared/errors/app-error";
import type { LandingPageView, PageVersionView, SectionView } from "@/modules/landing/application/dto";
import type { LandingRepository, SectionInput } from "@/modules/landing/application/ports";
import {
  SECTION_TYPES,
  SECTION_KEY,
  type LandingPageResult,
  type PageFramework,
  type SectionType,
} from "@/modules/landing/application/landing-schema";

/** Keep only http(s) or base64 image data, de-duplicated, capped for a sane carousel. */
function cleanImages(images: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of images) {
    if (typeof url !== "string") continue;
    const u = url.trim();
    if (!/^(https?:\/\/|data:image\/)/i.test(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 8) break;
  }
  return out;
}

const json = (v: unknown) => v as unknown as Prisma.InputJsonValue;

type SectionRow = { id: string; type: SectionType; position: number; content: unknown };
type VersionRow = {
  id: string;
  version: number;
  framework: PageFramework;
  rationale: string | null;
  theme: string | null;
  design: string | null;
  model: string | null;
  createdAt: Date;
  sections: SectionRow[];
};

function toSectionView(s: SectionRow): SectionView {
  return { id: s.id, type: s.type, position: s.position, content: s.content };
}

function toVersionView(v: VersionRow): PageVersionView {
  return {
    id: v.id,
    version: v.version,
    framework: v.framework,
    rationale: v.rationale,
    theme: v.theme,
    design: v.design,
    model: v.model,
    createdAt: v.createdAt.toISOString(),
    sections: [...v.sections].sort((a, b) => a.position - b.position).map(toSectionView),
  };
}

/**
 * Build ordered (type, content) section rows. AI sections come from the result;
 * the GALLERY is injected from the scraped photos (dropped when there are none),
 * and the first photo becomes the hero image. Positions are reassigned densely.
 */
function buildSections(result: LandingPageResult, images: string[]) {
  const pics = cleanImages(images);
  const hero = { ...result.hero, image: pics[0] };

  const rows: { type: SectionType; content: unknown }[] = [];
  for (const type of SECTION_TYPES) {
    if (type === "GALLERY") {
      if (pics.length) rows.push({ type, content: { images: pics } });
      continue;
    }
    rows.push({ type, content: type === "HERO" ? hero : result[SECTION_KEY[type]] });
  }

  return rows.map((r, position) => ({ ...r, position }));
}

const versionInclude = { sections: { orderBy: { position: "asc" } } } satisfies Prisma.PageVersionInclude;

export const prismaLandingRepository: LandingRepository = {
  saveVersion(ctx, { projectId, result, model, images, theme, design }) {
    return withTenant(ctx.organizationId, async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!project) throw AppError.notFound("Project not found.");

      // One LandingPage per project — find or create.
      let page = await tx.landingPage.findFirst({
        where: { projectId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!page) {
        page = await tx.landingPage.create({
          data: { organizationId: ctx.organizationId, projectId },
          select: { id: true },
        });
      } else {
        await tx.landingPage.updateMany({
          where: { id: page.id, organizationId: ctx.organizationId },
          data: { updatedAt: new Date() },
        });
      }

      const last = await tx.pageVersion.findFirst({
        where: { landingPageId: page.id, organizationId: ctx.organizationId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (last?.version ?? 0) + 1;

      const created = await tx.pageVersion.create({
        data: {
          organizationId: ctx.organizationId,
          landingPageId: page.id,
          version: nextVersion,
          framework: result.framework,
          rationale: result.rationale,
          theme,
          design,
          model,
          sections: {
            create: buildSections(result, images).map((s) => ({
              organizationId: ctx.organizationId,
              type: s.type,
              position: s.position,
              content: json(s.content),
            })),
          },
        },
        include: versionInclude,
      });

      return toVersionView(created as VersionRow);
    });
  },

  forProject(ctx, projectId) {
    return withTenant(ctx.organizationId, async (tx) => {
      const page = await tx.landingPage.findFirst({
        where: { projectId, organizationId: ctx.organizationId },
        include: {
          versions: {
            orderBy: { version: "desc" },
            include: versionInclude,
          },
        },
      });
      if (!page) return null;

      const versions = page.versions as VersionRow[];
      const current = versions[0] ? toVersionView(versions[0]) : null;
      const view: LandingPageView = {
        id: page.id,
        projectId: page.projectId,
        current,
        versions: versions.map((v) => ({
          id: v.id,
          version: v.version,
          framework: v.framework,
          createdAt: v.createdAt.toISOString(),
        })),
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
      };
      return view;
    });
  },

  getVersion(ctx, projectId, versionId) {
    return withTenant(ctx.organizationId, async (tx: TenantTx) => {
      const v = await tx.pageVersion.findFirst({
        where: {
          id: versionId,
          organizationId: ctx.organizationId,
          landingPage: { projectId, organizationId: ctx.organizationId },
        },
        include: versionInclude,
      });
      return v ? toVersionView(v as VersionRow) : null;
    });
  },

  replaceSections(ctx, projectId, versionId, sections: SectionInput[]) {
    return withTenant(ctx.organizationId, async (tx) => {
      const v = await tx.pageVersion.findFirst({
        where: {
          id: versionId,
          organizationId: ctx.organizationId,
          landingPage: { projectId, organizationId: ctx.organizationId },
        },
        select: { id: true, landingPageId: true },
      });
      if (!v) throw AppError.notFound("Version not found.");

      // Only keep known section types; reassign positions from array order.
      const clean = sections.filter((s) => SECTION_TYPES.includes(s.type));
      await tx.pageSection.deleteMany({ where: { versionId, organizationId: ctx.organizationId } });
      if (clean.length) {
        await tx.pageSection.createMany({
          data: clean.map((s, i) => ({
            organizationId: ctx.organizationId,
            versionId,
            type: s.type,
            position: i,
            content: json(s.content),
          })),
        });
      }
      // Touch the landing page so "updated" reflects the edit.
      await tx.landingPage.updateMany({
        where: { id: v.landingPageId, organizationId: ctx.organizationId },
        data: { updatedAt: new Date() },
      });

      const updated = await tx.pageVersion.findFirstOrThrow({
        where: { id: versionId, organizationId: ctx.organizationId },
        include: versionInclude,
      });
      return toVersionView(updated as VersionRow);
    });
  },

  async deleteVersion(ctx, projectId, versionId) {
    await withTenant(ctx.organizationId, async (tx) => {
      const v = await tx.pageVersion.findFirst({
        where: {
          id: versionId,
          organizationId: ctx.organizationId,
          landingPage: { projectId, organizationId: ctx.organizationId },
        },
        select: { id: true, landingPageId: true },
      });
      if (!v) throw AppError.notFound("Version not found.");
      // Sections cascade-delete via the FK.
      await tx.pageVersion.deleteMany({ where: { id: v.id, organizationId: ctx.organizationId } });
      // If that was the last version, drop the (now empty) landing page too.
      const remaining = await tx.pageVersion.count({
        where: { landingPageId: v.landingPageId, organizationId: ctx.organizationId },
      });
      if (remaining === 0) {
        await tx.landingPage.deleteMany({ where: { id: v.landingPageId, organizationId: ctx.organizationId } });
      }
    });
  },
};
