import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Route-protection layouts ((app), (admin)) need the current pathname to build a `?next=`
// redirect target, but Server Components have no direct way to read it — thread it through
// as a request header instead, read back via `headers()`.
//
// Must mutate `request.headers` BEFORE calling next-intl's handler, not the response after:
// next-intl's own middleware clones `request.headers` internally and forwards that clone via
// `NextResponse.next({ request: { headers } })` — setting a header on its *returned* response
// only adds an outgoing response header, which downstream `headers()` calls never see.
export default function proxy(request: NextRequest) {
  request.headers.set("x-pathname", request.nextUrl.pathname);
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|m|_next|_vercel|.*\\..*).*)"],
};
