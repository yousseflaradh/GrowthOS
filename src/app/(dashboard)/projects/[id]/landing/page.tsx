import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { analysisService } from "@/modules/analysis";
import { landingService } from "@/modules/landing";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { GenerateLanding } from "@/components/landing/generate-landing";
import { LandingBoard } from "@/components/landing/landing-board";

export const metadata = { title: "Landing Page · GrowthOS" };

export default async function LandingPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;

  let project: ProjectView;
  try {
    project = await projectService.getProject(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const [analysis, page] = await Promise.all([
    analysisService.latest(ctx, id),
    landingService.forProject(ctx, id),
  ]);
  const hasAnalysis = analysis?.status === "COMPLETED" && !!analysis.result;
  const hasPage = !!page?.current;

  return (
    <div className="mx-auto max-w-screen-2xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500"
      >
        <ArrowLeft size={15} /> Back to {project.productName}
      </Link>

      <div className="mb-6 flex flex-col gap-2">
        <Eyebrow tone="light" icon={<LayoutTemplate size={11} />}>
          Landing page
        </Eyebrow>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{project.productName}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <Card>
            <CardBody>
              <CardTitle className="mb-3 text-base">Generate</CardTitle>
              <GenerateLanding projectId={id} hasAnalysis={hasAnalysis} hasPage={hasPage} />
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0">
          {hasPage && page?.current ? (
            <LandingBoard
              projectId={id}
              productName={project.productName}
              initial={page.current}
              versions={page.versions}
            />
          ) : (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-100 text-gold-500">
                  <LayoutTemplate size={22} />
                </span>
                <p className="font-semibold text-ink">No landing page yet</p>
                <p className="max-w-sm text-sm text-body">
                  {hasAnalysis
                    ? "Generate a landing page from the panel — the AI picks the framework and writes all 8 sections."
                    : "Run a product analysis first, then come back to generate the landing page."}
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
