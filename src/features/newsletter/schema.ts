import { z } from "zod";

import { routing } from "@/i18n/routing";

/**
 * Newsletter inputs, shared by the signup form (#41) and the server actions. The email
 * rules mirror the `email` CHECK on `public.newsletter_subscribers`; change both
 * together. Messages are keys under `Newsletter.errors` in messages/*.json.
 */

export const newsletterErrorKeys = ["emailInvalid"] as const;
export type NewsletterErrorKey = (typeof newsletterErrorKeys)[number];

const email = z
  .string("emailInvalid")
  .trim()
  .toLowerCase()
  .max(254, "emailInvalid")
  .pipe(z.email("emailInvalid"));

const locale = z.enum(routing.locales);

/** The signup form: one email field. */
export const subscribeSchema = z.object({ email, locale });

export type SubscribeInput = z.input<typeof subscribeSchema>;
export type NewsletterSubscription = z.output<typeof subscribeSchema>;
export type SubscribeFieldErrors = { email?: NewsletterErrorKey };

/** Signed tokens are an unpadded base64url SHA-256 HMAC: always 43 characters. */
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/**
 * The query string of a confirm link (`?email=&issued=&token=`, see links.ts), plus the
 * page's locale. Anything malformed is rejected before the database is asked.
 */
export const confirmLinkSchema = z.object({
  email,
  issued: z
    .string()
    .regex(/^\d{1,12}$/)
    .transform(Number),
  token,
  locale,
});

/** The query string of an unsubscribe link (`?email=&token=`). */
export const unsubscribeLinkSchema = z.object({ email, token });

export type ConfirmLink = z.output<typeof confirmLinkSchema>;
export type UnsubscribeLink = z.output<typeof unsubscribeLinkSchema>;
