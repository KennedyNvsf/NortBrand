import { connection } from "next/server";

import { getServerEnv } from "@/env";
import { unsubscribeToken } from "@/features/newsletter/links";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Checks that NEWSLETTER_TOKEN_SECRET matches the `newsletter_token_secret` in Vault: if
 * they differ, every confirm and unsubscribe link fails. It signs an unsubscribe token
 * for an address that can never subscribe (`.invalid` is a reserved domain) and asks
 * Postgres to verify it. `unsubscribe_newsletter` returns true for any valid token and
 * changes no row for that address, so the check writes nothing.
 *
 * Open `/api/health/newsletter` after setting the secrets in a project (runbook).
 */
const PROBE_EMAIL = "healthcheck@nortbrand.invalid";

export async function GET(): Promise<Response> {
  // Run on every request: never prerendered at build time or cached.
  await connection();
  const token = unsubscribeToken(
    getServerEnv().NEWSLETTER_TOKEN_SECRET,
    PROBE_EMAIL,
  );
  const { data, error } = await getSupabase().rpc("unsubscribe_newsletter", {
    p_email: PROBE_EMAIL,
    p_token: token,
  });

  // `error.code` only; for a missing Vault secret it is P0001 (raise exception).
  const body = error
    ? { status: "error", code: error.code }
    : { status: data ? "ok" : "secret_mismatch" };
  return Response.json(body, {
    status: body.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
