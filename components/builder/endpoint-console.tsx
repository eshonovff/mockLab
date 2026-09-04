"use client";

import { CodeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CodeSnippetTabs, type SnippetKey } from "@/components/code-snippet-tabs";
import { CopyButton } from "@/components/dashboard/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type EndpointId = "list" | "create" | "read" | "replace" | "update" | "delete";

type EndpointDef = {
  id: EndpointId;
  method: Method;
  needsId: boolean;
  // A body-bearing request always sends the same minimal `{}` — CLAUDE.md §11 puts field-level
  // body validation out of scope for v1, so the mock API accepts any JSON object regardless.
  // This console is a "try it" panel, not a request builder with an editable body.
  hasBody: boolean;
};

const ENDPOINTS: EndpointDef[] = [
  { id: "list", method: "GET", needsId: false, hasBody: false },
  { id: "create", method: "POST", needsId: false, hasBody: true },
  { id: "read", method: "GET", needsId: true, hasBody: false },
  { id: "replace", method: "PUT", needsId: true, hasBody: true },
  { id: "update", method: "PATCH", needsId: true, hasBody: true },
  { id: "delete", method: "DELETE", needsId: true, hasBody: false },
];

const METHOD_BADGE_VARIANT: Record<Method, "mint" | "lilac" | "amber" | "rose"> = {
  GET: "mint",
  POST: "lilac",
  PUT: "amber",
  PATCH: "amber",
  DELETE: "rose",
};

function statusBadgeVariant(status: number): "mint" | "amber" | "rose" {
  if (status >= 200 && status < 300) return "mint";
  if (status >= 400 && status < 500) return "amber";
  return "rose";
}

type EndpointResult =
  | { kind: "response"; status: number; latencyMs: number; bodyText: string | null }
  | { kind: "no-records" }
  | { kind: "network-error" };

// A plain module-level helper, not part of the component body — `performance.now()` is an
// impure call the React Compiler's purity check rejects inside a component/hook, even one only
// ever reached from an event handler (react-hooks/purity can't see that timing distinction).
async function performRequest(
  url: string,
  init: RequestInit,
): Promise<{ status: number; latencyMs: number; bodyText: string | null }> {
  const start = performance.now();
  const response = await fetch(url, init);
  const latencyMs = Math.round(performance.now() - start);

  let bodyText: string | null = null;
  if (response.status !== 204) {
    const raw = await response.text();
    try {
      bodyText = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      bodyText = raw || null;
    }
  }

  return { status: response.status, latencyMs, bodyText };
}

async function resolveRecordId(baseUrl: string): Promise<string | null> {
  const response = await fetch(`${baseUrl}?limit=1`);
  if (!response.ok) return null;

  const records: unknown = await response.json().catch(() => null);
  const first = Array.isArray(records) ? (records[0] as unknown) : null;
  if (!first || typeof first !== "object" || !("id" in first)) return null;

  const id = (first as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}

// Task 6.4: one `CodeSnippetTabs` block per endpoint, shown on demand. The URL uses the same
// literal `:id` placeholder as the row's own reference URL above it — this is documentation of
// the endpoint's shape for a developer to copy into their own code, not a replay of whatever id
// a Send happened to resolve, so it stays a placeholder even after a real id has been resolved.
// DELETE gets its own branch throughout: it's the one method here that returns `204 No Content`
// (`app/m/[key]/[resource]/[id]/route.ts`), so its samples never call `.json()` on the response.
function buildSnippets(endpoint: EndpointDef, baseUrl: string): Record<SnippetKey, string> {
  const url = endpoint.needsId ? `${baseUrl}/:id` : baseUrl;
  const jsUrl = endpoint.needsId ? `${baseUrl}/\${id}` : baseUrl;
  const isDelete = endpoint.method === "DELETE";

  const fetchInit = endpoint.hasBody
    ? `, {\n  method: "${endpoint.method}",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({}),\n}`
    : endpoint.method !== "GET"
      ? `, { method: "${endpoint.method}" }`
      : "";

  const fetchSnippet = isDelete
    ? `await fetch(\`${jsUrl}\`, { method: "DELETE" });`
    : `const response = await fetch(\`${jsUrl}\`${fetchInit});\nconst data = await response.json();`;

  const axiosMethod = endpoint.method.toLowerCase();
  const axiosSnippet = isDelete
    ? `await axios.delete(\`${jsUrl}\`);`
    : endpoint.hasBody
      ? `const { data } = await axios.${axiosMethod}(\`${jsUrl}\`, {});`
      : `const { data } = await axios.${axiosMethod}(\`${jsUrl}\`);`;

  const tanstackSnippet =
    endpoint.method === "GET"
      ? `const { data } = useQuery({\n  queryKey: ["records"${endpoint.needsId ? ", id" : ""}],\n  queryFn: () => fetch(\`${jsUrl}\`).then((res) => res.json()),\n});`
      : `const mutation = useMutation({\n  mutationFn: () => fetch(\`${jsUrl}\`${fetchInit}),\n});`;

  const curlFlag = endpoint.method === "GET" ? "" : ` -X ${endpoint.method}`;
  const curlBody = endpoint.hasBody
    ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '{}'`
    : "";

  return {
    fetch: fetchSnippet,
    axios: axiosSnippet,
    tanstackQuery: tanstackSnippet,
    curl: `curl${curlFlag} "${url}"${curlBody}`,
  };
}

export function EndpointConsole({ baseUrl }: { baseUrl: string }) {
  const t = useTranslations("builder");

  // Resolved lazily on the first send that needs one (`read`/`replace`/`update`/`delete`), then
  // reused across the others so every id-based row targets the same record. Cleared after a
  // successful delete — that id is no longer a valid target, so the next id-based send should
  // pick a different (still existing) record rather than repeatedly 404ing.
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Partial<Record<EndpointId, boolean>>>({});
  const [results, setResults] = useState<Partial<Record<EndpointId, EndpointResult>>>({});
  const [snippetOpen, setSnippetOpen] = useState<Partial<Record<EndpointId, boolean>>>({});

  async function handleSend(endpoint: EndpointDef) {
    setPending((prev) => ({ ...prev, [endpoint.id]: true }));
    setResults((prev) => ({ ...prev, [endpoint.id]: undefined }));

    try {
      let targetId = resolvedId;
      if (endpoint.needsId && !targetId) {
        targetId = await resolveRecordId(baseUrl);
        if (!targetId) {
          setResults((prev) => ({ ...prev, [endpoint.id]: { kind: "no-records" } }));
          return;
        }
        setResolvedId(targetId);
      }

      const url = endpoint.needsId ? `${baseUrl}/${targetId}` : baseUrl;
      const init: RequestInit = { method: endpoint.method };
      if (endpoint.hasBody) {
        init.headers = { "Content-Type": "application/json" };
        init.body = "{}";
      }

      const { status, latencyMs, bodyText } = await performRequest(url, init);

      setResults((prev) => ({
        ...prev,
        [endpoint.id]: { kind: "response", status, latencyMs, bodyText },
      }));

      if (endpoint.method === "DELETE" && status >= 200 && status < 300) setResolvedId(null);
    } catch {
      setResults((prev) => ({ ...prev, [endpoint.id]: { kind: "network-error" } }));
    } finally {
      setPending((prev) => ({ ...prev, [endpoint.id]: false }));
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-ink">{t("endpoints.title")}</h2>
        <p className="text-caption text-ink-muted">{t("endpoints.description")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {ENDPOINTS.map((endpoint) => {
          const displayUrl = endpoint.needsId ? `${baseUrl}/:id` : baseUrl;
          const result = results[endpoint.id];
          const isPending = pending[endpoint.id] ?? false;
          const isSnippetOpen = snippetOpen[endpoint.id] ?? false;

          return (
            <div
              key={endpoint.id}
              className="flex flex-col gap-2 rounded-control border border-line p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={METHOD_BADGE_VARIANT[endpoint.method]}>{endpoint.method}</Badge>
                  <span className="truncate text-caption text-ink-muted">
                    {t(`endpoints.${endpoint.id}`)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={isSnippetOpen ? t("endpoints.hideCode") : t("endpoints.showCode")}
                    aria-pressed={isSnippetOpen}
                    onClick={() =>
                      setSnippetOpen((prev) => ({ ...prev, [endpoint.id]: !isSnippetOpen }))
                    }
                  >
                    <CodeIcon aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={isPending}
                    onClick={() => handleSend(endpoint)}
                  >
                    {t("endpoints.send")}
                  </Button>
                </div>
              </div>

              {isSnippetOpen && (
                <CodeSnippetTabs
                  snippets={buildSnippets(endpoint, baseUrl)}
                  copyLabel={t("endpoints.copyCode")}
                  copiedToast={t("endpoints.codeCopied")}
                  errorToast={t("endpoints.codeCopyError")}
                />
              )}

              <div className="flex items-center gap-2 rounded-control border border-line bg-muted/50 px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-caption text-ink-muted">
                  {endpoint.needsId ? (
                    <>
                      {baseUrl}/<span className="text-accent">:id</span>
                    </>
                  ) : (
                    baseUrl
                  )}
                </code>
                <CopyButton
                  value={displayUrl}
                  label={t("endpoints.copyUrl")}
                  copiedToast={t("endpoints.copied")}
                  errorToast={t("endpoints.copyError")}
                />
              </div>

              {result && (
                <div className="flex flex-col gap-1.5 rounded-control bg-muted/30 p-3">
                  {result.kind === "response" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusBadgeVariant(result.status)}>{result.status}</Badge>
                        <span className="text-caption text-ink-muted">{result.latencyMs} ms</span>
                      </div>
                      <pre
                        className={cn(
                          "max-h-64 overflow-auto font-mono text-caption text-ink",
                          !result.bodyText && "text-ink-muted",
                        )}
                      >
                        {result.bodyText ?? t("endpoints.noContent")}
                      </pre>
                    </>
                  )}
                  {result.kind === "no-records" && (
                    <p className="text-caption text-badge-amber-fg">{t("endpoints.noRecords")}</p>
                  )}
                  {result.kind === "network-error" && (
                    <p className="text-caption text-badge-rose-fg">{t("endpoints.networkError")}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
