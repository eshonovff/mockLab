import { NextResponse } from "next/server";

/**
 * The platform API's error envelope (CLAUDE.md §9): success responses return the object or
 * array directly, so this is only ever used for non-2xx responses.
 */
export function jsonError(
  status: number,
  message: string,
  errors?: Record<string, string[]>,
): NextResponse {
  return NextResponse.json({ message, ...(errors ? { errors } : {}) }, { status });
}
