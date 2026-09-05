import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { listDocPages } from "@/lib/docs/content";
import { defaultLocale, locales } from "@/lib/locales";

function localeUrl(locale: string, path: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;
}

// One `alternates.languages` map per locale-neutral path, `x-default` pointing at the English
// URL — the exact same shape `lib/seo/metadata.ts`'s `buildMetadata` puts in each page's own
// `<head>` (CLAUDE.md §8.2/§8.4), just built here as a sitemap entry instead of page metadata.
function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = { "x-default": localeUrl(defaultLocale, path) };
  for (const locale of locales) {
    languages[locale] = localeUrl(locale, path);
  }
  return languages;
}

function routeEntries(path: string): MetadataRoute.Sitemap {
  const alternates = { languages: languageAlternates(path) };
  return locales.map((locale) => ({
    url: localeUrl(locale, path),
    alternates,
  }));
}

// CLAUDE.md §8.1/§8.4: every static route × six locales, `alternates.languages` on each entry.
// Only the home page and docs pages are statically rendered public routes today — templates
// (mentioned in CLAUDE.md's directory layout) haven't been built yet, and dashboard/admin are
// `noindex` (excluded here, disallowed in `app/robots.ts`).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Docs slugs are authored in English and identical across all six locale directories (CLAUDE.md
  // §7's "slugs stay in English") — English is the source of truth for which paths exist, same
  // role it plays for `messages/en.json`.
  const docsPages = await listDocPages(defaultLocale);

  return [
    ...routeEntries(""),
    ...docsPages.flatMap((page) => routeEntries(`/docs/${page.slug}`)),
  ];
}
