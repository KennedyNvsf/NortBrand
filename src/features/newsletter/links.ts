import type { Locale } from "@/i18n/routing";
import { signToken, verifyToken } from "@/lib/tokens";

/**
 * Newsletter links. The tokens are the ones `confirm_newsletter` and
 * `unsubscribe_newsletter` verify in Postgres (#36, CLAUDE.md › Data model):
 *
 *   confirm      base64url(HMAC-SHA256(secret, "confirm|<email>|<issued_at>")), 7 days
 *   unsubscribe  base64url(HMAC-SHA256(secret, "unsubscribe|<email>")), no expiry
 *
 * `issued_at` is the Unix time in seconds that `subscribe_newsletter` returns. The app
 * checks a link here first (constant time, no database call for a bad link); the
 * database checks it again, because its functions are callable with the public key.
 */

export const CONFIRM_TTL_SECONDS = 7 * 24 * 60 * 60;

export function confirmToken(
  secret: string,
  email: string,
  issuedAt: number,
): string {
  return signToken(secret, `confirm|${email}|${issuedAt}`);
}

export function unsubscribeToken(secret: string, email: string): string {
  return signToken(secret, `unsubscribe|${email}`);
}

export type ConfirmTokenCheck = "ok" | "invalid" | "expired";

/**
 * Same rules as `confirm_newsletter`: a forged or future link is invalid, one older than
 * seven days is expired. Whether it is the latest link is only known to the database.
 */
export function checkConfirmToken(
  secret: string,
  link: { email: string; issuedAt: number; token: string },
  nowSeconds: number,
): ConfirmTokenCheck {
  const message = `confirm|${link.email}|${link.issuedAt}`;
  if (!verifyToken(secret, message, link.token)) return "invalid";
  if (link.issuedAt > nowSeconds) return "invalid";
  if (link.issuedAt < nowSeconds - CONFIRM_TTL_SECONDS) return "expired";
  return "ok";
}

export function checkUnsubscribeToken(
  secret: string,
  link: { email: string; token: string },
): boolean {
  return verifyToken(secret, `unsubscribe|${link.email}`, link.token);
}

/** The link in the confirmation email. It opens a page with a Confirm button (#41). */
export function confirmUrl(
  siteUrl: string,
  locale: Locale,
  email: string,
  issuedAt: number,
  secret: string,
): string {
  const url = new URL(`/${locale}/newsletter/confirm`, siteUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("issued", String(issuedAt));
  url.searchParams.set("token", confirmToken(secret, email, issuedAt));
  return url.toString();
}

/**
 * The unsubscribe link for newsletters: a page with an Unsubscribe button (#41). It is
 * stored on the Resend contact as the `unsubscribe_url` property.
 */
export function unsubscribeUrl(
  siteUrl: string,
  locale: Locale,
  email: string,
  secret: string,
): string {
  const url = new URL(`/${locale}/newsletter/unsubscribe`, siteUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", unsubscribeToken(secret, email));
  return url.toString();
}

/**
 * RFC 8058 one-click unsubscribe (`List-Unsubscribe` with `List-Unsubscribe-Post`): mail
 * clients POST to it directly, with no page in between.
 */
export function oneClickUnsubscribeUrl(
  siteUrl: string,
  email: string,
  secret: string,
): string {
  const url = new URL("/api/newsletter/unsubscribe", siteUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", unsubscribeToken(secret, email));
  return url.toString();
}
