import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ResourceDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";
import { generateResourceSeed } from "@/lib/ids";
import { requireOwnedProject } from "@/lib/ownership";
import { createResourceSchema } from "@/lib/validators";
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

  const { id: projectId } = await params;
  if (!(await requireOwnedProject(projectId, session.id))) {
    return jsonError(404, "Project not found");
  }

  const resources = await db.resource.findMany({
    where: { projectId },
    select: resourceSelect,
  });

  return NextResponse.json(resources.map(toResourceDto));
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id: projectId } = await params;
  if (!(await requireOwnedProject(projectId, session.id))) {
    return jsonError(404, "Project not found");
  }

  const body = await request.json().catch(() => null);
  const parsed = createResourceSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  const existing = await db.resource.findFirst({
    where: { projectId, name: parsed.data.name },
    select: { id: true },
  });
  if (existing) {
    return jsonError(409, "Validation failed", {
      name: ["A resource with this name already exists in this project"],
    });
  }

  const resource = await db.resource.create({
    data: {
      projectId,
      name: parsed.data.name,
      // Prisma's Json column input type wants an indexable InputJsonValue, which a concrete
      // interface like ResourceSchemaInput doesn't structurally satisfy even though it's
      // plain, valid JSON data at runtime — a cast here is the standard way to bridge that.
      schema: (parsed.data.schema ?? { fields: [] }) as Prisma.InputJsonValue,
      // `seed` is always server-generated at creation (CLAUDE.md §4: `nanoid(10)`) — only PATCH
      // (via a UI "regenerate" action) lets the client set a new one.
      seed: generateResourceSeed(),
      ...(parsed.data.count !== undefined ? { count: parsed.data.count } : {}),
    },
    select: resourceSelect,
  });

  return NextResponse.json(toResourceDto(resource), { status: 201 });
}
