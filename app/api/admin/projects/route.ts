import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdminProjectDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";

function toAdminProjectDto(project: {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  _count: { resources: number };
  user: { id: string; email: string; name: string | null };
}): AdminProjectDto {
  return {
    id: project.id,
    name: project.name,
    key: project.key,
    createdAt: project.createdAt.toISOString(),
    resourceCount: project._count.resources,
    owner: project.user,
  };
}

// Unlike `/api/admin/users` this task's own wording doesn't ask for pagination or search on
// projects — a bare array, same shape as the non-admin `/api/projects` list (CLAUDE.md §9).
export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) return jsonError(check.status, check.message);

  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      createdAt: true,
      _count: { select: { resources: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json(projects.map(toAdminProjectDto));
}
