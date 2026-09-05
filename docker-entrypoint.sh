#!/bin/sh
set -e

# Runs the CLI's real entry file directly, not `node_modules/.bin/prisma` — that path is a
# symlink to `../prisma/build/index.js`, and Docker's `COPY` dereferences a symlinked *file*
# source into a plain copy of its target's bytes rather than preserving the link (confirmed by
# inspecting the built image: `.bin/prisma` landed as a flat 110-byte file, so its own
# `require("./cli.js")` resolved against `.bin/` instead of `prisma/build/` and crashed with
# MODULE_NOT_FOUND). Calling `build/index.js` directly sidesteps that, and also avoids `npx`,
# which checks the registry for a newer version before running a locally-installed package —
# exactly the `prisma@latest` -> 8.0.0-rc trap the pinned 7.10.0 install exists to avoid (see
# README.md's "Migrations" section).
node ./node_modules/prisma/build/index.js migrate deploy --config prisma7.config.ts

exec "$@"
