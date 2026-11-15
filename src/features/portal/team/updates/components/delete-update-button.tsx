"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { fill } from "../../../auth/components/copy";
import { ConfirmDialog } from "../../../states/confirm-dialog";
import type { TeamUpdatesCopy } from "../../copy";
import { deleteUpdateAction } from "../actions";

/** Delete one post (#139), after saying it disappears from the client's feed. */
export function DeleteUpdateButton({
  copy,
  projectId,
  updateId,
  clientName,
  label,
}: {
  copy: TeamUpdatesCopy;
  projectId: string;
  updateId: string;
  clientName: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          setOpen(true);
        }}
        className="touch-target min-h-11 text-[14px] text-text-accent hover:underline lg:min-h-8"
      >
        {copy.delete}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.deleteTitle}
        body={fill(copy.deleteBody, { client: clientName })}
        confirmLabel={copy.deleteConfirm}
        cancelLabel={copy.cancel}
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteUpdateAction({ projectId, updateId });
            setOpen(false);
            if (result.status === "saved" || result.status === "not_found") {
              toast.success(copy.deleted);
              router.refresh();
            } else {
              toast.error(copy.dialog.errors.failed);
            }
          });
        }}
      />
    </>
  );
}
