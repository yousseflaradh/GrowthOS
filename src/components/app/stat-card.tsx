import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  accent = "gold",
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: "gold" | "green" | "blue" | "muted";
}) {
  const accents = {
    gold: "bg-gold-500/15 text-gold-500",
    green: "bg-greentint text-green-600",
    blue: "bg-blue-500/10 text-blue-500",
    muted: "bg-cream-100 text-muted",
  };
  return (
    <Card className="flex items-center gap-4 p-5">
      {icon && (
        <span className={cn("grid h-11 w-11 place-items-center rounded-xl", accents[accent])}>
          {icon}
        </span>
      )}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
        <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
      </div>
    </Card>
  );
}
