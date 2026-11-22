"use server";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import { fakeSaveSettings } from "./e2e-store";
import { saveSettings, type SaveSettingsResult } from "./settings";

/* Save settings (#159): admin only, checked in settings.ts and again in SQL. */

export async function saveSettingsAction(
  input: unknown,
): Promise<SaveSettingsResult> {
  return saveSettings(input, {
    viewer: getTeamViewer,
    save: async (settings) => {
      if (isFakeBackendEnabled()) return fakeSaveSettings(settings);
      const { data, error } = await (
        await getPortalSupabase()
      ).rpc("portal_save_settings", {
        p_expected_updated_at: settings.updatedAt,
        p_code_max_tries: settings.codeMaxTries,
        p_lockout_minutes: settings.lockoutMinutes,
        p_session_days: settings.sessionDays,
        p_daily_digest: settings.dailyDigest,
        p_notify_first_client_sign_in: settings.notifyFirstClientSignIn,
        p_allowed_team_domain: settings.allowedTeamDomain ?? "",
        p_stages: settings.stages.map((stage) => ({
          name: stage.name,
          kind: stage.kind,
          weeks: stage.kind === "work" ? stage.weeks : null,
        })),
      });
      if (error) return { error: { code: error.code, message: error.message } };
      return { updatedAt: data };
    },
    reportFailure: reportPortalFailure("portal-team-admin"),
  });
}
