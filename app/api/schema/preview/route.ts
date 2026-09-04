import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { generateRange } from "@/lib/generator/record";
import { jsonError } from "@/lib/http";
import { previewRateLimiter } from "@/lib/ratelimit";
import { schemaPreviewSchema } from "@/lib/validators";

const PREVIEW_RECORD_COUNT = 3;

// Takes a schema, seed, and locale; returns three generated records without persisting
// anything (task 4.5) — no Resource row is read or written here at all, this only calls the
// pure generator directly, which is exactly what makes a live, unsaved preview possible.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");

  const limit = previewRateLimiter.check(session.id);
  if (!limit.allowed) {
    return jsonError(429, "Too many preview requests — try again shortly", undefined, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = schemaPreviewSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed", z.flattenError(parsed.error).fieldErrors);
  }

  const records = generateRange(
    { fields: parsed.data.schema.fields, locale: parsed.data.locale },
    parsed.data.seed,
    0,
    PREVIEW_RECORD_COUNT,
  );

  return NextResponse.json(records);
}
