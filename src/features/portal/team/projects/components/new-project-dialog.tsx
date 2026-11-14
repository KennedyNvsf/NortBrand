"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ICON_STROKE } from "@/lib/icons";

import { fill } from "../../../auth/components/copy";
import { formatRange } from "../../../overview/format";
import type { TeamPagesCopy } from "../../copy";
import { createProjectAction } from "../actions";
import type { CreateFieldErrors, CreateProjectResult } from "../create-project";
import {
  STAGE_TEMPLATES,
  STAGE_TEMPLATE_IDS,
  minimumDays,
  spreadStages,
  type StageTemplateId,
} from "../templates";

/*
 * New project · invite client (#136; Figma TM-04 531:513). A client component only
 * because it's a form; it loads in its own chunk (new-project-launcher.tsx). Validation
 * here is for comfort: the server action validates everything again and computes the
 * stages itself. The stage dates preview uses the same rule as the server (templates.ts).
 * Modals (14 Portal — Motion): centred from tablet up, a bottom sheet on mobile.
 */

type Copy = TeamPagesCopy["newProject"];
type Person = { userId: string; name: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(),
  );
}

function errorText(
  copy: Copy,
  error: CreateFieldErrors[keyof CreateFieldErrors],
) {
  if (!error) return undefined;
  if (error === "launchTooSoon") {
    return fill(copy.errors.launchTooSoon, { days: minimumDays("standard") });
  }
  return copy.errors[error];
}

export function NewProjectDialog({
  open,
  onOpenChange,
  copy,
  team,
  viewerId,
  suggestedId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: Copy;
  team: Person[];
  viewerId: string;
  suggestedId: string | null;
}) {
  const router = useRouter();
  const ids = useId();
  const emailInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [leadId, setLeadId] = useState(
    team.some((person) => person.userId === viewerId)
      ? viewerId
      : (team[0]?.userId ?? ""),
  );
  const [clientName, setClientName] = useState("");
  const [locale, setLocale] = useState<"pt" | "en">("pt");
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [startsOn, setStartsOn] = useState(todayIso);
  const [launchesOn, setLaunchesOn] = useState("");
  const [template, setTemplate] = useState<StageTemplateId>("standard");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [errors, setErrors] = useState<CreateFieldErrors>({});
  const [draftError, setDraftError] = useState(false);
  const [formError, setFormError] = useState<string>();

  const preview = launchesOn
    ? spreadStages(template, startsOn, launchesOn)
    : null;

  /** Adds what's typed as a chip. Returns false when it isn't an email. */
  const commitDraft = (): boolean => {
    const value = draft
      .trim()
      .replace(/[,;]+$/, "")
      .toLowerCase();
    if (!value) return true;
    if (!EMAIL.test(value)) {
      setDraftError(true);
      return false;
    }
    setEmails((list) => (list.includes(value) ? list : [...list, value]));
    setDraft("");
    setDraftError(false);
    setErrors((current) => ({ ...current, emails: undefined }));
    return true;
  };

  const done = (result: CreateProjectResult) => {
    switch (result.status) {
      case "created": {
        onOpenChange(false);
        const ready = fill(copy.created, {
          project: name.trim(),
          id: result.publicId,
        });
        if (result.failed.length > 0) {
          toast.warning(ready, {
            description: fill(copy.emailFailed, {
              emails: result.failed.join(", "),
            }),
          });
        } else {
          toast.success(ready, {
            description: sendWelcome
              ? fill(copy.createdSent, { count: result.sent })
              : copy.createdNotSent,
          });
        }
        router.refresh();
        return;
      }
      case "invalid":
        setErrors(result.fieldErrors);
        return;
      case "teammate_email":
        setErrors({});
        setFormError(
          fill(copy.errors.teammate, { emails: result.emails.join(", ") }),
        );
        return;
      case "forbidden":
        setFormError(copy.errors.forbidden);
        return;
      default:
        setFormError(copy.errors.failed);
    }
  };

  const submit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    if (!commitDraft()) return;
    const list = draft.trim()
      ? [...emails, draft.trim().toLowerCase()]
      : emails;
    const local: CreateFieldErrors = {};
    if (!name.trim()) local.name = "nameInvalid";
    if (!clientName.trim()) local.clientName = "clientNameInvalid";
    if (!leadId) local.leadId = "leadInvalid";
    if (!startsOn) local.startsOn = "dateInvalid";
    if (!launchesOn) local.launchesOn = "dateInvalid";
    else if (launchesOn < startsOn) local.launchesOn = "launchBeforeStart";
    else if (!preview) local.launchesOn = "launchTooSoon";
    if (list.length === 0) local.emails = "emailsRequired";
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    startTransition(async () => {
      done(
        await createProjectAction({
          name,
          clientName,
          leadId,
          startsOn,
          launchesOn,
          template,
          emails: list,
          locale,
          suggestedId: suggestedId ?? undefined,
          sendWelcome,
        }),
      );
    });
  };

  const fieldId = (field: string) => `${ids}-${field}`;
  const describedBy = (field: keyof CreateFieldErrors, hint?: string) =>
    [errors[field] ? fieldId(`${field}-error`) : null, hint ?? null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none md:max-w-[680px] lg:max-w-[680px]"
      >
        <form
          onSubmit={submit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <header className="flex items-center gap-3 border-b border-border-default px-lg pt-5 pb-4 md:pr-[22px] md:pl-[28px]">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
                {copy.eyebrow}
              </p>
              <DialogTitle className="pr-0 text-[20px] leading-tight font-bold tracking-[-0.01em] text-text-primary">
                {copy.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {copy.sendWelcomeHint}
              </DialogDescription>
            </div>
            <button
              type="button"
              aria-label={copy.close}
              disabled={pending}
              onClick={() => {
                onOpenChange(false);
              }}
              className="touch-target grid size-[34px] shrink-0 place-items-center rounded-full border border-border-default text-text-primary hover:border-border-strong"
            >
              <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-lg py-[22px] md:px-[28px]">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[15px] font-semibold text-text-primary">
                {copy.projectSection}
              </legend>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-sm">
                  <Label htmlFor={fieldId("name")}>{copy.name}</Label>
                  <Input
                    id={fieldId("name")}
                    value={name}
                    maxLength={120}
                    placeholder={copy.namePlaceholder}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={describedBy("name")}
                    onChange={(event) => {
                      setName(event.target.value);
                    }}
                  />
                  {errors.name ? (
                    <FieldError id={fieldId("name-error")}>
                      {errorText(copy, errors.name)}
                    </FieldError>
                  ) : null}
                </div>
                <div className="flex flex-col gap-sm">
                  <Label id={fieldId("lead-label")}>{copy.lead}</Label>
                  <Select value={leadId} onValueChange={setLeadId}>
                    <SelectTrigger
                      aria-labelledby={fieldId("lead-label")}
                      aria-invalid={errors.leadId ? true : undefined}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {team.map((person) => (
                        <SelectItem key={person.userId} value={person.userId}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.leadId ? (
                    <FieldError>{errorText(copy, errors.leadId)}</FieldError>
                  ) : null}
                </div>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[15px] font-semibold text-text-primary">
                {copy.clientSection}
              </legend>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                <div className="flex flex-col gap-sm">
                  <Label htmlFor={fieldId("company")}>{copy.company}</Label>
                  <Input
                    id={fieldId("company")}
                    value={clientName}
                    maxLength={120}
                    aria-invalid={errors.clientName ? true : undefined}
                    aria-describedby={describedBy("clientName")}
                    onChange={(event) => {
                      setClientName(event.target.value);
                    }}
                  />
                  {errors.clientName ? (
                    <FieldError id={fieldId("clientName-error")}>
                      {errorText(copy, errors.clientName)}
                    </FieldError>
                  ) : null}
                </div>
                <div className="flex flex-col gap-sm">
                  <Label id={fieldId("language-label")}>{copy.language}</Label>
                  <Select
                    value={locale}
                    onValueChange={(value) => {
                      setLocale(value === "en" ? "en" : "pt");
                    }}
                  >
                    <SelectTrigger aria-labelledby={fieldId("language-label")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">{copy.languages.pt}</SelectItem>
                      <SelectItem value="en">{copy.languages.en}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-sm">
                <Label htmlFor={fieldId("emails")}>{copy.emails}</Label>
                {/* Clicking the box focuses the input; the chips' own buttons stay reachable. */}
                <div
                  className="flex min-h-12 flex-wrap items-center gap-2 rounded-sm border border-border-default bg-bg-surface px-2.5 py-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring lg:min-h-[38px]"
                  onClick={() => emailInput.current?.focus()}
                >
                  {emails.map((address) => (
                    <span
                      key={address}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-primary py-[5px] pr-1.5 pl-2.5 text-[13px] font-medium text-text-primary"
                    >
                      {address}
                      <button
                        type="button"
                        aria-label={fill(copy.removeEmail, { email: address })}
                        className="touch-target grid size-4 place-items-center rounded-full"
                        onClick={() => {
                          setEmails((list) =>
                            list.filter((item) => item !== address),
                          );
                        }}
                      >
                        <X
                          aria-hidden
                          strokeWidth={ICON_STROKE}
                          className="size-3"
                        />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={emailInput}
                    id={fieldId("emails")}
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    value={draft}
                    placeholder={
                      emails.length === 0
                        ? copy.emailsEmptyPlaceholder
                        : copy.emailsPlaceholder
                    }
                    aria-invalid={
                      draftError || errors.emails ? true : undefined
                    }
                    aria-describedby={[
                      draftError || errors.emails
                        ? fieldId("emails-error")
                        : null,
                      fieldId("emails-hint"),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    className="min-h-11 min-w-40 flex-1 bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-muted lg:min-h-8 lg:text-[14px]"
                    onChange={(event) => {
                      setDraft(event.target.value);
                      setDraftError(false);
                    }}
                    onBlur={() => {
                      commitDraft();
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === "," ||
                        event.key === ";"
                      ) {
                        if (draft.trim()) {
                          event.preventDefault();
                          commitDraft();
                        }
                      } else if (event.key === "Backspace" && !draft) {
                        setEmails((list) => list.slice(0, -1));
                      }
                    }}
                  />
                </div>
                {draftError || errors.emails ? (
                  <FieldError id={fieldId("emails-error")}>
                    {draftError
                      ? copy.errors.emailNotValid
                      : errorText(copy, errors.emails)}
                  </FieldError>
                ) : null}
                <p
                  id={fieldId("emails-hint")}
                  className="text-[12px] leading-[1.45] text-text-muted"
                >
                  {copy.emailsHint}
                </p>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[15px] font-semibold text-text-primary">
                {copy.planSection}
              </legend>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex flex-col gap-sm">
                  <Label htmlFor={fieldId("start")}>{copy.start}</Label>
                  <Input
                    id={fieldId("start")}
                    type="date"
                    value={startsOn}
                    aria-invalid={errors.startsOn ? true : undefined}
                    aria-describedby={describedBy("startsOn")}
                    onChange={(event) => {
                      setStartsOn(event.target.value);
                    }}
                  />
                  {errors.startsOn ? (
                    <FieldError id={fieldId("startsOn-error")}>
                      {errorText(copy, errors.startsOn)}
                    </FieldError>
                  ) : null}
                </div>
                <div className="flex flex-col gap-sm">
                  <Label htmlFor={fieldId("launch")}>{copy.launch}</Label>
                  <Input
                    id={fieldId("launch")}
                    type="date"
                    value={launchesOn}
                    min={startsOn || undefined}
                    aria-invalid={errors.launchesOn ? true : undefined}
                    aria-describedby={describedBy("launchesOn")}
                    onChange={(event) => {
                      setLaunchesOn(event.target.value);
                    }}
                  />
                  {errors.launchesOn ? (
                    <FieldError id={fieldId("launchesOn-error")}>
                      {errorText(copy, errors.launchesOn)}
                    </FieldError>
                  ) : null}
                </div>
                <div className="flex flex-col gap-sm">
                  <Label id={fieldId("template-label")}>{copy.stages}</Label>
                  <Select
                    value={template}
                    onValueChange={(value) => {
                      const next = STAGE_TEMPLATE_IDS.find(
                        (id) => id === value,
                      );
                      if (next) setTemplate(next);
                    }}
                  >
                    <SelectTrigger aria-labelledby={fieldId("template-label")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_TEMPLATE_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                          {STAGE_TEMPLATES[id].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {preview ? (
                <ul
                  aria-label={copy.stagePreview}
                  className="flex flex-wrap gap-1.5"
                >
                  {preview.map((stage) => (
                    <li
                      key={stage.name}
                      className="flex gap-1.5 rounded-md border border-border-default px-2.5 py-[5px] text-[12px]"
                    >
                      <span className="font-medium text-text-primary">
                        {stage.name}
                      </span>
                      <span className="text-text-muted">
                        {formatRange(
                          stage.startsOn,
                          stage.endsOn,
                          "en",
                          copy.from,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-[12px] leading-[1.45] text-text-muted">
                {copy.planHint}
              </p>
            </fieldset>

            <div className="flex flex-col gap-4 rounded-[12px] border border-border-default bg-bg-primary py-4 pr-4 pl-[18px] md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
                  {copy.projectId}
                </p>
                <p className="text-[26px] font-bold tracking-[0.04em] text-text-primary">
                  {suggestedId ?? "NB-····"}
                </p>
                <p className="text-[12px] leading-[1.45] text-text-muted">
                  {suggestedId ? copy.projectIdHint : copy.projectIdLater}
                </p>
              </div>
              {suggestedId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(suggestedId)
                      .then(() => toast(copy.copied));
                  }}
                >
                  {copy.copy}
                </Button>
              ) : null}
            </div>

            <div className="flex items-start gap-3">
              <Switch
                id={fieldId("welcome")}
                checked={sendWelcome}
                onCheckedChange={setSendWelcome}
                aria-describedby={fieldId("welcome-hint")}
                className="touch-target"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Label htmlFor={fieldId("welcome")}>{copy.sendWelcome}</Label>
                <p
                  id={fieldId("welcome-hint")}
                  className="text-[12px] leading-[1.45] text-text-muted"
                >
                  {copy.sendWelcomeHint}
                </p>
              </div>
            </div>

            <div aria-live="polite">
              {formError ? <FieldError>{formError}</FieldError> : null}
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-border-default px-lg py-[14px] md:flex-row md:items-center md:justify-end md:pr-[22px] md:pl-[28px]">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {copy.cancel}
            </Button>
            <Button type="submit" loading={pending}>
              {pending ? copy.creating : copy.create}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
