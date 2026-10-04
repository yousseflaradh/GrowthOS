/** Data shapes returned across the projects module boundary. */
import type { ProjectStatus } from "@/modules/projects/domain/project-status";

export interface ProjectView {
  id: string;
  productName: string;
  productUrl: string | null;
  description: string | null;
  image: string | null;
  status: ProjectStatus;
  createdByUserId: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ProjectCounts {
  total: number;
  byStatus: Record<ProjectStatus, number>;
}
