import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ResourceDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";
import { requireOwnedResource } from "@/lib/ownership";
import { updateResourceSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

const resourceSelect = {
  id: true,
  projectId: true,
  name: true,
  schema: true,
  seed: true,
  count: true,
  dataVersion: true,
} as const;

type RouteContext = { params: Promise<{ id: string }> };

function toResourceDto(resource: {
  id: string;
  projectId: string;
  name: string;
  schema: unknown;
  seed: string;
  count: number;
  dataVersion: number;
}): ResourceDto {
  return {
    id: resource.id,
    projectId: resource.projectId,
    name: resource.name,
    schema: resource.schema as ResourceDto["schema"],
    seed: resource.seed,
    count: resource.count,
    dataVersion: resource.dataVersion,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id } = await params;
  const resource = await db.resource.findFirst({
    where: { id, project: { userId: session.id } },
    select: resourceSelect,
  });

  if (!resource) return jsonError(404, "Resource not found");

  return NextResponse.json(toResourceDto(resource));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateResourceSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  const owned = await requireOwnedResource(id, session.id);
  if (!owned) return jsonError(404, "Resource not found");

  if (parsed.data.name !== undefined) {
    const existing = await db.resource.findFirst({
      where: { projectId: owned.projectId, name: parsed.data.name, id: { not: id } },
      select: { id: true },
    });
    if (existing) {
      return jsonError(409, "Validation failed", {
        name: ["A resource with this name already exists in this project"],
      });
    }
  }

  // CLAUDE.md §4.4: changing schema, seed, or count bumps dataVersion (it invalidates the
  // generated-dataset cache); renaming a resource doesn't change what it generates.
  const bumpsDataVersion =
    parsed.data.schema !== undefined ||
    parsed.data.seed !== undefined ||
    parsed.data.count !== undefined;

  const resource = await db.resource.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      // See app/api/projects/[id]/resources/route.ts for why this cast is needed.
      ...(parsed.data.schema !== undefined
        ? { schema: parsed.data.schema as Prisma.InputJsonValue }
        : {}),
      ...(parsed.data.seed !== undefined ? { seed: parsed.data.seed } : {}),
      ...(parsed.data.count !== undefined ? { count: parsed.data.count } : {}),
      ...(bumpsDataVersion ? { dataVersion: { increment: 1 } } : {}),
    },
    select: resourceSelect,
  });

  return NextResponse.json(toResourceDto(resource));
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id } = await params;
  if (!(await requireOwnedResource(id, session.id))) {
    return jsonError(404, "Resource not found");
  }

  // Cascades to Override rows automatically (onDelete: Cascade, CLAUDE.md §4).
  await db.resource.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
