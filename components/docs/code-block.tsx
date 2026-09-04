"use client";

import { useTranslations } from "next-intl";
import { isValidElement, type ComponentProps, type ReactNode } from "react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { cn } from "@/lib/utils";

// Plain-text reduction of a compiled code block's children — shiki's rehype output is a tree of
// <span>s carrying per-token color styles, so the copyable text has to be reassembled from the
// JSX tree rather than read off a single string prop.
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * The MDX `pre` override (`lib/docs/mdx.ts`'s compiled component tree renders through this for
 * every fenced code block) — CLAUDE.md §6.1's one other allowed client component besides the
 * mobile nav toggle, needed here because copying requires interactivity.
 */
export function CodeBlock({ className, children, ...props }: ComponentProps<"pre">) {
  const t = useTranslations("docs");
  const code = nodeToText(children);

  return (
    <div className="group relative">
      <pre
        className={cn(
          "overflow-x-auto rounded-control border border-line p-4 font-mono text-caption",
          className,
        )}
        {...props}
      >
        {children}
      </pre>
      <CopyButton
        value={code}
        label={t("copyCode")}
        copiedToast={t("codeCopied")}
        errorToast={t("copyError")}
        variant="secondary"
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      />
    </div>
  );
}
