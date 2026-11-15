"use server";

import { z } from "zod";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import { notifyClients } from "../notify";
import {
  fakeCompleteStage,
  fakeReopenStage,
  fakeSetHealth,
  fakeSetLaunch,
  fakeSetStageDates,
} from "./e2e-store";
import {
  completeStage,
  reopenStage,
  setHealth,
  setLaunch,
  setStageDates,
  type PlanDeps,
  type PlanResult,
} from "./plan-edit";

/*
 * Plan changes from the team timeline (#138). Inputs are untrusted and validated in
 * plan-edit.ts; writes run under the teammate's session (RLS and the SQL functions
 * decide). Client emails go out after the change is saved; only error codes are logged.
 */

const report = reportPortalFailure("portal-team-admin");
const projectRef = z.object({ projectId: z.uuid() });

async function viewerName(): Promise<string> {
  const viewer = await getTeamViewer();
  return viewer.status === "signed_in" ? viewer.name : "NortBrand";
}

function base(projectId: string): PlanDeps {
  return {
    viewer: getTeamViewer,
    notify: (update) => notifyClients(projectId, update),
    reportFailure: report,
  };
}

function projectOf(input: unknown): string | null {
  const parsed = projectRef.safeParse(input);
  return parsed.success ? parsed.data.projectId : null;
}

export async function setHealthAction(input: unknown): Promise<PlanResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return setHealth(input, {
    ...base(projectId),
    save: async ({ health, update }) => {
      if (isFakeBackendEnabled())
        return fakeSetHealth(health, update, await viewerName());
      const { data, error } = await (
        await getPortalSupabase()
      ).rpc("portal_set_project_health", {
        p_project_id: projectId,
        p_health: health,
        p_update_body: update ?? undefined,
      });
      return error ? { error: { code: error.code } } : data;
    },
  });
}

export async function setLaunchAction(input: unknown): Promise<PlanResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return setLaunch(input, {
    ...base(projectId),
    save: async ({ launchesOn, update }) => {
      if (isFakeBackendEnabled())
        return fakeSetLaunch(launchesOn, update, await viewerName());
      const { data, error } = await (
        await getPortalSupabase()
      ).rpc("portal_set_launch_date", {
        p_project_id: projectId,
        p_launches_on: launchesOn,
        p_update_body: update ?? undefined,
      });
      return error ? { error: { code: error.code } } : data;
    },
  });
}

export async function setStageDatesAction(input: unknown): Promise<PlanResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return setStageDates(input, {
    ...base(projectId),
    save: async ({ stageId, startsOn, endsOn }) => {
      if (isFakeBackendEnabled()) {
        const result = fakeSetStageDates(stageId, startsOn, endsOn);
        if (result === "locked") return { error: { code: "PT409" } };
        return result === "ok" ? "ok" : { error: { code: "P0002" } };
      }
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_set_stage_dates", {
        p_stage_id: stageId,
        p_starts_on: startsOn,
        p_ends_on: endsOn ?? undefined,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
  });
}

export async function reopenStageAction(input: unknown): Promise<PlanResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return reopenStage(input, {
    ...base(projectId),
    save: async ({ stageId }) => {
      if (isFakeBackendEnabled()) {
        return fakeReopenStage(stageId) === "ok"
          ? "ok"
          : { error: { code: "P0002" } };
      }
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_reopen_stage", {
        p_stage_id: stageId,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
  });
}

export async function completeStageAction(input: unknown): Promise<PlanResult> {
  const projectId = projectOf(input);
  if (!projectId) return { status: "not_found" };
  return completeStage(input, {
    ...base(projectId),
    save: async ({ stageId, moveOpen, update }) => {
      if (isFakeBackendEnabled()) {
        const result = fakeCompleteStage(
          stageId,
          moveOpen,
          update,
          await viewerName(),
        );
        return result === "not_current"
          ? { error: { code: "PT409" } }
          : result.updateId;
      }
      const { data, error } = await (
        await getPortalSupabase()
      ).rpc("portal_complete_stage", {
        p_stage_id: stageId,
        p_move_open: moveOpen,
        p_update_body: update ?? undefined,
      });
      if (error) return { error: { code: error.code } };
      return data.at(0)?.update_id ?? null;
    },
  });
}
