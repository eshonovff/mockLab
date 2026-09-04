"use client";

import { useEffect, useSyncExternalStore } from "react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SnippetKey = "fetch" | "axios" | "tanstackQuery" | "curl";

const SNIPPET_TABS: SnippetKey[] = ["fetch", "axios", "tanstackQuery", "curl"];

const TAB_LABELS: Record<SnippetKey, string> = {
  fetch: "fetch",
  axios: "axios",
  tanstackQuery: "TanStack Query",
  curl: "cURL",
};

// No product name in the key (CLAUDE.md's own rule: the name lives in exactly one place).
// Module-level, not component state — every `CodeSnippetTabs` instance on a page (task 6.4:
// used on the resource page's endpoint console, which renders one per endpoint) shares this one
// value, so switching to "axios" in one block instantly switches every other block on the same
// page too, not just on the next page load.
const STORAGE_KEY = "snippet-tab";
const DEFAULT_TAB: SnippetKey = "fetch";

const listeners = new Set<() => void>();
let currentTab: SnippetKey = DEFAULT_TAB;

function isSnippetKey(value: string): value is SnippetKey {
  return (SNIPPET_TABS as string[]).includes(value);
}

function setSharedTab(tab: SnippetKey): void {
  currentTab = tab;
  try {
    localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    // Private browsing / disabled storage — the in-memory value above still updates this
    // session's other snippet blocks, it just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SnippetKey {
  return currentTab;
}

// The server has no localStorage — always renders the default tab, then a client effect (see
// below) reconciles with whatever was actually stored, exactly once, the first time any
// instance mounts.
function getServerSnapshot(): SnippetKey {
  return DEFAULT_TAB;
}

function useSharedSnippetTab(): [SnippetKey, (tab: SnippetKey) => void] {
  const tab = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isSnippetKey(stored) && stored !== currentTab) {
        currentTab = stored;
        listeners.forEach((listener) => listener());
      }
    } catch {
      // Nothing stored (or storage inaccessible) — stay on the default.
    }
    // Runs once per mounted instance; every instance converges on the same stored value, and
    // re-running it doesn't change the outcome, so an instance mounting later than the first
    // is harmless, not a duplicate side effect.
  }, []);

  return [tab, setSharedTab];
}

/**
 * Task 6.4: a tabbed code block — fetch / axios / TanStack Query / cURL — with a copy button
 * for whichever tab is active. Used on the resource page's endpoint console (one block per
 * endpoint, showing how to call that specific URL) and, in docs, on the Quick start page's main
 * example. The four variants are supplied as plain strings by the caller rather than generated
 * from a shared description — each call site already knows its own exact method/URL/body, and a
 * generic "build me an axios call" helper would be more machinery than four call sites need.
 *
 * Code is rendered as plain monospace text, not syntax-highlighted — unlike docs' static code
 * fences (compiled through shiki at build time in `lib/docs/mdx.ts`), the resource page's
 * snippets are built from a real, per-request `baseUrl` known only at render time, so there's no
 * single build-time string to run through shiki for that use site. Keeping both use sites
 * unhighlighted, rather than highlighting only the docs one, keeps the component's own behavior
 * identical everywhere it's used.
 */
export function CodeSnippetTabs({
  snippets,
  copyLabel,
  copiedToast,
  errorToast,
}: {
  snippets: Record<SnippetKey, string>;
  copyLabel: string;
  copiedToast: string;
  errorToast: string;
}) {
  const [tab, setTab] = useSharedSnippetTab();

  return (
    <Tabs value={tab} onValueChange={(value) => isSnippetKey(value) && setTab(value)}>
      <div className="flex items-center justify-between gap-2">
        <TabsList variant="line">
          {SNIPPET_TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {TAB_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
        <CopyButton
          value={snippets[tab]}
          label={copyLabel}
          copiedToast={copiedToast}
          errorToast={errorToast}
          variant="ghost"
        />
      </div>
      {SNIPPET_TABS.map((key) => (
        <TabsContent key={key} value={key}>
          <pre className="overflow-x-auto rounded-control border border-line p-4 font-mono text-caption">
            <code>{snippets[key]}</code>
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
