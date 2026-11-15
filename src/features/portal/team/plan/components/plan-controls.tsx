"use client";

import {
  CircleCheck,
  Square,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import type { ProjectHealth } from "../../../overview/data";
import { formatDate } from "../../../overview/format";
import type { TimelineCopy } from "../../copy";
import { setHealthAction, setLaunchAction } from "../actions";
import type { PlanResult } from "../plan-edit";

/*
 * Project health and the launch target (#138; Figma TM-05). Choosing a different health
 * or date opens a short panel: the client update (suggested, editable) and whether to
 * email it. Saving changes the project and posts the update in one SQL transaction; the
 * email follows. Health is a radio group (arrow keys), and pairs icon with text.
 */

const HEALTH_ICON: Record<ProjectHealth, LucideIcon> = {
  on_track: CircleCheck,
  at_risk: TriangleAlert,
  waiting_on_client: Square,
};

const HEALTH_ORDER: ProjectHealth[] = [
  "on_track",
  "at_risk",
  "waiting_on_client",
];

export function useResultToast(copy: TimelineCopy) {
  const router = useRouter();
  return (result: PlanResult, onError: (message: string) => void): boolean => {
    if (result.status === "saved") {
      toast.success(
        result.notifyFailed
          ? copy.savedEmailFailed
          : result.notified > 0
            ? copy.savedEmailed
            : copy.saved,
      );
      router.refresh();
      return true;
    }
    const key = result.status === "invalid" ? result.error : result.status;
    const messages: Record<string, string> = copy.errors;
    onError(messages[key] ?? copy.errors.failed);
    return false;
  };
}

function UpdatePanel({
  copy,
  text,
  onText,
  notify,
  onNotify,
  error,
  pending,
  onSave,
  onCancel,
}: {
  copy: TimelineCopy;
  text: string;
  onText: (value: string) => void;
  notify: boolean;
  onNotify: (value: boolean) => void;
  error: string | undefined;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const ids = useId();
  return (
    <div className="flex flex-col gap-md rounded-md border border-border-default bg-bg-primary p-md">
      <div className="flex flex-col gap-sm">
        <Label htmlFor={`${ids}-text`}>{copy.updateText}</Label>
        <Textarea
          id={`${ids}-text`}
          value={text}
          rows={3}
          maxLength={4000}
          onChange={(event) => {
            onText(event.target.value);
          }}
        />
      </div>
      <div className="flex items-start gap-3">
        <Switch
          id={`${ids}-email`}
          checked={notify}
          onCheckedChange={onNotify}
          aria-describedby={`${ids}-email-hint`}
          className="touch-target"
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={`${ids}-email`}>{copy.emailClient}</Label>
          <p id={`${ids}-email-hint`} className="text-[12px] text-text-muted">
            {copy.emailClientHint}
          </p>
        </div>
      </div>
      <div aria-live="polite">
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          {copy.cancel}
        </Button>
        <Button type="button" onClick={onSave} loading={pending}>
          {copy.save}
        </Button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg">
      <h2 className="text-label text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function HealthControl({
  copy,
  projectId,
  current,
  labels,
  suggestion,
}: {
  copy: TimelineCopy;
  projectId: string;
  current: ProjectHealth;
  labels: Record<ProjectHealth, string>;
  suggestion: string;
}) {
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState(current);
  const [text, setText] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string>();
  const done = useResultToast(copy);

  const choose = (health: ProjectHealth) => {
    setChosen(health);
    setText(copy.healthUpdate[health]);
    setError(undefined);
  };

  return (
    <Card title={copy.healthTitle}>
      <div
        role="radiogroup"
        aria-labelledby={`${ids}-label`}
        aria-describedby={`${ids}-hint`}
        className="flex w-fit max-w-full flex-wrap gap-1 rounded-md border border-border-default p-1"
        onKeyDown={(event) => {
          const index = HEALTH_ORDER.indexOf(chosen);
          const step =
            event.key === "ArrowRight" || event.key === "ArrowDown"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowUp"
                ? -1
                : 0;
          if (step === 0) return;
          event.preventDefault();
          const next =
            HEALTH_ORDER[
              (index + step + HEALTH_ORDER.length) % HEALTH_ORDER.length
            ] ?? chosen;
          choose(next);
          event.currentTarget
            .querySelector<HTMLElement>(`[data-health="${next}"]`)
            ?.focus();
        }}
      >
        <span id={`${ids}-label`} className="sr-only">
          {copy.healthLabel}
        </span>
        {HEALTH_ORDER.map((health) => {
          const Icon = HEALTH_ICON[health];
          const selected = chosen === health;
          return (
            <button
              key={health}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-health={health}
              onClick={() => {
                choose(health);
              }}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-[14px] font-medium lg:min-h-9",
                selected && "border border-text-primary",
                health === "on_track" && "text-action-secondary",
                health === "at_risk" && "text-text-primary",
                health === "waiting_on_client" && "text-text-error",
                selected &&
                  health === "waiting_on_client" &&
                  "bg-action-primary-subtle",
                selected &&
                  health === "on_track" &&
                  "bg-action-secondary-subtle",
              )}
            >
              <Icon
                aria-hidden
                strokeWidth={ICON_STROKE}
                className={cn(
                  "size-4",
                  health !== "on_track" && "fill-current",
                )}
              />
              {labels[health]}
            </button>
          );
        })}
      </div>
      <p id={`${ids}-hint`} className="text-[13px] text-text-muted">
        {suggestion}
      </p>
      {chosen !== current ? (
        <UpdatePanel
          copy={copy}
          text={text}
          onText={setText}
          notify={notify}
          onNotify={setNotify}
          error={error}
          pending={pending}
          onCancel={() => {
            setChosen(current);
            setError(undefined);
          }}
          onSave={() => {
            startTransition(async () => {
              done(
                await setHealthAction({
                  projectId,
                  health: chosen,
                  update: text.trim() || null,
                  notify,
                }),
                setError,
              );
            });
          }}
        />
      ) : null}
    </Card>
  );
}

export function LaunchControl({
  copy,
  projectId,
  current,
}: {
  copy: TimelineCopy;
  projectId: string;
  current: string;
}) {
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(current);
  const [text, setText] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string>();
  const done = useResultToast(copy);

  return (
    <Card title={copy.launchTitle}>
      <div className="flex flex-col gap-sm">
        <Label htmlFor={`${ids}-date`} className="sr-only">
          {copy.launchLabel}
        </Label>
        <Input
          id={`${ids}-date`}
          type="date"
          value={date}
          aria-describedby={`${ids}-hint`}
          onChange={(event) => {
            const value = event.target.value;
            setDate(value);
            setError(undefined);
            if (value)
              setText(
                fill(copy.launchUpdate, { date: formatDate(value, "en") }),
              );
          }}
        />
        <p id={`${ids}-hint`} className="text-[13px] text-text-muted">
          {copy.launchHint}
        </p>
      </div>
      {date && date !== current ? (
        <UpdatePanel
          copy={copy}
          text={text}
          onText={setText}
          notify={notify}
          onNotify={setNotify}
          error={error}
          pending={pending}
          onCancel={() => {
            setDate(current);
            setError(undefined);
          }}
          onSave={() => {
            startTransition(async () => {
              done(
                await setLaunchAction({
                  projectId,
                  launchesOn: date,
                  update: text.trim() || null,
                  notify,
                }),
                setError,
              );
            });
          }}
        />
      ) : null}
    </Card>
  );
}
