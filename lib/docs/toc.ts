import GithubSlugger from "github-slugger";

// `##`/`###` headings only — CLAUDE.md §6.1's "sticky table of contents" is a page outline, not
// a full document tree; a real h1 (the page title) never repeats inside the body, and `####+`
// would make the TOC deeper than a sidebar reasonably shows.
const HEADING_PATTERN = /^(#{2,3})\s+(.+?)\s*$/;
const CODE_FENCE_PATTERN = /^```/;
// Strips the inline emphasis/code markers a heading might carry (`**bold**`, `` `code` ``) —
// the TOC shows plain text, not formatted markdown.
const INLINE_MARKDOWN_PATTERN = /[*_`]/g;

export type TocEntry = {
  depth: 2 | 3;
  id: string;
  text: string;
};

/**
 * Scans raw MDX body text for `##`/`###` headings and returns them with slug ids. Uses
 * `github-slugger` directly — the same slugger `rehype-slug` uses internally — so an id
 * computed here from raw text matches the id `rehype-slug` assigns to the same heading in the
 * rendered HTML exactly, keeping `<a href="#id">` TOC links working. A fresh `GithubSlugger`
 * instance per call mirrors `rehype-slug`'s own per-document reset (so a repeated heading text
 * gets the same `-1`/`-2` disambiguation suffix in both places).
 */
export function extractToc(body: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const toc: TocEntry[] = [];
  let inFence = false;

  for (const line of body.split("\n")) {
    if (CODE_FENCE_PATTERN.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = HEADING_PATTERN.exec(line);
    if (!match) continue;

    const depth = match[1]!.length as 2 | 3;
    const text = match[2]!.replace(INLINE_MARKDOWN_PATTERN, "");
    toc.push({ depth, id: slugger.slug(text), text });
  }

  return toc;
}
