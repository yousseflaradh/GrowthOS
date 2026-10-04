import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Eyebrow badge — translucent pill with a 1px border, icon + uppercase mono
 * label. Sits atop heroes/section headers per the design system.
 */
export function Eyebrow({
  children,
  icon,
  tone = "dark",
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]",
        tone === "dark"
          ? "border-white/15 bg-white/5 text-ondark-muted"
          : "border-hairline bg-cream-100 text-body",
        className,
      )}
    >
      {icon && <span className="text-gold-500">{icon}</span>}
      {children}
    </span>
  );
}
