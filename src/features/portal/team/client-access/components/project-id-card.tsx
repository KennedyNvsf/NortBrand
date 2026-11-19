"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { fill } from "../../../auth/components/copy";
import { ConfirmDialog } from "../../../states/confirm-dialog";
import type { TeamAccessCopy } from "../../copy";
import { rotateProjectIdAction } from "../actions";

/*
 * The Project ID card (#141; Figma TM-06): show and copy it; admins can regenerate it,
 * which signs every client of the project out at once (enforced in SQL) and emails
 * everyone the new ID. Guarded by a confirmation that says exactly that.
 */

export function ProjectIdCard({
  copy,
  projectId,
  publicId,
  clientName,
  canManage,
}: {
  copy: TeamAccessCopy;
  projectId: string;
  publicId: string;
  clientName: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      aria-labelledby="access-project-id"
      className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
    >
      <h2
        id="access-project-id"
        className="text-[12px] font-medium tracking-[0.08em] text-text-primary uppercase"
      >
        {copy.projectId.label}
      </h2>
      <p className="text-h2 font-semibold text-text-primary" translate="no">
        {publicId}
      </p>
      <p className="text-[14px] text-text-muted">{copy.projectId.body}</p>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          navigator.clipboard
            .writeText(publicId)
            .then(() => toast.success(copy.projectId.copied))
            .catch(() => toast.error(copy.projectId.copyFailed));
        }}
      >
        {copy.projectId.copy}
      </Button>

      {canManage ? (
        <div className="flex flex-col items-start gap-1 border-t border-border-default pt-md">
          <button
            type="button"
            className="touch-target min-h-11 text-[14px] font-medium text-text-accent hover:underline lg:min-h-9"
            onClick={() => {
              setConfirming(true);
            }}
          >
            {copy.projectId.regenerate}
          </button>
          <p className="text-[13px] text-text-muted">
            {copy.projectId.regenerateHint}
          </p>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={copy.projectId.confirmTitle}
        body={fill(copy.projectId.confirmBody, { client: clientName })}
        confirmLabel={copy.projectId.confirm}
        cancelLabel={copy.projectId.cancel}
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const result = await rotateProjectIdAction({ projectId });
            if (result.status === "rotated") {
              if (result.failed > 0) {
                toast.error(
                  fill(copy.projectId.rotatedSomeFailed, {
                    id: result.publicId,
                    failed: result.failed,
                  }),
                );
              } else {
                toast.success(
                  fill(copy.projectId.rotated, { id: result.publicId }),
                );
              }
              setConfirming(false);
              router.refresh();
            } else {
              toast.error(copy.errors[result.error]);
            }
          });
        }}
      />
    </section>
  );
}
