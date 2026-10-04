"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import type { SectionType } from "@/modules/landing";

/* ── reusable field controls ────────────────────────────────── */

type Dict = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): Dict[] => (Array.isArray(v) ? (v as Dict[]) : []);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : []);

function Lbl({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{children}</span>;
}

function Txt({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <Lbl>{label}</Lbl>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <Lbl>{label}</Lbl>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-16" />
    </label>
  );
}

function StrList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Lbl>{label}</Lbl>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={it}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-redtint hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

interface PairField {
  key: string;
  label: string;
  type?: "text" | "area" | "bool";
}

function Pairs({ label, items, fields, onChange, blank }: { label: string; items: Dict[]; fields: PairField[]; onChange: (v: Dict[]) => void; blank: Dict }) {
  const update = (i: number, patch: Dict) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="flex flex-col gap-2">
      <Lbl>{label}</Lbl>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-hairline bg-cream-50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted">#{i + 1}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-redtint hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          </div>
          {fields.map((f) =>
            f.type === "bool" ? (
              <label key={f.key} className="flex items-center gap-2 text-xs font-medium text-body">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-gold-500"
                  checked={Boolean(it[f.key])}
                  onChange={(e) => update(i, { [f.key]: e.target.checked })}
                />
                {f.label}
              </label>
            ) : f.type === "area" ? (
              <Textarea
                key={f.key}
                value={str(it[f.key])}
                placeholder={f.label}
                onChange={(e) => update(i, { [f.key]: e.target.value })}
                className="min-h-14"
              />
            ) : (
              <Input
                key={f.key}
                value={str(it[f.key])}
                placeholder={f.label}
                onChange={(e) => update(i, { [f.key]: e.target.value })}
              />
            ),
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { ...blank }])}
        className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

/* ── per-section editors ────────────────────────────────────── */

export function SectionEditor({ type, content, onChange }: { type: SectionType; content: unknown; onChange: (c: unknown) => void }) {
  const c = (content ?? {}) as Dict;
  const set = (patch: Dict) => onChange({ ...c, ...patch });

  switch (type) {
    case "HERO":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Area label="Subheadline" value={str(c.subheadline)} onChange={(v) => set({ subheadline: v })} />
          <Txt label="CTA button" value={str(c.ctaLabel)} onChange={(v) => set({ ctaLabel: v })} />
          <Txt label="Hero image URL" value={str(c.image)} onChange={(v) => set({ image: v })} placeholder="https://…" />
          <StrList label="Trust badges" items={strArr(c.supportingPoints)} onChange={(v) => set({ supportingPoints: v })} />
        </>
      );
    case "PROBLEM":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Area label="Body" value={str(c.body)} onChange={(v) => set({ body: v })} />
          <StrList label="Pain points" items={strArr(c.painPoints)} onChange={(v) => set({ painPoints: v })} />
        </>
      );
    case "BENEFITS":
    case "FEATURES":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Pairs
            label="Items"
            items={arr(c.items)}
            fields={[{ key: "title", label: "Title" }, { key: "description", label: "Description", type: "area" }]}
            blank={{ title: "", description: "" }}
            onChange={(v) => set({ items: v })}
          />
        </>
      );
    case "COMPARISON":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Txt label="Your product label" value={str(c.productLabel)} onChange={(v) => set({ productLabel: v })} />
          <Txt label="Alternative label" value={str(c.alternativeLabel)} onChange={(v) => set({ alternativeLabel: v })} />
          <Pairs
            label="Rows"
            items={arr(c.rows)}
            fields={[
              { key: "point", label: "Criterion" },
              { key: "hasProduct", label: "Your product wins", type: "bool" },
              { key: "hasAlternative", label: "Alternative has it", type: "bool" },
            ]}
            blank={{ point: "", hasProduct: true, hasAlternative: false }}
            onChange={(v) => set({ rows: v })}
          />
        </>
      );
    case "SOCIAL_PROOF":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Pairs
            label="Stats"
            items={arr(c.stats)}
            fields={[{ key: "value", label: "Value (e.g. 1M+)" }, { key: "label", label: "Label" }]}
            blank={{ value: "", label: "" }}
            onChange={(v) => set({ stats: v })}
          />
          <StrList label="Highlights" items={strArr(c.highlights)} onChange={(v) => set({ highlights: v })} />
        </>
      );
    case "TESTIMONIALS":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Pairs
            label="Reviews"
            items={arr(c.items)}
            fields={[
              { key: "quote", label: "Quote", type: "area" },
              { key: "author", label: "Author" },
              { key: "role", label: "Role (optional)" },
            ]}
            blank={{ quote: "", author: "", role: "" }}
            onChange={(v) => set({ items: v })}
          />
        </>
      );
    case "GUARANTEE":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Area label="Body" value={str(c.body)} onChange={(v) => set({ body: v })} />
          <Txt label="Badge" value={str(c.badge)} onChange={(v) => set({ badge: v })} placeholder="30-Day Money-Back Guarantee" />
        </>
      );
    case "FAQ":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Pairs
            label="Questions"
            items={arr(c.items)}
            fields={[{ key: "question", label: "Question" }, { key: "answer", label: "Answer", type: "area" }]}
            blank={{ question: "", answer: "" }}
            onChange={(v) => set({ items: v })}
          />
        </>
      );
    case "CTA":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Area label="Subheadline" value={str(c.subheadline)} onChange={(v) => set({ subheadline: v })} />
          <Txt label="Button label" value={str(c.buttonLabel)} onChange={(v) => set({ buttonLabel: v })} />
          <Txt label="Urgency (optional)" value={str(c.urgency)} onChange={(v) => set({ urgency: v })} />
        </>
      );
    case "FORM":
      return (
        <>
          <Txt label="Headline" value={str(c.headline)} onChange={(v) => set({ headline: v })} />
          <Area label="Subheadline" value={str(c.subheadline)} onChange={(v) => set({ subheadline: v })} />
          <Txt label="Button label" value={str(c.buttonLabel)} onChange={(v) => set({ buttonLabel: v })} />
          <Txt label="Consent line (optional)" value={str(c.consent)} onChange={(v) => set({ consent: v })} />
        </>
      );
    case "GALLERY":
      return <StrList label="Image URLs" items={strArr(c.images)} onChange={(v) => set({ images: v })} placeholder="https://…" />;
    default:
      return <p className="text-sm text-muted">No editor for this section.</p>;
  }
}

/** Default content for a freshly added section. */
export function defaultContent(type: SectionType): unknown {
  switch (type) {
    case "HERO":
      return { headline: "Your big promise headline", subheadline: "One line on the mechanism + who it's for.", ctaLabel: "Get started", supportingPoints: ["Free shipping", "Money-back guarantee"] };
    case "PROBLEM":
      return { headline: "The problem you solve", body: "Describe the painful status quo.", painPoints: ["Pain one", "Pain two"] };
    case "BENEFITS":
      return { headline: "What you get", items: [{ title: "Benefit", description: "Why it matters." }] };
    case "FEATURES":
      return { headline: "How it works", items: [{ title: "Feature", description: "What it does." }] };
    case "COMPARISON":
      return { headline: "Why us vs. the old way", productLabel: "Us", alternativeLabel: "The old way", rows: [{ point: "Criterion", hasProduct: true, hasAlternative: false }] };
    case "SOCIAL_PROOF":
      return { headline: "Trusted by many", stats: [{ value: "10,000+", label: "Customers" }], highlights: ["Tested", "Certified"] };
    case "TESTIMONIALS":
      return { headline: "What customers say", items: [{ quote: "Great product!", author: "Verified buyer", role: "" }] };
    case "GUARANTEE":
      return { headline: "Risk-free", body: "Try it; if you're not happy, we'll refund you.", badge: "30-Day Money-Back Guarantee" };
    case "FAQ":
      return { headline: "Frequently asked questions", items: [{ question: "A question?", answer: "An answer." }] };
    case "CTA":
      return { headline: "Ready to start?", subheadline: "Join today.", buttonLabel: "Get started", urgency: "" };
    case "FORM":
      return { headline: "Get started in seconds", subheadline: "Unlock the offer.", buttonLabel: "Submit", consent: "No spam. Unsubscribe anytime." };
    case "GALLERY":
      return { images: [] };
    default:
      return {};
  }
}
