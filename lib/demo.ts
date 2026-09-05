// Task 7.2's home page hero calls a real, permanent project + resource through the actual
// public `/m/{key}/{resource}` mock API — "not a screenshot, not an illustration." That project
// is provisioned once by `prisma/seed.ts`, not created through the normal signup flow, so its
// identifiers are fixed constants here rather than looked up at request time.
//
// Unlike a real user's project key (always a random `nanoid(12)` — CLAUDE.md §4 — specifically
// so it can't be guessed), this one is deliberately short and readable: it's advertised on the
// home page itself, so there's nothing to protect by making it unguessable.
export const DEMO_PROJECT_KEY = "demo";

// `products` is the one the hero widget actually calls — kept as its own named export (rather
// than folded into `DEMO_RESOURCES` below) so `components/marketing/hero.tsx`'s existing import
// doesn't need to change. `users` and `posts` (task 9.4) exist alongside it in the same demo
// project — not wired into the hero widget itself (that's a UI decision task 9.4 doesn't ask
// for), just available at `/m/demo/users` and `/m/demo/posts` for anyone exploring the demo
// project directly.
export const DEMO_RESOURCE_NAME = "products";

// Fixed, not randomly generated (unlike a real resource's `nanoid(10)` seed) — the whole point
// of a public demo is that every visitor and every deploy sees the exact same data, which is
// itself the "how generation works" story (docs: /docs/how-generation-works) made visible. Same
// reasoning for every resource below.
export const DEMO_RESOURCE_SEED = "mocklabdemo1";

export const DEMO_USERS_RESOURCE_NAME = "users";
export const DEMO_USERS_RESOURCE_SEED = "mocklabdemo2";

export const DEMO_POSTS_RESOURCE_NAME = "posts";
export const DEMO_POSTS_RESOURCE_SEED = "mocklabdemo3";
