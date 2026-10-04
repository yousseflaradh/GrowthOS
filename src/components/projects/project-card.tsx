"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Pencil, Trash2, Package, ExternalLink, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { ProjectView } from "@/modules/projects";

export function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: ProjectView;
  onEdit: (p: ProjectView) => void;
  onDelete: (p: ProjectView) => void;
}) {
  const router = useRouter();
  const href = `/projects/${project.id}`;
  const open = () => router.push(href);

  // Stop inner controls (menu, links) from triggering the card's navigation.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-[0_2px_6px_rgba(16,36,27,0.08),0_16px_40px_-16px_rgba(16,36,27,0.25)] focus-gold"
      aria-label={`Open ${project.productName}`}
    >
      {/* Gradient thumbnail with centered icon + status pill */}
      <div className="relative h-24 bg-[linear-gradient(135deg,var(--color-green-800),var(--color-green-950))]">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(216,169,75,0.5)_1px,transparent_0)] [background-size:16px_16px]" />
        <span className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-gold-500">
          <Package size={20} />
        </span>
        <span className="absolute right-3 top-3">
          <StatusBadge status={project.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold text-ink line-clamp-1 group-hover:text-gold-500">
            {project.productName}
          </span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={stop}
                className="-mr-1 rounded-full p-1 text-muted hover:bg-cream-100 focus-gold"
                aria-label="Project actions"
              >
                <MoreVertical size={18} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                onClick={stop}
                className="z-50 min-w-40 rounded-xl border border-hairline bg-white p-1.5 shadow-lg"
              >
                <DropdownMenu.Item
                  onSelect={() => onEdit(project)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-body outline-none hover:bg-cream-100"
                >
                  <Pencil size={14} /> Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => onDelete(project)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 outline-none hover:bg-redtint"
                >
                  <Trash2 size={14} /> Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {project.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-body">{project.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
            {formatDate(project.createdAt)}
          </span>
          <div className="flex items-center gap-3">
            {project.productUrl && (
              <a
                href={project.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
              >
                <ExternalLink size={12} /> Visit
              </a>
            )}
            <Link
              href={`${href}/analysis`}
              onClick={stop}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-500 hover:underline"
            >
              <Sparkles size={12} /> Analyze
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
