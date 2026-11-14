import { cookies } from "next/headers";
import { cache } from "react";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { getTeamViewer } from "./access";
import { E2E_TEAM_COOKIE } from "./e2e-backend";
import type { TeamRole } from "./team-admin";

/*
 * What the team shell shows (#133): who is signed in, and the counts in the nav (active
 * projects the viewer works on, and their open tickets). Read with the teammate's
 * session, so RLS scopes both: members count only the projects they're assigned to.
 */

export type TeamShellData = {
  viewer: { userId: string; name: string; role: TeamRole; email: string };
  counts: { projects: number; myTickets: number };
};

export const getTeamShell = cache(
  async function getTeamShell(): Promise<TeamShellData | null> {
    const viewer = await getTeamViewer();
    if (viewer.status !== "signed_in") return null;

    if (isFakeBackendEnabled()) {
      return {
        viewer: {
          userId: viewer.userId,
          name: viewer.name,
          role: viewer.role,
          email: (await cookies()).get(E2E_TEAM_COOKIE)?.value ?? "",
        },
        counts: { projects: 0, myTickets: 0 },
      };
    }

    const supabase = await getPortalSupabase();
    const [projects, tickets, user] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", viewer.userId)
        .neq("status", "done"),
      supabase.auth.getUser(),
    ]);

    return {
      viewer: {
        userId: viewer.userId,
        name: viewer.name,
        role: viewer.role,
        email: user.data.user?.email ?? "",
      },
      counts: { projects: projects.count ?? 0, myTickets: tickets.count ?? 0 },
    };
  },
);
