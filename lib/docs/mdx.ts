import { evaluate } from "@mdx-js/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import rehypeShiki from "@shikijs/rehype";
import * as runtime from "react/jsx-runtime";
import type { MDXContent } from "mdx/types";

// Single light theme — CLAUDE.md §6: "Dark mode: not in v1." A code block with no fenced
// language (` ``` ` alone) falls back to plain text rather than throwing.
const SHIKI_OPTIONS = {
  theme: "github-light",
  defaultLanguage: "text",
} as const;

/**
 * Compiles one doc page's already-frontmatter-stripped MDX body into a renderable React
 * component. Runs server-side only (evaluated once per page render, statically at build time
 * via `generateStaticParams`) — `evaluate()`'s use of `new Function` needs the Node runtime,
 * which a statically generated page already runs under.
 *
 * `rehypeSlug` assigns heading ids; `rehypeAutolinkHeadings` adds the anchor link inside each
 * heading; `rehypeShiki` highlights fenced code blocks. Order matters — slug ids must exist
 * before autolink can reference them, and both run after shiki's own tree edits are irrelevant
 * to headings, so shiki's position among the three doesn't matter.
 */
export async function compileDocBody(body: string): Promise<MDXContent> {
  const { default: Content } = await evaluate(body, {
    ...runtime,
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
      [rehypeShiki, SHIKI_OPTIONS],
    ],
  });

  return Content;
}
