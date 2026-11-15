"use server";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import { getEditableTicket } from "./data";
import {
  deleteTicket,
  moveTicket,
  saveTicket,
  type DeleteTicketResult,
  type MoveTicketResult,
  type SaveTicketResult,
} from "./edit";
import { fakeDeleteTicket, fakeMoveTicket, fakeSaveTicket } from "./e2e-store";

/*
 * Ticket writes from the team board (#137). Inputs are untrusted and validated in
 * edit.ts / ticket.ts; every write runs under the teammate's own session, so RLS and
 * portal_save_ticket decide who may change what. Only Postgres error codes are reported.
 */

const report = reportPortalFailure("portal-team-admin");

async function viewerName(): Promise<string> {
  const viewer = await getTeamViewer();
  return viewer.status === "signed_in" ? viewer.name : "";
}

export async function saveTicketAction(
  input: unknown,
): Promise<SaveTicketResult> {
  const fake = isFakeBackendEnabled();
  const portal = fake ? null : await getPortalSupabase();

  return saveTicket(input, {
    viewer: getTeamViewer,
    save: async (ticket) => {
      if (!portal) return fakeSaveTicket(ticket, await viewerName());
      const { data, error } = await portal.rpc("portal_save_ticket", {
        p_project_id: ticket.projectId,
        // Left out (undefined) = SQL's default null: a new ticket, no owner, no due date.
        p_ticket_id: ticket.ticketId ?? undefined,
        p_version: ticket.version ?? undefined,
        p_title: ticket.title,
        p_description: ticket.description,
        p_status: ticket.status,
        p_stage_id: ticket.stageId,
        p_owner_id: ticket.ownerId ?? undefined,
        p_due_on: ticket.dueOn ?? undefined,
        p_client_visible: ticket.clientVisible,
        p_checklist: ticket.checklist,
      });
      if (error) return { error: { code: error.code } };
      const row = data.at(0);
      if (
        !row ||
        (row.outcome !== "saved" &&
          row.outcome !== "conflict" &&
          row.outcome !== "not_found")
      ) {
        return { error: { code: "unexpected_answer" } };
      }
      return {
        outcome: row.outcome,
        ticketId: row.ticket_id,
        number: row.ticket_number,
        version: row.version,
      };
    },
    read: (projectId, ticketId) =>
      getEditableTicket(projectId, { id: ticketId }),
    reportFailure: report,
  });
}

export async function moveTicketAction(
  input: unknown,
): Promise<MoveTicketResult> {
  const fake = isFakeBackendEnabled();
  const portal = fake ? null : await getPortalSupabase();

  return moveTicket(input, {
    viewer: getTeamViewer,
    move: async ({ projectId, ticketId, status }) => {
      if (!portal) return fakeMoveTicket(ticketId, status, await viewerName());
      const { data, error } = await portal
        .from("tickets")
        .update({ status })
        .eq("id", ticketId)
        .eq("project_id", projectId)
        .select("updated_at")
        .maybeSingle();
      if (error) return { error: { code: error.code } };
      return data ? { version: data.updated_at } : null;
    },
    reportFailure: report,
  });
}

export async function deleteTicketAction(
  input: unknown,
): Promise<DeleteTicketResult> {
  const fake = isFakeBackendEnabled();
  const portal = fake ? null : await getPortalSupabase();

  return deleteTicket(input, {
    viewer: getTeamViewer,
    remove: async ({ projectId, ticketId }) => {
      if (!portal) return fakeDeleteTicket(ticketId);
      const { data, error } = await portal
        .from("tickets")
        .delete()
        .eq("id", ticketId)
        .eq("project_id", projectId)
        .select("id");
      if (error) return { error: { code: error.code } };
      return data.length > 0 ? "deleted" : "not_found";
    },
    reportFailure: report,
  });
}
