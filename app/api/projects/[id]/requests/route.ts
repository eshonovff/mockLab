import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getProjectRequestMetrics } from "@/lib/metering";
import { requireOwnedProject } from "@/lib/ownership";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const { id: projectId } = await params;
  if (!(await requireOwnedProject(projectId, session.id))) {
    return jsonError(404, "Project not found");
  }

  return NextResponse.json(await getProjectRequestMetrics(projectId));
}
