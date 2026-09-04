"use client";

import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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

  async function handleRun() {
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
        </div>
        <Button type="button" size="sm" loading={isLoading} onClick={handleRun}>
          {isLoading ? t("running") : t("run")}
          {!isLoading && <ArrowRightIcon aria-hidden="true" />}
        </Button>
      </div>

      {state.kind === "idle" && (
        <p className="text-caption text-ink-muted">{t("idle", { brand: brand.name })}</p>
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
            <span className="text-caption text-ink-muted">
              {t("latency", { ms: state.latencyMs })}
            </span>
          </div>
          <pre className="max-h-72 overflow-auto font-mono text-caption text-ink">
            {state.bodyText}
          </pre>
        </div>
      )}
    </div>
  );
}
