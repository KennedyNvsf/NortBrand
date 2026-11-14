"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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

import { fill } from "../../auth/components/copy";
import type { Teammate } from "../access";
import { inviteTeammateAction, removeTeammateAction } from "../actions";
import type { TeamPageCopy } from "../copy";
import type {
  InviteFieldErrors,
  InviteResult,
  RemoveResult,
  TeamRole,
} from "../team-admin";

/*
 * The team list with invite and remove (#132). The full Team page (TM-12: table, roles,
 * projects, last active) is the My tickets / Team / Settings ticket; this is the part the
 * access model needs now. Admins invite and remove; members see the list read-only and
 * who to ask. Every action is checked again on the server and in SQL.
 */

type Message = { tone: "ok" | "error"; text: string };

function inviteMessage(copy: TeamPageCopy, result: InviteResult): Message {
  switch (result.status) {
    case "invited":
      return { tone: "ok", text: copy.invited };
    case "forbidden":
      return { tone: "error", text: copy.errors.forbidden };
    case "domain_not_allowed":
      return { tone: "error", text: copy.errors.domainNotAllowed };
    case "already_member":
      return { tone: "error", text: copy.errors.alreadyMember };
    default:
      return { tone: "error", text: copy.errors.failed };
  }
}

function removeMessage(copy: TeamPageCopy, result: RemoveResult): Message {
  switch (result.status) {
    case "removed":
      return { tone: "ok", text: copy.removed };
    case "forbidden":
      return { tone: "error", text: copy.errors.forbidden };
    case "cannot_remove_self":
      return { tone: "error", text: copy.errors.cannotRemoveSelf };
    case "project_lead":
      return { tone: "error", text: copy.errors.projectLead };
    case "not_found":
      return { tone: "error", text: copy.errors.notFound };
    default:
      return { tone: "error", text: copy.errors.failed };
  }
}

export function TeamRoster({
  copy,
  team,
  viewer,
}: {
  copy: TeamPageCopy;
  team: Teammate[];
  viewer: { userId: string; role: TeamRole };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>();
  const isAdmin = viewer.role === "admin";
  const firstAdmin = team.find((person) => person.role === "admin");

  const done = (next: Message) => {
    setMessage(next);
    if (next.tone === "ok") router.refresh();
  };

  return (
    <div className="flex flex-col gap-lg">
      <div aria-live="polite">
        {message ? (
          message.tone === "ok" ? (
            <p className="rounded-md bg-bg-primary px-md py-3 text-small text-text-primary">
              {message.text}
            </p>
          ) : (
            <FieldError>{message.text}</FieldError>
          )
        ) : null}
      </div>

      <ul className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default bg-bg-surface">
        {team.map((person) => (
          <TeammateRow
            key={person.userId}
            copy={copy}
            person={person}
            isYou={person.userId === viewer.userId}
            canRemove={isAdmin && person.userId !== viewer.userId}
            onRemoved={done}
          />
        ))}
      </ul>

      {isAdmin ? (
        <InviteForm copy={copy} onDone={done} />
      ) : (
        <p className="text-small text-text-muted">
          {fill(copy.readOnly, { admin: firstAdmin?.name ?? copy.admin })}
        </p>
      )}

      <p className="text-small text-text-muted">{copy.footnote}</p>
    </div>
  );
}

function TeammateRow({
  copy,
  person,
  isYou,
  canRemove,
  onRemoved,
}: {
  copy: TeamPageCopy;
  person: Teammate;
  isYou: boolean;
  canRemove: boolean;
  onRemoved: (message: Message) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex flex-col gap-3 px-md py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col">
        <span className="text-label text-text-primary">
          {person.name}
          {isYou ? (
            <span className="text-text-muted"> · {copy.you}</span>
          ) : null}
        </span>
        <span className="truncate text-small text-text-muted">
          {person.email}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-small text-text-muted">
          {person.role === "admin" ? copy.admin : copy.member}
        </span>
        {canRemove ? (
          confirming ? (
            <>
              <span className="text-small text-text-primary">
                {fill(copy.removeConfirm, { name: person.name })}
              </span>
              <Button
                type="button"
                variant="secondary"
                loading={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await removeTeammateAction({
                      userId: person.userId,
                    });
                    setConfirming(false);
                    onRemoved(removeMessage(copy, result));
                  });
                }}
              >
                {pending ? copy.removing : copy.remove}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setConfirming(false);
                }}
              >
                {copy.cancel}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              aria-label={`${copy.remove} ${person.name}`}
              onClick={() => {
                setConfirming(true);
              }}
            >
              {copy.remove}
            </Button>
          )
        ) : null}
      </div>
    </li>
  );
}

function InviteForm({
  copy,
  onDone,
}: {
  copy: TeamPageCopy;
  onDone: (message: Message) => void;
}) {
  const id = useId();
  const [errors, setErrors] = useState<InviteFieldErrors>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const values = {
          name: textField(data, "name"),
          email: textField(data, "email"),
          role: textField(data, "role"),
        };
        startTransition(async () => {
          const result = await inviteTeammateAction(values);
          if (result.status === "invalid") {
            setErrors(result.fieldErrors);
            return;
          }
          setErrors({});
          if (result.status === "invited") form.reset();
          onDone(inviteMessage(copy, result));
        });
      }}
    >
      <h2 id={`${id}-title`} className="text-h4 text-text-primary">
        {copy.inviteTitle}
      </h2>
      <fieldset
        disabled={pending}
        className="grid min-w-0 gap-md md:grid-cols-[1fr_1fr_160px]"
      >
        <div className="flex flex-col gap-sm">
          <Label htmlFor={`${id}-name`}>{copy.name}</Label>
          <Input
            id={`${id}-name`}
            name="name"
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
          />
          {errors.name ? (
            <FieldError id={`${id}-name-error`}>
              {copy.errors[errors.name]}
            </FieldError>
          ) : null}
        </div>
        <div className="flex flex-col gap-sm">
          <Label htmlFor={`${id}-email`}>{copy.email}</Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${id}-email-error` : undefined}
          />
          {errors.email ? (
            <FieldError id={`${id}-email-error`}>
              {copy.errors[errors.email]}
            </FieldError>
          ) : null}
        </div>
        <div className="flex flex-col gap-sm">
          <Label htmlFor={`${id}-role`}>{copy.role}</Label>
          <Select name="role" defaultValue="member">
            <SelectTrigger id={`${id}-role`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">{copy.member}</SelectItem>
              <SelectItem value="admin">{copy.admin}</SelectItem>
            </SelectContent>
          </Select>
          {errors.role ? (
            <FieldError>{copy.errors[errors.role]}</FieldError>
          ) : null}
        </div>
      </fieldset>
      <div>
        <Button type="submit" showIcon loading={pending}>
          {pending ? copy.inviting : copy.invite}
        </Button>
      </div>
    </form>
  );
}

/** A text field from a submitted form (FormData values can also be files). */
function textField(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}
