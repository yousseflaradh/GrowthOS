"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Avatar({
  name,
  email,
  src,
  className,
}: {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex h-9 w-9 select-none items-center justify-center overflow-hidden rounded-full bg-green-800 text-sm font-bold text-gold-500",
        className,
      )}
    >
      {src && <AvatarPrimitive.Image src={src} alt={name ?? ""} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback className="leading-none">
        {initials(name, email)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
