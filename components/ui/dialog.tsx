"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const t = useTranslations("common");

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Dialog is an overlay: shadow-overlay, no border (CLAUDE.md §6). Radius matches
          // the card scale (20px) — a modal panel is a large surface, not a control.
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-card bg-popover p-4 text-sm text-popover-foreground shadow-overlay duration-100 outline-none sm:max-w-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="absolute top-2 right-2"
              aria-label={t("close")}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  const t = useTranslations("common");

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-card border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="secondary">{t("close")}</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

type DialogFormProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  confirmText: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
  confirmDisabled?: boolean;
};

// header + scrollable body + footer (cancel/confirm). Escape and overlay-click are disabled
// while `loading` so a pending request can't be orphaned by an accidental dismiss; focus moves
// to the first field on open (Radix already returns it to the trigger on close, so that half
// needs no extra code here).
function DialogForm({
  open,
  onOpenChange,
  defaultOpen,
  trigger,
  title,
  description,
  children,
  confirmText,
  onConfirm,
  loading = false,
  destructive = false,
  confirmDisabled = false,
}: DialogFormProps) {
  const t = useTranslations("common");
  const bodyRef = React.useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={!loading}
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (loading) event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          const firstField = bodyRef.current?.querySelector<HTMLElement>("input, textarea, select");
          if (firstField) {
            event.preventDefault();
            firstField.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div ref={bodyRef} className="max-h-[60vh] overflow-y-auto">
          {children}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={loading}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            loading={loading}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmDialogProps = Omit<DialogFormProps, "children" | "destructive" | "confirmDisabled"> & {
  /** The exact word the user must type before the confirm button enables — e.g. a project name. */
  confirmWord: string;
};

// Used for delete actions: confirm stays disabled until the user types `confirmWord` exactly.
function ConfirmDialog({ confirmWord, onOpenChange, ...props }: ConfirmDialogProps) {
  const t = useTranslations("ui.dialog");
  const [value, setValue] = React.useState("");

  function handleOpenChange(open: boolean) {
    // Reset so a previous confirmation doesn't silently carry over to the next open.
    if (open) setValue("");
    onOpenChange?.(open);
  }

  return (
    <DialogForm
      {...props}
      onOpenChange={handleOpenChange}
      destructive
      confirmDisabled={value !== confirmWord}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-dialog-word">{t("typeToConfirm", { word: confirmWord })}</Label>
        <Input
          id="confirm-dialog-word"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          disabled={props.loading}
        />
      </div>
    </DialogForm>
  );
}

export {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
