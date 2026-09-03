import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import "./lib/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  // This project's real CLAUDE.md lives one directory above the repo root as the constitution
  // for AI-assisted work here. Next 16's `next dev`/`next build` would otherwise regenerate a
  // competing `CLAUDE.md` (and `AGENTS.md`) inside this directory on every run.
  agentRules: false,
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
