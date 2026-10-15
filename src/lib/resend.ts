import { Resend } from "resend";

import { getServerEnv } from "@/env";

let client: Resend | undefined;

function getResend(): Resend {
  client ??= new Resend(getServerEnv().RESEND_API_KEY);
  return client;
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/** Either sent, or the provider's error name: safe to log, with no recipient or content. */
export type SendResult = { ok: true } | { ok: false; code: string };

/** Sends one email from EMAIL_FROM. Never throws: failures come back as a code. */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  try {
    const { error } = await getResend().emails.send({
      from: getServerEnv().EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
    });
    return error ? { ok: false, code: error.name } : { ok: true };
  } catch {
    // Network failure or an SDK bug; the error object may quote the request.
    return { ok: false, code: "send_threw" };
  }
}
