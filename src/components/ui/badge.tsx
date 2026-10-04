import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wide",
  {
    variants: {
      variant: {
        neutral: "bg-cream-100 text-body",
        gold: "bg-gold-500/15 text-gold-500",
        draft: "bg-cream-100 text-muted",
        active: "bg-greentint text-green-600",
        archived: "bg-redtint text-red-500",
        category: "bg-green-950 text-ondark",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-[11px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

export function Badge({ className, variant, size, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dotColor ?? "currentColor" }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

/** Maps a project status to a status badge. */
export function StatusBadge({ status }: { status: "DRAFT" | "ACTIVE" | "ARCHIVED" }) {
  const map = {
    DRAFT: { variant: "draft" as const, label: "Draft", dot: "#8b9690" },
    ACTIVE: { variant: "active" as const, label: "Active", dot: "#2f8f4e" },
    ARCHIVED: { variant: "archived" as const, label: "Archived", dot: "#d6483c" },
  };
  const s = map[status];
  return (
    <Badge variant={s.variant} dot dotColor={s.dot}>
      {s.label}
    </Badge>
  );
}
