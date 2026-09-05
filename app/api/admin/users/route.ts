import { NextResponse } from "next/server";
import { z } from "zod";

import { publicUserSelect, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdminUserDto, AdminUsersListDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";
import { adminUsersQuerySchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

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

export async function GET(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return jsonError(check.status, check.message);

  const { searchParams } = new URL(request.url);
  const parsed = adminUsersQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  const { page, limit, search } = parsed.data;

  const where: Prisma.UserWhereInput | undefined = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }
    : undefined;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  const result: AdminUsersListDto = { users: users.map(toAdminUserDto), total, page, limit };
  return NextResponse.json(result);
}
