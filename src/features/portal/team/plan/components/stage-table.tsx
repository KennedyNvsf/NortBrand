"use client";

import { Circle, CircleCheck, Contrast } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import type { StageState } from "../../../overview/domain";
import { formatDay } from "../../../overview/format";
import type { TimelineCopy } from "../../copy";
import {
  completeStageAction,
  reopenStageAction,
  setStageDatesAction,
} from "../actions";
import { useResultToast } from "./plan-controls";

/*
 * The stages table (#138; Figma TM-05) and the Complete stage dialog (TM-05b).
 * Dates save when a field is left (only if they changed); finished stages are locked and
 * offer Reopen. Only the current stage can be completed: the dialog says what's still
 * open, offers to keep open tickets there or move them on (keeping their status), and
 * drafts a milestone update the team can edit and email. All of it is one SQL
 * transaction (portal_complete_stage). Below 768 px rows stack and the dialog is a
 * bottom sheet (Portal · Responsive rules).
 */

export type StageRow = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string | null;
  state: StageState;
  done: number;
  total: number;
  open: number;
  /** The stage after this one, for "Move them to …". */
  nextName: string | null;
  /** Planned to end after today. */
  early: boolean;
};

const ICON = {
  done: CircleCheck,
  current: Contrast,
  upcoming: Circle,
} as const;

function DatesField({
  copy,
  projectId,
  row,
}: {
  copy: TimelineCopy;
  projectId: string;
  row: StageRow;
}) {
  const [start, setStart] = useState(row.startsOn);
  const [end, setEnd] = useState(row.endsOn ?? "");
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const done = useResultToast(copy);
  const locked = row.state === "done";

  const save = (nextStart: string, nextEnd: string) => {
    if (
      !nextStart ||
      (nextStart === row.startsOn && (nextEnd || null) === row.endsOn)
    )
      return;
    if (nextEnd && nextEnd < nextStart) {
      setError(copy.errors.endBeforeStart);
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await setStageDatesAction({
        projectId,
        stageId: row.id,
        startsOn: nextStart,
        endsOn: nextEnd || null,
      });
      if (!done(result, setError)) {
        setStart(row.startsOn);
        setEnd(row.endsOn ?? "");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={fill(copy.start, { stage: row.name })}
          value={start}
          disabled={locked}
          title={locked ? fill(copy.locked, { stage: row.name }) : undefined}
          className="min-w-0 flex-1 lg:h-9"
          onChange={(event) => {
            setStart(event.target.value);
          }}
          onBlur={() => {
            save(start, end);
          }}
        />
        <span aria-hidden className="text-text-muted">
          –
        </span>
        <Input
          type="date"
          aria-label={fill(copy.end, { stage: row.name })}
          value={end}
          disabled={locked}
          placeholder={copy.ongoing}
          className="min-w-0 flex-1 lg:h-9"
          onChange={(event) => {
            setEnd(event.target.value);
          }}
          onBlur={() => {
            save(start, end);
          }}
        />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function CompleteStageDialog({
  copy,
  projectId,
  clientName,
  clientEmail,
  row,
  open,
  onOpenChange,
}: {
  copy: TimelineCopy;
  projectId: string;
  clientName: string;
  clientEmail: string | null;
  row: StageRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ids = useId();
  const text = copy.completeDialog;
  const [pending, startTransition] = useTransition();
  const [move, setMove] = useState(false);
  const [post, setPost] = useState(true);
  const [update, setUpdate] = useState(
    row.nextName
      ? fill(text.milestone, { stage: row.name, next: row.nextName })
      : fill(text.milestoneLast, { stage: row.name }),
  );
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string>();
  const done = useResultToast(copy);
  const hasOpen = row.open > 0;

  const body = hasOpen
    ? row.nextName
      ? fill(text.bodyOpen, {
          open: row.open,
          total: row.total,
          date: row.endsOn ? formatDay(row.endsOn, "en") : "",
          next: row.nextName,
        })
      : fill(text.bodyOpenNoNext, { open: row.open, total: row.total })
    : row.nextName
      ? fill(text.bodyDone, { next: row.nextName })
      : text.bodyDoneNoNext;

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none md:max-w-[560px] lg:max-w-[560px]"
      >
        <header className="flex flex-col gap-1 border-b border-border-default px-lg pt-5 pb-4">
          <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
            {fill(text.eyebrow, { stage: row.name, client: clientName })}
          </p>
          <DialogTitle className="pr-0 text-[20px] font-bold text-text-primary">
            {hasOpen || row.early
              ? fill(text.titleOpen, { stage: row.name })
              : fill(text.titleDone, { stage: row.name })}
          </DialogTitle>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto px-lg py-5">
          <DialogDescription className="text-[15px] text-text-primary">
            {body}
          </DialogDescription>

          {hasOpen && row.nextName ? (
            <fieldset className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-primary p-md">
              <legend className="sr-only">
                {row.open === 1
                  ? text.openQuestionOne
                  : fill(text.openQuestionMany, { count: row.open })}
              </legend>
              <p
                aria-hidden
                className="text-[15px] font-medium text-text-primary"
              >
                {row.open === 1
                  ? text.openQuestionOne
                  : fill(text.openQuestionMany, { count: row.open })}
              </p>
              {[
                {
                  value: false,
                  label: fill(text.keep, { stage: row.name }),
                  hint: text.keepHint,
                },
                {
                  value: true,
                  label: fill(text.move, { next: row.nextName }),
                  hint: fill(text.moveHint, { next: row.nextName }),
                },
              ].map((option) => (
                <label
                  key={String(option.value)}
                  className="flex min-h-11 cursor-pointer items-start gap-3"
                >
                  <input
                    type="radio"
                    name={`${ids}-open`}
                    checked={move === option.value}
                    onChange={() => {
                      setMove(option.value);
                    }}
                    className="mt-1 size-5 shrink-0 accent-text-primary"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] text-text-primary">
                      {option.label}
                    </span>
                    <span className="text-[13px] text-text-muted">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Switch
                id={`${ids}-post`}
                checked={post}
                onCheckedChange={setPost}
                aria-describedby={`${ids}-post-hint`}
                className="touch-target"
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${ids}-post`}>{text.postMilestone}</Label>
                <p
                  id={`${ids}-post-hint`}
                  className="text-[13px] text-text-muted"
                >
                  {text.milestoneHint}
                </p>
              </div>
            </div>
            {post ? (
              <Textarea
                aria-label={text.milestoneText}
                value={update}
                rows={3}
                maxLength={4000}
                onChange={(event) => {
                  setUpdate(event.target.value);
                }}
              />
            ) : null}
          </div>

          {post ? (
            <div className="flex items-start gap-3">
              <Switch
                id={`${ids}-email`}
                checked={notify}
                onCheckedChange={setNotify}
                aria-describedby={`${ids}-email-hint`}
                className="touch-target"
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${ids}-email`}>{text.email}</Label>
                <p
                  id={`${ids}-email-hint`}
                  className="text-[13px] text-text-muted"
                >
                  {clientEmail
                    ? fill(text.emailHint, { email: clientEmail })
                    : text.emailHintAll}
                </p>
              </div>
            </div>
          ) : null}

          <div aria-live="polite">
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
        </div>
        <footer className="flex flex-col-reverse gap-3 border-t border-border-default px-lg py-md md:flex-row md:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {text.cancel}
          </Button>
          <Button
            type="button"
            loading={pending}
            onClick={() => {
              setError(undefined);
              startTransition(async () => {
                const result = await completeStageAction({
                  projectId,
                  stageId: row.id,
                  moveOpen: move,
                  update: post ? update.trim() || null : null,
                  notify: post && notify,
                });
                if (done(result, setError)) {
                  toast.success(fill(text.completed, { stage: row.name }));
                  onOpenChange(false);
                }
              });
            }}
          >
            {hasOpen || row.early ? text.confirmAnyway : text.confirm}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

export function StageTable({
  copy,
  projectId,
  clientName,
  clientEmail,
  rows,
  footer,
}: {
  copy: TimelineCopy;
  projectId: string;
  clientName: string;
  clientEmail: string | null;
  rows: StageRow[];
  footer: string;
}) {
  const [completing, setCompleting] = useState<StageRow | null>(null);
  const [, startTransition] = useTransition();
  const done = useResultToast(copy);

  return (
    <section
      aria-labelledby="stages-title"
      className="overflow-hidden rounded-lg border border-border-default bg-bg-surface"
    >
      <div className="flex flex-col gap-1 p-lg">
        <h2 id="stages-title" className="text-h4 text-text-primary">
          {copy.stagesTitle}
        </h2>
        <p className="text-[13px] text-text-muted">{copy.stagesIntro}</p>
      </div>
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,320px)_minmax(0,1fr)] gap-md border-y border-border-default bg-bg-primary px-lg py-3 text-[13px] text-text-muted md:grid">
        <span>{copy.columns.stage}</span>
        <span>{copy.columns.dates}</span>
        <span>{copy.columns.tickets}</span>
      </div>
      <ul className="divide-y divide-border-default border-t border-border-default md:border-t-0">
        {rows.map((row) => {
          const Icon = ICON[row.state];
          const percent =
            row.total === 0 ? 0 : Math.round((row.done / row.total) * 100);
          return (
            <li
              key={row.id}
              className={cn(
                "grid gap-3 px-lg py-md md:grid-cols-[minmax(0,1fr)_minmax(0,320px)_minmax(0,1fr)] md:items-center md:gap-md",
                row.state === "current" && "bg-bg-primary",
              )}
            >
              <p className="flex items-center gap-2.5 text-[15px] font-medium text-text-primary">
                <Icon
                  aria-hidden
                  strokeWidth={ICON_STROKE}
                  className={cn(
                    "size-4 shrink-0",
                    row.state === "done" && "text-action-secondary",
                  )}
                />
                {row.name}
                {row.state === "current" ? (
                  <span className="rounded-full bg-action-primary-subtle px-2 py-0.5 text-[12px] font-medium text-text-error">
                    {copy.now}
                  </span>
                ) : null}
              </p>
              <DatesField copy={copy} projectId={projectId} row={row} />
              <div className="flex flex-wrap items-center gap-3">
                {row.total === 0 ? (
                  <span className="text-[13px] text-text-muted">
                    {copy.noTickets}
                  </span>
                ) : (
                  <span className="flex items-center gap-2.5 text-[13px] text-text-muted">
                    <span
                      aria-hidden
                      className="block h-1.5 w-[70px] overflow-hidden rounded-[3px] bg-border-default"
                    >
                      <span
                        className={cn(
                          "block h-full",
                          row.done === row.total
                            ? "bg-action-secondary"
                            : "bg-text-primary",
                        )}
                        style={{ width: `${String(percent)}%` }}
                      />
                    </span>
                    {fill(copy.ticketsDone, {
                      done: row.done,
                      total: row.total,
                    })}
                  </span>
                )}
                <span className="flex-1" />
                {row.state === "done" ? (
                  <button
                    type="button"
                    aria-label={fill(copy.reopenLabel, { stage: row.name })}
                    className="min-h-11 text-[14px] text-text-primary hover:underline lg:min-h-8"
                    onClick={() => {
                      startTransition(async () => {
                        if (
                          done(
                            await reopenStageAction({
                              projectId,
                              stageId: row.id,
                            }),
                            (message) => toast.error(message),
                          )
                        ) {
                          toast(fill(copy.reopened, { stage: row.name }));
                        }
                      });
                    }}
                  >
                    {copy.reopen}
                  </button>
                ) : row.state === "current" ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setCompleting(row);
                    }}
                  >
                    {copy.complete}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border-default px-lg py-md text-[13px] text-text-muted">
        {footer}
      </p>
      {completing ? (
        <CompleteStageDialog
          key={completing.id}
          copy={copy}
          projectId={projectId}
          clientName={clientName}
          clientEmail={clientEmail}
          row={completing}
          open
          onOpenChange={(next) => {
            if (!next) setCompleting(null);
          }}
        />
      ) : null}
    </section>
  );
}
