import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("parses title, description and order, and returns the body separately", () => {
    const raw = `---
title: Quick start
description: Five minutes to a live endpoint
order: 2
---

# Quick start

Some body text.
`;
    const { frontmatter, body } = parseFrontmatter(raw);

    expect(frontmatter).toEqual({
      title: "Quick start",
      description: "Five minutes to a live endpoint",
      order: 2,
    });
    expect(body).toBe("\n# Quick start\n\nSome body text.\n");
  });

  it("strips matching single or double quotes around a value", () => {
    const raw = `---
title: "Schema and field types"
description: 'Every field type, in one table'
order: 3
---
body
`;
    const { frontmatter } = parseFrontmatter(raw);

    expect(frontmatter.title).toBe("Schema and field types");
    expect(frontmatter.description).toBe("Every field type, in one table");
  });

  it("throws when the frontmatter block is missing entirely", () => {
    expect(() => parseFrontmatter("# Just a heading\n")).toThrow(/frontmatter/);
  });

  it("throws when a required field is missing", () => {
    const raw = `---
title: Introduction
order: 1
---
body
`;
    expect(() => parseFrontmatter(raw)).toThrow(/title, description/);
  });

  it("throws when order isn't a valid number", () => {
    const raw = `---
title: Introduction
description: What MockLab is
order: not-a-number
---
body
`;
    expect(() => parseFrontmatter(raw)).toThrow();
  });
});
