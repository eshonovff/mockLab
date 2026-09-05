import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MDXContent } from "mdx/types";

import { substitutePlaceholders } from "@/lib/content-placeholders";
import { compileDocBody } from "@/lib/docs/mdx";
import { parseLegalFrontmatter, type LegalFrontmatter } from "@/lib/legal/frontmatter";
import type { Locale } from "@/lib/locales";

const LEGAL_CONTENT_DIR = path.join(process.cwd(), "content", "legal");

export type LegalSlug = "terms" | "privacy";

export type LegalPageContent = LegalFrontmatter & { Component: MDXContent };

/** One legal page's frontmatter and compiled body — always exists for both slugs × six
 * locales (unlike docs, this isn't an open-ended collection a locale could fall behind on). */
export async function getLegalPage(locale: Locale, slug: LegalSlug): Promise<LegalPageContent> {
  const raw = await readFile(path.join(LEGAL_CONTENT_DIR, locale, `${slug}.mdx`), "utf8");
  const { frontmatter, body } = parseLegalFrontmatter(raw);
  const substitutedBody = substitutePlaceholders(body);
  const Component = await compileDocBody(substitutedBody);

  return {
    title: substitutePlaceholders(frontmatter.title),
    description: substitutePlaceholders(frontmatter.description),
    Component,
  };
}
