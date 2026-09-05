import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

// No ownership check — an admin deleting any project regardless of owner is the point of this
// endpoint, unlike `/api/projects/[id]` which only ever deletes the caller's own.
export async function DELETE(_request: Request, { params }: RouteContext) {
  const check = await requireAdmin();
  if (!check.ok) return jsonError(check.status, check.message);

  const { id } = await params;
  const existing = await db.project.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return jsonError(404, "Project not found");

  // Cascades to Resource -> Override rows automatically (onDelete: Cascade, CLAUDE.md §4).
  await db.project.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
