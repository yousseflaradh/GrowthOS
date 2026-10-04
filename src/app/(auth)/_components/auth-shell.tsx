import * as React from "react";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Card } from "@/components/ui/card";

/** Hero header + form card used by every auth page. */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Eyebrow tone="dark" icon={<Spark />}>
          {eyebrow}
        </Eyebrow>
        <h1 className="font-display text-3xl font-extrabold leading-tight text-ondark sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="max-w-sm text-sm leading-relaxed text-ondark-muted">{subtitle}</p>}
      </div>
      <Card className="w-full p-6">{children}</Card>
      {footer && <div className="text-center text-sm text-ondark-muted">{footer}</div>}
    </div>
  );
}

function Spark() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}
