import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { getPortalViewer } from "../auth/access";
import {
  E2E_TEAM_COOKIE,
  fakeTeamMemberById,
  fakeTeamRoster,
} from "./e2e-backend";
import type { TeamRole, TeamViewer } from "./team-admin";

/*
 * Who is looking at a team page (#132). Server-only. A teammate needs a valid session
 * (the 30-day marker included, as for clients) and an *active* team_members row, read
 * under RLS: a removed teammate is refused on their very next request, whatever their
 * Supabase session still says.
 */

export type Teammate = {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
};

const isRole = (value: unknown): value is TeamRole =>
  value === "admin" || value === "member";

export async function getTeamViewer(): Promise<TeamViewer> {
  const viewer = await getPortalViewer(E2E_TEAM_COOKIE);
  if (viewer.status !== "signed_in") return viewer;

  if (isFakeBackendEnabled()) {
    const member = fakeTeamMemberById(viewer.userId);
    return member
      ? {
          status: "signed_in",
          userId: viewer.userId,
          name: member.name,
          role: member.role,
        }
      : { status: "signed_out" };
  }

  const { data } = await (
    await getPortalSupabase()
  )
    .from("team_members")
    .select("name, role")
    .eq("user_id", viewer.userId)
    .eq("active", true)
    .maybeSingle();

  // Signed in, but not (or no longer) a teammate: a client, or someone removed.
  if (!data || !isRole(data.role)) return { status: "signed_out" };
  return {
    status: "signed_in",
    userId: viewer.userId,
    name: data.name,
    role: data.role,
  };
}

/** Active teammates, admins first, then by name. RLS: teammates only. */
export async function listTeammates(): Promise<Teammate[]> {
  if (isFakeBackendEnabled()) return sortTeam(fakeTeamRoster());

  const { data, error } = await (
    await getPortalSupabase()
  )
    .from("team_members")
    .select("user_id, name, email, role")
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Team list failed (${error.code})`);

  return sortTeam(
    data.flatMap((row) =>
      isRole(row.role)
        ? [
            {
              userId: row.user_id,
              name: row.name,
              email: row.email,
              role: row.role,
            },
          ]
        : [],
    ),
  );
}

function sortTeam(team: Teammate[]): Teammate[] {
  return [...team].sort(
    (a, b) =>
      (a.role === "admin" ? 0 : 1) - (b.role === "admin" ? 0 : 1) ||
      a.name.localeCompare(b.name),
  );
}
