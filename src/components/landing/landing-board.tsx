"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Pencil } from "lucide-react";
import { LandingPreview } from "@/components/landing/landing-preview";
import { LandingExport } from "@/components/landing/landing-export";
import { LandingBuilder } from "@/components/landing/landing-builder";
import { getLandingVersionAction, deleteLandingVersionAction } from "@/app/actions/landing";
import type { PageVersionView, VersionSummary } from "@/modules/landing";

/**
 * Client shell around the page preview: holds the active version, lazily loads
 * other versions from history on switch, and renders export + delete for the
 * version currently in view.
 */
export function LandingBoard({
  projectId,
  productName,
  initial,
  versions,
}: {
  projectId: string;
  productName: string;
  initial: PageVersionView;
  versions: VersionSummary[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initial);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [building, setBuilding] = useState(false);

  // After a new generation (or delete), the server re-fetches and passes the
  // latest version — jump to it so the user always sees the freshest page.
  useEffect(() => {
    setCurrent(initial);
    // Resync only when a different version arrives from the server (new gen /
    // delete) — not on unrelated re-renders, so manual dropdown picks stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  function selectVersion(versionId: string) {
    if (versionId === current.id) return;
    start(async () => {
      const r = await getLandingVersionAction(projectId, versionId);
      if (r.ok) setCurrent(r.data);
    });
  }

  function deleteCurrent() {
    if (!confirm(`Delete version ${current.version}? This can't be undone.`)) return;
    startDelete(async () => {
      const r = await deleteLandingVersionAction(projectId, current.id);
      if (r.ok) router.refresh();
    });
  }

  if (building) {
    return (
      <LandingBuilder
        projectId={projectId}
        productName={productName}
        version={current}
        onExit={() => setBuilding(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setBuilding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-hero px-4 py-1.5 text-sm font-bold text-gold-500 shadow-sm hover:bg-green-900"
        >
          <Pencil size={15} /> Edit / Build
        </button>
        <LandingExport version={current} productName={productName} />
        <button
          type="button"
          onClick={deleteCurrent}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-redtint disabled:opacity-50"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete
        </button>
      </div>
      <div className={pending ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
        <LandingPreview current={current} versions={versions} onSelectVersion={selectVersion} />
      </div>
    </div>
  );
}
