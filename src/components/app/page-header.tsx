import * as React from "react";
import { Eyebrow } from "@/components/brand/eyebrow";

/** Section header: monospace eyebrow → H2 with optional gold keyword → actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="light">{eyebrow}</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="text-sm text-body">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
