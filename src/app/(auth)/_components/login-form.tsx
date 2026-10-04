"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const values = { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? "") };

    start(async () => {
      const res = await loginAction(values);
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(res.error.message);
        setFieldErrors(res.error.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>
      )}
      <Field label="Email" htmlFor="email" error={fieldErrors.email?.[0]}>
        <Input id="email" name="email" type="email" placeholder="you@store.com" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={fieldErrors.password?.[0]}>
        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
      </Field>
      <div className="-mt-1 text-right">
        <a href="/forgot-password" className="text-xs font-medium text-blue-500 hover:underline">
          Forgot password?
        </a>
      </div>
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
