import { Check, CircleCheck, Square } from "lucide-react";
import Link from "next/link";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { groupUpdatesByDay } from "../../../overview/content";
import { Avatar } from "../../../overview/components/status";
import { formatUpdateTime } from "../../../overview/format";
import { initials } from "../../../shell/initials";
import type { TeamUpdatesCopy } from "../../copy";
import type { TeamFeedUpdate } from "../data";
import { DeleteUpdateButton } from "./delete-update-button";
import { PostUpdateLauncher } from "./post-update-launcher";

/*
 * The team's updates feed (#139; Figma TM-10 544:1176): the composer, then the posts
 * grouped Today / Yesterday / This week / Earlier (Lisbon days), each with Edit and
 * Delete. "Needs you" posts have a red border and tag, milestones are green, edits say
 * so, linked tasks open the ticket. Server-rendered; only the dialogs are client code.
 */

export function TeamUpdatesView({
  copy,
  projectId,
  publicId,
  clientName,
  authorName,
  updates,
  tickets,
  now,
}: {
  copy: TeamUpdatesCopy;
  projectId: string;
  publicId: string;
  clientName: string;
  authorName: string;
  updates: TeamFeedUpdate[];
  tickets: { id: string; number: number; title: string }[];
  now: Date;
}) {
  const groups = groupUpdatesByDay(updates, now);
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const pickable = tickets.map(({ id, title }) => ({ id, title }));
  const launcher = {
    copy,
    projectId,
    clientName,
    authorName,
    tickets: pickable,
  };
  const time = (update: TeamFeedUpdate) =>
    formatUpdateTime(update.createdAt, now, "en", {
      today: "",
      yesterday: "",
    }).trim();

  return (
    <div className="flex max-w-[720px] flex-col gap-lg">
      <div className="flex flex-col gap-2">
        <div className="sm:flex-row sm:items-center flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-3 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar initials={initials(authorName)} />
            <PostUpdateLauncher
              {...launcher}
              variant="composer"
              label={fill(copy.composer, { client: clientName })}
            />
          </div>
          <PostUpdateLauncher {...launcher} label={copy.postUpdate} />
        </div>
        <p className="text-[13px] text-text-muted">{copy.feedNote}</p>
      </div>

      {groups.length === 0 ? (
        <p className="text-body text-text-muted">{copy.empty}</p>
      ) : (
        groups.map(({ group, updates: items }) => (
          <section
            key={group}
            aria-labelledby={`team-updates-${group}`}
            className="flex flex-col gap-3"
          >
            <h2
              id={`team-updates-${group}`}
              className="text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase"
            >
              {copy.groups[group]}
            </h2>
            <ul className="flex flex-col gap-3">
              {items.map((update) => {
                const author = update.authorName ?? "NortBrand";
                const when = time(update);
                const linked = update.ticketIds.flatMap((id) => {
                  const ticket = byId.get(id);
                  return ticket ? [ticket] : [];
                });
                return (
                  <li key={update.id}>
                    <article
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-lg",
                        update.needsClient &&
                          "border-action-primary bg-bg-surface",
                        update.highlight &&
                          !update.needsClient &&
                          "border-transparent bg-action-secondary-subtle",
                        !update.needsClient &&
                          !update.highlight &&
                          "border-border-default bg-bg-surface",
                      )}
                    >
                      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Avatar initials={initials(author)} />
                        <span className="text-[14px] font-medium text-text-primary">
                          {author}
                        </span>
                        <span className="text-[13px] text-text-muted">
                          {when}
                          {update.editedAt ? ` · ${copy.edited}` : ""}
                        </span>
                        <span className="flex-1" />
                        {update.needsClient ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-action-primary-subtle px-2.5 py-1 text-[13px] font-medium text-text-error">
                            <Square
                              aria-hidden
                              strokeWidth={ICON_STROKE}
                              className="size-3.5 fill-current"
                            />
                            {copy.needsYou}
                          </span>
                        ) : update.highlight ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-action-secondary">
                            <CircleCheck
                              aria-hidden
                              strokeWidth={ICON_STROKE}
                              className="size-4"
                            />
                            {copy.milestone}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-3">
                          <PostUpdateLauncher
                            {...launcher}
                            variant="link"
                            label={copy.edit}
                            ariaLabel={fill(copy.editLabel, { time: when })}
                            editing={{
                              updateId: update.id,
                              body: update.body,
                              highlight: update.highlight,
                              needsClient: update.needsClient,
                              ticketIds: update.ticketIds,
                            }}
                          />
                          <DeleteUpdateButton
                            copy={copy}
                            projectId={projectId}
                            updateId={update.id}
                            clientName={clientName}
                            label={fill(copy.deleteLabel, { time: when })}
                          />
                        </span>
                      </header>
                      <p className="text-[15px] whitespace-pre-line text-text-primary">
                        {update.body}
                      </p>
                      {linked.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {linked.map((ticket) => (
                            <li key={ticket.id}>
                              <Link
                                href={`/team/projects/${publicId}/board?ticket=${String(ticket.number)}`}
                                aria-label={fill(copy.linkedTask, {
                                  title: ticket.title,
                                })}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-default px-3 text-[13px] font-medium text-text-primary hover:bg-bg-primary md:min-h-9"
                              >
                                <Check
                                  aria-hidden
                                  strokeWidth={ICON_STROKE}
                                  className="size-3.5"
                                />
                                {ticket.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
