import { z } from "zod";

import { unsubscribeToken } from "./links";
import type { UnsubscribeResult } from "./unsubscribe";

/**
 * Resend → database sync for unsubscribes made outside our pages (#86). Broadcasts carry
 * Resend's own `List-Unsubscribe` header, so a mail client's one-click unsubscribe marks
 * the Resend contact `unsubscribed` without telling us. Resend then sends a
 * `contact.updated` webhook, and this applies it through the normal unsubscribe path.
 *
 * Only that one change matters; every other event is acknowledged and ignored. The
 * caller has already checked the signature (src/lib/resend-webhook.ts).
 */
const contactUnsubscribedSchema = z.object({
  type: z.literal("contact.updated"),
  data: z.object({
    email: z.string(),
    unsubscribed: z.literal(true),
  }),
});

export type ResendWebhookResult = { status: "ignored" } | UnsubscribeResult;

export type ResendWebhookDependencies = {
  tokenSecret: string;
  /** The newsletter's unsubscribe (actions.ts › unsubscribeNewsletter). */
  unsubscribe: (link: {
    email: string;
    token: string;
  }) => Promise<UnsubscribeResult>;
};

/**
 * The webhook is trusted once its signature checks out, so it may unsubscribe the
 * address it names. It still goes through `unsubscribe_newsletter`, the same function the
 * links use (ADR-002): the app signs that address's unsubscribe token, and Postgres
 * checks it again. No extra database function is exposed to the public key.
 */
export async function syncResendUnsubscribe(
  event: unknown,
  deps: ResendWebhookDependencies,
): Promise<ResendWebhookResult> {
  const parsed = contactUnsubscribedSchema.safeParse(event);
  if (!parsed.success) return { status: "ignored" };

  // Same normalisation as the link schema, so the token matches what it verifies.
  const email = parsed.data.data.email.trim().toLowerCase();
  return deps.unsubscribe({
    email,
    token: unsubscribeToken(deps.tokenSecret, email),
  });
}
