"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  label: string;
  copiedToast: string;
  errorToast: string;
  variant?: "ghost" | "secondary";
  className?: string;
};

const COPIED_ICON_DURATION_MS = 1500;

export function CopyButton({
  value,
  label,
  copiedToast,
  errorToast,
  variant = "ghost",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clears a pending revert-to-idle timer on unmount, and on a rapid second click so it
  // doesn't fire mid-way through the new copy's own "copied" window.
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error(errorToast);
      return;
    }

    setCopied(true);
    toast.success(copiedToast);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_ICON_DURATION_MS);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      iconOnly
      aria-label={label}
      onClick={handleCopy}
      className={cn(className)}
    >
      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
    </Button>
  );
}
