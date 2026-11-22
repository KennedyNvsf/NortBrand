"use client";

import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import type { SettingsCopy } from "../../copy";
import type { TemplateStage } from "../../projects/templates";
import { saveSettingsAction } from "../actions";
import {
  CODE_EXPIRY_MINUTES,
  LOCKOUT_OPTIONS,
  MAX_STAGES,
  MAX_WEEKS,
  SESSION_OPTIONS,
  TRIES_OPTIONS,
  checkSettings,
  hasErrors,
  withValue,
  type SettingsFieldErrors,
  type WorkspaceSettings,
} from "../rules";

/*
 * Settings (#159; Figma TM-13 546:583, its 760 px column). A client component because it's a form; the page
 * (server) loads the values and remounts this form whenever they change (its key is
 * `updatedAt`), so after a save or a discard it starts clean from what's stored.
 * Members get the same form, disabled, under the TM-09 notice; the server refuses their
 * saves anyway (settings.ts and SQL). The checks here are for comfort only.
 */

type Draft = Omit<WorkspaceSettings, "updatedAt">;

function toDraft(settings: WorkspaceSettings): Draft {
  return {
    codeMaxTries: settings.codeMaxTries,
    lockoutMinutes: settings.lockoutMinutes,
    sessionDays: settings.sessionDays,
    dailyDigest: settings.dailyDigest,
    notifyFirstClientSignIn: settings.notifyFirstClientSignIn,
    allowedTeamDomain: settings.allowedTeamDomain ?? "",
    stages: settings.stages.map((stage) => ({ ...stage })),
  };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SettingsForm({
  settings,
  copy,
  readOnly,
}: {
  settings: WorkspaceSettings;
  copy: SettingsCopy;
  readOnly: boolean;
}) {
  const router = useRouter();
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const initial = toDraft(settings);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<SettingsFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [editing, setEditing] = useState(false);

  const dirty = !sameDraft(draft, initial);
  const id = (name: string) => `${ids}-${name}`;
  const c = copy.clientSignIn;

  const minutesLabel = (minutes: number) => {
    if (minutes % 1440 === 0) {
      const days = minutes / 1440;
      return days === 1 ? c.dayOne : fill(c.days, { count: days });
    }
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? c.hourOne : fill(c.hours, { count: hours });
    }
    return minutes === 1 ? c.minuteOne : fill(c.minutes, { count: minutes });
  };
  const daysLabel = (days: number) =>
    days === 1 ? c.dayOne : fill(c.days, { count: days });
  const weeksLabel = (weeks: number) =>
    weeks === 1
      ? copy.template.weekOne
      : fill(copy.template.weeks, { count: weeks });

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setFormError(undefined);
  };

  const setStages = (stages: TemplateStage[]) => {
    update({ stages });
    if (errors.stages || errors.template) {
      setErrors((current) => ({
        ...current,
        stages: undefined,
        template: undefined,
      }));
    }
  };

  const save = () => {
    const found = checkSettings(draft);
    setErrors(found);
    if (hasErrors(found)) {
      if (found.stages || found.template) setEditing(true);
      setFormError(copy.errors.fix);
      return;
    }
    startTransition(async () => {
      const result = await saveSettingsAction({
        updatedAt: settings.updatedAt,
        ...draft,
        allowedTeamDomain: draft.allowedTeamDomain ?? "",
      });
      if (result.status === "saved") {
        toast.success(copy.saved);
        router.refresh();
        return;
      }
      if (result.status === "invalid") {
        setErrors(result.fieldErrors);
        if (result.fieldErrors.stages || result.fieldErrors.template) {
          setEditing(true);
        }
        setFormError(copy.errors.fix);
        return;
      }
      setFormError(copy.errors[result.status]);
    });
  };

  const discard = () => {
    setDraft(initial);
    setErrors({});
    setFormError(undefined);
    setEditing(false);
    // Loads what's stored now, which may be another admin's newer save.
    router.refresh();
  };

  return (
    <form
      aria-label={copy.formLabel}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex w-full max-w-[760px] flex-col gap-lg"
    >
      <fieldset
        disabled={readOnly || pending}
        className="flex min-w-0 flex-col gap-lg"
      >
        <Section id={id("client")} title={c.title} body={c.body}>
          <Row
            labelId={id("expiry")}
            label={c.codeExpiry}
            hint={`${c.codeExpiryHint} ${c.codeExpiryLocked}`}
          >
            <p
              aria-labelledby={id("expiry")}
              className="flex h-11 items-center gap-sm rounded-sm border border-border-default bg-bg-primary px-md text-[13px] font-medium text-text-primary lg:h-9"
            >
              {minutesLabel(CODE_EXPIRY_MINUTES)}
              <Lock
                aria-hidden
                strokeWidth={ICON_STROKE}
                className="size-4 text-text-muted"
              />
            </p>
          </Row>
          <Row labelId={id("tries")} label={c.tries} hint={c.triesHint}>
            <NumberSelect
              labelId={id("tries")}
              value={draft.codeMaxTries}
              options={withValue(TRIES_OPTIONS, draft.codeMaxTries)}
              format={String}
              onChange={(codeMaxTries) => {
                update({ codeMaxTries });
              }}
            />
          </Row>
          <Row labelId={id("pause")} label={c.pause}>
            <NumberSelect
              labelId={id("pause")}
              value={draft.lockoutMinutes}
              options={withValue(LOCKOUT_OPTIONS, draft.lockoutMinutes)}
              format={minutesLabel}
              onChange={(lockoutMinutes) => {
                update({ lockoutMinutes });
              }}
            />
          </Row>
          <Row labelId={id("session")} label={c.session} hint={c.sessionHint}>
            <NumberSelect
              labelId={id("session")}
              value={draft.sessionDays}
              options={withValue(SESSION_OPTIONS, draft.sessionDays)}
              format={daysLabel}
              onChange={(sessionDays) => {
                update({ sessionDays });
              }}
            />
          </Row>
        </Section>

        <Section id={id("notifications")} title={copy.notifications.title}>
          <Row
            labelId={id("digest")}
            label={copy.notifications.digest}
            hint={copy.notifications.digestHint}
          >
            <Select
              value={draft.dailyDigest ? "on" : "off"}
              onValueChange={(value) => {
                update({ dailyDigest: value === "on" });
              }}
            >
              <SelectTrigger
                aria-labelledby={id("digest")}
                aria-describedby={`${id("digest")}-hint`}
                className="h-11 w-auto min-w-36 text-[13px] font-medium lg:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">
                  {copy.notifications.digestOn}
                </SelectItem>
                <SelectItem value="off">
                  {copy.notifications.digestOff}
                </SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row
            labelId={id("needs-you")}
            label={copy.notifications.needsYou}
            hint={`${copy.notifications.needsYouHint} ${copy.notifications.needsYouLocked}.`}
          >
            <Switch
              className="touch-target"
              checked
              locked
              aria-labelledby={id("needs-you")}
              aria-describedby={`${id("needs-you")}-hint`}
            />
          </Row>
          <Row
            labelId={id("first")}
            label={copy.notifications.firstSignIn}
            hint={copy.notifications.firstSignInHint}
          >
            <Switch
              className="touch-target"
              checked={draft.notifyFirstClientSignIn}
              onCheckedChange={(notifyFirstClientSignIn) => {
                update({ notifyFirstClientSignIn });
              }}
              aria-labelledby={id("first")}
              aria-describedby={`${id("first")}-hint`}
            />
          </Row>
        </Section>

        <Section id={id("team")} title={copy.team.title} body={copy.team.body}>
          <Row
            labelId={id("domain")}
            label={copy.team.domain}
            hint={copy.team.domainHint}
            stack
          >
            <div className="flex w-full flex-col gap-xs md:w-64">
              <Input
                id={id("domain-input")}
                aria-labelledby={id("domain")}
                aria-describedby={cn(
                  `${id("domain")}-hint`,
                  errors.allowedTeamDomain && id("domain-error"),
                )}
                aria-invalid={errors.allowedTeamDomain ? true : undefined}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={copy.team.domainPlaceholder}
                value={draft.allowedTeamDomain ?? ""}
                onChange={(event) => {
                  update({ allowedTeamDomain: event.target.value });
                  if (errors.allowedTeamDomain) {
                    setErrors((current) => ({
                      ...current,
                      allowedTeamDomain: undefined,
                    }));
                  }
                }}
                className="lg:h-9"
              />
              {errors.allowedTeamDomain ? (
                <FieldError id={id("domain-error")}>
                  {copy.errors[errors.allowedTeamDomain]}
                </FieldError>
              ) : null}
            </div>
          </Row>
        </Section>

        <Section
          id={id("template")}
          title={copy.template.title}
          body={copy.template.body}
        >
          {editing && !readOnly ? (
            <TemplateEditor
              stages={draft.stages}
              errors={errors}
              copy={copy}
              idPrefix={id("stage")}
              onChange={setStages}
              onDone={() => {
                setEditing(false);
              }}
            />
          ) : (
            <div className="flex flex-col gap-sm border-t border-border-default pt-md">
              <ul
                aria-label={copy.template.listLabel}
                className="flex flex-wrap gap-sm"
              >
                {draft.stages.map((stage, index) => (
                  <li
                    key={`${String(index)}-${stage.name}`}
                    className="flex gap-1.5 rounded-sm border border-border-default px-2.5 py-1.5 text-[13px]"
                  >
                    <span className="font-medium text-text-primary">
                      {stage.name}
                    </span>
                    <span className="text-text-muted">
                      {stage.kind === "work"
                        ? weeksLabel(stage.weeks)
                        : stage.kind === "launch"
                          ? copy.template.launchDay
                          : copy.template.ongoing}
                    </span>
                  </li>
                ))}
              </ul>
              {errors.template ? (
                <FieldError>{copy.errors[errors.template]}</FieldError>
              ) : null}
              {readOnly ? null : (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                  }}
                  className="touch-target self-start text-[13px] font-medium text-text-accent hover:underline"
                >
                  {copy.template.edit}
                </button>
              )}
            </div>
          )}
        </Section>
      </fieldset>

      {readOnly ? null : (
        <div className="flex flex-col gap-sm">
          {formError ? (
            <FieldError role="alert" className="justify-end text-right">
              {formError}
            </FieldError>
          ) : null}
          <div className="flex flex-col-reverse gap-sm md:flex-row md:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty || pending}
              onClick={discard}
            >
              {copy.discard}
            </Button>
            <Button type="submit" disabled={!dirty} loading={pending}>
              {pending ? copy.saving : copy.save}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function Section({
  id,
  title,
  body,
  children,
}: {
  id: string;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col rounded-lg border border-border-default bg-bg-surface p-lg"
    >
      <div className="flex flex-col gap-0.5 pb-md">
        <h2 id={id} className="text-h4 text-text-primary">
          {title}
        </h2>
        {body ? <p className="text-[13px] text-text-muted">{body}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A setting: its label and hint on the left, its control on the right (TM-13). */
function Row({
  labelId,
  label,
  hint,
  stack = false,
  children,
}: {
  labelId: string;
  label: string;
  hint?: string;
  /** On phones, put the control under the label (wide controls). */
  stack?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-md border-t border-border-default py-md",
        stack
          ? "flex-col md:flex-row md:items-center"
          : "items-center justify-between",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p id={labelId} className="text-[14px] font-medium text-text-primary">
          {label}
        </p>
        {hint ? (
          <p
            id={`${labelId}-hint`}
            className="text-[12px] leading-[1.45] text-text-muted"
          >
            {hint}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumberSelect({
  labelId,
  value,
  options,
  format,
  onChange,
}: {
  labelId: string;
  value: number;
  options: number[];
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => {
        const parsed = Number(next);
        if (options.includes(parsed)) onChange(parsed);
      }}
    >
      <SelectTrigger
        aria-labelledby={labelId}
        className="h-11 w-auto min-w-24 text-[13px] font-medium lg:h-9"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {format(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * "Edit template" (not drawn in TM-13): rename stages, set working stages' weeks, add,
 * remove and reorder working stages. Launch and Care stay last and have no duration.
 */
function TemplateEditor({
  stages,
  errors,
  copy,
  idPrefix,
  onChange,
  onDone,
}: {
  stages: TemplateStage[];
  errors: SettingsFieldErrors;
  copy: SettingsCopy;
  idPrefix: string;
  onChange: (stages: TemplateStage[]) => void;
  onDone: () => void;
}) {
  const t = copy.template;
  const workCount = stages.filter((stage) => stage.kind === "work").length;

  const rename = (index: number, name: string) => {
    onChange(
      stages.map((stage, i) => (i === index ? { ...stage, name } : stage)),
    );
  };
  const setWeeks = (index: number, weeks: number) => {
    onChange(
      stages.map((stage, i) =>
        i === index && stage.kind === "work" ? { ...stage, weeks } : stage,
      ),
    );
  };
  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    const next = [...stages];
    const a = next[index];
    const b = next[target];
    if (!a || !b || a.kind !== "work" || b.kind !== "work") return;
    next[index] = b;
    next[target] = a;
    onChange(next);
  };
  const remove = (index: number) => {
    onChange(stages.filter((_, i) => i !== index));
  };
  const add = () => {
    const next = [...stages];
    next.splice(workCount, 0, { name: t.newStage, kind: "work", weeks: 1 });
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label={t.editorLabel}
      className="flex flex-col gap-md border-t border-border-default pt-md"
    >
      <ol className="flex flex-col gap-sm">
        {stages.map((stage, index) => {
          const stageErrors = errors.stages?.[index];
          const nameId = `${idPrefix}-${String(index)}-name`;
          const errorId = `${idPrefix}-${String(index)}-error`;
          const label =
            stage.kind === "work"
              ? fill(t.stageName, { index: index + 1 })
              : stage.kind === "launch"
                ? t.launchName
                : t.afterName;
          const message = stageErrors?.name ?? stageErrors?.weeks;
          return (
            <li key={index} className="flex flex-col gap-xs">
              <div className="flex flex-wrap items-center gap-sm">
                <Input
                  id={nameId}
                  aria-label={label}
                  aria-invalid={stageErrors?.name ? true : undefined}
                  aria-describedby={message ? errorId : undefined}
                  maxLength={60}
                  value={stage.name}
                  onChange={(event) => {
                    rename(index, event.target.value);
                  }}
                  className="basis-full md:min-w-40 md:flex-1 md:basis-auto lg:h-9"
                />
                {stage.kind === "work" ? (
                  <>
                    <label className="flex items-center gap-xs text-[13px] text-text-muted">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_WEEKS}
                        step={1}
                        aria-label={fill(t.stageWeeks, { index: index + 1 })}
                        aria-invalid={stageErrors?.weeks ? true : undefined}
                        aria-describedby={message ? errorId : undefined}
                        value={Number.isNaN(stage.weeks) ? "" : stage.weeks}
                        onChange={(event) => {
                          setWeeks(index, event.target.valueAsNumber);
                        }}
                        className="w-20 lg:h-9"
                      />
                      <span aria-hidden>{t.weeksUnit}</span>
                    </label>
                    <div className="flex">
                      <IconButton
                        label={fill(t.moveUp, { name: stage.name })}
                        disabled={index === 0}
                        onClick={() => {
                          move(index, -1);
                        }}
                      >
                        <ArrowUp aria-hidden strokeWidth={ICON_STROKE} />
                      </IconButton>
                      <IconButton
                        label={fill(t.moveDown, { name: stage.name })}
                        disabled={index === workCount - 1}
                        onClick={() => {
                          move(index, 1);
                        }}
                      >
                        <ArrowDown aria-hidden strokeWidth={ICON_STROKE} />
                      </IconButton>
                      <IconButton
                        label={fill(t.remove, { name: stage.name })}
                        disabled={workCount <= 1}
                        onClick={() => {
                          remove(index);
                        }}
                      >
                        <Trash2 aria-hidden strokeWidth={ICON_STROKE} />
                      </IconButton>
                    </div>
                  </>
                ) : (
                  <span className="text-[13px] text-text-muted">
                    {stage.kind === "launch" ? t.launchDay : t.ongoing}
                  </span>
                )}
              </div>
              {message ? (
                <FieldError id={errorId}>{copy.errors[message]}</FieldError>
              ) : null}
            </li>
          );
        })}
      </ol>
      {errors.template ? (
        <FieldError>{copy.errors[errors.template]}</FieldError>
      ) : null}
      <p className="text-[12px] text-text-muted">{t.fixedNote}</p>
      <div className="flex flex-wrap gap-sm">
        <Button
          type="button"
          variant="secondary"
          disabled={stages.length >= MAX_STAGES}
          onClick={add}
        >
          <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
          {t.add}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t.done}
        </Button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full text-icon-default transition-colors duration-(--duration-fast) ease-standard hover:text-text-accent disabled:cursor-not-allowed disabled:text-text-disabled lg:size-9 [&_svg]:size-5"
    >
      {children}
    </button>
  );
}
