import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ProjectDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";
import { requireOwnedProject } from "@/lib/ownership";
import { updateProjectSchema } from "@/lib/validators";

const projectSelect = { id: true, name: true, key: true, createdAt: true } as const;

type RouteContext = { params: Promise<{ id: string }> };

function toProjectDto(
  project: { id: string; name: string; key: string; createdAt: Date },
  resourceCount: number,
): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    key: project.key,
    createdAt: project.createdAt.toISOString(),
    resourceCount,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.id },
    select: { ...projectSelect, _count: { select: { resources: true } } },
  });

  if (!project) return jsonError(404, "Project not found");

  return NextResponse.json(toProjectDto(project, project._count.resources));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  if (!(await requireOwnedProject(id, session.id))) {
    return jsonError(404, "Project not found");
  }

  const project = await db.project.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { ...projectSelect, _count: { select: { resources: true } } },
  });

  return NextResponse.json(toProjectDto(project, project._count.resources));
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id } = await params;

  if (!(await requireOwnedProject(id, session.id))) {
    return jsonError(404, "Project not found");
  }

  // Cascades to Resource -> Override rows automatically (onDelete: Cascade, CLAUDE.md §4).
  await db.project.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
