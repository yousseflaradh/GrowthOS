"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Loader2, Package, MessagesSquare, Crosshair, Trash2, AlertCircle } from "lucide-react";
import type { KnowledgeSourceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ingestKnowledgeAction, deleteDocumentAction } from "@/app/actions/knowledge";
import type { DocumentView } from "@/modules/knowledge";

const SOURCE_META: Record<KnowledgeSourceType, { label: string; icon: typeof Package }> = {
  PRODUCT: { label: "Product", icon: Package },
  REVIEWS: { label: "Reviews", icon: MessagesSquare },
  COMPETITOR: { label: "Competitors", icon: Crosshair },
};

const STATUS_META: Record<DocumentView["status"], { variant: "draft" | "active" | "archived" | "gold"; label: string }> = {
  PENDING: { variant: "draft", label: "Pending" },
  PROCESSING: { variant: "gold", label: "Processing" },
  READY: { variant: "active", label: "Ready" },
  FAILED: { variant: "archived", label: "Failed" },
};

/** Build/refresh the knowledge base and manage ingested documents. */
export function KnowledgePanel({ projectId, documents }: { projectId: string; documents: DocumentView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<KnowledgeSourceType | "ALL" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function ingest(kind: KnowledgeSourceType | "ALL") {
    setError(null);
    setNote(null);
    setBusy(kind);
    start(async () => {
      const sources = kind === "ALL" ? undefined : [kind];
      const r = await ingestKnowledgeAction(projectId, sources);
      setBusy(null);
      if (r.ok) {
        const { chunksWritten, skipped } = r.data;
        setNote(
          chunksWritten > 0
            ? `Embedded ${chunksWritten} chunk${chunksWritten === 1 ? "" : "s"}.`
            : "Nothing new to embed.",
        );
        if (skipped.length) {
          setError(skipped.map((s) => `${SOURCE_META[s.sourceType].label}: ${s.reason}`).join(" · "));
        }
        router.refresh();
      } else setError(r.error.message);
    });
  }

  function remove(documentId: string) {
    setError(null);
    start(async () => {
      const r = await deleteDocumentAction(projectId, documentId);
      if (r.ok) router.refresh();
      else setError(r.error.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Turn this project&apos;s data into AI memory. We embed your product analysis, customer reviews, and
        competitor intel so every tool can retrieve the right context.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SOURCE_META) as KnowledgeSourceType[]).map((kind) => {
          const Icon = SOURCE_META[kind].icon;
          return (
            <Button
              key={kind}
              variant="outline"
              size="sm"
              onClick={() => ingest(kind)}
              disabled={pending}
            >
              {busy === kind ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
              {SOURCE_META[kind].label}
            </Button>
          );
        })}
        <Button variant="dark" size="sm" onClick={() => ingest("ALL")} disabled={pending}>
          {busy === "ALL" ? <Loader2 size={14} className="animate-spin" /> : <Boxes size={14} />}
          Build all
        </Button>
      </div>

      {note && <p className="rounded-xl bg-greentint px-3 py-2 text-sm font-medium text-green-600">{note}</p>}
      {error && (
        <p className="flex items-start gap-1.5 rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </p>
      )}

      <div className="border-t border-hairline pt-3">
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          Documents ({documents.length})
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-muted">No documents yet. Build the knowledge base to get started.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((d) => {
              const Icon = SOURCE_META[d.sourceType].icon;
              const st = STATUS_META[d.status];
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-2 rounded-xl border border-hairline px-3 py-2 text-sm"
                >
                  <Icon size={15} className="shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{d.title}</p>
                    <p className="text-xs text-muted">
                      {d.chunkCount} chunk{d.chunkCount === 1 ? "" : "s"}
                      {d.error ? ` · ${d.error}` : ""}
                    </p>
                  </div>
                  <Badge variant={st.variant} size="sm">
                    {st.label}
                  </Badge>
                  <button
                    onClick={() => remove(d.id)}
                    disabled={pending}
                    className="rounded-lg p-1 text-muted transition-colors hover:bg-redtint hover:text-red-500 disabled:opacity-50"
                    aria-label="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
