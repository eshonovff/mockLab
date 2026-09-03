import { customAlphabet } from "nanoid";

// Lowercase alphanumeric only — both ids live in URLs (a project's dashboard/mock-api base
// path, a resource's generation seed folded into it) where mixed case invites copy/paste bugs.
const LOWERCASE_ALPHANUMERIC = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Project.key (CLAUDE.md §4: "nanoid(12), URL segment") — generated server-side only. */
export const generateProjectKey = customAlphabet(LOWERCASE_ALPHANUMERIC, 12);

/** Resource.seed (CLAUDE.md §4: "nanoid(10)") — generated server-side only. */
export const generateResourceSeed = customAlphabet(LOWERCASE_ALPHANUMERIC, 10);
