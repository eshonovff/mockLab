"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  error?: string;
};

function Textarea({
  className,
  error,
  id,
  "aria-describedby": ariaDescribedby,
  ...props
}: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        id={textareaId}
        data-slot="textarea"
        aria-invalid={!!error || undefined}
        aria-describedby={errorId ?? ariaDescribedby}
        className={cn(
          "min-h-24 w-full rounded-control border border-input bg-transparent px-3 py-2 text-body transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-caption text-badge-rose-fg">
          {error}
        </p>
      )}
    </div>
  );
}

export { Textarea };
