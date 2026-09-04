import { NextResponse } from "next/server";

/**
 * The platform API's error envelope (CLAUDE.md §9): success responses return the object or
 * array directly, so this is only ever used for non-2xx responses.
 *
 * `headers` exists for the 429 case (CLAUDE.md §9: "returning 429 with Retry-After") — used by
 * the schema preview endpoint's rate limit, and by the mock API's own rate limiting later.
 */
export function jsonError(
  status: number,
  message: string,
  errors?: Record<string, string[]>,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json({ message, ...(errors ? { errors } : {}) }, { status, headers });
}
