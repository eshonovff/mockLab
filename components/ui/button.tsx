import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      // primary/secondary/ghost/destructive only — CLAUDE.md §6 doesn't define an "outline"
      // or "link" treatment, so those aren't part of this set.
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-line bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
      },
      // 32 / 40 / 48px per the task spec.
      size: {
        sm: "h-8 gap-1.5 px-3 text-caption",
        md: "h-10 px-4 text-body",
        lg: "h-12 px-5 text-body",
      },
      iconOnly: {
        true: "p-0",
        false: "",
      },
    },
    compoundVariants: [
      { iconOnly: true, size: "sm", className: "size-8" },
      { iconOnly: true, size: "md", className: "size-10" },
      { iconOnly: true, size: "lg", className: "size-12" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      iconOnly: false,
    },
  },
);

type ButtonOwnProps = {
  asChild?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
};

type ButtonSharedProps = Omit<React.ComponentProps<"button">, "children"> &
  Omit<VariantProps<typeof buttonVariants>, "iconOnly"> &
  ButtonOwnProps & { children?: React.ReactNode };

// `iconOnly` buttons carry no visible label, so an `aria-label` is required — enforced here at
// the type level (per the task: "make that a TypeScript requirement, not a comment"), not just
// documented.
export type ButtonProps =
  | (ButtonSharedProps & { iconOnly?: false })
  | (ButtonSharedProps & { iconOnly: true; "aria-label": string });

function Button({
  className,
  variant = "primary",
  size = "md",
  iconOnly = false,
  asChild = false,
  loading = false,
  startIcon,
  endIcon,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const spinner = <Loader2Icon className="animate-spin" />;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, iconOnly, className }))}
      {...props}
    >
      {asChild ? (
        // Radix's Slot merges the button's own props (className, data-*, disabled, ...) onto
        // its single child by cloning it — it requires exactly that one element, not a
        // Fragment. Wrapping `children` in the icon-decoration markup below (as every other
        // branch does) hands Slot a Fragment instead, and the merge silently no-ops: the
        // rendered element keeps none of the button's classes. `asChild` is for "style this
        // other element as a button" (a `Link`, most often) — icon/loading decoration isn't
        // meaningful there, so `children` passes through untouched.
        children
      ) : iconOnly ? (
        // The button's own required aria-label is the accessible name — the icon itself is
        // always decorative here, hidden so it's never separately announced.
        <span aria-hidden="true">{loading ? spinner : children}</span>
      ) : (
        <>
          {(loading || startIcon) && (
            <span aria-hidden="true">{loading ? spinner : startIcon}</span>
          )}
          {children}
          {!loading && endIcon && <span aria-hidden="true">{endIcon}</span>}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
