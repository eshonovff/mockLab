"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createProject, PROJECTS_QUERY_KEY } from "@/components/dashboard/api";
import { Button } from "@/components/ui/button";
import { DialogForm } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectSchema, type CreateProjectInput } from "@/lib/validators";

export function NewProjectDialog() {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "" },
  });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      toast.success(t("toasts.created"));
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error(t("toasts.error"));
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
        <Button startIcon={<PlusIcon aria-hidden="true" />}>{t("newProject.trigger")}</Button>
      }
      title={t("newProject.title")}
      description={t("newProject.description")}
      confirmText={t("newProject.submit")}
      onConfirm={submit}
      loading={mutation.isPending}
    >
      {/* A real <form> here (not just the dialog's own footer) so pressing Enter in the field
          submits — DialogForm's confirm button lives outside this element. */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-1.5"
        noValidate
      >
        <Label htmlFor="new-project-name">{t("newProject.nameLabel")}</Label>
        <Input
          id="new-project-name"
          placeholder={t("newProject.namePlaceholder")}
          disabled={mutation.isPending}
          error={form.formState.errors.name?.message}
          {...form.register("name")}
        />
      </form>
    </DialogForm>
  );
}
