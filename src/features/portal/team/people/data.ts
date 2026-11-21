import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { fakeTeamRoster } from "../e2e-backend";
import { fakeProjects } from "../projects/e2e-store";
import type { TeamRole } from "../team-admin";

/*
 * The Team table (#142; Figma TM-12): every active teammate with their role, the active
 * projects they work on (admins work on all), their open tickets and when they last
 * signed in. Read through portal_team_overview (teammates only).
 */

export type TeamPerson = {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  projectNames: string[];
  openTickets: number;
  lastActiveAt: string | null;
};

export type TeamOverview = { people: TeamPerson[]; activeProjects: number };

export async function getTeamOverview(): Promise<TeamOverview> {
  if (isFakeBackendEnabled()) {
    const active = fakeProjects().filter(
      (project) => project.status === "active",
    );
    const people = fakeTeamRoster()
      .map((member) => ({
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        projectNames:
          member.role === "admin"
            ? active.map((project) => project.name)
            : active.slice(0, 1).map((p) => p.name),
        openTickets: member.role === "admin" ? 4 : 2,
        lastActiveAt: new Date().toISOString(),
      }))
      .sort(
        (a, b) =>
          Number(b.role === "admin") - Number(a.role === "admin") ||
          a.name.localeCompare(b.name),
      );
    return { people, activeProjects: active.length };
  }

  const supabase = await getPortalSupabase();
  const [overview, projects] = await Promise.all([
    supabase.rpc("portal_team_overview"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);
  if (overview.error)
    throw new Error(`Team overview failed (${overview.error.code})`);
  if (projects.error)
    throw new Error(`Projects count failed (${projects.error.code})`);

  return {
    activeProjects: projects.count ?? 0,
    people: overview.data.flatMap((row) =>
      row.role === "admin" || row.role === "member"
        ? [
            {
              userId: row.user_id,
              name: row.name,
              email: row.email,
              role: row.role,
              projectNames: row.project_names,
              openTickets: row.open_tickets,
              lastActiveAt: row.last_active_at,
            },
          ]
        : [],
    ),
  };
}
