import type { Locale } from "@/i18n/routing";
import type { RenderedEmail } from "@/lib/email/render";
import type {
  ContactProperties,
  OutgoingEmail,
  SendResult,
} from "@/lib/resend";

import type { NewsletterSubscription } from "./schema";

/**
 * The side effects after each step: they run after the response (`after()`), so each
 * one reports its failure and never throws. The database is the source of truth; Resend
 * only mirrors who is subscribed.
 */

export type ConfirmationEmailDependencies = {
  confirmUrl: (
    subscription: NewsletterSubscription,
    issuedAt: number,
  ) => string;
  render: (
    email: string,
    locale: Locale,
    confirmUrl: string,
  ) => Promise<RenderedEmail>;
  send: (email: OutgoingEmail) => Promise<SendResult>;
  reportFailure: (step: string, code: string) => void;
};

/** Sends the double opt-in email. A failure leaves the row pending; signing up again resends it. */
export async function sendConfirmationEmail(
  subscription: NewsletterSubscription,
  issuedAt: number,
  deps: ConfirmationEmailDependencies,
): Promise<void> {
  let email: RenderedEmail;
  try {
    email = await deps.render(
      subscription.email,
      subscription.locale,
      deps.confirmUrl(subscription, issuedAt),
    );
  } catch {
    deps.reportFailure("confirmation_email", "render_failed");
    return;
  }
  const sent = await deps.send({ ...email, to: subscription.email });
  if (!sent.ok) deps.reportFailure("confirmation_email", sent.code);
}

export type SegmentDependencies = {
  unsubscribeUrl: (email: string, locale: Locale) => string;
  upsert: (email: string, properties: ContactProperties) => Promise<SendResult>;
  remove: (email: string) => Promise<SendResult>;
  reportFailure: (step: string, code: string) => void;
};

/**
 * Adds a confirmed address to the Resend segment, with the two properties newsletter
 * templates use: `locale` (send each language to its own list) and `unsubscribe_url`.
 */
export async function addToSegment(
  email: string,
  locale: Locale,
  deps: SegmentDependencies,
): Promise<void> {
  const result = await deps.upsert(email, {
    locale,
    unsubscribe_url: deps.unsubscribeUrl(email, locale),
  });
  if (!result.ok) deps.reportFailure("segment_add", result.code);
}

/** Deletes an unsubscribed address from Resend. */
export async function removeFromSegment(
  email: string,
  deps: SegmentDependencies,
): Promise<void> {
  const result = await deps.remove(email);
  if (!result.ok) deps.reportFailure("segment_remove", result.code);
}
