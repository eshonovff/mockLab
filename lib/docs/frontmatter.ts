// Every doc page's frontmatter is exactly three flat fields (title, description, order) — a
// fixed, known shape CLAUDE.md §6.1 specifies directly, not open-ended YAML a real parser is
// needed for. A tiny hand-rolled parser for that fixed shape avoids pulling in a full YAML
// dependency (js-yaml, remark-frontmatter + remark-mdx-frontmatter) for three key: value lines.

const FRONTMATTER_BLOCK_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export type DocFrontmatter = {
  title: string;
  description: string;
  order: number;
};

/** Strips the `---`-delimited frontmatter block and parses its three known fields. */
export function parseFrontmatter(raw: string): { frontmatter: DocFrontmatter; body: string } {
  const match = FRONTMATTER_BLOCK_PATTERN.exec(raw);
  if (!match) {
    throw new Error("Doc page is missing a --- frontmatter block");
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

  const order = Number(fields.order);
  if (!fields.title || !fields.description || !Number.isFinite(order)) {
    throw new Error(
      `Doc page frontmatter must set title, description and a numeric order — got ${JSON.stringify(fields)}`,
    );
  }

  return {
    frontmatter: { title: fields.title, description: fields.description, order },
    body: raw.slice(match[0].length),
  };
}
