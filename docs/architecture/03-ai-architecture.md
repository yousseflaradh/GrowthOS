# 03 — AI Architecture & LangGraph Workflows

Covers: AI architecture, LangGraph workflow diagrams, RAG design, model routing, cost & safety controls.

---

## 1. AI Layering

AI is a dedicated architectural layer with four sub-layers, all running inside **workers** (never the request path):

```mermaid
flowchart TB
    subgraph Orchestration["1 · Orchestration — LangGraph"]
        G["Stateful graphs per use case\n(nodes, edges, checkpoints, HITL)"]
    end
    subgraph Reasoning["2 · Reasoning — LangChain + Model Router"]
        R["Prompt templates (versioned)\nStructured output (Zod/JSON schema)\nModel Router → OpenRouter"]
    end
    subgraph Knowledge["3 · Knowledge — RAG"]
        K["Embedder · Qdrant retriever\nGrounding context builder"]
    end
    subgraph Tools["4 · Tools / Actions"]
        T["scrape · normalize · score\nweb-research · persist · embed"]
    end
    G --> R --> K
    R --> T
    G --> T
```

**Principles:**
- **Structured-output everywhere.** Every LLM call returns schema-validated JSON (Zod). No free-text parsing into the domain.
- **Versioned prompts.** Prompts are content-addressed assets (`promptVersion`) stored in the repo; every generation records which version produced it.
- **Determinism knobs.** Temperature, model, and seed (where supported) are part of the recorded `model_meta` for reproducibility and A/B testing.
- **Grounding-first.** Generative tasks retrieve product facts + research + brand voice from Qdrant before generating, reducing hallucination.

---

## 2. Model Router (OpenRouter)

A single internal `AiGateway` port; the **Model Router** picks a model per task class to balance cost vs. quality, with failover.

```mermaid
flowchart LR
    REQ["AI request {taskClass, tokens, qualityTier}"] --> ROUTER{Model Router}
    ROUTER -->|"cheap/extraction\n(normalize, classify)"| M1["small fast model"]
    ROUTER -->|"creative\n(hooks, angles, UGC)"| M2["mid creative model"]
    ROUTER -->|"reasoning\n(research, audit synthesis)"| M3["frontier model"]
    ROUTER -->|"embeddings"| M4["embedding model"]
    M1 & M2 & M3 --> OR["OpenRouter"]
    OR -->|provider error / 429| FB["Failover model in same tier"]
    OR --> RESP["Validated structured output"]
```

**Router inputs:** task class, required quality tier (from plan), input size, and current cost budget. **Policies:** prefer cheapest model that passes a quality bar for the task; escalate tier on validation failure or low self-eval score; hard fail-over to an alternate provider on 5xx/429.

---

## 3. RAG Architecture

```mermaid
flowchart TB
    subgraph Ingest["Indexing pipeline (async)"]
        SRC["Source: product, snapshot, brand doc, prior research"]
        CHUNK["Chunker (semantic, overlap)"]
        EMB["Embedder (OpenRouter)"]
        UP["Upsert → Qdrant (payload: orgId, sourceRef, type)"]
        SRC --> CHUNK --> EMB --> UP
    end
    subgraph Retrieve["Retrieval (at generation time)"]
        Q["Query built from task + product"]
        QEMB["Embed query"]
        SEARCH["Qdrant search\nfilter: orgId == ctx.orgId"]
        RERANK["Optional rerank + dedupe"]
        CTXB["Context builder (token-budgeted)"]
        Q --> QEMB --> SEARCH --> RERANK --> CTXB
    end
    UP -.-> SEARCH
    CTXB --> GEN["LLM generation node"]
```

**Tenant isolation in RAG:** every Qdrant point carries `organizationId` in its payload; every search **must** include the org filter (enforced by the `VectorStore` adapter, not the caller). Large/enterprise tenants can be promoted to a dedicated collection. Re-indexing is always possible from Postgres (chunks are the source of truth).

---

## 4. LangGraph Workflows

Each AI feature is a LangGraph graph with durable checkpoints (so a crash resumes mid-flow) and explicit error/escalation edges.

### 4.1 Customer Research

```mermaid
flowchart TB
    START([Start: productId]) --> LOAD["Load product + snapshot"]
    LOAD --> ENRICH{"Need external signal?"}
    ENRICH -->|yes| WEB["web_research tool\n(reviews, competitors)"]
    ENRICH -->|no| RET
    WEB --> RET["RAG retrieve grounding"]
    RET --> PERS["Generate personas"]
    PERS --> PAIN["Extract pains / desires / objections"]
    PAIN --> COMP["Competitor angle map"]
    COMP --> EVAL{"Self-eval quality bar"}
    EVAL -->|below bar| ESC["Escalate model tier / retry"] --> PERS
    EVAL -->|pass| ASSEM["Assemble ResearchReport (structured)"]
    ASSEM --> PERSIST["Persist + commit credits + embed report"]
    PERSIST --> END([ResearchGenerated event])
```

### 4.2 Creative Generation (Hooks / Angles / UGC)

```mermaid
flowchart TB
    S([Start: briefId]) --> CTX["Load brief + product + research personas"]
    CTX --> RAG["Retrieve brand voice + winning patterns"]
    RAG --> ANG["Generate marketing angles (N)"]
    ANG --> HOOK["Generate hooks per angle"]
    HOOK --> UGC["Generate UGC concepts per angle"]
    UGC --> SCORE["Score & rank (clarity, novelty, fit)"]
    SCORE --> GUARD{"Brand-safety / policy filter"}
    GUARD -->|violations| FIX["Regenerate flagged items"] --> SCORE
    GUARD -->|clean| SAVE["Persist ranked assets + provenance"]
    SAVE --> E([HooksGenerated / AnglesGenerated])
```

### 4.3 Landing Page Generation

```mermaid
flowchart TB
    S([Start: productId + selected angle/hooks]) --> PLAN["Plan page structure (block list)"]
    PLAN --> COPY["Generate copy per block (hero, problem, proof, offer, FAQ, CTA)"]
    COPY --> CRO["Apply CRO heuristics (structured rules)"]
    CRO --> ASSET["Resolve media refs / image prompts"]
    ASSET --> ASSEMBLE["Assemble PageVersion (blocks, ordered)"]
    ASSEMBLE --> REVIEW{"Human-in-the-loop review?"}
    REVIEW -->|edits requested| COPY
    REVIEW -->|approved| PUB["Save draft version (publish is user action)"]
    PUB --> E([LandingPageDrafted])
```

### 4.4 Page Audit / CRO

```mermaid
flowchart TB
    S([Start: targetUrl]) --> SCRAPE["scrape tool (Playwright) → snapshot"]
    SCRAPE --> NORM["Cheerio normalize → structured page model"]
    NORM --> SIG["Collect signals: copy, structure, speed, trust, a11y"]
    SIG --> RAGA["Retrieve CRO best-practice corpus"]
    RAGA --> ANALYZE["LLM analysis → findings (structured)"]
    ANALYZE --> SCOREN["Compute composite score (deterministic)"]
    SCOREN --> REC["Generate prioritized recommendations"]
    REC --> PERSIST["Persist AuditRun + findings"]
    PERSIST --> E([PageAuditCompleted])
```

### 4.5 Graph control features (all graphs)
- **Checkpointing:** state persisted per node → resume after worker crash.
- **Timeouts & budgets:** per-node token/time budget; exceeding budget routes to a graceful-degrade node.
- **Human-in-the-loop:** interrupt nodes pause the graph and await a user decision (landing-page review, audit approval).
- **Idempotency:** graph keyed by `jobId`; re-running a completed job is a no-op.

---

## 5. AI Observability, Cost & Safety

```mermaid
flowchart LR
    CALL["Every LLM/tool call"] --> TRACE["Trace span\n(tokens, latency, model, cost, promptVersion)"]
    TRACE --> METRICS["Prometheus counters/histograms"]
    TRACE --> LEDGER["Credit ledger spend"]
    TRACE --> POSTHOG["PostHog product events"]
    CALL --> GUARD["Safety: PII redaction in, policy filter out, prompt-injection guard on scraped content"]
```

| Concern | Control |
|---------|---------|
| **Cost** | Model routing, output caching by content hash, token budgets, cheap-model pre-pass for extraction, batch embeddings |
| **Quality** | Structured-output validation, self-eval node, tiered escalation, eval suite on prompt changes |
| **Safety** | Input PII redaction, output brand/policy filter, **scraped content treated as untrusted** (prompt-injection isolation), allow-list of tool actions |
| **Reproducibility** | Recorded `model_meta` (model, temp, seed, promptVersion) per generation |
| **Observability** | Per-call tracing → Prometheus/Grafana; spend → ledger; product analytics → PostHog |
| **Failure** | Per-node retries, model failover, DLQ, graceful-degrade nodes that return partial results with a flag |

**Prompt-injection stance:** any text fetched from external storefronts/reviews enters the prompt inside a clearly delimited, untrusted block, and tools the model can invoke are an explicit allow-list — scraped text can never cause credential access, arbitrary fetches, or cross-tenant reads.
