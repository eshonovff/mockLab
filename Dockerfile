# syntax=docker/dockerfile:1

# Node 22 LTS (CLAUDE.md §2's pinned runtime) — alpine, not slim/full: this app's only native
# dependency risk is Prisma's query engine, and `@prisma/adapter-pg` (lib/db.ts) means there is
# no Rust query engine binary at all — every query goes through the plain `pg` driver instead, so
# none of Alpine's usual Prisma/OpenSSL compatibility issues apply here.
FROM node:22-alpine AS base

# ---------------------------------------------------------------------------------------------
# deps: install exactly what package-lock.json pins, nothing more.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci`'s own `postinstall` runs `prisma generate`, which needs the schema file (and the
# config pointing at it) already present — without these two, install fails here, before the
# builder stage ever gets a chance to copy the rest of the source tree.
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npm ci

# ---------------------------------------------------------------------------------------------
# builder: `next build` plus `prisma generate` (postinstall already ran generate against `deps`'
# install, but the full source tree — including prisma/schema.prisma — is only copied in here).
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next.config.ts` imports `lib/env.ts` at module scope, which validates and throws immediately
# if these are missing — `next build` needs *some* value to get through that check even though
# nothing at build time actually connects to a database or signs a token. Real values are
# supplied at container run time via docker-compose's `environment:` / `.env`, which is what the
# running server actually uses; these build-time values are never read again after this stage.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV JWT_SECRET="build-time-placeholder-not-used-at-runtime-000000"
ENV NEXT_PUBLIC_SITE_URL="http://localhost:3000"

RUN npx prisma generate --config prisma7.config.ts
RUN npm run build

# ---------------------------------------------------------------------------------------------
# runner: `.next/standalone`'s traced output, plus `deps`'s full node_modules so the Prisma CLI
# is available for migrations (see the COPY below) — not the full source tree.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 mocklab

# No `public/` directory exists in this app (no static assets outside code-generated routes like
# `app/icon.tsx`/`app/favicon.ico`, which standalone tracing already includes) — nothing to copy
# there.
COPY --from=builder --chown=mocklab:nodejs /app/.next/standalone ./
COPY --from=builder --chown=mocklab:nodejs /app/.next/static ./.next/static

# The Prisma CLI itself (as opposed to `@prisma/client`, which the app imports and Next already
# traces into `standalone` above) is never `require()`d by any traced file, so it's absent from
# the copy above — `npx prisma` in this image would otherwise fall through to npm's registry and
# resolve `latest`, which is the `8.0.0-rc` Developer Platform CLI (see README's "Migrations"
# section), not the pinned 7.x this schema/config was written for.
#
# Copying just `node_modules/prisma` (+`@prisma/*`) from `deps` is not enough: `@prisma/config`
# requires `effect`, which pulls in its own dependency tree, and so on — the CLI's real transitive
# closure isn't practically enumerable by hand, and every attempt to hand-pick it turned into
# whack-a-mole against a new `MODULE_NOT_FOUND` (confirmed empirically, not assumed). Copying the
# entire `deps` node_modules wholesale is the only version of this that doesn't silently break the
# next time Prisma restructures its own dependencies; it lands on top of the traced `standalone`
# node_modules above (Docker COPY merges directories, only overwriting overlapping paths, so
# `@prisma/client`'s already-generated output is untouched) at a real image-size cost this project
# accepts in exchange for migrations that actually run. `dotenv` (imported by `prisma7.config.ts`)
# comes along automatically as part of the same tree.
COPY --from=deps --chown=mocklab:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=mocklab:nodejs /app/prisma ./prisma
COPY --from=deps --chown=mocklab:nodejs /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=deps --chown=mocklab:nodejs /app/package.json ./package.json

# The COPY above brought over `node_modules/.bin/prisma` too, but as the broken flat copy
# described above (`COPY` dereferenced the symlink at the source, not a real link) — `npx prisma`
# (what `docker compose exec app npx prisma migrate status` runs) resolves through this exact
# path, so leaving it broken would make that command fail even though the entrypoint's own direct
# `build/index.js` call works fine. Re-creating it as a genuine symlink here fixes `npx` too: this
# `ln -s` happens on the real container filesystem, not through `COPY`, so Node follows it
# normally at run time.
RUN rm -f node_modules/.bin/prisma && ln -s ../prisma/build/index.js node_modules/.bin/prisma

COPY --chown=mocklab:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER mocklab

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000

# docker-entrypoint.sh applies pending migrations (`prisma migrate deploy`, the CLI copied in
# above) before handing off to the server — see that file for why it's invoked the way it is.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
