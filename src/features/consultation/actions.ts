"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { after } from "next/server";

import { site } from "@/content/site";
import { getServerEnv } from "@/env";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { sendEmail } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase/server";

import {
  renderConsultationAlert,
  renderConsultationConfirmation,
} from "./emails/render";
import { fakeInsert } from "./e2e-backend";
import { createFormToken } from "./form-token";
import { sendConsultationEmails } from "./notify";
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

  if (isFakeBackendEnabled()) {
    return submitConsultation(input, {
      now: Date.now,
      tokenSecret: env.NEWSLETTER_TOKEN_SECRET,
      ipHash: () => hashIp(clientIp(requestHeaders), env.IP_HASH_SALT),
      insert: fakeInsert,
      reportFailure: () => undefined,
      onCreated: () => undefined,
    });
  }

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
    // The emails run after the response is sent, so the visitor never waits on Resend
    // and an email failure can never turn a stored request into an error.
    onCreated: (requestId, request) => {
      const receivedAt = new Date();
      after(() =>
        sendConsultationEmails(request, requestId, receivedAt, {
          notifyTo: env.NOTIFY_TO_EMAIL,
          studioEmail: site.contact.email.value,
          renderAlert: renderConsultationAlert,
          renderConfirmation: renderConsultationConfirmation,
          send: sendEmail,
          markNotified: async (id) => {
            const { data, error } = await getSupabase().rpc(
              "mark_consultation_notified",
              { p_id: id },
            );
            return !error && data;
          },
          reportFailure: (step, code) => {
            Sentry.captureMessage("Consultation email step failed", {
              level: "error",
              tags: { feature: "consultation", step, code },
            });
          },
        }),
      );
    },
  });
}
