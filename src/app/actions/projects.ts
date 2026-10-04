"use server";

/**
 * Project Server Actions (first-party UI). Validate → resolve tenant context →
 * call the application service → revalidate affected routes → emit analytics.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { captureServerEvent } from "@/lib/posthog";
import {
  projectService,
  createProjectSchema,
  updateProjectSchema,
  emptyToNull,
  type ProjectView,
} from "@/modules/projects";

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
}

export async function createProjectAction(input: unknown): Promise<ActionResult<ProjectView>> {
  return action(async () => {
    const ctx = await requireContext();
    const data = emptyToNull(createProjectSchema.parse(input));
    const project = await projectService.createProject(ctx, data);
    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "project_created",
      properties: { projectId: project.id },
    });
    revalidate();
    return project;
  });
}

export async function updateProjectAction(id: string, input: unknown): Promise<ActionResult<ProjectView>> {
  return action(async () => {
    const ctx = await requireContext();
    const data = emptyToNull(updateProjectSchema.parse(input));
    const project = await projectService.updateProject(ctx, id, data);
    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "project_updated",
      properties: { projectId: id },
    });
    revalidate();
    revalidatePath(`/projects/${id}`);
    return project;
  });
}

export async function deleteProjectAction(id: string): Promise<ActionResult<{ id: string }>> {
  return action(async () => {
    const ctx = await requireContext();
    await projectService.deleteProject(ctx, id);
    captureServerEvent({
      distinctId: ctx.userId,
      organizationId: ctx.organizationId,
      event: "project_deleted",
      properties: { projectId: id },
    });
    revalidate();
    return { id };
  });
}
