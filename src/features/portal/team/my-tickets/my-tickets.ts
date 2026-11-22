import { daysUntil } from "../../overview/domain";
import type { TicketStatus } from "../../overview/domain";

/*
 * My tickets (#142; Figma TM-11, TM-M05): the viewer's open tickets across their
 * projects, grouped by due date in Lisbon time. Pure, so it's tested without a database.
 * - Overdue: due before today.
 * - This week: due from today up to Sunday of this week (Lisbon).
 * - Later: due after this week, or no due date (those sort last).
 */

export type MyTicket = {
  id: string;
  number: number;
  title: string;
  status: Exclude<TicketStatus, "done">;
  dueOn: string | null;
  clientVisible: boolean;
  projectPublicId: string;
  projectName: string;
  clientName: string;
};

export type MyTicketGroup = "overdue" | "thisWeek" | "later";

/** Days from today (YYYY-MM-DD, Lisbon) to this week's Sunday; 0 on a Sunday. */
export function daysToSunday(today: string): number {
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(
    Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  ).getUTCDay();
  return (7 - weekday) % 7;
}

export function groupOf(
  ticket: Pick<MyTicket, "dueOn">,
  today: string,
): MyTicketGroup {
  if (!ticket.dueOn) return "later";
  const days = daysUntil(ticket.dueOn, today);
  if (days < 0) return "overdue";
  return days <= daysToSunday(today) ? "thisWeek" : "later";
}

const byDue = (a: MyTicket, b: MyTicket) => {
  if (a.dueOn === b.dueOn) return a.title.localeCompare(b.title);
  if (!a.dueOn) return 1;
  if (!b.dueOn) return -1;
  return a.dueOn.localeCompare(b.dueOn);
};

export function groupMyTickets(
  tickets: readonly MyTicket[],
  today: string,
): Record<MyTicketGroup, MyTicket[]> {
  const groups: Record<MyTicketGroup, MyTicket[]> = {
    overdue: [],
    thisWeek: [],
    later: [],
  };
  for (const ticket of tickets) groups[groupOf(ticket, today)].push(ticket);
  groups.overdue.sort(byDue);
  groups.thisWeek.sort(byDue);
  groups.later.sort(byDue);
  return groups;
}

/** "12 open across 5 projects · 2 overdue · 3 due this week" (counts for the summary). */
export function summarize(tickets: readonly MyTicket[], today: string) {
  const groups = groupMyTickets(tickets, today);
  return {
    open: tickets.length,
    projects: new Set(tickets.map((ticket) => ticket.projectPublicId)).size,
    overdue: groups.overdue.length,
    thisWeek: groups.thisWeek.length,
  };
}
