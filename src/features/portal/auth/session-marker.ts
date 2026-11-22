import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Portal sessions end a set number of days after sign-in (Figma CP-08 "Session ended";
 * ADR-009). Supabase's time-boxed sessions need the Pro plan, so the app enforces the
 * limit: at sign-in it sets this marker, signed and bound to the user, and never
 * refreshes it. A portal request without a valid marker is treated as signed out,
 * whatever the Supabase cookies say.
 *
 * The length is Settings › "Stay signed in for" (`portal_settings.session_days`, #159)
 * for clients, read when they sign in, and 30 days for the team. It is signed into the
 * marker, so a new setting applies from each person's next sign-in.
 *
 * Value: `<issued at, ms>.<days>.<base64url HMAC-SHA256 of
 * "portal-session|<user id>|<issued at>|<days>">`. Markers from before #159 have no days
 * (`<issued at>.<signature>`, signed without them) and last 30 days. The marker can only
 * shorten a session, but it is signed anyway so it can't be copied to another user or
 * pushed past its length.
 */

export const PORTAL_SESSION_COOKIE = "nb_portal_session";
export const PORTAL_SESSION_DAYS = 30;
/** The bounds of `portal_settings.session_days` (its check constraint). */
export const SESSION_DAYS_RANGE = { min: 1, max: 90 } as const;

const DAY_MS = 86_400_000;

export function sessionMaxAgeSeconds(days: number): number {
  return days * 24 * 60 * 60;
}

/** A session length from the database, or the default when it's missing or invalid. */
export function toSessionDays(value: unknown): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= SESSION_DAYS_RANGE.min &&
    value <= SESSION_DAYS_RANGE.max
    ? value
    : PORTAL_SESSION_DAYS;
}

function sign(
  secret: string,
  userId: string,
  issuedAt: number,
  days: number | null,
): string {
  const payload =
    days === null
      ? `portal-session|${userId}|${String(issuedAt)}`
      : `portal-session|${userId}|${String(issuedAt)}|${String(days)}`;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionMarker(
  secret: string,
  userId: string,
  now: number,
  days: number = PORTAL_SESSION_DAYS,
): string {
  const length = toSessionDays(days);
  return `${String(now)}.${String(length)}.${sign(secret, userId, now, length)}`;
}

function parse(
  value: string,
): { issuedAt: number; days: number | null; signature: string } | null {
  const parts = value.split(".");
  if (parts.length === 2) {
    const [issued, signature] = parts;
    if (!issued || !signature || !/^\d{1,16}$/.test(issued)) return null;
    return { issuedAt: Number(issued), days: null, signature };
  }
  if (parts.length === 3) {
    const [issued, daysText, signature] = parts;
    if (
      !issued ||
      !daysText ||
      !signature ||
      !/^\d{1,16}$/.test(issued) ||
      !/^\d{1,2}$/.test(daysText)
    ) {
      return null;
    }
    const days = Number(daysText);
    if (days < SESSION_DAYS_RANGE.min || days > SESSION_DAYS_RANGE.max) {
      return null;
    }
    return { issuedAt: Number(issued), days, signature };
  }
  return null;
}

/** True when the marker was issued for this user by us, and its length hasn't passed. */
export function isValidSessionMarker(
  value: string | undefined,
  secret: string,
  userId: string,
  now: number,
): boolean {
  if (!value) return false;
  const marker = parse(value);
  if (!marker) return false;
  const length = marker.days ?? PORTAL_SESSION_DAYS;
  if (marker.issuedAt > now || now - marker.issuedAt > length * DAY_MS) {
    return false;
  }
  const expected = Buffer.from(
    sign(secret, userId, marker.issuedAt, marker.days),
  );
  const received = Buffer.from(marker.signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
