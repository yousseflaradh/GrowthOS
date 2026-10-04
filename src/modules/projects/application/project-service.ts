/**
 * Projects application service (use cases). Pure orchestration over the
 * ProjectRepository port + RBAC policy. Constructed with its dependency in the
 * module's composition root (index.ts) so this file imports no infrastructure.
 */
import { can, type RequestContext } from "@/shared/application/request-context";
import { AppError } from "@/shared/errors/app-error";
import type {
  ProjectRepository,
  CreateProjectData,
  UpdateProjectData,
  ListProjectsOptions,
} from "@/modules/projects/application/ports/project-repository";
import type { ProjectView, Paginated, ProjectCounts } from "@/modules/projects/application/dto";

export function createProjectService(repo: ProjectRepository) {
  async function getOrThrow(ctx: RequestContext, id: string): Promise<ProjectView> {
    const project = await repo.findById(ctx, id);
    if (!project) throw AppError.notFound("Project not found.");
    return project;
  }

  return {
    async createProject(ctx: RequestContext, data: CreateProjectData): Promise<ProjectView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to create projects.");
      return repo.create(ctx, data);
    },

    listProjects(ctx: RequestContext, opts: ListProjectsOptions = {}): Promise<Paginated<ProjectView>> {
      return repo.list(ctx, { ...opts, limit: Math.min(opts.limit ?? 20, 100) });
    },

    getProject(ctx: RequestContext, id: string): Promise<ProjectView> {
      return getOrThrow(ctx, id);
    },

    async updateProject(ctx: RequestContext, id: string, data: UpdateProjectData): Promise<ProjectView> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to edit projects.");
      await getOrThrow(ctx, id); // ensures the project is visible to this tenant
      return repo.update(ctx, id, data);
    },

    async deleteProject(ctx: RequestContext, id: string): Promise<void> {
      if (!can.edit(ctx)) throw AppError.forbidden("You don't have permission to delete projects.");
      await getOrThrow(ctx, id);
      await repo.remove(ctx, id);
    },

    getCounts(ctx: RequestContext): Promise<ProjectCounts> {
      return repo.counts(ctx);
    },
  };
}

export type ProjectService = ReturnType<typeof createProjectService>;
