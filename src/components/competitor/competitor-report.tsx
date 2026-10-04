"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Trash2,
  Loader2,
  ChevronDown,
  Package,
  Tag,
  Palette,
  Compass,
  AlertTriangle,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { deleteCompetitorAction } from "@/app/actions/competitor";
import type { CompetitorView } from "@/modules/competitor";

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Accordion list of analyzed competitors, each with the full report. */
export function CompetitorList({ projectId, competitors }: { projectId: string; competitors: CompetitorView[] }) {
  const [open, setOpen] = useState<string | null>(competitors[0]?.id ?? null);

  if (competitors.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-100 text-gold-500">
            <Compass size={22} />
          </span>
          <p className="font-semibold text-ink">No competitors analyzed yet</p>
          <p className="max-w-sm text-sm text-body">
            Add a competitor URL to get their offer, pricing, creative, positioning, and a SWOT breakdown.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {competitors.map((c) => (
        <CompetitorCard
          key={c.id}
          projectId={projectId}
          competitor={c}
          open={open === c.id}
          onToggle={() => setOpen(open === c.id ? null : c.id)}
        />
      ))}
    </div>
  );
}

function CompetitorCard({
  projectId,
  competitor: c,
  open,
  onToggle,
}: {
  projectId: string;
  competitor: CompetitorView;
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const r = c.analysis?.result ?? null;
  const failed = c.analysis?.status === "FAILED";

  function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove ${c.name} and its analyses?`)) return;
    startDelete(async () => {
      const res = await deleteCompetitorAction(projectId, c.id);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hero font-display text-sm font-bold text-gold-500">
          {c.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-bold text-ink">{c.name}</span>
          <span className="block truncate font-mono text-[11px] text-muted">{host(c.url)}</span>
        </span>
        {failed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-redtint px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
            <AlertTriangle size={11} /> Failed
          </span>
        )}
        <span
          onClick={onDelete}
          className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-redtint hover:text-red-500"
          aria-label="Delete competitor"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-gold-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <CardBody className="border-t border-hairline pt-4">
          {failed ? (
            <p className="text-sm text-red-500">{c.analysis?.error ?? "Analysis failed."}</p>
          ) : !r ? (
            <p className="text-sm text-muted">No analysis yet.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-body">{r.summary}</p>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:underline"
              >
                <ExternalLink size={13} /> {c.url}
              </a>

              <div className="grid gap-4 sm:grid-cols-2">
                <Section icon={<Package size={13} />} title="Offer" summary={r.offer.summary}>
                  <Line label="Core offer" text={r.offer.coreOffer} />
                  <Bullets label="Guarantees" items={r.offer.guarantees} />
                  <Bullets label="Bonuses" items={r.offer.bonuses} />
                </Section>
                <Section icon={<Tag size={13} />} title="Pricing" summary={r.pricing.summary}>
                  <Bullets label="Price points" items={r.pricing.pricePoints} />
                  <Line label="Strategy" text={r.pricing.strategy} />
                </Section>
                <Section icon={<Palette size={13} />} title="Creative" summary={r.creative.summary}>
                  <Line label="Tone" text={r.creative.tone} />
                  <Bullets label="Angles" items={r.creative.angles} />
                  <Bullets label="Top hooks" items={r.creative.topHooks.map((h) => `“${h}”`)} />
                </Section>
                <Section icon={<Compass size={13} />} title="Positioning" summary={r.positioning.summary}>
                  <Line label="Target audience" text={r.positioning.targetAudience} />
                  <Line label="Value proposition" text={r.positioning.valueProposition} />
                  <Line label="Differentiation" text={r.positioning.differentiation} />
                </Section>
              </div>

              {/* SWOT 2×2 */}
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">SWOT</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Swot tone="bg-greentint text-green-600" title="Strengths" items={r.swot.strengths} />
                  <Swot tone="bg-redtint text-red-500" title="Weaknesses" items={r.swot.weaknesses} />
                  <Swot tone="bg-cream-100 text-gold-500" title="Opportunities (for you)" items={r.swot.opportunities} />
                  <Swot tone="bg-[#fdeee4] text-orange-500" title="Threats" items={r.swot.threats} />
                </div>
              </div>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}

function Section({
  icon,
  title,
  summary,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-cream-50 p-4">
      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-body">
        <span className="text-gold-500">{icon}</span> {title}
      </p>
      <p className="mb-2 text-sm leading-relaxed text-body">{summary}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-sm text-body">
      <span className="font-semibold text-ink">{label}:</span> {text}
    </p>
  );
}

function Bullets({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-body">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" /> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Swot({ tone, title, items }: { tone: string; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-hairline bg-white p-4">
      <p className={`mb-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone}`}>
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-body">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hairline" /> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
