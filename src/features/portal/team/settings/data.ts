import "server-only";

import { cache } from "react";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import {
  DEFAULT_STAGE_TEMPLATE,
  type TemplateStage,
} from "../projects/templates";
import { fakeSettings } from "./e2e-store";
import { toTemplate, type WorkspaceSettings } from "./rules";

/*
 * Reads Settings (#159) under the teammate's own session: RLS lets every teammate read
 * `portal_settings` and `portal_stage_template`, and nobody else. Per request (never
 * cached across users): the page is dynamic like every portal page.
 */

/** The workspace settings, or null when the viewer can't read them (not a teammate). */
export const getWorkspaceSettings = cache(
  async (): Promise<WorkspaceSettings | null> => {
    if (isFakeBackendEnabled()) return fakeSettings();

    const supabase = await getPortalSupabase();
    const [settings, stages] = await Promise.all([
      supabase
        .from("portal_settings")
        .select(
          "updated_at, code_max_tries, lockout_minutes, session_days, daily_digest, notify_first_client_sign_in, allowed_team_domain",
        )
        .maybeSingle(),
      supabase
        .from("portal_stage_template")
        .select("name, kind, weeks")
        .order("position"),
    ]);
    if (settings.error || !settings.data) return null;
    const row = settings.data;
    return {
      updatedAt: row.updated_at,
      codeMaxTries: row.code_max_tries,
      lockoutMinutes: row.lockout_minutes,
      sessionDays: row.session_days,
      dailyDigest: row.daily_digest,
      notifyFirstClientSignIn: row.notify_first_client_sign_in,
      allowedTeamDomain: row.allowed_team_domain,
      stages:
        (stages.error ? null : toTemplate(stages.data)) ??
        DEFAULT_STAGE_TEMPLATE.map((stage) => ({ ...stage })),
    };
  },
);

/** The template new projects start from. Falls back to the seeded one if unreadable. */
export async function getStageTemplate(): Promise<TemplateStage[]> {
  const settings = await getWorkspaceSettings();
  return (
    settings?.stages ?? DEFAULT_STAGE_TEMPLATE.map((stage) => ({ ...stage }))
  );
}
