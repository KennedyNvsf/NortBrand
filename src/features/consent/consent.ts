/**
 * Cookie consent (ADR-007): essential cookies are always on, analytics is opt-in. The
 * choice lives in one first-party cookie for about six months. The value carries a
 * version, so a policy change that needs a new answer bumps CONSENT_VERSION and every
 * earlier choice reads as "not decided", which shows the banner again.
 */

export type Consent = { analytics: boolean };

export const CONSENT_COOKIE = "nb_consent";

/** Bump when the categories or what they cover change, to ask everyone again. */
export const CONSENT_VERSION = 1;

/** 182 days: the "6 months" of ADR-007. */
export const CONSENT_MAX_AGE_SECONDS = 182 * 24 * 60 * 60;

/** `v1.1` (analytics accepted) or `v1.0` (rejected). Nothing personal, no timestamp. */
export function serializeConsent(consent: Consent): string {
  return `v${CONSENT_VERSION}.${consent.analytics ? 1 : 0}`;
}

/** The stored choice, or null when there is none, it is malformed or out of date. */
export function parseConsent(value: string | undefined): Consent | null {
  const match = value?.match(/^v(\d+)\.([01])$/);
  if (!match || Number(match[1]) !== CONSENT_VERSION) return null;
  return { analytics: match[2] === "1" };
}

/** Reads the consent cookie out of a `document.cookie` string. */
export function readConsentCookie(cookieHeader: string): Consent | null {
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === CONSENT_COOKIE) return parseConsent(value.join("="));
  }
  return null;
}

/** The `document.cookie` assignment that stores a choice. */
export function consentCookie(consent: Consent, secure: boolean): string {
  return [
    `${CONSENT_COOKIE}=${serializeConsent(consent)}`,
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
