"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Loader2, ArrowRight, RefreshCw, Link2, Palette, Check, Wand2, Image as ImageIcon } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LANDING_THEMES } from "@/modules/landing/application/themes";
import { LANDING_DESIGNS } from "@/modules/landing/application/designs";
import { runLandingPageAction } from "@/app/actions/landing";

/**
 * One button. The AI picks the framework (AIDA/PAS/BAB) automatically and writes
 * all 8 sections from the product analysis (+ creative strategy when present).
 * Regenerating creates a new version — older versions are kept in history.
 */
export function GenerateLanding({
  projectId,
  hasAnalysis,
  hasPage,
}: {
  projectId: string;
  hasAnalysis: boolean;
  hasPage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [refUrls, setRefUrls] = useState("");
  const [theme, setTheme] = useState("auto");
  const [design, setDesign] = useState("auto");
  const [customOn, setCustomOn] = useState(false);
  const [custom, setCustom] = useState({ base: "#0b2218", accent: "#d8a94b", surface: "#fbf6ec" });
  const [aiImages, setAiImages] = useState(true);

  if (!hasAnalysis) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">
          The landing page is written from a completed product analysis. Run the analysis first.
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
    const urls = refUrls
      .split(/[\s,]+/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));
    const themeValue = customOn ? JSON.stringify(custom) : theme;
    start(async () => {
      const r = await runLandingPageAction(projectId, urls, themeValue, aiImages, design);
      if (r.ok) router.refresh();
      else setError(r.error.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        The AI picks the best copywriting framework — AIDA, PAS, or BAB — and writes a full landing
        page: hero, problem, benefits, features, social proof, testimonials, FAQ, and CTA. It pulls
        from your analysis and creative strategy, and studies the landing pages your winning ads
        link to — so the structure matches what already converts in your market.
      </p>
      {error && <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>}

      <div className="rounded-xl border border-hairline bg-cream-50 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <LayoutTemplate size={13} className="text-gold-500" /> Design style
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDesign("auto")}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold ${
              design === "auto" ? "border-gold-500 bg-white text-ink" : "border-hairline bg-white/60 text-body"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-hero text-gold-500">
              <Wand2 size={11} />
            </span>
            Auto
            {design === "auto" && <Check size={13} className="ml-auto text-gold-500" />}
          </button>
          {LANDING_DESIGNS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDesign(d.key)}
              title={d.blurb}
              className={`flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left ${
                design === d.key ? "border-gold-500 bg-white text-ink" : "border-hairline bg-white/60 text-body"
              }`}
            >
              <span className="flex w-full items-center gap-1.5 text-xs font-semibold">
                {d.name}
                {design === d.key && <Check size={13} className="ml-auto shrink-0 text-gold-500" />}
              </span>
              <span className="text-[10px] leading-tight text-muted">{d.blurb}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Controls the page&apos;s layout &amp; typography — independent of colors below. Regenerate with a
          different style to compare.
        </p>
      </div>

      <div className="rounded-xl border border-hairline bg-cream-50 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Palette size={13} className="text-gold-500" /> Color palette
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setTheme("auto");
              setCustomOn(false);
            }}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold ${
              theme === "auto" && !customOn ? "border-gold-500 bg-white text-ink" : "border-hairline bg-white/60 text-body"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-hero text-gold-500">
              <Wand2 size={11} />
            </span>
            Auto (pick for me)
            {theme === "auto" && !customOn && <Check size={13} className="ml-auto text-gold-500" />}
          </button>
          {LANDING_THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTheme(t.key);
                setCustomOn(false);
              }}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold ${
                theme === t.key && !customOn ? "border-gold-500 bg-white text-ink" : "border-hairline bg-white/60 text-body"
              }`}
            >
              <span className="flex shrink-0 overflow-hidden rounded-full border border-hairline">
                {t.swatch.map((c, i) => (
                  <span key={i} className="h-5 w-2" style={{ background: c }} />
                ))}
              </span>
              <span className="truncate">{t.name}</span>
              {theme === t.key && !customOn && <Check size={13} className="ml-auto shrink-0 text-gold-500" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOn(true)}
            className={`col-span-2 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold ${
              customOn ? "border-gold-500 bg-white text-ink" : "border-hairline bg-white/60 text-body"
            }`}
          >
            <span className="flex shrink-0 overflow-hidden rounded-full border border-hairline">
              {[custom.base, custom.accent, custom.surface].map((c, i) => (
                <span key={i} className="h-5 w-2" style={{ background: c }} />
              ))}
            </span>
            Custom colors
            {customOn && <Check size={13} className="ml-auto shrink-0 text-gold-500" />}
          </button>
        </div>

        {customOn && (
          <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-hairline bg-white p-2.5">
            {(
              [
                ["base", "Base / dark"],
                ["accent", "Accent"],
                ["surface", "Surface"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex flex-col items-center gap-1 text-[10px] font-semibold text-body">
                <input
                  type="color"
                  value={custom[k]}
                  onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                  className="h-8 w-full cursor-pointer rounded border border-hairline bg-transparent"
                />
                {label}
              </label>
            ))}
          </div>
        )}

        <p className="mt-2 text-[11px] text-muted">
          Keeps your page from copying the source site&apos;s colors. &quot;Auto&quot; picks a palette to fit the
          product; &quot;Custom&quot; uses your exact colors.
        </p>
      </div>

      <div className="rounded-xl border border-hairline bg-cream-50 p-3">
        <Field
          label={
            <span className="flex items-center gap-1.5">
              <Link2 size={13} className="text-gold-500" /> Reference landing pages
            </span>
          }
          hint="Optional. Paste URLs of winning/competitor pages — the AI tears them down and mirrors what converts."
        >
          <Textarea
            value={refUrls}
            onChange={(e) => setRefUrls(e.target.value)}
            placeholder={"https://gruns.co\nhttps://competitor.com/offer"}
            className="min-h-16 font-mono text-xs"
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-hairline bg-cream-50 p-3 text-sm">
        <input
          type="checkbox"
          checked={aiImages}
          onChange={(e) => setAiImages(e.target.checked)}
          className="h-4 w-4 accent-gold-500"
        />
        <span>
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <ImageIcon size={13} className="text-gold-500" /> Generate AI lifestyle images
          </span>
          <span className="text-[11px] text-muted">Free. Adds lifestyle shots to the bands &amp; gallery (real product photo stays the hero).</span>
        </span>
      </label>

      <Button variant="gold" size="lg" onClick={onGenerate} disabled={pending}>
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Writing page…
          </>
        ) : hasPage ? (
          <>
            <RefreshCw size={16} /> Generate new version
          </>
        ) : (
          <>
            <LayoutTemplate size={16} /> Generate landing page
          </>
        )}
      </Button>
      <p className="text-xs text-muted">
        {hasPage
          ? "Creates a fresh version; previous versions stay in history. (~1 min.)"
          : "One AI pass writes the full page. (~1 min.)"}
      </p>
    </div>
  );
}
