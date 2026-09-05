import { brand } from "@/lib/brand";

// CLAUDE.md's own top-of-file rule: the product name "appears in exactly one place
// (lib/brand.ts) ... never hardcode the product name anywhere else." Long-form prose content
// (docs, legal pages) writes these tokens instead of the literal strings; substitution runs on
// the raw text before MDX ever compiles it, so the compiler never sees `{{...}}` — only the
// already-substituted plain text. Shared between `lib/docs/content.ts` and `lib/legal/content.ts`
// — both content types need the exact same substitution, and it's the kind of thing a
// copy-pasted second copy would quietly drift from the original over time.
const CONTENT_PLACEHOLDERS: Record<string, string> = {
  "{{brand}}": brand.name,
  "{{domain}}": brand.domain,
  "{{email}}": brand.email,
};

export function substitutePlaceholders(text: string): string {
  let result = text;
  for (const [token, value] of Object.entries(CONTENT_PLACEHOLDERS)) {
    result = result.replaceAll(token, value);
  }
  return result;
}
