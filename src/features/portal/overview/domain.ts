/*
 * Client overview and tasks rules (#134), free of React and Supabase so they're unit-
 * tested. Dates are calendar days (YYYY-MM-DD) in the office's zone, Europe/Lisbon
 * (CLAUDE.md: store UTC, show Lisbon time); no date library.
 */

export const TICKET_STATUSES = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type PortalStage = {
  id: string;
  position: number;
  name: string;
  startsOn: string;
  endsOn: string | null;
  completed: boolean;
};

export type PortalTicket = {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  dueOn: string | null;
  createdOn: string;
  waitingOnClient: boolean;
  /** Clients only ever receive visible tickets (RLS); kept so progress can prove it. */
  clientVisible: boolean;
  stageId: string;
  ownerName: string | null;
};

export function isTicketStatus(value: unknown): value is TicketStatus {
  return (
    typeof value === "string" &&
    (TICKET_STATUSES as readonly string[]).includes(value)
  );
}

/** Overall progress: done ÷ all, counting client-visible tickets only. */
export function progress(tickets: readonly PortalTicket[]): {
  done: number;
  total: number;
  percent: number;
} {
  const visible = tickets.filter((ticket) => ticket.clientVisible);
  const done = visible.filter((ticket) => ticket.status === "done").length;
  const total = visible.length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** The stage in progress: the first one not completed; the last when all are. */
export function currentStage(
  stages: readonly PortalStage[],
): PortalStage | null {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  return ordered.find((stage) => !stage.completed) ?? ordered.at(-1) ?? null;
}

export type StageState = "done" | "current" | "upcoming";

export function stageState(
  stage: PortalStage,
  current: PortalStage | null,
): StageState {
  if (stage.completed && stage.id !== current?.id) return "done";
  if (stage.id === current?.id) return stage.completed ? "done" : "current";
  return "upcoming";
}

/** "This week": what's moving and what's stuck. */
export function weekSummary(tickets: readonly PortalTicket[]): {
  inProgress: number;
  inReview: number;
  blocked: number;
} {
  const count = (status: TicketStatus) =>
    tickets.filter((ticket) => ticket.status === status).length;
  return {
    inProgress: count("in_progress"),
    inReview: count("in_review"),
    blocked: count("blocked"),
  };
}

const DAY_MS = 86_400_000;

function dayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / DAY_MS;
}

/** Whole days from `today` to `date` (negative when it has passed). */
export function daysUntil(date: string, today: string): number {
  return Math.round(dayNumber(date) - dayNumber(today));
}

/** Today's date in Lisbon, as YYYY-MM-DD. */
export function lisbonToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Share of a stage's dates already behind us, 0–1 (for the current-stage bar). */
export function stageElapsed(stage: PortalStage, today: string): number {
  if (stage.completed) return 1;
  if (!stage.endsOn) return 0;
  const length = daysUntil(stage.endsOn, stage.startsOn);
  if (length <= 0) return 1;
  return Math.min(1, Math.max(0, daysUntil(today, stage.startsOn) / length));
}

function urgency(ticket: PortalTicket): number {
  if (ticket.waitingOnClient) return 0;
  if (ticket.status === "blocked") return 1;
  if (ticket.status === "in_review") return 2;
  if (ticket.status === "in_progress") return 3;
  return 4;
}

/** Most urgent first: waiting on the client, blocked, then by due date, then number. */
export function byUrgency(a: PortalTicket, b: PortalTicket): number {
  return (
    urgency(a) - urgency(b) ||
    (a.dueOn ?? "9999-12-31").localeCompare(b.dueOn ?? "9999-12-31") ||
    a.number - b.number
  );
}

/** "What we're working on": open tasks in the current stage, most urgent first. */
export function workingOn(
  tickets: readonly PortalTicket[],
  stageId: string | null,
  limit = 5,
): PortalTicket[] {
  return tickets
    .filter((ticket) => ticket.stageId === stageId && ticket.status !== "done")
    .sort(byUrgency)
    .slice(0, limit);
}

export const STATUS_FILTERS = [
  "all",
  "in_progress",
  "in_review",
  "blocked",
  "todo",
  "done",
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export function parseStatusFilter(value: unknown): StatusFilter {
  return typeof value === "string" &&
    (STATUS_FILTERS as readonly string[]).includes(value)
    ? (value as StatusFilter)
    : "all";
}

export function statusCounts(
  tickets: readonly PortalTicket[],
): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: tickets.length,
    in_progress: 0,
    in_review: 0,
    blocked: 0,
    todo: 0,
    done: 0,
  };
  for (const ticket of tickets) counts[ticket.status] += 1;
  return counts;
}

export function filterByStatus(
  tickets: readonly PortalTicket[],
  filter: StatusFilter,
): PortalTicket[] {
  return filter === "all"
    ? [...tickets]
    : tickets.filter((ticket) => ticket.status === filter);
}

/** Tasks grouped by stage, newest stage first (CP-04), each group most urgent first. */
export function groupByStage(
  stages: readonly PortalStage[],
  tickets: readonly PortalTicket[],
): {
  stage: PortalStage;
  tickets: PortalTicket[];
  done: number;
  total: number;
}[] {
  const all = new Map<string, PortalTicket[]>();
  for (const ticket of tickets) {
    all.set(ticket.stageId, [...(all.get(ticket.stageId) ?? []), ticket]);
  }
  return [...stages]
    .sort((a, b) => b.position - a.position)
    .map((stage) => {
      const list = all.get(stage.id) ?? [];
      return {
        stage,
        tickets: [...list].sort(byUrgency),
        done: list.filter((ticket) => ticket.status === "done").length,
        total: list.length,
      };
    })
    .filter((group) => group.total > 0);
}
