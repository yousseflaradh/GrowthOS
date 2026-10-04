import { cn } from "@/lib/utils";

/** GrowthOS wordmark with a gold spark glyph. */
export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-extrabold", className)}>
      <span
        className="grid h-7 w-7 place-items-center rounded-lg bg-gold-500 text-green-950"
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" />
        </svg>
      </span>
      <span className={tone === "dark" ? "text-ondark" : "text-ink"}>
        Growth<span className="text-gold-500">OS</span>
      </span>
    </span>
  );
}
