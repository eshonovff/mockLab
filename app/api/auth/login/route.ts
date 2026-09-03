import { NextResponse } from "next/server";
import { z } from "zod";

import { setSessionCookie, signToken, toPublicUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });

  // Generic message either way — never reveal whether the email exists.
  if (!user || !(await verifyPassword(password, user.password))) {
    return jsonError(401, "Invalid email or password");
  }

  if (user.status === "SUSPENDED") {
    return jsonError(403, "Your account has been suspended");
  }

  const token = await signToken({ userId: user.id });
  await setSessionCookie(token);

  return NextResponse.json(toPublicUser(user), { status: 200 });
}
