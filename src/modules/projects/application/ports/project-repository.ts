/**
 * Persistence port for projects. Implemented by infrastructure; the application
 * service depends only on this interface (Clean Architecture dependency rule).
 * No Prisma types leak across this boundary.
 */
import type { RequestContext } from "@/shared/application/request-context";
import type { ProjectStatus } from "@/modules/projects/domain/project-status";
import type { ProjectView, Paginated, ProjectCounts } from "@/modules/projects/application/dto";

export interface CreateProjectData {
  productName: string;
  productUrl?: string | null;
  description?: string | null;
  image?: string | null;
  status?: ProjectStatus;
}

export interface UpdateProjectData {
  productName?: string;
  productUrl?: string | null;
  description?: string | null;
  image?: string | null;
  status?: ProjectStatus;
}

export interface ListProjectsOptions {
  cursor?: string;
  limit?: number;
  status?: ProjectStatus;
}

export interface ProjectRepository {
  create(ctx: RequestContext, data: CreateProjectData): Promise<ProjectView>;
  list(ctx: RequestContext, opts: ListProjectsOptions): Promise<Paginated<ProjectView>>;
  findById(ctx: RequestContext, id: string): Promise<ProjectView | null>;
  update(ctx: RequestContext, id: string, data: UpdateProjectData): Promise<ProjectView>;
  remove(ctx: RequestContext, id: string): Promise<void>;
  counts(ctx: RequestContext): Promise<ProjectCounts>;
}
