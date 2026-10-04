"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerAction, loginAction } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const values = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    };

    start(async () => {
      const res = await registerAction(values);
      if (!res.ok) {
        setError(res.error.message);
        setFieldErrors(res.error.fieldErrors ?? {});
        return;
      }
      // Auto sign-in with the same credentials, then enter the app.
      const login = await loginAction({ email: values.email, password: values.password });
      if (login.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>
      )}
      <Field label="Full name" htmlFor="name" error={fieldErrors.name?.[0]}>
        <Input id="name" name="name" placeholder="Rayen Doe" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={fieldErrors.email?.[0]}>
        <Input id="email" name="email" type="email" placeholder="you@store.com" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={fieldErrors.password?.[0]} hint="At least 8 characters.">
        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="new-password" required />
      </Field>
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your workspace…" : "Create account"}
      </Button>
    </form>
  );
}
