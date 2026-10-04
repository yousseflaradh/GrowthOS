"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Pick an image from the device, preview it, and submit it as a base64 data
 * URL via a hidden input (so the existing form/server action stores it in the
 * `image` field — no object storage required for Phase 1).
 */
export function ImageUpload({
  name,
  defaultValue,
  shape = "square",
  onChange,
}: {
  name: string;
  defaultValue?: string | null;
  shape?: "square" | "circle";
  onChange?: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValueState] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);

  function setValue(v: string) {
    setValueState(v);
    onChange?.(v);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      {/* Submitted value */}
      <input type="hidden" name={name} value={value} readOnly />

      <div
        className={cn(
          "grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-hairline bg-cream-100 text-muted",
          shape === "circle" ? "rounded-full" : "rounded-xl",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={22} />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload size={14} /> {value ? "Change" : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setValue("")}>
              <X size={14} /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">PNG, JPG or GIF — up to 2 MB.</p>
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
