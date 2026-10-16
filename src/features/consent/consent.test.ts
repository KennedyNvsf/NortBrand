import { describe, expect, it } from "vitest";

import {
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_VERSION,
  consentCookie,
  parseConsent,
  readConsentCookie,
  serializeConsent,
} from "./consent";

describe("consent cookie value", () => {
  it("round-trips both choices", () => {
    for (const analytics of [true, false]) {
      expect(parseConsent(serializeConsent({ analytics }))).toEqual({
        analytics,
      });
    }
    expect(serializeConsent({ analytics: true })).toBe(`v${CONSENT_VERSION}.1`);
  });

  it("treats an older version, junk or nothing as not decided", () => {
    expect(parseConsent(`v${CONSENT_VERSION - 1}.1`)).toBeNull();
    expect(parseConsent(`v${CONSENT_VERSION + 1}.1`)).toBeNull();
    expect(parseConsent("v1.2")).toBeNull();
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });

  it("finds the cookie among others", () => {
    expect(
      readConsentCookie(
        `NEXT_LOCALE=pt; nb_consent=v${CONSENT_VERSION}.0; x=1`,
      ),
    ).toEqual({ analytics: false });
    expect(readConsentCookie("NEXT_LOCALE=pt")).toBeNull();
    expect(readConsentCookie("")).toBeNull();
  });
});

describe("consentCookie", () => {
  it("lasts about six months, site-wide, first-party", () => {
    const cookie = consentCookie({ analytics: true }, true);
    expect(cookie).toContain(`nb_consent=v${CONSENT_VERSION}.1`);
    expect(cookie).toContain(`Max-Age=${CONSENT_MAX_AGE_SECONDS}`);
    expect(CONSENT_MAX_AGE_SECONDS / 86_400).toBe(182);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(consentCookie({ analytics: false }, false)).not.toContain("Secure");
  });
});
