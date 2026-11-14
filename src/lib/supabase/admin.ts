import { createClient } from "@supabase/supabase-js";

import { getServerEnv, publicEnv } from "@/env";

/*
 * The only module that holds the Supabase service-role key (ADR-009, #132), and only for
 * auth administration: creating a teammate's auth user and blocking or unblocking their
 * sign-in. Never use it for table reads or writes; those go through the signed-in
 * admin's session, so RLS and the SQL role checks apply.
 *
 * Server-only: getServerEnv() refuses to run in the browser, and CI scans the client
 * bundles for the key's name after every build (scripts/check-client-bundles.mjs).
 */

function authAdmin() {
  const key = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set (see docs/guides/environments.md).",
    );
  }
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.admin;
}

/** Creates a confirmed auth user for an invited teammate. They sign in with a code. */
export async function createAuthUser(
  email: string,
): Promise<{ ok: true; userId: string } | { ok: false; code: string }> {
  const { data, error } = await authAdmin().createUser({
    email,
    email_confirm: true,
  });
  if (error) return { ok: false, code: error.code ?? "unknown" };
  return { ok: true, userId: data.user.id };
}

/** Deletes an auth user created for an invite that then failed to complete. */
export async function deleteAuthUser(userId: string): Promise<void> {
  await authAdmin().deleteUser(userId);
}

/**
 * Blocks (a removed teammate) or unblocks (a returning one) sign-in. A ban also stops
 * existing sessions from refreshing; the app stops serving them at once, because every
 * team page checks the active team_members row.
 */
export async function setAuthUserBlocked(
  userId: string,
  blocked: boolean,
): Promise<boolean> {
  const { error } = await authAdmin().updateUserById(userId, {
    ban_duration: blocked ? "876000h" : "none",
  });
  return !error;
}
