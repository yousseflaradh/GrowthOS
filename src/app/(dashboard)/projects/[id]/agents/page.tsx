import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Workflow } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { agentService } from "@/agents";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { AgentRunner } from "@/components/agents/agent-runner";

export const metadata = { title: "Agents · GrowthOS" };

export default async function AgentsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;

  let project: ProjectView;
  try {
    project = await projectService.getProject(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const latest = await agentService.latest(ctx, id);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500"
      >
        <ArrowLeft size={15} /> Back to {project.productName}
      </Link>

      <div className="mb-6 flex flex-col gap-2">
        <Eyebrow tone="light" icon={<Workflow size={11} />}>
          AI agent orchestration
        </Eyebrow>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{project.productName}</h1>
        <p className="text-sm text-body">
          Eight specialist agents — Product, Research, Psychology, Competitor, Creative, Copywriter, Landing,
          Audit — run as one graph. Each recalls your knowledge base, hands off to the next, and tracks its
          own cost.
        </p>
      </div>

      <Card>
        <CardBody>
          <CardTitle className="mb-4 text-base">Campaign workflow</CardTitle>
          <AgentRunner projectId={id} initialRun={latest} />
        </CardBody>
      </Card>
    </div>
  );
}
