import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crosshair } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { competitorService } from "@/modules/competitor";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { CompetitorPanel } from "@/components/competitor/competitor-panel";
import { CompetitorList } from "@/components/competitor/competitor-report";

export const metadata = { title: "Competitors · GrowthOS" };

export default async function CompetitorsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;

  let project: ProjectView;
  try {
    project = await projectService.getProject(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const competitors = await competitorService.list(ctx, id);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500"
      >
        <ArrowLeft size={15} /> Back to {project.productName}
      </Link>

      <div className="mb-6 flex flex-col gap-2">
        <Eyebrow tone="light" icon={<Crosshair size={11} />}>
          Competitor intelligence
        </Eyebrow>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{project.productName}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <Card>
            <CardBody>
              <CardTitle className="mb-3 text-base">Add a competitor</CardTitle>
              <CompetitorPanel projectId={id} />
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0">
          <CompetitorList projectId={id} competitors={competitors} />
        </div>
      </div>
    </div>
  );
}
