import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Portal sessions end 30 days after sign-in (Figma CP-08 "Session ended"; ADR-009).
 * Supabase's time-boxed sessions need the Pro plan, so the app enforces the limit: at
 * sign-in it sets this marker, signed and bound to the user, and never refreshes it.
 * A portal request without a valid marker is treated as signed out, whatever the
 * Supabase cookies say.
 *
 * Value: `<issued at, ms>.<base64url HMAC-SHA256 of "portal-session|<user id>|<issued at>">`.
 * The marker can only shorten a session, but it is signed anyway so it can't be copied
 * to another user or pushed past 30 days.
 */

export const PORTAL_SESSION_COOKIE = "nb_portal_session";
export const PORTAL_SESSION_DAYS = 30;
export const PORTAL_SESSION_MAX_AGE_SECONDS =
  PORTAL_SESSION_DAYS * 24 * 60 * 60;

function sign(secret: string, userId: string, issuedAt: number): string {
  return createHmac("sha256", secret)
    .update(`portal-session|${userId}|${String(issuedAt)}`)
    .digest("base64url");
}

export function createSessionMarker(
  secret: string,
  userId: string,
  now: number,
): string {
  return `${String(now)}.${sign(secret, userId, now)}`;
}

/** True when the marker was issued for this user by us, less than 30 days ago. */
export function isValidSessionMarker(
  value: string | undefined,
  secret: string,
  userId: string,
  now: number,
): boolean {
  if (!value) return false;
  const [issuedText, signature, ...rest] = value.split(".");
  if (
    !issuedText ||
    !signature ||
    rest.length > 0 ||
    !/^\d{1,16}$/.test(issuedText)
  ) {
    return false;
  }
  const issuedAt = Number(issuedText);
  if (
    issuedAt > now ||
    now - issuedAt > PORTAL_SESSION_MAX_AGE_SECONDS * 1000
  ) {
    return false;
  }
  const expected = Buffer.from(sign(secret, userId, issuedAt));
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
