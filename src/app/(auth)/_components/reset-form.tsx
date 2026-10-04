"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResetForm({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await resetPasswordAction({ token, password: String(fd.get("password") ?? "") });
      if (res.ok) setDone(true);
      else {
        setError(res.error.message);
        setFieldErrors(res.error.fieldErrors ?? {});
      }
    });
  }

  if (!token) {
    return <p className="text-sm text-red-500">Missing or invalid reset link.</p>;
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-greentint px-4 py-3 text-sm text-green-600">
          Your password has been reset.
        </p>
        <Button asChild variant="gold" size="lg" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>
      )}
      <Field label="New password" htmlFor="password" error={fieldErrors.password?.[0]} hint="At least 8 characters.">
        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="new-password" required />
      </Field>
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Reset password"}
      </Button>
    </form>
  );
}
