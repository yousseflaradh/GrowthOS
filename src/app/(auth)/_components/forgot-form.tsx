"use client";

import { useState, useTransition } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ForgotForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await forgotPasswordAction({ email: String(fd.get("email") ?? "") });
      if (res.ok) setSent(true);
      else setFieldErrors(res.error.fieldErrors ?? {});
    });
  }

  if (sent) {
    return (
      <p className="rounded-xl bg-greentint px-4 py-3 text-sm text-green-600">
        If an account exists for that email, we’ve sent a reset link. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" error={fieldErrors.email?.[0]}>
        <Input id="email" name="email" type="email" placeholder="you@store.com" autoComplete="email" required />
      </Field>
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
