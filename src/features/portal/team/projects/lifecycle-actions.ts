"use server";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { removeAuthUser } from "@/lib/supabase/admin";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import { fakeDeleteProject, fakeSetProjectStatus } from "./e2e-store";
import {
  deleteProject,
  setProjectStatus,
  type DeleteResult,
  type StatusResult,
} from "./lifecycle";

/*
 * Archive, restore and delete a project (#165). Inputs are untrusted and validated in
 * lifecycle.ts; the role is checked there and in SQL. Table writes and Storage run
 * under the admin's own session (RLS and the Storage rules apply); only deleting a
 * client's auth user uses the service role (auth administration, ADR-009).
 */

const report = reportPortalFailure("portal-team-admin");
const BUCKET = "portal-files";

export async function setProjectStatusAction(
  input: unknown,
): Promise<StatusResult> {
  return setProjectStatus(input, {
    viewer: getTeamViewer,
    save: async (projectId, status) => {
      if (isFakeBackendEnabled())
        return fakeSetProjectStatus(projectId, status);
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_set_project_status", {
        p_project_id: projectId,
        p_status: status,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
    reportFailure: report,
  });
}

export async function deleteProjectAction(
  input: unknown,
): Promise<DeleteResult> {
  const fake = isFakeBackendEnabled();
  const portal = fake ? null : await getPortalSupabase();

  return deleteProject(input, {
    viewer: getTeamViewer,
    listFiles: async (projectId) => {
      if (!portal) return [];
      const folder = `projects/${projectId}`;
      const { data, error } = await portal.storage
        .from(BUCKET)
        .list(folder, { limit: 1000 });
      if (error) return { error: { code: error.name } };
      return data.map((object) => `${folder}/${object.name}`);
    },
    remove: async (projectId, confirm) => {
      if (!portal) return fakeDeleteProject(projectId, confirm);
      const { data, error } = await portal.rpc("portal_delete_project", {
        p_project_id: projectId,
        p_confirm: confirm,
      });
      if (error) {
        return { error: { code: error.code, message: error.message } };
      }
      return data.map((row) => row.user_id);
    },
    removeFiles: async (paths) => {
      if (!portal) return "ok";
      const { error } = await portal.storage.from(BUCKET).remove(paths);
      return error ? { error: { code: error.name } } : "ok";
    },
    deleteAccount: (userId) =>
      fake ? Promise.resolve(true) : removeAuthUser(userId),
    reportFailure: report,
  });
}
