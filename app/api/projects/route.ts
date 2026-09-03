import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { generateProjectKey } from "@/lib/ids";
import { createProjectSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

const projectSelect = { id: true, name: true, key: true, createdAt: true } as const;

const MAX_KEY_GENERATION_ATTEMPTS = 5;

function isKeyCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (error.meta?.target as string[] | undefined)?.includes("key") === true
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const projects = await db.project.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    select: projectSelect,
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  // `key` is generated here, never accepted from the client (CLAUDE.md §4.1). Collisions are
  // astronomically unlikely at 36^12, but retrying on one is cheap insurance against ever
  // handing out a duplicate URL segment.
  for (let attempt = 0; attempt < MAX_KEY_GENERATION_ATTEMPTS; attempt++) {
    try {
      const project = await db.project.create({
        data: { name: parsed.data.name, key: generateProjectKey(), userId: session.id },
        select: projectSelect,
      });
      return NextResponse.json(project, { status: 201 });
    } catch (error) {
      if (!isKeyCollision(error)) throw error;
    }
  }

  return jsonError(500, "Could not generate a unique project key — please try again");
}
