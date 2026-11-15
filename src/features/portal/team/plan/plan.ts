import type { ProjectHealth } from "../../overview/data";
import {
  daysUntil,
  type PortalStage,
  type TicketStatus,
} from "../../overview/domain";

/*
 * The project plan's rules (#138; Figma TM-05, TM-05b, TM-07), pure and unit-tested.
 *
 * - Progress: the team sees every ticket; the client only client-visible ones
 *   ("Team-only tickets don't count towards what the client sees").
 * - Health suggestion: waiting on the client wins (a ticket blocked on them), then at
 *   risk (tickets past due, or the current stage past its planned end), else on track.
 *   It's a suggestion: the team chooses.
 * - Attention list (team overview): blocked on the client for days, a client who hasn't
 *   signed in since the invite, a ticket in review for days.
 * - Completing a stage: what's still open and where it could go.
 */

export type PlanTicket = {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  stageId: string;
  dueOn: string | null;
  clientVisible: boolean;
  waitingOnClient: boolean;
  /** When the ticket last changed (ISO), as a stand-in for "since" in the attention list. */
  changedAt: string;
};

export type PlanClient = {
  email: string;
  name: string | null;
  status: "invited" | "active" | "removed";
  invitedAt: string;
  lastSignInAt: string | null;
};

const lisbonDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(iso),
  );

export function progressOf(tickets: readonly { status: TicketStatus }[]): {
  done: number;
  total: number;
  percent: number;
} {
  const done = tickets.filter((ticket) => ticket.status === "done").length;
  return {
    done,
    total: tickets.length,
    percent:
      tickets.length === 0 ? 0 : Math.round((done / tickets.length) * 100),
  };
}

export function teamProgress(tickets: readonly PlanTicket[]) {
  return progressOf(tickets);
}

export function clientProgress(tickets: readonly PlanTicket[]) {
  return progressOf(tickets.filter((ticket) => ticket.clientVisible));
}

export function stageProgress(tickets: readonly PlanTicket[], stageId: string) {
  return progressOf(tickets.filter((ticket) => ticket.stageId === stageId));
}

export type HealthSuggestion =
  | { health: "waiting_on_client"; reason: "blocked_on_client"; count: number }
  | { health: "at_risk"; reason: "overdue"; count: number }
  | { health: "at_risk"; reason: "stage_late"; stage: string; endsOn: string }
  | { health: "on_track"; reason: "on_track" };

const isOpen = (ticket: PlanTicket) => ticket.status !== "done";

export function suggestHealth(
  tickets: readonly PlanTicket[],
  current: PortalStage | null,
  today: string,
): HealthSuggestion {
  const blocked = tickets.filter(
    (ticket) => isOpen(ticket) && ticket.waitingOnClient,
  );
  if (blocked.length > 0) {
    return {
      health: "waiting_on_client",
      reason: "blocked_on_client",
      count: blocked.length,
    };
  }
  const overdue = tickets.filter(
    (ticket) => isOpen(ticket) && ticket.dueOn !== null && ticket.dueOn < today,
  );
  if (overdue.length > 0) {
    return { health: "at_risk", reason: "overdue", count: overdue.length };
  }
  if (
    current &&
    !current.completed &&
    current.endsOn &&
    current.endsOn < today
  ) {
    return {
      health: "at_risk",
      reason: "stage_late",
      stage: current.name,
      endsOn: current.endsOn,
    };
  }
  return { health: "on_track", reason: "on_track" };
}

export type AttentionItem =
  | { kind: "blocked"; ticketNumber: number; title: string; days: number }
  | { kind: "not_signed_in"; name: string; invitedOn: string }
  | { kind: "in_review"; ticketNumber: number; title: string; days: number };

/** A client is chased after this many days without signing in; a review after this many. */
export const ATTENTION_DAYS = { signIn: 3, review: 3 } as const;

export function attentionItems(
  tickets: readonly PlanTicket[],
  clients: readonly PlanClient[],
  today: string,
): AttentionItem[] {
  const since = (iso: string) => Math.max(0, -daysUntil(lisbonDay(iso), today));
  const blocked: AttentionItem[] = tickets
    .filter((ticket) => isOpen(ticket) && ticket.waitingOnClient)
    .map((ticket) => ({
      kind: "blocked" as const,
      ticketNumber: ticket.number,
      title: ticket.title,
      days: since(ticket.changedAt),
    }))
    .sort((a, b) => b.days - a.days);
  const quiet: AttentionItem[] = clients
    .filter(
      (client) =>
        client.status === "invited" &&
        client.lastSignInAt === null &&
        since(client.invitedAt) >= ATTENTION_DAYS.signIn,
    )
    .map((client) => ({
      kind: "not_signed_in" as const,
      name: client.name ?? client.email,
      invitedOn: lisbonDay(client.invitedAt),
    }));
  const reviews: AttentionItem[] = tickets
    .filter(
      (ticket) =>
        ticket.status === "in_review" &&
        since(ticket.changedAt) >= ATTENTION_DAYS.review,
    )
    .map((ticket) => ({
      kind: "in_review" as const,
      ticketNumber: ticket.number,
      title: ticket.title,
      days: since(ticket.changedAt),
    }))
    .sort((a, b) => b.days - a.days);
  return [...blocked, ...quiet, ...reviews];
}

export type CompletionPlan = {
  stage: PortalStage;
  next: PortalStage | null;
  open: number;
  total: number;
  /** Planned to end after today: completing it now is early. */
  early: boolean;
};

/** Only the current stage (the first open one) can be completed. */
export function completionPlan(
  stages: readonly PortalStage[],
  tickets: readonly PlanTicket[],
  stageId: string,
  today: string,
): CompletionPlan | null {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((stage) => stage.id === stageId);
  const stage = ordered[index];
  if (!stage || stage.completed) return null;
  if (ordered.slice(0, index).some((earlier) => !earlier.completed))
    return null;
  const inStage = tickets.filter((ticket) => ticket.stageId === stageId);
  return {
    stage,
    next: ordered[index + 1] ?? null,
    open: inStage.filter(isOpen).length,
    total: inStage.length,
    early: stage.endsOn !== null && stage.endsOn > today,
  };
}

export const HEALTH_VALUES: readonly ProjectHealth[] = [
  "on_track",
  "at_risk",
  "waiting_on_client",
];
