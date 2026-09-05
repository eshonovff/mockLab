import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// CLAUDE.md §8.4, verbatim: disallow `/api/`, `/m/`, `/*/dashboard`, `/*/admin`. The mock API
// (`/m/...`) is useless to crawl (per-project generated data), the platform API isn't a page,
// and dashboard/admin are already `noindex` in their own metadata — this is the belt to that
// braces.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/m/", "/*/dashboard", "/*/admin"],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
