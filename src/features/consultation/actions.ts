"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";

import { getServerEnv } from "@/env";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { getSupabase } from "@/lib/supabase/server";

import { createFormToken } from "./form-token";
import { submitConsultation, type ConsultationResult } from "./submit";

/** A signed start time for the minimum-fill-time check. Called when the form mounts. */
// Next.js requires every exported server action to be an async function.
// eslint-disable-next-line @typescript-eslint/require-await
export async function getConsultationFormToken(): Promise<string> {
  return createFormToken(getServerEnv().NEWSLETTER_TOKEN_SECRET, Date.now());
}

/**
 * Submits a consultation request. `input` is untrusted: it is validated again here with
 * the form's schema, whatever the browser did.
 */
export async function submitConsultationRequest(
  input: unknown,
): Promise<ConsultationResult> {
  const env = getServerEnv();
  const requestHeaders = await headers();

  return submitConsultation(input, {
    now: Date.now,
    tokenSecret: env.NEWSLETTER_TOKEN_SECRET,
    ipHash: () => hashIp(clientIp(requestHeaders), env.IP_HASH_SALT),
    insert: async (request, ipHash) => {
      const { data, error } = await getSupabase().rpc(
        "submit_consultation_request",
        {
          p_name: request.name,
          p_email: request.email,
          // The function stores '' as null (generated types allow no null argument).
          p_phone: request.phone ?? "",
          p_service: request.service,
          p_message: request.message,
          p_locale: request.locale,
          p_ip_hash: ipHash,
        },
      );
      // Only the code leaves this function: Postgres puts the submitted row, personal
      // data included, in `error.details` and `error.message`.
      if (error) return { error: { code: error.code } };
      return { id: data };
    },
    reportFailure: (code) => {
      Sentry.captureMessage("Consultation request insert failed", {
        level: "error",
        tags: { feature: "consultation", code },
      });
    },
  });
}
