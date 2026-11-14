import { cache } from "react";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { isTicketStatus, type PortalStage, type PortalTicket } from "./domain";
import { E2E_PROJECT_VIEW } from "./e2e-fixture";

/*
 * The client's project, read for the overview and tasks (#134). Server components only,
 * under RLS with the client's session: tickets are the client-visible ones, updates the
 * undeleted ones, checklists only for visible tickets (the policies in #130). Names are
 * resolved from the teammates the client may see; anyone hidden reads as the studio.
 * Cached per request (layout, page and detail share one read); never across users.
 */

export type ProjectHealth = "on_track" | "at_risk" | "waiting_on_client";

export type PortalUpdate = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  ticketIds: string[];
};

export type ProjectView = {
  id: string;
  publicId: string;
  name: string;
  health: ProjectHealth;
  stagingUrl: string | null;
  launchesOn: string;
  stages: PortalStage[];
  tickets: PortalTicket[];
  updates: PortalUpdate[];
};

export type ChecklistItem = { id: string; label: string; done: boolean };

const HEALTH: readonly ProjectHealth[] = [
  "on_track",
  "at_risk",
  "waiting_on_client",
];
const isHealth = (value: unknown): value is ProjectHealth =>
  typeof value === "string" && (HEALTH as readonly string[]).includes(value);

export const getProjectView = cache(async function getProjectView(
  publicId: string,
): Promise<ProjectView | null> {
  const wanted = publicId.toUpperCase();
  if (isFakeBackendEnabled()) {
    return wanted === E2E_PROJECT_VIEW.publicId ? E2E_PROJECT_VIEW : null;
  }

  const supabase = await getPortalSupabase();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, public_id, name, health, staging_url, launches_on")
    .eq("public_id", wanted)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`Project read failed (${error.code})`);
  if (!project) return null;

  const [stages, tickets, updates, people] = await Promise.all([
    supabase
      .from("stages")
      .select("id, position, name, starts_on, ends_on, completed_at")
      .eq("project_id", project.id)
      .order("position"),
    supabase
      .from("tickets")
      .select(
        "id, number, title, description, status, due_on, created_at, waiting_on_client, client_visible, stage_id, owner_id",
      )
      .eq("project_id", project.id)
      .order("number"),
    supabase
      .from("updates")
      .select("id, body, created_at, author_id, update_tickets(ticket_id)")
      .eq("project_id", project.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("team_members").select("user_id, name"),
  ]);
  for (const result of [stages, tickets, updates]) {
    if (result.error)
      throw new Error(`Project data failed (${result.error.code})`);
  }

  const names = new Map(
    (people.data ?? []).map((row) => [row.user_id, row.name]),
  );

  return {
    id: project.id,
    publicId: project.public_id,
    name: project.name,
    health: isHealth(project.health) ? project.health : "on_track",
    stagingUrl: project.staging_url,
    launchesOn: project.launches_on,
    stages: (stages.data ?? []).map((row) => ({
      id: row.id,
      position: row.position,
      name: row.name,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      completed: row.completed_at !== null,
    })),
    tickets: (tickets.data ?? []).flatMap((row) =>
      isTicketStatus(row.status)
        ? [
            {
              id: row.id,
              number: row.number,
              title: row.title,
              description: row.description,
              status: row.status,
              dueOn: row.due_on,
              createdOn: row.created_at.slice(0, 10),
              waitingOnClient: row.waiting_on_client,
              clientVisible: row.client_visible,
              stageId: row.stage_id,
              ownerName: row.owner_id
                ? (names.get(row.owner_id) ?? null)
                : null,
            },
          ]
        : [],
    ),
    updates: (updates.data ?? []).map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorName: names.get(row.author_id) ?? null,
      ticketIds: row.update_tickets.map((link) => link.ticket_id),
    })),
  };
});

/** A visible task's checklist (RLS returns nothing for a task the client can't see). */
export async function getChecklist(ticketId: string): Promise<ChecklistItem[]> {
  if (isFakeBackendEnabled()) {
    return E2E_PROJECT_VIEW.checklists[ticketId] ?? [];
  }
  const { data, error } = await (
    await getPortalSupabase()
  )
    .from("ticket_checklist_items")
    .select("id, label, done")
    .eq("ticket_id", ticketId)
    .order("position");
  if (error) throw new Error(`Checklist read failed (${error.code})`);
  return data;
}
