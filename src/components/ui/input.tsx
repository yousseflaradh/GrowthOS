import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-hairline bg-white px-4 text-sm text-ink",
        "placeholder:text-muted focus-gold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-xl border border-hairline bg-white px-4 py-3 text-sm text-ink",
      "placeholder:text-muted focus-gold transition-colors resize-y",
      "aria-[invalid=true]:border-red-500",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
