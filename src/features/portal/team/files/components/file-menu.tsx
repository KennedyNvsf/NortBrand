"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_STROKE } from "@/lib/icons";

import { fill } from "../../../auth/components/copy";
import { ConfirmDialog } from "../../../states/confirm-dialog";
import type { TeamFilesCopy } from "../../copy";
import {
  deleteFileAction,
  renameFileAction,
  shareFileAction,
} from "../actions";
import type { FileResult } from "../files-edit";

/*
 * One file's menu on the team Files page (#140; Figma TM-08 "⋯"): share or make team
 * only, rename, and a guarded delete that says what the client loses. Radix gives the
 * menu arrow keys, Esc and focus return; every change is checked again on the server.
 */

const item =
  "flex min-h-11 cursor-pointer items-center rounded-sm px-3 text-[14px] text-text-primary outline-none data-highlighted:bg-bg-primary lg:min-h-9";

export function FileMenu({
  copy,
  projectId,
  clientName,
  file,
}: {
  copy: TeamFilesCopy;
  projectId: string;
  clientName: string;
  file: { id: string; name: string; shared: boolean };
}) {
  const router = useRouter();
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(file.name);
  const [error, setError] = useState<string>();

  const run = (
    action: () => Promise<FileResult>,
    success: string,
    done?: () => void,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.status === "saved") {
        toast.success(success);
        done?.();
        router.refresh();
      } else {
        const text = fill(copy.errors[result.error], { name: file.name });
        if (renaming) setError(text);
        else toast.error(text);
      }
    });
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={fill(copy.menu, { name: file.name })}
            className="touch-target grid size-8 shrink-0 place-items-center rounded-full text-text-muted hover:bg-bg-primary hover:text-text-primary"
          >
            <MoreHorizontal
              aria-hidden
              strokeWidth={ICON_STROKE}
              className="size-4"
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-52 rounded-md border border-border-default bg-bg-surface p-1 shadow-card-hover motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          >
            <DropdownMenu.Item
              className={item}
              onSelect={() => {
                run(
                  () =>
                    shareFileAction({
                      projectId,
                      fileId: file.id,
                      shared: !file.shared,
                    }),
                  fill(file.shared ? copy.unshared : copy.shared, {
                    name: file.name,
                  }),
                );
              }}
            >
              {file.shared ? copy.unshare : copy.share}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={item}
              onSelect={() => {
                setName(file.name);
                setError(undefined);
                setRenaming(true);
              }}
            >
              {copy.rename}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={`${item} text-text-accent`}
              onSelect={() => {
                setDeleting(true);
              }}
            >
              {copy.delete}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog open={renaming} onOpenChange={pending ? undefined : setRenaming}>
        <DialogContent
          showCloseButton={false}
          className="max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none md:max-w-[440px] lg:max-w-[440px]"
        >
          <DialogTitle className="text-h4 text-text-primary">
            {copy.renameTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">{file.name}</DialogDescription>
          <form
            className="flex flex-col gap-md"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () => renameFileAction({ projectId, fileId: file.id, name }),
                copy.renamed,
                () => {
                  setRenaming(false);
                },
              );
            }}
          >
            <div className="flex flex-col gap-sm">
              <Label htmlFor={`${ids}-name`}>{copy.renameLabel}</Label>
              <Input
                id={`${ids}-name`}
                value={name}
                maxLength={200}
                aria-invalid={error ? true : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </div>
            <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setRenaming(false);
                }}
              >
                {copy.cancel}
              </Button>
              <Button type="submit" loading={pending}>
                {copy.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={fill(copy.deleteTitle, { name: file.name })}
        body={
          file.shared
            ? fill(copy.deleteShared, { client: clientName })
            : copy.deleteTeamOnly
        }
        confirmLabel={copy.deleteConfirm}
        cancelLabel={copy.cancel}
        pending={pending}
        onConfirm={() => {
          run(
            () => deleteFileAction({ projectId, fileId: file.id }),
            fill(copy.deleted, { name: file.name }),
            () => {
              setDeleting(false);
            },
          );
        }}
      />
    </>
  );
}
