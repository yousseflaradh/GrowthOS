"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { createProjectAction, updateProjectAction } from "@/app/actions/projects";
import { PROJECT_STATUSES } from "@/modules/projects/domain/project-status";
import type { ProjectView } from "@/modules/projects/application/dto";

type Mode = { type: "create" } | { type: "edit"; project: ProjectView };

export function ProjectFormDialog({
  open,
  onOpenChange,
  mode,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  onSaved: (project: ProjectView, created: boolean) => void;
}) {
  const editing = mode.type === "edit";
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Reset transient state whenever the dialog (re)opens.
  useEffect(() => {
    if (open) {
      setError(null);
      setFieldErrors({});
    }
  }, [open, mode]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const values = {
      productName: String(fd.get("productName") ?? ""),
      productUrl: String(fd.get("productUrl") ?? ""),
      description: String(fd.get("description") ?? ""),
      image: String(fd.get("image") ?? ""),
      status: String(fd.get("status") ?? "DRAFT") as ProjectView["status"],
    };

    start(async () => {
      const res = editing
        ? await updateProjectAction(mode.project.id, values)
        : await createProjectAction(values);
      if (res.ok) {
        onSaved(res.data, !editing);
        onOpenChange(false);
      } else {
        setError(res.error.message);
        setFieldErrors(res.error.fieldErrors ?? {});
      }
    });
  }

  const p = editing ? mode.project : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={editing ? "Edit project" : "New project"}
        description={editing ? "Update your product details." : "Add a product to start working on it."}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error && (
            <p className="rounded-xl bg-redtint px-3 py-2 text-sm font-medium text-red-500">{error}</p>
          )}
          <Field label="Product name" htmlFor="productName" error={fieldErrors.productName?.[0]}>
            <Input id="productName" name="productName" defaultValue={p?.productName} placeholder="Hydra Glow Serum" required />
          </Field>
          <Field label="Product URL" htmlFor="productUrl" error={fieldErrors.productUrl?.[0]} hint="Optional — link to the live product page.">
            <Input id="productUrl" name="productUrl" type="url" defaultValue={p?.productUrl ?? ""} placeholder="https://store.com/product" />
          </Field>
          <Field label="Description" htmlFor="description" error={fieldErrors.description?.[0]}>
            <Textarea id="description" name="description" defaultValue={p?.description ?? ""} placeholder="What is this product and who is it for?" />
          </Field>
          <Field label="Product image" error={fieldErrors.image?.[0]}>
            <ImageUpload name="image" shape="square" defaultValue={p?.image} />
          </Field>
          <Field label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={p?.status ?? "DRAFT"}
              className="h-11 w-full rounded-xl border border-hairline bg-white px-4 text-sm text-ink focus-gold"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
