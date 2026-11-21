"use server";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import { fakeSetRole } from "../e2e-backend";
import { setTeamRole, type RoleResult } from "./roles";

/* Role change (#142): admin only, checked in roles.ts and again in SQL. */

export async function setTeamRoleAction(input: unknown): Promise<RoleResult> {
  return setTeamRole(input, {
    viewer: getTeamViewer,
    save: async (userId, role) => {
      if (isFakeBackendEnabled()) return fakeSetRole(userId, role);
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_set_team_role", { p_user_id: userId, p_role: role });
      return error
        ? { error: { code: error.code, message: error.message } }
        : "ok";
    },
    reportFailure: reportPortalFailure("portal-team-admin"),
  });
}
