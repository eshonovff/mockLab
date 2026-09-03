import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, publicUserSelect, setSessionCookie, signToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { registerSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    return jsonError(409, "Validation failed", { email: ["Email already in use"] });
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await db.user.create({
      data: { email, password: passwordHash, name },
      select: publicUserSelect,
    });
  } catch (error) {
    // The findUnique check above isn't atomic with this create — a concurrent duplicate
    // registration can still race past it and hit the unique constraint here.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "Validation failed", { email: ["Email already in use"] });
    }
    throw error;
  }

  const token = await signToken({ userId: user.id });
  await setSessionCookie(token);

  return NextResponse.json(user, { status: 201 });
}
