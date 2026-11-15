import { TICKET_STATUSES, type TicketStatus } from "../../overview/domain";

/*
 * Team board rules (#137; Figma TM-02, TM-T02, TM-M02), pure and unit-tested.
 *
 * Columns follow the Figma board: To do, In progress, In review, Done. A blocked ticket
 * stays in the In progress column with a "Blocked" marker (Figma draws "Waiting on
 * client" there); its status is still Blocked. Filters are URL state: ?stage=, ?owner=
 * and, on mobile, ?status= (one column at a time). A column shows its first cards and
 * "+N more" for the rest.
 */

export const BOARD_COLUMNS = [
  "todo",
  "in_progress",
  "in_review",
  "done",
] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export type BoardTicket = {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  stageId: string;
  ownerId: string | null;
  ownerName: string | null;
  dueOn: string | null;
  clientVisible: boolean;
  waitingOnClient: boolean;
  /** tickets.updated_at: what a save sends back to prove it read the latest. */
  version: string;
};

export type BoardFilters = {
  stage: string | null;
  owner: string | null;
  status: BoardColumn;
};

export function columnOf(status: TicketStatus): BoardColumn {
  return status === "blocked" ? "in_progress" : status;
}

export function isTicketStatus(value: unknown): value is TicketStatus {
  return TICKET_STATUSES.some((status) => status === value);
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Unknown stage or owner ids fall back to "all", so a stale link still shows the board. */
export function parseBoardFilters(
  params: Record<string, string | string[] | undefined>,
  known: { stageIds: readonly string[]; ownerIds: readonly string[] },
): BoardFilters {
  const stage = one(params.stage);
  const owner = one(params.owner);
  const status = one(params.status);
  return {
    stage: stage && known.stageIds.includes(stage) ? stage : null,
    owner:
      owner === "none" || (owner && known.ownerIds.includes(owner))
        ? owner
        : null,
    status: BOARD_COLUMNS.find((column) => column === status) ?? "todo",
  };
}

export function matchesFilters(
  ticket: BoardTicket,
  filters: Pick<BoardFilters, "stage" | "owner">,
): boolean {
  if (filters.stage && ticket.stageId !== filters.stage) return false;
  if (filters.owner === "none") return ticket.ownerId === null;
  if (filters.owner && ticket.ownerId !== filters.owner) return false;
  return true;
}

/** Due soonest first (undated last), then by number; Done shows the latest first. */
function order(column: BoardColumn) {
  return (a: BoardTicket, b: BoardTicket) => {
    if (column === "done") return b.number - a.number;
    if (a.dueOn !== b.dueOn) {
      if (!a.dueOn) return 1;
      if (!b.dueOn) return -1;
      return a.dueOn < b.dueOn ? -1 : 1;
    }
    return a.number - b.number;
  };
}

/** How many cards a column shows before "+N more" (Done keeps it short). */
export const COLUMN_LIMIT: Record<BoardColumn, number> = {
  todo: 4,
  in_progress: 5,
  in_review: 4,
  done: 2,
};

export function buildColumns(
  tickets: readonly BoardTicket[],
  filters: Pick<BoardFilters, "stage" | "owner">,
): { column: BoardColumn; tickets: BoardTicket[] }[] {
  const shown = tickets.filter((ticket) => matchesFilters(ticket, filters));
  return BOARD_COLUMNS.map((column) => ({
    column,
    tickets: shown
      .filter((ticket) => columnOf(ticket.status) === column)
      .sort(order(column)),
  }));
}

/** Moving a card to a column sets that status (dropping on In progress unblocks it). */
export function statusForColumn(column: BoardColumn): TicketStatus {
  return column;
}
