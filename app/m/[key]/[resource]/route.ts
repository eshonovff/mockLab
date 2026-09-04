import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getDataset, type DatasetOverride } from "@/lib/generator/dataset";
import type { ResourceSchema } from "@/lib/generator/record";
import { jsonError } from "@/lib/http";
import { CORS_HEADERS, CORS_PREFLIGHT_HEADERS, resolveProjectAndResource } from "@/lib/mock-api";
import { db } from "@/lib/db";
import { parseQuery } from "@/lib/query";
import { mockApiRateLimiter } from "@/lib/ratelimit";
import type { Prisma } from "@prisma/client";

// The mock API is the actual product — CLAUDE.md §9's own requirements, applied literally:
// dynamic per-request (never statically cached — every request can carry different query params
// or reflect a write that just happened), and on the Node runtime specifically (Prisma's pg
// driver adapter needs it, same reason every other DB-touching route already needs it).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ key: string; resource: string }> };

function buildLinkHeader(url: URL, page: number, limit: number, totalCount: number): string {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const linkFor = (targetPage: number) => {
    const target = new URL(url);
    target.searchParams.set("page", String(targetPage));
    return target.toString();
  };

  const links = [`<${linkFor(1)}>; rel="first"`, `<${linkFor(totalPages)}>; rel="last"`];
  if (page > 1) links.push(`<${linkFor(page - 1)}>; rel="prev"`);
  if (page < totalPages) links.push(`<${linkFor(page + 1)}>; rel="next"`);
  return links.join(", ");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_PREFLIGHT_HEADERS });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { key, resource: resourceName } = await params;

  const rateLimit = mockApiRateLimiter.check(key);
  if (!rateLimit.allowed) {
    return jsonError(429, "Too many requests", undefined, {
      ...CORS_HEADERS,
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const resolved = await resolveProjectAndResource(key, resourceName);
  if (!resolved) {
    return jsonError(404, "Not found", undefined, CORS_HEADERS);
  }

  const parsedQuery = parseQuery(request.nextUrl.searchParams);
  if (!parsedQuery.success) {
    return jsonError(422, "Validation failed", parsedQuery.errors, CORS_HEADERS);
  }

  const overrides = await db.override.findMany({
    where: { resourceId: resolved.resource.id },
    // Override has no createdAt (CLAUDE.md §4) — id (cuid) is the closest available proxy for
    // creation order, which is what determines where `isNew` records land (dataset.ts's own
    // documented contract from task 3.5).
    orderBy: { id: "asc" },
  });

  const dataset = getDataset(
    {
      id: resolved.resource.id,
      schema: resolved.resource.schema as ResourceSchema,
      seed: resolved.resource.seed,
      count: resolved.resource.count,
      dataVersion: resolved.resource.dataVersion,
    },
    overrides.map((override): DatasetOverride => ({
      recordId: override.recordId,
      recordIndex: override.recordIndex,
      data: override.data as Record<string, unknown> | null,
      deleted: override.deleted,
      isNew: override.isNew,
    })),
    parsedQuery.data,
  );

  const headers: Record<string, string> = {
    ...CORS_HEADERS,
    "X-Total-Count": String(dataset.totalCount),
    "X-Page": String(parsedQuery.data.page),
    "X-Limit": String(parsedQuery.data.limit),
    Link: buildLinkHeader(
      request.nextUrl,
      parsedQuery.data.page,
      parsedQuery.data.limit,
      dataset.totalCount,
    ),
  };
  if (dataset.notice) headers["X-MockLab-Notice"] = dataset.notice;

  return NextResponse.json(dataset.records, { headers });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { key, resource: resourceName } = await params;

  const rateLimit = mockApiRateLimiter.check(key);
  if (!rateLimit.allowed) {
    return jsonError(429, "Too many requests", undefined, {
      ...CORS_HEADERS,
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const resolved = await resolveProjectAndResource(key, resourceName);
  if (!resolved) {
    return jsonError(404, "Not found", undefined, CORS_HEADERS);
  }

  const body: unknown = await request.json().catch(() => null);
  // Field-level validation against the resource's own schema is explicitly out of scope for v1
  // (CLAUDE.md §11) — a mock API's whole point is accepting whatever a client under
  // development sends. Only the outer shape (a JSON object, not an array/primitive/unparseable
  // body) is checked, since Override.data has to be an object for the merge logic to work.
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "Request body must be a JSON object", undefined, CORS_HEADERS);
  }

  const id = randomUUID();
  // `id` always wins over a client-supplied one — same rule generateRecord already enforces
  // for generated records (task 3.3): a record's id is never something the caller controls.
  const record = { ...body, id };

  await db.$transaction([
    db.override.create({
      data: {
        resourceId: resolved.resource.id,
        recordId: id,
        recordIndex: null,
        data: record as Prisma.InputJsonValue,
        deleted: false,
        isNew: true,
      },
    }),
    // CLAUDE.md §5: "Every POST/PUT/PATCH/DELETE writes an Override row and increments
    // dataVersion" — without this, the cached merged dataset (keyed by dataVersion) would keep
    // serving the pre-write result until something else happened to bump it.
    db.resource.update({
      where: { id: resolved.resource.id },
      data: { dataVersion: { increment: 1 } },
    }),
  ]);

  return NextResponse.json(record, { status: 201, headers: CORS_HEADERS });
}
