"use server";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import { notifyClients } from "../notify";
import { updateNeedsClient } from "./data";
import { fakeDeleteUpdate, fakeEditUpdate, fakePostUpdate } from "./e2e-store";
import {
  deleteUpdate,
  editUpdate,
  postUpdate,
  type UpdateDeps,
  type UpdateResult,
} from "./updates-edit";

/*
 * Project updates from the team (#139). Inputs are untrusted and validated in
 * updates-edit.ts; writes run under the teammate's session (RLS and the SQL functions).
 * "Needs you" emails go out after saving; only error codes are ever logged.
 */

const report = reportPortalFailure("portal-team-admin");

function projectOf(input: unknown): string | null {
  if (typeof input !== "object" || input === null || !("projectId" in input))
    return null;
  return typeof input.projectId === "string" ? input.projectId : null;
}

function base(projectId: string): UpdateDeps {
  return {
    viewer: getTeamViewer,
    notifyNeedsYou: (body) =>
      notifyClients(projectId, body, { needsClient: true }),
    reportFailure: report,
  };
}

async function authorName(): Promise<string> {
  const viewer = await getTeamViewer();
  return viewer.status === "signed_in" ? viewer.name : "NortBrand";
}

export async function postUpdateAction(input: unknown): Promise<UpdateResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return postUpdate(input, {
    ...base(projectId),
    save: async (update) => {
      if (isFakeBackendEnabled()) {
        return fakePostUpdate({ ...update, authorName: await authorName() });
      }
      const { data, error } = await (
        await getPortalSupabase()
      ).rpc("portal_post_update", {
        p_project_id: update.projectId,
        p_body: update.body,
        p_highlight: update.highlight,
        p_needs_client: update.needsClient,
        p_ticket_ids: update.ticketIds,
      });
      return error ? { error: { code: error.code } } : data;
    },
  });
}

export async function editUpdateAction(input: unknown): Promise<UpdateResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return editUpdate(input, {
    ...base(projectId),
    wasNeedsClient: updateNeedsClient,
    save: async (update) => {
      if (isFakeBackendEnabled()) {
        return fakeEditUpdate(update.updateId, update) === "ok"
          ? "ok"
          : { error: { code: "P0002" } };
      }
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_edit_update", {
        p_update_id: update.updateId,
        p_body: update.body,
        p_highlight: update.highlight,
        p_needs_client: update.needsClient,
        p_ticket_ids: update.ticketIds,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
  });
}

export async function deleteUpdateAction(
  input: unknown,
): Promise<UpdateResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return deleteUpdate(input, {
    ...base(projectId),
    remove: async ({ updateId }) => {
      if (isFakeBackendEnabled()) {
        return fakeDeleteUpdate(updateId) === "ok"
          ? "ok"
          : { error: { code: "P0002" } };
      }
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_delete_update", {
        p_update_id: updateId,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
  });
}
