"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Boxes } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { deleteProjectAction } from "@/app/actions/projects";
import type { ProjectView, Paginated } from "@/modules/projects";

type DialogState =
  | { open: false }
  | { open: true; mode: { type: "create" } | { type: "edit"; project: ProjectView } };

export function ProjectsBoard({
  initial,
  autoOpenNew,
}: {
  initial: Paginated<ProjectView>;
  autoOpenNew: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ProjectView[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<ProjectView | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (autoOpenNew) setDialog({ open: true, mode: { type: "create" } });
  }, [autoOpenNew]);

  const openCreate = () => setDialog({ open: true, mode: { type: "create" } });
  const openEdit = (project: ProjectView) => setDialog({ open: true, mode: { type: "edit", project } });

  const onSaved = useCallback(
    (project: ProjectView, created: boolean) => {
      setItems((prev) =>
        created ? [project, ...prev] : prev.map((p) => (p.id === project.id ? project : p)),
      );
      router.refresh(); // keep dashboard counts / activity fresh
    },
    [router],
  );

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startDelete(async () => {
      const res = await deleteProjectAction(id);
      if (res.ok) {
        setItems((prev) => prev.filter((p) => p.id !== id));
        setDeleteTarget(null);
        router.refresh();
      }
    });
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/v1/projects?cursor=${encodeURIComponent(cursor)}&limit=12`);
      if (res.ok) {
        const page: Paginated<ProjectView> = await res.json();
        setItems((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="# Projects"
        title={
          <>
            Your <span className="text-gold-500">products</span>
          </>
        }
        description="Every product you’re building growth assets for."
        action={
          <Button variant="gold" onClick={openCreate}>
            <Plus size={16} /> New project
          </Button>
        }
      />

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cream-100 text-gold-500">
            <Boxes size={26} />
          </span>
          <p className="text-sm text-body">No projects yet. Add your first product to get started.</p>
          <Button variant="gold" onClick={openCreate}>
            <Plus size={16} /> New project
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <ProjectCard key={p.id} project={p} onEdit={openEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
          {cursor && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {dialog.open && (
        <ProjectFormDialog
          open={dialog.open}
          onOpenChange={(v) => !v && setDialog({ open: false })}
          mode={dialog.mode}
          onSaved={onSaved}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent
          title="Delete project?"
          description={`This permanently removes “${deleteTarget?.productName ?? ""}”. This can’t be undone.`}
        >
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
