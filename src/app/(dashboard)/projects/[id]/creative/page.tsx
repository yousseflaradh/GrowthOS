import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wand2, AlertTriangle } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { analysisService } from "@/modules/analysis";
import { creativeService } from "@/modules/creative";
import { intelService } from "@/modules/intel";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { GenerateStrategy } from "@/components/creative/generate-strategy";
import { StrategyResults } from "@/components/creative/strategy-results";
import { StrategyExport } from "@/components/creative/strategy-export";

export const metadata = { title: "Creative Strategy · GrowthOS" };

export default async function CreativePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;

  let project: ProjectView;
  try {
    project = await projectService.getProject(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const [analysis, strategy, voice] = await Promise.all([
    analysisService.latest(ctx, id),
    creativeService.latest(ctx, id),
    intelService.overview(ctx, id),
  ]);
  const hasAnalysis = analysis?.status === "COMPLETED" && !!analysis.result;
  const completed = strategy?.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500"
      >
        <ArrowLeft size={15} /> Back to {project.productName}
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="light" icon={<Wand2 size={11} />}>
            Creative strategy
          </Eyebrow>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{project.productName}</h1>
        </div>
        {completed && strategy && <StrategyExport strategy={strategy} productName={project.productName} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardBody>
              <CardTitle className="mb-3 text-base">Creative strategy</CardTitle>
              <GenerateStrategy
                projectId={id}
                hasAnalysis={hasAnalysis}
                providerAvailable={intelService.providerAvailable}
                adCount={voice.ads.length}
                commentCount={voice.comments.length}
              />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {completed && strategy ? (
            <StrategyResults strategy={strategy} projectId={id} />
          ) : strategy?.status === "FAILED" ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-redtint text-red-500">
                  <AlertTriangle size={22} />
                </span>
                <p className="font-semibold text-ink">Generation failed</p>
                <p className="max-w-sm text-sm text-body">{strategy.error ?? "Something went wrong."}</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-100 text-gold-500">
                  <Wand2 size={22} />
                </span>
                <p className="font-semibold text-ink">No strategy yet</p>
                <p className="max-w-sm text-sm text-body">
                  {hasAnalysis
                    ? "Generate a creative strategy from the panel to get angles, hooks, and concepts."
                    : "Run a product analysis first, then come back to generate the creative strategy."}
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
