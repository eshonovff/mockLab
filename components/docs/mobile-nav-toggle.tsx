"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The sidebar nav itself stays server-rendered (passed as `children`) — this only toggles its
// CSS visibility below the `md` breakpoint. At `md` and up the nav is always visible regardless
// of `open`, so this component has no effect on desktop beyond the hidden toggle button.
export function MobileNavToggle({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        startIcon={<MenuIcon aria-hidden="true" />}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="mb-3 md:hidden"
      >
        {label}
      </Button>
      <div className={cn(open ? "block" : "hidden", "md:block")}>{children}</div>
    </>
  );
}
