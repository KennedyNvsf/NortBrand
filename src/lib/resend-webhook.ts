import { Resend } from "resend";

import { getServerEnv } from "@/env";

/**
 * Checks a Resend webhook's signature (Svix: the `svix-id`, `svix-timestamp` and
 * `svix-signature` headers, signed with RESEND_WEBHOOK_SECRET) and returns the parsed
 * event, or null. A missing, forged or stale (over 5 minutes old) signature is null, so
 * a caller can refuse the request before reading anything from it. Never throws.
 *
 * The event is typed `unknown`: a signature proves who sent it, not its shape, so the
 * caller still validates it.
 */
export function verifyResendWebhook(
  payload: string,
  headers: Headers,
): unknown {
  const env = getServerEnv();
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return null;

  try {
    return new Resend(env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    // Bad signature, stale timestamp or unparsable JSON: all the same to the caller.
    return null;
  }
}
