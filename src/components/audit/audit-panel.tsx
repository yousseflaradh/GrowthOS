"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Loader2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { runAuditAction } from "@/app/actions/audit";

/**
 * Run a CRO audit of any landing-page URL (defaults to the project's product
 * URL). One click → scrape the live page + AI analysis.
 */
export function AuditPanel({ projectId, defaultUrl }: { projectId: string; defaultUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRun() {
    setError(null);
    start(async () => {
      const r = await runAuditAction(projectId, url);
      if (r.ok) router.refresh();
      else setError(r.error.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Audit a live landing page for conversion. We scan the headline, CTAs, trust signals, and mobile UX, then
        score it 0–100 with prioritized fixes.
      </p>
      {error && <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>}

      <Field label="Landing page URL" hint="The live page to audit (yours or a competitor's).">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com/offer" />
      </Field>

      <Button variant="gold" size="lg" onClick={onRun} disabled={pending || !url.trim()}>
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Auditing…
          </>
        ) : (
          <>
            <Gauge size={16} /> Run audit
          </>
        )}
      </Button>
      <p className="text-xs text-muted">Scrapes the live page, then scores it. (~30–60s.)</p>
    </div>
  );
}
