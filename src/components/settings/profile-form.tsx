"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { updateProfileAction } from "@/app/actions/profile";
import type { ProfileView } from "@/modules/identity";

export function ProfileForm({ profile }: { profile: ProfileView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const values = {
      name: String(fd.get("name") ?? ""),
      company: String(fd.get("company") ?? ""),
      website: String(fd.get("website") ?? ""),
      image: String(fd.get("image") ?? ""),
    };

    start(async () => {
      const res = await updateProfileAction(values);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error.message);
        setFieldErrors(res.error.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {error && (
        <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>
      )}
      {saved && (
        <p className="rounded-xl bg-greentint px-3 py-2 text-sm font-medium text-green-600">
          Profile saved.
        </p>
      )}

      <Field label="Avatar" error={fieldErrors.image?.[0]}>
        <ImageUpload name="image" shape="circle" defaultValue={profile.image} />
      </Field>

      <Field label="Full name" htmlFor="name" error={fieldErrors.name?.[0]}>
        <Input id="name" name="name" defaultValue={profile.name ?? ""} required />
      </Field>

      <Field label="Email" htmlFor="email" hint="Email can’t be changed in this phase.">
        <Input id="email" value={profile.email} disabled />
      </Field>

      <Field label="Company" htmlFor="company" error={fieldErrors.company?.[0]}>
        <Input id="company" name="company" defaultValue={profile.company ?? ""} placeholder="Your brand or agency" />
      </Field>

      <Field label="Website" htmlFor="website" error={fieldErrors.website?.[0]}>
        <Input id="website" name="website" type="url" defaultValue={profile.website ?? ""} placeholder="https://yourbrand.com" />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
