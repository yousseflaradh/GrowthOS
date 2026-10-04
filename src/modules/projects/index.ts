/**
 * projects context — PUBLIC API + composition root.
 * Wires the concrete Prisma repository into the application service. This is
 * the only file allowed to import both application and infrastructure.
 */
import { createProjectService } from "./application/project-service";
import { prismaProjectRepository } from "./infrastructure/prisma-project-repository";

export const projectService = createProjectService(prismaProjectRepository);

export type { ProjectView, Paginated, ProjectCounts } from "./application/dto";
export type { ProjectStatus } from "./domain/project-status";
export { PROJECT_STATUSES } from "./domain/project-status";
export {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  emptyToNull,
} from "./interface/schemas";
