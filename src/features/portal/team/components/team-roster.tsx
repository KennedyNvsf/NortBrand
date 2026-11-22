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
import { inviteTeammateAction, removeTeammateAction } from "../actions";
import { ConfirmDialog } from "../../states/confirm-dialog";
import type { TeamPageCopy, TeamTableCopy } from "../copy";
import { TeamTable } from "../people/components/team-table";
import type { TeamOverview, TeamPerson } from "../people/data";
import type {
  InviteFieldErrors,
  InviteResult,
  RemoveResult,
  TeamRole,
} from "../team-admin";

/*
 * The Team page body (#132, #142; Figma TM-12): summary and "Invite teammate", the role
 * cards, the invite form, the people table (roles changed inline) and a guarded remove.
 * Admins invite, change roles and remove; members see it read-only and who to ask.
 * Every action is checked again on the server and in SQL.
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
  tableCopy,
  overview,
  viewer,
  now,
}: {
  copy: TeamPageCopy;
  tableCopy: TeamTableCopy;
  overview: TeamOverview;
  viewer: { userId: string; role: TeamRole };
  now: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>();
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<TeamPerson | null>(null);
  const [pending, startTransition] = useTransition();
  const isAdmin = viewer.role === "admin";
  const firstAdmin = overview.people.find((person) => person.role === "admin");
  const people =
    overview.people.length === 1
      ? tableCopy.peopleOne
      : fill(tableCopy.peopleMany, { count: overview.people.length });
  const projects =
    overview.activeProjects === 1
      ? tableCopy.projectsOne
      : fill(tableCopy.projectsMany, { count: overview.activeProjects });

  const done = (next: Message) => {
    setMessage(next);
    if (next.tone === "ok") {
      setInviting(false);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-h3 text-text-primary">{copy.title}</h1>
          <p className="text-body text-text-muted">
            {fill(tableCopy.summary, { people, projects })}
          </p>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            variant={inviting ? "secondary" : "primary"}
            aria-expanded={inviting}
            onClick={() => {
              setInviting((open) => !open);
            }}
          >
            {inviting ? tableCopy.closeInvite : tableCopy.invite}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-md md:grid-cols-2">
        <div className="rounded-lg border border-border-default p-lg">
          <h2 className="text-label text-text-primary">{copy.admin}</h2>
          <p className="text-small text-text-muted">{copy.adminSummary}</p>
        </div>
        <div className="rounded-lg border border-border-default p-lg">
          <h2 className="text-label text-text-primary">{copy.member}</h2>
          <p className="text-small text-text-muted">{copy.memberSummary}</p>
        </div>
      </div>

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

      {isAdmin && inviting ? <InviteForm copy={copy} onDone={done} /> : null}

      <TeamTable
        copy={tableCopy}
        roleNames={{ admin: copy.admin, member: copy.member }}
        people={overview.people}
        activeProjects={overview.activeProjects}
        viewer={viewer}
        now={now}
        onRemove={isAdmin ? setRemoving : undefined}
      />

      {!isAdmin ? (
        <p className="text-small text-text-muted">
          {fill(copy.readOnly, { admin: firstAdmin?.name ?? copy.admin })}
        </p>
      ) : null}
      <p className="text-small text-text-muted">{copy.footnote}</p>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={fill(tableCopy.removeTitle, { name: removing?.name ?? "" })}
        body={tableCopy.removeBody}
        confirmLabel={copy.remove}
        cancelLabel={copy.cancel}
        pending={pending}
        onConfirm={() => {
          const person = removing;
          if (!person) return;
          startTransition(async () => {
            const result = await removeTeammateAction({
              userId: person.userId,
            });
            setRemoving(null);
            done(removeMessage(copy, result));
          });
        }}
      />
    </div>
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
