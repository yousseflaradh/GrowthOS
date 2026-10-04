import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { landingToHtml } from "../src/lib/landing-html";

const prisma = new PrismaClient();
const proj = await prisma.project.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, productName: true } });
if (!proj) throw new Error("no project");
const lp = await prisma.landingPage.findFirst({
  where: { projectId: proj.id },
  orderBy: { createdAt: "desc" },
  include: { versions: { orderBy: { version: "desc" }, take: 1, include: { sections: { orderBy: { position: "asc" } } } } },
});
const v = lp?.versions?.[0];
if (!v) throw new Error("no landing version");

const version = {
  id: v.id,
  version: v.version,
  framework: v.framework,
  rationale: v.rationale,
  theme: v.theme,
  model: v.model,
  createdAt: v.createdAt.toISOString(),
  sections: v.sections.map((s) => ({ id: s.id, type: s.type, position: s.position, content: s.content })),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const html = landingToHtml(version as any, proj.productName);
writeFileSync("landing-preview.html", html);
console.log(`wrote landing-preview.html (${html.length} bytes) for "${proj.productName}" v${v.version}`);
await prisma.$disconnect();
