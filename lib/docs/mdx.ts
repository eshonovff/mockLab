import { evaluate } from "@mdx-js/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import rehypeShiki from "@shikijs/rehype";
import remarkGfm from "remark-gfm";
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
 * `remarkGfm` adds GitHub-flavored markdown — tables, in particular, which the field-type and
 * query-parameter reference pages both rely on; plain CommonMark (MDX's default) has no table
 * syntax at all and would render a `| a | b |` line as a literal paragraph. `rehypeSlug` assigns
 * heading ids; `rehypeAutolinkHeadings` adds the anchor link inside each heading; `rehypeShiki`
 * highlights fenced code blocks. Order matters — slug ids must exist before autolink can
 * reference them, and both run after shiki's own tree edits are irrelevant to headings, so
 * shiki's position among the three doesn't matter.
 */
export async function compileDocBody(body: string): Promise<MDXContent> {
  const { default: Content } = await evaluate(body, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
      [rehypeShiki, SHIKI_OPTIONS],
    ],
  });

  return Content;
}
