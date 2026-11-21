import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import {
  isAccessEventKind,
  type AccessEvent,
  type ClientPerson,
  type Lockout,
} from "./access-rules";
import { fakeClientAccess } from "./e2e-store";

/*
 * What the Client access tab shows (#141; Figma TM-06), read under the teammate's own
 * session: RLS shows a project's people and activity only to its team, and the lockout
 * function checks the same. Activity covers the last 30 days, newest first.
 */

export type ClientAccess = {
  publicId: string;
  people: ClientPerson[];
  lockouts: Lockout[];
  events: AccessEvent[];
  lockoutMinutes: number;
};

const ACTIVITY_DAYS = 30;
const ACTIVITY_LIMIT = 100;

export async function getClientAccess(project: {
  id: string;
  publicId: string;
}): Promise<ClientAccess> {
  if (isFakeBackendEnabled())
    return { ...fakeClientAccess(), lockoutMinutes: 15 };

  const supabase = await getPortalSupabase();
  const since = new Date(
    Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [people, lockouts, events, settings] = await Promise.all([
    supabase
      .from("project_clients")
      .select("id, email, name, locale, status, invited_at, last_sign_in_at")
      .eq("project_id", project.id)
      .neq("status", "removed")
      .order("invited_at", { ascending: true }),
    supabase.rpc("portal_client_lockouts", { p_project_id: project.id }),
    supabase
      .from("access_events")
      .select(
        "id, kind, occurred_at, email, actor:team_members!access_events_actor_id_fkey(name)",
      )
      .eq("project_id", project.id)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    supabase.from("portal_settings").select("lockout_minutes").maybeSingle(),
  ]);

  if (people.error) throw new Error(`People failed (${people.error.code})`);
  if (lockouts.error)
    throw new Error(`Lockouts failed (${lockouts.error.code})`);
  if (events.error) throw new Error(`Activity failed (${events.error.code})`);
  if (settings.error)
    throw new Error(`Settings failed (${settings.error.code})`);

  return {
    publicId: project.publicId,
    lockoutMinutes: settings.data?.lockout_minutes ?? 15,
    people: people.data.flatMap((row) =>
      row.status === "removed"
        ? []
        : [
            {
              id: row.id,
              email: row.email,
              name: row.name,
              locale: row.locale === "en" ? "en" : "pt",
              status: row.status === "active" ? "active" : "invited",
              invitedAt: row.invited_at,
              lastSignInAt: row.last_sign_in_at,
            } satisfies ClientPerson,
          ],
    ),
    lockouts: lockouts.data.map((row) => ({
      email: row.email,
      lockedAt: row.locked_at,
      unlocksAt: row.unlocks_at,
    })),
    // The table's check allows only these kinds; anything else is skipped, not guessed.
    events: events.data.flatMap((row) =>
      isAccessEventKind(row.kind)
        ? [
            {
              id: row.id,
              kind: row.kind,
              occurredAt: row.occurred_at,
              email: row.email,
              actorName: row.actor?.name ?? null,
            },
          ]
        : [],
    ),
  };
}
