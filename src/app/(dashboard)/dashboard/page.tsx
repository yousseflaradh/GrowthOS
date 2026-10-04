import Link from "next/link";
import { Boxes, Rocket, PencilLine, Archive, Plus, FolderOpen, ArrowUpRight } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService } from "@/modules/projects";
import { listRecentActivity } from "@/shared/activity/read";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { ActivityFeed } from "@/components/app/activity-feed";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Dashboard · GrowthOS" };

export default async function DashboardPage() {
  const ctx = await requireContext();
  const [counts, activity, recent] = await Promise.all([
    projectService.getCounts(ctx),
    listRecentActivity(ctx, 12),
    projectService.listProjects(ctx, { limit: 5 }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="# Workspace"
        title={
          <>
            Your <span className="text-gold-500">command center</span>
          </>
        }
        description="A snapshot of your products and recent activity."
        action={
          <Button asChild variant="gold">
            <Link href="/projects?new=1">
              <Plus size={16} /> New project
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={counts.total} icon={<Boxes size={20} />} accent="gold" />
        <StatCard label="Active" value={counts.byStatus.ACTIVE} icon={<Rocket size={20} />} accent="green" />
        <StatCard label="Draft" value={counts.byStatus.DRAFT} icon={<PencilLine size={20} />} accent="muted" />
        <StatCard label="Archived" value={counts.byStatus.ARCHIVED} icon={<Archive size={20} />} accent="blue" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <div className="mb-4 flex items-center justify-between">
                <CardTitle className="text-base">Recent projects</CardTitle>
                <Link href="/projects" className="text-xs font-semibold text-blue-500 hover:underline">
                  View all
                </Link>
              </div>

              {recent.items.length === 0 ? (
                <EmptyProjects />
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--color-hairline)]">
                  {recent.items.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/projects/${p.id}`}
                          className="truncate font-semibold text-ink hover:text-gold-500"
                        >
                          {p.productName}
                        </Link>
                        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                          {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <div className="mt-6">
            <QuickActions />
          </div>
        </div>

        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { href: "/projects?new=1", label: "Add a product", icon: <Plus size={18} /> },
    { href: "/projects", label: "Browse projects", icon: <FolderOpen size={18} /> },
    { href: "/settings", label: "Edit profile", icon: <ArrowUpRight size={18} /> },
  ];
  return (
    <Card>
      <CardBody>
        <CardTitle className="mb-4 text-base">Quick actions</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 rounded-xl border border-hairline bg-cream-50 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-gold-500 hover:bg-gold-500/5"
            >
              <span className="text-gold-500">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-100 text-gold-500">
        <Boxes size={22} />
      </span>
      <p className="text-sm text-body">No projects yet. Add your first product to get started.</p>
      <Button asChild variant="gold" size="sm">
        <Link href="/projects?new=1">
          <Plus size={15} /> New project
        </Link>
      </Button>
    </div>
  );
}
