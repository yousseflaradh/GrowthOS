# 06 — User Flows

Covers: end-to-end user journeys across the platform.

---

## 1. Personas

| Persona | Goal | Primary flows |
|---------|------|---------------|
| **Solo DTC operator** | Launch & optimize one store fast | Onboard → product → research → creative → landing |
| **Agency strategist** | Run many client brands | Multi-org/workspaces, research, creative at scale |
| **CRO specialist** | Improve existing pages | Audit → recommendations → re-test |
| **Org owner/admin** | Manage team, billing, usage | Invites, roles, plan, credit monitoring |

---

## 2. Onboarding & Org Setup

```mermaid
flowchart TB
    A([Visit / Sign up]) --> B["Auth.js: email magic-link / OAuth"]
    B --> C{First login?}
    C -->|yes| D["Create Organization (becomes OWNER)"]
    C -->|no| E["Select active org (org switcher)"]
    D --> F["Pick plan / start trial → grants credits"]
    F --> G["Guided setup: add first product"]
    E --> H([Dashboard])
    G --> H
```

---

## 3. Core Value Loop (product → assets)

```mermaid
flowchart TB
    P([Add / import product]) --> P2{Source?}
    P2 -->|URL| SC["Import job: scrape + normalize (202 → jobId)"]
    P2 -->|manual| MN["Fill product details"]
    SC --> RDY["Product ready"]
    MN --> RDY
    RDY --> R["Generate Customer Research (async)"]
    R --> RV["Review personas, pains, competitors"]
    RV --> BRIEF["Create Creative Brief (audience, tone, offer)"]
    BRIEF --> GEN["Generate angles → hooks → UGC (async)"]
    GEN --> CUR["Review, score, favorite assets"]
    CUR --> LP["Generate Landing Page from chosen angle/hooks (async)"]
    LP --> EDIT["Edit blocks (draft) / HITL review"]
    EDIT --> PUB["Publish / export"]
    PUB --> DONE([Assets ready to run])
```

**Async UX contract:** every "Generate" action returns immediately with a job; the UI shows a progress card (SSE/poll), and the result streams into place. The user can navigate away and return — jobs are durable.

---

## 4. Audit & CRO Loop

```mermaid
flowchart TB
    A([Paste page URL or pick internal page]) --> RUN["Start Audit (202 → jobId)"]
    RUN --> SCR["Scrape + normalize snapshot"]
    SCR --> AN["AI analysis + deterministic scoring"]
    AN --> REP["Audit report: score breakdown + prioritized findings"]
    REP --> ACT{Act on findings}
    ACT -->|apply| FIX["Generate improved copy / new landing version"]
    ACT -->|re-test| RUN
    FIX --> RETEST["Re-audit to confirm score lift"]
    RETEST --> A
```

---

## 5. Generation Job — UX states

```mermaid
stateDiagram-v2
    [*] --> Submitting
    Submitting --> Queued: 202 jobId
    Queued --> Running: worker picks up
    Running --> Streaming: SSE progress (node, pct)
    Streaming --> Completed: result rendered
    Running --> Failed: error (credits refunded)
    Queued --> Cancelled: user cancels
    Failed --> [*]
    Completed --> [*]
    Cancelled --> [*]
    note right of Failed
        Reserved credits are released.
        User sees actionable error + retry.
    end note
```

---

## 6. Team & Billing

```mermaid
flowchart TB
    O([Owner/Admin]) --> INV["Invite member (email + role)"]
    INV --> ACC["Invitee accepts → Membership created"]
    O --> ROLE["Change roles / remove members"]
    O --> BILL["View plan + credit balance + usage"]
    BILL --> LOW{Credits low?}
    LOW -->|yes| UP["Upgrade plan / buy credits → checkout"]
    UP --> WH["Payment webhook → grant credits"]
    LOW -->|no| OK([Continue working])
    WH --> OK
```

**Credit-exhaustion UX:** when a generation would exceed balance, the action is blocked *before* enqueue with a clear upgrade prompt (never a silent failure mid-job). In-flight jobs that hit `CreditsExhausted` fail gracefully and refund the reservation.

---

## 7. Role-based capability matrix

| Capability | OWNER | ADMIN | EDITOR | VIEWER |
|-----------|:----:|:----:|:----:|:----:|
| View assets | ✅ | ✅ | ✅ | ✅ |
| Generate (spend credits) | ✅ | ✅ | ✅ | ❌ |
| Publish landing page | ✅ | ✅ | ✅ | ❌ |
| Manage products | ✅ | ✅ | ✅ | ❌ |
| Invite / manage members | ✅ | ✅ | ❌ | ❌ |
| Billing & plan | ✅ | ❌ | ❌ | ❌ |
| Delete org | ✅ | ❌ | ❌ | ❌ |
