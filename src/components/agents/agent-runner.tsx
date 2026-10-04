"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Workflow, Loader2, ChevronDown, CheckCircle2, XCircle, Circle, LayoutTemplate } from "lucide-react";
import type { AgentRunStatus } from "@prisma/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runCampaignAction, buildLandingFromRunAction } from "@/app/actions/agents";
import type { AgentRunView, AgentStepView } from "@/agents";

const AGENT_LABEL: Record<string, string> = {
  product: "Product Agent",
  research: "Research Agent",
  psychology: "Customer Psychology Agent",
  competitor: "Competitor Agent",
  creative: "Creative Agent",
  copywriter: "Copywriter Agent",
  landing: "Landing Page Agent",
  audit: "Audit Agent",
};

const STATUS_BADGE: Record<AgentRunStatus, { variant: "draft" | "active" | "archived" | "gold"; label: string }> = {
  PENDING: { variant: "draft", label: "Pending" },
  PROCESSING: { variant: "gold", label: "Processing" },
  COMPLETED: { variant: "active", label: "Completed" },
  FAILED: { variant: "archived", label: "Failed" },
};

function usd(n: number): string {
  return n >= 0.01 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

function humanizeKey(k: string): string {
  return k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/** Renders an agent's structured output as readable sections instead of JSON. */
function PrettyValue({ value }: { value: unknown }) {
  if (value == null || value === "") return <span className="text-muted">—</span>;
  if (typeof value === "boolean")
    return value ? (
      <span className="font-medium text-green-600">✓ Yes</span>
    ) : (
      <span className="font-medium text-red-500">✗ No</span>
    );
  if (typeof value === "number" || typeof value === "string")
    return <span className="whitespace-pre-wrap">{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">—</span>;
    if (isStringArray(value))
      return (
        <ul className="list-disc space-y-1 pl-5">
          {value.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      );
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-hairline bg-white/60 p-2.5">
            <PrettyObject obj={item} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") return <PrettyObject obj={value} />;
  return <span>{String(value)}</span>;
}

function PrettyObject({ obj }: { obj: unknown }) {
  if (obj == null || typeof obj !== "object") return <PrettyValue value={obj} />;
  return (
    <div className="space-y-3">
      {Object.entries(obj as Record<string, unknown>).map(([k, v]) => (
        <div key={k}>
          <div className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-gold-500">
            {humanizeKey(k)}
          </div>
          <div className="text-sm leading-relaxed text-body">
            <PrettyValue value={v} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StepIcon({ status }: { status: AgentRunStatus }) {
  if (status === "COMPLETED") return <CheckCircle2 size={16} className="text-green-600" />;
  if (status === "FAILED") return <XCircle size={16} className="text-red-500" />;
  if (status === "PROCESSING") return <Loader2 size={16} className="animate-spin text-gold-500" />;
  return <Circle size={16} className="text-muted" />;
}

/** One-click: turn the Landing agent's design (+ the whole run) into a real page. */
function BuildLandingButton({ projectId, runId }: { projectId: string; runId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onBuild() {
    setError(null);
    start(async () => {
      const r = await buildLandingFromRunAction(projectId, runId);
      if (r.ok) setDone(true);
      else setError(r.error.message);
    });
  }

  return (
    <div className="border-t border-hairline px-4 py-2.5">
      {done ? (
        <Link
          href={`/projects/${projectId}/landing`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:underline"
        >
          <CheckCircle2 size={15} /> Landing page created — open the builder →
        </Link>
      ) : (
        <button
          onClick={onBuild}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3.5 py-1.5 text-sm font-semibold text-green-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <LayoutTemplate size={14} />}
          Build this landing page
        </button>
      )}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function StepRow({ step, projectId, runId }: { step: AgentStepView; projectId: string; runId: string }) {
  const [open, setOpen] = useState(false);
  const tokens = step.inputTokens + step.outputTokens;
  return (
    <li className="rounded-xl border border-hairline">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <StepIcon status={step.status} />
        <span className="flex-1 text-sm font-semibold text-ink">{AGENT_LABEL[step.agent] ?? step.agent}</span>
        {step.status === "COMPLETED" && (
          <span className="hidden font-mono text-[11px] text-muted sm:inline">
            {tokens.toLocaleString()} tok · {usd(step.costUsd)}
            {step.attempts > 1 ? ` · ${step.attempts}×` : ""}
          </span>
        )}
        {step.output != null && <ChevronDown size={15} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && step.output != null && (
        <div className="max-h-96 overflow-auto border-t border-hairline bg-cream-100 px-4 py-3">
          <PrettyObject obj={step.output} />
        </div>
      )}
      {step.error && <p className="border-t border-hairline px-3 py-2 text-xs text-red-500">{step.error}</p>}
      {step.agent === "landing" && step.status === "COMPLETED" && step.output != null && (
        <BuildLandingButton projectId={projectId} runId={runId} />
      )}
    </li>
  );
}

/** Run the campaign agent graph and show the pipeline with live cost/tokens. */
export function AgentRunner({ projectId, initialRun }: { projectId: string; initialRun: AgentRunView | null }) {
  const router = useRouter();
  const [run, setRun] = useState<AgentRunView | null>(initialRun);
  const [goal, setGoal] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRun() {
    setError(null);
    start(async () => {
      const r = await runCampaignAction(projectId, goal);
      if (r.ok) {
        setRun(r.data);
        router.refresh();
      } else setError(r.error.message);
    });
  }

  const totalTokens = run ? run.totalInputTokens + run.totalOutputTokens : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Campaign goal" hint="What should the agents optimize for?">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Launch a bundle offer for new customers"
            />
          </Field>
        </div>
        <Button variant="gold" size="lg" onClick={onRun} disabled={pending}>
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Running agents…
            </>
          ) : (
            <>
              <Workflow size={16} /> Run agent workflow
            </>
          )}
        </Button>
      </div>
      {pending && (
        <p className="text-xs text-muted">
          Running 8 agents in sequence (~1–3 min). Each grounds itself in your knowledge base, then hands
          off to the next.
        </p>
      )}
      {error && <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>}

      {run && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-cream-100 px-4 py-3">
            <Badge variant={STATUS_BADGE[run.status].variant}>{STATUS_BADGE[run.status].label}</Badge>
            <span className="font-mono text-xs text-body">
              {run.steps.filter((s) => s.status === "COMPLETED").length}/{run.steps.length} agents
            </span>
            <span className="font-mono text-xs text-body">{totalTokens.toLocaleString()} tokens</span>
            <span className="font-mono text-xs font-semibold text-ink">{usd(run.totalCostUsd)} est.</span>
            {run.error && <span className="text-xs text-red-500">{run.error}</span>}
          </div>

          <ol className="flex flex-col gap-2">
            {run.steps.map((s) => (
              <StepRow key={s.id} step={s} projectId={projectId} runId={run.id} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
