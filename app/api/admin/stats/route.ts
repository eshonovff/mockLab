import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdminStatsDto } from "@/lib/dto";
import { jsonError } from "@/lib/http";
import { getTotalRequestsToday } from "@/lib/metering";

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) return jsonError(check.status, check.message);

  const [users, projects, resources, requestsToday] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.resource.count(),
    getTotalRequestsToday(),
  ]);

  const stats: AdminStatsDto = { users, projects, resources, requestsToday };
  return NextResponse.json(stats);
}
