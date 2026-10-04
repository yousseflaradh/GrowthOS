"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  Trash2,
  GripVertical,
  ChevronLeft,
  Loader2,
  Save,
  Pencil,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { landingToHtml, sectionToHtml } from "@/lib/landing-html";
import { SECTION_TYPES, SECTION_LABEL } from "@/modules/landing/application/landing-schema";
import { getTheme } from "@/modules/landing/application/themes";
import type { SectionType } from "@/modules/landing/application/landing-schema";
import type { PageVersionView } from "@/modules/landing";
import { saveLandingSectionsAction } from "@/app/actions/landing";
import { SectionEditor, defaultContent } from "@/components/landing/section-editors";

interface EditableSection {
  id: string;
  type: SectionType;
  content: unknown;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 768, mobile: 390 };

/**
 * Full-screen visual landing-page builder. Sections carry stable ids so drag
 * reordering (dnd-kit, real-time animated) and the page↔list highlight stay in
 * sync. The preview is the real export HTML in an iframe.
 */
export function LandingBuilder({
  projectId,
  productName,
  version,
  onExit,
}: {
  projectId: string;
  productName: string;
  version: PageVersionView;
  onExit: () => void;
}) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [sections, setSections] = useState<EditableSection[]>(
    version.sections.map((s) => ({ id: uid(), type: s.type, content: s.content })),
  );
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [dirty, setDirty] = useState(false);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const accent = getTheme(version.theme).vars["--color-gold-500"] ?? "#d8a94b";

  const buildHtml = (secs: EditableSection[]) =>
    landingToHtml(
      {
        ...version,
        sections: secs.map((s, i) => ({ id: s.id, type: s.type, position: i, content: s.content })),
      } as PageVersionView,
      productName,
      { interactive: true, accent },
    );

  // The iframe loads ONCE and only reloads on structural changes (add / delete /
  // reorder). Text edits update the changed section's DOM in place — real-time,
  // no reload, and the edited section stays outlined.
  const structuralKey = sections.map((s) => s.id).join("|");
  const keyRef = useRef(structuralKey);
  const [srcDoc, setSrcDoc] = useState(() => buildHtml(sections));
  useEffect(() => {
    if (structuralKey !== keyRef.current) {
      keyRef.current = structuralKey;
      setSrcDoc(buildHtml(sections));
      return;
    }
    const ed = sections.find((s) => s.id === editingId);
    const idx = ed ? sections.findIndex((s) => s.id === ed.id) : -1;
    if (ed && idx >= 0) {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "lp-parent", type: "update", index: idx, html: sectionToHtml(ed.type, ed.content) },
        "*",
      );
    }
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview → list: a click in the iframe highlights its section here.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (d && d.source === "lp" && d.type === "select" && typeof d.index === "number") {
        setHighlightId(sectionsRef.current[d.index]?.id ?? null);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // List → preview: push the highlight (by current position) into the iframe.
  function postHighlight(idx: number | null) {
    iframeRef.current?.contentWindow?.postMessage({ source: "lp-parent", type: "highlight", index: idx }, "*");
  }
  useEffect(() => {
    const idx = sections.findIndex((s) => s.id === highlightId);
    postHighlight(idx >= 0 ? idx : null);
  }, [highlightId, sections]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = (next: EditableSection[]) => {
    setSections(next);
    setDirty(true);
  };

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    mutate(arrayMove(sections, oldIndex, newIndex));
    setHighlightId(String(active.id));
  }
  function moveBy(id: string, delta: number) {
    const i = sections.findIndex((s) => s.id === id);
    const to = i + delta;
    if (i < 0 || to < 0 || to >= sections.length) return;
    mutate(arrayMove(sections, i, to));
    setHighlightId(id);
  }
  function addSection(type: SectionType) {
    const s = { id: uid(), type, content: defaultContent(type) };
    mutate([...sections, s]);
    setHighlightId(s.id);
  }
  function removeSection(id: string) {
    mutate(sections.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
    if (highlightId === id) setHighlightId(null);
  }

  function save() {
    setError(null);
    start(async () => {
      const payload = sections.map((s) => ({ type: s.type, content: s.content }));
      const r = await saveLandingSectionsAction(projectId, version.id, payload);
      if (r.ok) {
        setDirty(false);
        router.refresh();
      } else setError(r.error.message);
    });
  }

  const width = DEVICE_WIDTH[device];
  const editing = sections.find((s) => s.id === editingId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-cream-50 px-4 py-2.5">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm font-semibold text-body hover:text-gold-500">
          <ChevronLeft size={15} /> Back to preview
        </button>
        <div className="flex items-center gap-1 rounded-lg border border-hairline bg-white p-0.5">
          {([
            ["desktop", Monitor],
            ["tablet", Tablet],
            ["mobile", Smartphone],
          ] as const).map(([d, Icon]) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`grid h-7 w-9 place-items-center rounded-md ${device === d ? "bg-hero text-gold-500" : "text-muted hover:bg-cream-50"}`}
              aria-label={d}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs font-semibold text-orange-500">Unsaved</span>}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-1.5 text-sm font-bold text-hero shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
        </div>
      </div>

      {error && <p className="bg-redtint px-4 py-2 text-sm font-medium text-red-500">{error}</p>}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_1fr]">
        <div className="min-h-0 overflow-y-auto border-b border-hairline lg:border-b-0 lg:border-r">
          {editing === null ? (
            <div className="flex flex-col gap-4 p-4">
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                  Sections · drag to reorder, click to highlight
                </p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-1.5">
                      {sections.map((s) => (
                        <SortableRow
                          key={s.id}
                          section={s}
                          highlighted={highlightId === s.id}
                          onHighlight={() => setHighlightId(s.id)}
                          onEdit={() => {
                            setEditingId(s.id);
                            setHighlightId(s.id);
                          }}
                          onUp={() => moveBy(s.id, -1)}
                          onDown={() => moveBy(s.id, 1)}
                          onDelete={() => removeSection(s.id)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
                {sections.length === 0 && <p className="text-sm text-muted">No sections — add some below.</p>}
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">Add section</p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTION_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => addSection(t)}
                      className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2.5 py-1 text-xs font-semibold text-body hover:border-gold-500 hover:text-ink"
                    >
                      <Plus size={11} /> {SECTION_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <button
                onClick={() => setEditingId(null)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-body hover:text-gold-500"
              >
                <ChevronLeft size={15} /> All sections
              </button>
              <p className="font-display text-lg font-bold text-ink">{SECTION_LABEL[editing.type]}</p>
              <SectionEditor
                type={editing.type}
                content={editing.content}
                onChange={(content) => mutate(sections.map((s) => (s.id === editing.id ? { ...s, content } : s)))}
              />
            </div>
          )}
        </div>

        <div className="flex min-h-[55vh] justify-center overflow-auto bg-cream-100 p-4">
          <iframe
            ref={iframeRef}
            title="Landing preview"
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            onLoad={() => {
              const idx = sectionsRef.current.findIndex((s) => s.id === highlightId);
              postHighlight(idx >= 0 ? idx : null);
            }}
            className="h-full rounded-lg border border-hairline bg-white shadow-md"
            style={{ width: width ? `${width}px` : "100%", maxWidth: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

function SortableRow({
  section,
  highlighted,
  onHighlight,
  onEdit,
  onUp,
  onDown,
  onDelete,
}: {
  section: EditableSection;
  highlighted: boolean;
  onHighlight: () => void;
  onEdit: () => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  // Drag listeners live on the whole row (a 6px threshold lets button clicks
  // through); the action buttons stop pointer propagation so a click on them
  // never starts a drag.
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab items-center gap-2 rounded-lg border px-2.5 py-2 active:cursor-grabbing ${
        isDragging
          ? "border-gold-500 bg-white opacity-80 shadow-lg"
          : highlighted
            ? "border-gold-500 bg-cream-50"
            : "border-hairline bg-white"
      }`}
    >
      <GripVertical size={14} className="shrink-0 text-muted" />
      <button onClick={onHighlight} className="flex-1 truncate text-left text-sm font-semibold text-ink">
        {SECTION_LABEL[section.type]}
      </button>
      <div className="flex shrink-0 items-center">
        <button onPointerDown={stop} onClick={onUp} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-cream-50" aria-label="Move up">
          <ArrowUp size={13} />
        </button>
        <button onPointerDown={stop} onClick={onDown} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-cream-50" aria-label="Move down">
          <ArrowDown size={13} />
        </button>
        <button onPointerDown={stop} onClick={onEdit} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-cream-50 hover:text-gold-500" aria-label="Edit">
          <Pencil size={13} />
        </button>
        <button onPointerDown={stop} onClick={onDelete} className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-redtint hover:text-red-500" aria-label="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  );
}
