import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gauge, AlertTriangle } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { auditService } from "@/modules/audit";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { AuditPanel } from "@/components/audit/audit-panel";
import { AuditReport } from "@/components/audit/audit-report";
import { AuditHistory } from "@/components/audit/audit-history";

export const metadata = { title: "Page Audit · GrowthOS" };

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;

  let project: ProjectView;
  try {
    project = await projectService.getProject(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const [latest, history] = await Promise.all([auditService.latest(ctx, id), auditService.history(ctx, id)]);
  const completed = latest?.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500"
      >
        <ArrowLeft size={15} /> Back to {project.productName}
      </Link>

      <div className="mb-6 flex flex-col gap-2">
        <Eyebrow tone="light" icon={<Gauge size={11} />}>
          Page audit
        </Eyebrow>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{project.productName}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardBody>
              <CardTitle className="mb-3 text-base">Run an audit</CardTitle>
              <AuditPanel projectId={id} defaultUrl={project.productUrl ?? undefined} />
            </CardBody>
          </Card>
          <AuditHistory items={history} />
        </div>

        <div className="min-w-0">
          {completed && latest ? (
            <AuditReport audit={latest} />
          ) : latest?.status === "FAILED" ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-redtint text-red-500">
                  <AlertTriangle size={22} />
                </span>
                <p className="font-semibold text-ink">Audit failed</p>
                <p className="max-w-sm text-sm text-body">{latest.error ?? "Something went wrong."}</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-100 text-gold-500">
                  <Gauge size={22} />
                </span>
                <p className="font-semibold text-ink">No audit yet</p>
                <p className="max-w-sm text-sm text-body">
                  Paste a landing page URL and run an audit to get a 0–100 CRO score with findings and fixes.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
