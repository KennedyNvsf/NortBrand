"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/*
 * The guarded delete (#133; TM-09 "Ticket · delete", "Client access · last person").
 * It says what will be lost, because deletion is visible to the client. Focus starts on
 * Cancel, the safe choice; Esc and the backdrop cancel too.
 * Modals (14 Portal — Motion): centred from tablet up (the dialog's scale and fade, 250 ms
 * in, 150 ms out); on mobile a bottom sheet (Portal · Responsive rules).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const cancel = (
            event.currentTarget as HTMLElement | null
          )?.querySelector<HTMLElement>("[data-confirm-cancel]");
          cancel?.focus();
        }}
        className="max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:p-lg md:max-w-[480px] lg:max-w-[480px]"
      >
        <DialogTitle className="text-h4 text-text-primary">{title}</DialogTitle>
        <DialogDescription className="text-body text-text-muted">
          {body}
        </DialogDescription>
        <div className="flex flex-col-reverse gap-3 pt-2 md:flex-row md:items-center md:justify-end">
          <Button
            type="button"
            variant="ghost"
            data-confirm-cancel
            disabled={pending}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
