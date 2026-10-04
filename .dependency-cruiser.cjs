/**
 * Clean Architecture / modular-monolith boundary enforcement.
 * Fails CI when inner layers import outward, or modules reach past
 * each other's public API. See docs/architecture/05-folder-structure.md.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-stays-pure",
      comment:
        "Domain layer must not import application/infrastructure/Next.js/Prisma/etc.",
      severity: "error",
      from: { path: "^src/(modules/[^/]+|shared)/domain" },
      to: {
        pathNot: [
          "^src/(modules/[^/]+|shared)/domain",
          "^src/shared/domain",
          "node_modules/(zod|ulid)",
        ],
      },
    },
    {
      name: "application-no-infrastructure",
      comment:
        "Application layer orchestrates via ports; it must not import concrete infrastructure or Next.js.",
      severity: "error",
      from: { path: "^src/modules/[^/]+/application" },
      to: {
        path: [
          "^src/modules/[^/]+/infrastructure",
          "^src/modules/[^/]+/interface",
          "^next($|/)",
          "@prisma/client",
        ],
      },
    },
    {
      name: "no-cross-module-deep-import",
      comment:
        "Modules may only import another module via its public API (index.ts).",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/([^/]+)/(?!index).+",
        pathNot: "^src/modules/$1/", // same module may import its own internals
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: { orphan: true, pathNot: ["\\.d\\.ts$", "(^|/)index\\.ts$"] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
  },
};
