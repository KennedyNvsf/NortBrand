import { z } from "zod";

import { TICKET_STATUSES, type TicketStatus } from "../../overview/domain";
import type { TeamViewer } from "../team-admin";
import {
  saveTicketSchema,
  ticketFieldErrors,
  type EditableTicket,
  type SaveTicketInput,
  type TicketFieldErrors,
} from "./ticket";

/*
 * Saving, moving and deleting tickets (#137), free of Next.js and Supabase; actions.ts
 * supplies the real dependencies. Every write runs under the teammate's own session, so
 * RLS decides (works_on_project); a client or a teammate not on the project is refused
 * by the database even if a check here were skipped.
 *
 * Save: validate → portal_save_ticket with the loaded version →
 *   saved | conflict (the ticket as saved now and who saved it; the editor works out
 *   what changed, conflict.ts) | refused.
 * Move (drag, or the card's status menu): one field, last move wins; it bumps the
 *   version, so an editor open on that ticket will see the change before overwriting it.
 */

type DbError = { error: { code: string | undefined } };

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

const signedIn = (viewer: TeamViewer) => viewer.status === "signed_in";

export type SaveTicketResult =
  | { status: "saved"; ticketId: string; number: number; version: string }
  | { status: "conflict"; current: EditableTicket; changedBy: string | null }
  | { status: "invalid"; fieldErrors: TicketFieldErrors }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "failed" };

export type SaveTicketDeps = {
  viewer: () => Promise<TeamViewer>;
  save: (input: SaveTicketInput) => Promise<
    | {
        outcome: "saved" | "conflict" | "not_found";
        ticketId: string;
        number: number | null;
        version: string | null;
      }
    | DbError
  >;
  read: (
    projectId: string,
    ticketId: string,
  ) => Promise<{ ticket: EditableTicket; changedBy: string | null } | null>;
  reportFailure: (where: string, code: string | undefined) => void;
};

export async function saveTicket(
  input: unknown,
  deps: SaveTicketDeps,
): Promise<SaveTicketResult> {
  if (!signedIn(await deps.viewer())) return { status: "forbidden" };

  const parsed = saveTicketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      fieldErrors: ticketFieldErrors(parsed.error.issues),
    };
  }

  const result = await deps.save(parsed.data);
  if (isDbError(result)) {
    switch (result.error.code) {
      case "42501":
        return { status: "forbidden" };
      case "22023":
        return { status: "invalid", fieldErrors: { ownerId: "ownerInvalid" } };
      case "23503":
        return { status: "invalid", fieldErrors: { stageId: "stageInvalid" } };
      default:
        deps.reportFailure("save_ticket", result.error.code);
        return { status: "failed" };
    }
  }

  if (result.outcome === "not_found") return { status: "not_found" };
  if (result.outcome === "conflict") {
    const now = await deps.read(parsed.data.projectId, result.ticketId);
    if (!now) return { status: "not_found" };
    return {
      status: "conflict",
      current: now.ticket,
      changedBy: now.changedBy,
    };
  }
  if (result.number === null || result.version === null) {
    deps.reportFailure("save_ticket", "unexpected_answer");
    return { status: "failed" };
  }
  return {
    status: "saved",
    ticketId: result.ticketId,
    number: result.number,
    version: result.version,
  };
}

export const moveSchema = z.object({
  projectId: z.uuid(),
  ticketId: z.uuid(),
  status: z.enum(TICKET_STATUSES),
});

export type MoveTicketResult =
  | { status: "moved"; ticketStatus: TicketStatus; version: string }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "failed" };

export async function moveTicket(
  input: unknown,
  deps: {
    viewer: () => Promise<TeamViewer>;
    move: (
      move: z.infer<typeof moveSchema>,
    ) => Promise<{ version: string } | null | DbError>;
    reportFailure: (where: string, code: string | undefined) => void;
  },
): Promise<MoveTicketResult> {
  if (!signedIn(await deps.viewer())) return { status: "forbidden" };
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { status: "not_found" };
  const moved = await deps.move(parsed.data);
  if (moved === null) return { status: "not_found" };
  if (isDbError(moved)) {
    if (moved.error.code === "42501") return { status: "forbidden" };
    deps.reportFailure("move_ticket", moved.error.code);
    return { status: "failed" };
  }
  return {
    status: "moved",
    ticketStatus: parsed.data.status,
    version: moved.version,
  };
}

export const deleteSchema = z.object({
  projectId: z.uuid(),
  ticketId: z.uuid(),
});

export type DeleteTicketResult =
  | { status: "deleted" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "failed" };

export async function deleteTicket(
  input: unknown,
  deps: {
    viewer: () => Promise<TeamViewer>;
    remove: (
      target: z.infer<typeof deleteSchema>,
    ) => Promise<"deleted" | "not_found" | DbError>;
    reportFailure: (where: string, code: string | undefined) => void;
  },
): Promise<DeleteTicketResult> {
  if (!signedIn(await deps.viewer())) return { status: "forbidden" };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { status: "not_found" };
  const removed = await deps.remove(parsed.data);
  if (isDbError(removed)) {
    if (removed.error.code === "42501") return { status: "forbidden" };
    deps.reportFailure("delete_ticket", removed.error.code);
    return { status: "failed" };
  }
  return { status: removed };
}
