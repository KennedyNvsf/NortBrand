import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import type { ProjectHealth } from "../../overview/data";
import { fakeNextProjectId, fakeProjects } from "./e2e-store";
import type { TeamProject } from "./list";

/*
 * Reads for the team's Projects page (#136). Server-only, with the teammate's session:
 * RLS scopes the rows (members see only projects they work on; admins see all). One
 * query with embedded stages, ticket statuses and the newest live update per project.
 * Per user and per request: never cached across users (ADR-009).
 */

const HEALTH: readonly ProjectHealth[] = [
  "on_track",
  "at_risk",
  "waiting_on_client",
];
const isHealth = (value: string): value is ProjectHealth =>
  (HEALTH as readonly string[]).includes(value);

export async function getTeamProjects(): Promise<TeamProject[]> {
  if (isFakeBackendEnabled()) return fakeProjects();

  const supabase = await getPortalSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, public_id, name, client_name, launches_on, health, status, lead:team_members!projects_lead_id_fkey(name), stages(id, position, name, starts_on, ends_on, completed_at), tickets(status), updates(created_at)",
    )
    .is("updates.deleted_at", null)
    .order("created_at", { referencedTable: "updates", ascending: false })
    .limit(1, { referencedTable: "updates" })
    .order("launches_on");
  if (error) throw new Error(`Projects list failed (${error.code})`);

  return data.map((row) => ({
    id: row.id,
    publicId: row.public_id,
    name: row.name,
    clientName: row.client_name,
    launchesOn: row.launches_on,
    health: isHealth(row.health) ? row.health : "on_track",
    status: row.status === "closed" ? "closed" : "active",
    leadName: row.lead.name,
    stages: row.stages.map((stage) => ({
      id: stage.id,
      position: stage.position,
      name: stage.name,
      startsOn: stage.starts_on,
      endsOn: stage.ends_on,
      completed: stage.completed_at !== null,
    })),
    ticketsDone: row.tickets.filter((ticket) => ticket.status === "done")
      .length,
    ticketsTotal: row.tickets.length,
    lastUpdateAt: row.updates.at(0)?.created_at ?? null,
  }));
}

/** The Project ID previewed in the New project modal. Admins only (SQL checks too). */
export async function getSuggestedProjectId(): Promise<string | null> {
  if (isFakeBackendEnabled()) return fakeNextProjectId();
  const { data, error } = await (
    await getPortalSupabase()
  ).rpc("portal_next_project_id");
  return error ? null : data;
}
