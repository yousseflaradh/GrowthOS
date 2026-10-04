import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles, ArrowRight, LayoutTemplate, Gauge, Crosshair, Database, Workflow } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { analysisService } from "@/modules/analysis";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/eyebrow";
import { ProjectDetailActions } from "@/components/projects/project-detail-actions";
import { formatDate } from "@/lib/format";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;

  let project: ProjectView;
  try {
    project = await projectService.getProject(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const analysis = await analysisService.latest(ctx, id);
  const analysisReady = analysis?.status === "COMPLETED" && analysis.result;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500">
        <ArrowLeft size={15} /> Back to projects
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold text-ink">{project.productName}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.productUrl && (
            <a
              href={project.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:underline"
            >
              <ExternalLink size={14} /> {project.productUrl}
            </a>
          )}
        </div>
        <ProjectDetailActions project={project} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <CardTitle className="mb-3 text-base">Overview</CardTitle>
              {project.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.image}
                  alt={project.productName}
                  className="mb-4 h-48 w-full rounded-xl border border-hairline object-cover"
                />
              )}
              <p className="text-sm leading-relaxed text-body">
                {project.description || "No description yet. Edit this project to add details."}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-hairline pt-4 text-sm">
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">Created</dt>
                  <dd className="text-ink">{formatDate(project.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">Updated</dt>
                  <dd className="text-ink">{formatDate(project.updatedAt)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>

        {/* AI Product Analysis (Phase 2) + teaser for later tools. */}
        <Card className="bg-hero text-ondark">
          <CardBody>
            <Eyebrow tone="dark" icon={<Sparkles size={11} />}>
              AI Product Analysis
            </Eyebrow>

            {analysisReady && analysis?.result ? (
              <>
                <p className="mt-3 line-clamp-4 text-sm text-ondark-muted">
                  {analysis.result.customerAvatar.summary}
                </p>
                <Button asChild variant="gold" className="mt-4 w-full">
                  <Link href={`/projects/${project.id}/analysis`}>View analysis</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-ondark-muted">
                  Turn this product into a customer avatar, pain points, desires, objections, USP, and
                  buying triggers.
                </p>
                <Button asChild variant="gold" className="mt-4 w-full">
                  <Link href={`/projects/${project.id}/analysis`}>
                    <Sparkles size={16} /> Analyze product
                  </Link>
                </Button>
              </>
            )}

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex flex-col gap-2">
                <Link
                  href={`/projects/${project.id}/creative`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-ondark transition-colors hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={15} className="text-gold-500" /> Creative strategy
                  </span>
                  <ArrowRight size={15} className="text-gold-500" />
                </Link>
                <Link
                  href={`/projects/${project.id}/landing`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-ondark transition-colors hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <LayoutTemplate size={15} className="text-gold-500" /> Landing page
                  </span>
                  <ArrowRight size={15} className="text-gold-500" />
                </Link>
                <Link
                  href={`/projects/${project.id}/audit`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-ondark transition-colors hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Gauge size={15} className="text-gold-500" /> Page audit
                  </span>
                  <ArrowRight size={15} className="text-gold-500" />
                </Link>
                <Link
                  href={`/projects/${project.id}/competitors`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-ondark transition-colors hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Crosshair size={15} className="text-gold-500" /> Competitors
                  </span>
                  <ArrowRight size={15} className="text-gold-500" />
                </Link>
                <Link
                  href={`/projects/${project.id}/knowledge`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-ondark transition-colors hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Database size={15} className="text-gold-500" /> Knowledge base
                  </span>
                  <ArrowRight size={15} className="text-gold-500" />
                </Link>
                <Link
                  href={`/projects/${project.id}/agents`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-ondark transition-colors hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Workflow size={15} className="text-gold-500" /> Agent workflow
                  </span>
                  <ArrowRight size={15} className="text-gold-500" />
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
