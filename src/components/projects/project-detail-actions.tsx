"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { deleteProjectAction } from "@/app/actions/projects";
import type { ProjectView } from "@/modules/projects";

export function ProjectDetailActions({ project }: { project: ProjectView }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  function onDelete() {
    startDelete(async () => {
      const res = await deleteProjectAction(project.id);
      if (res.ok) router.push("/projects");
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil size={14} /> Edit
      </Button>
      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setConfirmOpen(true)}>
        <Trash2 size={14} /> Delete
      </Button>

      {editOpen && (
        <ProjectFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode={{ type: "edit", project }}
          onSaved={() => router.refresh()}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title="Delete project?"
          description={`This permanently removes “${project.productName}”. This can’t be undone.`}
        >
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
