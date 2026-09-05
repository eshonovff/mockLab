import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Task 9.5: the Docker health check. A genuine database round trip, not a bare "the process is
// alive" response — the one dependency this app can't run without, so a container that's up but
// can't reach Postgres should report unhealthy, not healthy.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
