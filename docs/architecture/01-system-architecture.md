# 01 — System Architecture (HLD + LLD)

Covers: complete system architecture, high-level diagram, low-level diagram, service architecture, event-driven design, multi-tenant architecture.

---

## 1. High-Level Architecture

Three planes: **Edge/App plane** (synchronous, user-facing), **Async plane** (workers + queues), **Data plane** (stateful stores). External SaaS sits outside the trust boundary.

```mermaid
flowchart TB
    User(["Ecommerce Operator / Agency"])

    subgraph Edge["Edge"]
        CDN["Coolify Reverse Proxy / TLS / WAF"]
    end

    subgraph AppPlane["Application Plane — Next.js 15 (Docker)"]
        SSR["RSC / SSR Rendering"]
        SA["Server Actions"]
        RH["Route Handlers (REST + webhooks + SSE)"]
        APPSVC["Application Services (per bounded context)"]
        DOM["Domain Core (entities, value objects, policies)"]
        PORTS["Ports (interfaces)"]
    end

    subgraph AsyncPlane["Async Plane — Worker (Docker)"]
        SUB["Queue Consumers"]
        LG["LangGraph Runtime"]
        TOOLS["Agent Tools (scrape, retrieve, score)"]
    end

    subgraph DataPlane["Data Plane (Docker volumes + backups)"]
        PG[("PostgreSQL — system of record")]
        QD[("Qdrant — embeddings")]
        RD[("Redis — queue + cache + rate limit")]
        S3[("Object Storage — assets/exports")]
    end

    subgraph Ext["External (outside trust boundary)"]
        OR["OpenRouter"]
        RESEND["Resend"]
        POSTHOG["PostHog"]
        N8N["n8n"]
        PAY["Payments (Stripe/LemonSqueezy)"]
        TARGET["Scraped storefronts"]
    end

    User --> CDN --> SSR & SA & RH
    SA & RH --> APPSVC --> DOM
    APPSVC --> PORTS
    PORTS --> PG & RD & QD & S3
    RH -- enqueue --> RD
    RD --> SUB --> LG --> TOOLS
    TOOLS --> OR & QD & TARGET
    LG --> PORTS
    APPSVC --> RESEND & PAY
    SUB --> RESEND
    AppPlane -. events .-> N8N
    User -. browser SDK .-> POSTHOG
    AppPlane & AsyncPlane -. /metrics .-> PROM["Prometheus → Grafana"]
```

**Why two processes (web + worker) from one codebase:** they share the domain/Prisma layer but scale and fail independently. A runaway LLM job or a Playwright memory spike cannot take down the web tier.

---

## 2. Low-Level Architecture (Clean Architecture layers)

Dependencies point **inward only**. The domain core has zero imports from Next.js, Prisma, BullMQ, or OpenRouter.

```mermaid
flowchart LR
    subgraph L4["Frameworks & Drivers (outermost)"]
        NX["Next.js / React"]
        PR["Prisma Client"]
        BM["BullMQ"]
        ORC["OpenRouter Client"]
        QDC["Qdrant Client"]
        PWC["Playwright"]
    end

    subgraph L3["Interface Adapters"]
        CTRL["Route Handlers / Server Actions (controllers)"]
        REPO["Repository Implementations"]
        GW["Gateways (AI, Email, Vector, Scrape)"]
        PRES["Presenters / DTO mappers"]
    end

    subgraph L2["Application (Use Cases)"]
        UC["Application Services / Use Cases"]
        PORT["Ports: Repo, AiGateway, VectorStore, EventBus, Clock"]
    end

    subgraph L1["Domain (innermost)"]
        ENT["Entities & Aggregates"]
        VO["Value Objects"]
        POL["Domain Policies / Invariants"]
        EVT["Domain Events"]
    end

    NX --> CTRL --> UC
    UC --> PORT
    REPO -. implements .-> PORT
    GW -. implements .-> PORT
    PR --> REPO
    ORC --> GW
    QDC --> GW
    PWC --> GW
    BM --> CTRL
    UC --> ENT & VO & POL
    ENT --> EVT
    PRES --> CTRL
```

**Dependency rule enforcement:** ports are TypeScript interfaces declared in the application layer; concrete adapters live in infrastructure and are wired by a composition root (DI container) at process start. Module-boundary linting (e.g. `eslint-plugin-boundaries` / `dependency-cruiser`) fails CI if domain imports infrastructure.

### 2.1 Anatomy of one use case (example: "Generate Hooks")

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant RH as Route Handler
    participant UC as GenerateHooks UseCase
    participant POL as CreditPolicy
    participant JOB as JobRepository
    participant BUS as EventBus (BullMQ)
    participant W as Worker / LangGraph
    participant AI as AiGateway→OpenRouter
    participant VS as VectorStore→Qdrant
    participant DB as Repositories→Postgres

    C->>RH: POST /api/creative/hooks {productId, briefId}
    RH->>UC: execute(cmd, ctx{orgId,userId})
    UC->>POL: assertCanSpend(orgId, cost)
    POL-->>UC: ok (reserve credits)
    UC->>JOB: create(job, status=queued)
    UC->>BUS: publish(HooksRequested)
    UC-->>RH: 202 Accepted {jobId}
    RH-->>C: {jobId}
    BUS->>W: consume(HooksRequested)
    W->>VS: retrieve(productContext, personas)
    W->>AI: generate(hookPrompt, model=router.pick("creative"))
    AI-->>W: hooks[]
    W->>DB: save(hooks), job.status=completed
    W->>BUS: publish(HooksGenerated)
    C->>RH: GET /api/jobs/{jobId} (poll/SSE)
    RH-->>C: {status: completed, result}
```

---

## 3. Service (Application) Architecture

Each bounded context exposes a thin set of **application services** that orchestrate domain logic and ports. Controllers never touch repositories or Prisma directly.

```mermaid
flowchart TB
    subgraph CtxCreative["creative context"]
        CS["CreativeService"]
        HUC["GenerateHooksUseCase"]
        AUC["GenerateAnglesUseCase"]
        UUC["GenerateUGCConceptsUseCase"]
    end
    subgraph Shared["shared kernel"]
        CREDIT["CreditPolicy"]
        EVTBUS["EventBus"]
        AIGW["AiGateway"]
        VEC["VectorStore"]
        REPOS["Repositories"]
    end
    CS --> HUC & AUC & UUC
    HUC & AUC & UUC --> CREDIT & EVTBUS & AIGW & VEC & REPOS
```

**Service rules:**
- One use case = one transaction boundary (where DB writes occur synchronously).
- Use cases are **pure orchestration**; business invariants live in the aggregate.
- Cross-context calls go through the other context's **public application service** or via an event — never by reaching into its repository or tables.
- All AI/scrape side effects are deferred to workers via events; use cases only *reserve* resources and enqueue.

---

## 4. Event-Driven Design

### 4.1 Event taxonomy

| Type | Example | Transport | Consumer |
|------|---------|-----------|----------|
| **Command event** (work to do) | `HooksRequested`, `PageAuditRequested`, `ProductScrapeRequested` | BullMQ queue | Worker |
| **Domain event** (fact that happened) | `HooksGenerated`, `SubscriptionActivated`, `CreditsExhausted` | BullMQ topic + outbox | Workers, notifications, n8n, PostHog |
| **Integration event** (external) | Payment webhook, n8n trigger | Route Handler → internal event | Application services |

### 4.2 Queues

```mermaid
flowchart LR
    subgraph Queues["BullMQ Queues (Redis)"]
        QA["ai.generation"]
        QS["scrape.jobs"]
        QE["email.outbound"]
        QI["index.embeddings"]
        QW["webhooks.inbound"]
        QD["dead-letter"]
    end
    PROD["Producers: Route Handlers / Use Cases"] --> QA & QS & QE & QI & QW
    QA & QS & QE & QI & QW -- exhausted retries --> QD
    QA --> WK1["AI Workers (concurrency N)"]
    QS --> WK2["Scrape Workers (concurrency M, isolated)"]
    QI --> WK3["Embedding Workers"]
    QE --> WK4["Email Workers"]
```

**Reliability patterns:**
- **Transactional outbox:** domain events are written to an `outbox` table in the same Postgres transaction as the state change; a relay publishes them to BullMQ. Guarantees no lost events on crash.
- **Idempotency:** every job carries an idempotency key (`orgId + useCase + inputHash`); consumers no-op on duplicates.
- **Retries with backoff + DLQ:** transient failures retry (exponential); poisoned jobs land in dead-letter for inspection.
- **Per-tenant fairness:** queue rate-limiting keyed by `orgId` prevents one heavy tenant starving others.

---

## 5. Multi-Tenant Architecture

**Model:** shared DB / shared schema / **row-level tenancy** keyed by `organizationId` (pool model). Chosen for cost and operational simplicity on a VPS; the data-access layer makes isolation automatic and the model can graduate to schema-per-tenant for enterprise without domain changes.

```mermaid
flowchart TB
    REQ["Incoming request"] --> AUTH["Auth.js session → {userId}"]
    AUTH --> TEN["TenantResolver → active organizationId + role"]
    TEN --> CTX["RequestContext { orgId, userId, role, plan }"]
    CTX --> UC["Use Case"]
    UC --> GUARD["Tenant-Scoped Repository (injects orgId into every query)"]
    GUARD --> RLS["Postgres Row-Level Security (belt + suspenders)"]
    RLS --> PG[("PostgreSQL")]
    UC --> VG["Vector queries filtered by org payload"]
    VG --> QD[("Qdrant")]
```

**Three isolation layers (defense in depth):**
1. **Application:** `RequestContext.orgId` is mandatory; repositories refuse to build a query without it.
2. **Database:** Postgres **Row-Level Security** policies on every tenant table using a `current_setting('app.org_id')` GUC set per connection/transaction. Even a forgotten `WHERE` cannot leak rows.
3. **Vector store:** each `organizationId` is a **payload filter** (and optionally a dedicated Qdrant collection for large tenants); retrieval always filters by org.

**Tenant-aware concerns:** rate limits, credit ledgers, feature flags, and usage metrics are all keyed by `organizationId`. Background jobs carry `orgId` in their payload and re-establish the RLS GUC before any query.

**Noisy-neighbor controls:** per-org queue concurrency caps, per-org token-bucket rate limits in Redis, and plan-based credit ceilings.

---

## 6. Caching Strategy

| Layer | Cache | TTL / Invalidation |
|-------|-------|--------------------|
| RSC / fetch | Next.js Data Cache + tags | Tag-based revalidation on mutation |
| Hot reads (org settings, plan, flags) | Redis | Write-through on update |
| Expensive AI outputs | Postgres (persisted) + content-hash dedupe | Reuse identical (prompt+model+input) results |
| Vector retrieval | Redis (short TTL) keyed by query hash | 5–15 min |
| Rate-limit / idempotency | Redis | Sliding window |

Identical AI requests (same normalized input + model + prompt version) return a **cached generation** rather than re-billing tokens — a direct cost lever (see [08](./08-deployment-and-ops.md)).
