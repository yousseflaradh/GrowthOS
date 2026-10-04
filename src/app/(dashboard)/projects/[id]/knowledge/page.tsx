import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Database } from "lucide-react";
import { requireContext } from "@/shared/auth/session";
import { projectService, type ProjectView } from "@/modules/projects";
import { knowledgeService } from "@/modules/knowledge";
import { AppError } from "@/shared/errors/app-error";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { KnowledgePanel } from "@/components/knowledge/knowledge-panel";
import { KnowledgeSearch } from "@/components/knowledge/knowledge-search";

export const metadata = { title: "Knowledge Base · GrowthOS" };

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  const { id } = await params;

  let project: ProjectView;
  try {
    project = await projectService.getProject(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const [documents, stats] = await Promise.all([
    knowledgeService.listDocuments(ctx, id),
    knowledgeService.stats(ctx, id),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-gold-500"
      >
        <ArrowLeft size={15} /> Back to {project.productName}
      </Link>

      <div className="mb-6 flex flex-col gap-2">
        <Eyebrow tone="light" icon={<Database size={11} />}>
          Knowledge base &amp; RAG
        </Eyebrow>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{project.productName}</h1>
        <p className="text-sm text-body">
          {stats.chunks} chunk{stats.chunks === 1 ? "" : "s"} across {stats.documents} document
          {stats.documents === 1 ? "" : "s"} — searchable AI memory for this project.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div>
          <Card>
            <CardBody>
              <CardTitle className="mb-3 flex items-center gap-2 text-base">
                <Boxes size={16} className="text-gold-500" /> Build memory
              </CardTitle>
              <KnowledgePanel projectId={id} documents={documents} />
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0">
          <Card>
            <CardBody>
              <CardTitle className="mb-3 text-base">Semantic search</CardTitle>
              <KnowledgeSearch projectId={id} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
