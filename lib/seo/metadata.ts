import type { Metadata } from "next";

import { brand } from "@/lib/brand";
import { env } from "@/lib/env";
import { locales, type Locale } from "@/lib/locales";

export type BuildMetadataInput = {
  locale: Locale;
  /**
   * Locale-neutral path: starts with `/`, empty string for the home page, never includes the
   * locale segment itself (that's added per entry below). Slugs stay in English across every
   * locale (CLAUDE.md §8.7), so this one path is valid for all six.
   */
  path: string;
  title: string;
  description: string;
  /** Dashboard and admin pages set this — CLAUDE.md §8.1: "Dashboard and admin are noindex." */
  noindex?: boolean;
};

function localeUrl(locale: Locale, path: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;
}

/**
 * The one place every indexable page builds its `Metadata` from (CLAUDE.md §8.2 and this task's
 * own "no page writes metadata by hand"). Produces `alternates.canonical`, `alternates.languages`
 * for all six locales plus `x-default` (pointing at the English URL, per CLAUDE.md §8.2's exact
 * wording), and matching OpenGraph/Twitter card data.
 *
 * Deliberately does *not* set `openGraph.images` — Next's file-convention `opengraph-image.tsx`
 * (task 7.4, not yet built) injects those automatically for any route segment that has one; a
 * manual reference here would either 404 today or need updating the moment 7.4 lands.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
}: BuildMetadataInput): Metadata {
  const canonical = localeUrl(locale, path);

  const languages: Record<string, string> = { "x-default": localeUrl("en", path) };
  for (const loc of locales) {
    languages[loc] = localeUrl(loc, path);
  }

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: brand.name,
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
