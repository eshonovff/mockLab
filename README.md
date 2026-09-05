# MockLab

A hosted fake REST API service. Define a resource schema and get a real, working REST
endpoint back — full CRUD, pagination, sorting, filtering, search — with data generated
deterministically on demand instead of stored row by row, so there's no record limit.

## Prerequisites

- Node.js 22 LTS
- PostgreSQL 17 (or Docker, to run it in a container — see below)

## Local setup

```bash
npm install
cp .env.example .env   # fill in real values — see "Environment variables" below
```

Start a local PostgreSQL 17 if you don't already have one:

```bash
docker run -d --name mocklab-postgres \
  -e POSTGRES_USER=mocklab -e POSTGRES_PASSWORD=mocklab -e POSTGRES_DB=mocklab \
  -p 5432:5432 postgres:17
```

Apply migrations and seed the permanent demo project (see "Migrations" below), then:

```bash
npm run dev
```

The app is at `http://localhost:3000`. `npm run dev` uses Turbopack — that's the Next.js 16
default, not an opt-in flag.

## Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://mocklab:mocklab@localhost:5432/mocklab` | Validated at startup (`lib/env.ts`) — the app refuses to boot without a well-formed value. |
| `JWT_SECRET` | Yes | a long random string | Signs session tokens (`lib/auth.ts`). Minimum 16 characters; use a real generated secret, never the placeholder in `.env.example`, for anything but local development. |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` | The canonical origin used to build every absolute URL — SEO metadata, sitemap, OG images, project base URLs shown in the dashboard. Must match wherever the app is actually reachable, or canonical/hreflang tags and og:image URLs will point at the wrong origin. |
| `NODE_ENV` | No | `production` | Standard Node convention; defaults to `development`. |

## Migrations

This project pins Prisma to `^7.10.0` explicitly — **do not run `npm install prisma@latest` or
follow a "Prisma has an update available" prompt.** The `prisma` package on npm currently
resolves `latest` to an `8.0.0-rc` build of a completely different CLI (the Prisma Developer
Platform beta, `auth login` / `project create` commands and all). If `npx prisma --help` ever
mentions those, the wrong package got installed — reinstall the pinned version from
`package.json`.

Every Prisma command in this project needs `--config prisma7.config.ts` — the config file isn't
named `prisma.config.ts` (Prisma's own auto-discovered default), so the flag is required or the
command won't find the datasource URL or the seed script:

```bash
# Create a new migration during development (applies it locally too)
npx prisma migrate dev --config prisma7.config.ts --name <describe-the-change>

# Apply existing migrations — what a production deploy runs
npx prisma migrate deploy --config prisma7.config.ts

# Seed the permanent demo project the home page's live demo widget calls
# (idempotent — safe to run again any time, including after every deploy)
npx prisma db seed --config prisma7.config.ts
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build. Requires real environment variables — `lib/env.ts` validates them at build time via `next.config.ts`. |
| `npm run start` | Run a production build (`npm run build` first). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint. |
| `npm run test` | Vitest (unit tests for `lib/generator/` and a few other pure modules). |

## Docker

```bash
# create a .env alongside docker-compose.yml with at least:
#   JWT_SECRET=<a long random string>
docker compose up --build
```

This starts two services: `postgres` (PostgreSQL 17, credentials `mocklab`/`mocklab`/`mocklab`,
persisted to a named volume) and `app` (this repo's `Dockerfile`, a multi-stage build producing
Next's `standalone` output — no dev dependencies or full `node_modules` in the final image).

**Migrations and seeding run from the host, not inside the `app` container.** The production
image intentionally ships only the standalone runtime (no Prisma CLI, no `tsx`), so point the
normal commands from "Migrations" above at the exposed Postgres port instead:

```bash
DATABASE_URL="postgresql://mocklab:mocklab@localhost:5432/mocklab" \
  npx prisma migrate deploy --config prisma7.config.ts

DATABASE_URL="postgresql://mocklab:mocklab@localhost:5432/mocklab" \
  npx prisma db seed --config prisma7.config.ts
```

Do this once after the first `docker compose up`, and again after any deploy that adds a new
migration.

### Health check

`GET /api/health` — a real database round trip (`SELECT 1`), not a bare "the process is alive"
response, so a container that's running but can't reach Postgres reports unhealthy. Both the
`app` service's own Docker healthcheck and any external load balancer/orchestrator health probe
should point at this.

## Production notes

- **In-memory rate limiting and dataset cache.** `lib/ratelimit.ts` and the mock API's dataset
  cache (`lib/generator/dataset.ts`) are process-local — not shared across replicas, reset on
  every deploy. Fine for a single instance; running more than one `app` replica behind a load
  balancer means each replica enforces its own independent rate-limit window and cache. Both are
  written behind an interface specifically so a Redis-backed implementation can swap in later
  without touching call sites — see the comments in each file.
- **Request metering and Override rows are never pruned by a background job.** `lib/metering.ts`
  prunes a project's own request-count history opportunistically (on that project's own next
  write), not on a schedule — there's no cron/job runner in this app. This is fine at v1 scale;
  a project that stops receiving traffic simply keeps its last 30 days of counts around
  indefinitely instead of being cleaned up by anything external.
- **No object storage.** Field types like `avatar`/`image` return URLs to external placeholder
  image services (picsum.photos, faker's own asset CDN) — nothing is uploaded or hosted by this
  app itself.
