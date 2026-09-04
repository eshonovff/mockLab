"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createResource, resourcesQueryKey } from "@/components/projects/api";
import { Button } from "@/components/ui/button";
import { DialogForm } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createResourceSchema, type CreateResourceInput } from "@/lib/validators";

export function NewResourceDialog({ projectId }: { projectId: string }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateResourceInput>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: { name: "" },
  });

  const mutation = useMutation({
    mutationFn: (input: CreateResourceInput) => createResource(projectId, input),
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: resourcesQueryKey(projectId) });
      toast.success(t("resources.toasts.created"));
      setOpen(false);
      form.reset();
      router.push(`/${locale}/dashboard/resources/${resource.id}`);
    },
    onError: () => {
      toast.error(t("resources.toasts.error"));
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) form.reset();
  }

  function submit() {
    form.handleSubmit((values) => mutation.mutate(values))();
  }

  return (
    <DialogForm
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button startIcon={<PlusIcon aria-hidden="true" />}>
          {t("resources.newResource.trigger")}
        </Button>
      }
      title={t("resources.newResource.title")}
      description={t("resources.newResource.description")}
      confirmText={t("resources.newResource.submit")}
      onConfirm={submit}
      loading={mutation.isPending}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-1.5"
        noValidate
      >
        <Label htmlFor="new-resource-name">{t("resources.newResource.nameLabel")}</Label>
        <Input
          id="new-resource-name"
          placeholder={t("resources.newResource.namePlaceholder")}
          disabled={mutation.isPending}
          error={form.formState.errors.name?.message}
          {...form.register("name")}
        />
      </form>
    </DialogForm>
  );
}
