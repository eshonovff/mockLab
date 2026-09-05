import { NextResponse } from "next/server";
import { z } from "zod";

import { clearSessionCookie, getSession, publicUserSelect } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { updateProfileSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return jsonError(401, "Not authenticated");
  }

  return NextResponse.json(session);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  // Only touch fields the request actually sent — `undefined` means "not part of this update",
  // an empty `name` means "clear it" (lib/validators.ts's own comment on why the schema itself
  // can't express that distinction).
  const data: Prisma.UserUpdateInput = {};
  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name.length > 0 ? parsed.data.name : null;
  }
  if (parsed.data.locale !== undefined) {
    data.locale = parsed.data.locale;
  }

  const user = await db.user.update({
    where: { id: session.id },
    data,
    select: publicUserSelect,
  });

  return NextResponse.json(user);
}

// CLAUDE.md §9.1: "delete account ... cascades to projects, resources and overrides." Every one
// of those relations is already `onDelete: Cascade` in schema.prisma, so deleting this one row
// is the entire operation — no manual cleanup of child tables needed.
export async function DELETE() {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  await db.user.delete({ where: { id: session.id } });
  await clearSessionCookie();

  return new NextResponse(null, { status: 204 });
}
