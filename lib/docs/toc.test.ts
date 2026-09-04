import GithubSlugger from "github-slugger";
import { describe, expect, it } from "vitest";

import { extractToc } from "./toc";

describe("extractToc", () => {
  it("collects h2/h3 headings in document order with their depth", () => {
    const body = `
Some intro text.

## Getting started

Body.

### Installing

More body.

## Next steps
`;
    expect(extractToc(body)).toEqual([
      { depth: 2, id: "getting-started", text: "Getting started" },
      { depth: 3, id: "installing", text: "Installing" },
      { depth: 2, id: "next-steps", text: "Next steps" },
    ]);
  });

  it("ignores a top-level h1 and any h4+", () => {
    const body = `
# Page title

## Real section

#### Too deep
`;
    expect(extractToc(body)).toEqual([{ depth: 2, id: "real-section", text: "Real section" }]);
  });

  it("ignores lines that look like headings inside fenced code blocks", () => {
    const body = `
## Real heading

\`\`\`bash
## not a heading
\`\`\`

## Another real heading
`;
    expect(extractToc(body)).toEqual([
      { depth: 2, id: "real-heading", text: "Real heading" },
      { depth: 2, id: "another-real-heading", text: "Another real heading" },
    ]);
  });

  it("strips inline emphasis/code markers from the display text", () => {
    const body = "## The `count` field is **required**\n";
    expect(extractToc(body)).toEqual([
      { depth: 2, id: "the-count-field-is-required", text: "The count field is required" },
    ]);
  });

  it("produces ids identical to a fresh github-slugger instance, including duplicate suffixes", () => {
    const body = `
## Filtering

## Filtering
`;
    const slugger = new GithubSlugger();
    const expectedIds = ["Filtering", "Filtering"].map((text) => slugger.slug(text));

    expect(extractToc(body).map((entry) => entry.id)).toEqual(expectedIds);
  });
});
