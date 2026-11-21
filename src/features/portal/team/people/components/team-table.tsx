"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { fill } from "../../../auth/components/copy";
import { initials } from "../../../shell/initials";
import type { TeamTableCopy } from "../../copy";
import type { TeamRole } from "../../team-admin";
import { setTeamRoleAction } from "../actions";
import type { TeamPerson } from "../data";
import { lastActiveLabel } from "../last-active";

/*
 * The Team table (#142; Figma TM-12): person, role, projects, open tickets, last active.
 * Admins change roles inline (checked again in SQL, which never demotes the last admin).
 * Tablet drops Projects and Last active; phones stack each person as a card (Portal ·
 * Responsive rules). Admins also remove teammates from the row (#132).
 */

export function TeamTable({
  copy,
  roleNames,
  people,
  activeProjects,
  viewer,
  now,
  onRemove,
}: {
  copy: TeamTableCopy;
  roleNames: Record<TeamRole, string>;
  people: TeamPerson[];
  activeProjects: number;
  viewer: { userId: string; role: TeamRole };
  now: string;
  /** Admins: ask to remove a teammate (the roster confirms and calls the action). */
  onRemove?: (person: TeamPerson) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isAdmin = viewer.role === "admin";

  const changeRole = (person: TeamPerson, role: TeamRole) => {
    if (role === person.role) return;
    startTransition(async () => {
      const result = await setTeamRoleAction({ userId: person.userId, role });
      if (result.status === "saved") {
        toast.success(
          fill(copy.roleSaved, {
            name: person.name,
            role: roleNames[role].toLowerCase(),
          }),
        );
        router.refresh();
      } else {
        toast.error(copy.errors[result.error]);
      }
    });
  };

  const projectsLabel = (person: TeamPerson) => {
    if (person.role === "admin")
      return fill(copy.allProjects, { count: activeProjects });
    return person.projectNames.length > 0
      ? person.projectNames.join(", ")
      : copy.noProjects;
  };

  return (
    <div className="rounded-lg border border-border-default bg-bg-surface md:p-lg">
      <table
        className="w-full border-collapse text-left max-md:block"
        aria-label={copy.tableLabel}
      >
        <thead className="max-md:sr-only">
          <tr className="border-b border-border-default text-[13px] text-text-muted">
            <th scope="col" className="pb-3 font-normal">
              {copy.columns.person}
            </th>
            <th scope="col" className="pb-3 font-normal">
              {copy.columns.role}
            </th>
            <th scope="col" className="hidden pb-3 font-normal lg:table-cell">
              {copy.columns.projects}
            </th>
            <th scope="col" className="pb-3 font-normal">
              {copy.columns.openTickets}
            </th>
            <th scope="col" className="hidden pb-3 font-normal lg:table-cell">
              {copy.columns.lastActive}
            </th>
            {onRemove ? (
              <th scope="col" className="pb-3 font-normal">
                <span className="sr-only">{copy.columns.actions}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="max-md:block max-md:divide-y max-md:divide-border-default">
          {people.map((person) => (
            <tr
              key={person.userId}
              className="border-b border-border-default last:border-b-0 max-md:flex max-md:flex-col max-md:gap-2 max-md:p-md"
            >
              <td className="py-3 pr-md max-md:p-0">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-border-default text-[12px] font-semibold text-text-primary"
                  >
                    {initials(person.name)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-medium text-text-primary">
                      {person.name}
                    </span>
                    <span className="truncate text-[13px] text-text-muted">
                      {person.email}
                    </span>
                  </span>
                </span>
              </td>
              <td className="py-3 pr-md max-md:p-0">
                {isAdmin ? (
                  <Select
                    value={person.role}
                    disabled={pending}
                    onValueChange={(value) => {
                      changeRole(
                        person,
                        value === "admin" ? "admin" : "member",
                      );
                    }}
                  >
                    <SelectTrigger
                      aria-label={fill(copy.roleLabel, { name: person.name })}
                      className="h-11 w-36 lg:h-9"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{roleNames.admin}</SelectItem>
                      <SelectItem value="member">{roleNames.member}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-[14px] text-text-primary">
                    {roleNames[person.role]}
                  </span>
                )}
              </td>
              <td className="hidden py-3 pr-md text-[14px] text-text-primary lg:table-cell">
                {projectsLabel(person)}
              </td>
              <td className="py-3 pr-md text-[14px] text-text-primary max-md:p-0">
                <span className="text-text-muted md:sr-only">
                  {copy.columns.openTickets}:{" "}
                </span>
                {person.openTickets}
              </td>
              <td className="hidden py-3 pr-md text-[14px] text-text-muted lg:table-cell">
                {lastActiveLabel(person.lastActiveAt, new Date(now), copy)}
              </td>
              {onRemove ? (
                <td className="py-3 text-right max-md:p-0 max-md:text-left">
                  {person.userId === viewer.userId ? (
                    <span className="text-[13px] text-text-muted">
                      {copy.you}
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={fill(copy.removeLabel, { name: person.name })}
                      onClick={() => {
                        onRemove(person);
                      }}
                      className="touch-target min-h-11 text-[14px] font-medium text-text-accent hover:underline lg:min-h-9"
                    >
                      {copy.remove}
                    </button>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
