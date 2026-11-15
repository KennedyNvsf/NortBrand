import { cache } from "react";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import type { ProjectHealth } from "../../overview/data";
import { isTicketStatus, type PortalStage } from "../../overview/domain";
import type { BoardTicket } from "./board";
import type { EditableTicket } from "./conflict";
import { fakeBoard, fakeTicket } from "./e2e-store";

/*
 * Reads for the team board (#137). Server-only, with the teammate's session: RLS shows a
 * project only to its team (admins: every project), and the team sees every ticket,
 * client-visible or not. Per user and per request, never cached across users (ADR-009).
 */

export type TeamBoard = {
  project: {
    id: string;
    publicId: string;
    name: string;
    clientName: string;
    health: ProjectHealth;
    launchesOn: string;
    clientEmail: string | null;
  };
  stages: PortalStage[];
  /** Who can own a ticket: the project's team and its lead. */
  team: { userId: string; name: string }[];
  tickets: BoardTicket[];
};

const HEALTH: readonly ProjectHealth[] = [
  "on_track",
  "at_risk",
  "waiting_on_client",
];
const isHealth = (value: string): value is ProjectHealth =>
  (HEALTH as readonly string[]).includes(value);

export const getTeamBoard = cache(async function getTeamBoard(
  publicId: string,
): Promise<TeamBoard | null> {
  if (isFakeBackendEnabled()) return fakeBoard(publicId);

  const supabase = await getPortalSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, public_id, name, client_name, health, launches_on, lead:team_members!projects_lead_id_fkey(user_id, name), project_team(user_id, team_members(name)), project_clients(email, status), stages(id, position, name, starts_on, ends_on, completed_at), tickets(id, number, title, status, stage_id, owner_id, due_on, client_visible, waiting_on_client, updated_at, owner:team_members!tickets_owner_id_fkey(name))",
    )
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw new Error(`Board failed (${error.code})`);
  if (!data) return null;

  const team = new Map<string, string>([[data.lead.user_id, data.lead.name]]);
  for (const member of data.project_team) {
    team.set(member.user_id, member.team_members.name);
  }

  return {
    project: {
      id: data.id,
      publicId: data.public_id,
      name: data.name,
      clientName: data.client_name,
      health: isHealth(data.health) ? data.health : "on_track",
      launchesOn: data.launches_on,
      clientEmail:
        data.project_clients.find((client) => client.status !== "removed")
          ?.email ?? null,
    },
    stages: data.stages
      .map((stage) => ({
        id: stage.id,
        position: stage.position,
        name: stage.name,
        startsOn: stage.starts_on,
        endsOn: stage.ends_on,
        completed: stage.completed_at !== null,
      }))
      .sort((a, b) => a.position - b.position),
    team: [...team.entries()]
      .map(([userId, name]) => ({ userId, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tickets: data.tickets.flatMap((ticket) =>
      isTicketStatus(ticket.status)
        ? [
            {
              id: ticket.id,
              number: ticket.number,
              title: ticket.title,
              status: ticket.status,
              stageId: ticket.stage_id,
              ownerId: ticket.owner_id,
              ownerName: ticket.owner?.name ?? null,
              dueOn: ticket.due_on,
              clientVisible: ticket.client_visible,
              waitingOnClient: ticket.waiting_on_client,
              version: ticket.updated_at,
            },
          ]
        : [],
    ),
  };
});

/** One ticket for the editor, by number (the URL) or id (after a refused save). */
export async function getEditableTicket(
  projectId: string,
  match: { number?: number; id?: string },
): Promise<{ ticket: EditableTicket; changedBy: string | null } | null> {
  if (isFakeBackendEnabled()) return fakeTicket(projectId, match);

  const supabase = await getPortalSupabase();
  let query = supabase
    .from("tickets")
    .select(
      "id, number, title, description, status, stage_id, owner_id, due_on, client_visible, updated_at, editor:team_members!tickets_updated_by_fkey(name), ticket_checklist_items(id, label, done, position)",
    )
    .eq("project_id", projectId);
  query = match.id
    ? query.eq("id", match.id)
    : query.eq("number", match.number ?? 0);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Ticket failed (${error.code})`);
  if (!data || !isTicketStatus(data.status)) return null;

  return {
    ticket: {
      id: data.id,
      number: data.number,
      title: data.title,
      description: data.description,
      status: data.status,
      stageId: data.stage_id,
      ownerId: data.owner_id,
      dueOn: data.due_on,
      clientVisible: data.client_visible,
      checklist: [...data.ticket_checklist_items]
        .sort((a, b) => a.position - b.position)
        .map(({ id, label, done }) => ({ id, label, done })),
      version: data.updated_at,
    },
    changedBy: data.editor?.name ?? null,
  };
}
