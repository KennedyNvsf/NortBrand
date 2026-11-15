"use client";

import { Check, CircleCheck, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { Avatar } from "../../../overview/components/status";
import { initials } from "../../../shell/initials";
import type { TeamUpdatesCopy } from "../../copy";
import { editUpdateAction, postUpdateAction } from "../actions";
import type { UpdateResult } from "../updates-edit";

/*
 * Post update (#139; Figma TM-03 531:235, TM-M04 560:736): the body, linked tasks,
 * "Mark as a milestone" (green in the client feed), "Ask the client for something"
 * ("Needs you", emailed straight away), and a live preview of how the client will see
 * it. The same dialog edits a post. Centred from tablet up, a bottom sheet on mobile;
 * Modals motion (scale and fade, 250 ms in / 190 ms out) comes from the dialog.
 */

export type EditingUpdate = {
  updateId: string;
  body: string;
  highlight: boolean;
  needsClient: boolean;
  ticketIds: string[];
};

export function PostUpdateDialog({
  copy,
  projectId,
  clientName,
  authorName,
  tickets,
  editing,
  open,
  onOpenChange,
}: {
  copy: TeamUpdatesCopy;
  projectId: string;
  clientName: string;
  authorName: string;
  tickets: { id: string; title: string }[];
  editing: EditingUpdate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const text = copy.dialog;
  const router = useRouter();
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState(editing?.body ?? "");
  const [linked, setLinked] = useState<string[]>(editing?.ticketIds ?? []);
  const [highlight, setHighlight] = useState(editing?.highlight ?? false);
  const [needsClient, setNeedsClient] = useState(editing?.needsClient ?? false);
  const [error, setError] = useState<string>();

  const titleOf = (id: string) =>
    tickets.find((ticket) => ticket.id === id)?.title ?? "";
  const available = tickets.filter((ticket) => !linked.includes(ticket.id));

  const done = (result: UpdateResult) => {
    if (result.status === "saved") {
      toast.success(
        editing
          ? text.saved
          : result.notifyFailed
            ? text.postedEmailFailed
            : result.notified > 0
              ? text.postedEmailed
              : text.posted,
      );
      onOpenChange(false);
      router.refresh();
      return;
    }
    const key = result.status === "invalid" ? result.error : result.status;
    const messages: Record<string, string> = text.errors;
    setError(messages[key] ?? text.errors.failed);
  };

  const submit = () => {
    if (!body.trim()) {
      setError(text.errors.bodyRequired);
      return;
    }
    setError(undefined);
    const payload = {
      projectId,
      body,
      highlight,
      needsClient,
      ticketIds: linked,
    };
    startTransition(async () => {
      done(
        editing
          ? await editUpdateAction({ ...payload, updateId: editing.updateId })
          : await postUpdateAction(payload),
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none md:max-w-[560px] lg:max-w-[560px]"
      >
        <header className="flex items-start gap-3 border-b border-border-default px-lg pt-5 pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
              {fill(editing ? text.editEyebrow : text.eyebrow, {
                client: clientName,
              })}
            </p>
            <DialogTitle className="pr-0 text-[20px] font-bold text-text-primary">
              {editing ? text.editTitle : text.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {text.footnote}
            </DialogDescription>
          </div>
          <button
            type="button"
            aria-label={text.close}
            disabled={pending}
            onClick={() => {
              onOpenChange(false);
            }}
            className="touch-target grid size-[34px] shrink-0 place-items-center rounded-full border border-border-default text-text-primary hover:border-border-strong"
          >
            <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-lg py-5">
          <div className="flex flex-col gap-sm">
            <Label htmlFor={`${ids}-body`}>{text.body}</Label>
            <Textarea
              id={`${ids}-body`}
              value={body}
              rows={4}
              maxLength={4000}
              aria-invalid={
                error === text.errors.bodyRequired ? true : undefined
              }
              onChange={(event) => {
                setBody(event.target.value);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-text-muted">{text.linked}</span>
            {linked.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-primary py-1 pr-1.5 pl-2.5 text-[13px] font-medium text-text-primary"
              >
                {titleOf(id)}
                <button
                  type="button"
                  aria-label={fill(text.removeLink, { title: titleOf(id) })}
                  className="touch-target grid size-4 place-items-center rounded-full"
                  onClick={() => {
                    setLinked((current) =>
                      current.filter((item) => item !== id),
                    );
                  }}
                >
                  <X aria-hidden strokeWidth={ICON_STROKE} className="size-3" />
                </button>
              </span>
            ))}
            {available.length > 0 && linked.length < 10 ? (
              <Select
                value=""
                onValueChange={(value) => {
                  setLinked((current) => [...current, value]);
                }}
              >
                <SelectTrigger
                  aria-label={text.linkTaskLabel}
                  className="h-auto min-h-11 w-auto border-0 bg-transparent px-1 text-[13px] font-medium text-text-accent shadow-none lg:min-h-8 [&>svg]:hidden"
                >
                  {text.linkTask}
                </SelectTrigger>
                <SelectContent>
                  {available.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      {ticket.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          {(
            [
              {
                id: "milestone",
                label: text.milestone,
                hint: text.milestoneHint,
                value: highlight,
                set: setHighlight,
              },
              {
                id: "needs",
                label: text.needsClient,
                hint: text.needsClientHint,
                value: needsClient,
                set: setNeedsClient,
              },
            ] as const
          ).map((option) => (
            <div key={option.id} className="flex items-start gap-3">
              <Switch
                id={`${ids}-${option.id}`}
                checked={option.value}
                onCheckedChange={option.set}
                aria-describedby={`${ids}-${option.id}-hint`}
                className="touch-target"
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${ids}-${option.id}`}>{option.label}</Label>
                <p
                  id={`${ids}-${option.id}-hint`}
                  className="text-[13px] text-text-muted"
                >
                  {option.hint}
                </p>
              </div>
            </div>
          ))}

          <section
            aria-labelledby={`${ids}-preview`}
            className="flex flex-col gap-3 rounded-lg bg-bg-primary p-md"
          >
            <h3
              id={`${ids}-preview`}
              className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase"
            >
              {fill(text.previewTitle, { client: clientName })}
            </h3>
            <article
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-md",
                needsClient
                  ? "border-action-primary bg-bg-surface"
                  : highlight
                    ? "border-transparent bg-action-secondary-subtle"
                    : "border-border-default bg-bg-surface",
              )}
            >
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Avatar initials={initials(authorName)} />
                <span className="text-[14px] font-medium text-text-primary">
                  {authorName}
                </span>
                <span className="text-[13px] text-text-muted">
                  {text.justNow}
                </span>
                <span className="flex-1" />
                {needsClient ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-action-primary-subtle px-2.5 py-1 text-[13px] font-medium text-text-error">
                    <Square
                      aria-hidden
                      strokeWidth={ICON_STROKE}
                      className="size-3.5 fill-current"
                    />
                    {copy.needsYou}
                  </span>
                ) : highlight ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-action-secondary">
                    <CircleCheck
                      aria-hidden
                      strokeWidth={ICON_STROKE}
                      className="size-4"
                    />
                    {copy.milestone}
                  </span>
                ) : null}
              </header>
              <p className="text-[15px] whitespace-pre-line text-text-primary">
                {body.trim() || (
                  <span className="text-text-muted">{text.previewEmpty}</span>
                )}
              </p>
              {linked.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {linked.map((id) => (
                    <li
                      key={id}
                      className="inline-flex items-center gap-2 rounded-full border border-border-default px-3 py-1 text-[13px] font-medium text-text-primary"
                    >
                      <Check
                        aria-hidden
                        strokeWidth={ICON_STROKE}
                        className="size-3.5"
                      />
                      {titleOf(id)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </section>

          <div aria-live="polite">
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-border-default px-lg py-md md:flex-row md:items-center">
          <p className="text-[13px] text-text-muted md:flex-1">
            {text.footnote}
          </p>
          <div className="flex flex-col-reverse gap-3 md:flex-row">
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
            <Button type="button" loading={pending} onClick={submit}>
              {pending ? text.posting : editing ? text.save : text.post}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
