import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import {
  findGeneratedRecordIndexById,
  getRecordById,
  type DatasetOverride,
  type DatasetResource,
} from "@/lib/generator/dataset";
import type { ResourceSchema } from "@/lib/generator/record";
import { jsonError } from "@/lib/http";
import { CORS_HEADERS, CORS_PREFLIGHT_HEADERS, resolveProjectAndResource } from "@/lib/mock-api";
import { mockApiRateLimiter } from "@/lib/ratelimit";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ key: string; resource: string; id: string }> };

// Where a write should land: an existing Override row to update in place, or — for a plain
// generated record's first-ever edit — the index to anchor a brand new one to.
type WriteTarget = { existing: { id: string } } | { index: number };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_PREFLIGHT_HEADERS });
}

async function fetchOverrides(resourceId: string): Promise<DatasetOverride[]> {
  const overrides = await db.override.findMany({
    where: { resourceId },
    orderBy: { id: "asc" },
  });
  return overrides.map((override): DatasetOverride => ({
    recordId: override.recordId,
    recordIndex: override.recordIndex,
    data: override.data as Record<string, unknown> | null,
    deleted: override.deleted,
    isNew: override.isNew,
  }));
}

/**
 * Resolves what a write to `recordId` should target: an existing (non-deleted) override row if
 * one already exists, or the generated index to anchor a first-time override to. `null` means
 * "this record doesn't exist" — either the id is simply invalid, or (above the 10k cutoff) it's
 * a plain generated record never touched by a prior write (dataset.ts's own documented
 * limitation for that case).
 */
async function resolveWriteTarget(
  resourceId: string,
  datasetResource: DatasetResource,
  recordId: string,
): Promise<WriteTarget | null> {
  const existing = await db.override.findUnique({
    where: { resourceId_recordId: { resourceId, recordId } },
  });

  if (existing) {
    return existing.deleted ? null : { existing: { id: existing.id } };
  }

  const index = findGeneratedRecordIndexById(datasetResource, recordId);
  return index === null ? null : { index };
}

async function upsertOverrideData(
  resourceId: string,
  recordId: string,
  target: WriteTarget,
  data: Record<string, unknown>,
): Promise<void> {
  const jsonData = data as Prisma.InputJsonValue;
  if ("existing" in target) {
    await db.$transaction([
      db.override.update({
        where: { id: target.existing.id },
        data: { data: jsonData, deleted: false },
      }),
      db.resource.update({ where: { id: resourceId }, data: { dataVersion: { increment: 1 } } }),
    ]);
    return;
  }

  await db.$transaction([
    db.override.create({
      data: {
        resourceId,
        recordId,
        recordIndex: target.index,
        data: jsonData,
        deleted: false,
        isNew: false,
      },
    }),
    db.resource.update({ where: { id: resourceId }, data: { dataVersion: { increment: 1 } } }),
  ]);
}

async function markOverrideDeleted(
  resourceId: string,
  recordId: string,
  target: WriteTarget,
): Promise<void> {
  if ("existing" in target) {
    await db.$transaction([
      db.override.update({ where: { id: target.existing.id }, data: { deleted: true } }),
      db.resource.update({ where: { id: resourceId }, data: { dataVersion: { increment: 1 } } }),
    ]);
    return;
  }

  // Data is left unset (NULL at the DB level) — dataset.ts never reads a deleted override's
  // `data` at all, so there's nothing worth writing here.
  await db.$transaction([
    db.override.create({
      data: { resourceId, recordId, recordIndex: target.index, deleted: true, isNew: false },
    }),
    db.resource.update({ where: { id: resourceId }, data: { dataVersion: { increment: 1 } } }),
  ]);
}

function toDatasetResource(resource: {
  id: string;
  schema: unknown;
  seed: string;
  count: number;
  dataVersion: number;
}): DatasetResource {
  return {
    id: resource.id,
    schema: resource.schema as ResourceSchema,
    seed: resource.seed,
    count: resource.count,
    dataVersion: resource.dataVersion,
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { key, resource: resourceName, id } = await params;

  const rateLimit = mockApiRateLimiter.check(key);
  if (!rateLimit.allowed) {
    return jsonError(429, "Too many requests", undefined, {
      ...CORS_HEADERS,
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const resolved = await resolveProjectAndResource(key, resourceName);
  if (!resolved) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  const overrides = await fetchOverrides(resolved.resource.id);
  const record = getRecordById(toDatasetResource(resolved.resource), overrides, id);

  if (!record) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  return NextResponse.json(record, { headers: CORS_HEADERS });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { key, resource: resourceName, id } = await params;

  const rateLimit = mockApiRateLimiter.check(key);
  if (!rateLimit.allowed) {
    return jsonError(429, "Too many requests", undefined, {
      ...CORS_HEADERS,
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const resolved = await resolveProjectAndResource(key, resourceName);
  if (!resolved) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "Request body must be a JSON object", undefined, CORS_HEADERS);
  }

  const datasetResource = toDatasetResource(resolved.resource);
  const target = await resolveWriteTarget(resolved.resource.id, datasetResource, id);
  if (!target) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  // PUT is a full replace — the body becomes the entire record. `id` always wins over anything
  // the client sent, same rule as everywhere else a record's id is decided (CLAUDE.md §3.3).
  const record = { ...body, id };
  await upsertOverrideData(resolved.resource.id, id, target, record);

  return NextResponse.json(record, { headers: CORS_HEADERS });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { key, resource: resourceName, id } = await params;

  const rateLimit = mockApiRateLimiter.check(key);
  if (!rateLimit.allowed) {
    return jsonError(429, "Too many requests", undefined, {
      ...CORS_HEADERS,
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const resolved = await resolveProjectAndResource(key, resourceName);
  if (!resolved) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "Request body must be a JSON object", undefined, CORS_HEADERS);
  }

  const datasetResource = toDatasetResource(resolved.resource);
  const overrides = await fetchOverrides(resolved.resource.id);
  const current = getRecordById(datasetResource, overrides, id);
  if (!current) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  const target = await resolveWriteTarget(resolved.resource.id, datasetResource, id);
  if (!target) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  // PATCH merges onto the current record rather than replacing it — `current` already carries
  // the record's real field values (generated or previously overridden), so a partial body only
  // touches the keys it actually sends.
  const record = { ...current, ...body, id };
  await upsertOverrideData(resolved.resource.id, id, target, record);

  return NextResponse.json(record, { headers: CORS_HEADERS });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { key, resource: resourceName, id } = await params;

  const rateLimit = mockApiRateLimiter.check(key);
  if (!rateLimit.allowed) {
    return jsonError(429, "Too many requests", undefined, {
      ...CORS_HEADERS,
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const resolved = await resolveProjectAndResource(key, resourceName);
  if (!resolved) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  const datasetResource = toDatasetResource(resolved.resource);
  const target = await resolveWriteTarget(resolved.resource.id, datasetResource, id);
  if (!target) return jsonError(404, "Not found", undefined, CORS_HEADERS);

  await markOverrideDeleted(resolved.resource.id, id, target);

  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
