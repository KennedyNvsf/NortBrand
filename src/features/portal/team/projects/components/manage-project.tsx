"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_STROKE } from "@/lib/icons";

import { fill } from "../../../auth/components/copy";
import { ConfirmDialog } from "../../../states/confirm-dialog";
import type { ManageProjectCopy } from "../../copy";
import {
  deleteProjectAction,
  setProjectStatusAction,
} from "../lifecycle-actions";

/*
 * "Manage project" on the team overview (#165), admins only. Archive / restore ask
 * once; delete asks for the Project ID typed back (checked again in SQL). After a
 * delete the project page no longer exists, so it goes back to the projects list.
 */

type Project = {
  id: string;
  publicId: string;
  name: string;
  clientName: string;
  status: "active" | "closed";
};

export function ManageProject({
  project,
  copy,
}: {
  project: Project;
  copy: ManageProjectCopy;
}) {
  const router = useRouter();
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"status" | "delete" | null>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();

  const archived = project.status === "closed";
  const action = archived ? copy.restore : copy.archive;
  const values = {
    project: project.name,
    client: project.clientName,
    id: project.publicId,
  };
  const matches = typed.trim().toUpperCase() === project.publicId;

  const close = (open: boolean) => {
    if (pending) return;
    if (!open) {
      setDialog(null);
      setTyped("");
      setError(undefined);
    }
  };

  const changeStatus = () => {
    startTransition(async () => {
      const result = await setProjectStatusAction({
        projectId: project.id,
        status: archived ? "active" : "closed",
      });
      if (result.status === "saved") {
        toast.success(action.done);
        setDialog(null);
        router.refresh();
        return;
      }
      setError(copy.errors[result.error]);
    });
  };

  const remove = () => {
    if (!matches) {
      setError(copy.errors.mismatch);
      return;
    }
    startTransition(async () => {
      const result = await deleteProjectAction({
        projectId: project.id,
        confirm: typed,
      });
      if (result.status === "deleted") {
        const clean =
          !result.leftovers.files && result.leftovers.accounts === 0;
        if (clean) toast.success(fill(copy.delete.done, values));
        else toast.warning(fill(copy.delete.leftovers, values));
        router.replace("/team");
        return;
      }
      setError(copy.errors[result.error]);
    });
  };

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
    >
      <h2 id={`${ids}-title`} className="text-h4 text-text-primary">
        {copy.title}
      </h2>
      <div className="flex flex-col gap-sm border-t border-border-default pt-md md:flex-row md:items-center md:justify-between md:gap-md">
        <p className="text-small text-text-muted">
          {fill(action.body, values)}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={() => {
            setDialog("status");
          }}
        >
          {archived ? (
            <ArchiveRestore
              aria-hidden
              strokeWidth={ICON_STROKE}
              className="size-5"
            />
          ) : (
            <Archive aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
          )}
          {action.label}
        </Button>
      </div>
      <div className="flex flex-col gap-sm border-t border-border-default pt-md md:flex-row md:items-center md:justify-between md:gap-md">
        <p className="text-small text-text-muted">{copy.delete.body}</p>
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 text-text-error hover:text-text-error"
          onClick={() => {
            setDialog("delete");
          }}
        >
          <Trash2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
          {copy.delete.label}
        </Button>
      </div>

      <ConfirmDialog
        open={dialog === "status"}
        onOpenChange={close}
        title={fill(action.confirmTitle, values)}
        body={fill(action.confirmBody, values)}
        confirmLabel={action.confirm}
        cancelLabel={copy.cancel}
        onConfirm={changeStatus}
        pending={pending}
      >
        {error ? <FieldError role="alert">{error}</FieldError> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title={fill(copy.delete.confirmTitle, values)}
        body={fill(copy.delete.confirmBody, values)}
        confirmLabel={copy.delete.confirm}
        cancelLabel={copy.cancel}
        onConfirm={remove}
        pending={pending}
        confirmDisabled={!matches}
      >
        <div className="flex flex-col gap-sm">
          <Label htmlFor={`${ids}-confirm`}>
            {fill(copy.delete.field, values)}
          </Label>
          <Input
            id={`${ids}-confirm`}
            value={typed}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${ids}-error` : undefined}
            onChange={(event) => {
              setTyped(event.target.value);
              setError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                remove();
              }
            }}
          />
          {error ? (
            <FieldError id={`${ids}-error`} role="alert">
              {error}
            </FieldError>
          ) : null}
        </div>
      </ConfirmDialog>
    </section>
  );
}
