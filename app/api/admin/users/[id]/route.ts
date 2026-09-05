import { NextResponse } from "next/server";
import { z } from "zod";

import { publicUserSelect, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdminUserDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";
import { updateUserSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

function toAdminUserDto(user: {
  id: string;
  email: string;
  name: string | null;
  role: AdminUserDto["role"];
  status: AdminUserDto["status"];
  locale: string;
  createdAt: Date;
}): AdminUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
  };
}

// No ownership check here, unlike `/api/projects/[id]` — an admin acting on another user's
// account by id is the entire point of this endpoint, not a boundary to guard against.
export async function PATCH(request: Request, { params }: RouteContext) {
  const check = await requireAdmin();
  if (!check.ok) return jsonError(check.status, check.message);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  const existing = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return jsonError(404, "User not found");

  const user = await db.user.update({
    where: { id },
    data: parsed.data,
    select: publicUserSelect,
  });

  return NextResponse.json(toAdminUserDto(user));
}
