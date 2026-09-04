// Ownership checks shared across every /api/projects/* and /api/resources/* route — extracted
// here (not duplicated per route file, unlike the small per-route DTO mappers) because this is
// security-critical: a copy-pasted where-clause that drifts from the original is exactly the
// kind of bug that leaks one user's data to another.

import { db } from "@/lib/db";

// A project that exists but belongs to someone else responds identically to one that doesn't
// exist at all (404, not 403) — the caller never learns whether another user's id is valid.
export async function requireOwnedProject(id: string, userId: string) {
  return db.project.findFirst({ where: { id, userId }, select: { id: true } });
}

// A resource has no `userId` of its own — ownership is via its project, so this joins through
// the relation rather than checking two ids separately.
export async function requireOwnedResource(id: string, userId: string) {
  return db.resource.findFirst({
    where: { id, project: { userId } },
    select: { id: true, projectId: true },
  });
}
