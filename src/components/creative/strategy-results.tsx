"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Brain,
  Megaphone,
  Sparkles,
  Image as ImageIcon,
  Video,
  Users,
  LayoutGrid,
  Star,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction, updateCreativeItemAction } from "@/app/actions/creative";
import type {
  CreativeStrategyView,
  AngleView,
  HookView,
  UgcConceptView,
  CreativeItemKind,
} from "@/modules/creative";

type Tab = "psychology" | "angles" | "hooks" | "concepts";

export function StrategyResults({
  strategy,
  projectId,
}: {
  strategy: CreativeStrategyView;
  projectId: string;
}) {
  const [angles, setAngles] = useState<AngleView[]>(strategy.angles);
  const [hooks, setHooks] = useState<HookView[]>(strategy.hooks);
  const [ugc, setUgc] = useState<UgcConceptView[]>(strategy.ugcConcepts);
  // Re-sync when a NEW strategy is generated (id/updatedAt change), not on every render.
  useEffect(() => {
    setAngles(strategy.angles);
    setHooks(strategy.hooks);
    setUgc(strategy.ugcConcepts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy.id, strategy.updatedAt]);

  const [tab, setTab] = useState<Tab>("psychology");
  const [, startTx] = useTransition();

  function toggleFav<T extends { id: string; favorite: boolean }>(
    kind: CreativeItemKind,
    id: string,
    setList: React.Dispatch<React.SetStateAction<T[]>>,
  ) {
    let next = false;
    setList((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        next = !i.favorite;
        return { ...i, favorite: next };
      }),
    );
    startTx(() => void toggleFavoriteAction(projectId, kind, id, next));
  }

  function saveItem<T extends { id: string }>(
    kind: CreativeItemKind,
    id: string,
    patch: Partial<T>,
    setList: React.Dispatch<React.SetStateAction<T[]>>,
  ) {
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    startTx(() => void updateCreativeItemAction(projectId, kind, id, patch as Record<string, string>));
  }

  const p = strategy.customerPsychology;
  const conceptCount = strategy.staticConcepts.length + strategy.videoConcepts.length + ugc.length;
  const tabs: { id: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: "psychology", label: "Psychology", icon: <Brain size={15} /> },
    { id: "angles", label: "Angles", count: angles.length, icon: <Megaphone size={15} /> },
    { id: "hooks", label: "Hooks", count: hooks.length, icon: <Sparkles size={15} /> },
    { id: "concepts", label: "Concepts", count: conceptCount, icon: <LayoutGrid size={15} /> },
  ];

  return (
    <div>
      <div className="sticky top-16 z-10 -mx-1 mb-6 flex flex-wrap gap-2 bg-cream-50/90 px-1 py-2 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-green-950 text-ondark" : "border border-hairline bg-white text-body hover:text-ink",
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn("font-mono text-xs", tab === t.id ? "text-gold-500" : "text-muted")}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "psychology" && p && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ListCard title="Emotional Triggers" items={p.emotionalTriggers} accent="#d8a94b" />
          <ListCard title="Logical Triggers" items={p.logicalTriggers} accent="#15392b" />
          <ListCard title="Purchase Motivations" items={p.purchaseMotivations} accent="#2e86d8" />
          <ListCard title="Trust Drivers" items={p.trustDrivers} accent="#2f8f4e" />
          <ListCard title="Buying Barriers" items={p.buyingBarriers} accent="#d6483c" />
        </div>
      )}

      {tab === "angles" && (
        <Curated
          items={angles}
          renderEditor={(a, draft, set) => (
            <>
              <Input value={draft.headline ?? a.headline} onChange={(e) => set({ headline: e.target.value })} />
              <Textarea value={draft.description ?? a.description} onChange={(e) => set({ description: e.target.value })} />
            </>
          )}
          renderView={(a) => (
            <>
              <p className="font-semibold text-ink">{a.headline}</p>
              <p className="text-sm text-body">{a.description}</p>
            </>
          )}
          onFav={(id) => toggleFav("angle", id, setAngles)}
          onSave={(id, draft) => saveItem("angle", id, draft, setAngles)}
        />
      )}

      {tab === "hooks" && (
        <Curated
          items={hooks}
          columns
          renderEditor={(h, draft, set) => (
            <Textarea value={draft.text ?? h.text} onChange={(e) => set({ text: e.target.value })} />
          )}
          renderView={(h) => <p className="text-sm text-body">“{h.text}”</p>}
          onFav={(id) => toggleFav("hook", id, setHooks)}
          onSave={(id, draft) => saveItem("hook", id, draft, setHooks)}
        />
      )}

      {tab === "concepts" && (
        <div className="flex flex-col gap-6">
          <ConceptGroup label="Static Ads" icon={<ImageIcon size={14} />} count={strategy.staticConcepts.length}>
            {strategy.staticConcepts.map((c, i) => (
              <ReadonlyConcept key={i} title={c.title} body={c.description} hooks={c.hooks} />
            ))}
          </ConceptGroup>
          <ConceptGroup label="Video Ads" icon={<Video size={14} />} count={strategy.videoConcepts.length}>
            {strategy.videoConcepts.map((c, i) => (
              <ReadonlyConcept key={i} title={c.title} body={c.description} hooks={c.hooks} />
            ))}
          </ConceptGroup>
          <div>
            <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-body">
              <span className="text-gold-500">
                <Users size={14} />
              </span>
              UGC Concepts <span className="text-muted">{ugc.length}</span>
            </p>
            <Curated
              items={ugc}
              hideCategories
              renderEditor={(u, draft, set) => (
                <>
                  <Input value={draft.title ?? u.title} onChange={(e) => set({ title: e.target.value })} />
                  <Textarea value={draft.concept ?? u.concept} onChange={(e) => set({ concept: e.target.value })} />
                </>
              )}
              renderView={(u) => (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{u.title}</p>
                    {u.format && (
                      <Badge variant="gold" size="sm" className="normal-case tracking-normal">
                        {u.format}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-body">{u.concept}</p>
                  <ConceptHooks hooks={u.hooks} />
                </>
              )}
              onFav={(id) => toggleFav("ugc", id, setUgc)}
              onSave={(id, draft) => saveItem("ugc", id, draft, setUgc)}
            />
          </div>
        </div>
      )}

      <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-muted">
        {strategy.model ? `Model: ${strategy.model}` : ""}
      </p>
    </div>
  );
}

/** Category-filterable, favoritable, editable list. */
function Curated<T extends { id: string; favorite: boolean; category?: string }>({
  items,
  renderView,
  renderEditor,
  onFav,
  onSave,
  columns,
  hideCategories,
}: {
  items: T[];
  renderView: (item: T) => React.ReactNode;
  renderEditor: (item: T, draft: Record<string, string>, set: (p: Record<string, string>) => void) => React.ReactNode;
  onFav: (id: string) => void;
  onSave: (id: string, draft: Record<string, string>) => void;
  columns?: boolean;
  hideCategories?: boolean;
}) {
  const [cat, setCat] = useState("All");
  const [favOnly, setFavOnly] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const categories = hideCategories ? [] : [...new Set(items.map((i) => i.category || "Other"))];
  const filtered = items.filter(
    (i) => (cat === "All" || (i.category || "Other") === cat) && (!favOnly || i.favorite),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {!hideCategories && (
          <>
            <Chip active={cat === "All"} onClick={() => setCat("All")}>
              All <span className="text-muted">{items.length}</span>
            </Chip>
            {categories.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
              </Chip>
            ))}
          </>
        )}
        <Chip active={favOnly} onClick={() => setFavOnly((v) => !v)}>
          <Star size={11} fill={favOnly ? "currentColor" : "none"} /> Favorites
        </Chip>
      </div>

      <div className={cn("grid gap-3", columns && "md:grid-cols-2")}>
        {filtered.map((item) => {
          const editing = editId === item.id;
          return (
            <Card key={item.id} className={cn(item.favorite && "ring-1 ring-gold-500")}>
              <CardBody className="py-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <div className="flex flex-col gap-2">{renderEditor(item, draft, (p) => setDraft((d) => ({ ...d, ...p })))}</div>
                    ) : (
                      renderView(item)
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onSave(item.id, draft);
                            setEditId(null);
                          }}
                          className="rounded p-1 text-green-600 hover:bg-greentint"
                          aria-label="Save"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="rounded p-1 text-muted hover:bg-cream-100"
                          aria-label="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onFav(item.id)}
                          className={cn("rounded p-1", item.favorite ? "text-gold-500" : "text-muted hover:text-gold-500")}
                          aria-label="Favorite"
                        >
                          <Star size={15} fill={item.favorite ? "currentColor" : "none"} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft({});
                            setEditId(item.id);
                          }}
                          className="rounded p-1 text-muted hover:text-ink"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Nothing here{favOnly ? " — no favorites yet" : ""}.</p>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors",
        active ? "bg-gold-500/20 text-ink ring-1 ring-gold-500" : "border border-hairline bg-white text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function ListCard({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
          <h3 className="font-bold text-ink">{title}</h3>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm text-body">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              {it}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function ConceptGroup({
  label,
  icon,
  count,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-body">
        <span className="text-gold-500">{icon}</span> {label} <span className="text-muted">{count}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ReadonlyConcept({ title, body, hooks }: { title: string; body: string; hooks?: string[] }) {
  return (
    <Card>
      <CardBody>
        <h4 className="font-bold text-ink">{title}</h4>
        <p className="mt-1.5 text-sm text-body">{body}</p>
        <ConceptHooks hooks={hooks} />
      </CardBody>
    </Card>
  );
}

/** The hooks/taglines to run with a concept — the actionable copy. */
function ConceptHooks({ hooks }: { hooks?: string[] }) {
  if (!hooks?.length) return null;
  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Hooks to run</p>
      <ul className="flex flex-col gap-1.5">
        {hooks.map((h, i) => (
          <li key={i} className="flex gap-2 text-sm text-body">
            <span className="text-gold-500">“</span>
            <span className="italic">{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
