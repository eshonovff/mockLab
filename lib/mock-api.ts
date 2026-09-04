// Shared across every /m/{key}/{resource}* route (this task and 5.2's single-record route) —
// resolving a project + resource by their public identifiers, and the CORS header every mock
// API response needs. CLAUDE.md §9: "Access-Control-Allow-Origin: * ... Without this the whole
// product is useless in a browser" — that's not hyperbole, a mock API a browser-based fetch()
// can't read the response of has no purpose.

import { db } from "@/lib/db";

// Wildcard origin alone isn't enough for a browser client to actually use this API. By the Fetch
// spec, cross-origin JavaScript can only read a fixed "CORS-safelisted" set of response headers
// (Content-Type, Content-Length, a few others) — every custom header this API sends
// (X-Total-Count, X-Page, X-Limit, Link, X-MockLab-Notice, Retry-After) is otherwise present on
// the wire but invisible to `fetch()`'s `Headers` object entirely, silently, with no console
// warning. Access-Control-Expose-Headers is what lifts that restriction. Caught live: a first
// pass without this line had every real cross-origin fetch() call succeed, while
// `response.headers.get("x-total-count")` silently returned `null` — not an error, just quietly
// unusable, exactly the kind of gap curl (which doesn't enforce header-exposure restrictions at
// all) can never catch and only a genuine browser-based cross-origin test surfaces.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers":
    "X-Total-Count, X-Page, X-Limit, Link, X-MockLab-Notice, Retry-After",
};

// Task 5.3: the *same* full method/header set is advertised by both routes' OPTIONS handlers,
// not just the subset each one actually implements (the collection route has no PUT/PATCH/
// DELETE; the single-record route has no POST) — a CORS preflight only asks "would this
// request be allowed," and a client shouldn't need to know which of the two routes it's
// preflighting against to interpret the answer.
export const CORS_PREFLIGHT_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

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
