import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { MDXContent } from "mdx/types";

import { brand } from "@/lib/brand";
import { parseFrontmatter, type DocFrontmatter } from "@/lib/docs/frontmatter";
import { compileDocBody } from "@/lib/docs/mdx";
import { extractToc, type TocEntry } from "@/lib/docs/toc";
import type { Locale } from "@/lib/locales";

// CLAUDE.md's own top-of-file rule: the product name "appears in exactly one place
// (lib/brand.ts) ... never hardcode the product name anywhere else." Doc content is prose that
// says the product's name repeatedly, so `.mdx` source files write these tokens instead of the
// literal strings; substitution runs on the raw text before MDX ever compiles it, so the
// compiler never sees `{{...}}` — only the already-substituted plain text.
const CONTENT_PLACEHOLDERS: Record<string, string> = {
  "{{brand}}": brand.name,
  "{{domain}}": brand.domain,
};

function substitutePlaceholders(text: string): string {
  let result = text;
  for (const [token, value] of Object.entries(CONTENT_PLACEHOLDERS)) {
    result = result.replaceAll(token, value);
  }
  return result;
}

const DOCS_CONTENT_DIR = path.join(process.cwd(), "content", "docs");

export type DocPageMeta = DocFrontmatter & { slug: string };

export type DocPageContent = DocPageMeta & {
  Component: MDXContent;
  toc: TocEntry[];
};

// One level deep only — `content/docs/{locale}/*.mdx`, no nested slug segments (CLAUDE.md
// §6.1's own glob). A resource named `.gitkeep` keeps the locale directory present in git even
// before it holds any real pages (task 6.2 adds the first ones).
async function listDocSlugs(locale: Locale): Promise<string[]> {
  const entries = await readdir(path.join(DOCS_CONTENT_DIR, locale)).catch(() => []);
  return entries
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => name.slice(0, -".mdx".length));
}

async function readDocFile(locale: Locale, slug: string): Promise<string | null> {
  return readFile(path.join(DOCS_CONTENT_DIR, locale, `${slug}.mdx`), "utf8").catch(() => null);
}

/** Every page's frontmatter for one locale, sorted by `order` — what the sidebar renders. */
export async function listDocPages(locale: Locale): Promise<DocPageMeta[]> {
  const slugs = await listDocSlugs(locale);

  const pages = await Promise.all(
    slugs.map(async (slug): Promise<DocPageMeta | null> => {
      const raw = await readDocFile(locale, slug);
      if (raw === null) return null;
      const { frontmatter } = parseFrontmatter(raw);
      return {
        ...frontmatter,
        title: substitutePlaceholders(frontmatter.title),
        description: substitutePlaceholders(frontmatter.description),
        slug,
      };
    }),
  );

  return pages.filter((page) => page !== null).sort((a, b) => a.order - b.order);
}

/** One page's frontmatter, TOC and compiled body — `null` if the slug doesn't exist. */
export async function getDocPage(locale: Locale, slug: string): Promise<DocPageContent | null> {
  const raw = await readDocFile(locale, slug);
  if (raw === null) return null;

  const { frontmatter, body } = parseFrontmatter(raw);
  const substitutedBody = substitutePlaceholders(body);
  const [Component, toc] = await Promise.all([
    compileDocBody(substitutedBody),
    extractToc(substitutedBody),
  ]);

  return {
    ...frontmatter,
    title: substitutePlaceholders(frontmatter.title),
    description: substitutePlaceholders(frontmatter.description),
    slug,
    Component,
    toc,
  };
}
