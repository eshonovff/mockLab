"use client";

import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type DemoState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; status: number; latencyMs: number; bodyText: string }
  | { kind: "error" };

// A plain module-level helper, not part of the component body — `performance.now()` is an
// impure call the React Compiler's purity check rejects inside a component/hook (confirmed the
// same way in `components/builder/endpoint-console.tsx`'s `performRequest`).
async function runDemoRequest(
  url: string,
): Promise<{ status: number; latencyMs: number; bodyText: string }> {
  const start = performance.now();
  const response = await fetch(url);
  const latencyMs = Math.round(performance.now() - start);
  const bodyText = JSON.stringify(await response.json(), null, 2);
  return { status: response.status, latencyMs, bodyText };
}

function getPrefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// The JSON body types in over a fixed wall-clock duration regardless of response length, rather
// than popping in all at once. This is the one authored motion moment on the page (CLAUDE.md
// §6: the rest of the landing page stays quiet) — the request feels alive, not decorated.
const TYPE_IN_DURATION_MS = 550;

/**
 * The hero's live demo (task 7.2's one allowed client component beyond the fully static rest of
 * the page). Fires a real `fetch()` against the permanent demo resource `prisma/seed.ts`
 * provisions — not a screenshot, not a canned response — and reveals the actual JSON that comes
 * back. `requestPath`/`fullUrl` are both server-computed props: `requestPath` is what's shown
 * before the click (a clean `/m/demo/products` reference line), `fullUrl` is what's actually
 * fetched.
 */
export function HeroDemo({ requestPath, fullUrl }: { requestPath: string; fullUrl: string }) {
  const t = useTranslations("home.hero.demo");
  const [state, setState] = useState<DemoState>({ kind: "idle" });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [revealLength, setRevealLength] = useState(0);
  // Lazy initializer (not an effect) so the very first client render already has the real
  // browser preference — see the `useEffect` below for how it then tracks live OS changes.
  const [reducedMotion, setReducedMotion] = useState(getPrefersReducedMotion);

  // Subscribes to live changes in the OS-level reduced-motion preference (a user can flip it
  // while the tab is open). This is the only thing this effect does — the actual `setState`
  // happens inside the `change` listener, not synchronously in the effect body.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Ticks a live elapsed-time counter while the request is in flight — the real measured time,
  // not a fake progress bar, updated every frame via rAF. Skipped under reduced motion: the
  // button's own "Running…" label plus aria-busy already communicate the pending state.
  useEffect(() => {
    if (state.kind !== "loading" || reducedMotion) return;

    const start = performance.now();
    let frame: number;

    function tick() {
      setElapsedMs(Math.round(performance.now() - start));
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [state.kind, reducedMotion]);

  // Types the JSON body in once the real response has arrived. Under reduced motion this effect
  // does nothing at all — render derives the full body directly from `reducedMotion` below, so
  // the animation reduces to its end state rather than a slower version of itself.
  useEffect(() => {
    if (state.kind !== "done" || reducedMotion) return;

    const fullLength = state.bodyText.length;
    const start = performance.now();
    let frame: number;

    function tick() {
      const progress = Math.min(1, (performance.now() - start) / TYPE_IN_DURATION_MS);
      setRevealLength(Math.round(fullLength * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [state, reducedMotion]);

  async function handleRun() {
    setElapsedMs(0);
    setRevealLength(0);
    setState({ kind: "loading" });
    try {
      const { status, latencyMs, bodyText } = await runDemoRequest(fullUrl);
      setState({ kind: "done", status, latencyMs, bodyText });
    } catch {
      setState({ kind: "error" });
    }
  }

  const isLoading = state.kind === "loading";

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="mint">GET</Badge>
          <code className="truncate font-mono text-caption text-ink-muted">{requestPath}</code>
          {isLoading && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-accent motion-safe:animate-pulse"
            />
          )}
        </div>
        <Button type="button" size="sm" loading={isLoading} onClick={handleRun}>
          {isLoading ? t("running") : t("run")}
          {!isLoading && <ArrowRightIcon aria-hidden="true" />}
        </Button>
      </div>

      {state.kind === "idle" && (
        <p className="text-caption text-ink-muted">{t("idle", { brand: brand.name })}</p>
      )}

      {isLoading && !reducedMotion && (
        <p className="font-mono text-caption text-ink-muted tabular-nums">
          {t("latency", { ms: elapsedMs })}
        </p>
      )}

      {state.kind === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-badge-rose-fg">{t("error")}</p>
          <Button type="button" variant="secondary" size="sm" onClick={handleRun} className="w-fit">
            {t("retry")}
          </Button>
        </div>
      )}

      {state.kind === "done" && (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-control bg-muted/30 p-4",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1",
          )}
        >
          <div className="flex items-center gap-2">
            <Badge variant={state.status >= 200 && state.status < 300 ? "mint" : "rose"}>
              {state.status}
            </Badge>
            <span className="text-caption text-ink-muted tabular-nums">
              {t("latency", { ms: state.latencyMs })}
            </span>
          </div>
          {/* The visible <pre> is the typed-in animation and is hidden from assistive tech —
              screen readers get the full response immediately via the sr-only sibling below,
              rather than dozens of incremental text mutations as revealLength climbs. Reduced
              motion shows the full body straight away: `reducedMotion` (not the animation
              effect, which never runs in that case) is what decides the displayed length. */}
          <pre
            aria-hidden="true"
            className="max-h-72 overflow-auto font-mono text-caption text-ink"
          >
            {state.bodyText.slice(0, reducedMotion ? state.bodyText.length : revealLength)}
            {!reducedMotion && revealLength < state.bodyText.length && (
              <span className="ml-px inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] bg-ink motion-safe:animate-pulse" />
            )}
          </pre>
          <span className="sr-only">{state.bodyText}</span>
        </div>
      )}
    </div>
  );
}
