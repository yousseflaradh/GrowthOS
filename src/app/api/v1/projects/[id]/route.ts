/** /api/v1/projects/[id] — get (GET), update (PATCH), delete (DELETE). */
import type { NextRequest } from "next/server";
import { requireContext } from "@/shared/auth/session";
import { json, problem } from "@/shared/http/respond";
import { projectService, updateProjectSchema, emptyToNull } from "@/modules/projects";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireContext();
    const { id } = await params;
    const project = await projectService.getProject(ctx, id);
    return json(project);
  } catch (err) {
    return problem(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireContext();
    const { id } = await params;
    const body = updateProjectSchema.parse(await req.json());
    const project = await projectService.updateProject(ctx, id, emptyToNull(body));
    return json(project);
  } catch (err) {
    return problem(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireContext();
    const { id } = await params;
    await projectService.deleteProject(ctx, id);
    return json({ ok: true });
  } catch (err) {
    return problem(err);
  }
}
