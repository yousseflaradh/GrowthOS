# 05 — Folder Structure

Covers: modular-monolith repository layout enforcing Clean Architecture + DDD boundaries.

---

## 1. Principles encoded in the structure

1. **`src/modules/<context>`** — each bounded context is a self-contained vertical slice with its own `domain`, `application`, `infrastructure`, and `interface` layers.
2. **Dependency direction enforced by tooling** — `domain` imports nothing outward; `application` imports `domain` + ports; `infrastructure` implements ports; `interface` (Next.js) wires them. `dependency-cruiser` rules fail CI on violations.
3. **No cross-module deep imports** — a module exposes a **public API** (`index.ts`); other modules import only that, or communicate via events.
4. **`src/app`** (Next.js App Router) is a thin delivery layer — pages/route handlers call application services; no business logic.
5. **Worker is a sibling entrypoint** sharing the same modules.

---

## 2. Top-level layout

```
growthos/
├─ docs/architecture/            # these documents
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/                # incl. RLS policy SQL
├─ src/
│  ├─ app/                       # Next.js 15 App Router (delivery)
│  ├─ modules/                   # bounded contexts (the heart)
│  ├─ shared/                    # shared kernel + cross-cutting
│  ├─ workers/                   # BullMQ consumers + LangGraph runtime
│  ├─ ai/                        # LangGraph graphs, prompts, model router
│  └─ config/                    # env, composition root (DI wiring)
├─ docker/                       # Dockerfiles, compose, coolify configs
├─ test/                         # unit / integration / e2e
└─ package.json
```

---

## 3. App Router (delivery layer)

```
src/app/
├─ (marketing)/                  # public pages
├─ (auth)/                       # sign-in, accept-invite
├─ (dashboard)/
│  ├─ layout.tsx                 # org switcher, nav, auth guard
│  ├─ products/
│  ├─ research/
│  ├─ creative/
│  ├─ landing/
│  ├─ audits/
│  └─ settings/                  # members, billing, api keys
├─ api/
│  └─ v1/
│     ├─ products/route.ts
│     ├─ research/route.ts
│     ├─ creative/{hooks,angles,ugc}/route.ts
│     ├─ landing/route.ts
│     ├─ audits/route.ts
│     ├─ jobs/[id]/route.ts
│     ├─ jobs/[id]/stream/route.ts
│     └─ webhooks/{payments,n8n}/route.ts
└─ actions/                      # server actions, grouped by context
```

> `app/` contains **only** controllers/presenters: parse → validate → call service → map to view. Zero domain logic.

---

## 4. A module (vertical slice) — `creative` example

```
src/modules/creative/
├─ index.ts                      # PUBLIC API (the only legal import surface)
├─ domain/
│  ├─ entities/        Hook.ts, Angle.ts, UgcConcept.ts, CreativeBrief.ts
│  ├─ value-objects/  Score.ts, AngleType.ts
│  ├─ events/         HooksGenerated.ts, AnglesGenerated.ts
│  └─ policies/       CreativeScoringPolicy.ts
├─ application/
│  ├─ ports/          CreativeRepository.ts, AiGateway.ts (re-export), VectorStore.ts
│  ├─ use-cases/      GenerateHooks.ts, GenerateAngles.ts, GenerateUgc.ts, CreateBrief.ts
│  └─ services/       CreativeService.ts
├─ infrastructure/
│  ├─ persistence/    PrismaCreativeRepository.ts, mappers.ts
│  └─ ai/             creativeGraphAdapter.ts   # bridges to src/ai graphs
└─ interface/
   └─ dto/            requestSchemas.ts (Zod), presenters.ts
```

The same shape repeats for `identity`, `billing`, `products`, `research`, `landing`, `audit`, `knowledge`, `platform`.

---

## 5. Shared kernel & cross-cutting

```
src/shared/
├─ domain/            Entity.ts, AggregateRoot.ts, ValueObject.ts, DomainEvent.ts, Result.ts
├─ application/       UseCase.ts, RequestContext.ts, ports/EventBus.ts, ports/Clock.ts
├─ tenancy/           TenantResolver.ts, withOrgScope.ts, rls.ts
├─ errors/            AppError.ts, problem-json.ts
├─ observability/     logger.ts, tracing.ts, metrics.ts
└─ validation/        zod helpers
```

---

## 6. AI layer

```
src/ai/
├─ graphs/            research.graph.ts, creative.graph.ts, landing.graph.ts, audit.graph.ts
├─ nodes/             retrieve.ts, generate.ts, score.ts, safety.ts, persist.ts
├─ prompts/           <feature>/<name>.<version>.ts   # versioned, content-addressed
├─ router/            modelRouter.ts, taskClasses.ts
├─ gateway/           OpenRouterGateway.ts (implements AiGateway port)
├─ rag/               chunker.ts, embedder.ts, QdrantVectorStore.ts (implements VectorStore)
└─ eval/              promptEvals.ts                  # regression evals for prompt changes
```

---

## 7. Workers

```
src/workers/
├─ index.ts                      # worker bootstrap (separate process/container)
├─ queues.ts                     # queue + connection definitions
├─ consumers/
│  ├─ aiGeneration.consumer.ts   # ai.generation queue → runs LangGraph graphs
│  ├─ scrape.consumer.ts         # scrape.jobs → Playwright (isolated)
│  ├─ embeddings.consumer.ts     # index.embeddings
│  ├─ email.consumer.ts          # email.outbound → Resend
│  └─ webhooks.consumer.ts       # webhooks.inbound
└─ outbox/relay.ts               # transactional outbox → BullMQ
```

---

## 8. Composition root (DI)

```
src/config/
├─ env.ts            # Zod-validated environment
├─ container.ts      # binds ports → infrastructure (per request + per worker)
└─ context.ts        # builds RequestContext (orgId, userId, role, plan)
```

`container.ts` is the **only** place where infrastructure classes are instantiated and bound to application ports. Swapping Prisma → another ORM, or OpenRouter → another gateway, touches this file and the adapter only — never the domain or use cases.

---

## 9. Boundary enforcement (CI)

`.dependency-cruiser.cjs` rules (conceptual):
- `domain` → may import: `shared/domain` only.
- `application` → may import: own `domain`, `shared`, ports. **Not** `infrastructure`, **not** Next.js, **not** Prisma.
- `infrastructure` / `interface` → may import inward freely.
- `modules/A` → may import `modules/B` **only** via `modules/B/index.ts`.
- `app/` → may import module **public APIs** and `shared`, never deep paths.

Violations fail the build, keeping the modular monolith from rotting into a big ball of mud.
