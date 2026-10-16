import { z } from "zod";

import {
  subscribeSchema,
  type NewsletterSubscription,
  type SubscribeFieldErrors,
} from "./schema";

/**
 * What the signup form receives. It is the same for a new, pending or already
 * subscribed address (no enumeration), and bots get a `success` too.
 */
export type SubscribeResult =
  | { status: "success" }
  | { status: "validation"; fieldErrors: SubscribeFieldErrors }
  | { status: "rate-limited" }
  | { status: "failed" };

/** Honeypot: visually hidden, unlabelled for people; any value means a bot. */
const envelopeSchema = z.object({ website: z.unknown().optional() });

/** A Postgres/PostgREST error, reduced to what is safe to log: the code. */
export type RpcError = { code: string };

export type SubscribeDependencies = {
  ipHash: () => string;
  /** `subscribe_newsletter`: the confirmation link's issue time, in Unix seconds. */
  subscribe: (
    subscription: NewsletterSubscription,
    ipHash: string,
  ) => Promise<{ issuedAt: number } | { error: RpcError }>;
  /** Reports a failure with no personal data (Sentry in production). */
  reportFailure: (code: string) => void;
  /** Runs once the row is pending (schedules the confirmation email). */
  onSubscribed: (
    subscription: NewsletterSubscription,
    issuedAt: number,
  ) => void;
};

/** SQLSTATE raised by `private.enforce_write_limit` (HTTP 429 through PostgREST). */
const RATE_LIMITED = "PT429";

/**
 * Newsletter signup after the browser: honeypot, zod, the `subscribe_newsletter` RPC
 * (rate-limited in Postgres), then the confirmation email via `onSubscribed`.
 *
 * The confirmation email goes out even when the address is already subscribed: the
 * function returns the same result either way, so the app cannot tell, and the
 * response and timing stay the same for everyone. Its link then confirms nothing new.
 */
export async function subscribeToNewsletter(
  input: unknown,
  deps: SubscribeDependencies,
): Promise<SubscribeResult> {
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) return { status: "failed" };

  const { website } = envelope.data;
  if (website !== undefined && website !== "") return { status: "success" };

  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    // One field, one message: any problem with the email reads "Enter a valid email".
    if (parsed.error.issues.some((issue) => issue.path[0] === "email")) {
      return { status: "validation", fieldErrors: { email: "emailInvalid" } };
    }
    // Only the locale is left, and the form always sends a valid one.
    return { status: "failed" };
  }

  const result = await deps.subscribe(parsed.data, deps.ipHash());
  if ("error" in result) {
    if (result.error.code === RATE_LIMITED) return { status: "rate-limited" };
    deps.reportFailure(result.error.code);
    return { status: "failed" };
  }

  deps.onSubscribed(parsed.data, result.issuedAt);
  return { status: "success" };
}
