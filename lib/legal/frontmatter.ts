// Same hand-rolled approach as `lib/docs/frontmatter.ts` and for the same reason — a tiny,
// fixed, known shape doesn't need a real YAML parser. Kept as its own small parser rather than
// reusing `parseFrontmatter` directly: legal pages have no `order` (there's no sequence between
// "Terms" and "Privacy" the way there is between docs pages), and forcing a meaningless `order`
// field into legal frontmatter just to satisfy an unrelated content type's schema would be worse
// than the few lines of duplication here.

const FRONTMATTER_BLOCK_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export type LegalFrontmatter = {
  title: string;
  description: string;
};

export function parseLegalFrontmatter(raw: string): {
  frontmatter: LegalFrontmatter;
  body: string;
} {
  const match = FRONTMATTER_BLOCK_PATTERN.exec(raw);
  if (!match) {
    throw new Error("Legal page is missing a --- frontmatter block");
  }

  const fields: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) value = value.slice(1, -1);

    fields[key] = value;
  }

  if (!fields.title || !fields.description) {
    throw new Error(
      `Legal page frontmatter must set title and description — got ${JSON.stringify(fields)}`,
    );
  }

  return {
    frontmatter: { title: fields.title, description: fields.description },
    body: raw.slice(match[0].length),
  };
}
