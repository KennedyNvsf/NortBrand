import Link from "next/link";

import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { StatusPill } from "../../../overview/components/status";
import { formatDay } from "../../../overview/format";
import type { TeamPagesCopy } from "../../copy";
import {
  groupMyTickets,
  type MyTicket,
  type MyTicketGroup,
} from "../my-tickets";

/*
 * My tickets (#142; Figma TM-11, TM-M05 at 390). Three groups by due date; Overdue in
 * the error colour with its label (colour is never the only signal). Each ticket opens
 * on its project's board. Desktop rows; phones stack cards. Later folds after 5 (URL
 * state ?all=1, so it works without JavaScript). Server-rendered.
 */

const GROUPS: MyTicketGroup[] = ["overdue", "thisWeek", "later"];
const FOLD = 5;

export function MyTicketsView({
  copy,
  tickets,
  today,
  showAll,
}: {
  copy: TeamPagesCopy["myTickets"];
  tickets: MyTicket[];
  today: string;
  showAll: boolean;
}) {
  const groups = groupMyTickets(tickets, today);

  return (
    <div className="flex flex-col gap-lg">
      {GROUPS.map((group) => {
        const items = groups[group];
        if (items.length === 0) return null;
        const folded = group === "later" && !showAll && items.length > FOLD;
        const visible = folded ? items.slice(0, FOLD) : items;
        const overdue = group === "overdue";
        return (
          <section
            key={group}
            aria-labelledby={`my-${group}`}
            className={cn(
              "flex flex-col md:rounded-lg md:border md:bg-bg-surface md:p-lg",
              overdue ? "md:border-action-primary" : "md:border-border-default",
            )}
          >
            <h2
              id={`my-${group}`}
              className={cn(
                "flex items-baseline gap-2 pb-3 text-[13px] font-medium tracking-[0.08em] uppercase md:text-[16px] md:font-semibold md:tracking-normal md:normal-case",
                overdue ? "text-text-error" : "text-text-primary",
              )}
            >
              {copy.groups[group]}
              <span className="text-[13px] font-normal text-text-muted">
                {items.length}
              </span>
            </h2>
            <ul className="flex flex-col gap-3 md:gap-0 md:divide-y md:divide-border-default md:border-t md:border-border-default">
              {visible.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/team/projects/${ticket.projectPublicId}/board?ticket=${String(ticket.number)}`}
                    aria-label={fill(copy.openLabel, {
                      title: ticket.title,
                      project: ticket.projectName,
                    })}
                    className={cn(
                      "grid gap-2 rounded-lg border p-md hover:bg-bg-primary md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,16rem)_6rem_7rem] md:items-center md:gap-md md:rounded-none md:border-0 md:px-0 md:py-3",
                      overdue
                        ? "border-action-primary"
                        : "border-border-default",
                    )}
                  >
                    <span className="order-2 flex items-center gap-3 md:order-none">
                      <StatusPill
                        status={ticket.status}
                        label={copy.statusLabels[ticket.status]}
                      />
                      <span className="truncate text-[13px] text-text-muted md:hidden">
                        {ticket.clientName}
                      </span>
                      <span
                        className={cn(
                          "ml-auto shrink-0 text-[13px] md:hidden",
                          overdue ? "text-text-error" : "text-text-muted",
                        )}
                      >
                        {ticket.dueOn
                          ? formatDay(ticket.dueOn, "en")
                          : copy.noDue}
                      </span>
                    </span>
                    <span className="order-1 text-[16px] font-medium text-text-primary md:order-none md:truncate md:text-[15px]">
                      {ticket.title}
                    </span>
                    <span className="hidden truncate text-[14px] text-text-muted md:block">
                      {ticket.clientName} · {ticket.projectPublicId}
                    </span>
                    <span className="hidden md:block">
                      {ticket.clientVisible ? null : (
                        <span className="rounded-sm border border-border-default px-1.5 py-0.5 text-[12px] text-text-primary">
                          {copy.teamOnly}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[14px] md:block",
                        overdue ? "text-text-error" : "text-text-primary",
                      )}
                    >
                      {ticket.dueOn
                        ? fill(copy.due, { day: formatDay(ticket.dueOn, "en") })
                        : copy.noDue}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {folded ? (
              <Link
                href="/team/my-tickets?all=1"
                className="touch-target mt-3 self-start text-[14px] font-medium text-text-accent hover:underline"
              >
                {fill(copy.showMore, { count: items.length - FOLD })}
              </Link>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
