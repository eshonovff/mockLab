"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileJsonIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createResource, resourcesQueryKey } from "@/components/projects/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inferSchema, type InferredSchema } from "@/lib/generator/infer-schema";
import { resourceNameSchema } from "@/lib/validators";

const EXAMPLE_PLACEHOLDER = `[
  { "title": "Blue Chair", "price": 49.99, "inStock": true },
  { "title": "Red Table", "price": 129.99, "inStock": false }
]`;

type Step = "paste" | "confirm";

export function JsonImportDialog({ projectId }: { projectId: string }) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("paste");
  const [name, setName] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [jsonError, setJsonError] = useState<string | undefined>();
  const [inferred, setInferred] = useState<InferredSchema | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!inferred) throw new Error("nothing to import");
      return createResource(projectId, { name, schema: { fields: inferred.fields } });
    },
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: resourcesQueryKey(projectId) });
      toast.success(t("resources.toasts.created"));
      setOpen(false);
      router.push(`/${locale}/dashboard/resources/${resource.id}`);
    },
    onError: () => toast.error(t("resources.toasts.error")),
  });

  function reset() {
    setStep("paste");
    setName("");
    setRawJson("");
    setNameError(undefined);
    setJsonError(undefined);
    setInferred(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  function handleAnalyze() {
    const nameResult = resourceNameSchema.safeParse(name);
    if (!nameResult.success) {
      setNameError(nameResult.error.issues[0]?.message ?? t("resources.import.errors.name"));
      return;
    }
    setNameError(undefined);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      setJsonError(t("resources.import.errors.invalidJson"));
      return;
    }

    try {
      const result = inferSchema(parsed);
      setJsonError(undefined);
      setInferred(result);
      setStep("confirm");
    } catch {
      setJsonError(t("resources.import.errors.unsupportedShape"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" startIcon={<FileJsonIcon aria-hidden="true" />}>
          {t("resources.import.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={!mutation.isPending}
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        {step === "paste" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("resources.import.title")}</DialogTitle>
              <DialogDescription>{t("resources.import.description")}</DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="import-name">{t("resources.newResource.nameLabel")}</Label>
                <Input
                  id="import-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("resources.newResource.namePlaceholder")}
                  error={nameError}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="import-json">{t("resources.import.jsonLabel")}</Label>
                <Textarea
                  id="import-json"
                  value={rawJson}
                  onChange={(event) => setRawJson(event.target.value)}
                  placeholder={EXAMPLE_PLACEHOLDER}
                  error={jsonError}
                  className="min-h-48 font-mono text-caption"
                  spellCheck={false}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">{tCommon("cancel")}</Button>
              </DialogClose>
              <Button type="button" onClick={handleAnalyze} disabled={!name || !rawJson}>
                {t("resources.import.analyze")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("resources.import.confirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("resources.import.confirmDescription", { count: inferred?.fields.length ?? 0 })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {inferred?.fields.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center justify-between rounded-control border border-line px-3 py-2"
                  >
                    <code className="font-mono text-caption text-ink">{field.name}</code>
                    <Badge variant="lilac">{field.type}</Badge>
                  </div>
                ))}
              </div>

              {inferred && inferred.warnings.length > 0 && (
                <div className="flex flex-col gap-1 rounded-control bg-badge-amber-bg p-3">
                  {inferred.warnings.map((warning) => (
                    <p key={warning} className="text-caption text-badge-amber-fg">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => setStep("paste")}
              >
                {t("resources.import.back")}
              </Button>
              <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>
                {t("resources.newResource.submit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
