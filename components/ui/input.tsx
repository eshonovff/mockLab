"use client";

import { EyeIcon, EyeOffIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  ref?: React.Ref<HTMLInputElement>;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: string;
  loading?: boolean;
};

function Input({
  className,
  type,
  startIcon,
  endIcon,
  error,
  loading = false,
  disabled,
  id,
  defaultValue,
  onChange,
  ref,
  ...props
}: InputProps) {
  const t = useTranslations("ui.input");
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  const internalRef = React.useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(
    () => defaultValue != null && String(defaultValue).length > 0,
  );

  const isPassword = type === "password";
  const isSearch = type === "search";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  function setRefs(node: HTMLInputElement | null) {
    internalRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.RefObject<HTMLInputElement | null>).current = node;
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (isSearch) {
      setHasValue(event.target.value.length > 0);
    }
    onChange?.(event);
  }

  function handleClear() {
    const node = internalRef.current;
    if (!node) return;
    // Programmatically clearing `node.value` directly doesn't notify React or anything
    // listening via a native "input"/"change" event — including react-hook-form's
    // ref-registered field, since Input stays uncontrolled for that to work untouched. Use
    // the native value setter + a dispatched event so it's indistinguishable from the user
    // clearing the field by hand.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(node, "");
    node.dispatchEvent(new Event("input", { bubbles: true }));
    setHasValue(false);
    node.focus();
  }

  const showPasswordToggle = isPassword;
  const showSearchIcon = isSearch && !startIcon;
  const showClearButton = isSearch && hasValue && !loading;

  const resolvedStartIcon = showSearchIcon ? <SearchIcon /> : startIcon;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center">
        {resolvedStartIcon && (
          <span
            aria-hidden="true"
            className="text-ink-muted pointer-events-none absolute left-3 flex size-4 items-center justify-center [&_svg]:size-4"
          >
            {resolvedStartIcon}
          </span>
        )}

        <input
          id={inputId}
          type={resolvedType}
          data-slot="input"
          ref={setRefs}
          disabled={disabled || loading}
          aria-invalid={!!error || undefined}
          aria-describedby={errorId}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cn(
            "h-10 w-full min-w-0 rounded-control border border-input bg-transparent px-3 text-body transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            resolvedStartIcon && "pl-9",
            (showPasswordToggle || showClearButton) && "pr-10",
            !showPasswordToggle && !showClearButton && (loading || endIcon) && "pr-9",
            className,
          )}
          {...props}
        />

        {loading ? (
          <span
            aria-hidden="true"
            className="text-ink-muted pointer-events-none absolute right-3 flex size-4 items-center justify-center [&_svg]:size-4"
          >
            <Loader2Icon className="animate-spin" />
          </span>
        ) : showPasswordToggle ? (
          // 32px hit target (not the 24px CSS-px WCAG 2.2 AA *minimum* — matches Button's own
          // "sm" scale and leaves real margin above the bare-minimum floor).
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-pressed={showPassword}
            className="text-ink-muted hover:text-ink absolute right-1 flex size-8 items-center justify-center rounded-control [&_svg]:size-4"
          >
            {showPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          </button>
        ) : showClearButton ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t("clearSearch")}
            className="text-ink-muted hover:text-ink absolute right-1 flex size-8 items-center justify-center rounded-control [&_svg]:size-4"
          >
            <XIcon aria-hidden="true" />
          </button>
        ) : (
          endIcon && (
            <span
              aria-hidden="true"
              className="text-ink-muted pointer-events-none absolute right-3 flex size-4 items-center justify-center [&_svg]:size-4"
            >
              {endIcon}
            </span>
          )
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-badge-rose-fg text-caption">
          {error}
        </p>
      )}
    </div>
  );
}

export { Input };
