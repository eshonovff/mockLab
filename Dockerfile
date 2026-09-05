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
# runner: only `.next/standalone`'s traced output — not the full source tree or dev dependencies.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 mocklab

# No `public/` directory exists in this app (no static assets outside code-generated routes like
# `app/icon.tsx`/`app/favicon.ico`, which standalone tracing already includes) — nothing to copy
# there.
COPY --from=builder --chown=mocklab:nodejs /app/.next/standalone ./
COPY --from=builder --chown=mocklab:nodejs /app/.next/static ./.next/static

USER mocklab

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000

CMD ["node", "server.js"]
