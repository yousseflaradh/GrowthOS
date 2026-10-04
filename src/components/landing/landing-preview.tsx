"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Check, X, ChevronDown, ShieldCheck, BadgeCheck, Sparkles, Quote, Maximize2 } from "lucide-react";
import { getTheme } from "@/modules/landing/application/themes";
import type {
  PageVersionView,
  VersionSummary,
  SectionView,
  HeroContent,
  ProblemContent,
  BenefitsContent,
  FeaturesContent,
  ComparisonContent,
  SocialProofContent,
  TestimonialsContent,
  GuaranteeContent,
  FaqContent,
  CtaContent,
  FormContent,
  GalleryContent,
} from "@/modules/landing";

/**
 * Premium, image-rich preview of a generated landing page — gradient bands,
 * editorial type, a lifted product hero, a lifestyle/UGC image collage, and
 * "find your flavor" cards. Scraped product images are distributed across many
 * sections, not just the hero + gallery.
 */
export function LandingPreview({
  current,
  versions,
  onSelectVersion,
}: {
  current: PageVersionView;
  versions: VersionSummary[];
  onSelectVersion: (versionId: string) => void;
}) {
  const heroContent = current.sections.find((s) => s.type === "HERO")?.content as HeroContent | undefined;
  const ctaLabel = heroContent?.ctaLabel ?? "Get started";

  // Image pool from the hero + gallery, used decoratively across sections.
  const galleryImgs =
    (current.sections.find((s) => s.type === "GALLERY")?.content as GalleryContent | undefined)?.images ?? [];
  const pool = [...new Set([heroContent?.image, ...galleryImgs].filter((x): x is string => !!x))];
  const pick = (i: number) => (pool.length ? pool[i % pool.length] : undefined);

  // Offer line for the announcement bar.
  const cta = current.sections.find((s) => s.type === "CTA")?.content as CtaContent | undefined;
  const offer = cta?.urgency ?? heroContent?.supportingPoints?.[0] ?? "Free shipping · 30-day money-back guarantee";

  const [fullscreen, setFullscreen] = useState(false);
  // The chosen palette overrides the global --color-* tokens (and fonts) for
  // this subtree, so every section re-colors without touching class names.
  const theme = getTheme(current.theme);
  const themeStyle = {
    ...theme.vars,
    "--lp-display": theme.fonts.display,
    fontFamily: theme.fonts.body,
  } as React.CSSProperties;

  const page = (heightClass: string) => (
    <div style={themeStyle} className={`relative flex ${heightClass} flex-col overflow-y-auto scroll-smooth bg-white`}>
      <AnnouncementBar offer={offer} />
      {current.sections.map((s, idx) => (
        <Reveal key={s.id}>
          <Section section={s} pool={pool} pick={pick} index={idx} />
        </Reveal>
      ))}
      <StickyCta label={ctaLabel} />
    </div>
  );

  return (
    <>
      {/* Load the theme's web fonts (React 19 hoists this to <head>). */}
      <link rel="stylesheet" href={theme.fonts.href} />
      <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_1px_3px_rgba(16,36,27,0.06),0_18px_40px_-20px_rgba(16,36,27,0.25)]">
        <div className="flex items-center justify-between gap-3 border-b border-hairline bg-cream-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-hero px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-gold-500">
              {current.framework}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted">Version {current.version}</span>
          </div>
          <div className="flex items-center gap-2">
            {versions.length > 1 && (
              <VersionSwitcher versions={versions} currentId={current.id} onSelect={onSelectVersion} />
            )}
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-cream-50"
            >
              <Maximize2 size={13} /> Full screen
            </button>
          </div>
        </div>

        {current.rationale && (
          <p className="border-b border-hairline bg-cream-50/60 px-4 py-2 text-[12px] italic text-body">
            Why {current.framework}: {current.rationale}
          </p>
        )}

        {page("max-h-[80vh]")}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-2 sm:p-4">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow hover:bg-cream-50"
            >
              <X size={15} /> Close
            </button>
          </div>
          <div className="flex-1 overflow-hidden rounded-xl bg-white shadow-2xl">{page("h-full")}</div>
        </div>
      )}
    </>
  );
}

function VersionSwitcher({
  versions,
  currentId,
  onSelect,
}: {
  versions: VersionSummary[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={currentId}
        onChange={(e) => onSelect(e.target.value)}
        className="appearance-none rounded-lg border border-hairline bg-white py-1 pl-2.5 pr-7 text-xs font-semibold text-ink"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.version} · {v.framework}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

function Section({
  section,
  pool,
  pick,
  index,
}: {
  section: SectionView;
  pool: string[];
  pick: (i: number) => string | undefined;
  index: number;
}) {
  switch (section.type) {
    case "HERO":
      return <Hero c={section.content as HeroContent} />;
    case "GALLERY":
      return <Gallery c={section.content as GalleryContent} />;
    case "PROBLEM":
      return <Problem c={section.content as ProblemContent} image={pick(1)} />;
    case "BENEFITS":
      return <Benefits c={section.content as BenefitsContent} />;
    case "FEATURES":
      return <Features c={section.content as FeaturesContent} image={pick(2)} flip={index % 2 === 0} />;
    case "COMPARISON":
      return <Comparison c={section.content as ComparisonContent} />;
    case "SOCIAL_PROOF":
      return <SocialProof c={section.content as SocialProofContent} />;
    case "TESTIMONIALS":
      return <Testimonials c={section.content as TestimonialsContent} pool={pool} />;
    case "GUARANTEE":
      return <Guarantee c={section.content as GuaranteeContent} />;
    case "FAQ":
      return <Faq c={section.content as FaqContent} />;
    case "CTA":
      return <Cta c={section.content as CtaContent} />;
    case "FORM":
      return <LeadForm c={section.content as FormContent} />;
    default:
      return null;
  }
}

/* ── shared bits ────────────────────────────────────────────── */

const LEAD_FORM_ID = "lp-lead-form";
function scrollToForm() {
  document.getElementById(LEAD_FORM_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function GoldButton({ label, action, size = "md" }: { label: string; action?: boolean; size?: "md" | "lg" }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 font-bold text-green-950 shadow-[0_8px_20px_-6px_rgba(184,138,42,0.6)] transition-transform hover:-translate-y-0.5 ${
    size === "lg" ? "px-8 py-3.5 text-base" : "px-6 py-3 text-sm"
  }`;
  return action ? (
    <button type="button" onClick={scrollToForm} className={cls}>
      {label}
    </button>
  ) : (
    <span className={cls}>{label}</span>
  );
}

// eslint-disable-next-line @next/next/no-img-element
const Img = (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />;

/** Fade + rise a section into view as it scrolls in. */
function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

function Stars({ size = 14 }: { size?: number }) {
  return (
    <span className="flex gap-0.5 text-gold-500">
      {Array.from({ length: 5 }).map((_, k) => (
        <Star key={k} size={size} fill="currentColor" />
      ))}
    </span>
  );
}

function Heading({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <h2 className="font-display text-[1.7rem] font-extrabold leading-tight tracking-tight text-ink sm:text-4xl text-balance">
        {children}
      </h2>
      <div className={`mt-3 h-1 w-12 rounded-full bg-gold-500 ${center ? "mx-auto" : ""}`} />
    </div>
  );
}

function AnnouncementBar({ offer }: { offer: string }) {
  return (
    <div className="sticky top-0 z-20 bg-gold-500 px-4 py-2 text-center text-[12px] font-bold uppercase tracking-wide text-green-950">
      <Sparkles size={12} className="mr-1.5 inline" />
      {offer}
    </div>
  );
}

function StickyCta({ label }: { label: string }) {
  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-white/10 bg-hero/95 px-5 py-3 backdrop-blur">
      <span className="text-sm font-semibold text-ondark">Ready when you are</span>
      <GoldButton label={label} action />
    </div>
  );
}

/* ── section renderers ──────────────────────────────────────── */

function Hero({ c }: { c: HeroContent }) {
  const badges = c.supportingPoints ?? [];
  return (
    <section className="relative overflow-hidden bg-hero px-6 py-14 text-ondark sm:px-12 sm:py-20">
      {/* decorative glows */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-green-700/40 blur-3xl" />
      <div className={`relative grid items-center gap-10 ${c.image ? "lg:grid-cols-2" : ""}`}>
        <div className={c.image ? "" : "mx-auto max-w-2xl text-center"}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-500 ring-1 ring-white/15">
            <Sparkles size={12} /> Limited-time offer
          </span>
          <h1 className="mt-4 font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.25rem] text-balance">
            {c.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ondark-muted">{c.subheadline}</p>
          <div className={`mt-7 flex flex-wrap items-center gap-4 ${c.image ? "" : "justify-center"}`}>
            <GoldButton label={c.ctaLabel} action size="lg" />
            <div className="flex items-center gap-2">
              <Stars />
              <span className="text-sm font-semibold text-ondark-muted">Loved by thousands</span>
            </div>
          </div>
          {badges.length > 0 && (
            <ul className={`mt-7 flex flex-wrap gap-2 ${c.image ? "" : "justify-center"}`}>
              {badges.map((p, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-[13px] text-ondark ring-1 ring-white/10"
                >
                  <Check size={13} className="text-gold-500" /> {p}
                </li>
              ))}
            </ul>
          )}
        </div>
        {c.image && (
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-0 -rotate-3 rounded-[2rem] bg-gold-500/25 blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 shadow-2xl">
              <Img src={c.image} className="h-full max-h-[26rem] w-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Problem({ c, image }: { c: ProblemContent; image?: string }) {
  return (
    <section className="px-6 py-16 sm:px-12">
      <div className={`grid items-center gap-10 ${image ? "lg:grid-cols-2" : ""}`}>
        <div>
          <Heading>{c.headline}</Heading>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-body">{c.body}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {c.painPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] text-body">
                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-redtint text-red-500">
                  <X size={12} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        {image && (
          <div className="overflow-hidden rounded-3xl border border-hairline shadow-lg">
            <Img src={image} className="h-72 w-full object-cover sm:h-96" />
          </div>
        )}
      </div>
    </section>
  );
}

function Benefits({ c }: { c: BenefitsContent }) {
  return (
    <section className="bg-cream-50 px-6 py-16 sm:px-12">
      <Heading center>{c.headline}</Heading>
      <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {c.items.map((b, i) => (
          <div
            key={i}
            className="group rounded-2xl border border-hairline bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-500/15 text-gold-500 transition-colors group-hover:bg-gold-500 group-hover:text-green-950">
              <Check size={22} />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-ink">{b.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-body">{b.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features({ c, image, flip }: { c: FeaturesContent; image?: string; flip?: boolean }) {
  return (
    <section className="px-6 py-16 sm:px-12">
      <div className={`grid items-center gap-10 ${image ? "lg:grid-cols-2" : ""}`}>
        {image && (
          <div className={`overflow-hidden rounded-3xl border border-hairline shadow-lg ${flip ? "lg:order-2" : ""}`}>
            <Img src={image} className="h-72 w-full object-cover sm:h-[26rem]" />
          </div>
        )}
        <div>
          <Heading>{c.headline}</Heading>
          <div className="mt-7 flex flex-col gap-5">
            {c.items.map((f, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-hero text-gold-500">
                  <Check size={15} />
                </span>
                <div>
                  <p className="font-semibold text-ink">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-body">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Comparison({ c }: { c: ComparisonContent }) {
  return (
    <section className="bg-cream-50 px-6 py-16 sm:px-12">
      <Heading center>{c.headline}</Heading>
      <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-3xl border border-hairline bg-white shadow-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <th className="px-4 py-4 text-left font-semibold text-body"> </th>
              <th className="bg-hero px-4 py-4 text-center font-display text-base font-extrabold text-gold-500">
                {c.productLabel}
              </th>
              <th className="px-4 py-4 text-center font-semibold text-muted">{c.alternativeLabel}</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r, i) => (
              <tr key={i} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3.5 text-body">{r.point}</td>
                <td className="bg-gold-500/5 px-4 py-3.5 text-center">
                  <Mark on={r.hasProduct} />
                </td>
                <td className="px-4 py-3.5 text-center">
                  <Mark on={r.hasAlternative} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-green-600 text-white">
      <Check size={14} />
    </span>
  ) : (
    <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-hairline text-muted">
      <X size={14} />
    </span>
  );
}

function SocialProof({ c }: { c: SocialProofContent }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-800 px-6 py-16 text-ondark sm:px-12">
      <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" />
      <h2 className="relative text-center font-display text-2xl font-extrabold sm:text-4xl text-balance">
        {c.headline}
      </h2>
      {c.stats && c.stats.length > 0 && (
        <div className="relative mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-3">
          {c.stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="font-display text-4xl font-extrabold text-gold-500 sm:text-5xl">{s.value}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-ondark-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {c.highlights && c.highlights.length > 0 && (
        <ul className="relative mx-auto mt-9 flex max-w-2xl flex-wrap justify-center gap-2">
          {c.highlights.map((h, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-sm text-ondark ring-1 ring-white/10"
            >
              <BadgeCheck size={14} className="text-gold-500" /> {h}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Testimonials({ c, pool }: { c: TestimonialsContent; pool: string[] }) {
  const collage = pool.slice(0, 5);
  return (
    <section className="px-6 py-16 sm:px-12">
      <Heading center>{c.headline}</Heading>
      {c.verified && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-600">
          <BadgeCheck size={14} /> Verified customer reviews
        </p>
      )}

      {collage.length >= 3 && (
        <div className="mt-9 flex justify-center gap-3 overflow-hidden">
          {collage.map((src, i) => (
            <div
              key={i}
              className={`h-28 w-24 shrink-0 overflow-hidden rounded-2xl border border-hairline shadow-md sm:h-36 sm:w-28 ${
                i % 2 ? "translate-y-3 rotate-2" : "-rotate-2"
              }`}
            >
              <Img src={src} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
        {c.items.map((t, i) => (
          <figure key={i} className="relative rounded-2xl border border-hairline bg-cream-50 p-6">
            <Quote size={28} className="absolute right-5 top-5 text-gold-500/25" />
            <Stars />
            <blockquote className="mt-3 text-[15px] leading-relaxed text-body">“{t.quote}”</blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-hero text-sm font-bold text-gold-500">
                {t.author.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-ink">
                {t.author}
                {t.role && <span className="block font-normal text-muted">{t.role}</span>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Guarantee({ c }: { c: GuaranteeContent }) {
  return (
    <section className="px-6 py-16 sm:px-12">
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 overflow-hidden rounded-3xl border border-gold-500/30 bg-gradient-to-b from-gold-500/10 to-cream-50 p-10 text-center shadow-sm">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gold-500 text-green-950 shadow-lg">
          <ShieldCheck size={32} />
        </span>
        <span className="rounded-full bg-hero px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-gold-500">
          {c.badge}
        </span>
        <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl text-balance">{c.headline}</h2>
        <p className="max-w-lg text-[15px] leading-relaxed text-body">{c.body}</p>
      </div>
    </section>
  );
}

function Gallery({ c }: { c: GalleryContent }) {
  const images = c.images ?? [];
  if (images.length === 0) return null;
  return (
    <section className="bg-cream-50 px-6 py-16 sm:px-12">
      <Heading center>Find your favourite</Heading>
      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
        {images.slice(0, 8).map((src, i) => (
          <div
            key={i}
            className="group overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm transition-transform hover:-translate-y-1"
          >
            <div className="aspect-square overflow-hidden">
              <Img
                src={src}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq({ c }: { c: FaqContent }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-6 py-16 sm:px-12">
      <Heading center>{c.headline}</Heading>
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
        {c.items.map((f, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-hairline bg-white">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-semibold text-ink"
            >
              {f.question}
              <ChevronDown
                size={18}
                className={`shrink-0 text-gold-500 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && <p className="px-5 pb-4 text-sm leading-relaxed text-body">{f.answer}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Cta({ c }: { c: CtaContent }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-800 px-6 py-20 text-center text-ondark sm:px-12">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" />
      <h2 className="relative mx-auto max-w-xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-balance">
        {c.headline}
      </h2>
      <p className="relative mx-auto mt-4 max-w-lg text-lg text-ondark-muted">{c.subheadline}</p>
      <div className="relative mt-8">
        <GoldButton label={c.buttonLabel} action size="lg" />
      </div>
      {c.urgency && <p className="relative mt-4 text-sm font-semibold text-gold-500">{c.urgency}</p>}
    </section>
  );
}

function LeadForm({ c }: { c: FormContent }) {
  const inputCls =
    "w-full rounded-xl border border-white/15 bg-white/95 px-3.5 py-3 text-sm text-ink placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30";
  return (
    <section id={LEAD_FORM_ID} className="scroll-mt-12 bg-hero px-6 py-16 text-ondark sm:px-12">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl text-balance">{c.headline}</h2>
        <p className="mx-auto mt-3 max-w-md text-base text-ondark-muted">{c.subheadline}</p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-2xl"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="First name" autoComplete="given-name" />
            <input className={inputCls} placeholder="Last name" autoComplete="family-name" />
          </div>
          <input className={inputCls} type="tel" placeholder="Phone number" autoComplete="tel" />
          <input className={inputCls} type="email" placeholder="Email address" autoComplete="email" />
          <button
            type="submit"
            className="mt-1 w-full rounded-full bg-gold-500 px-6 py-3.5 text-base font-bold text-green-950 shadow-[0_8px_20px_-6px_rgba(184,138,42,0.6)] transition-transform hover:-translate-y-0.5"
          >
            {c.buttonLabel}
          </button>
          {c.consent && <p className="text-center text-xs text-ondark-muted">{c.consent}</p>}
        </form>
      </div>
    </section>
  );
}
