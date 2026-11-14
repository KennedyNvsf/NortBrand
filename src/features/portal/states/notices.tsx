"use client";

import { CircleAlert, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/lib/icons";

/*
 * Inline notices for forms (#133; TM-09).
 * - SaveFailedNotice ("Ticket · save failed"): nothing typed is lost. The form stays open
 *   with the user's values; Retry repeats the same save. The notice is announced.
 * - EditConflictNotice ("Ticket · edited by someone else"): two people editing at once;
 *   neither change is silently overwritten. The person chooses.
 * Both pair an icon with text (errors never rely on colour).
 */

export function SaveFailedNotice({
  message,
  retryLabel,
  cancelLabel,
  onRetry,
  onCancel,
  retrying = false,
}: {
  message: string;
  retryLabel: string;
  cancelLabel: string;
  onRetry: () => void;
  onCancel: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="flex flex-col gap-md">
      <p
        role="alert"
        className="flex items-start gap-2.5 rounded-md bg-action-primary-subtle px-md py-3 text-small text-text-error"
      >
        <CircleAlert
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>{message}</span>
      </p>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={retrying}
        >
          {cancelLabel}
        </Button>
        <Button type="button" onClick={onRetry} loading={retrying}>
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}

export function EditConflictNotice({
  message,
  seeTheirsLabel,
  keepMineLabel,
  onSeeTheirs,
  onKeepMine,
}: {
  message: string;
  seeTheirsLabel: string;
  keepMineLabel: string;
  onSeeTheirs: () => void;
  onKeepMine: () => void;
}) {
  return (
    <div className="flex flex-col gap-md">
      <p
        role="status"
        className="flex items-start gap-2.5 rounded-md border border-border-default bg-bg-primary px-md py-3 text-small text-text-primary"
      >
        <Info
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>{message}</span>
      </p>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onSeeTheirs}>
          {seeTheirsLabel}
        </Button>
        <Button type="button" onClick={onKeepMine}>
          {keepMineLabel}
        </Button>
      </div>
    </div>
  );
}
