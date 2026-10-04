import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { analysisService } from "@/modules/analysis";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { AnalyzePanel } from "@/components/analysis/analyze-panel";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { SnapshotPanel } from "@/components/analysis/snapshot-panel";
import { ExportButtons } from "@/components/analysis/export-buttons";

export const metadata = { title: "Product Analysis · GrowthOS" };

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
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
  const completed = analysis?.status === "COMPLETED" && analysis.result;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500 print:hidden"
      >
        <ArrowLeft size={15} /> Back to {project.productName}
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Eyebrow tone="light" icon={<Sparkles size={11} />}>
            Product analysis
          </Eyebrow>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            {project.productName}
          </h1>
        </div>
        {completed && analysis && (
          <div className="print:hidden">
            <ExportButtons analysis={analysis} productName={project.productName} />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Run / re-run panel */}
        <div className="lg:col-span-1 print:hidden">
          <Card>
            <CardBody>
              <CardTitle className="mb-1 text-base">
                {completed ? "Re-analyze" : "Analyze this product"}
              </CardTitle>
              <p className="mb-4 text-sm text-body">
                Turn the product into a customer avatar, pains, desires, objections, USP, and triggers.
              </p>
              <AnalyzePanel
                projectId={id}
                projectName={project.productName}
                defaultUrl={project.productUrl}
                hasExisting={!!analysis}
              />
            </CardBody>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {completed && analysis?.result ? (
            <>
              {/* Print-only heading */}
              <div className="mb-4 hidden print:block">
                <h2 className="text-xl font-bold">{project.productName} — Customer Intelligence</h2>
              </div>
              {analysis.snapshot && <SnapshotPanel snapshot={analysis.snapshot} />}
              <AnalysisResults result={analysis.result} snapshot={analysis.snapshot} model={analysis.model} />
            </>
          ) : analysis?.status === "FAILED" ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-redtint text-red-500">
                  <AlertTriangle size={22} />
                </span>
                <p className="font-semibold text-ink">Analysis failed</p>
                <p className="max-w-sm text-sm text-body">{analysis.error ?? "Something went wrong."}</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-100 text-gold-500">
                  <Sparkles size={22} />
                </span>
                <p className="font-semibold text-ink">No analysis yet</p>
                <p className="max-w-sm text-sm text-body">
                  Run an analysis from the panel to generate structured customer intelligence for this product.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
