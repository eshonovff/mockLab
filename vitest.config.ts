import path from "node:path";

import { defineConfig } from "vitest/config";

// Vitest (unlike `next dev`/`next build`) never loads `.env` on its own — needed the moment a
// test imports anything that pulls in `lib/env.ts` (task 7.1's `lib/seo/metadata.ts` is the
// first), since that module validates `process.env` at import time and throws if it's empty.
// Same package (`dotenv`) and same pattern `prisma7.config.ts` already uses for the same reason.
import "dotenv/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
