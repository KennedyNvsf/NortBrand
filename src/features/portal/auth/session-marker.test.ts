import { describe, expect, it } from "vitest";

import {
  createSessionMarker,
  isValidSessionMarker,
  PORTAL_SESSION_MAX_AGE_SECONDS,
} from "./session-marker";

const secret = "a".repeat(32);
const user = "20000000-0000-4000-a000-000000000011";
const now = Date.UTC(2026, 10, 14, 10, 0, 0);

describe("portal session marker", () => {
  it("accepts a fresh marker for the same user", () => {
    const marker = createSessionMarker(secret, user, now);
    expect(isValidSessionMarker(marker, secret, user, now + 1000)).toBe(true);
  });

  it("expires after 30 days", () => {
    const marker = createSessionMarker(secret, user, now);
    const later = now + PORTAL_SESSION_MAX_AGE_SECONDS * 1000 + 1;
    expect(isValidSessionMarker(marker, secret, user, later)).toBe(false);
  });

  it("is bound to the user it was issued for", () => {
    const marker = createSessionMarker(secret, user, now);
    expect(isValidSessionMarker(marker, secret, "someone-else", now)).toBe(
      false,
    );
  });

  it("rejects a moved issue date, another secret, junk and a missing value", () => {
    const marker = createSessionMarker(secret, user, now);
    const [, signature] = marker.split(".");
    expect(
      isValidSessionMarker(
        `${String(now + 5000)}.${signature ?? ""}`,
        secret,
        user,
        now + 6000,
      ),
    ).toBe(false);
    expect(isValidSessionMarker(marker, "b".repeat(32), user, now)).toBe(false);
    expect(isValidSessionMarker("junk", secret, user, now)).toBe(false);
    expect(isValidSessionMarker(`${marker}.extra`, secret, user, now)).toBe(
      false,
    );
    expect(isValidSessionMarker(undefined, secret, user, now)).toBe(false);
  });

  it("rejects a marker issued in the future", () => {
    const marker = createSessionMarker(secret, user, now + 60_000);
    expect(isValidSessionMarker(marker, secret, user, now)).toBe(false);
  });
});
