// Shared across every /m/{key}/{resource}* route (this task and 5.2's single-record route) —
// resolving a project + resource by their public identifiers, and the CORS header every mock
// API response needs. CLAUDE.md §9: "Access-Control-Allow-Origin: * ... Without this the whole
// product is useless in a browser" — that's not hyperbole, a mock API a browser-based fetch()
// can't read the response of has no purpose.

import { db } from "@/lib/db";

export const CORS_HEADERS: Record<string, string> = { "Access-Control-Allow-Origin": "*" };

export type ResolvedResource = {
  project: { id: string };
  resource: {
    id: string;
    name: string;
    schema: unknown;
    seed: string;
    count: number;
    dataVersion: number;
  };
};

/**
 * Resolves a project by its public `key` and a resource by `name` within it. Returns `null`
 * if either doesn't exist — CLAUDE.md §5.1: "404 with a JSON body if either is missing." Both
 * failure cases return the same `null` rather than distinguishing "no such project" from "no
 * such resource in this project" — the client-facing outcome is identical either way (this
 * resource doesn't exist at this URL), so there's nothing more specific worth telling a caller
 * who's often just an unauthenticated frontend, not the resource's own owner.
 */
export async function resolveProjectAndResource(
  key: string,
  resourceName: string,
): Promise<ResolvedResource | null> {
  const project = await db.project.findUnique({ where: { key }, select: { id: true } });
  if (!project) return null;

  const resource = await db.resource.findUnique({
    where: { projectId_name: { projectId: project.id, name: resourceName } },
  });
  if (!resource) return null;

  return { project, resource };
}
