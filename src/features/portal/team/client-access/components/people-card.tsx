"use client";

import { Circle, CircleCheck, Square, type LucideIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { formatDay, formatLisbonTime } from "../../../overview/format";
import { lisbonToday } from "../../../overview/domain";
import { initials } from "../../../shell/initials";
import { ConfirmDialog } from "../../../states/confirm-dialog";
import type { TeamAccessCopy } from "../../copy";
import {
  canRemove,
  personState,
  type AccessError,
  type ClientPerson,
  type Lockout,
  type PersonState,
} from "../access-rules";
import {
  addPersonAction,
  clearLockoutAction,
  removePersonAction,
  resendInviteAction,
} from "../actions";

/*
 * "People who can sign in" (#141; Figma TM-06, TM-09 "add person" and "last person").
 * Admins add people inline (the email is checked on the server before the invite goes
 * out), resend invites, lift a pause and remove people; the last person who can sign in
 * can't be removed, and the dialog says why instead of offering to. Members see the list
 * read-only. Rows stack on small screens (Portal · Responsive rules).
 */

const STATE_ICON: Record<PersonState["kind"], LucideIcon> = {
  active: CircleCheck,
  invited: Circle,
  locked: Square,
};

type Props = {
  copy: TeamAccessCopy;
  projectId: string;
  clientName: string;
  people: ClientPerson[];
  lockouts: Lockout[];
  canManage: boolean;
  now: string;
};

export function PeopleCard({
  copy,
  projectId,
  clientName,
  people,
  lockouts,
  canManage,
  now,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ClientPerson | null>(null);
  const today = lisbonToday(new Date(now));

  const label = (person: ClientPerson) => person.name ?? person.email;
  const error = (key: AccessError) => copy.errors[key];

  const when = (timestamp: string) => {
    const day = lisbonToday(new Date(timestamp));
    const time = formatLisbonTime(timestamp);
    return day === today
      ? `${copy.activity.today.toLowerCase()}, ${time}`
      : `${formatDay(day, "en")}, ${time}`;
  };

  const detail = (state: PersonState) => {
    switch (state.kind) {
      case "active":
        return state.lastSignInAt
          ? fill(copy.people.signedIn, { when: when(state.lastSignInAt) })
          : copy.people.neverSignedIn;
      case "invited":
        return fill(copy.people.inviteSent, {
          day: formatDay(lisbonToday(new Date(state.invitedAt)), "en"),
        });
      case "locked":
        return fill(copy.people.lockedDetail, {
          time: formatLisbonTime(state.lockedAt),
          unlocks: formatLisbonTime(state.unlocksAt),
        });
    }
  };

  const run = (
    action: () => Promise<{ status: string; error?: AccessError }>,
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
        toast.error(error(result.error ?? "failed"));
      }
    });
  };

  return (
    <section
      aria-labelledby="access-people"
      className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="access-people" className="text-h4 text-text-primary">
            {copy.people.title}
          </h2>
          <p className="text-[14px] text-text-muted">{copy.people.intro}</p>
        </div>
        {canManage && !adding ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setAdding(true);
            }}
          >
            {copy.people.add}
          </Button>
        ) : null}
      </div>

      {adding ? (
        <AddPersonForm
          copy={copy}
          projectId={projectId}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : null}

      <ul
        aria-label={copy.people.listLabel}
        className="flex flex-col divide-y divide-border-default border-t border-border-default"
      >
        {people.map((person) => {
          const state = personState(person, lockouts, new Date(now));
          const Icon = STATE_ICON[state.kind];
          const name = label(person);
          return (
            <li
              key={person.id}
              className="flex flex-col gap-3 py-md lg:flex-row lg:items-center lg:gap-md"
            >
              <div className="flex min-w-0 items-center gap-3 lg:w-[38%]">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-border-default text-[12px] font-semibold text-text-primary"
                >
                  {initials(name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-medium text-text-primary">
                    {name}
                  </span>
                  {person.name ? (
                    <span className="truncate text-[13px] text-text-muted">
                      {person.email}
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium whitespace-nowrap",
                    state.kind === "locked"
                      ? "bg-action-primary-subtle text-text-error"
                      : state.kind === "active"
                        ? "bg-action-secondary-subtle text-action-secondary"
                        : "border border-border-default text-text-primary",
                  )}
                >
                  <Icon
                    aria-hidden
                    strokeWidth={ICON_STROKE}
                    className={cn(
                      "size-3.5",
                      state.kind === "locked" && "fill-current",
                    )}
                  />
                  {copy.people[state.kind]}
                </span>
                <span className="text-[13px] text-text-muted">
                  {detail(state)}
                </span>
              </div>

              {canManage ? (
                <div className="flex flex-wrap items-center gap-x-md gap-y-1 lg:justify-end">
                  {state.kind === "invited" ? (
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={fill(copy.people.resendLabel, { name })}
                      className="touch-target min-h-11 text-[14px] font-medium text-text-primary hover:underline lg:min-h-9"
                      onClick={() => {
                        run(
                          () =>
                            resendInviteAction({
                              projectId,
                              clientId: person.id,
                            }),
                          fill(copy.people.resent, { email: person.email }),
                        );
                      }}
                    >
                      {copy.people.resend}
                    </button>
                  ) : null}
                  {state.kind === "locked" ? (
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={fill(copy.people.unlockLabel, { name })}
                      className="touch-target min-h-11 text-[14px] font-medium text-text-primary hover:underline lg:min-h-9"
                      onClick={() => {
                        run(
                          () =>
                            clearLockoutAction({
                              projectId,
                              email: person.email,
                            }),
                          fill(copy.people.unlocked, { name }),
                        );
                      }}
                    >
                      {copy.people.unlock}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={fill(copy.people.removeLabel, { name })}
                    className="touch-target min-h-11 text-[14px] font-medium text-text-accent hover:underline lg:min-h-9"
                    onClick={() => {
                      setRemoving(person);
                    }}
                  >
                    {copy.people.remove}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!canManage ? (
        <p className="text-[13px] text-text-muted">{copy.people.adminOnly}</p>
      ) : null}

      {removing && canRemove(people, removing.id) ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setRemoving(null);
          }}
          title={fill(copy.remove.title, { name: label(removing) })}
          body={fill(copy.remove.body, {
            name: label(removing),
            client: clientName,
          })}
          confirmLabel={copy.remove.confirm}
          cancelLabel={copy.remove.cancel}
          pending={pending}
          onConfirm={() => {
            run(
              () => removePersonAction({ projectId, clientId: removing.id }),
              fill(copy.people.removed, { name: label(removing) }),
              () => {
                setRemoving(null);
              },
            );
          }}
        />
      ) : null}

      {removing && !canRemove(people, removing.id) ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setRemoving(null);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none md:max-w-[440px] lg:max-w-[440px]"
          >
            <DialogTitle className="text-h4 text-text-primary">
              {fill(copy.remove.lastTitle, { name: label(removing) })}
            </DialogTitle>
            <DialogDescription className="text-body text-text-muted">
              {fill(copy.remove.lastBody, {
                name: label(removing),
                client: clientName,
              })}
            </DialogDescription>
            <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRemoving(null);
                }}
              >
                {copy.remove.cancel}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setRemoving(null);
                  setAdding(true);
                }}
              >
                {copy.remove.addFirst}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}

function AddPersonForm({
  copy,
  projectId,
  onDone,
}: {
  copy: TeamAccessCopy;
  projectId: string;
  onDone: () => void;
}) {
  const ids = useId();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<"pt" | "en">("pt");
  const [fieldError, setFieldError] = useState<{
    field: "email" | "name";
    text: string;
  }>();

  return (
    <form
      noValidate
      className="flex flex-col gap-md rounded-md border border-border-default p-md"
      onSubmit={(event) => {
        event.preventDefault();
        setFieldError(undefined);
        startTransition(async () => {
          const result = await addPersonAction({
            projectId,
            email,
            name,
            locale,
          });
          if (result.status === "added") {
            const address = email.trim().toLowerCase();
            if (result.emailed) {
              toast.success(fill(copy.add.added, { email: address }));
            } else {
              toast.error(fill(copy.add.addedNotSent, { email: address }));
            }
            onDone();
            return;
          }
          const text = copy.errors[result.error];
          if (result.error === "nameTooLong") {
            setFieldError({ field: "name", text });
          } else if (
            result.error === "emailInvalid" ||
            result.error === "alreadyAdded" ||
            result.error === "isTeammate"
          ) {
            setFieldError({ field: "email", text });
          } else {
            toast.error(text);
          }
        });
      }}
    >
      <div className="grid gap-md md:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-sm">
          <Label htmlFor={`${ids}-email`}>{copy.add.email}</Label>
          <Input
            id={`${ids}-email`}
            type="email"
            autoComplete="off"
            value={email}
            maxLength={254}
            aria-invalid={fieldError?.field === "email" ? true : undefined}
            aria-describedby={
              fieldError?.field === "email"
                ? `${ids}-email-error`
                : `${ids}-hint`
            }
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
          {fieldError?.field === "email" ? (
            <FieldError id={`${ids}-email-error`}>{fieldError.text}</FieldError>
          ) : null}
        </div>
        <div className="flex flex-col gap-sm">
          <Label htmlFor={`${ids}-name`}>{copy.add.name}</Label>
          <Input
            id={`${ids}-name`}
            value={name}
            maxLength={80}
            aria-invalid={fieldError?.field === "name" ? true : undefined}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          {fieldError?.field === "name" ? (
            <FieldError>{fieldError.text}</FieldError>
          ) : null}
        </div>
        <div className="flex flex-col gap-sm">
          <Label htmlFor={`${ids}-locale`}>{copy.add.language}</Label>
          <select
            id={`${ids}-locale`}
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value === "en" ? "en" : "pt");
            }}
            className="h-11 rounded-md border border-border-default bg-bg-surface px-3 text-[15px] text-text-primary"
          >
            <option value="pt">{copy.add.languages.pt}</option>
            <option value="en">{copy.add.languages.en}</option>
          </select>
        </div>
      </div>
      <p id={`${ids}-hint`} className="text-[13px] text-text-muted">
        {copy.add.hint}
      </p>
      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDone}
        >
          {copy.add.cancel}
        </Button>
        <Button type="submit" loading={pending}>
          {copy.add.send}
        </Button>
      </div>
    </form>
  );
}
