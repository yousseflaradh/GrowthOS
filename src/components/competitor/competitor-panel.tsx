"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Loader2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { runCompetitorAnalysisAction } from "@/app/actions/competitor";

/** Add a competitor by URL → scrape + full competitive analysis. */
export function CompetitorPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRun() {
    setError(null);
    start(async () => {
      const r = await runCompetitorAnalysisAction(projectId, url, name || undefined);
      if (r.ok) {
        setUrl("");
        setName("");
        router.refresh();
      } else setError(r.error.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Point us at a competitor&apos;s page. We scrape it and break down their offer, pricing, creative,
        positioning — plus a SWOT you can act on.
      </p>
      {error && <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>}

      <Field label="Competitor URL">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://competitor.com" />
      </Field>
      <Field label="Name (optional)" hint="Defaults to the domain.">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Competitor Inc." />
      </Field>

      <Button variant="gold" size="lg" onClick={onRun} disabled={pending || !url.trim()}>
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Analyzing… (~60–90s)
          </>
        ) : (
          <>
            <Crosshair size={16} /> Analyze competitor
          </>
        )}
      </Button>
      <p className="text-xs text-muted">Scrapes their live page, then runs the competitive analysis.</p>
    </div>
  );
}
