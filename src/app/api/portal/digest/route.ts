import { NextResponse } from "next/server";

import { getServerEnv, publicEnv } from "@/env";
import { reportPortalFailure } from "@/features/portal/auth/server";
import { runDigest, isAuthorizedCron } from "@/features/portal/digest/digest";
import { renderPortalDigest } from "@/features/portal/emails/render";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { sendEmail } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase/server";

/*
 * The client digest (#139), called by Vercel Cron (vercel.json) with
 * `Authorization: Bearer <CRON_SECRET>`. Anything else is refused before any work: 401,
 * or 503 when the secret isn't configured. The claim runs with the public key through a
 * SQL function that checks the same secret (Vault portal_cron_secret) and makes the
 * digest at-most-once per client per day; see src/features/portal/digest/digest.ts.
 * Responses carry counts only, never addresses; failures are reported by code.
 */

const NO_STORE = { "Cache-Control": "no-store" };
const report = reportPortalFailure("portal-team-admin");

export async function GET(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "not_configured" },
      { status: 503, headers: NO_STORE },
    );
  }
  if (!isAuthorizedCron(request.headers.get("authorization"), secret)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }

  const result = await runDigest({
    now: new Date(),
    claim: async () => {
      if (isFakeBackendEnabled()) return [];
      const { data, error } = await getSupabase().rpc("portal_claim_digests", {
        p_secret: secret,
      });
      return error ? { error: { code: error.code } } : data;
    },
    send: async (row) => {
      const email = await renderPortalDigest({
        locale: row.locale,
        projectName: row.project_name,
        publicId: row.public_id,
        updates: row.updates.map((update) => ({
          author: update.author,
          body: update.body,
          createdAt: update.created_at,
          highlight: update.highlight,
          needsClient: update.needs_client,
        })),
        siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
      });
      return sendEmail({ to: row.client_email, ...email });
    },
    reportFailure: report,
  });

  const status = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status, headers: NO_STORE });
}
