"use client";

import { useState, useTransition } from "react";
import { Search, Loader2, Package, MessagesSquare, Crosshair } from "lucide-react";
import type { KnowledgeSourceType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchKnowledgeAction } from "@/app/actions/knowledge";
import type { SearchHit } from "@/modules/knowledge";

const SOURCE_META: Record<KnowledgeSourceType, { label: string; icon: typeof Package }> = {
  PRODUCT: { label: "Product", icon: Package },
  REVIEWS: { label: "Reviews", icon: MessagesSquare },
  COMPETITOR: { label: "Competitor", icon: Crosshair },
};

/** Semantic search over the project's knowledge base. */
export function KnowledgeSearch({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    if (query.trim().length < 2) return;
    setError(null);
    start(async () => {
      const r = await searchKnowledgeAction(projectId, query);
      if (r.ok) setHits(r.data);
      else {
        setError(r.error.message);
        setHits(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Ask the knowledge base… e.g. “what do customers complain about?”"
        />
        <Button variant="gold" onClick={run} disabled={pending || query.trim().length < 2}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </Button>
      </div>

      {error && <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>}

      {hits && hits.length === 0 && (
        <p className="rounded-xl border border-hairline px-4 py-6 text-center text-sm text-muted">
          No matches. Build the knowledge base first, or try a different query.
        </p>
      )}

      {hits && hits.length > 0 && (
        <ul className="flex flex-col gap-3">
          {hits.map((h) => {
            const meta = SOURCE_META[h.sourceType];
            const Icon = meta.icon;
            const pct = Math.round(h.score * 100);
            return (
              <li key={h.chunkId} className="rounded-xl border border-hairline p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Icon size={14} className="text-gold-500" /> {h.title}
                  </span>
                  <Badge variant="gold" size="sm">
                    {meta.label} · {pct}%
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-body line-clamp-6">{h.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
