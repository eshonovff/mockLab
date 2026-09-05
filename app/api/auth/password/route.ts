import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  // `getSession` never returns `password` (CLAUDE.md's own `PublicUser` contract) — fetched
  // separately here, the same way login does, since this is the one place besides login that
  // actually needs the hash.
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { password: true },
  });
  if (!user) return jsonError(401, "Not authenticated");

  if (!(await verifyPassword(parsed.data.currentPassword, user.password))) {
    return jsonError(400, "Validation failed", {
      currentPassword: ["Current password is incorrect"],
    });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({ where: { id: session.id }, data: { password: newHash } });

  return new NextResponse(null, { status: 204 });
}
