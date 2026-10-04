import { requireContext } from "@/shared/auth/session";
import { projectService } from "@/modules/projects";
import { ProjectsBoard } from "@/components/projects/projects-board";

export const metadata = { title: "Projects · GrowthOS" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const ctx = await requireContext();
  const { new: isNew } = await searchParams;
  const initial = await projectService.listProjects(ctx, { limit: 12 });

  return <ProjectsBoard initial={initial} autoOpenNew={isNew === "1"} />;
}
