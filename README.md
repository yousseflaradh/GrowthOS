# GrowthOS

AI-powered Ecommerce Operating System. See [`docs/architecture/`](./docs/architecture/00-overview.md) for the approved system design.

> **Status:** Phase 1 — Foundation & Core Infrastructure (auth, data, infra, project CRUD, dashboard). AI features begin in a later phase.

## Stack

Next.js 15 (App Router, RSC, Server Actions) · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion · Prisma + PostgreSQL · Auth.js v5 · Redis + BullMQ · Qdrant · PostHog · Resend · Docker + Coolify.

## Architecture in one line

A **modular monolith** (Clean Architecture + DDD) with a separate **worker** process for async work, multi-tenant by `organizationId` with Postgres Row-Level Security. Details: [`docs/architecture`](./docs/architecture/00-overview.md).

## Local development

### 1. Prerequisites
- Node.js 20+
- Docker + Docker Compose

### 2. Environment
```bash
cp .env.example .env
# Fill in AUTH_SECRET (openssl rand -base64 32), Google OAuth, Resend, PostHog keys.
```

### 3. Start infrastructure (Postgres, Redis, Qdrant)
```bash
docker compose up -d postgres redis qdrant
```

### 4. Install & migrate
```bash
npm install
npm run db:migrate     # applies schema + RLS policies
npm run db:seed        # optional: demo org/user/projects
```

### 5. Run app + worker (two processes)
```bash
npm run dev            # Next.js on http://localhost:3000
npm run worker:dev     # BullMQ worker (separate terminal)
```

### Full stack in Docker
```bash
docker compose up --build   # web + worker + postgres + redis + qdrant
```

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run worker:dev` | Worker (BullMQ + future LangGraph runtime) |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:deploy` | Prisma migrate (prod / CI) |
| `npm run db:seed` | Seed demo data |
| `npm run typecheck` | TS type check |
| `npm run lint` | ESLint |
| `npm run boundaries` | Enforce module boundaries (dependency-cruiser) |

## Project layout

See [`docs/architecture/05-folder-structure.md`](./docs/architecture/05-folder-structure.md). Key roots:
- `src/app` — Next.js delivery layer (pages, route handlers, server actions)
- `src/modules/*` — bounded contexts (identity, projects, …)
- `src/shared` — shared kernel + cross-cutting (tenancy, errors, observability)
- `src/lib` — infrastructure clients (prisma, redis, qdrant, posthog, queues)
- `src/workers` — async worker entrypoint
- `prisma` — schema + migrations
