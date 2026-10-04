"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, PencilLine, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { runAnalysisAction } from "@/app/actions/analysis";
import { generateDescriptionAction, generateFeaturesAction } from "@/app/actions/generation";
import { cn } from "@/lib/utils";

export function AnalyzePanel({
  projectId,
  projectName,
  defaultUrl,
  hasExisting,
}: {
  projectId: string;
  projectName: string;
  defaultUrl: string | null;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "manual">(defaultUrl ? "url" : "manual");

  // Manual-mode controlled fields (so the AI helpers can fill them).
  const [photo, setPhoto] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");

  const [pending, start] = useTransition();
  const [genDescPending, startGenDesc] = useTransition();
  const [genFeatPending, startGenFeat] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const values = {
      mode,
      url: String(fd.get("url") ?? ""),
      description,
      features,
      extraNotes: String(fd.get("extraNotes") ?? ""),
    };
    start(async () => {
      const res = await runAnalysisAction(projectId, values);
      if (res.ok) {
        router.push(`/projects/${projectId}/analysis`);
        router.refresh();
      } else {
        setError(res.error.message);
        setFieldErrors(res.error.fieldErrors ?? {});
      }
    });
  }

  function onGenerateDescription() {
    setError(null);
    startGenDesc(async () => {
      const res = await generateDescriptionAction({ image: photo, productName: projectName });
      if (res.ok) setDescription(res.data.description);
      else setError(res.error.message);
    });
  }

  function onGenerateFeatures() {
    setError(null);
    startGenFeat(async () => {
      const res = await generateFeaturesAction({ image: photo || undefined, description });
      if (res.ok) setFeatures(res.data.features.join("\n"));
      else setError(res.error.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex gap-2">
        <ModeButton active={mode === "url"} onClick={() => setMode("url")} icon={<Link2 size={15} />}>
          From URL
        </ModeButton>
        <ModeButton active={mode === "manual"} onClick={() => setMode("manual")} icon={<PencilLine size={15} />}>
          Manual
        </ModeButton>
      </div>

      {error && (
        <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>
      )}

      {mode === "url" ? (
        <Field label="Product URL" htmlFor="url" error={fieldErrors.url?.[0]} hint="We’ll scrape the page for title, description, features, and reviews.">
          <Input id="url" name="url" type="url" defaultValue={defaultUrl ?? ""} placeholder="https://store.com/product" />
        </Field>
      ) : (
        <>
          {/* Photo + AI helpers */}
          <Field label="Product photo" hint="Upload a photo, then let AI draft the description & features.">
            <ImageUpload name="photo" shape="square" onChange={setPhoto} />
          </Field>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateDescription}
            disabled={!photo || genDescPending}
          >
            {genDescPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Generate description from photo
          </Button>

          <Field label="Product description" htmlFor="description" error={fieldErrors.description?.[0]}>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product, what it does, and who it's for…"
              className="min-h-28"
            />
          </Field>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateFeatures}
            disabled={(!photo && !description.trim()) || genFeatPending}
          >
            {genFeatPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Generate features from photo & description
          </Button>

          <Field label="Key features" htmlFor="features" hint="One per line.">
            <Textarea
              id="features"
              name="features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder={"Waterproof\nLasts 12 hours\nMade from recycled materials"}
            />
          </Field>

          <Field label="Extra notes" htmlFor="extraNotes" hint="Optional — audience, price point, positioning.">
            <Input id="extraNotes" name="extraNotes" placeholder="Premium skincare, ~$45, targets women 30–45" />
          </Field>
        </>
      )}

      <Button type="submit" variant="gold" size="lg" disabled={pending}>
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Analyzing… (~20s)
          </>
        ) : (
          <>
            <Sparkles size={16} /> {hasExisting ? "Re-run analysis" : "Analyze product"}
          </>
        )}
      </Button>
      {pending && (
        <p className="text-center text-xs text-muted">Generating customer intelligence…</p>
      )}
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
        active ? "border-gold-500 bg-gold-500/10 text-ink" : "border-hairline bg-white text-muted hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
