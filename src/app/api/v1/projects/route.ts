/** /api/v1/projects — list (GET) and create (POST). */
import type { NextRequest } from "next/server";
import { requireContext } from "@/shared/auth/session";
import { json, problem } from "@/shared/http/respond";
import { projectService, createProjectSchema, listProjectsSchema, emptyToNull } from "@/modules/projects";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const opts = listProjectsSchema.parse(params);
    const page = await projectService.listProjects(ctx, opts);
    return json(page);
  } catch (err) {
    return problem(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireContext();
    const body = createProjectSchema.parse(await req.json());
    const project = await projectService.createProject(ctx, emptyToNull(body));
    return json(project, 201);
  } catch (err) {
    return problem(err);
  }
}
