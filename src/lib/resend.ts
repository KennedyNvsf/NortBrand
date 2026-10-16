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

/** Text properties set on a contact; each must exist in Resend first (environments.md). */
export type ContactProperties = Record<string, string>;

/**
 * Adds or refreshes a contact and puts it in the newsletter segment (RESEND_SEGMENT_ID).
 * Contacts are global in Resend, so an address that is already a contact (an earlier
 * attempt that half failed) is updated and added to the segment instead. Never throws.
 */
export async function upsertSegmentContact(
  email: string,
  properties: ContactProperties,
): Promise<SendResult> {
  const segmentId = getServerEnv().RESEND_SEGMENT_ID;
  try {
    const contacts = getResend().contacts;
    const created = await contacts.create({
      email,
      unsubscribed: false,
      properties,
      segments: [{ id: segmentId }],
    });
    if (!created.error) return { ok: true };

    const updated = await contacts.update({
      email,
      unsubscribed: false,
      properties,
    });
    if (updated.error) return { ok: false, code: updated.error.name };
    const added = await contacts.segments.add({ email, segmentId });
    return added.error ? { ok: false, code: added.error.name } : { ok: true };
  } catch {
    return { ok: false, code: "contact_threw" };
  }
}

/**
 * Deletes a contact, and with it every segment membership and property, so Resend keeps
 * no data for an unsubscribed address. A contact that does not exist counts as removed.
 */
export async function removeContact(email: string): Promise<SendResult> {
  try {
    const { error } = await getResend().contacts.remove({ email });
    if (!error || error.name === "not_found") return { ok: true };
    return { ok: false, code: error.name };
  } catch {
    return { ok: false, code: "contact_threw" };
  }
}
