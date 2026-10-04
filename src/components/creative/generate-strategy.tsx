"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowRight, MessagesSquare, Upload } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { importAdsAction, importCommentsAction, fetchIntelAction } from "@/app/actions/intel";
import { runCreativeStrategyAction } from "@/app/actions/creative";

/** Pull a comment string out of a JSON object (common export shapes). */
function pickStr(x: unknown): string {
  if (typeof x === "string") return x;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    for (const k of ["text", "comment", "message", "body", "content", "review"]) {
      if (typeof o[k] === "string") return o[k] as string;
    }
  }
  return "";
}

/** Parse an uploaded comments file (JSON array / CSV / TSV / plain text). */
function fileToComments(text: string): string[] {
  const t = text.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      const j: unknown = JSON.parse(t);
      const arr = Array.isArray(j)
        ? j
        : ((j as Record<string, unknown>).comments ??
            (j as Record<string, unknown>).data ??
            (j as Record<string, unknown>).items ??
            []);
      const out = (Array.isArray(arr) ? arr : []).map(pickStr).filter(Boolean);
      if (out.length) return out;
    } catch {
      /* not JSON, fall through */
    }
  }
  if (t.includes(",") || t.includes("\t")) {
    // CSV/TSV → take the longest cell per row (usually the comment text)
    return t
      .split(/\r?\n/)
      .map((line) =>
        line
          .split(/[,\t]/)
          .map((c) => c.replace(/^"|"$/g, "").trim())
          .sort((a, b) => b.length - a.length)[0] ?? "",
      )
      .filter((s) => s.length > 1);
  }
  return t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Parse an uploaded ads file → blank-line-separated blocks the form expects. */
function fileToAdsText(text: string): string {
  const t = text.trim();
  if (/\n\s*\n/.test(t)) return t; // already paragraph-separated
  return t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n\n");
}

/**
 * One panel, one button. Paste customer comments / competitor ads and/or set an
 * auto-scrape query; clicking "Generate strategy" imports + scrapes + generates
 * in a single flow, so the creative is grounded in real customer language.
 */
export function GenerateStrategy({
  projectId,
  hasAnalysis,
  providerAvailable,
  adCount,
  commentCount,
}: {
  projectId: string;
  hasAnalysis: boolean;
  providerAvailable: boolean;
  adCount: number;
  commentCount: number;
}) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [ads, setAds] = useState("");
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const commentsFileRef = useRef<HTMLInputElement>(null);
  const adsFileRef = useRef<HTMLInputElement>(null);

  function readFile(file: File, onText: (t: string) => void) {
    const reader = new FileReader();
    reader.onload = () => onText(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  }
  function onCommentsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file, (t) => setComments((prev) => (prev ? prev + "\n" : "") + fileToComments(t).join("\n")));
    e.target.value = "";
  }
  function onAdsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file, (t) => setAds((prev) => (prev ? prev + "\n\n" : "") + fileToAdsText(t)));
    e.target.value = "";
  }

  if (!hasAnalysis) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">
          Creative strategy is built from a completed product analysis. Run the analysis first.
        </p>
        <Button asChild variant="gold">
          <Link href={`/projects/${projectId}/analysis`}>
            Go to analysis <ArrowRight size={15} />
          </Link>
        </Button>
      </div>
    );
  }

  function onGenerate() {
    setError(null);
    const warnings: string[] = [];
    start(async () => {
      if (comments.trim()) {
        const r = await importCommentsAction(projectId, comments);
        if (r.ok) setComments("");
        else warnings.push(r.error.message);
      }
      if (ads.trim()) {
        const r = await importAdsAction(projectId, ads);
        if (r.ok) setAds("");
        else warnings.push(r.error.message);
      }
      if (query.trim() && providerAvailable) {
        setStatus("Scraping winning ads (Facebook + TikTok)…");
        const r = await fetchIntelAction(projectId, query);
        if (!r.ok) warnings.push(`Scrape: ${r.error.message}`);
      }

      setStatus("Generating strategy…");
      const gen = await runCreativeStrategyAction(projectId);
      setStatus(null);
      if (gen.ok) {
        setError(warnings.length ? `Generated, but: ${warnings.join(" · ")}` : null);
        router.refresh();
      } else {
        setError([...warnings, gen.error.message].join(" · "));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Generate customer psychology, 20+ angles, 50+ hooks, and 30 concepts — grounded in your
        analysis and any customer voice you add below.
      </p>
      {error && <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>}

      {/* Customer voice (optional) */}
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-cream-50 p-3">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-body">
          <MessagesSquare size={14} className="text-gold-500" /> Customer voice
          <span className="ml-auto text-muted">{commentCount} comments · {adCount} ads</span>
        </p>

        {providerAvailable && (
          <div className="flex flex-col gap-2 border-b border-hairline pb-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
              Research competitor ads · Facebook + TikTok
            </p>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Competitor / niche keyword (e.g. greens powder)"
            />
            <p className="text-[11px] text-muted">
              Pulls rivals&apos; top long-running ads for inspiration. This does NOT set your product —
              that&apos;s defined by this project.
            </p>
          </div>
        )}

        <div>
          <Field label="Customer comments" hint="One per line (from TikTok/FB/IG/reviews).">
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder={"Love it!\nWish it shipped faster"} className="min-h-20" />
          </Field>
          <button
            type="button"
            onClick={() => commentsFileRef.current?.click()}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
          >
            <Upload size={12} /> Upload comments file (.txt/.csv/.json)
          </button>
          <input ref={commentsFileRef} type="file" className="hidden" onChange={onCommentsFile} />
        </div>

        <div>
          <Field label="Competitor ads" hint="Separate each ad with a blank line.">
            <Textarea value={ads} onChange={(e) => setAds(e.target.value)} placeholder={"Ad copy 1…\n\nAd copy 2…"} className="min-h-20" />
          </Field>
          <button
            type="button"
            onClick={() => adsFileRef.current?.click()}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
          >
            <Upload size={12} /> Upload ad copies file
          </button>
          <input ref={adsFileRef} type="file" className="hidden" onChange={onAdsFile} />
        </div>
      </div>

      <Button variant="gold" size="lg" onClick={onGenerate} disabled={pending}>
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> {status ?? "Working…"}
          </>
        ) : (
          <>
            <Sparkles size={16} /> Generate strategy
          </>
        )}
      </Button>
      <p className="text-xs text-muted">
        Imports anything you pasted, scrapes if a query is set, then generates — one click. (~1–2 min.)
      </p>
    </div>
  );
}
