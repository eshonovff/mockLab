import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ResourceDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";
import { requireOwnedResource } from "@/lib/ownership";

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

// CLAUDE.md §4.4: reset deletes all overrides for the resource and bumps dataVersion (the same
// cache-invalidation trigger as changing schema/seed/count) — the generated data itself is
// untouched, only the accumulated edits on top of it are cleared.
export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id } = await params;
  if (!(await requireOwnedResource(id, session.id))) {
    return jsonError(404, "Resource not found");
  }

  const [, resource] = await db.$transaction([
    db.override.deleteMany({ where: { resourceId: id } }),
    db.resource.update({
      where: { id },
      data: { dataVersion: { increment: 1 } },
      select: resourceSelect,
    }),
  ]);

  return NextResponse.json(toResourceDto(resource));
}
